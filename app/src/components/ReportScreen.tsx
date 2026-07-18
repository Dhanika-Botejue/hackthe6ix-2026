"use client";

import { Blueprint } from "./Blueprint";
import { bandColor, GREEN, RED, mmss } from "@/lib/composure";
import { buildChartGeometry, checklistRows } from "@/lib/report";
import type { Report } from "@/lib/types";

export function ReportScreen(props: {
  report: Report;
  baselineHr: number;
  scenarioName: string;
  goReady: () => void;
  goHistory: () => void;
}) {
  const { report, baselineHr, scenarioName, goReady, goHistory } = props;
  const geo = buildChartGeometry(report, baselineHr);
  const checklist = checklistRows(report.checks);

  const compCards = [
    { value: String(report.peak), label: "Peak HR (bpm)", color: "var(--color-text)" },
    { value: mmss(report.redSecs), label: "Time in red", color: RED },
    { value: report.recSecs + "s", label: "Recovery time", color: "var(--color-accent-700)" },
  ];

  return (
    <div>
      <div className="nav" style={{ borderBottom: "1px solid var(--color-divider)" }}>
        <span className="nav-brand" style={{ letterSpacing: ".14em" }}>CODEBLUE</span>
        <a href="#" onClick={(e) => { e.preventDefault(); goReady(); }}>Ready room</a>
        <a href="#" onClick={(e) => { e.preventDefault(); goHistory(); }}>History</a>
      </div>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "30px 28px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>After-action report</h2>
          <span className="text-muted" style={{ fontSize: 13 }}>{scenarioName} · duration {report.dur}</span>
        </div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 22 }}>
          Vitals against caller behavior. Markers show where the caller changed because you did.
        </div>

        <Blueprint style={{ padding: "18px 18px 8px", marginBottom: 26 }}>
          <div className="text-muted" style={{ display: "flex", gap: 18, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
            <span>HR — line</span><span>Composure band — shading</span><span>│ caller behavior change</span>
          </div>
          <svg viewBox="0 0 1000 240" style={{ width: "100%", height: 240, display: "block" }}>
            {geo.bands.map((b, i) => (
              <rect key={i} x={b.x} y={0} width={b.w} height={240} fill={bandColor(b.band as "red" | "amber" | "green")} opacity="0.13" />
            ))}
            <line x1="0" y1="60" x2="1000" y2="60" stroke="var(--color-divider)" strokeDasharray="3 4" />
            <line x1="0" y1="120" x2="1000" y2="120" stroke="var(--color-divider)" strokeDasharray="3 4" />
            <line x1="0" y1="180" x2="1000" y2="180" stroke="var(--color-divider)" strokeDasharray="3 4" />
            <text x="6" y="56" fontSize="10" fill="var(--color-neutral-600)">120</text>
            <text x="6" y="116" fontSize="10" fill="var(--color-neutral-600)">100</text>
            <text x="6" y="176" fontSize="10" fill="var(--color-neutral-600)">80</text>
            {geo.markers.map((m, i) => (
              <g key={i}>
                <line x1={m.x} y1="14" x2={m.x} y2="240" stroke="var(--color-neutral-800)" strokeWidth="1" strokeDasharray="2 3" />
                <text x={m.tx} y="10" fontSize="10" letterSpacing="1" fill="var(--color-neutral-800)" textAnchor={m.anchor}>{m.label}</text>
              </g>
            ))}
            <path d={geo.hrPath} fill="none" stroke="var(--color-accent-700)" strokeWidth="2" />
            <path d={geo.baselinePath} fill="none" stroke="var(--color-neutral-500)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
          <div className="text-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: ".08em", padding: "6px 2px 8px" }}>
            <span>0:00</span><span>{report.dur}</span>
          </div>
        </Blueprint>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginBottom: 30 }}>
          <Blueprint style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Call performance</h4>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26 }}>
                {report.perfScore}<span className="text-muted" style={{ fontSize: 14 }}> / 5</span>
              </span>
            </div>
            {checklist.map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 14 }}>
                <span style={{ width: 18, height: 18, display: "grid", placeItems: "center", border: `1px solid ${c.hit ? GREEN : RED}`, color: c.hit ? GREEN : RED, fontSize: 12, fontWeight: 700, flex: "none" }}>
                  {c.hit ? "✓" : "✕"}
                </span>
                <span style={{ flex: 1 }}>{c.label}</span>
                <span className="text-muted" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{c.time}</span>
              </div>
            ))}
          </Blueprint>
          <Blueprint style={{ padding: 18 }}>
            <h4 style={{ margin: "0 0 12px" }}>Composure</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {compCards.map((k) => (
                <div key={k.label} style={{ border: "1px solid var(--color-divider)", padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 30, lineHeight: 1.1, color: k.color }}>{k.value}</div>
                  <div className="text-muted" style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
              Recovery — how fast you pulled yourself back after the worst moment — is the metric that predicts who survives year one.
            </div>
          </Blueprint>
        </div>

        <div style={{ fontSize: 18, lineHeight: 1.55, maxWidth: 820, marginBottom: 34, borderLeft: "3px solid var(--color-accent)", paddingLeft: 16 }}>
          {report.feedback}
        </div>

        <details className="cb-tr blueprint" style={{ marginBottom: 30 }}>
          <summary>Full transcript</summary>
          <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {report.transcript.map((line, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, color: line.who === "YOU" ? "var(--color-accent-700)" : "var(--color-neutral-800)" }}>
                  {mmss(line.t)} {line.who}:
                </span>{" "}
                {line.text}
              </div>
            ))}
          </div>
        </details>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary" onClick={goReady} style={{ whiteSpace: "nowrap" }}>Run another scenario</button>
          <button className="btn btn-secondary" onClick={goHistory} style={{ whiteSpace: "nowrap" }}>Session history</button>
        </div>
      </div>
    </div>
  );
}
