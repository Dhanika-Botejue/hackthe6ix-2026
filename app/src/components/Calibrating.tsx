"use client";

import { CameraFeed } from "./CameraFeed";
import { OwlMascot } from "./OwlMascot";

/**
 * Pre-call baseline capture. Webcam + Presage have already been warming up in the
 * background since the Home screen mounted (see useSession's `go()`). The ring
 * animates over baselineSecs, but useSession's startBaseline() actually waits past
 * that for a real pulse-rate reading (its own ~12s rolling window) before locking
 * in the baseline — never falling back to a fake number while Presage is enabled,
 * only after a generous hard timeout with nothing at all.
 */
export function Calibrating({
  stream,
  camDenied,
  blT,
  blHr,
  baselineSecs,
  presageEnabled,
  signal,
}: {
  stream: MediaStream | null;
  camDenied: boolean;
  blT: number;
  blHr: number;
  baselineSecs: number;
  presageEnabled?: boolean;
  signal: number;
}) {
  const pct = baselineSecs > 0 ? Math.max(0, Math.min(1, blT / baselineSecs)) : 0;
  const r = 104;
  const c = 2 * Math.PI * r;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
      <OwlMascot size={90} float />
      <div className="wordmark" style={{ fontSize: 28 }}>
        <span className="lo">dispatch</span>
        <span className="hi">lingo</span>
      </div>

      <div style={{ position: "relative", width: 220, height: 220 }}>
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", overflow: "hidden", background: "#000" }}>
          <CameraFeed stream={stream} />
          {camDenied && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--faint)", fontSize: 12 }}>
              NO CAMERA
            </div>
          )}
        </div>
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="110" cy="110" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke="var(--blue-2)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20 }}>Calibrating your baseline…</div>
        <div className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
          {presageEnabled && blHr === 0 && blT === 0
            ? "Waiting for a clear heart-rate reading…"
            : `Sit still and breathe normally — ${blT}s`}
        </div>
        {presageEnabled && (
          <div className="text-muted" style={{ fontSize: 12, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", animation: "dlPulse 1.6s infinite" }} />
              Presage vitals
            </span>
            <span>signal {signal}%</span>
            <span>{blHr > 0 ? `${blHr} bpm` : "reading…"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
