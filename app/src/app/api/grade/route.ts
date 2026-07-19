import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Post-call grader (the "Responses" and "Incident Details" pillars).
 *
 * Receives the full call context — scenario brief, complete transcript,
 * the trainee's incident form, the scenario's answer key, and a vitals
 * summary — and asks Gemini for a structured grade. The Composure pillar is
 * intentionally NOT graded here: it is computed deterministically from the
 * measured vitals (avg composure /10, automatic 0 on any dip below 50%),
 * per the product spec.
 *
 * Returns 204 when GEMINI_API_KEY is missing so the client keeps its local
 * fallback grades.
 */

export const maxDuration = 60;

/** Free-tier models, best first; we fall through on availability errors. */
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash"
].filter((m): m is string => Boolean(m));

interface GradeRequest {
  scenario?: { name?: string; desc?: string; diff?: string };
  transcript?: { who: string; text: string; t?: number }[];
  incident?: {
    fields: { key: string; label: string; answer: string; correct: string; na?: boolean }[];
  };
  vitals?: { avgComposure?: number; lowestComposure?: number; avgHr?: number; avgBr?: number; durationSecs?: number };
  /** key -> seconds into the call when the trainee first raised that topic (deterministic, not Gemini's guess). */
  checks?: Record<string, number | undefined>;
}

const CHECK_LABELS: Record<string, string> = {
  location: "Address",
  nature: "Nature of emergency",
  victims: "Victim count",
  breathing: "Breathing status",
  safety: "Caller safety",
};

function mmss(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    responses: {
      type: Type.OBJECT,
      description: "Grade of the dispatcher's communication and decision-making.",
      properties: {
        score: { type: Type.INTEGER, description: "0-10" },
        good: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-4 one-sentence strengths" },
        improve: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-3 one-sentence improvements" },
      },
      required: ["score", "good", "improve"],
    },
    incident: {
      type: Type.OBJECT,
      description: "Per-field grading of the trainee's incident form.",
      properties: {
        fields: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING },
              verdict: { type: Type.STRING, enum: ["correct", "wrong", "na"] },
            },
            required: ["key", "verdict"],
          },
        },
      },
      required: ["fields"],
    },
  },
  required: ["responses", "incident"],
};

function buildPrompt(body: GradeRequest): string {
  const lines = (body.transcript ?? [])
    .map((l) => `[${l.t !== undefined ? mmss(l.t) : "?:??"}] ${l.who === "YOU" ? "DISPATCHER" : "CALLER"}: ${l.text}`)
    .join("\n");

  const checks = body.checks ?? {};
  const checklistTiming = Object.entries(CHECK_LABELS)
    .map(([key, label]) => {
      const t = checks[key];
      return `- ${label}: ${t !== undefined ? `raised at ${mmss(t)} into the call` : "never raised by the dispatcher"}`;
    })
    .join("\n");

  const fields = (body.incident?.fields ?? [])
    .map(
      (f) =>
        `- key="${f.key}" | field: ${f.label} | trainee wrote: ${f.answer || "(blank)"} | ground truth: ${
          f.na ? "(not applicable in this scenario)" : f.correct
        }`
    )
    .join("\n");

  const v = body.vitals;
  const vitals = v
    ? `Average composure ${v.avgComposure ?? "?"}%, lowest ${v.lowestComposure ?? "?"}%, avg heart rate ${v.avgHr ?? "?"} bpm, avg breathing ${v.avgBr ?? "?"}/min, call length ${v.durationSecs ?? "?"}s.`
    : "unavailable";

  return `You are a senior 911 dispatch training evaluator reviewing a trainee's simulated emergency call.

SCENARIO: ${body.scenario?.name ?? "unknown"} (${body.scenario?.diff ?? "?"} difficulty)
${body.scenario?.desc ?? ""}

TRAINEE VITALS DURING THE CALL (context only — do not score composure): ${vitals}

PROTOCOL CHECKLIST TIMING (ground truth, computed deterministically — use these
timestamps for any judgment about whether/how quickly the dispatcher asked
about each topic; do NOT re-derive timing yourself from re-reading the
transcript, and do not claim something was asked "late" or suggest asking for
it "earlier" if its timestamp here is already early in the call):
${checklistTiming}

FULL CALL TRANSCRIPT (each line timestamped mm:ss from call start):
${lines || "(no dispatcher turns recorded — the trainee never spoke)"}

TRAINEE'S INCIDENT DETAILS FORM vs GROUND TRUTH:
${fields || "(form not submitted)"}

Your two tasks:

1. "responses" — grade the DISPATCHER's communication and decision-making 0-10.
   Criteria: got the location early and confirmed it (check the PROTOCOL CHECKLIST TIMING section above for this — never guess); stayed calm and reassuring toward a panicking caller; asked one clear question at a time; explicitly checked the caller's safety (and re-checked after threats); gathered victim count and breathing status; gave correct life-saving instructions when needed (CPR, evacuate, shelter); professional language. An empty or near-empty transcript means the trainee froze: score 0-2. Write 2-4 specific "good" bullets and 1-3 specific "improve" bullets, each one sentence, each referring to what actually happened in THIS transcript (quote or paraphrase real moments; never invent events, and never suggest improving on something the checklist timing already shows was done promptly).

2. "incident" — for EVERY field key listed above, judge the trainee's written answer against ground truth semantically, not literally. "5th and main" matches "Fifth and Main". "2" matches "two". "black hoodie, tall and thin" matches "Dark hoodie, 6'0, skinny build". Different formatting, abbreviations, or extra detail that is still accurate → "correct". Blank, missing, or factually wrong → "wrong". Fields whose ground truth is "(not applicable in this scenario)" → "na" regardless of what the trainee wrote, unless they invented false information, in which case "wrong".

Return every field key exactly as given.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return new NextResponse(null, { status: 204 });

  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(body);

  let lastErr: unknown = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      const parsed = JSON.parse(res.text ?? "");

      const score = Math.max(0, Math.min(10, Math.round(Number(parsed?.responses?.score) || 0)));
      const good: string[] = Array.isArray(parsed?.responses?.good) ? parsed.responses.good.slice(0, 4).map(String) : [];
      const improve: string[] = Array.isArray(parsed?.responses?.improve) ? parsed.responses.improve.slice(0, 3).map(String) : [];

      const verdicts: Record<string, string> = {};
      if (Array.isArray(parsed?.incident?.fields)) {
        for (const f of parsed.incident.fields) {
          if (f?.key && ["correct", "wrong", "na"].includes(f?.verdict)) verdicts[String(f.key)] = String(f.verdict);
        }
      }

      return NextResponse.json({
        model,
        responses: { score, good, improve },
        incident: { verdicts },
      });
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Model unavailable / not found / quota → try the next candidate.
      if (/not.?found|not.?supported|invalid.*model|permission|quota|429|404/i.test(msg)) continue;
      break;
    }
  }

  console.error("[grade] all models failed:", lastErr);
  return new NextResponse(null, { status: 204 });
}
