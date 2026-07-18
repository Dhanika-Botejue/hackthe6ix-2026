"use client";

import { Blueprint } from "./Blueprint";
import type { SessionRow } from "@/lib/types";

export function HistoryScreen(props: { sessions: SessionRow[]; goReady: () => void }) {
  const { sessions, goReady } = props;
  const rows = [...sessions].reverse();

  return (
    <div>
      <div className="nav" style={{ borderBottom: "1px solid var(--color-divider)" }}>
        <span className="nav-brand" style={{ letterSpacing: ".14em" }}>CODEBLUE</span>
        <a href="#" onClick={(e) => { e.preventDefault(); goReady(); }}>Ready room</a>
        <a href="#" aria-current="page">History</a>
      </div>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "30px 28px 60px" }}>
        <h2 style={{ marginBottom: 4 }}>Session history</h2>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 22 }}>
          Recovery time trending down is the number that matters.
        </div>
        <Blueprint style={{ padding: "6px 16px 10px" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Scenario</th><th>Performance</th><th>Peak HR</th><th>Time in red</th><th>Recovery</th><th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{s.date}</td>
                  <td>{s.scenario}</td>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>{s.perf}</td>
                  <td>{s.peak} bpm</td>
                  <td>{s.red}</td>
                  <td style={{ color: s.latest ? "var(--color-accent-700)" : "inherit" }}>{s.rec}</td>
                  <td className="text-muted">{s.dur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Blueprint>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={goReady}>New session</button>
        </div>
      </div>
    </div>
  );
}
