import { NextResponse } from "next/server";

/**
 * Real Call mode speech-to-text: receives one short self-contained audio chunk
 * (webm/mp4) recorded off the laptop mic and transcribes it with ElevenLabs
 * Scribe v2, with diarization + speaker role detection so the two sides of a
 * speakerphone call come back as separate, labeled segments instead of one
 * merged text block. Roles ("agent" = the dispatcher at the laptop,
 * "customer" = the caller on speaker) are semantic, so they stay consistent
 * across chunks — plain speaker_0/1 IDs are re-clustered per request and flip
 * between chunks, which is why they're only kept as a fallback.
 *
 * Returns 204 when ELEVENLABS_API_KEY is missing so the client can tell the
 * dispatcher transcription is unavailable (the form stays manual).
 */

export const maxDuration = 30;

interface ScribeWord {
  text: string;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string | null;
}

/** One contiguous run of words from a single speaker within the chunk. */
interface Segment {
  speaker: string;
  text: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new NextResponse(null, { status: 204 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* fall through to bad request */
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "missing audio" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "chunk.webm");
  upstream.append("model_id", "scribe_v2");
  upstream.append("language_code", "en");
  // Skip "(laughter)"-style annotations — the extractor only wants words.
  upstream.append("tag_audio_events", "false");
  upstream.append("diarize", "true");
  // Exactly two voices matter: the dispatcher and the caller on speaker.
  upstream.append("num_speakers", "2");
  upstream.append("detect_speaker_roles", "true");

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[stt] ElevenLabs ${res.status}:`, detail.slice(0, 300));
      return NextResponse.json({ error: `stt_failed_${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string; words?: ScribeWord[] };

    const segments: Segment[] = [];
    for (const w of data.words ?? []) {
      if (w.type === "audio_event" || !w.text) continue;
      const last = segments[segments.length - 1];
      // Spacing entries just glue words together — never start a segment on one.
      if (last && (w.type === "spacing" || (w.speaker_id ?? "unknown") === last.speaker)) {
        last.text += w.text;
      } else if (w.type !== "spacing") {
        segments.push({ speaker: w.speaker_id ?? "unknown", text: w.text });
      }
    }
    const cleaned = segments
      .map((s) => ({ speaker: s.speaker, text: s.text.trim() }))
      .filter((s) => s.text.length > 0);
    const text = (data.text ?? "").trim();
    // Older responses without word-level data still surface as one segment.
    if (cleaned.length === 0 && text) cleaned.push({ speaker: "unknown", text });

    return NextResponse.json({ text, segments: cleaned });
  } catch (err) {
    console.error("[stt] request failed:", err);
    return NextResponse.json({ error: "stt_error" }, { status: 502 });
  }
}
