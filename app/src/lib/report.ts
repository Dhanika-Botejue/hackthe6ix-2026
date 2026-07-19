import { mmss, clamp } from "./composure";
import { gradeIncident } from "./incident";
import type {
  Checks,
  ComposureGrade,
  IncidentDetails,
  IncidentTruth,
  Marker,
  Report,
  ResponsesGrade,
  TranscriptLine,
  VitalsTick,
} from "./types";

export const PASS_THRESHOLD = 21; // 70% of 30

/**
 * Builds the after-action report. Three graded pillars (each /10):
 *   1. Composure — average composure across the call, out of 10.
 *   2. Responses — communication / decision-making (heuristic here; upgraded
 *      by the Gemini grader in /api/grade when a key is configured).
 *   3. Incident details — accuracy of the form the trainee filled in.
 */
export function buildReport(
  series: VitalsTick[],
  transcript: TranscriptLine[],
  checks: Checks,
  markers: Marker[],
  details: IncidentDetails,
  truth: IncidentTruth,
  courseFrom: number,
  courseTo: number
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

  const composure = gradeComposure(series);
  const responses = heuristicResponses(checks, transcript);
  const incident = gradeIncident(details, truth);
  const total = composure.score + responses.score + incident.score;
  const passed = total >= PASS_THRESHOLD;

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
    perfScore: incident.score,
    feedback: responses.improve[0] ?? "Solid work — keep drilling.",
    composure,
    responses,
    incident,
    total,
    passed,
    courseFrom,
    courseTo,
  };
}

export function gradeComposure(series: VitalsTick[]): ComposureGrade {
  if (!series.length) return { score: 10, avg: 100, low: 100, lowT: 0, dippedBelow50: false };
  const avg = Math.round(series.reduce((a, p) => a + p.comp, 0) / series.length);
  let low = series[0].comp;
  let lowT = series[0].t;
  series.forEach((p) => {
    if (p.comp < low) {
      low = p.comp;
      lowT = p.t;
    }
  });
  const dipped = low < 50;
  const score = clamp(Math.round(avg / 10), 0, 10);
  return { score, avg, low, lowT, dippedBelow50: dipped };
}

/** Fallback responses grade — used until the LLM grader responds (or always,
 *  if no GEMINI_API_KEY is configured). */
export function heuristicResponses(checks: Checks, transcript: TranscriptLine[]): ResponsesGrade {
  const good: string[] = [];
  const improve: string[] = [];
  const you = transcript.filter((l) => l.who === "YOU");

  if (checks.location !== undefined) good.push("You asked for the location early in the call.");
  else improve.push("You never locked in the address — get the location before anything else.");

  if (checks.safety !== undefined) good.push("You confirmed the caller's safety.");
  else improve.push("You should have checked whether the caller was safe, and re-checked it.");

  if (checks.nature !== undefined) good.push("You established the nature of the emergency.");
  else improve.push("Pin down what's actually happening once the address is set.");

  if (you.length >= 3) good.push("You kept the caller engaged with clear, professional language.");
  if (checks.breathing === undefined) improve.push("Confirm breathing status — it changes what responders do on arrival.");
  improve.push("Ask about nearby landmarks to get more precise location information.");

  const hits = [checks.location, checks.safety, checks.nature, checks.breathing].filter((v) => v !== undefined).length;
  const score = clamp(4 + hits * 1.5, 0, 10);
  return { score: Math.round(score), good: good.slice(0, 4), improve: improve.slice(0, 3) };
}

/* ── composure-over-time chart geometry (review Composure step) ── */
export interface CompChart {
  path: string;
  area: string;
  low: { x: number; y: number; t: number; v: number };
  w: number;
  h: number;
  midY: number;
}

export function buildComposureChart(series: VitalsTick[], w = 640, h = 220): CompChart {
  const dur = Math.max(1, series.length ? series[series.length - 1].t : 1);
  const x = (t: number) => (t / dur) * w;
  const y = (c: number) => h - (clamp(c, 0, 100) / 100) * h;

  const pts = series.length ? series : [{ t: 0, comp: 100, hr: 0, br: 0, band: "green" as const }];
  const path = pts.map((p, i) => (i ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p.comp).toFixed(1)).join(" ");
  const area = `${path} L${x(pts[pts.length - 1].t).toFixed(1)} ${h} L0 ${h} Z`;

  let low = pts[0];
  pts.forEach((p) => {
    if (p.comp < low.comp) low = p;
  });

  return {
    path,
    area,
    low: { x: x(low.t), y: y(low.comp), t: low.t, v: low.comp },
    w,
    h,
    midY: y(50),
  };
}
