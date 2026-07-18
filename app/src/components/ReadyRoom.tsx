"use client";

import { Blueprint } from "./Blueprint";
import { CameraFeed } from "./CameraFeed";
import type { ScenarioConfig } from "@/lib/types";

export function ReadyRoom(props: {
  scenarios: ScenarioConfig[];
  scenarioIdx: number;
  pickScenario: (i: number) => void;
  stream: MediaStream | null;
  camDenied: boolean;
  signal: number;
  bl: "idle" | "running" | "done";
  blT: number;
  blHr: number;
  baselineHr: number;
  baselineSecs: number;
  startBaseline: () => void;
  startCall: () => void;
  goHistory: () => void;
}) {
  const {
    scenarios,
    scenarioIdx,
    pickScenario,
    stream,
    camDenied,
    signal,
    bl,
    blT,
    blHr,
    baselineHr,
    baselineSecs,
    startBaseline,
    startCall,
    goHistory,
  } = props;

  const ringOffset = 351.9 * (blT / baselineSecs);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 28 }}>
      <Blueprint style={{ width: 820, maxWidth: "100%", background: "var(--color-bg)", padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 22, letterSpacing: ".14em" }}>
            CODEBLUE
          </div>
          <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>
            Ready room — shift 01
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); goHistory(); }}
            style={{ marginLeft: "auto", fontSize: 13, textDecoration: "none" }}
          >
            Session history
          </a>
        </div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
          Select a scenario. Capture your baseline. Take the call.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
          {scenarios.map((sc, i) => (
            <Blueprint
              key={sc.id}
              onClick={() => pickScenario(i)}
              style={{
                padding: 14,
                cursor: "pointer",
                background: "var(--color-bg)",
                ...(i === scenarioIdx
                  ? { borderColor: "var(--color-accent)", boxShadow: "inset 0 0 0 1px var(--color-accent)" }
                  : {}),
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="text-muted" style={{ fontSize: 10, letterSpacing: ".12em" }}>
                  SC-0{sc.n}
                </span>
                <span className={`tag ${sc.tagClass}`} style={{ fontSize: 10, letterSpacing: ".08em" }}>
                  {sc.diff}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, lineHeight: 1.15, marginBottom: 4 }}>
                {sc.name}
              </div>
              <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
                {sc.desc}
              </div>
            </Blueprint>
          ))}
        </div>

        <Blueprint
          style={{ position: "relative", height: 300, background: "var(--color-neutral-900)", overflow: "hidden", marginBottom: 6 }}
        >
          <CameraFeed stream={stream} />
          {camDenied && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "var(--color-neutral-400)",
                fontSize: 13,
                letterSpacing: ".08em",
                zIndex: 2,
              }}
            >
              CAMERA UNAVAILABLE — CHECK PERMISSIONS
            </div>
          )}
          {!camDenied && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 180,
                  height: 200,
                  margin: "-104px 0 0 -90px",
                  border: "1.5px solid var(--color-accent-300)",
                  animation: "cbDrift 5s ease-in-out infinite",
                }}
              >
                <div style={{ position: "absolute", top: -22, left: 0, fontSize: 10, letterSpacing: ".12em", color: "var(--color-accent-200)", fontFamily: "var(--font-heading)" }}>
                  FACE LOCK · rPPG ACTIVE
                </div>
              </div>
              <div style={{ position: "absolute", left: 12, bottom: 10, display: "flex", gap: 14, fontSize: 11, letterSpacing: ".1em", color: "var(--color-accent-200)", fontFamily: "var(--font-heading)" }}>
                <span style={{ animation: "cbPulse 2s infinite" }}>● PRESAGE VITALS</span>
                <span>SIGNAL {signal}%</span>
              </div>
            </>
          )}

          {bl === "running" && (
            <div style={{ position: "absolute", right: 18, top: 18, width: 132, textAlign: "center" }}>
              <svg width="132" height="132" viewBox="0 0 132 132">
                <circle cx="66" cy="66" r="56" fill="rgba(29,31,32,.55)" stroke="rgba(255,255,255,.18)" strokeWidth="2" />
                <circle
                  cx="66"
                  cy="66"
                  r="56"
                  fill="none"
                  stroke="var(--color-accent-300)"
                  strokeWidth="3"
                  strokeDasharray="351.9"
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 66 66)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
                <text x="66" y="60" textAnchor="middle" fill="#fff" fontFamily="Barlow Condensed" fontSize="34" fontWeight="600">
                  {blHr}
                </text>
                <text x="66" y="78" textAnchor="middle" fill="var(--color-accent-300)" fontSize="10" letterSpacing="2">
                  BPM
                </text>
                <text x="66" y="96" textAnchor="middle" fill="rgba(255,255,255,.6)" fontSize="11">
                  {blT}s
                </text>
              </svg>
            </div>
          )}
        </Blueprint>

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            {bl === "idle" && (
              <>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }}>Baseline capture</div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  Sit still, breathing normally. {baselineSecs} seconds.
                </div>
              </>
            )}
            {bl === "running" && (
              <>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, animation: "cbPulse 2s infinite" }}>
                  Reading baseline…
                </div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  Sit still, breathing normally.
                </div>
              </>
            )}
            {bl === "done" && (
              <>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, color: "var(--color-accent-700)" }}>
                  Baseline {baselineHr} bpm — locked
                </div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  The caller will react to how you handle yourself.
                </div>
              </>
            )}
          </div>
          {bl !== "done" && (
            <button className="btn btn-secondary" disabled={bl === "running"} onClick={startBaseline} style={{ minWidth: 170 }}>
              Capture baseline
            </button>
          )}
          {bl === "done" && (
            <button className="btn btn-primary" onClick={startCall} style={{ minWidth: 170, fontSize: 15, padding: "10px 18px" }}>
              Take the call
            </button>
          )}
        </div>
      </Blueprint>
    </div>
  );
}
