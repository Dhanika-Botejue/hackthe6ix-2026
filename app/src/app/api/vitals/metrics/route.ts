import { NextRequest, NextResponse } from "next/server";
import { getLatest, presageConfigured } from "@/lib/presage-server";

export const runtime = "nodejs";

/** Polled ~1/sec by the client (matches the PRD's 1Hz vitals tick) for the latest decoded metrics. */
export async function GET(req: NextRequest) {
  if (!presageConfigured()) {
    return NextResponse.json({ enabled: false });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ enabled: true, ready: false }, { status: 400 });
  }

  const latest = getLatest(sessionId);
  return NextResponse.json({ enabled: true, ready: latest !== null, ...latest });
}
