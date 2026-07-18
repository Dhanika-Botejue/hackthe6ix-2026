/**
 * Physiological fallback generator (PRD §6.2 fallback + §12 risk register).
 * SmartSpectra turned out to be native-FFI/headless only (no browser SDK —
 * see src/lib/presage-server.ts and PRD §14 open question #1), so real
 * vitals come from there when PRESAGE_API_KEY is set. This module is what
 * runs the rest of the time: no key configured, or the real signal hasn't
 * locked yet.
 *
 * In scripted-timeline (sim call) mode this lerps toward the timeline's
 * authored hr/comp targets, exactly like the imported design fixture, so
 * the demo is deterministic and always lands. In live-call mode there is
 * no authored target, so a cheap transcript heuristic (§ deriveLiveTarget)
 * nudges the target instead, keeping the adaptation loop real even without
 * true biometrics.
 */

import { ema } from "./composure";

export interface VitalsSimState {
  hr: number;
  hrTarget: number;
  br: number;
  comp: number;
  compTarget: number;
}

export function initVitalsSim(baselineHr: number): VitalsSimState {
  return { hr: baselineHr, hrTarget: baselineHr, br: 14, comp: 88, compTarget: 88 };
}

/** One second of drift toward the current targets, with light noise. */
export function stepVitalsSim(s: VitalsSimState): VitalsSimState {
  const hr = Math.round(s.hr + (s.hrTarget - s.hr) * 0.3 + (Math.random() * 1.6 - 0.8));
  const comp = Math.max(0, Math.min(100, Math.round(s.comp + (s.compTarget - s.comp) * 0.3)));
  const br = Math.round(12 + (hr - 72) * 0.18);
  return { hr, hrTarget: s.hrTarget, br, comp, compTarget: s.compTarget };
}

/**
 * One second of EMA smoothing toward real Presage readings. `rawHr`/`rawBr` are
 * already SmartSpectra's own 12s/30s rolling averages (Presage's own docs: pulse
 * rate is a 12-second average, breathing rate a 30-second average) — that's
 * where nearly all of the real-world lag between "you start breathing hard" and
 * "the number visibly moves" comes from, and it's inherent to the rPPG
 * measurement, not fixable here. Since the input is already smoothed upstream,
 * this EMA only needs to take the edge off tick-to-tick jitter, not fight
 * noise — a high alpha keeps us from stacking extra seconds of our own lag on
 * top of Presage's window.
 *
 * `rawComp` is different: it's computeComposure()'s output recomputed fresh every
 * tick from whatever the inputs are *right now*, so — unlike hr/br — it isn't
 * already smoothed upstream. Its own max-driven formula (see computeComposure) can
 * legitimately swing tens of points in a single tick when one input spikes, so this
 * needs a noticeably lower alpha to actually look like a gradual reaction on
 * screen rather than an instant jump, while still settling in a few seconds, not
 * dragging out over half a minute.
 */
export function stepVitalsFromPresage(
  s: VitalsSimState,
  rawHr: number,
  rawBr: number,
  rawComp: number
): VitalsSimState {
  const hr = Math.round(ema(s.hr, rawHr, 0.7));
  const br = Math.round(ema(s.br, rawBr, 0.7));
  const comp = Math.max(0, Math.min(100, Math.round(ema(s.comp, rawComp, 0.25))));
  return { hr, hrTarget: s.hrTarget, br, comp, compTarget: s.compTarget };
}

/**
 * Live-mode target heuristic: short, single-question trainee turns calm the
 * target up; long or multi-question turns (the thing that panics a real
 * caller) push it down. This is the honest cheap substitute for reading the
 * trainee's actual body when no biometric feed is wired — see module doc.
 */
export function deriveLiveTarget(prevCompTarget: number, lastTraineeTurnText: string | null): number {
  if (!lastTraineeTurnText) return prevCompTarget;
  const qMarks = (lastTraineeTurnText.match(/\?/g) || []).length;
  const long = lastTraineeTurnText.length > 60;
  if (qMarks > 1 || long) return Math.max(20, prevCompTarget - 18);
  return Math.min(95, prevCompTarget + 14);
}

/** Baseline-capture tick: settles from a jittery start toward ~72bpm. */
export function stepBaselineSim(blHr: number, secsRemaining: number, totalSecs: number): number {
  const settle = 72 + Math.round((secsRemaining / totalSecs) * (blHr - 72) * 0.6 + (Math.random() * 2 - 1));
  return Math.max(70, settle);
}
