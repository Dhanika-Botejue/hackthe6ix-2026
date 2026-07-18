"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraFeed } from "./CameraFeed";
import { OwlMascot } from "./OwlMascot";
import { CompletionRing } from "./Home";
import { Icon, IconBadge, type IconName } from "./icons";
import { NATURE_OPTIONS, RELATIONSHIP_OPTIONS } from "@/lib/incident";
import { mmss } from "@/lib/composure";
import { useClock } from "@/hooks/useClock";
import type { TracePoint } from "@/hooks/usePresageVitals";
import type { Band, IncidentDetails, TranscriptLine } from "@/lib/types";

const BAND_COLOR: Record<Band, string> = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)" };
const DIFF_NAME = ["Easy", "Easy", "Medium", "Hard", "Severe"];
const TOTAL_CALLS = 5; // lesson-path length shown in the bottom pager

/** Animated equalizer bars — the "live audio" dressing from the mock. */
function Eq({ n = 12, color = "var(--blue-2)", height = 15 }: { n?: number; color?: string; height?: number }) {
  return (
    <span style={{ display: "flex", gap: 3, alignItems: "center", height }}>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height,
            borderRadius: 2,
            background: color,
            transformOrigin: "center",
            animation: `dlEq ${0.7 + (i % 5) * 0.13}s ease-in-out ${(i % 7) * 0.09}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function Sparkline({ color, seed, width = 108 }: { color: string; seed: number; width?: number }) {
  const d = useMemo(() => {
    let x = 0;
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const base = 10 + Math.sin((i + seed) * 0.9) * 4;
      const spike = i % 6 === (seed % 6) ? -6 : 0;
      pts.push(`${x},${(base + spike).toFixed(1)}`);
      x += 4.5;
    }
    return "M" + pts.join(" L");
  }, [seed]);
  return (
    <svg width={width} height={Math.round((24 * width) / 108)} viewBox="0 0 108 24" style={{ overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A real line chart of Presage trace data — breathing chest-movement or pulse-rate history. */
function TraceChart({ points, color, height = 56, width = 280 }: { points: TracePoint[] | undefined; color: string; height?: number; width?: number }) {
  const path = useMemo(() => {
    if (!points || points.length < 2) return "";
    const vs = points.map((p) => p.v);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const span = max - min || 1;
    const t0 = points[0].t;
    const tSpan = points[points.length - 1].t - t0 || 1;
    const pts = points.map((p) => {
      const x = ((p.t - t0) / tSpan) * width;
      const y = height - ((p.v - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return "M" + pts.join(" L");
  }, [points, height, width]);

  if (!path) {
    return (
      <div className="text-muted" style={{ fontSize: 12, textAlign: "center", padding: height > 30 ? "16px 0" : 0, width, height }}>
        {height > 30 ? "Collecting signal…" : ""}
      </div>
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StressDots({ comp }: { comp: number }) {
  const filled = Math.max(0, Math.min(8, Math.round((100 - comp) / 12.5)));
  const label = filled <= 2 ? "Low" : filled <= 4 ? "Moderate" : filled <= 6 ? "Elevated" : "High";
  const color = filled <= 2 ? "var(--green)" : filled <= 4 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: 3, background: i < filled ? color : "var(--surface-3)" }} />
        ))}
      </div>
      <span style={{ fontWeight: 800, fontSize: 12, color }}>{label}</span>
    </div>
  );
}

/** One vitals reading rendered as its own sub-card with an icon badge. */
function VitalCard({
  icon,
  iconColor,
  label,
  right,
  children,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderRadius: 11,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      <IconBadge name={icon} color={iconColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{label}</span>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}

function Panel({ title, live, right, children, style }: { title: string; live?: boolean; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card card-pad-sm" style={{ display: "flex", flexDirection: "column", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "var(--muted)" }}>{title}</span>
        {right}
        {live && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, color: "var(--green)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", animation: "dlPulse 1.6s infinite" }} />
            Live
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Green viewfinder corner brackets over the webcam feed. */
function CornerBrackets() {
  const base: React.CSSProperties = { position: "absolute", width: 22, height: 22, borderColor: "var(--green)", borderStyle: "solid", borderWidth: 0 };
  return (
    <>
      <span style={{ ...base, top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 }} />
      <span style={{ ...base, top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 }} />
      <span style={{ ...base, bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 }} />
      <span style={{ ...base, bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 }} />
    </>
  );
}

/* ── Incident Details form ── */
function Labelled({ icon, color, label, children }: { icon: IconName; color: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">
        <Icon name={icon} size={15} color={color} />
        {label}
      </div>
      {children}
    </div>
  );
}

function IncidentForm({
  details,
  setField,
}: {
  details: IncidentDetails;
  setField: (k: keyof IncidentDetails, v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const safeOpts: { v: "yes" | "no" | "unsure"; label: string; cls: string }[] = [
    { v: "yes", label: "Yes", cls: "" },
    { v: "no", label: "No", cls: "no" },
    { v: "unsure", label: "Unsure", cls: "unsure" },
  ];

  return (
    <div className="compact-form" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <Labelled icon="pin" color="var(--blue-2)" label="Location">
        <input className="input" placeholder="Enter location…" value={details.location} onChange={(e) => setField("location", e.target.value)} />
      </Labelled>
      <Labelled icon="warning" color="var(--amber)" label="Nature of emergency">
        <select className="select" value={details.nature} onChange={(e) => setField("nature", e.target.value)}>
          <option value="">Select category…</option>
          {NATURE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Labelled>
      <Labelled icon="shield" color="var(--green)" label="Is the caller safe right now?">
        <div className="seg">
          {safeOpts.map((o) => (
            <button key={o.v} className={`seg-btn ${details.safe === o.v ? "on " + o.cls : ""}`} onClick={() => setField("safe", details.safe === o.v ? "" : o.v)}>
              {o.label}
            </button>
          ))}
        </div>
      </Labelled>
      <Labelled icon="people" color="var(--blue-2)" label="Number of people involved / injured">
        <input className="input" inputMode="numeric" placeholder="Enter number…" value={details.count} onChange={(e) => setField("count", e.target.value)} />
      </Labelled>
      <Labelled icon="people" color="var(--purple)" label="Caller relationship to victim/patient">
        <select className="select" value={details.relationship} onChange={(e) => setField("relationship", e.target.value)}>
          <option value="">Select relationship…</option>
          {RELATIONSHIP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Labelled>
      <Labelled icon="burglary" color="var(--muted)" label="Suspect description (if applicable)">
        <input className="input" placeholder="Clothing, direction, vehicle…" value={details.suspect} onChange={(e) => setField("suspect", e.target.value)} />
      </Labelled>

      {expanded && (
        <>
          <Labelled icon="warning" color="var(--red)" label="Scene safety hazards">
            <input className="input" placeholder="Fire, gas, power lines, dog…" value={details.hazards} onChange={(e) => setField("hazards", e.target.value)} />
          </Labelled>
          <Labelled icon="medical" color="var(--purple)" label="Special considerations">
            <input className="input" placeholder="Pregnant, elderly, child, disability…" value={details.special} onChange={(e) => setField("special", e.target.value)} />
          </Labelled>
        </>
      )}

      {!expanded && (
        <button
          className="btn"
          onClick={() => setExpanded(true)}
          style={{ fontSize: 13, color: "var(--blue-2)", background: "transparent", border: "1.5px solid var(--blue)", borderRadius: 14 }}
        >
          + Add more details
        </button>
      )}
      <button
        className="btn btn-ghost"
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1400); }}
        style={{ fontSize: 13, gap: 8 }}
      >
        <Icon name={saved ? "check" : "bookmark"} size={16} color={saved ? "var(--green)" : "var(--muted)"} />
        {saved ? "Saved" : "Save Notes"}
      </button>
    </div>
  );
}

export function LiveConsole(props: {
  stream: MediaStream | null;
  camDenied: boolean;
  hr: number;
  br: number;
  comp: number;
  band: Band;
  presageEnabled?: boolean;
  emotion?: string;
  stress?: number;
  pulseStable?: boolean;
  breathingStable?: boolean;
  breathingTrace?: TracePoint[];
  pulseTrace?: TracePoint[];
  presageTabHidden?: boolean;
  validationCode?: number;
  validationHint?: string;
  baselineHr: number;
  callT: number;
  scenarioName: string;
  scenarioIdx?: number;
  difficulty: number;
  course: number;
  streak: number;
  callOver: boolean;
  transcript: TranscriptLine[];
  liveNotice: string | null;
  details: IncidentDetails;
  setField: (k: keyof IncidentDetails, v: string) => void;
  onEndCall: () => void;
}) {
  const {
    stream, camDenied, hr, br, comp, band, presageEnabled, emotion: realEmotion,
    pulseStable, breathingStable, breathingTrace, pulseTrace, presageTabHidden,
    validationCode, validationHint,
    baselineHr, callT, scenarioIdx = 0, difficulty, course, streak,
    callOver, transcript, liveNotice, details, setField, onEndCall,
  } = props;

  const clock = useClock();
  const bc = BAND_COLOR[band];
  const hrDelta = hr - baselineHr;
  // Real Presage facial-expression label only — no invented stand-in. If Presage isn't
  // enabled or hasn't locked a reading yet, say so plainly instead of guessing.
  const emotion = presageEnabled && realEmotion ? realEmotion : "Unavailable";
  const emotionSub = presageEnabled && realEmotion ? "From facial expression" : "Presage not connected";
  const compMsg = band === "green" ? "Good — keep it steady" : band === "amber" ? "Holding — slow your breathing" : "Losing composure — reset";
  // React to a signal-quality problem (e.g. "Center face in view") the instant it's
  // reported, rather than waiting for the SDK's own `stable` flag to catch up — that
  // flag only updates when a fresh measurement arrives, which is exactly what's
  // missing while tracking is lost, so pulseStable/breathingStable alone can lag
  // behind the real cause and leave the number looking silently frozen.
  const signalDegraded = Boolean(presageEnabled && validationCode !== undefined && validationCode !== 0);

  const filled = (Object.keys(details) as (keyof IncidentDetails)[]).filter((k) => details[k] !== "").length;

  const transcriptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* top bar — logo + stat segments */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 18px", borderBottom: "1px solid var(--border)", background: "rgba(6,10,20,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <OwlMascot size={42} />
          <div className="wordmark" style={{ fontSize: 21 }}><span className="lo">dispatch</span><span className="hi">lingo</span></div>
        </div>
        <span className="bar-sep" />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icon name="flame" size={22} color="var(--orange)" />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16, color: "var(--orange)" }}>{streak}</div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 800 }}>Day Streak</div>
          </div>
        </div>
        <span className="bar-sep" />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <CompletionRing pct={Math.round((course / 5) * 100)} size={36} />
          <span className="text-muted" style={{ fontSize: 12, fontWeight: 800 }}>Course<br />Completion</span>
        </div>
        <span className="bar-sep" />
        <div>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em" }}>DIFFICULTY</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ width: 16, height: 6, borderRadius: 3, background: i < difficulty ? "var(--blue-2)" : "var(--surface-3)" }} />
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--blue-2)" }}>{DIFF_NAME[Math.max(0, Math.min(4, difficulty - 1))]}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="chip" style={{ padding: "6px 13px", fontSize: 13 }}>
          <Icon name="clock" size={16} color="var(--muted)" />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{clock}</span>
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "300px 1fr 340px", gap: 14, padding: "12px 14px", overflow: "hidden" }}>
        {/* left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", minHeight: 0 }}>
          {presageEnabled && presageTabHidden && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--amber)", color: "#1a1200", fontSize: 12, fontWeight: 700 }}>
              ⚠ This tab isn&rsquo;t focused — browsers throttle background tabs, which stalls
              vitals capture. Keep this tab visible during the call.
            </div>
          )}
          {presageEnabled && !presageTabHidden && validationCode !== undefined && validationCode !== 0 && validationHint && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--amber)", color: "#1a1200", fontSize: 12, fontWeight: 700 }}>
              ⚠ {validationHint} — pulse reading pauses until this clears (breathing tolerates it better).
            </div>
          )}
          <Panel title="YOUR WEBCAM" live={!camDenied}>
            <div style={{ position: "relative", height: 128, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-strong)", background: "#000" }}>
              <CameraFeed stream={stream} />
              <CornerBrackets />
              {camDenied && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--faint)", fontSize: 12 }}>NO CAMERA</div>
              )}
            </div>
          </Panel>

          <Panel title="VITALS" live={!camDenied} style={{ gap: 6 }}>
            <VitalCard
              icon="heart"
              iconColor="var(--red)"
              label="Heart Rate"
              right={
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                  {hr} <span className="text-muted" style={{ fontSize: 11 }}>BPM</span>
                </span>
              }
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                  {presageEnabled && (pulseStable === false || signalDegraded)
                    ? <span style={{ color: "var(--amber)" }}>{signalDegraded ? "Recalibrating…" : "Calibrating…"} (12s window)</span>
                    : <span style={{ color: hrDelta > 8 ? "var(--red)" : "var(--muted)" }}>{hrDelta >= 0 ? "+" : ""}{hrDelta} from baseline</span>}
                </span>
                {pulseTrace && pulseTrace.length >= 2 ? (
                  <TraceChart points={pulseTrace} color="var(--red)" width={86} height={20} />
                ) : (
                  <Sparkline color="var(--red)" seed={1} width={86} />
                )}
              </div>
            </VitalCard>

            <VitalCard
              icon="lungs"
              iconColor="var(--blue-2)"
              label="Breathing Rate"
              right={
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                  {br} <span className="text-muted" style={{ fontSize: 11 }}>/min</span>
                </span>
              }
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 2 }}>
                <span className="text-muted" style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                  {presageEnabled && (breathingStable === false || signalDegraded)
                    ? <span style={{ color: "var(--amber)" }}>{signalDegraded ? "Recalibrating…" : "Calibrating…"} (30s window)</span>
                    : br > 18 ? "Elevated" : "Normal"}
                </span>
                {breathingTrace && breathingTrace.length >= 2 ? (
                  <TraceChart points={breathingTrace} color="var(--blue-2)" width={86} height={20} />
                ) : (
                  <Sparkline color="var(--blue-2)" seed={4} width={86} />
                )}
              </div>
            </VitalCard>

            <VitalCard icon="bolt" iconColor="var(--amber)" label="Stress Level">
              <div style={{ marginTop: 5 }}><StressDots comp={comp} /></div>
            </VitalCard>

            <VitalCard
              icon="emotion"
              iconColor="var(--purple)"
              label="Current Emotion"
              right={<span style={{ fontWeight: 800, fontSize: 13, color: presageEnabled && realEmotion ? "var(--green)" : "var(--faint)" }}>{emotion}</span>}
            >
              <div className="text-muted" style={{ fontSize: 11 }}>{emotionSub}</div>
            </VitalCard>
          </Panel>

          <Panel
            title="COMPOSURE"
            right={<span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22, color: bc }}>{comp}%</span>}
          >
            <div style={{ position: "relative", height: 12, borderRadius: 999, background: "linear-gradient(90deg, var(--red), var(--amber) 45%, var(--green))" }}>
              <span style={{ position: "absolute", top: -3, left: `calc(${comp}% - 9px)`, width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "3px solid var(--bg)", boxShadow: "0 2px 6px rgba(0,0,0,.5)", transition: "left .6s" }} />
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="info" size={13} color="var(--faint)" />
              {compMsg}
            </div>
          </Panel>
        </div>

        {/* center */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, padding: "11px 18px", flex: "none" }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--green) 15%, transparent)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="phone" size={19} color="var(--green)" />
            </span>
            <div style={{ lineHeight: 1.1 }}>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>CALL TIME</div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 25, fontVariantNumeric: "tabular-nums" }}>{mmss(callT)}</div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "var(--muted)", whiteSpace: "nowrap" }}>LIVE CALL TRANSCRIPT</span>
              <div style={{ flex: 1 }} />
              <span className="chip" style={{ padding: "4px 10px", fontSize: 11, color: "var(--red)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", animation: "dlPulse 1.4s infinite" }} /> Caller
              </span>
            </div>

            {liveNotice && (
              <div className="text-muted" style={{ fontSize: 11, padding: "6px 18px 0" }}>{liveNotice}</div>
            )}

            <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              {transcript.length === 0 && (
                <div className="text-muted" style={{ margin: "auto", textAlign: "center", fontSize: 13 }}>Connecting the line… the caller will speak first.</div>
              )}
              {transcript.map((line, i) => {
                const you = line.who === "YOU";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: you ? "row-reverse" : "row",
                      alignItems: "flex-start",
                      gap: 10,
                      alignSelf: you ? "flex-end" : "flex-start",
                      maxWidth: "86%",
                    }}
                  >
                    <span className="text-faint" style={{ fontSize: 11, fontWeight: 700, marginTop: 12, fontVariantNumeric: "tabular-nums" }}>{mmss(line.t)}</span>
                    <div>
                      <div
                        style={{
                          padding: "9px 14px 10px",
                          borderRadius: 16,
                          borderBottomRightRadius: you ? 4 : 16,
                          borderBottomLeftRadius: you ? 16 : 4,
                          fontSize: 14,
                          lineHeight: 1.45,
                          fontWeight: 600,
                          color: you ? "#fff" : "var(--text)",
                          background: you ? "linear-gradient(180deg, var(--blue), var(--blue-deep))" : "var(--surface-3)",
                          border: you ? "1px solid rgba(150,200,255,0.35)" : "1px solid var(--border)",
                        }}
                      >
                        <div style={{ marginBottom: 3, fontSize: 11, fontWeight: 800, color: you ? "#cfe3ff" : "var(--red)" }}>
                          {you ? "You" : "Caller"}
                        </div>
                        {line.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ margin: "0 14px 12px", padding: "9px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
              {callOver ? (
                <button className="btn btn-primary" onClick={onEndCall} style={{ padding: "10px 22px" }}>View performance report</button>
              ) : (
                <>
                  <Eq n={5} height={13} />
                  Caller is speaking…
                  <Eq n={5} height={13} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "11px 14px", flex: "none", minHeight: 60 }}>
            <button className="btn btn-danger" onClick={onEndCall} style={{ padding: "11px 20px", gap: 8 }}>
              <Icon name="phone" size={16} color="#fff" style={{ transform: "rotate(135deg)" }} /> End Call
            </button>
          </div>

          <div className="card card-pad-sm" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "var(--muted)" }}>INCIDENT DETAILS</span>
              <span style={{ fontWeight: 800, color: "var(--blue-2)", fontSize: 13 }}>{filled} / 8</span>
            </div>
            <div style={{ overflowY: "auto", minHeight: 0, paddingRight: 6, marginRight: -6 }}>
              <IncidentForm details={details} setField={setField} />
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar — nav · call pager · help */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 18px", borderTop: "1px solid var(--border)", background: "rgba(8,12,24,0.85)" }}>
        {([
          ["Home", "home", true],
          ["Progress", "chart", false],
          ["Achievements", "trophy", false],
          ["Settings", "gear", false],
        ] as [string, IconName, boolean][]).map(([label, icon, on]) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "3px 13px",
              color: on ? "var(--blue-2)" : "var(--faint)",
              fontWeight: 800,
              fontSize: 10,
              fontFamily: "var(--font-heading)",
            }}
          >
            <Icon name={icon} size={19} />
            {label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
            Call {scenarioIdx + 1} of {TOTAL_CALLS}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {Array.from({ length: TOTAL_CALLS }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === scenarioIdx ? 20 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === scenarioIdx ? "var(--blue-2)" : i < scenarioIdx ? "rgba(28,176,246,0.45)" : "var(--surface-3)",
                  transition: "width .3s",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span className="chip" style={{ padding: "7px 14px", fontSize: 12, color: "var(--muted)" }}>
          <Icon name="help" size={16} color="var(--muted)" /> Need Help?
        </span>
      </div>
    </div>
  );
}
