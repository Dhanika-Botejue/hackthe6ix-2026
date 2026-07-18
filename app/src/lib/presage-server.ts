import "server-only";
import {
  SmartSpectraSDK,
  PixelFormat,
  FrameTransform,
  breathingMetrics,
  cardioMetrics,
  faceMetrics,
  type PixelFormatValue,
} from "@smartspectra/node-sdk";
import { decodeMetrics } from "@smartspectra/node-sdk/messages";

/**
 * Server-side Presage SmartSpectra session manager (PRD §6.2, §14 open
 * question #1). The SmartSpectra Node SDK is native-FFI and headless-only —
 * there is no browser SDK, so the browser streams webcam frames to us
 * (see /api/vitals/frame) and we push them into a persistent per-session
 * SDK instance via useCustomInput()/sendFrame(). This only works when API
 * routes run in a single long-lived Node process (self-hosted `next start`
 * or a Node-runtime deployment with instance reuse) — not on a
 * cold-start-per-request serverless platform.
 *
 * Falls back cleanly: getOrCreateSession() returns null when
 * PRESAGE_API_KEY isn't set, and every route treats that as "sim mode" —
 * see /api/vitals/status.
 */

export interface LatestVitals {
  pulseRate?: number;
  breathingRate?: number;
  /** 0..1 tension proxy derived from SmartSpectra's facial expression classifier. */
  faceTension?: number;
  lastMetricsAt?: number;
  validation?: { code: number; hint: string; at: number };
  error?: { code: number; message: string; retryable: boolean };
}

interface PresageSession {
  sdk: SmartSpectraSDK;
  latest: LatestVitals;
  lastFrameAt: number;
}

const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const SWEEP_INTERVAL_MS = 30 * 1000;

// Survive Next.js dev-server module re-evaluation on hot reload.
const g = globalThis as unknown as {
  __presageSessions?: Map<string, PresageSession>;
  __presageSweepStarted?: boolean;
};

function sessions(): Map<string, PresageSession> {
  if (!g.__presageSessions) g.__presageSessions = new Map();
  return g.__presageSessions;
}

function startSweep() {
  if (g.__presageSweepStarted) return;
  g.__presageSweepStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions()) {
      if (now - s.lastFrameAt > IDLE_TIMEOUT_MS) {
        void endSession(id);
      }
    }
  }, SWEEP_INTERVAL_MS).unref();
}

export function presageConfigured(): boolean {
  return Boolean(process.env.PRESAGE_API_KEY);
}

/** Sum of the "stressed" expression classes minus neutral, normalized to 0..1. */
function faceTensionFromExpression(expression: unknown): number | undefined {
  const scores = (expression as { scores?: { type?: number; confidence?: number }[] } | undefined)?.scores;
  if (!scores || scores.length === 0) return undefined;
  // ExpressionType: 0 UNSPECIFIED, 1 ANGRY, 2 CONTEMPT, 3 DISGUST, 4 FEAR, 5 HAPPY, 6 NEUTRAL, 7 SAD, 8 SURPRISE
  const STRESSED = new Set([1, 3, 4, 8]);
  let stressed = 0;
  let neutral = 0;
  for (const s of scores) {
    const conf = s.confidence ?? 0;
    if (s.type !== undefined && STRESSED.has(s.type)) stressed += conf;
    if (s.type === 6) neutral = conf;
  }
  const tension = (stressed - neutral) / 100;
  return Math.max(0, Math.min(1, tension));
}

export function getOrCreateSession(sessionId: string): PresageSession | null {
  const apiKey = process.env.PRESAGE_API_KEY;
  if (!apiKey) return null;

  const existing = sessions().get(sessionId);
  if (existing) return existing;

  const sdk = new SmartSpectraSDK({
    apiKey,
    requestedMetrics: [...breathingMetrics, ...cardioMetrics, ...faceMetrics],
  });

  const entry: PresageSession = { sdk, latest: {}, lastFrameAt: Date.now() };

  sdk.on("metrics", (buf, tsUs) => {
    try {
      const metrics = decodeMetrics(buf);
      const pulseRate = metrics.cardio?.pulseRate?.at(-1)?.value ?? undefined;
      const breathingRate = metrics.breathing?.rate?.at(-1)?.value ?? undefined;
      const faceTension = faceTensionFromExpression(metrics.face?.expression?.at(-1));
      if (pulseRate !== undefined) entry.latest.pulseRate = pulseRate;
      if (breathingRate !== undefined) entry.latest.breathingRate = breathingRate;
      if (faceTension !== undefined) entry.latest.faceTension = faceTension;
      entry.latest.lastMetricsAt = Number(tsUs);
    } catch {
      // Malformed/partial buffer — skip this tick, keep last-good values.
    }
  });

  sdk.on("validationStatus", (code, tsUs, hint) => {
    entry.latest.validation = { code, hint, at: Number(tsUs) };
  });

  sdk.on("error", (code, message, retryable) => {
    entry.latest.error = { code, message, retryable };
  });

  sdk.useCustomInput(FrameTransform.kNone);
  sdk.start();

  sessions().set(sessionId, entry);
  startSweep();
  return entry;
}

export function pushFrame(
  sessionId: string,
  buffer: Buffer,
  width: number,
  height: number,
  timestampUs: number,
  pixelFormat: PixelFormatValue = PixelFormat.kRGB
): boolean {
  const session = getOrCreateSession(sessionId);
  if (!session) return false;
  session.lastFrameAt = Date.now();
  const stride = width * bytesPerPixel(pixelFormat);
  return session.sdk.sendFrame(buffer, width, height, stride, pixelFormat, timestampUs);
}

function bytesPerPixel(format: PixelFormatValue): number {
  switch (format) {
    case PixelFormat.kRGBA:
    case PixelFormat.kBGRA:
      return 4;
    case PixelFormat.kRGB:
    case PixelFormat.kBGR:
      return 3;
    default:
      return 1;
  }
}

export function getLatest(sessionId: string): LatestVitals | null {
  return sessions().get(sessionId)?.latest ?? null;
}

export async function endSession(sessionId: string): Promise<void> {
  const session = sessions().get(sessionId);
  if (!session) return;
  sessions().delete(sessionId);
  try {
    await session.sdk.stopAsync();
    await session.sdk.destroy();
  } catch {
    // Best-effort teardown — nothing more we can do if the native session is wedged.
  }
}
