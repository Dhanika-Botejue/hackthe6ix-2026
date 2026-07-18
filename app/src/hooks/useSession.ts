"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { bandOf, computeComposure } from "@/lib/composure";
import { buildReport } from "@/lib/report";
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
import { EMPTY_INCIDENT } from "@/lib/types";
import { applyVerdicts } from "@/lib/incident";
import type { Band, Brief, Checks, IncidentDetails, Marker, Report, ResponsesGrade, SessionRow, TranscriptLine, VitalsTick } from "@/lib/types";

export type Screen = "splash" | "home" | "ready" | "console" | "report" | "history";
type BaselineState = "idle" | "running" | "done";
type CallMode = "sim" | "live" | null;

const BASELINE_SECS = Number(process.env.NEXT_PUBLIC_BASELINE_SECONDS ?? 15);
const DEMO_SPEED = Number(process.env.NEXT_PUBLIC_DEMO_SPEED ?? 1);

export function useSession() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [course, setCourse] = useState(30);
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

  const scenario = SCENARIOS[scenarioIdx];

  const presage = usePresageVitals();
  const presageLatestRef = useRef<PresageLatest>(presage.latest);
  useEffect(() => {
    presageLatestRef.current = presage.latest;
  }, [presage.latest]);

  useEffect(() => {
    if (stream && presage.enabled) presage.startCapture(stream);
  }, [stream, presage]);

  const conversation = useConversation({
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
  }, [clearTimers, stopCam]);

  const go = useCallback(
    (next: Screen) => {
      clearTimers();
      if (next === "home" || next === "ready" || next === "console") startCam();
      setScreen(next);
    },
    [clearTimers, startCam]
  );

  const setField = useCallback(
    (k: keyof IncidentDetails, v: string) => setDetails((prev) => ({ ...prev, [k]: v })),
    []
  );

  function pushTurn(who: "CALLER" | "YOU", text: string) {
    setTranscript((prev) => [...prev, { who, text, t: secsRef.current }]);
  }

  const pickScenario = useCallback((i: number) => setScenarioIdx(i), []);

  const startBaseline = useCallback(() => {
    const total = BASELINE_SECS;
    const startHr = 83 + Math.round(Math.random() * 4);
    setBl("running");
    setBlT(total);
    setBlHr(startHr);
    const iv = setInterval(() => {
      setBlT((t) => {
        const nt = t - 1;
        const real = presageLatestRef.current;
        const hasRealHr = presage.enabled && real.pulseRate !== undefined;

        if (nt <= 0) {
          clearInterval(iv);
          setBl("done");
          const finalHr = hasRealHr ? Math.round(real.pulseRate!) : 72;
          const finalBr = presage.enabled && real.breathingRate !== undefined ? Math.round(real.breathingRate) : 14;
          setBlHr(finalHr);
          setBaselineHr(finalHr);
          setBaselineBr(finalBr);
          return 0;
        }

        if (hasRealHr) {
          setBlHr(Math.round(real.pulseRate!));
          setSignal(real.validationHint ? 62 : 97);
        } else {
          setBlHr((h) => stepBaselineSim(h, nt, total));
          setSignal(93 + Math.round(Math.random() * 6));
        }
        return nt;
      });
    }, 1000 / DEMO_SPEED);
    timersRef.current.push(iv);
  }, [presage.enabled]);

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
      courseFrom
    );
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
            const passed = total >= 24;
            const courseTo = Math.min(100, prev.courseFrom + (passed ? 10 : 3));
            setCourse(courseTo);
            return { ...prev, responses, incident, total, passed, courseTo };
          });
        }
      )
      .catch(() => {
        setReport((prev) => (prev ? { ...prev, responses: { ...prev.responses, loading: false } } : prev));
      });
  }, [clearTimers, conversation, transcript, checks, markers, scenario, details, course]);

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
      const rawBr = real.breathingRate ?? vitalsRef.current.br;
      const rawComp = computeComposure({ hr: rawHr, baselineHr, br: rawBr, baselineBr, faceTension: real.faceTension });
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
          // Persona AND greeting come from the ElevenLabs dashboard agent — we
          // intentionally do NOT override agent.prompt or agent.firstMessage, so
          // the dashboard system prompt is the single source of truth. The
          // scenario name is still passed as a dynamic variable so the dashboard
          // prompt can reference {{scenario}} if you want per-scenario behavior.
          dynamicVariables: { baseline_hr: baselineHr, scenario: scenario.name },
          overrides: {
            agent: {
              language: "en",
            },
            tts: {
              stability: 0.3,
              similarityBoost: 0.75,
            },
          },
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
    setCallMode(mode);
  }, [baselineHr, baselineBr, clearTimers, conversation, go, runLiveTick, runSimTick, scenario]);

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
    startCall,
    endCall,
    callMode,
    callT,
    hr,
    br,
    comp,
    band,
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
