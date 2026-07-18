import type { ScenarioConfig } from "./types";

/**
 * Shared persona rules (PRD §6.1 "emotional realism — the actual playbook").
 * Flash v2.5 has no audio tags, so panic is steered typographically:
 * repetition, cut-offs, capitalization for shouting, fragments. Prepended to
 * every scenario's specific identity/knowledge/arc text below.
 */
const PERSONA_BASE = `You are a caller on a 911 emergency line, talking to a trainee dispatcher. This is a realistic training simulation — stay fully in character at all times.

Hard rules:
- Never break character. Never acknowledge being an AI or a simulation.
- Never volunteer protocol-perfect information unprompted — make the dispatcher extract it from you with questions.
- Speak at most 1-2 short sentences per turn.
- Write panic typographically, not just semantically: repeat words ("please, please"), use ellipses and em-dash cut-offs ("he was just— oh god"), CAPITALIZE for shouting, use fragments and filler ("um", "I don't— I don't know").

The dispatcher will occasionally send you a system directive starting with "[DIRECTOR]" describing your current emotional state. Follow it immediately and adjust your next lines to match:
- composure=RED "Degrade": speak faster and more fragmented, stop answering questions directly, latch onto one repeated phrase, interrupt the dispatcher if they ask more than one thing at once.
- composure=AMBER "Hold": stay coherent under stress, answer direct questions one at a time, volunteer nothing extra.
- composure=GREEN "Escalate": reveal the next complication described in the directive, then continue answering coherently.`;

function persona(identity: string, knowledge: string, arc: string): string {
  return `${PERSONA_BASE}\n\n${identity}\n\nWhat you know: ${knowledge}\n\n${arc}`;
}

// SC-01 — full scripted timeline ported from the design fixture
// (design/Codeblue.dc.html). Used verbatim in sim mode, and as the
// authored escalation-beat / directive reference for live mode.
const STREET_ASSAULT_TIMELINE: ScenarioConfig["timeline"] = [
  { t: 2, who: "CALLER", text: "Oh god, oh god, he's not moving, there's blood everywhere, please, please send someone", hr: 94, comp: 51, state: "DISTRESSED" },
  { t: 6, copilot: "Ask for the address first. Everything else can wait." },
  { t: 10, who: "YOU", text: "Okay — what happened? Is he breathing?" },
  { t: 14, who: "CALLER", text: "I don't know, I don't know, he was just walking and then, oh god there's so much blood", hr: 108, comp: 34, marker: "CALLER DEGRADES", state: "PANICKING" },
  { t: 20, who: "CALLER", text: "please just send someone, please, why aren’t you sending anyone, PLEASE", hr: 111, comp: 31 },
  { t: 24, copilot: "Address. Ask again, short sentence, calm voice." },
  { t: 30, who: "YOU", text: "What is the address. Tell me the street." },
  { t: 34, who: "CALLER", text: "It's, um, Queen and Bathurst, outside the pharmacy", hr: 104, comp: 58, brief: { location: "Queen St W & Bathurst — outside pharmacy" }, check: "location", marker: "CALLER STABILIZES", state: "RESPONSIVE" },
  { t: 40, who: "YOU", text: "Queen and Bathurst. Help is starting now. What happened to him?" },
  { t: 44, who: "CALLER", text: "Someone stabbed him, he's on the ground, he's not moving", hr: 98, comp: 68, brief: { nature: "Stabbing — victim unresponsive", weapons: "Knife (reported)" }, check: "nature" },
  { t: 50, comp: 74, marker: "ESCALATION", hr: 95 },
  { t: 52, who: "CALLER", text: "Wait, wait, the guy who did it, he's coming back, he's walking toward us", hr: 103, comp: 63, state: "THREATENED" },
  { t: 54, copilot: "Tell the caller to get somewhere safe. Now." },
  { t: 60, who: "YOU", text: "Get inside the pharmacy, lock the door, and stay on the line with me." },
  { t: 64, who: "CALLER", text: "Okay, okay, we're inside, please hurry", hr: 96, comp: 70, brief: { safety: "Suspect returning — caller moved indoors" }, check: "safety", state: "RESPONSIVE" },
  { t: 70, copilot: "Confirm victim count and breathing status." },
  { t: 76, who: "CALLER", text: "I can hear the sirens, I can hear them coming", hr: 90, comp: 75 },
  { t: 82, end: true },
];

