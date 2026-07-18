import { mmss } from "./composure";
import { CHECK_DEF } from "./scenarios";
import type { Checks, Marker, Report, TranscriptLine, VitalsTick } from "./types";

/**
 * Deterministic scoring (PRD §6.7): checklist hits/misses, peak HR, time in
 * red, and recovery time (ticks from the worst composure moment to the
 * first tick back at >=55). The coach-feedback line is a template keyed on
 * the worst miss for now — swap for the Backboard scorer agent's line when
 * that's wired (P1).
 */
export function buildReport(
  series: VitalsTick[],
  transcript: TranscriptLine[],
  checks: Checks,
  markers: Marker[]
): Report {
  const dur = series.length ? series[series.length - 1].t : 0;
  const peak = series.length ? Math.max(...series.map((p) => p.hr)) : 0;
  const redSecs = series.filter((p) => p.band === "red").length;

  let minI = 0;
  series.forEach((p, i) => {
    if (p.comp < series[minI]?.comp) minI = i;
  });
  const recI = series.findIndex((p, i) => i > minI && p.comp >= 55);
  const recSecs = series.length ? (recI < 0 ? dur - series[minI].t : series[recI].t - series[minI].t) : 0;

  const perfScore = Object.keys(checks).length;

  return {
    transcript,
    checks,
    markers,
    series,
    dur: mmss(dur),
    durSecs: dur,
    peak,
    redSecs,
    recSecs,
    perfScore,
    feedback: feedbackFor(checks),
  };
}

function feedbackFor(checks: Checks): string {
  if (checks.location === undefined) {
    return "You never confirmed the address. Nothing else matters until dispatch knows where to send help — ask for the location before anything else.";
  }
  if (checks.safety === undefined) {
    return "Scene safety was never addressed. A caller who doesn't feel safe can't focus on your questions — get them somewhere safe as soon as a threat appears.";
  }
  if (checks.nature === undefined) {
    return "The nature of the emergency was never pinned down. Confirm what's actually happening as soon as the address is locked in.";
  }
  if (checks.breathing === undefined) {
    return "Breathing status was never confirmed. That single fact changes everything responders do on arrival — always close the loop on it.";
  }
  return "You asked three questions before getting the address. The caller was too panicked to process multiple questions. Short single questions recover a panicking caller faster.";
}

export interface ChartGeometry {
  hrPath: string;
  baselinePath: string;
  bands: { x: number; w: number; band: string }[];
  markers: { x: number; tx: number; anchor: "start" | "end"; label: string }[];
}

const CHART_W = 1000;
const CHART_H = 240;

export function buildChartGeometry(report: Report, baselineHr: number): ChartGeometry {
  const dur = Math.max(1, report.durSecs);
  const x = (t: number) => (t / dur) * CHART_W;
  const y = (hr: number) => CHART_H - ((hr - 60) / 70) * 220;

  const hrPath = report.series
    .map((p, i) => (i ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p.hr).toFixed(1))
    .join(" ");
  const baselinePath = `M0 ${y(baselineHr).toFixed(1)} L${CHART_W} ${y(baselineHr).toFixed(1)}`;

  const bands: { band: string; start: number; end: number }[] = [];
  report.series.forEach((p) => {
    const last = bands[bands.length - 1];
    if (last && last.band === p.band) last.end = p.t;
    else bands.push({ band: p.band, start: p.t - 1, end: p.t });
  });

  const markers = report.markers.map((m) => {
    const mx = x(m.t);
    const right = mx > CHART_W - 140;
    return {
      x: mx,
      tx: right ? mx - 6 : mx + 6,
      anchor: (right ? "end" : "start") as "start" | "end",
      label: m.label,
    };
  });

  return {
    hrPath,
    baselinePath,
    bands: bands.map((b) => ({ x: x(b.start), w: x(b.end) - x(b.start), band: b.band })),
    markers,
  };
}

export function checklistRows(checks: Checks) {
  return CHECK_DEF.map((c) => {
    const hit = checks[c.key] !== undefined;
    return { label: c.label, hit, time: hit ? mmss(checks[c.key] as number) : "missed" };
  });
}
