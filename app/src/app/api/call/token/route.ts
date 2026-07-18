import { NextRequest, NextResponse } from "next/server";

/**
 * Mints a short-lived ElevenLabs conversation token server-side (the API
 * key never reaches the browser — PRD §6.1 / §11). One agent handles every
 * scenario — the persona, first message, and voice settings are supplied
 * per-scenario at startSession time via `overrides` (see scenarios.ts and
 * useSession.ts), so there's a single agent to create in the ElevenLabs
 * dashboard rather than one per scenario. That agent must have prompt +
 * first-message overrides enabled under Security settings.
 *
 * If no key or agent id is configured, responds with mode:"sim" so the
 * client runs the scripted-timeline fallback instead of a real call.
 */
export async function POST(req: NextRequest) {
  const { scenarioId } = (await req.json().catch(() => ({}))) as { scenarioId?: string };

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

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
