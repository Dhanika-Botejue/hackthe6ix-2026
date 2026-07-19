import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { NATURE_OPTIONS, RELATIONSHIP_OPTIONS } from "@/lib/incident";

/**
 * Real Call mode auto-fill: receives the live (mixed, un-diarized) transcript
 * of an in-progress emergency call and extracts the Incident Details form
 * fields from it. Called every few seconds while the call runs, always with
 * the full transcript so far — each response supersedes the last, and the
 * client only applies fields the dispatcher hasn't edited by hand.
 *
 * Returns 204 when GEMINI_API_KEY is missing so the client just leaves the
 * form manual.
 */

export const maxDuration = 30;

/** Same free-tier fallthrough as /api/grade. */
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3-flash"
].filter((m): m is string => Boolean(m));

interface ExtractRequest {
  transcript?: { who?: string; text: string; t?: number }[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    location: { type: Type.STRING, description: "Address / place of the emergency, empty if not yet stated" },
    /* Gemini rejects "" inside enum lists — "unknown" is the not-yet-stated
       sentinel and is stripped back to empty before reaching the client. */
    nature: { type: Type.STRING, enum: ["unknown", ...NATURE_OPTIONS] },
    safe: { type: Type.STRING, enum: ["unknown", "yes", "no", "unsure"] },
    count: { type: Type.STRING, description: "Number of people involved/injured, as digits, empty if unknown" },
    relationship: { type: Type.STRING, enum: ["unknown", ...RELATIONSHIP_OPTIONS] },
    suspect: { type: Type.STRING, description: "Suspect description if any" },
    hazards: { type: Type.STRING, description: "Scene safety hazards if any" },
    special: { type: Type.STRING, description: "Special considerations (child, elderly, pregnant, disability…)" },
  },
  required: ["location", "nature", "safe", "count", "relationship", "suspect", "hazards", "special"],
};

const FIELD_KEYS = ["location", "nature", "safe", "count", "relationship", "suspect", "hazards", "special"] as const;

function buildPrompt(body: ExtractRequest): string {
  const lines = (body.transcript ?? []).map((l) => l.text).join("\n");

  return `You are the form-filling assistant on a live 911 dispatch console.

Below is the live transcript of an emergency call still in progress. It was
captured by a single microphone picking up BOTH the dispatcher and the caller,
so lines are NOT labeled by speaker and may be fragmentary or mis-transcribed.

TRANSCRIPT SO FAR:
${lines || "(nothing said yet)"}

Extract the incident details that have been EXPLICITLY stated so far.
Rules:
- Only record facts actually said in the call. Never guess or invent. A
  free-text field that hasn't come up yet is the empty string ""; for the
  enum fields (nature, safe, relationship) use "unknown".
- "location": the emergency's address/place as stated (street, intersection,
  landmark, apartment number…). Clean up obvious transcription spacing, keep
  the caller's wording.
- "nature": pick the single closest category from the allowed list, or
  "unknown" if the type of emergency isn't clear yet.
- "safe": whether the CALLER is currently safe — "yes", "no", or "unsure"
  (use "unsure" when it was asked but the answer was ambiguous; "unknown" if
  the topic hasn't come up).
- "count": people involved or injured, as digits ("2", not "two").
- "relationship": caller's relationship to the victim/patient from the allowed
  list ("unknown" if not stated). "Victim (self)" when the caller is the victim.
- "suspect", "hazards", "special": short phrases from the call, "" if none.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return new NextResponse(null, { status: 204 });

  let body: ExtractRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.transcript?.length) return NextResponse.json({ fields: {} });

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(body);

  let lastErr: unknown = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Extraction is a lookup, not a reasoning task — disable thinking
          // tokens so the form fills fast and each call costs the minimum.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const parsed = JSON.parse(res.text ?? "") as Record<string, unknown>;

      const fields: Record<string, string> = {};
      for (const k of FIELD_KEYS) {
        const v = parsed?.[k];
        if (typeof v === "string" && v.trim() && v.trim() !== "unknown") fields[k] = v.trim();
      }
      return NextResponse.json({ model, fields });
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/not.?found|not.?supported|invalid.*model|permission|quota|429|404/i.test(msg)) continue;
      break;
    }
  }

  console.error("[extract] all models failed:", lastErr);
  return new NextResponse(null, { status: 204 });
}
