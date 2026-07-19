"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Live speech-to-text off the laptop microphone via the Web Speech API
 * (Chrome/Edge). Used by Real Call mode: the dispatcher sets the phone on
 * speaker next to the laptop and both sides of the conversation get picked up
 * by the one mic — so there is no reliable speaker separation; every final
 * chunk is delivered as a single undifferentiated "AUDIO" line.
 *
 * Chrome silently ends a continuous recognition session every ~60s (and on any
 * long silence), so `onend` restarts it for as long as `activeRef` says the
 * call is still going.
 */

/* Minimal typings — TS's dom lib doesn't ship SpeechRecognition. */
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function useLiveTranscription(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const interimRef = useRef("");
  // Latest callback without making start() depend on it (it's re-created every
  // render in the consuming hook).
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  /** Returns false when the browser has no speech recognition at all. */
  const start = useCallback((): boolean => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError("Speech recognition is not supported in this browser — use Chrome or Edge.");
      return false;
    }
    if (activeRef.current) return true;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (r.isFinal) {
          if (text) onFinalRef.current(text);
        } else {
          pending += " " + text;
        }
      }
      interimRef.current = pending.trim();
      setInterim(interimRef.current);
    };
    rec.onend = () => {
      // Flush whatever was still interim so it isn't lost across the restart.
      const leftover = interimRef.current;
      interimRef.current = "";
      setInterim("");
      if (leftover) onFinalRef.current(leftover);
      if (activeRef.current) {
        try {
          rec.start();
        } catch {
          /* already restarting */
        }
      } else {
        setListening(false);
      }
    };
    rec.onerror = (e) => {
      // "no-speech"/"aborted" are routine during quiet stretches; onend restarts.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setListening(false);
        setError("Microphone access was denied — allow the mic to transcribe the call.");
      }
    };

    activeRef.current = true;
    setError(null);
    interimRef.current = "";
    setInterim("");
    try {
      rec.start();
    } catch {
      /* start() throws if a previous instance is still winding down */
    }
    recRef.current = rec;
    setListening(true);
    return true;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    recRef.current?.stop(); // onend flushes any leftover interim as a final line
    recRef.current = null;
    setListening(false);
  }, []);

  return { start, stop, listening, interim, error };
}
