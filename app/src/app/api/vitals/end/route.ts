import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/presage-server";

export const runtime = "nodejs";

/** Tears down a session's native SmartSpectra pipeline (call on unmount / leaving the app). */
export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (sessionId) await endSession(sessionId);
  return NextResponse.json({ ok: true });
}
