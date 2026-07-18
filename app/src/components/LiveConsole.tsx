"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraFeed } from "./CameraFeed";
import { OwlMascot } from "./OwlMascot";
import { CompletionRing } from "./Home";
import { Icon } from "./icons";
import { NATURE_OPTIONS, RELATIONSHIP_OPTIONS } from "@/lib/incident";
import { mmss } from "@/lib/composure";
import type { Band, IncidentDetails, TranscriptLine } from "@/lib/types";

const BAND_COLOR: Record<Band, string> = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)" };

function useClock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setNow(fmt());
    const iv = setInterval(() => setNow(fmt()), 15000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

function Sparkline({ color, seed }: { color: string; seed: number }) {
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
    <svg width="108" height="24" viewBox="0 0 108 24" style={{ overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function VitalRow({
  icon,
  iconColor,
  label,
  value,
  unit,
  sub,
  spark,
  seed,
}: {
  icon: "heart" | "lungs";
  iconColor: string;
  label: string;
  value: string;
  unit?: string;
  sub?: React.ReactNode;
  spark?: string;
  seed: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Icon name={icon} size={22} color={iconColor} fill={icon === "heart"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{label}</span>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
            {value} {unit && <span className="text-muted" style={{ fontSize: 11 }}>{unit}</span>}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <span className="text-muted" style={{ fontSize: 11 }}>{sub}</span>
          {spark && <Sparkline color={spark} seed={seed} />}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, live, children, style }: { title: string; live?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "var(--muted)" }}>{title}</span>
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

/* ── Incident Details form ── */
function Labelled({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">{icon}{label}</div>
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
  const dot = (c: string) => <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Labelled icon={dot("var(--blue-2)")} label="Call back number">
        <input className="input" inputMode="tel" placeholder="Enter number…" value={details.callback} onChange={(e) => setField("callback", e.target.value)} />
      </Labelled>
      <Labelled icon={dot("var(--blue-2)")} label="Location">
        <input className="input" placeholder="Enter location…" value={details.location} onChange={(e) => setField("location", e.target.value)} />
      </Labelled>
      <Labelled icon={dot("var(--amber)")} label="Nature of emergency">
        <select className="select" value={details.nature} onChange={(e) => setField("nature", e.target.value)}>
          <option value="">Select category…</option>
          {NATURE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Labelled>
      <Labelled icon={dot("var(--green)")} label="Is the caller safe right now?">
        <div className="seg">
          {safeOpts.map((o) => (
            <button key={o.v} className={`seg-btn ${details.safe === o.v ? "on " + o.cls : ""}`} onClick={() => setField("safe", details.safe === o.v ? "" : o.v)}>
              {o.label}
            </button>
          ))}
        </div>
      </Labelled>
      <Labelled icon={dot("var(--blue-2)")} label="Number of people involved / injured">
        <input className="input" inputMode="numeric" placeholder="Enter number…" value={details.count} onChange={(e) => setField("count", e.target.value)} />
      </Labelled>
      <Labelled icon={dot("var(--blue-2)")} label="Caller relationship to victim/patient">
        <select className="select" value={details.relationship} onChange={(e) => setField("relationship", e.target.value)}>
          <option value="">Select relationship…</option>
          {RELATIONSHIP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Labelled>
      <Labelled icon={dot("var(--purple)")} label="Suspect description (if applicable)">
        <input className="input" placeholder="Clothing, direction, vehicle…" value={details.suspect} onChange={(e) => setField("suspect", e.target.value)} />
      </Labelled>

      {expanded && (
        <>
          <Labelled icon={dot("var(--red)")} label="Scene safety hazards">
            <input className="input" placeholder="Fire, gas, power lines, dog…" value={details.hazards} onChange={(e) => setField("hazards", e.target.value)} />
          </Labelled>
          <Labelled icon={dot("var(--blue-2)")} label="Special considerations">
            <input className="input" placeholder="Pregnant, elderly, child, disability…" value={details.special} onChange={(e) => setField("special", e.target.value)} />
          </Labelled>
        </>
      )}

      {!expanded && (
        <button className="btn btn-ghost" onClick={() => setExpanded(true)} style={{ fontSize: 13, color: "var(--blue-2)" }}>
          + Add more details
        </button>
      )}
      <button
        className="btn btn-ghost"
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1400); }}
        style={{ fontSize: 13, gap: 8 }}
      >
        <Icon name={saved ? "check" : "chart"} size={16} color={saved ? "var(--green)" : "var(--muted)"} />
        {saved ? "Saved" : "Save notes"}
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
  baselineHr: number;
  callT: number;
  scenarioName: string;
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
    stream, camDenied, hr, br, comp, band, baselineHr, callT, difficulty, course, streak,
    callOver, transcript, liveNotice, details, setField, onEndCall,
  } = props;

  const clock = useClock();
  const bc = BAND_COLOR[band];
  const hrDelta = hr - baselineHr;
  const emotion = comp >= 72 ? "Calm" : comp >= 58 ? "Focused" : comp >= 45 ? "Tense" : "Anxious";
  const emotionSub = comp >= 72 ? "In control" : comp >= 58 ? "Slight tension" : comp >= 45 ? "Under pressure" : "Rattled";
  const compMsg = band === "green" ? "Good — keep it steady" : band === "amber" ? "Holding — slow your breathing" : "Losing composure — reset";

  const filled = (Object.keys(details) as (keyof IncidentDetails)[]).filter((k) => details[k] !== "").length;

  const transcriptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
        <OwlMascot size={38} />
        <div className="wordmark" style={{ fontSize: 22 }}><span className="lo">dispatch</span><span className="hi">lingo</span></div>
        <div className="chip" style={{ padding: "6px 12px", fontSize: 13 }}><span style={{ fontSize: 15 }}>🇨🇦</span> Canada</div>
        <div className="chip" style={{ padding: "6px 12px", fontSize: 13 }}>
          <Icon name="flame" size={16} color="var(--orange)" fill /><span style={{ color: "var(--orange)" }}>{streak}</span>
          <span className="text-muted" style={{ fontWeight: 700 }}>day streak</span>
        </div>
        <div className="chip" style={{ padding: "5px 10px 5px 6px", fontSize: 13 }}>
          <CompletionRing pct={course} size={34} />
          <span className="text-muted" style={{ fontWeight: 700 }}>completion</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em" }}>DIFFICULTY</div>
          <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ width: 16, height: 6, borderRadius: 3, background: i < difficulty ? "var(--blue-2)" : "var(--surface-3)" }} />
            ))}
          </div>
        </div>
        <div className="chip" style={{ padding: "6px 12px", fontSize: 13 }}><Icon name="clock" size={16} color="var(--muted)" />{clock}</div>
        <button className="btn btn-danger" onClick={onEndCall} style={{ padding: "10px 18px", gap: 8 }}>
          <Icon name="phone" size={16} color="#fff" fill style={{ transform: "rotate(135deg)" }} /> End Call
        </button>
      </div>

      {/* body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr 340px", gap: 16, padding: 16, overflow: "hidden" }}>
        {/* left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <Panel title="YOUR WEBCAM" live={!camDenied}>
            <div style={{ position: "relative", height: 150, borderRadius: 12, overflow: "hidden", border: "2px solid var(--green)", background: "#000" }}>
              <CameraFeed stream={stream} />
              {camDenied && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--faint)", fontSize: 12 }}>NO CAMERA</div>
              )}
            </div>
          </Panel>

          <Panel title="VITALS" live={!camDenied} style={{ gap: 16 }}>
            <VitalRow icon="heart" iconColor="var(--red)" label="Heart Rate" value={String(hr)} unit="BPM" seed={1} spark="var(--red)"
              sub={<span style={{ color: hrDelta > 8 ? "var(--red)" : "var(--muted)" }}>{hrDelta >= 0 ? "+" : ""}{hrDelta} from baseline</span>} />
            <VitalRow icon="lungs" iconColor="var(--blue-2)" label="Breathing Rate" value={String(br)} unit="/min" seed={4} spark="var(--blue-2)"
              sub={br > 18 ? "Elevated" : "Normal"} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="emotion" size={22} color="var(--amber)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 5 }}>Stress Level</div>
                <StressDots comp={comp} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="emotion" size={22} color="var(--purple)" />
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Current Emotion</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{emotionSub}</div>
                </div>
                <span style={{ fontWeight: 800, color: "var(--green)" }}>{emotion}</span>
              </div>
            </div>
          </Panel>

          <Panel title="COMPOSURE">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span className="text-muted" style={{ fontSize: 11 }}>{compMsg}</span>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20, color: bc }}>{comp}%</span>
            </div>
            <div style={{ position: "relative", height: 12, borderRadius: 999, background: "linear-gradient(90deg, var(--red), var(--amber) 45%, var(--green))" }}>
              <span style={{ position: "absolute", top: -3, left: `calc(${comp}% - 9px)`, width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "3px solid var(--bg)", boxShadow: "0 2px 6px rgba(0,0,0,.5)", transition: "left .6s" }} />
            </div>
          </Panel>
        </div>

        {/* center */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <Icon name="phone" size={18} color="var(--green)" fill />
            <span className="text-muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>CALL TIME</span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 26, fontVariantNumeric: "tabular-nums" }}>{mmss(callT)}</span>
          </div>

          <div style={{ padding: "10px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "var(--muted)" }}>LIVE CALL TRANSCRIPT</span>
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
                <div key={i} style={{ maxWidth: "82%", alignSelf: you ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: you ? "flex-end" : "flex-start", marginBottom: 4, fontSize: 11, fontWeight: 800, color: you ? "var(--blue-2)" : "var(--muted)" }}>
                    {!you && <Icon name="emotion" size={13} color="var(--muted)" />} {you ? "You" : "Caller"} <span className="text-faint" style={{ fontWeight: 700 }}>{mmss(line.t)}</span>
                  </div>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: 16,
                    borderBottomRightRadius: you ? 4 : 16,
                    borderBottomLeftRadius: you ? 16 : 4,
                    fontSize: 14,
                    lineHeight: 1.45,
                    fontWeight: 600,
                    color: you ? "#fff" : "var(--text)",
                    background: you ? "var(--blue)" : "var(--surface-3)",
                  }}>
                    {line.text}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
            {callOver ? (
              <button className="btn btn-primary" onClick={onEndCall} style={{ padding: "10px 22px" }}>View performance report</button>
            ) : (
              <>
                <span style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 14 }}>
                  {[6, 11, 8, 13, 7].map((h, i) => (
                    <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: "var(--blue-2)", animation: `dlPulse ${0.8 + i * 0.12}s infinite` }} />
                  ))}
                </span>
                Caller is speaking…
              </>
            )}
          </div>
        </div>

        {/* right */}
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "var(--muted)" }}>INCIDENT DETAILS</span>
            <span style={{ fontWeight: 800, color: "var(--blue-2)", fontSize: 13 }}>{filled} / 9</span>
          </div>
          <div style={{ overflowY: "auto", paddingRight: 6, marginRight: -6 }}>
            <IncidentForm details={details} setField={setField} />
          </div>
        </div>
      </div>
    </div>
  );
}