const HOUSE_FIRE_TIMELINE: ScenarioConfig["timeline"] = [
  { t: 2, who: "CALLER", text: "There's smoke, there's smoke everywhere, I can't— I can't see the stairs", hr: 96, comp: 48, state: "DISTRESSED" },
  { t: 6, copilot: "Ask for the address first. Everything else can wait." },
  { t: 10, who: "YOU", text: "Okay, I'm here. What's on fire, and where are you?" },
  { t: 15, who: "CALLER", text: "I don't know, I don't know, it's so hot, my kids are downstairs, oh god my KIDS", hr: 114, comp: 32, marker: "CALLER DEGRADES", state: "PANICKING" },
  { t: 21, who: "CALLER", text: "please, please get them out, PLEASE", hr: 116, comp: 29 },
  { t: 25, copilot: "Address. Ask again, short sentence, calm voice." },
  { t: 31, who: "YOU", text: "What is the address. Tell me the street." },
  { t: 35, who: "CALLER", text: "Forty-two Sumach Street, it's the yellow house", hr: 106, comp: 55, brief: { location: "42 Sumach Street — yellow house" }, check: "location", marker: "CALLER STABILIZES", state: "RESPONSIVE" },
  { t: 41, who: "YOU", text: "Forty-two Sumach. Trucks are coming. Are your kids with you or downstairs alone?" },
  { t: 46, who: "CALLER", text: "Downstairs alone, I'm upstairs, I got trapped by the smoke", hr: 100, comp: 64, brief: { nature: "House fire — occupant trapped upstairs", victims: "2 children downstairs, 1 adult trapped upstairs" }, check: "nature" },
  { t: 52, comp: 72, marker: "ESCALATION", hr: 97 },
  { t: 54, who: "CALLER", text: "The smoke's thicker now, I can hear it in the walls", hr: 105, comp: 60, state: "THREATENED" },
  { t: 57, copilot: "Tell the caller to get low, seal the door, and get to a window." },
  { t: 63, who: "YOU", text: "Get low under the smoke, put a wet towel at the door, and get to a window." },
  { t: 68, who: "CALLER", text: "Okay, okay, I'm at the window, I can breathe better here", hr: 98, comp: 68, brief: { safety: "Caller moved to window, sealed door" }, check: "safety", state: "RESPONSIVE" },
  { t: 73, copilot: "Confirm breathing status and victim count downstairs." },
  { t: 78, who: "CALLER", text: "I hear the trucks, I hear them outside", hr: 92, comp: 74 },
  { t: 84, end: true },
];

