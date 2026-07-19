"use client";

import { useState } from "react";
import { OwlMascot } from "./OwlMascot";
import { Icon, type IconName } from "./icons";

type NodeState = "active" | "open" | "locked";
interface Lesson {
  cat: IconName;
  name: string;
  idx: number | null; // scenario index to launch, or null when locked
  state: NodeState;
  done: boolean;
}

// idx === null lessons have no scenario built yet, so they stay locked
// regardless of progress. Which of the real lessons gets the "active" glow
// is computed from `course` in Home() below — it's the next one to complete,
// not a fixed lesson.
const LESSON_DEFS: { cat: IconName; name: string; idx: number | null }[] = [
  { cat: "burglary", name: "Robbery", idx: 0 },
  { cat: "fire", name: "House fire", idx: 1 },
  { cat: "medical", name: "Cardiac arrest", idx: 2 },
  { cat: "car", name: "Highway collision", idx: null },
  { cat: "lock", name: "Final certification", idx: null },
];

// zigzag: alternate left / right columns like a winding lesson trail
const XS = [104, 244, 104, 244, 174];
const STEP = 94;
const TOP = 48;
const NODE = 68;

export function CompletionRing({ pct: rawPct, size = 46 }: { pct: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, rawPct));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--blue-2)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s" }}
      />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.28} fontWeight={800} fill="var(--text)" fontFamily="Baloo 2, sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

