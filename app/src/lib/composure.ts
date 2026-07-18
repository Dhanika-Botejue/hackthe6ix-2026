import type { Band } from "./types";

export const RED = "oklch(0.52 0.17 27)";
export const AMBER = "oklch(0.66 0.13 75)";
export const GREEN = "oklch(0.55 0.11 155)";

/** Raw band from a composure value, no hysteresis. */
export function rawBandOf(comp: number): Band {
  return comp < 40 ? "red" : comp < 70 ? "amber" : "green";
}

/**
 * Band with hysteresis so the UI doesn't flicker at the 40/70 edges.
 * Pass the previous band; only crosses when clearly past the edge.
 */
export function bandOf(comp: number, prev?: Band): Band {
  if (!prev) return rawBandOf(comp);
  if (prev === "red") return comp >= 43 ? bandOf(comp, "amber") : "red";
  if (prev === "amber") {
    if (comp < 37) return "red";
    if (comp >= 73) return "green";
    return "amber";
  }
  // prev === "green"
  return comp < 67 ? bandOf(comp, "amber") : "green";
}

export function bandColor(b: Band): string {
  return b === "red" ? RED : b === "amber" ? AMBER : GREEN;
}

export function bandLabel(b: Band): string {
  return b === "red"
    ? "▼ RED — CALLER DEGRADING"
    : b === "amber"
    ? "● AMBER — CALLER HOLDING"
    : "▲ GREEN — SCENARIO ESCALATES";
}

export function mmss(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

/**
 * Composure score, 1-100, from HR delta off baseline + breathing-rate delta +
 * an optional facial-emotion tension signal. Tuned deliberately sensitive for
 * demo purposes (a judge should visibly read as "not composed" without needing
 * an extreme physiological spike):
 *   - HR: +20bpm over baseline saturates that input.
 *   - Breathing: +6 breaths/min over baseline saturates that input.
 *   - Emotion carries up to 30% since facial expression reacts within ~1-2s —
 *     far faster than either physiological rate.
 *
 * A plain weighted average dilutes any single strongly-elevated signal (e.g.
 * breathing alone maxing out only moved the old score by ~25 points, reading as
 * "moderate" instead of "seriously stressed") — so the strongest single input
 * dominates (80%), with the weighted average folded in at 20% only to sharpen a
 * genuine multi-signal reaction over one borderline blip on a single sensor.
 * One input fully saturating now drives composure into the "high stress" band
 * on its own, matching what a judge watching the demo would expect to see.
 *
 * Callers are expected to pass "hold last known value" fallbacks for hr/br/
 * faceTension when a signal is momentarily unavailable (lost face-lock,
 * recalibrating, etc.) rather than resetting to baseline/neutral — a data gap
 * isn't evidence of calm.
 */
export function computeComposure(opts: {
  hr: number;
  baselineHr: number;
  br: number;
  baselineBr: number;
  faceTension?: number; // 0..1, optional
}): number {
  const hrStress = clamp((opts.hr - opts.baselineHr) / 20, 0, 1);
  const rrStress = clamp((opts.br - opts.baselineBr) / 6, 0, 1);
  const faceStress = clamp(opts.faceTension ?? 0, 0, 1);

  const weightedAvg = 0.45 * hrStress + 0.25 * rrStress + 0.3 * faceStress;
  const strongest = Math.max(hrStress, rrStress, faceStress);
  const stress = 0.8 * strongest + 0.2 * weightedAvg;

  return clamp(Math.round(1 + 99 * (1 - stress)), 1, 100);
}

/**
 * Estimates a live breathing rate directly from the raw chest-movement waveform
 * (rises on inhale, falls on exhale) instead of using Presage's own breathingRate,
 * which is a 30s rolling average and barely moves during a short demo call. Lightly
 * smooths the trace to remove high-frequency noise (cardiac ripple, camera jitter)
 * while preserving the slower breathing envelope, then counts downward zero-crossings
 * of the mean-centered signal over a trailing window — each one marks one completed
 * breath cycle.
 *
 * Returns undefined (never a fabricated number) when there isn't enough data yet, the
 * window is too short to trust, or the detected rate falls outside plausible human
 * breathing range (likely noise, not a real cycle) — callers should fall back to
 * Presage's own breathingRate or the last known value, never to 0/neutral.
 */
export function estimateBreathingRateFromTrace(
  trace: { t: number; v: number }[] | undefined,
  windowUs = 12_000_000
): number | undefined {
  if (!trace || trace.length < 20) return undefined;

  const tEnd = trace[trace.length - 1].t;
  const windowed = trace.filter((p) => p.t >= tEnd - windowUs);
  if (windowed.length < 20) return undefined;

  const windowSecs = (windowed[windowed.length - 1].t - windowed[0].t) / 1_000_000;
  if (windowSecs < 8) return undefined; // too short a span to trust a rate estimate yet

  // ~300ms moving average at typical ~30fps capture — smooths noise, keeps the breath envelope.
  const SMOOTH_N = 9;
  const smoothed = windowed.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - SMOOTH_N + 1); j <= i; j++) {
      sum += windowed[j].v;
      count++;
    }
    return sum / count;
  });

  const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;

  let crossings = 0;
  for (let i = 1; i < smoothed.length; i++) {
    if (smoothed[i - 1] - mean > 0 && smoothed[i] - mean <= 0) crossings++;
  }

  const rate = (crossings / windowSecs) * 60;
  if (rate < 4 || rate > 40) return undefined; // outside plausible human breathing range — likely noise

  return rate;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Exponential moving average step. */
export function ema(prev: number, next: number, alpha: number): number {
  return prev + (next - prev) * alpha;
}
