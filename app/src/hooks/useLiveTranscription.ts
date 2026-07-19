"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Who } from "@/lib/types";

/**
 * Live transcription off the laptop microphone for Real Call mode: the
 * dispatcher sets the phone on speaker next to the laptop and both sides of
 * the conversation get picked up by the one mic.
 *
 * Implementation: records the mic in short self-contained chunks
 * (MediaRecorder is stopped and restarted so each blob has valid container
 * headers) and sends each chunk to /api/stt, which runs ElevenLabs Scribe v2
 * with diarization + speaker role detection server-side.
 *
 * Chunk boundaries are driven by a WebAudio loudness meter acting as a cheap
 * voice-activity detector: a chunk ships as soon as speech has been heard and
 * then ~700ms of silence follows, instead of on a fixed 5s wall clock. That
 * cuts perceived latency (text lands right after an utterance ends) and means
 * most chunks contain exactly one speaker turn, which keeps diarization clean.
 * A hard cap still cuts long monologues so text keeps flowing, and chunks with
 * no speech at all are discarded without an upload so quiet stretches don't
 * burn STT quota or hallucinate text. Uploads resolve through a promise chain
 * so lines land in the transcript in spoken order even when requests finish
 * out of order.
 */

/** Normalized RMS below this = silence (drives both the VAD and the upload gate). */
const SILENCE_RMS = 0.012;
/** How often the loudness meter samples the mic. */
const METER_MS = 100;
/** Silence this long after speech ends the utterance and ships the chunk. */
const ENDPOINT_SILENCE_MS = 700;
/** Never ship a chunk shorter than this — avoids shipping half-word blips. */
const MIN_UTTERANCE_MS = 1000;
/** Hard cap per chunk: cuts continuous speech so text keeps flowing, and
 *  restarts speechless recordings so blobs never accumulate dead air. */
const MAX_UTTERANCE_MS = 10000;
/** Fixed cadence fallback when WebAudio is unavailable (no VAD possible). */
const FALLBACK_CHUNK_MS = 5000;

/** ElevenLabs role labels → transcript speakers. "agent" is the dispatcher at
 *  the laptop, "customer" the caller on speaker; anything unresolved (plain
 *  speaker_0/1 IDs, unknown) stays a neutral AUDIO line. */
function whoForSpeaker(speaker: string): Who {
  if (speaker === "agent") return "YOU";
  if (speaker === "customer") return "CALLER";
  return "AUDIO";
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export function useLiveTranscription(onFinal: (who: Who, text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterOkRef = useRef(false);
  // Per-chunk VAD state, reset by roll() for each new recorder.
  const chunkStartRef = useRef(0);
  const chunkHadSpeechRef = useRef(false);
  const silentMsRef = useRef(0);
  // Serializes uploads so transcript lines append in spoken order.
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightRef = useRef(0);
  // Latest callback without making start() depend on it (it's re-created every
  // render in the consuming hook).
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const transcribeChunk = useCallback((blob: Blob) => {
    inFlightRef.current += 1;
    setInterim("Transcribing");
    const body = new FormData();
    body.append("file", blob, "chunk.webm");
    const request = fetch("/api/stt", { method: "POST", body })
      .then(async (r): Promise<{ speaker: string; text: string }[]> => {
        if (r.status === 204) {
          setError("ElevenLabs STT isn't configured (ELEVENLABS_API_KEY missing) — transcription disabled.");
          return [];
        }
        if (!r.ok) return [];
        const d = (await r.json()) as { text?: string; segments?: { speaker: string; text: string }[] };
        if (d.segments?.length) return d.segments;
        const text = (d.text ?? "").trim();
        return text ? [{ speaker: "unknown", text }] : [];
      })
      .catch(() => [] as { speaker: string; text: string }[]);
    uploadChainRef.current = uploadChainRef.current.then(async () => {
      const segments = await request;
      for (const s of segments) onFinalRef.current(whoForSpeaker(s.speaker), s.text);
      inFlightRef.current -= 1;
      if (inFlightRef.current === 0) setInterim("");
    });
  }, []);

  /** Returns false when the browser can't record audio at all. */
  const start = useCallback((): boolean => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this browser.");
      return false;
    }
    if (activeRef.current) return true;
    activeRef.current = true;
    setError(null);
    setInterim("");

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        if (!activeRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Loudness meter doubling as the VAD: samples the mic every METER_MS,
        // tracks whether the current chunk has heard speech and how long it's
        // been silent since, and cuts the recorder at utterance boundaries.
        meterOkRef.current = false;
        try {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Uint8Array(analyser.fftSize);
          audioCtxRef.current = ctx;
          meterOkRef.current = true;
          meterTimerRef.current = setInterval(() => {
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            if (rms >= SILENCE_RMS) {
              chunkHadSpeechRef.current = true;
              silentMsRef.current = 0;
            } else {
              silentMsRef.current += METER_MS;
            }

            const rec = recorderRef.current;
            if (!rec || rec.state === "inactive") return;
            const elapsed = performance.now() - chunkStartRef.current;
            const endOfUtterance =
              chunkHadSpeechRef.current &&
              silentMsRef.current >= ENDPOINT_SILENCE_MS &&
              elapsed >= MIN_UTTERANCE_MS;
            if (endOfUtterance || elapsed >= MAX_UTTERANCE_MS) rec.stop();
          }, METER_MS);
        } catch {
          // No WebAudio → no VAD; fall back to fixed-cadence chunks below and
          // upload everything, which is just less thrifty.
        }

        const mimeType = pickMimeType();
        // Record in a stop/restart loop: each recorder produces one
        // self-contained blob, which onstop ships and then rolls the next.
        const roll = () => {
          if (!activeRef.current) return;
          const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          const parts: Blob[] = [];
          chunkStartRef.current = performance.now();
          chunkHadSpeechRef.current = !meterOkRef.current; // no VAD = assume speech
          silentMsRef.current = 0;
          rec.ondataavailable = (e) => {
            if (e.data.size > 0) parts.push(e.data);
          };
          rec.onstop = () => {
            if (parts.length && chunkHadSpeechRef.current && activeRef.current) {
              transcribeChunk(new Blob(parts, { type: rec.mimeType }));
            }
            roll();
          };
          rec.start();
          recorderRef.current = rec;
          if (!meterOkRef.current) {
            chunkTimerRef.current = setTimeout(() => {
              if (rec.state !== "inactive") rec.stop();
            }, FALLBACK_CHUNK_MS);
          }
        };

        setListening(true);
        roll();
      })
      .catch(() => {
        activeRef.current = false;
        setListening(false);
        setError("Microphone access was denied — allow the mic to transcribe the call.");
      });
    return true;
  }, [transcribeChunk]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
    chunkTimerRef.current = null;
    // Drop the in-progress partial chunk: stopRealCall runs its final form
    // extraction synchronously after this, so a transcript line arriving a
    // second later would miss it anyway — not worth the STT request.
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    if (meterTimerRef.current) clearInterval(meterTimerRef.current);
    meterTimerRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  return { start, stop, listening, interim, error };
}
