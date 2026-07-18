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
  startCall: () => void;
  goHistory: () => void;
  account?: { label: string; href?: string; cta?: string } | null;
}) {
  const {
    scenarios,
    scenarioIdx,
    pickScenario,
    stream,
    camDenied,
    signal,
    startCall,
    goHistory,
    account,
  } = props;

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
          {account && (
            <span className="text-muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
              {account.label}
              {account.href && (
                <a href={account.href} style={{ fontSize: 12, textDecoration: "none" }}>
                  {account.cta}
                </a>
              )}
            </span>
          )}
        </div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
          Select a scenario. Take the call.
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
        </Blueprint>

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }}>Ready when you are</div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              The caller will react to how you handle yourself. Pick up when you&apos;re set.
            </div>
          </div>
          <button className="btn btn-primary" onClick={startCall} style={{ minWidth: 170, fontSize: 15, padding: "10px 18px" }}>
            Take the call
          </button>
        </div>
      </Blueprint>
    </div>
  );
}
