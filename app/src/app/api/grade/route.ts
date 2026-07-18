import { NextResponse } from "next/server";

/**
 * Grades the trainee's communication / decision-making (the "Responses"
 * pillar). Uses Gemini when GEMINI_API_KEY is set; otherwise returns 204 so
 * the client keeps its local heuristic grade.
 */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return new NextResponse(null, { status: 204 });

  let body: { scenario?: string; transcript?: { who: string; text: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const lines = (body.transcript ?? [])
    .map((l) => `${l.who === "YOU" ? "DISPATCHER" : "CALLER"}: ${l.text}`)
    .join("\n");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const prompt = `You are a 911 dispatch training evaluator. Grade the DISPATCHER's communication and decision-making during this emergency call on a scale of 0-10.

Scenario: ${body.scenario ?? "unknown"}

Transcript:
${lines || "(no dispatcher turns recorded)"}

Judge: did they get the location first, stay calm and reassuring, ask one clear question at a time, confirm caller safety, and give correct life-saving instructions? Reply ONLY with strict JSON of the form:
{"score": <0-10 integer>, "good": ["..."], "improve": ["..."]}
Use 2-4 short "good" points and 1-3 "improve" points, each one sentence.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
      }
    );
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text);
    const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score) || 0)));
    const good = Array.isArray(parsed.good) ? parsed.good.slice(0, 4).map(String) : [];
    const improve = Array.isArray(parsed.improve) ? parsed.improve.slice(0, 3).map(String) : [];
    return NextResponse.json({ score, good, improve });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
