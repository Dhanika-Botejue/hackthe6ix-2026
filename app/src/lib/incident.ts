import type {
  FieldTruth,
  FieldVerdict,
  IncidentDetails,
  IncidentGrade,
  IncidentRow,
  IncidentTruth,
} from "./types";

export const NATURE_OPTIONS = [
  "False alarm",
  "Fire",
  "Burglary",
  "Assault",
  "Murder",
  "Medical emergency",
  "Car crash",
  "Domestic disturbance",
  "Overdose",
  "Other",
];

export const RELATIONSHIP_OPTIONS = [
  "Bystander",
  "Family",
  "Victim (self)",
  "Friend",
  "Neighbour",
  "Caregiver",
];

/** Labels shown in the form and the after-action quiz, in display order. */
export const INCIDENT_FIELDS: { key: keyof IncidentDetails; label: string }[] = [
  { key: "callback", label: "Call back number" },
  { key: "location", label: "Location" },
  { key: "nature", label: "Nature of emergency" },
  { key: "safe", label: "Is the caller safe right now?" },
  { key: "count", label: "Number of people involved / injured" },
  { key: "relationship", label: "Caller relationship to victim/patient" },
  { key: "suspect", label: "Suspect description" },
  { key: "hazards", label: "Scene safety hazards" },
  { key: "special", label: "Special considerations" },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const SAFE_LABEL: Record<string, string> = { yes: "Yes", no: "No", unsure: "Unsure", "": "—" };

function displayValue(key: keyof IncidentDetails, raw: string): string {
  if (key === "safe") return SAFE_LABEL[raw] ?? raw;
  return raw.trim() || "—";
}

function gradeField(raw: string, truth: FieldTruth): FieldVerdict {
  if (truth.na) return "na";
  const u = norm(raw);
  if (truth.value !== undefined) return u === norm(truth.value) ? "correct" : "wrong";
  if (truth.accept) {
    const hit = truth.accept.some((k) => (k === "" ? u === "" : u.includes(norm(k))));
    return hit ? "correct" : "wrong";
  }
  return u.length ? "correct" : "wrong";
}

export function gradeIncident(details: IncidentDetails, truth: IncidentTruth): IncidentGrade {
  const rows: IncidentRow[] = INCIDENT_FIELDS.map(({ key, label }) => {
    const t = truth[key];
    const verdict = gradeField(details[key], t);
    return {
      key,
      label,
      your: displayValue(key, details[key]),
      correct: t.na ? "—" : t.correct,
      verdict,
    };
  });

  const gradable = rows.filter((r) => r.verdict !== "na");
  const correct = gradable.filter((r) => r.verdict === "correct").length;
  const score = gradable.length ? Math.round((correct / gradable.length) * 10) : 10;
  return { score, rows };
}
