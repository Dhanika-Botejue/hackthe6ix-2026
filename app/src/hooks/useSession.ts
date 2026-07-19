"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { bandOf, computeComposure, estimateBreathingRateFromTrace } from "@/lib/composure";
import { buildReport, PASS_THRESHOLD } from "@/lib/report";
import { directorTick, initDirectorState, callerStateLabelFor, type DirectorState } from "@/lib/director";
import { copilotFor, detectCheck } from "@/lib/live-heuristics";
import { SCENARIOS, SEED_SESSIONS } from "@/lib/scenarios";
import {
  initVitalsSim,
  stepBaselineSim,
  stepVitalsSim,
  stepVitalsFromPresage,
  deriveLiveTarget,
  type VitalsSimState,
} from "@/lib/vitals-sim";
import { usePresageVitals, type PresageLatest } from "@/hooks/usePresageVitals";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { EMPTY_INCIDENT } from "@/lib/types";
import { applyVerdicts } from "@/lib/incident";
import type { Band, Brief, Checks, IncidentDetails, Marker, Report, ResponsesGrade, SessionRow, TranscriptLine, VitalsTick, Who } from "@/lib/types";

export type Screen = "splash" | "home" | "ready" | "calibrating" | "incoming" | "console" | "report" | "history";
type BaselineState = "idle" | "running" | "done";
/** "real" = Real Call mode: an actual call on the dispatcher's phone, transcribed off the laptop mic. */
type CallMode = "sim" | "live" | "real" | null;

/** How often Real Call mode re-runs the Gemini form extraction over the transcript. */
const EXTRACT_EVERY_MS = 6000;

const BASELINE_SECS = Number(process.env.NEXT_PUBLIC_BASELINE_SECONDS ?? 15);
const DEMO_SPEED = Number(process.env.NEXT_PUBLIC_DEMO_SPEED ?? 1);
const TOTAL_LESSONS = 5; // course completion is measured out of this many lessons

