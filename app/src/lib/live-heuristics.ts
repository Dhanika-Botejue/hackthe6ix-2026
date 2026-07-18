import type { Band, CheckKey } from "./types";

/**
 * Placeholder checklist detector + copilot for **live** calls (real
 * ElevenLabs agent, no authored timeline to read events off). Keyword
 * matching on the trainee's own turns stands in for the extractor/scorer
 * agents in PRD §6.5/§6.7 until those are wired up — swap this module out
 * first when a real backend lands.
 */
const CHECK_PATTERNS: { key: CheckKey; re: RegExp }[] = [
  { key: "location", re: /address|where\s+(are|is)|street|location/i },
  { key: "nature", re: /what happened|what'?s going on|nature of|what.*emergency/i },
  { key: "victims", re: /how many|anyone else|victims?/i },
  { key: "breathing", re: /breathing|breath(e|ing)?/i },
  { key: "safety", re: /safe|lock the door|get (inside|somewhere safe)/i },
];

export function detectCheck(traineeText: string): CheckKey | null {
  for (const { key, re } of CHECK_PATTERNS) {
    if (re.test(traineeText)) return key;
  }
  return null;
}

const COPILOT_PRIORITY: { key: CheckKey; line: string }[] = [
  { key: "location", line: "Ask for the address first. Everything else can wait." },
  { key: "nature", line: "Find out what's actually happening." },
  { key: "victims", line: "Confirm how many people are involved." },
  { key: "breathing", line: "Confirm the victim's breathing status." },
  { key: "safety", line: "Make sure the caller is somewhere safe." },
];

export function copilotFor(checks: Partial<Record<CheckKey, number>>, band: Band): string {
  const next = COPILOT_PRIORITY.find((c) => checks[c.key] === undefined);
  if (!next) return "Keep the caller talking until help arrives.";
  return band === "red" ? `${next.line} Short sentence, calm voice.` : next.line;
}
