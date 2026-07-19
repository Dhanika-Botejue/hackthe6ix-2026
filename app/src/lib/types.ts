export type Band = "red" | "amber" | "green";

/** "AUDIO" = Real Call mode: one mic hears both sides, no speaker separation. */
export type Who = "CALLER" | "YOU" | "AUDIO";

export interface TranscriptLine {
  who: Who;
  text: string;
  t: number; // seconds since call start
}

export interface VitalsTick {
  t: number;
  hr: number;
  br: number;
  comp: number;
  band: Band;
}

export interface Marker {
  t: number;
  label: string;
}

export type BriefKey = "location" | "nature" | "victims" | "weapons" | "safety";
export type Brief = Partial<Record<BriefKey, string>>;

export type CheckKey = "location" | "nature" | "victims" | "breathing" | "safety";
export type Checks = Partial<Record<CheckKey, number>>; // key -> timestamp hit

export interface TimelineEvent {
  t: number;
  who?: Who;
  text?: string;
  hr?: number;
  comp?: number;
  copilot?: string;
  state?: string;
  brief?: Brief;
  check?: CheckKey;
  marker?: string;
  end?: boolean;
}

export type ScenarioCategory =
  | "phone"
  | "fire"
  | "car"
  | "medical"
  | "burglary"
  | "assault"
  | "shield";

export interface ScenarioConfig {
  id: string;
  n: number;
  name: string;
  desc: string;
  diff: "STANDARD" | "HIGH" | "SEVERE";
  /** 1-5, drives the difficulty meter in the call top bar. */
  difficulty: number;
  category: ScenarioCategory;
  tagClass: string;
  timeline: TimelineEvent[];
  firstMessage: string;
  /** Persona prompt sent as an `overrides.agent.prompt` at startSession — see PRD §6.1. */
  systemPrompt: string;
  /** Answer key for grading the Incident Details form after the call. */
  truth: IncidentTruth;
  /** Background ambience (e.g. "/burning_building.mp3") looped for the call's duration, if set. */
  ambientAudio?: string;
}

/* ── Incident Details form (filled by the trainee during the call) ── */
export type SafeAnswer = "" | "yes" | "no" | "unsure";

export interface IncidentDetails {
  location: string;
  nature: string;
  safe: SafeAnswer;
  count: string;
  relationship: string;
  suspect: string;
  hazards: string;
  special: string;
}

export const EMPTY_INCIDENT: IncidentDetails = {
  location: "",
  nature: "",
  safe: "",
  count: "",
  relationship: "",
  suspect: "",
  hazards: "",
  special: "",
};

/** Per-field answer key. `na` fields render as a dash and aren't scored. */
export interface FieldTruth {
  correct: string;
  /** exact expected value (selects / yes-no-unsure) */
  value?: string;
  /** accepted substrings for free-text fields (case-insensitive) */
  accept?: string[];
  na?: boolean;
}
export type IncidentTruth = Record<keyof IncidentDetails, FieldTruth>;

export type FieldVerdict = "correct" | "wrong" | "na";
export interface IncidentRow {
  key: keyof IncidentDetails;
  label: string;
  your: string;
  correct: string;
  verdict: FieldVerdict;
}
export interface IncidentGrade {
  score: number; // /10
  rows: IncidentRow[];
}

export interface ResponsesGrade {
  score: number; // /10
  good: string[];
  improve: string[];
  loading?: boolean;
}

export interface ComposureGrade {
  score: number; // /10 (0 if it ever dropped below 50)
  avg: number;
  low: number;
  lowT: number;
  dippedBelow50: boolean;
}

export interface Report {
  transcript: TranscriptLine[];
  checks: Checks;
  markers: Marker[];
  series: VitalsTick[];
  dur: string;
  durSecs: number;
  peak: number;
  redSecs: number;
  recSecs: number;
  perfScore: number;
  feedback: string;
  /* Nine One Run grading */
  composure: ComposureGrade;
  responses: ResponsesGrade;
  incident: IncidentGrade;
  total: number; // /30
  passed: boolean;
  courseFrom: number; // lessons completed before this call (out of 5)
  courseTo: number; // lessons completed after (out of 5)
}

export interface SessionRow {
  date: string;
  scenario: string;
  perf: string;
  peak: number;
  red: string;
  rec: string;
  dur: string;
  latest?: boolean;
}
