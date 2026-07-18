import { NextRequest, NextResponse } from "next/server";
import { pushFrame, presageConfigured } from "@/lib/presage-server";
import { PixelFormat } from "@smartspectra/node-sdk";

export const runtime = "nodejs";

/**
 * Receives one raw RGB video frame from the client's capture loop
 * (see src/hooks/usePresageVitals.ts) and feeds it into that session's
 * SmartSpectra pipeline. Body is the raw pixel bytes (no JSON, no base64 —
 * keeps this fast enough to run at several frames per second).
 */
export async function POST(req: NextRequest) {
  if (!presageConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 200 });
  }

  const sessionId = req.headers.get("x-session-id");
  const width = Number(req.headers.get("x-width"));
  const height = Number(req.headers.get("x-height"));
  const tsUs = Number(req.headers.get("x-ts-us"));

  if (!sessionId || !width || !height || !Number.isFinite(tsUs)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const accepted = pushFrame(sessionId, buffer, width, height, tsUs, PixelFormat.kRGB);
  return NextResponse.json({ ok: accepted });
}