export function useSession() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [course, setCourse] = useState(0); // completed lessons, out of TOTAL_LESSONS
  const [details, setDetails] = useState<IncidentDetails>(EMPTY_INCIDENT);
  const [camDenied, setCamDenied] = useState(false);
  const [signal, setSignal] = useState(96);

  const [bl, setBl] = useState<BaselineState>("idle");
  const [blT, setBlT] = useState(0);
  const [blHr, setBlHr] = useState(84);
  const [baselineHr, setBaselineHr] = useState(72);
  const [baselineBr, setBaselineBr] = useState(14);

  const [callMode, setCallMode] = useState<CallMode>(null);
  const [callT, setCallT] = useState(0);
  const [hr, setHr] = useState(72);
  const [br, setBr] = useState(14);
  const [comp, setComp] = useState(88);
  const [band, setBand] = useState<Band>("green");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [copilot, setCopilot] = useState("Standing by. Pick up the line.");
  const [brief, setBrief] = useState<Brief>({});
  const [checks, setChecks] = useState<Checks>({});
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [callerState, setCallerState] = useState("RINGING");
  const [callOver, setCallOver] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>(SEED_SESSIONS);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const camTriedRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const firedRef = useRef<Set<number>>(new Set());
  const seriesRef = useRef<VitalsTick[]>([]);
  const vitalsRef = useRef<VitalsSimState>(initVitalsSim(72));
  const directorRef = useRef<DirectorState>(initDirectorState("green"));
  const lastTraineeTurnRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const checksRef = useRef<Checks>({});
  // Holds the last real facial-tension reading so a momentary gap (lost face-lock,
  // "Recalibrating…") doesn't get treated as "neutral" in the composure formula — a
  // data gap isn't evidence of calm. undefined until the first real reading arrives.
  const lastFaceTensionRef = useRef<number | undefined>(undefined);
  const completedLessonsRef = useRef<Set<number>>(new Set()); // unique lesson idxs finished

  /* Real Call mode: which form fields the dispatcher edited by hand (auto-fill
     must never overwrite those) and which the extractor filled (for the AUTO
     badge in the form). Mirrored in refs so interval closures see fresh sets. */
  const manualFieldsRef = useRef<Set<keyof IncidentDetails>>(new Set());
  const autoFilledRef = useRef<Set<keyof IncidentDetails>>(new Set());
  const [autoFilled, setAutoFilled] = useState<Set<keyof IncidentDetails>>(new Set());
  const callModeRef = useRef<CallMode>(null);
  const transcriptStateRef = useRef<TranscriptLine[]>([]);
  const extractBusyRef = useRef(false);
  const lastExtractCountRef = useRef(0);

  const scenario = SCENARIOS[scenarioIdx];

  // Real Call mode mic transcription. One mic hears both sides of the phone
  // call, so lines land as speaker-less "AUDIO" turns.
  const {
    start: startTranscription,
    stop: stopTranscription,
    listening: micListening,
    interim: micInterim,
    error: micError,
  } = useLiveTranscription((text) => pushTurn("AUDIO", text));
  useEffect(() => {
    if (micError) setLiveNotice(micError);
  }, [micError]);

  const presage = usePresageVitals();
  const presageLatestRef = useRef<PresageLatest>(presage.latest);
  useEffect(() => {
    presageLatestRef.current = presage.latest;
  }, [presage.latest]);

  useEffect(() => {
    if (stream && presage.enabled) presage.startCapture(stream);
  }, [stream, presage]);

  const conversation = useConversation({
    volume: 1, // caller voice at max (0..1)
    onMessage: (props) => {
      if (props.role === "user") {
        lastTraineeTurnRef.current = props.message;
        pushTurn("YOU", props.message);
        const key = detectCheck(props.message);
        if (key && checksRef.current[key] === undefined) {
          checksRef.current = { ...checksRef.current, [key]: secsRef.current };
          setChecks(checksRef.current);
        }
      } else {
        pushTurn("CALLER", props.message);
      }
    },
    onError: (message) => {
      setLiveNotice(`Live call error: ${String(message)}. Falling back to simulated call.`);
    },
  });

  const secsRef = useRef(0);
  useEffect(() => {
    secsRef.current = callT;
  }, [callT]);
  useEffect(() => {
    transcriptStateRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    callModeRef.current = callMode;
  }, [callMode]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    camTriedRef.current = false;
  }, []);

  const startCam = useCallback(() => {
    if (streamRef.current || camTriedRef.current) return;
    camTriedRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamDenied(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280 } })
      .then((s) => {
        streamRef.current = s;
        setStream(s);
      })
      .catch(() => setCamDenied(true));
  }, []);

  useEffect(() => () => {
    clearTimers();
    stopCam();
    stopTranscription();
  }, [clearTimers, stopCam, stopTranscription]);

  const go = useCallback(
    (next: Screen) => {
      clearTimers();
      if (next === "home" || next === "ready" || next === "calibrating" || next === "incoming" || next === "console") startCam();
      setScreen(next);
    },
    [clearTimers, startCam]
  );

  const setField = useCallback((k: keyof IncidentDetails, v: string) => {
    if (callModeRef.current === "real") {
      // A hand edit takes the field out of auto-fill's reach for the rest of the call.
      manualFieldsRef.current.add(k);
      if (autoFilledRef.current.has(k)) {
        const auto = new Set(autoFilledRef.current);
        auto.delete(k);
        autoFilledRef.current = auto;
        setAutoFilled(auto);
      }
    }
    setDetails((prev) => ({ ...prev, [k]: v }));
  }, []);

  function pushTurn(who: Who, text: string) {
    setTranscript((prev) => [...prev, { who, text, t: secsRef.current }]);
  }

  const pickScenario = useCallback((i: number) => setScenarioIdx(i), []);

  const startBaseline = useCallback(
    (onDone?: () => void) => {
      const total = BASELINE_SECS;
      // Presage's pulse rate needs ~12s just to produce its first real value (its own
      // rolling-average window) — a fixed 15s timer leaves almost no margin once the
      // user takes a moment to get situated, so it used to routinely time out before a
      // real reading ever arrived and silently lock in a fake simulated ramp (which
      // settles toward 72) as the "baseline". In real mode we now wait past `total` for
      // an actual reading, up to this hard ceiling, instead of ever faking one.
      const maxWaitSecs = Math.max(total, 30);
      let elapsed = 0;
      setBl("running");
      setBlT(total);
      setBlHr(presage.enabled ? 0 : 83 + Math.round(Math.random() * 4)); // 0 = sentinel for "no real reading yet"
      const iv = setInterval(() => {
        elapsed += 1;
        setBlT(Math.max(0, total - elapsed));
        const real = presageLatestRef.current;
        const hasRealHr = presage.enabled && real.pulseRate !== undefined;

        if (presage.enabled) {
          if (hasRealHr) {
            setBlHr(Math.round(real.pulseRate!));
            setSignal(real.validationHint ? 62 : 97);
          } else {
            setSignal(90);
          }
          const timedOut = elapsed >= maxWaitSecs;
          if ((elapsed >= total && hasRealHr) || timedOut) {
            clearInterval(iv);
            setBl("done");
            const finalHr = hasRealHr ? Math.round(real.pulseRate!) : 72;
            const finalBr = real.breathingRate !== undefined ? Math.round(real.breathingRate) : 14;
            setBlHr(finalHr);
            setBaselineHr(finalHr);
            setBaselineBr(finalBr);
            if (!hasRealHr) {
              setLiveNotice("Couldn't get a reliable heart-rate reading during calibration — using an estimated baseline.");
            }
            onDone?.();
          }
          return;
        }

        // Sim mode (no Presage configured): the existing fake settling ramp, clearly
        // only ever a stand-in for the demo path, never presented as a real reading.
        const nt = total - elapsed;
        if (nt <= 0) {
          clearInterval(iv);
          setBl("done");
          setBlHr(72);
          setBaselineHr(72);
          setBaselineBr(14);
          onDone?.();
          return;
        }
        setBlHr((h) => stepBaselineSim(h, nt, total));
        setSignal(93 + Math.round(Math.random() * 6));
      }, 1000 / DEMO_SPEED);
      timersRef.current.push(iv);
    },
    [presage.enabled]
  );

  const endCall = useCallback(() => {
    clearTimers();
    if (conversationIdRef.current) {
      conversation.endSession();
      conversationIdRef.current = null;
    }
    const courseFrom = course;
    const built = buildReport(
      seriesRef.current.map((s) => ({ ...s })),
      transcript,
      checks,
      markers,
      details,
      scenario.truth,
      courseFrom,
      courseFrom // tentative — only advances below if the call is actually passed
    );
    // Only counts as completing the lesson (and bumps course completion) on a pass —
    // finishing a failed call shouldn't silently advance progress.
    if (built.passed) {
      completedLessonsRef.current.add(scenarioIdx);
      built.courseTo = Math.min(TOTAL_LESSONS, completedLessonsRef.current.size);
    }
    built.responses.loading = true;
    const now = new Date();
    const row: SessionRow = {
      date:
        now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " · " +
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      scenario: scenario.name,
      perf: built.total + " / 30",
      peak: built.peak,
      red: mmssLocal(built.redSecs),
      rec: built.recSecs + "s",
      dur: built.dur,
      latest: true,
    };
    setSessions((prev) => [...prev, row]);
    setReport(built);
    setCourse(built.courseTo);
    setScreen("report");

    // Upgrade the Responses + Incident pillars with the Gemini grader,
    // sending the full call context (scenario, transcript, form vs answer
    // key, vitals summary). 204 = no key configured → keep local grades.
    const series = built.series;
    const vitalsSummary = {
      avgComposure: built.composure.avg,
      lowestComposure: built.composure.low,
      avgHr: series.length ? Math.round(series.reduce((a, p) => a + p.hr, 0) / series.length) : undefined,
      avgBr: series.length ? Math.round(series.reduce((a, p) => a + p.br, 0) / series.length) : undefined,
      durationSecs: built.durSecs,
    };
    fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: { name: scenario.name, desc: scenario.desc, diff: scenario.diff },
        transcript,
        incident: {
          fields: built.incident.rows.map((r) => ({
            key: r.key,
            label: r.label,
            answer: r.your === "—" ? "" : r.your,
            correct: r.correct,
            na: scenario.truth[r.key]?.na ?? false,
          })),
        },
        vitals: vitalsSummary,
        checks,
      }),
    })
      .then((r) => (r.status === 204 ? null : r.json()))
      .then(
        (g: {
          responses: ResponsesGrade;
          incident: { verdicts: Record<string, string> };
        } | null) => {
          setReport((prev) => {
            if (!prev) return prev;
            const responses: ResponsesGrade = g
              ? { score: g.responses.score, good: g.responses.good, improve: g.responses.improve, loading: false }
              : { ...prev.responses, loading: false };
            const incident = g ? applyVerdicts(prev.incident, g.incident.verdicts) : prev.incident;
            const total = prev.composure.score + responses.score + incident.score;
            const passed = total >= PASS_THRESHOLD;
            // Lesson completion was already settled in endCall — the regrade
            // only updates scores, never course progress.
            return { ...prev, responses, incident, total, passed };
          });
        }
      )
      .catch(() => {
        setReport((prev) => (prev ? { ...prev, responses: { ...prev.responses, loading: false } } : prev));
      });
  }, [clearTimers, conversation, transcript, checks, markers, scenario, scenarioIdx, details, course]);

  /**
   * One vitals tick, real-Presage or sim depending on what's configured.
   * Reads presageLatestRef (not presage.latest directly) since this runs
   * inside a setInterval closure that must see fresh values every tick,
   * not just whatever was current when the interval was created.
   */
  const computeNextVitals = useCallback((): VitalsSimState => {
    if (presage.enabled) {
      const real = presageLatestRef.current;
      const rawHr = real.pulseRate ?? vitalsRef.current.hr;
      // Prefer a breathing rate estimated from the live waveform (reacts in seconds)
      // over Presage's own breathingRate (a 30s rolling average, barely moves during a
      // short demo call); fall back to Presage's rate, then to the last known value —
      // never to baseline/neutral just because a fresher reading isn't in yet.
      const fastBr = estimateBreathingRateFromTrace(real.breathingTrace);
      const rawBr = fastBr ?? real.breathingRate ?? vitalsRef.current.br;
      if (real.faceTension !== undefined) lastFaceTensionRef.current = real.faceTension;
      const rawComp = computeComposure({
        hr: rawHr,
        baselineHr,
        br: rawBr,
        baselineBr,
        faceTension: lastFaceTensionRef.current,
      });
      return stepVitalsFromPresage(vitalsRef.current, rawHr, rawBr, rawComp);
    }
    return stepVitalsSim(vitalsRef.current);
  }, [presage.enabled, baselineHr, baselineBr]);

  const firedScenarioEvents = useCallback(
    (t: number) => {
      scenario.timeline.forEach((e, i) => {
        if (e.t > t || firedRef.current.has(i)) return;
        firedRef.current.add(i);
        if (e.who && e.text) pushTurn(e.who, e.text);
        if (e.hr !== undefined) vitalsRef.current.hrTarget = e.hr;
        if (e.comp !== undefined) vitalsRef.current.compTarget = e.comp;
        if (e.copilot) setCopilot(e.copilot);
        if (e.state) setCallerState(e.state);
        if (e.brief) setBrief((prev) => ({ ...prev, ...e.brief }));
        if (e.check) setChecks((prev) => (prev[e.check!] !== undefined ? prev : { ...prev, [e.check!]: t }));
        if (e.marker) setMarkers((prev) => [...prev, { t, label: e.marker! }]);
        if (e.end) setCallOver(true);
      });
    },
    [scenario]
  );

  const runSimTick = useCallback(() => {
    setCallT((prevT) => {
      const t = prevT + 1;
      firedScenarioEvents(t);

      const vs = computeNextVitals();
      vitalsRef.current = vs;
      setHr(vs.hr);
      setBr(vs.br);
      setComp(vs.comp);
      setBand((prevBand) => bandOf(vs.comp, prevBand));

      seriesRef.current.push({ t, hr: vs.hr, br: vs.br, comp: vs.comp, band: bandOf(vs.comp) });
      return t;
    });
  }, [firedScenarioEvents, computeNextVitals]);

  const runLiveTick = useCallback(() => {
    setCallT((prevT) => {
      const t = prevT + 1;

      if (!presage.enabled) {
        const compTarget = deriveLiveTarget(vitalsRef.current.compTarget, lastTraineeTurnRef.current);
        vitalsRef.current.compTarget = compTarget;
        vitalsRef.current.hrTarget = baselineHr + (100 - compTarget) * 0.4;
      }
      lastTraineeTurnRef.current = null;
      const vs = computeNextVitals();
      vitalsRef.current = vs;
      setHr(vs.hr);
      setBr(vs.br);
      setComp(vs.comp);

      const { state: nextDirState, transitioned, directive } = directorTick(directorRef.current, vs.comp, t);
      directorRef.current = nextDirState;
      const currentBand = nextDirState.band;
      setBand(currentBand);

      if (transitioned) {
        setCallerState(callerStateLabelFor(currentBand));
        setMarkers((prev) => [
          ...prev,
          { t, label: currentBand === "red" ? "CALLER DEGRADES" : currentBand === "green" ? "ESCALATION" : "CALLER STABILIZES" },
        ]);
        if (directive && conversationIdRef.current) {
          conversation.sendContextualUpdate(directive);
        }
      }

      setCopilot(copilotFor(checksRef.current, currentBand));

      seriesRef.current.push({ t, hr: vs.hr, br: vs.br, comp: vs.comp, band: currentBand });
      return t;
    });
  }, [baselineHr, conversation, presage.enabled, computeNextVitals]);

  /** Real Call tick: vitals only — no director, no scripted events, no ElevenLabs. */
  const runRealTick = useCallback(() => {
    setCallT((prevT) => {
      const t = prevT + 1;
      const vs = computeNextVitals();
      vitalsRef.current = vs;
      setHr(vs.hr);
      setBr(vs.br);
      setComp(vs.comp);
      setBand((prevBand) => bandOf(vs.comp, prevBand));
      seriesRef.current.push({ t, hr: vs.hr, br: vs.br, comp: vs.comp, band: bandOf(vs.comp) });
      return t;
    });
  }, [computeNextVitals]);

  /**
   * Re-extract the incident form from the full transcript so far. Skips when
   * nothing new was said or a request is already in flight; the newest result
   * wins for every field the dispatcher hasn't touched by hand.
   */
  const runExtractTick = useCallback(() => {
    const lines = transcriptStateRef.current;
    if (extractBusyRef.current || lines.length === 0 || lines.length === lastExtractCountRef.current) return;
    extractBusyRef.current = true;
    lastExtractCountRef.current = lines.length;
    fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: lines }),
    })
      .then((r) => (r.ok && r.status !== 204 ? r.json() : null))
      .then((g: { fields?: Partial<Record<keyof IncidentDetails, string>> } | null) => {
        const fields = g?.fields;
        if (!fields || callModeRef.current !== "real") return;
        setDetails((prev) => {
          const next = { ...prev };
          const auto = new Set(autoFilledRef.current);
          let changed = false;
          for (const k of Object.keys(fields) as (keyof IncidentDetails)[]) {
            const v = fields[k];
            if (!v || !(k in prev) || manualFieldsRef.current.has(k)) continue;
            if (k === "safe" && !["yes", "no", "unsure"].includes(v)) continue;
            if (next[k] !== v) {
              next[k] = v as never;
              changed = true;
            }
            auto.add(k);
          }
          if (auto.size !== autoFilledRef.current.size) {
            autoFilledRef.current = auto;
            setAutoFilled(auto);
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {})
      .finally(() => {
        extractBusyRef.current = false;
      });
  }, []);

  /**
   * Real Call mode: dispatcher takes an actual call on their phone next to the
   * laptop. Mic transcribes both voices live, Gemini keeps the incident form
   * filled, Presage vitals/composure run exactly as in training. No scenario,
   * no grading, no report.
   */
  const startRealCall = useCallback(() => {
    seriesRef.current = [];
    firedRef.current = new Set();
    lastTraineeTurnRef.current = null;
    checksRef.current = {};
    manualFieldsRef.current = new Set();
    autoFilledRef.current = new Set();
    setAutoFilled(new Set());
    extractBusyRef.current = false;
    lastExtractCountRef.current = 0;
    vitalsRef.current = initVitalsSim(baselineHr);
    setCallT(0);
    setHr(baselineHr);
    setBr(baselineBr);
    setComp(88);
    setBand("green");
    setTranscript([]);
    setCopilot("Live call — form fills itself as facts come in.");
    setBrief({});
    setChecks({});
    setMarkers([]);
    setCallerState("LIVE");
    setCallOver(false);
    setLiveNotice(null);
    setDetails(EMPTY_INCIDENT);
    clearTimers();
    callModeRef.current = "real";
    setCallMode("real");
    go("console");

    const ok = startTranscription();
    if (!ok) {
      setLiveNotice("Live transcription needs Chrome or Edge — you can still fill the form manually.");
    }
    timersRef.current.push(setInterval(() => runRealTick(), 1000));
    timersRef.current.push(setInterval(() => runExtractTick(), EXTRACT_EVERY_MS));
  }, [baselineHr, baselineBr, clearTimers, go, startTranscription, runRealTick, runExtractTick]);

  /** Hang up a real call: stop mic + timers, run one last extraction, keep the console up. */
  const stopRealCall = useCallback(() => {
    clearTimers();
    stopTranscription();
    setCallOver(true);
    // Final sweep so anything said in the last few seconds still lands in the
    // form — force it even if the count matches the last scheduled run.
    lastExtractCountRef.current = -1;
    runExtractTick();
  }, [clearTimers, stopTranscription, runExtractTick]);

  const startCall = useCallback(async () => {
    seriesRef.current = [];
    firedRef.current = new Set();
    lastTraineeTurnRef.current = null;
    checksRef.current = {};
    vitalsRef.current = initVitalsSim(baselineHr);
    directorRef.current = initDirectorState("green");
    setCallT(0);
    setHr(baselineHr);
    setBr(baselineBr);
    setComp(88);
    setBand("green");
    setTranscript([]);
    setCopilot("Line connecting. Get the location first.");
    setBrief({});
    setChecks({});
    setMarkers([]);
    setCallerState("RINGING");
    setCallOver(false);
    setLiveNotice(null);
    setDetails(EMPTY_INCIDENT);
    clearTimers();
    go("console");

    let mode: CallMode = "sim";
    try {
      const res = await fetch("/api/call/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      });
      const data = (await res.json()) as { mode: CallMode; token?: string; agentId?: string };
      mode = data.mode;
      if (mode === "live" && data.token && data.agentId) {
        conversationIdRef.current = data.agentId;
        conversation.startSession({
          conversationToken: data.token,
          connectionType: "webrtc",
          // Everything about the caller — persona, greeting, voice, language —
          // comes from the ElevenLabs dashboard agent. We send NO overrides, so
          // this connects uniformly to every case agent without each one having
          // to enable override permissions (that mismatch is what caused the
          // assault/fire agents to reject the session). scenario name is passed
          // as a dynamic variable for optional {{scenario}} use in the prompt.
          dynamicVariables: { baseline_hr: baselineHr, scenario: scenario.name },
        });
        const iv = setInterval(() => runLiveTick(), 1000 / DEMO_SPEED);
        timersRef.current.push(iv);
      } else {
        mode = "sim";
      }
    } catch {
      mode = "sim";
    }

    if (mode === "sim") {
      setLiveNotice(
        (prev) =>
          prev ??
          "Voice: simulated (no ElevenLabs credentials configured) — running the scripted demo call."
      );
      const iv = setInterval(() => runSimTick(), 1000 / DEMO_SPEED);
      timersRef.current.push(iv);
    }
    callModeRef.current = mode;
    setCallMode(mode);
  }, [baselineHr, baselineBr, clearTimers, conversation, go, runLiveTick, runSimTick, scenario]);

  /**
   * Entry point from the lesson picker: runs the pre-call baseline capture (webcam +
   * Presage were already warming up in the background since the Home screen mounted;
   * this just locks in a real resting HR/BR instead of the 72/14 defaults) before the
   * call actually starts. This also front-loads Presage's own rolling-average windows
   * (12s for pulse rate, 30s for breathing rate per its docs) so the live call opens
   * with vitals already tracking close to real-time instead of visibly lagging behind
   * the trainee's actual state for the first 10-30s of the call.
   */
  const beginCalibration = useCallback(() => {
    setBl("idle");
    go("calibrating");
    // Calibration first (real baseline + Presage's rolling windows warming up), THEN
    // the incoming-call ring — so by the time the trainee answers, vitals are already
    // tracking close to real-time instead of visibly lagging for the call's first
    // 10-30s. startCall() itself only fires once the call is actually answered.
    startBaseline(() => go("incoming"));
  }, [go, startBaseline]);

  return {
    screen,
    go,
    scenario,
    scenarioIdx,
    pickScenario,
    scenarios: SCENARIOS,
    course,
    details,
    setField,
    stream,
    camDenied,
    signal,
    bl,
    blT,
    blHr,
    baselineHr,
    baselineSecs: BASELINE_SECS,
    startBaseline,
    beginCalibration,
    startCall,
    endCall,
    startRealCall,
    stopRealCall,
    autoFilled,
    micListening,
    micInterim,
    callMode,
    callT,
    hr,
    br,
    comp,
    band,
    presageEnabled: presage.enabled,
    emotion: presage.latest.expression,
    stress: presage.enabled ? 100 - comp : undefined,
    // SmartSpectra's pulse/breathing readings are rolling averages (12s / 30s) that
    // report stable=false until that window fills — surfacing it so the UI can show
    // "calibrating" instead of looking like a stuck/laggy number.
    pulseStable: presage.latest.pulseStable,
    breathingStable: presage.latest.breathingStable,
    breathingTrace: presage.latest.breathingTrace,
    pulseTrace: presage.latest.pulseTrace,
    presageTabHidden: presage.tabHidden,
    // 0 = kOk (good signal). Anything else pairs with a human-readable hint
    // ("Center face in view", "No face found", ...) explaining why a reading
    // might be stale instead of it silently looking frozen.
    validationCode: presage.latest.validationCode,
    validationHint: presage.latest.validationHint,
    transcript,
    copilot,
    brief,
    checks,
    markers,
    callerState,
    callOver,
    report,
    sessions,
    liveNotice,
  };
}

function mmssLocal(s: number) {
  const sec = Math.max(0, Math.floor(s));
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}
