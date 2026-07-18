import { NextRequest, NextResponse } from "next/server";

/**
 * Mints a short-lived ElevenLabs conversation token server-side (the API key
 * never reaches the browser — PRD §6.1 / §11). There is one conversational
 * agent per case type (robbery, assault, …); the requested scenario selects
 * which agent to use. Each agent's persona, first message, and voice are
 * configured on the ElevenLabs dashboard.
 *
 * If the API key or the selected case's agent id is not configured, responds
 * with mode:"sim" so the client runs the scripted-timeline fallback.
 */
export async function POST(req: NextRequest) {
  const { scenarioId } = (await req.json().catch(() => ({}))) as { scenarioId?: string };

  const apiKey = process.env.ELEVENLABS_API_KEY;

  // One ElevenLabs agent per case type. The level system (future) decides which
  // case a scenario maps to; until then everything uses the robbery agent, which
  // preserves current behavior. Unconfigured (blank) agents fall back to sim.
  const agentByCase: Record<string, string | undefined> = {
    robbery: process.env.ELEVENLABS_ROBBERY_AGENT_ID,
    assault: process.env.ELEVENLABS_ASSAULT_AGENT_ID,
    fire: process.env.ELEVENLABS_FIRE_AGENT_ID,
    cardiac: process.env.ELEVENLABS_CARDIAC_AGENT_ID,
    domestic: process.env.ELEVENLABS_DOMESTIC_AGENT_ID,
  };
  // Lesson dots (Home.tsx) → case → agent. Add rows as scenarios/levels grow.
  const caseByScenario: Record<string, string> = {
    "street-assault": "assault",
    "house-fire": "fire",
    "cardiac-arrest": "robbery",
  };
  const caseKey = (scenarioId && caseByScenario[scenarioId]) || "robbery";
  const agentId = agentByCase[caseKey];

  if (!apiKey || !agentId) {
    return NextResponse.json({ mode: "sim" as const });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ mode: "sim" as const, reason: `token_mint_failed_${res.status}` });
    }

    const data = (await res.json()) as { token: string };
    return NextResponse.json({ mode: "live" as const, token: data.token, agentId, scenarioId });
  } catch {
    return NextResponse.json({ mode: "sim" as const, reason: "token_mint_error" });
  }
}
