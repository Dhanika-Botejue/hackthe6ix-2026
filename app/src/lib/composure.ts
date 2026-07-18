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
 * Composure score, 0-100, from HR delta off baseline + breathing rate delta
 * + an optional facial-tension signal. Weighted per PRD 6.2.
 */
export function computeComposure(opts: {
  hr: number;
  baselineHr: number;
  br: number;
  baselineBr: number;
  faceTension?: number; // 0..1, optional
}): number {
  const hrStress = clamp((opts.hr - opts.baselineHr) / 40, 0, 1);
  const rrStress = clamp((opts.br - opts.baselineBr) / 10, 0, 1);
  const faceStress = clamp(opts.faceTension ?? 0, 0, 1);
  const stress = 0.55 * hrStress + 0.3 * rrStress + 0.15 * faceStress;
  return Math.round(100 * (1 - stress));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Exponential moving average step. */
export function ema(prev: number, next: number, alpha: number): number {
  return prev + (next - prev) * alpha;
}
