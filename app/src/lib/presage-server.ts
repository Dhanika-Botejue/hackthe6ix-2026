import "server-only";
import type { PixelFormatValue } from "@smartspectra/node-sdk";

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
 * Falls back cleanly on two axes:
 *   1. No PRESAGE_API_KEY  → getOrCreateSession() returns null (sim mode).
 *   2. Native SDK can't load (e.g. an unsupported platform — the SDK ships
 *      binaries only for darwin-arm64/linux-x64/linux-arm64/win32-x64, so
 *      an Intel Mac has no runtime) → loadModules() returns null and every
 *      caller degrades to sim mode instead of crashing.
 * The native package is imported lazily (never at module load) so /api/vitals/status
 * and the sim path never touch it — otherwise an eager top-level import throws
 * on unsupported platforms before any key/status check can run.
 */

type SdkModule = typeof import("@smartspectra/node-sdk");
type MessagesModule = typeof import("@smartspectra/node-sdk/messages");
type SmartSpectraInstance = InstanceType<SdkModule["SmartSpectraSDK"]>;

let modulesPromise: Promise<{ sdk: SdkModule; messages: MessagesModule } | null> | null = null;

/** Lazily load the native SDK once. Returns null (and warns) if it can't load. */
async function loadModules(): Promise<{ sdk: SdkModule; messages: MessagesModule } | null> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import("@smartspectra/node-sdk"),
      import("@smartspectra/node-sdk/messages"),
    ])
      .then(([sdk, messages]) => ({ sdk, messages }))
      .catch((err: unknown) => {
        console.warn(
          "[presage] native SmartSpectra SDK unavailable — falling back to simulated vitals:",
          err instanceof Error ? err.message : err
        );
        return null;
      });
  }
  return modulesPromise;
}

export interface TracePoint {
  t: number;
  v: number;
}

export interface LatestVitals {
  pulseRate?: number;
  breathingRate?: number;
  /**
   * SmartSpectra reports pulseRate as a 12s rolling average and breathingRate as a
   * 30s rolling average (Presage's own docs: "Confidence is 0 until the full
   * N-second window is reached") — these flip true once that window has filled and
   * the value is considered reliable. Before that, a real physiological change can
   * take up to the full window to show up in the reported number; this isn't a bug
   * in the app, it's how the underlying rPPG measurement works.
   */
  pulseStable?: boolean;
  breathingStable?: boolean;
  pulseConfidence?: number;
  breathingConfidence?: number;
  /** Recent chest-movement trace (rises on inhale, falls on exhale) for a live waveform. */
  breathingTrace?: TracePoint[];
  /** Recent pulse-rate history (BPM over time) for a live trend line. */
  pulseTrace?: TracePoint[];
  /** 0..1 tension proxy derived from SmartSpectra's facial expression classifier. */
  faceTension?: number;
  /** Human-readable label for the highest-confidence expression class this tick. */
  expression?: string;
  lastMetricsAt?: number;
  validation?: { code: number; hint: string; at: number };
  error?: { code: number; message: string; retryable: boolean };
}

interface PresageSession {
  sdk: SmartSpectraInstance;
  latest: LatestVitals;
  lastFrameAt: number;
  /** Timestamps (µs) of the last breathing-trace / pulse-rate sample already appended, so repeated windowed `metrics` events only append genuinely new points. */
  lastBreathingTraceTs: number;
  lastPulseTraceTs: number;
}

const BREATHING_TRACE_MAX_AGE_US = 20_000_000; // 20s of chest-movement history — a few breath cycles
const BREATHING_TRACE_MAX_LEN = 2000;
const PULSE_TRACE_MAX_AGE_US = 60_000_000; // 60s HR trend
const PULSE_TRACE_MAX_LEN = 300;

