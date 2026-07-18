export type Band = "red" | "amber" | "green";

export type Who = "CALLER" | "YOU";

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

export interface ScenarioConfig {
  id: string;
  n: number;
  name: string;
  desc: string;
  diff: "STANDARD" | "HIGH" | "SEVERE";
  tagClass: string;
  timeline: TimelineEvent[];
  firstMessage: string;
  /** Persona prompt sent as an `overrides.agent.prompt` at startSession — see PRD §6.1. */
  systemPrompt: string;
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
