# Codeblue — Product Requirements Document

**A real-time, high-stakes conversation trainer for 911 dispatchers.**
An ElevenLabs voice agent plays a distressed caller. Presage reads the trainee's heart rate, breathing, and expression off the webcam. A Backboard-orchestrated director adapts the caller's behavior to the trainee's physiology in real time. The session ends with a dual-axis scored report.

- Design source of truth: [design/Codeblue.dc.html](../design/Codeblue.dc.html) (imported from Claude Design project `65ef9297-146b-40d3-94bb-926258ddda05`), tokens in [design/styles.css](../design/styles.css).
- Event: Hack the 6ix 2026. Hard constraint: everything here must be demoable on one laptop with headphones, a webcam, and conference Wi-Fi.

---

## 1. Product thesis

Dispatcher training today is a colleague reading a script across a desk. It cannot produce a stress response — and the stress response is what washes people out in year one. Codeblue is the only trainer where **the simulation reacts to the trainee's body**: panic makes the caller worse, which makes the trainee panic more. That feedback loop is the product. Everything else exists to set it up, display it, and score it.

### The wow factor (demo contract)

The judge puts on headphones, gets yelled at by an AI caller, watches their own heart rate climb on screen, and watches the caller degrade *because* their heart rate climbed. Two minutes in the chair. This drives three non-negotiable requirements:

1. **Voice latency under ~1s end of judge's speech → first caller audio.** Anything slower breaks the illusion of a live call.
2. **Vitals visibly moving within seconds** of the judge's stress changing, with an obvious causal link to caller behavior (band color, border flash, marker).
3. **Zero-setup resilience.** Every external dependency (Presage, ElevenLabs, Backboard, Atlas) has a rehearsed on-stage fallback (§12).

---

## 2. Users

| Persona | Need | In demo |
|---|---|---|
| Trainee dispatcher | Realistic stress inoculation, actionable feedback | The judge |
| Training supervisor | Progress over time, protocol compliance evidence | Session history screen (P2) |
| Hackathon judge | See the loop close in <2 min | Primary audience |

---

## 3. Scope

