"use client";

import { useEffect, useRef } from "react";
import { Blueprint } from "./Blueprint";
import { CameraFeed } from "./CameraFeed";
import { bandColor, bandLabel as bandLabelFor, mmss } from "@/lib/composure";
import { BRIEF_DEF } from "@/lib/scenarios";
import type { Band, Brief, TranscriptLine } from "@/lib/types";

export function LiveConsole(props: {
  stream: MediaStream | null;
  camDenied: boolean;
  hr: number;
  br: number;
  comp: number;
  band: Band;
  baselineHr: number;
  callT: number;
  callerTitle: string;
  scenarioName: string;
  callerState: string;
  callOver: boolean;
  copilot: string;
  brief: Brief;
  transcript: TranscriptLine[];
  liveNotice: string | null;
  onEndCall: () => void;
}) {
  const {
    stream,
    camDenied,
    hr,
    br,
    comp,
    band,
    baselineHr,
    callT,
    callerTitle,
    scenarioName,
    callerState,
    callOver,
    copilot,
    brief,
    transcript,
    liveNotice,
    onEndCall,
  } = props;

  const bc = bandColor(band);
  const hrDelta = hr - baselineHr;
  const hrDeltaColor = hrDelta > 20 ? bandColor("red") : hrDelta > 8 ? bandColor("amber") : "var(--color-neutral-600)";
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const briefRows = BRIEF_DEF.map((f) => ({
    label: f.label,
    value: brief[f.key] || "—",
    color: brief[f.key] ? "var(--color-text)" : "var(--color-neutral-500)",
    weight: brief[f.key] ? 500 : 400,
  }));

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "280px 1fr 320px",
        overflow: "hidden",
        boxShadow: `inset 0 0 0 4px ${bc}`,
        transition: "box-shadow .6s",
      }}
    >
      {/* left rail: trainee */}
      <div style={{ borderRight: "1px solid var(--color-divider)", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13, letterSpacing: ".14em" }}>
          CODEBLUE <span className="text-muted" style={{ letterSpacing: ".1em" }}>/ TRAINEE</span>
        </div>
        <Blueprint style={{ position: "relative", height: 150, background: "var(--color-neutral-900)", overflow: "hidden" }}>
          <CameraFeed stream={stream} />
          {!camDenied && (
            <>
              <div style={{ position: "absolute", left: "50%", top: "50%", width: 84, height: 96, margin: "-50px 0 0 -42px", border: "1px solid var(--color-accent-300)", animation: "cbDrift 5s ease-in-out infinite" }} />
              <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9, letterSpacing: ".12em", color: "var(--color-accent-200)", fontFamily: "var(--font-heading)", animation: "cbPulse 2s infinite" }}>
                ● LIVE
              </div>
            </>
          )}
          {camDenied && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--color-neutral-400)", fontSize: 10, letterSpacing: ".1em", textAlign: "center", padding: 8 }}>
              NO CAMERA
            </div>
          )}
        </Blueprint>
        <div>
          <div className="text-muted" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>Heart rate</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 44, lineHeight: 1 }}>{hr}</span>
            <span className="text-muted" style={{ fontSize: 12 }}>bpm</span>
            <span style={{ fontSize: 12, color: hrDeltaColor }}>{hrDelta >= 0 ? "+" : ""}{hrDelta}</span>
          </div>
          <div className="text-muted" style={{ fontSize: 11 }}>baseline {baselineHr}</div>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>Breathing</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 32, lineHeight: 1 }}>{br}</span>
            <span className="text-muted" style={{ fontSize: 12 }}>/min</span>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="text-muted" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>Composure</div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 20, color: bc }}>{comp}</div>
          </div>
          <div style={{ position: "relative", height: 12, border: "1px solid var(--color-divider)", marginTop: 6 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${comp}%`, background: bc, transition: "width .8s, background .8s" }} />
            <div style={{ position: "absolute", left: "40%", top: 0, bottom: 0, width: 1, background: "var(--color-text)", opacity: 0.35 }} />
            <div style={{ position: "absolute", left: "70%", top: 0, bottom: 0, width: 1, background: "var(--color-text)", opacity: 0.35 }} />
          </div>
          <div className="text-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, letterSpacing: ".1em", marginTop: 3 }}>
            <span>DEGRADE</span><span>HOLD</span><span>ESCALATE</span>
          </div>
          <div style={{ marginTop: 8, fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13, letterSpacing: ".12em", color: bc }}>
            {bandLabelFor(band)}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onEndCall} style={{ marginTop: "auto" }}>End call</button>
      </div>

      {/* center: the call */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: "1px solid var(--color-divider)" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 30, letterSpacing: ".06em", fontVariantNumeric: "tabular-nums" }}>
            {mmss(callT)}
          </div>
          <div style={{ width: 1, height: 28, background: "var(--color-divider)" }} />
          <div style={{ position: "relative", width: 12, height: 12 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: callOver ? "var(--color-neutral-500)" : bandColor("red") }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: callOver ? "var(--color-neutral-500)" : bandColor("red"), animation: "cbRing 1.6s ease-out infinite" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, lineHeight: 1.1 }}>{callerTitle}</div>
            <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".06em" }}>{scenarioName} · line 911-04</div>
          </div>
          <span className="tag tag-accent" style={{ marginLeft: "auto", letterSpacing: ".08em" }}>{callerState}</span>
        </div>
        {liveNotice && (
          <div className="text-muted" style={{ fontSize: 11, padding: "6px 20px", borderBottom: "1px solid var(--color-divider)" }}>
            {liveNotice}
          </div>
        )}
        <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {transcript.map((line, i) => {
            const align = line.who === "YOU" ? "flex-end" : "flex-start";
            const whoColor = line.who === "YOU" ? "var(--color-accent-700)" : "var(--color-neutral-800)";
            const bg = line.who === "YOU" ? "var(--color-accent-100)" : "transparent";
            return (
              <div key={i} style={{ maxWidth: "78%", alignSelf: align }}>
                <div style={{ fontSize: 10, letterSpacing: ".12em", fontFamily: "var(--font-heading)", fontWeight: 600, color: whoColor, marginBottom: 2 }}>
                  {line.who} · {mmss(line.t)}
                </div>
                <div style={{ border: "1px solid var(--color-divider)", borderLeft: `3px solid ${whoColor}`, padding: "8px 12px", fontSize: 14, lineHeight: 1.45, background: bg }}>
                  {line.text}
                </div>
              </div>
            );
          })}
          {callOver && (
            <div style={{ alignSelf: "center", textAlign: "center", marginTop: 10 }}>
              <div className="text-muted" style={{ fontSize: 12, letterSpacing: ".1em", marginBottom: 10 }}>— CALL COMPLETE —</div>
              <button className="btn btn-primary" onClick={onEndCall} style={{ minWidth: 200 }}>View after-action report</button>
            </div>
          )}
        </div>
      </div>

      {/* right rail: the work */}
      <div style={{ borderLeft: "1px solid var(--color-divider)", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
        <Blueprint style={{ padding: 14, borderLeft: "3px solid var(--color-accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span className="text-muted" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>Copilot</span>
            <span style={{ width: 6, height: 6, background: "var(--color-accent)", animation: "cbPulse 1.6s infinite" }} />
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, lineHeight: 1.25 }}>{copilot}</div>
        </Blueprint>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="text-muted" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 8 }}>
            Incident brief
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {briefRows.map((f) => (
              <div key={f.label} style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 13 }}>
                <span className="text-muted" style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", paddingTop: 1 }}>{f.label}</span>
                <span style={{ color: f.color, fontWeight: f.weight }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
