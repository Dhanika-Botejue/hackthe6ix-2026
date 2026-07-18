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
}

const LESSONS: Lesson[] = [
  { cat: "burglary", name: "Robbery", idx: 0, state: "active" },
  { cat: "fire", name: "House fire", idx: 1, state: "open" },
  { cat: "burglary", name: "Robbery", idx: 2, state: "open" },
  { cat: "car", name: "Highway collision", idx: null, state: "locked" },
  { cat: "burglary", name: "Break-in in progress", idx: null, state: "locked" },
  { cat: "shield", name: "Final certification", idx: null, state: "locked" },
];

const XS = [170, 250, 168, 88, 168, 250];
const STEP = 104;
const TOP = 58;

export function CompletionRing({ pct, size = 46 }: { pct: number; size?: number }) {
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

export function Home({
  course,
  streak,
  pickScenario,
  onLaunch,
  account,
}: {
  course: number;
  streak: number;
  pickScenario: (i: number) => void;
  onLaunch: () => void;
  account?: { label: string; href?: string; cta?: string } | null;
}) {
  const [nav, setNav] = useState("home");

  const launch = (idx: number | null) => {
    if (idx == null) return;
    pickScenario(idx);
    onLaunch();
  };

  const polyline = LESSONS.map((_, i) => `${XS[i]},${TOP + i * STEP}`).join(" ");
  const pathHeight = TOP + (LESSONS.length - 1) * STEP + 80;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      {/* top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 26px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 5,
          backdropFilter: "blur(8px)",
          background: "rgba(6,10,20,0.6)",
        }}
      >
        <button className="chip" style={{ cursor: "pointer" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>🇨🇦</span> Canada
          <Icon name="chevron" size={14} color="var(--muted)" style={{ transform: "rotate(90deg)" }} />
        </button>
        <div style={{ flex: 1 }} />
        <div className="chip">
          <Icon name="flame" size={18} color="var(--orange)" fill />
          <span style={{ color: "var(--orange)" }}>{streak}</span>
          <span className="text-muted" style={{ fontWeight: 700 }}>day streak</span>
        </div>
        <div className="chip" style={{ paddingLeft: 8 }}>
          <CompletionRing pct={Math.round((course / 5) * 100)} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Course completion</div>
            <div className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>{course} / 5 lessons</div>
          </div>
        </div>
        {account && (
          <a href={account.href} className="chip" style={{ fontSize: 13 }}>
            {account.cta ?? account.label}
          </a>
        )}
      </div>

      {/* main */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(320px, 1fr) minmax(340px, 1fr)",
          alignItems: "center",
          gap: 32,
          padding: "24px 40px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
          <OwlMascot size={200} float />
          <div className="wordmark" style={{ fontSize: 46, marginTop: 4 }}>
            <span className="lo">dispatch</span>
            <span className="hi">lingo</span>
          </div>
          <div className="text-muted" style={{ maxWidth: 320, fontSize: 14 }}>
            Learn to run an emergency line — one call at a time. Stay calm, get the facts, save lives.
          </div>
          <button
            className="btn btn-primary"
            onClick={onLaunch}
            style={{ marginTop: 14, fontSize: 20, padding: "16px 46px", gap: 12 }}
          >
            <span style={{ fontSize: 14 }}>▶</span> Start
          </button>
        </div>

        {/* lesson path */}
        <div style={{ position: "relative", height: pathHeight, width: "100%", maxWidth: 340, margin: "0 auto" }}>
          <svg width="340" height={pathHeight} viewBox={`0 0 340 ${pathHeight}`} style={{ position: "absolute", inset: 0 }}>
            <polyline
              points={polyline}
              fill="none"
              stroke="var(--blue)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 12"
              opacity="0.55"
              style={{ animation: "dlDash 3s linear infinite" }}
            />
          </svg>
          {LESSONS.map((l, i) => {
            const locked = l.state === "locked";
            const active = l.state === "active";
            return (
              <button
                key={l.name}
                onClick={() => launch(l.idx)}
                disabled={locked}
                title={l.name}
                style={{
                  position: "absolute",
                  left: XS[i] - 34,
                  top: TOP + i * STEP - 34,
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  border: active ? "3px solid var(--blue-2)" : "1px solid var(--border-strong)",
                  background: locked ? "var(--surface-2)" : "linear-gradient(180deg, var(--surface-3), var(--surface))",
                  color: locked ? "var(--faint)" : active ? "var(--blue-2)" : "var(--text)",
                  display: "grid",
                  placeItems: "center",
                  cursor: locked ? "not-allowed" : "pointer",
                  boxShadow: active ? "0 0 22px var(--blue-glow), 0 6px 0 0 var(--blue-deep)" : "0 4px 0 0 rgba(0,0,0,0.4)",
                }}
              >
                <Icon name={locked ? "lock" : l.cat} size={30} fill={!locked && (l.cat === "shield" || l.cat === "fire")} />
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      inset: -6,
                      borderRadius: "50%",
                      border: "2px solid var(--blue-2)",
                      animation: "dlRing 1.8s ease-out infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    position: "absolute",
                    top: 72,
                    fontSize: 11,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    color: locked ? "var(--faint)" : "var(--muted)",
                  }}
                >
                  {l.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* bottom nav */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "8px 12px",
          borderTop: "1px solid var(--border)",
          background: "rgba(8,12,24,0.85)",
          backdropFilter: "blur(10px)",
          zIndex: 6,
        }}
      >
        {([
          ["home", "Home", "home"],
          ["progress", "Progress", "chart"],
          ["achievements", "Achievements", "trophy"],
          ["settings", "Settings", "gear"],
        ] as [string, string, IconName][]).map(([id, label, icon]) => {
          const on = nav === id;
          return (
            <button
              key={id}
              onClick={() => setNav(id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "8px 22px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: on ? "var(--blue-2)" : "var(--faint)",
                fontWeight: 800,
                fontSize: 11,
                fontFamily: "var(--font-heading)",
              }}
            >
              <Icon name={icon} size={22} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
