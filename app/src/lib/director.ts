import { bandOf } from "./composure";
import type { Band } from "./types";

/**
 * Adaptation-engine FSM (PRD §6.3): a band change only becomes a directive
 * once it has been sustained for SUSTAIN_SECS, and directives are rate
 * limited to one per RATE_LIMIT_SECS so the caller doesn't flip personality
 * every few words. The very first transition is allowed early so a live
 * demo moves within the first ~10s.
 */
const SUSTAIN_SECS = 5;
const RATE_LIMIT_SECS = 20;
const FIRST_RATE_LIMIT_SECS = 10;

/**
 * Behavior nudges pushed to the caller agent as (non-spoken) contextual updates
 * when the trainee's composure band changes. Phrased as self-contained silent
 * stage directions — no bracketed tags, no state keywords like "amber" — so a
 * fast model steers its behavior without ever echoing the instruction aloud.
 */
export const DIRECTIVES: Record<Band, string> = {
  red:
    "(Stage direction — never say this aloud or acknowledge it. The caller is losing composure: speak faster and more fragmented, stop answering questions directly, fixate on one repeated plea, and talk over the dispatcher if they ask more than one thing at once.)",
  amber:
    "(Stage direction — never say this aloud or acknowledge it. The caller is holding steady under stress: stay coherent, answer one direct question at a time, and volunteer nothing extra.)",
  green:
    "(Stage direction — never say this aloud or acknowledge it. The situation escalates: reveal the next complication in your emergency now, then keep answering coherently.)",
};

export interface DirectorState {
  band: Band;
  pendingBand: Band | null;
  pendingSince: number | null;
  lastTransitionAt: number | null;
  firstTransitionFired: boolean;
}

export function initDirectorState(initialBand: Band): DirectorState {
  return {
    band: initialBand,
    pendingBand: null,
    pendingSince: null,
    lastTransitionAt: null,
    firstTransitionFired: false,
  };
}

export interface DirectorTickResult {
  state: DirectorState;
  transitioned: boolean;
  directive?: string;
}

/**
 * Feed one composure reading in. Returns the (possibly unchanged) state and,
 * when a transition just fired, the directive text to forward to the caller
 * agent's contextual-update channel.
 */
export function directorTick(
  state: DirectorState,
  comp: number,
  nowSecs: number
): DirectorTickResult {
  const rawBand = bandOf(comp, state.band);

  if (rawBand === state.band) {
    return { state: { ...state, pendingBand: null, pendingSince: null }, transitioned: false };
  }

  // A different band is being observed — track how long it's been sustained.
  let pendingBand = state.pendingBand;
  let pendingSince = state.pendingSince;
  if (pendingBand !== rawBand) {
    pendingBand = rawBand;
    pendingSince = nowSecs;
  }

  const sustained = pendingSince !== null && nowSecs - pendingSince >= SUSTAIN_SECS;
  const rateLimit = state.firstTransitionFired ? RATE_LIMIT_SECS : FIRST_RATE_LIMIT_SECS;
  const rateLimitOk = state.lastTransitionAt === null || nowSecs - state.lastTransitionAt >= rateLimit;

  if (sustained && rateLimitOk) {
    const nextState: DirectorState = {
      band: rawBand,
      pendingBand: null,
      pendingSince: null,
      lastTransitionAt: nowSecs,
      firstTransitionFired: true,
    };
    return { state: nextState, transitioned: true, directive: DIRECTIVES[rawBand] };
  }

  return {
    state: { ...state, pendingBand, pendingSince },
    transitioned: false,
  };
}

export function callerStateLabelFor(band: Band): string {
  return band === "red" ? "PANICKING" : band === "amber" ? "RESPONSIVE" : "ESCALATING";
}