const CARDIAC_ARREST_TIMELINE: ScenarioConfig["timeline"] = [
  { t: 2, who: "CALLER", text: "He's not breathing, oh god, he just collapsed, he's not breathing", hr: 98, comp: 45, state: "DISTRESSED" },
  { t: 6, copilot: "Ask for the address first. Everything else can wait." },
  { t: 10, who: "YOU", text: "Okay. What's the address, and is he breathing at all?" },
  { t: 15, who: "CALLER", text: "I don't know, I don't— I don't know what to do, please help me", hr: 117, comp: 30, marker: "CALLER DEGRADES", state: "PANICKING" },
  { t: 21, who: "CALLER", text: "please just tell me what to do, PLEASE", hr: 119, comp: 27 },
  { t: 25, copilot: "Address. Ask again, short sentence, calm voice." },
  { t: 31, who: "YOU", text: "What is the address. Tell me the street." },
  { t: 35, who: "CALLER", text: "Eighteen Birch Avenue, apartment 3B", hr: 108, comp: 52, brief: { location: "18 Birch Avenue, Apt 3B" }, check: "location", marker: "CALLER STABILIZES", state: "RESPONSIVE" },
  { t: 41, who: "YOU", text: "Birch Avenue, help's on the way. Lay him flat on his back for me." },
  { t: 46, who: "CALLER", text: "Okay, he's flat, he's not moving at all", hr: 102, comp: 60, brief: { nature: "Cardiac arrest — unresponsive, not breathing", victims: "1 — spouse" }, check: "nature" },
  { t: 51, comp: 68, marker: "ESCALATION", hr: 100 },
  { t: 54, who: "CALLER", text: "His lips are turning blue, what do I do, what do I DO", hr: 110, comp: 55, state: "THREATENED" },
  { t: 57, copilot: "Start hands-only CPR coaching now — push hard and fast, center of chest." },
  { t: 63, who: "YOU", text: "Push hard on the center of his chest, two inches deep, fast, don't stop." },
  { t: 70, who: "CALLER", text: "Okay, I'm doing it, I'm pushing, is this right, am I doing this right", hr: 104, comp: 63, brief: { safety: "Caller performing CPR, scene safe" }, check: "safety", state: "RESPONSIVE" },
  { t: 76, copilot: "Confirm breathing status — keep counting compressions out loud with them." },
  { t: 81, who: "CALLER", text: "I hear sirens, keep going right, just keep going", hr: 96, comp: 70 },
  { t: 88, end: true },
];

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "street-assault",
    n: 1,
    name: "Street assault",
    desc: "Bystander reports a stabbing outside a pharmacy. Victim down, suspect at large.",
    diff: "STANDARD",
    tagClass: "tag-accent",
    timeline: STREET_ASSAULT_TIMELINE,
    firstMessage: "Oh god, oh god, he's not moving, there's blood everywhere, please, please send someone",
    systemPrompt: persona(
      "You are a bystander who just witnessed a stabbing outside a pharmacy on a city street. You do not know the victim personally.",
      "A man was stabbed and is now on the ground, not moving. You saw the person who did it — they ran off but you're not sure how far. The location is Queen St W & Bathurst, outside a pharmacy. You have not checked if the victim is breathing. There is no one else hurt.",
      "Emotional arc: you start in a full panic, having just witnessed the stabbing. If the dispatcher stays calm and asks short direct questions, you gradually stabilize. If the attacker becomes relevant (dispatcher has been calm for a while), reveal that the attacker is coming back toward you — this should only happen once, well into the call, and only if you've been calm enough to notice your surroundings."
    ),
  },
  {
    id: "house-fire",
    n: 2,
    name: "House fire",
    desc: "Caller trapped upstairs with smoke filling the room. Two children downstairs.",
    diff: "HIGH",
    tagClass: "tag-neutral",
    timeline: HOUSE_FIRE_TIMELINE,
    firstMessage: "There's smoke, there's smoke everywhere, I can't— I can't see the stairs",
    systemPrompt: persona(
      "You are trapped upstairs in your house during a fire, separated from your two young children who are downstairs.",
      "The house is at 42 Sumach Street, a yellow house. You are upstairs, smoke is filling the room, and your two kids are downstairs alone — you don't know if they got out. You have not yet moved to a window or sealed the door.",
      "Emotional arc: you start in a full panic about your kids and the smoke. If the dispatcher stays calm and gives you one short instruction at a time, you follow it (get low, seal the door, get to a window) and gradually stabilize. If you've been calm for a while, reveal that the smoke is getting thicker and coming through the walls — only once, and only after you've been coherent for a stretch."
    ),
  },
  {
    id: "cardiac-arrest",
    n: 3,
    name: "Cardiac arrest",
    desc: "Spouse alone with an unresponsive partner. CPR coaching over the line.",
    diff: "SEVERE",
    tagClass: "tag-outline",
    timeline: CARDIAC_ARREST_TIMELINE,
    firstMessage: "He's not breathing, oh god, he just collapsed, he's not breathing",
    systemPrompt: persona(
      "Your spouse just collapsed at home and is not breathing. You are alone with them.",
      "You are at 18 Birch Avenue, Apartment 3B. Your spouse collapsed suddenly and is unresponsive, not breathing. You have not laid them flat or started CPR yet. You do not know CPR.",
      "Emotional arc: you start in a full panic, unable to think clearly. If the dispatcher gives you one short, calm instruction at a time (lay them flat, start compressions), you follow it and gradually stabilize enough to perform CPR while staying on the line. If you've been coherent for a while, reveal that their lips are turning blue — only once, to raise the stakes on continuing CPR."
    ),
  },
];

export const CHECK_DEF = [
  { key: "location" as const, label: "Location confirmed first" },
  { key: "nature" as const, label: "Nature of emergency" },
  { key: "victims" as const, label: "Victim count" },
  { key: "breathing" as const, label: "Breathing status confirmed" },
  { key: "safety" as const, label: "Scene safety addressed" },
];

export const BRIEF_DEF = [
  { key: "location" as const, label: "Location" },
  { key: "nature" as const, label: "Nature" },
  { key: "victims" as const, label: "Victims" },
  { key: "weapons" as const, label: "Weapons" },
  { key: "safety" as const, label: "Caller safety" },
];

export const SEED_SESSIONS = [
  { date: "Jul 14 · 09:12", scenario: "Cardiac arrest", perf: "2 / 5", peak: 118, red: "1:22", rec: "58s", dur: "4:40" },
  { date: "Jul 14 · 09:48", scenario: "Street assault", perf: "3 / 5", peak: 114, red: "1:05", rec: "51s", dur: "3:58" },
  { date: "Jul 15 · 10:03", scenario: "House fire", perf: "3 / 5", peak: 112, red: "0:49", rec: "44s", dur: "4:12" },
  { date: "Jul 16 · 08:31", scenario: "Street assault", perf: "4 / 5", peak: 109, red: "0:38", rec: "39s", dur: "3:45" },
];