### P0 — must ship
1. Live full-duplex, interruptible voice call with an ElevenLabs conversational agent playing a distressed caller, <1s response.
2. Presage vitals panel: heart rate, breathing rate, derived composure score, updating live.
3. Adaptation engine: composure band changes caller behavior mid-call.
4. Live transcript (caller turns + trainee turns).
5. Post-call report: performance score, missed protocol items, vitals graph with caller-behavior markers.
6. Baseline capture flow (15s pre-call).
7. Demo mode switches (simulated vitals, scripted timeline, speed multiplier — already modeled in the design's `demoSpeed` / `startScreen` props).

### P1 — ship if time
8. Copilot panel: next-protocol-question suggestions, grounded in a 911 protocol dataset via MongoDB Atlas Vector Search.
9. Incident brief: structured fields (location, nature, victims, weapons, caller safety) filling live via extraction.
10. Scenario picker: three scenarios (Street assault / House fire / Cardiac arrest — per design).

### P2 — cut freely
11. Multilingual caller (switches to Spanish under stress).
12. Session history + trainee progress over time.
13. Auth0 login and saved profiles.

### Explicitly out of scope
- Real emergency-service integration of any kind; prominent "SIMULATION" framing.
- Mobile layouts (desktop 3-column console only).
- Medical-grade vitals accuracy claims. Presage numbers are for training feedback, and the demo copy must never imply diagnostics.
- Multi-tenant orgs, billing, admin tooling.

---

## 4. Screens (from imported design)

The design file defines five screens; treat it as the UI contract (layout, tokens, band colors `RED oklch(0.52 0.17 27)`, `AMBER oklch(0.66 0.13 75)`, `GREEN oklch(0.55 0.11 155)`, Barlow/Barlow Condensed, "blueprint" corner-frame styling).

1. **Login** — email/password + "Continue with Auth0". P2; default-skipped via env flag until Auth0 lands.
2. **Ready room** — scenario cards (SC-01..03 with difficulty tags), large webcam preview with rPPG face-lock reticle + signal %, baseline capture ring (HR countdown), "Take the call" gate (disabled until baseline locked).
3. **Live console** — 3-column grid (280px / 1fr / 320px), full-viewport inner border tinted to composure band:
   - Left rail: webcam thumb, HR (big numeral + delta vs baseline), breathing rate, composure bar with 40/70 threshold ticks and DEGRADE/HOLD/ESCALATE labels, band label, End call.
   - Center: call timer, caller state tag (RINGING/DISTRESSED/PANICKING/RESPONSIVE/THREATENED), scrolling transcript bubbles (trainee right/accent, caller left/neutral), call-complete CTA.
   - Right rail: Copilot card (single imperative line, pulsing dot), Incident brief field list with em-dash placeholders.
4. **After-action report** — vitals SVG chart (HR line, baseline dashed, composure band shading, vertical caller-behavior markers), Call performance checklist (5 items, ✓/✕ + timestamp), Composure cards (Peak HR, Time in red, Recovery time), one-line coach feedback, collapsible full transcript, "Run another scenario".
5. **History** — table: date, scenario, performance, peak HR, time in red, recovery, duration. Recovery trend is the headline metric.

---

## 5. System architecture

```
┌────────────────────────────  Browser (Next.js app)  ───────────────────────────┐
│                                                                                │
│  Mic/Speaker ◄──WebRTC──► ElevenLabs Agents Platform (caller agent)            │
│      │            (ASR + turn-taking + LLM + TTS handled inside ElevenLabs)    │
│      │  transcripts / agent events via SDK callbacks                           │
│                                                                                │
│  Webcam ──► Presage SmartSpectra Web SDK (rPPG in-browser)                     │
│      │  HR / RR / signal quality @ ~1 Hz                                       │
│      ▼                                                                         │
│  Vitals worker: baseline, composure calc, band FSM  ──► UI panels              │
│      │                                                                         │
│      └────────────── session WebSocket ───────────────┐                        │
└───────────────────────────────────────────────────────┼────────────────────────┘
                                                        ▼
┌──────────────────────────  Backend (Node, single service)  ────────────────────┐
│  Session Orchestrator (per-session state machine)                              │
│   ├─ Director agent   (Backboard: band→behavior directives, escalation beats)  │
│   ├─ Copilot agent    (Backboard + Atlas Vector Search: next question)  [P1]   │
│   ├─ Extractor        (fast LLM: incident-brief JSON from trainee turns) [P1]  │
│   └─ Scorer agent     (Backboard: checklist audit + coach feedback line)       │
│  ElevenLabs server-side: signed-URL minting, contextual updates relay          │
│  MongoDB Atlas: sessions, transcripts, vitals series, protocols (+vector) 	 │
│  Auth0 (P2): Universal Login, session cookies                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions**

- **D1 — Voice path never touches our backend.** Audio goes browser ↔ ElevenLabs directly over WebRTC. Our backend only (a) mints the signed conversation token and (b) pushes text-channel updates into the live conversation. This is the only way to hit <1s reliably on conference Wi-Fi; proxying audio adds hops and jitter for zero benefit.
- **D2 — Vitals are computed client-side.** Presage's Web SDK runs rPPG in-browser; raw frames never leave the machine (privacy + zero upload bandwidth). Only derived numbers (HR, RR, composure) go to the backend at 1 Hz for logging and direction.
- **D3 — One session WebSocket** between browser and backend carries everything that isn't audio: vitals ticks up, director/copilot/brief/score events down. Single ordered channel = trivially replayable session log.
- **D4 — Adaptation = prompt-time contract + runtime nudges.** The caller agent's system prompt defines behavior for each band *up front*; at runtime we only send tiny contextual updates ("composure now RED") rather than rewriting prompts. This keeps adaptation latency near zero and avoids mid-call persona drift.
- **D5 — Everything degrades to demo mode.** Each integration sits behind an interface with a `sim` implementation (§12). The scripted timeline in the design file is the shared fixture.

**Stack**: Next.js 15 (App Router) + TypeScript + Tailwind (tokens ported from `styles.css`); Node backend in the same repo (Next API routes + a small standalone WS server, or a single Fastify service — pick one on day 1 and don't revisit); `@elevenlabs/react` SDK; Presage SmartSpectra Web SDK; MongoDB Atlas (M0 is fine, vector index on `protocols`); Backboard REST API; Auth0 Next.js SDK (P2).

---

## 6. Feature deep dives

### 6.1 Voice caller agent (P0)

**Platform**: ElevenLabs Agents Platform (Conversational AI), connected from the browser with `@elevenlabs/react` over **WebRTC** (not WebSocket — WebRTC gets adaptive jitter buffering and echo cancellation for free, which matters with a judge on open speakers during setup).

**Latency budget (target p50 ≈ 800ms speech-end → first audio):**

| Stage | Budget | How |
|---|---|---|
| Turn-end detection (VAD/turn-taking model) | ~200ms | ElevenLabs built-in turn-taking; tune end-of-turn sensitivity up (callers *should* jump in fast) |
| ASR finalization | ~100ms | ElevenLabs streaming ASR, included |
| LLM first token | ~250ms | Small fast model on the agent (e.g. Gemini/GPT-4o-mini class via ElevenLabs LLM picker); system prompt kept **short** (<1.5k tokens); no tools on the hot path |
| TTS first byte | ~75–150ms | **Eleven Flash v2.5** (`eleven_flash_v2_5`) — lowest-latency model; do NOT use v3/Multilingual v2 on the live path |
| Network + playout | ~150ms | WebRTC; wired headphones for the judge |

Rules that protect the budget: caller replies are prompt-constrained to 1–2 short sentences; no server-tool calls during the conversation (everything the director needs goes over the text channel); brief/copilot/scoring all run **outside** the voice loop.

**Interruption / full duplex**: enabled in agent settings; the trainee talking over the caller cancels caller audio (SDK handles it). In RED band we *also* make the caller interrupt the trainee — implemented by the director sending an assistant-turn trigger (contextual update marked "respond now") when the trainee has been talking >6s without yielding.

**Emotional realism — the actual playbook** (this is what sells the demo):

1. **Voice choice**: pick a voice with natural strain/breathiness from the ElevenLabs library (audition 5–10, lock one per scenario persona). Clone nothing; library voices are fine.
2. **Voice settings**: stability **low (0.25–0.35)** — low stability = wider emotional variance, which is exactly right for panic; similarity ~0.75; style exaggeration modest (0.2–0.4; too high adds latency and artifacts); speaker boost on.
3. **Emotion travels through the text.** Flash v2.5 doesn't take audio tags, but it *is* highly steerable by orthography. The persona prompt instructs the LLM to write panic typographically: repeated words ("please, please, PLEASE"), ellipses and em-dash cut-offs ("he was just— oh god"), capitalization for shouting, fragmented clauses, filler ("um", "I don't— I don't know"). The design's timeline lines are the reference register.
4. **Persona prompt structure** (per scenario): identity + relationship to victim; what they know / don't know (so answers stay consistent); emotional arc rules per band (§6.3); hard rules: never break character, never acknowledge being an AI, never volunteer protocol-perfect info — make the trainee extract it; speak max 2 sentences.
5. **First message**: pre-scripted opener per scenario (design: "Oh god, oh god, he's not moving…") so the call always lands hard, deterministically.
6. **Pacing under panic**: prompt shorter utterances + more turn seizures in RED, longer more coherent turns in GREEN. Perceived speech speed comes from sentence length and interruption frequency more than from TTS speed settings — don't touch playback rate.

**Configuration & runtime control**

- One ElevenLabs agent per scenario (3 total), created in the dashboard, IDs in env. Dynamic variables (`{{trainee_name}}`, `{{baseline_hr}}`) injected at session start via overrides.
- Backend endpoint `POST /api/call/token`: verifies session, mints the signed/conversation token server-side (API key never ships to the browser), returns agent id + token.
- Runtime adaptation uses the conversation's **contextual update** channel (non-interrupting system messages the LLM sees on its next turn): e.g. `[DIRECTOR] composure=RED. Degrade: fragment speech, stop answering directly, repeat "please send someone", interrupt.` Sent either from the client SDK (simplest: director messages arrive over our WS and the client forwards to the ElevenLabs conversation) — keep this client-forwarded pattern for the hackathon.
- Transcripts: SDK `onMessage` callbacks give user transcript + agent response text with timestamps → render bubbles → forward on the session WS for logging/extraction.

**Acceptance**: judge can interrupt mid-sentence; p50 response <1s on venue Wi-Fi; caller audibly panicked in first 5 seconds; no persona break in 10 consecutive test calls.

### 6.2 Presage vitals (P0)

**Platform**: Presage SmartSpectra Web SDK (rPPG from webcam). Register app + API key; SDK processes the camera stream in-browser and emits pulse rate and breathing rate with confidence/signal quality.

**Pipeline**

1. `getUserMedia({ video: { width: 1280 } })` once, shared: `<video>` preview elements (ready room + console thumb) and the Presage processor consume the same `MediaStream`.
2. SDK output normalized to a 1 Hz `VitalsTick { t, hr, rr, hrConfidence, faceLocked, signalPct }`. If the SDK emits faster, downsample with a median over the window (median > mean; rPPG spikes on motion).
3. **Smoothing**: display value = EMA over ~3s (α≈0.4) so numbers move convincingly but don't jitter; raw ticks logged unsmoothed.
4. **Signal quality UX**: the design's `SIGNAL {{pct}}%` + face-lock reticle map to SDK confidence. Below threshold for >5s → hold last-good values, dim the panel, show reacquiring state; never show garbage numbers to a judge.
5. **Expression (composure input #3)**: MediaPipe Face Landmarker blendshapes (runs client-side, ~5–10ms/frame) → simple tension proxy from brow-lowerer + jaw/lip-press coefficients, 0–1, EMA-smoothed. This is a *minor* input (15% weight) and the first thing to cut if it's noisy — composure must never look wrong on stage.

**Baseline capture** (ready room): 15s countdown ring (configurable 3–15s via demo prop). Collect ticks; baseline HR = median of final 10s; baseline RR likewise. Reject and prompt retry if variance is wild (judge still settling). Lock → enable "Take the call".

**Composure score (0–100)**, computed client-side every tick:

```
hrStress   = clamp((hr − baselineHr) / 40, 0, 1)        // +40 bpm over baseline ⇒ saturated
rrStress   = clamp((rr − baselineRr) / 10, 0, 1)        // +10 breaths/min ⇒ saturated
faceStress = expressionTension                           // 0..1, 0 if unavailable
stress     = 0.55·hrStress + 0.30·rrStress + 0.15·faceStress
composure  = round(100 · (1 − stress)), EMA α≈0.35
```

Weights are constants in one config file; tune during rehearsal, then freeze.

**Bands & hysteresis**: GREEN >70, AMBER 40–70, RED <40 — with ±3-point hysteresis at each edge (enter RED below 40, exit above 43) so the border color doesn't flicker.

**Transport**: each tick (with composure + band) goes up the session WS; backend appends to the session's vitals series and feeds the director.

**Fallback (rehearsed, one keystroke)**: `?vitals=sim` runs a physiological simulator — baseline + caller-intensity-driven drift + noise + slow recovery — driven by real call events, so even simulated vitals correlate with what the judge hears. Secret arrow-key nudge for live puppeteering if needed.

**Acceptance**: HR within ±8 bpm of a smartwatch on a still subject; visible HR rise within ~10s of a startle; composure bar and border color move believably through a full demo run with zero flicker.

### 6.3 Adaptation engine (P0)

**Owner**: Director (backend, per-session). Inputs: 1 Hz vitals ticks, transcript turns, scenario config, elapsed time. Output: behavior directives → caller agent (via contextual updates) + UI state (caller state tag, markers).

**State machine**

```
States: HOLD (amber) · DEGRADE (red) · ESCALATE (green-triggered event) · STABILIZE (recovery transition) · WRAPUP
Transition rule: band sustained ≥5 consecutive seconds AND ≥20s since last transition (rate limit).
```

- **Sustain requirement** kills single-tick noise transitions. **20s rate limit** (spec) stops personality flipping. Exception: the *first* transition after call start may fire at 10s so the demo moves.
- **DEGRADE (composure <40)**: directive = faster/fragmented speech, stop answering questions directly, latch onto one phrase ("please just send someone"), interrupt the trainee. This band is the product; its directive text is hand-tuned hardest.
- **HOLD (40–70)**: coherent-under-stress; answers direct questions, one at a time; volunteers nothing.
- **ESCALATE (>70)**: fire the scenario's next **escalation beat** — an authored complication, not LLM-invented: Street assault → attacker returns → crowd forming; House fire → smoke thickens upstairs → child unaccounted for; Cardiac arrest → agonal breathing starts → caller too exhausted to continue CPR. Beats fire in order, max one per ESCALATE entry, so a great trainee gets a genuinely harder call and the report markers ("ESCALATION") mean something.
- **STABILIZE**: on RED→AMBER recovery, directive = caller responds to calm ("It's… um, Queen and Bathurst") and starts answering again — the payoff moment; also the timestamp used for recovery-time scoring.
- **Trainee-behavior modifiers** (cheap heuristics on transcript, added to directives): multiple questions in one turn while RED → caller answers none, panics harder; short single question + calm phrasing → stabilization allowed sooner. This closes the loop with the copilot's advice.

**Backboard's role**: the Director is a Backboard-managed agent — session memory (which beats fired, what's extracted), model routing, and the shared brain the caller/copilot/scorer agents read from. Concretely: on each transition the orchestrator calls the Backboard director thread with the state delta; it returns the directive text sent to ElevenLabs. Fallback if Backboard is unreachable: hardcoded per-band directive strings (the demo must not depend on a fourth network hop). Judge-facing line stays honest: "three separate models orchestrated through Backboard" = director + copilot + scorer.

**Event contract (session WS, downstream)**: `director.band_change {band, at}`, `director.caller_state {state}` (drives the header tag), `director.marker {label, at}` (CALLER DEGRADES / CALLER STABILIZES / ESCALATION — exactly the report's chart markers), `director.directive {…}` (client forwards to ElevenLabs).

**Acceptance**: full loop demonstrable in 2 minutes: fumble → RED + degrade within ~20s; calm single question → stabilize; sustained GREEN → authored escalation fires. No transition <20s after the previous.

### 6.4 Live transcript (P0)

From ElevenLabs SDK callbacks: tentative ASR shown live (subtle/italic), finalized on turn end; caller text rendered as received. Auto-scroll pinned to bottom (design behavior). Every finalized turn `{who, text, t}` → session WS → persisted + fed to extractor/scorer. Latency target <500ms behind audio.

### 6.5 Incident brief extraction (P1)

Five fields (design contract): **Location, Nature, Victims, Weapons, Caller safety** — em-dash until filled.

- Trigger: every finalized turn (both speakers — the *caller* utters the facts).
- Extractor: single fast LLM call (Claude Haiku-class), strict JSON schema `{location?, nature?, victims?, weapons?, safety?}`, prompt = last 6 turns + current brief + "return ONLY newly confirmed or corrected fields; never invent".
- Merge: field-level upsert with timestamps (first-fill time feeds scoring, e.g. "Location confirmed first"). Corrections overwrite.
- Runs server-side off the WS turn stream; ~500ms staleness is invisible. Nice-to-have: brief-fill flash animation — it's a scoreboard moment ("Address field populates").

### 6.6 Copilot (P1)

One imperative line, always current (design: "Address. Ask again, short sentence, calm voice.").

- **Retrieval**: 911 call-taking protocol dataset (dispatch guidecards / question sequences per incident type) chunked per protocol step, embedded (Voyage or OpenAI embeddings), stored in Atlas `protocols` collection with a vector index. Query = scenario type + unfilled brief fields + last caller utterance → `$vectorSearch` top-3.
- **Composition**: Backboard copilot agent gets top-3 chunks + brief state + composure band → one line, ≤12 words, imperative. Band-aware: in RED it prioritizes *delivery* coaching ("short sentence, calm voice") over content.
- **Cadence**: recompute on brief-field change, band change, or 15s staleness — whichever first; debounce so the line never visibly churns twice in <5s.
- **Deterministic fallback**: priority list (location → nature → victims → breathing → safety) × band template table. Ships first; vector version layered on top. Demo never shows an empty copilot card.

### 6.7 Scoring & after-action report (P0; scorer polish P1)

Report content (design contract):

1. **Vitals chart**: HR line, dashed baseline, composure-band background shading, vertical markers at director events — the "your panic made the AI panic" visual. Data = logged vitals series + marker events; rendered as the design's SVG.
2. **Call performance (n/5 checklist)**: Location confirmed first · Nature of emergency · Victim count · Breathing status confirmed · Scene safety addressed. Hit = timestamp; miss = "missed". Detection: primary source is brief-extraction fill events (location/nature/victims/safety) + a breathing-status check; scorer LLM audits the full transcript post-call and can flip marginal items (e.g. caller said the address but trainee never confirmed ⇒ miss). "Confirmed **first**" specifically requires location before nature/victims.
3. **Composure cards**: Peak HR · Time in red (mm:ss) · **Recovery time** — seconds from minimum-composure tick to first tick ≥55 after it (headline metric; the design repeats "recovery predicts who survives year one").
4. **Coach feedback**: exactly one line. Backboard scorer agent gets transcript + vitals summary + checklist and returns one specific, causal, behavioral sentence (reference register: "You asked three questions before getting the address…"). Template fallback keyed on worst checklist miss.
5. **Full transcript** (collapsible) with timestamps.
6. Persist the whole report doc → history row.

Checklist + composure metrics compute deterministically in <100ms; the LLM feedback line streams in a beat later (report renders immediately, feedback fades in).

### 6.8 Scenario picker (P1)

Three authored configs (per design): SC-01 Street assault (STANDARD), SC-02 House fire (HIGH), SC-03 Cardiac arrest (SEVERE). A scenario config bundles: ElevenLabs agent id + voice, first message, persona prompt, band directive texts, ordered escalation beats, protocol-type key for retrieval, checklist variant (cardiac emphasizes breathing/CPR compliance). Adding scenario #4 = one config file + one dashboard agent, no code.

### 6.9 Multilingual caller (P2)

Flash v2.5 supports Spanish TTS and ElevenLabs ASR is multilingual, so this is mostly prompt work: persona = bilingual caller who code-switches to Spanish when RED ("under stress she reverts to Spanish; returns to English if spoken to calmly"). Copilot adds "Caller switched to Spanish — stay calm, use simple English + her name." Cut freely; skip if band tuning isn't already solid.

### 6.10 Session history (P2)

`GET /api/sessions` → design's table (date, scenario, perf, peak HR, time in red, recovery, duration), newest first, latest recovery accented. Keyed to Auth0 user id when logged in, else anonymous local id. Seed rows shipped so the screen never demos empty (design's `SEED_SESSIONS`).

### 6.11 Auth0 (P2) — the "best implementation" plan

- **SDK**: `@auth0/nextjs-auth0` — Universal Login redirect flow (never build custom credential forms; the design's email/password box submits to Universal Login too or gets replaced by the single "Continue with Auth0" button).
- **Flow**: Authorization Code + PKCE; encrypted `appSession` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`); refresh token rotation ON; absolute session lifetime 7d, inactivity 24h.
- **Connections**: start with Google social + email/password DB connection. MFA off for demo, one toggle away for the pitch.
- **Authorization**: our backend validates the session on `POST /api/call/token` and WS upgrade — auth protects *session minting*, not the audio path. RBAC later: `trainee`/`supervisor` roles in a custom claim (`https://codeblue.app/roles`) via Auth0 Action; supervisors read others' reports.
- **Data linkage**: Mongo `users` doc keyed by Auth0 `sub`; on first login, migrate any anonymous local sessions to the account.
- **Guest mode is mandatory**: judges never log in. `AUTH_ENABLED=false` env flag routes straight to Ready room with an anonymous session (the design's `startScreen` prop already models this).
- Privacy: only `sub`, email, display name stored; no vitals in Auth0 metadata.

---

## 7. Data model (MongoDB Atlas)

```
users        { _id, auth0Sub?, name, createdAt }
sessions     { _id, userId?, scenarioId, startedAt, endedAt, baseline: {hr, rr},
               status: ready|live|complete,
               report?: { perfScore, checklist: [{key, hit, at?}], peakHr,
                          redSecs, recoverySecs, feedback, durationSecs } }
turns        { sessionId, seq, who: caller|trainee, text, t }          // or embedded array
vitals       { sessionId, series: [{t, hr, rr, composure, band}] }     // 1 Hz, one doc/session
events       { sessionId, t, type: band_change|marker|beat|copilot|brief_update, payload }
protocols    { _id, scenarioType, step, text, embedding: [1536] }      // Atlas vector index (cosine)
```

Session doc + embedded arrays is fine at this scale (~300 ticks + ~40 turns per 5-min call); don't over-normalize during a hackathon.

---

## 8. Session WebSocket protocol

Upstream (client → server): `vitals.tick {t, hr, rr, composure, band, signal}` · `turn.final {who, text, t}` · `call.start {scenarioId, baseline}` · `call.end {t}`.
Downstream (server → client): `director.directive {text}` (→ forwarded to ElevenLabs contextual update) · `director.caller_state {state}` · `director.marker {label, t}` · `director.band_ack {band}` · `brief.update {field, value, t}` · `copilot.suggest {text}` · `report.ready {report}`.
All messages `{type, sessionId, seq, payload}`; seq-ordered; server log of the stream *is* the session record.

## 9. Latency budgets (end-to-end)

| Path | Target |
|---|---|
| Judge stops talking → caller audio starts | **<1s p50, <1.5s p95** |
| Physiologic change → vitals panel updates | <2s (1 Hz tick + EMA) |
| Band change → caller behavior audibly shifts | next caller turn (≤1 turn, plus 20s rate limit) |
| Turn finalized → transcript bubble | <500ms |
| Turn finalized → brief field fills | <2s |
| Call end → report rendered | <1s (deterministic parts), feedback line <5s |

---

## 10. Build order

| Phase | Deliverable | Proves |
|---|---|---|
| 1 | Next.js shell + 5 screens from design, hardcoded state; scripted demo timeline as fixture | UI contract |
| 2 | ElevenLabs agent (SC-01) wired over WebRTC: live call + transcript + interruption | <1s voice loop |
| 3 | Presage SDK: live HR/RR + baseline + composure + bands (+ sim fallback) | Vitals credible |
| 4 | Director FSM + contextual updates + markers | **The core loop — MVP is done here** |
| 5 | Report: deterministic scoring + chart + persistence | Payoff screen |
| 6 | Brief extraction → copilot (deterministic → vector) | P1 |
| 7 | Scenarios 2–3; Backboard-routed scorer/copilot polish | P1 |
| 8 | History, Auth0, multilingual | P2 |
| 9 | Rehearsal: latency tuning, weight tuning, fallback drills, demo script | The 5 minutes |

## 11. Non-functional requirements

- **Privacy**: webcam frames processed in-browser only, never uploaded or stored; derived vitals only, disclosed on the baseline screen. Mic audio goes to ElevenLabs for the call (their retention per their terms); no local audio recording. "Delete this session" is one Mongo delete.
- **Safety/ethics**: fictional scenario content; simulation framing on every screen; no real emergency numbers dialed; the "distressed caller" content stays within training-realistic bounds (no gratuitous gore beyond what the scenario needs).
- **Resilience**: every external service failure degrades to a working demo (§12); WS auto-reconnect with seq resume; refresh mid-call recovers to report state from server log.
- **Performance**: rPPG + MediaPipe + WebRTC concurrently on one laptop — test on the actual demo machine, plugged in, high-power mode; kill the expression input first if CPU-bound.
- **Secrets**: all keys server-side; browser gets only the short-lived ElevenLabs conversation token.

## 12. Demo risk register

| Risk | Mitigation |
|---|---|
| Venue Wi-Fi kills voice latency | Phone hotspot as rehearsed primary; WebRTC adapts; short caller turns hide jitter |
| Presage signal bad on stage (lighting, judge moves) | Signal-quality UX + last-good hold; `?vitals=sim` one keystroke away, driven by call events so it still correlates |
| ElevenLabs outage/quota | Pre-purchased credits; scripted-timeline playback mode (design fixture) with pre-generated audio clips as absolute last resort |
| Judge freezes / says nothing | Caller escalates on silence (director silence timer); presenter has a rehearsed "ask them the address" nudge |
| Composure never leaves GREEN (calm judge) | Escalation beats get harder; worst case the arrow-key nudge exists |
| Backboard/Atlas hiccup | Hardcoded directives + deterministic copilot fallbacks (§6.3, §6.6) |
| Everything at once | `startScreen=report` + seeded data: the report and history screens demo standalone |

## 13. Success criteria

**Demo**: judge completes the 5-minute arc (baseline → panic → RED degrade → recovery → escalation → report) with no visible fallback; at least one moment where the judge visibly reacts to the caller degrading *because of them*.
**Product**: full P0 checklist; P1 copilot + brief live; report renders from real session data; a second run produces a second history row.

## 14. Open questions

1. Presage Web SDK access tier/keys — confirm rate limits and browser support on day 0; if web SDK access falls through, fall back plan is MediaPipe-based rPPG (rougher) or sim mode with honest framing.
2. Which LLM behind the ElevenLabs agent hits the best latency/steerability tradeoff — decide by measuring, day 1.
3. 911 protocol dataset source (public dispatch guidecards vs. synthesized from training manuals) — needed before embedding (P1, not blocking).
4. Backboard API surface for multi-agent threads — confirm request shapes early; fallbacks already specified.