/** Append any samples newer than `lastTs` (tracked per-session) into `buffer`, then trim by age/length. */
function appendNewTracePoints(
  buffer: TracePoint[],
  measurements: { value?: number | null; timestamp?: number | { toNumber(): number } | null }[] | null | undefined,
  session: PresageSession,
  tsField: "lastBreathingTraceTs" | "lastPulseTraceTs",
  maxAgeUs: number,
  maxLen: number
) {
  if (!measurements || measurements.length === 0) return;
  let lastTs = session[tsField];
  for (const m of measurements) {
    if (m.value == null || m.timestamp == null) continue;
    const t = typeof m.timestamp === "number" ? m.timestamp : m.timestamp.toNumber();
    if (t <= lastTs) continue;
    buffer.push({ t, v: m.value });
    lastTs = t;
  }
  session[tsField] = lastTs;
  const cutoff = (buffer.at(-1)?.t ?? 0) - maxAgeUs;
  while (buffer.length && buffer[0].t < cutoff) buffer.shift();
  while (buffer.length > maxLen) buffer.shift();
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

// ExpressionType: 0 UNSPECIFIED, 1 ANGRY, 2 CONTEMPT, 3 DISGUST, 4 FEAR, 5 HAPPY, 6 NEUTRAL, 7 SAD, 8 SURPRISE
const EXPRESSION_LABELS: Record<number, string> = {
  0: "UNKNOWN",
  1: "ANGRY",
  2: "CONTEMPT",
  3: "DISGUST",
  4: "FEAR",
  5: "HAPPY",
  6: "NEUTRAL",
  7: "SAD",
  8: "SURPRISE",
};
// Per-emotion stress weight (0..1) — ANGRY/FEAR/SURPRISE read as fully stressed;
// DISGUST slightly less so; SAD counts too but only partially ("a little bit"),
// since it's a much milder physiological stress response than fear/anger.
const STRESS_WEIGHTS: Record<number, number> = {
  1: 1.0, // ANGRY
  3: 0.9, // DISGUST
  4: 1.0, // FEAR
  7: 0.6, // SAD
  8: 1.0, // SURPRISE
};

/**
 * Single pass over SmartSpectra's per-tick expression scores: the dominant
 * (highest-confidence) class as a human-readable label, plus a 0..1 tension
 * proxy (weighted sum of "stressed" classes minus neutral) fed into
 * computeComposure.
 */
function analyzeExpression(expression: unknown): { label?: string; tension?: number } {
  const scores = (expression as { scores?: { type?: number; confidence?: number }[] } | undefined)?.scores;
  if (!scores || scores.length === 0) return {};

  let stressed = 0;
  let neutral = 0;
  let best: { type: number; confidence: number } | undefined;
  for (const s of scores) {
    if (s.type === undefined) continue;
    const conf = s.confidence ?? 0;
    const weight = STRESS_WEIGHTS[s.type];
    if (weight !== undefined) stressed += conf * weight;
    if (s.type === 6) neutral = conf;
    if (!best || conf > best.confidence) best = { type: s.type, confidence: conf };
  }

  return {
    label: best ? EXPRESSION_LABELS[best.type] ?? "UNKNOWN" : undefined,
    tension: Math.max(0, Math.min(1, (stressed - neutral) / 100)),
  };
}

export async function getOrCreateSession(sessionId: string): Promise<PresageSession | null> {
  const apiKey = process.env.PRESAGE_API_KEY;
  if (!apiKey) return null;

  const existing = sessions().get(sessionId);
  if (existing) return existing;

  const mods = await loadModules();
  if (!mods) return null;
  const { SmartSpectraSDK, FrameTransform, breathingMetrics } = mods.sdk;
  const { decodeMetrics } = mods.messages;

  const sdk = new SmartSpectraSDK({
    apiKey,
    // Request ONLY the metrics this app actually reads, not the full
    // cardio/face bundles. Every requested metric makes the SDK load its
    // backing inference model, and a single model the API key isn't
    // provisioned for kills the entire native graph (observed live: the
    // cardio bundle's ARTERIAL_PRESSURE_TRACE → phasic-bp-inference 503'd
    // "Model not available", which took pulse rate down with it even though
    // the pulse model itself was fine). Codes from the SDK's constants.js:
    // 15 = PULSE_RATE, 14 = EXPRESSIONS.
    requestedMetrics: [...breathingMetrics, 15, 14],
  });

  const entry: PresageSession = {
    sdk,
    latest: { breathingTrace: [], pulseTrace: [] },
    lastFrameAt: Date.now(),
    lastBreathingTraceTs: 0,
    lastPulseTraceTs: 0,
  };

  sdk.on("metrics", (buf, tsUs) => {
    try {
      const metrics = decodeMetrics(buf);
      const pulse = metrics.cardio?.pulseRate?.at(-1);
      const breathing = metrics.breathing?.rate?.at(-1);
      const { label: expression, tension: faceTension } = analyzeExpression(metrics.face?.expression?.at(-1));
      if (pulse?.value != null) {
        entry.latest.pulseRate = pulse.value;
        entry.latest.pulseStable = pulse.stable ?? undefined;
        entry.latest.pulseConfidence = pulse.confidence ?? undefined;
      }
      if (breathing?.value != null) {
        entry.latest.breathingRate = breathing.value;
        entry.latest.breathingStable = breathing.stable ?? undefined;
        entry.latest.breathingConfidence = breathing.confidence ?? undefined;
      }
      if (faceTension !== undefined) entry.latest.faceTension = faceTension;
      if (expression !== undefined) entry.latest.expression = expression;
      appendNewTracePoints(entry.latest.breathingTrace!, metrics.breathing?.upperTrace, entry, "lastBreathingTraceTs", BREATHING_TRACE_MAX_AGE_US, BREATHING_TRACE_MAX_LEN);
      appendNewTracePoints(entry.latest.pulseTrace!, metrics.cardio?.pulseRate, entry, "lastPulseTraceTs", PULSE_TRACE_MAX_AGE_US, PULSE_TRACE_MAX_LEN);
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
    // Non-retryable errors (e.g. a timestamp-gap violation from a stalled/backgrounded
    // tab) wedge this session's internal pipeline permanently — no further "metrics"
    // events will ever fire on it. Drop it so the next pushFrame() transparently spins
    // up a fresh SDK instance instead of vitals staying dead for the rest of the call.
    if (!retryable && sessions().get(sessionId) === entry) {
      sessions().delete(sessionId);
      void sdk
        .stopAsync()
        .catch(() => {})
        .then(() => sdk.destroy())
        .catch(() => {});
    }
  });

  sdk.useCustomInput(FrameTransform.kNone);
  sdk.start();

  sessions().set(sessionId, entry);
  startSweep();
  return entry;
}

export async function pushFrame(
  sessionId: string,
  buffer: Buffer,
  width: number,
  height: number,
  timestampUs: number,
  pixelFormat?: PixelFormatValue
): Promise<boolean> {
  const session = await getOrCreateSession(sessionId);
  if (!session) return false;
  const mods = await loadModules();
  if (!mods) return false;
  const { PixelFormat } = mods.sdk;
  const format = pixelFormat ?? PixelFormat.kRGB;
  session.lastFrameAt = Date.now();
  const stride = width * bytesPerPixel(format, PixelFormat);
  try {
    return session.sdk.sendFrame(buffer, width, height, stride, format, timestampUs);
  } catch {
    // e.g. a backgrounded/throttled browser tab skipping capture ticks trips the
    // native SDK's max-timestamp-gap check — drop this frame, keep the session alive.
    return false;
  }
}

function bytesPerPixel(format: PixelFormatValue, PixelFormat: SdkModule["PixelFormat"]): number {
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
