import { NextResponse } from "next/server";
import { presageConfigured } from "@/lib/presage-server";

export const runtime = "nodejs";

/** Tells the client whether to run real Presage capture or the vitals sim fallback. */
export async function GET() {
  return NextResponse.json({ enabled: presageConfigured() });
}