/** Equal-height cell inside the top stat bar — every item renders the same size. */
function BarCell({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 18px",
        borderRadius: 16,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Blurred police-light flares on the page edges. */
function LightFlares() {
  const flare = (side: "left" | "right", color: string): React.CSSProperties => ({
    position: "fixed",
    [side]: -140,
    top: "34%",
    width: 360,
    height: 260,
    background: `radial-gradient(closest-side, ${color}, transparent)`,
    filter: "blur(36px)",
    pointerEvents: "none",
    zIndex: 0,
  });
  return (
    <>
      <div style={flare("left", "rgba(43,127,255,0.30)")} />
      <div style={flare("right", "rgba(255,60,70,0.26)")} />
    </>
  );
}

function LessonNode({ lesson, x, y, onClick }: { lesson: Lesson; x: number; y: number; onClick: () => void }) {
  const locked = lesson.state === "locked";
  const active = lesson.state === "active";
  return (
    <button
      onClick={onClick}
      disabled={locked}
      title={lesson.name}
      aria-label={lesson.name}
      style={{
        position: "absolute",
        left: x - NODE / 2,
        top: y - NODE / 2,
        width: NODE,
        height: NODE,
        borderRadius: "50%",
        border: active ? "2px solid rgba(150,200,255,0.85)" : "1px solid var(--border-strong)",
        background: active
          ? "radial-gradient(circle at 50% 28%, #47a0ff, #1b5fd0 75%)"
          : "radial-gradient(circle at 50% 28%, #1d2c4e, #0c1526 78%)",
        color: locked ? "var(--faint)" : "#fff",
        display: "grid",
        placeItems: "center",
        cursor: locked ? "not-allowed" : "pointer",
        boxShadow: active
          ? "0 0 26px var(--blue-glow), 0 6px 0 0 var(--blue-deep), inset 0 2px 5px rgba(255,255,255,0.35)"
          : "0 6px 0 0 rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -5px 8px rgba(0,0,0,0.35)",
        transition: "transform .12s ease",
      }}
    >
      <Icon name={lesson.cat} size={30} />
      {lesson.done && (
        <span
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--green)",
            border: "2px solid var(--bg)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="check" size={12} color="#06210a" />
        </span>
      )}
      {active && (
        <>
          <span
            style={{
              position: "absolute",
              inset: -7,
              borderRadius: "50%",
              border: "2px solid var(--blue-2)",
              animation: "dlRing 1.8s ease-out infinite",
            }}
          />
          {/* bright progress arc around the active node */}
          <svg width={NODE + 18} height={NODE + 18} viewBox={`0 0 ${NODE + 18} ${NODE + 18}`} style={{ position: "absolute", inset: -9, transform: "rotate(-90deg)" }}>
            <circle
              cx={(NODE + 18) / 2}
              cy={(NODE + 18) / 2}
              r={(NODE + 18) / 2 - 2}
              fill="none"
              stroke="var(--blue-2)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * (NODE + 14) * 0.36} ${Math.PI * (NODE + 14)}`}
            />
          </svg>
        </>
      )}
    </button>
  );
}

export function Home({
  course,
  streak,
  pickScenario,
  onLaunch,
  onRealCall,
  account,
}: {
  course: number;
  streak: number;
  pickScenario: (i: number) => void;
  onLaunch: () => void;
  /** Real Call mode: on-the-job live transcription + auto-filled incident form. */
  onRealCall?: () => void;
  account?: { label: string; href?: string; cta?: string } | null;
}) {
  const [nav, setNav] = useState("home");

  const launch = (idx: number | null) => {
    if (idx == null) return;
    pickScenario(idx);
    onLaunch();
  };

  // The highlighted "active" node is the next lesson to complete (index ===
  // course), not a fixed one — passing lesson N moves the glow to lesson N+1.
  // Lessons with idx === null have no scenario built yet, so they stay locked
  // no matter how far course has advanced.
  // Cardiac arrest has no ElevenLabs agent configured yet (see .env.local) —
  // keep it greyed out/unclickable until one exists, regardless of progress.
  const NO_AGENT_YET = new Set([2]);
  const LESSONS: Lesson[] = LESSON_DEFS.map((l, i) => ({
    ...l,
    done: l.idx !== null && !NO_AGENT_YET.has(i) && i < course,
    state: l.idx === null || NO_AGENT_YET.has(i) ? "locked" : i === course ? "active" : "open",
  }));

  // smooth dashed trail winding through the nodes
  const trail = LESSONS.map((_, i) => {
    const x = XS[i];
    const y = TOP + i * STEP;
    if (i === 0) return `M ${x} ${y}`;
    return `C ${XS[i - 1]} ${TOP + (i - 1) * STEP + 52}, ${x} ${y - 52}, ${x} ${y}`;
  }).join(" ");
  const pathHeight = TOP + (LESSONS.length - 1) * STEP + 56;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 16, position: "relative" }}>
      <LightFlares />

      {/* top stat bar — one contained card, equal-height cells */}
      <div style={{ padding: "16px 22px 0", position: "sticky", top: 0, zIndex: 5 }}>
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 10,
            backdropFilter: "blur(10px)",
            background: "rgba(9,14,28,0.82)",
          }}
        >
          <BarCell style={{ padding: 0, overflow: "hidden", gap: 0 }}>
            {([
              ["home", "Home", "home"],
              ["progress", "Progress", "chart"],
              ["achievements", "Achievements", "trophy"],
            ] as [string, string, IconName][]).map(([id, label, icon], i) => {
              const on = nav === id;
              return (
                <button
                  key={id}
                  onClick={() => setNav(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: "100%",
                    padding: "0 18px",
                    border: "none",
                    borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: on ? "var(--blue-2)" : "var(--faint)",
                    fontWeight: 800,
                    fontSize: 13,
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  <Icon name={icon} size={19} />
                  {label}
                </button>
              );
            })}
          </BarCell>
          <div style={{ flex: 1 }} />
          <BarCell>
            <Icon name="flame" size={26} color="var(--orange)" />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 19, color: "var(--orange)" }}>{streak}</div>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 800 }}>Day Streak</div>
            </div>
          </BarCell>
          <BarCell>
            <CompletionRing pct={Math.round((course / 5) * 100)} size={40} />
            <span style={{ fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 15 }}>Course Completion</span>
          </BarCell>
          {account && (
            <BarCell style={{ padding: 0 }}>
              <a
                href={account.href}
                style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 18px", fontWeight: 800, fontSize: 14 }}
              >
                {account.cta ?? account.label}
              </a>
            </BarCell>
          )}
        </div>
      </div>

      {/* main */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(320px, 1fr) minmax(340px, 1fr)",
          alignItems: "center",
          gap: 32,
          padding: "20px 40px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          position: "relative",
        }}
      >
        {/* hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
          <OwlMascot size={210} float />
          <div className="wordmark" style={{ fontSize: 48, marginTop: 4 }}>
            <span className="lo">dispatch</span>
            <span className="hi">lingo</span>
          </div>
          <div className="text-muted" style={{ maxWidth: 330, fontSize: 14 }}>
            Learn to run an emergency line one call at a time. Stay calm, get the facts, save lives.
          </div>
          <button
            className="btn btn-primary"
            onClick={onLaunch}
            style={{ marginTop: 16, fontSize: 20, padding: "16px 42px", gap: 14, borderRadius: 18, border: "1px solid rgba(150,200,255,0.5)" }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.22)",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                paddingLeft: 2,
              }}
            >
              ▶
            </span>
            Start
          </button>
          {onRealCall && (
            <button
              className="btn"
              onClick={onRealCall}
              style={{
                marginTop: 10,
                fontSize: 15,
                padding: "12px 30px",
                gap: 10,
                borderRadius: 16,
                background: "transparent",
                color: "var(--red)",
                border: "1.5px solid var(--red)",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--red)", animation: "dlPulse 1.4s infinite" }} />
              Real Call Mode
            </button>
          )}
          {onRealCall && (
            <div className="text-muted" style={{ fontSize: 12, maxWidth: 300 }}>
              On duty? Put the phone next to the laptop — the call is transcribed live and the incident form fills itself.
            </div>
          )}
        </div>

        {/* lesson path */}
        <div style={{ position: "relative", height: pathHeight, width: "100%", maxWidth: 340, margin: "0 auto" }}>
          <svg width="340" height={pathHeight} viewBox={`0 0 340 ${pathHeight}`} style={{ position: "absolute", inset: 0 }}>
            <path
              d={trail}
              fill="none"
              stroke="var(--blue)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="1 12"
              opacity="0.6"
              style={{ animation: "dlDash 3s linear infinite" }}
            />
          </svg>
          {LESSONS.map((l, i) => (
            <LessonNode key={l.name} lesson={l} x={XS[i]} y={TOP + i * STEP} onClick={() => launch(l.idx)} />
          ))}
        </div>
      </div>

    </div>
  );
}
