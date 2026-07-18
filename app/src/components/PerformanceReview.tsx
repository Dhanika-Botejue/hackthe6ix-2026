"use client";

import { useState } from "react";
import { OwlMascot } from "./OwlMascot";
import { Icon, IconBadge, type IconName } from "./icons";
import { CompletionRing } from "./Home";
import { buildComposureChart } from "@/lib/report";
import { mmss } from "@/lib/composure";
import { useClock } from "@/hooks/useClock";
import type { Report } from "@/lib/types";

const STEPS = ["Overview", "Composure", "Responses", "Incident Details", "Final Grade"];
const STEP_ICONS: IconName[] = ["chart", "heart", "mic", "pin", "trophy"];

function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 26 }}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const on = i === step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 96 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center",
                fontWeight: 800, fontSize: 14, position: "relative",
                background: on
                  ? "radial-gradient(circle at 50% 28%, #47a0ff, #1b5fd0 75%)"
                  : done
                    ? "radial-gradient(circle at 50% 28%, #6cd41f, #46a302 75%)"
                    : "radial-gradient(circle at 50% 28%, #1d2c4e, #0c1526 78%)",
                border: on ? "2px solid rgba(150,200,255,0.85)" : "1px solid var(--border-strong)",
                color: on || done ? "#fff" : "var(--faint)",
                boxShadow: on
                  ? "0 0 18px var(--blue-glow), inset 0 2px 4px rgba(255,255,255,0.3)"
                  : "inset 0 2px 3px rgba(255,255,255,0.12), inset 0 -4px 6px rgba(0,0,0,0.35)",
              }}>
                {done ? <Icon name="check" size={16} color="#fff" /> : <Icon name={STEP_ICONS[i]} size={17} color={on ? "#fff" : "var(--faint)"} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: on ? "var(--text)" : "var(--faint)", textAlign: "center" }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 28, marginBottom: 20, borderTop: `2px dashed ${done ? "var(--green)" : "var(--surface-3)"}` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="text-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}>SCORE</div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 40, color: "var(--blue-2)", lineHeight: 1 }}>
        {score}<span className="text-muted" style={{ fontSize: 20 }}> / 10</span>
      </div>
    </div>
  );
}

/** Section heading — icon badge + title + score card, shared across the review steps. */
function StepHeading({ icon, color, title, sub, score }: { icon: IconName; color: string; title: string; sub: string; score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <IconBadge name={icon} color={color} size={44} icon={22} />
        <div>
          <h2 style={{ fontSize: 26 }}>{title}</h2>
          <p className="text-muted" style={{ maxWidth: 420, fontSize: 14, margin: "4px 0 0" }}>{sub}</p>
        </div>
      </div>
      <div className="card card-pad"><ScoreBadge score={score} /></div>
    </div>
  );
}

function ComposureChart({ report }: { report: Report }) {
  const g = buildComposureChart(report.series, 620, 200);
  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} style={{ width: "100%", height: 200, display: "block" }}>
      <defs>
        <linearGradient id="compFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(88,204,2,0.35)" />
          <stop offset="1" stopColor="rgba(88,204,2,0)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={g.w} y1={g.h * f} y2={g.h * f} stroke="var(--border)" strokeWidth="1" />
      ))}
      <line x1="0" x2={g.w} y1={g.midY} y2={g.midY} stroke="var(--red)" strokeWidth="1.5" strokeDasharray="6 5" />
      <path d={g.area} fill="url(#compFill)" />
      <path d={g.path} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={g.low.x} cy={g.low.y} r="6" fill="var(--amber)" stroke="var(--bg)" strokeWidth="2" />
      <text x={g.low.x} y={g.low.y + 22} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--amber)">{mmss(g.low.t)}</text>
    </svg>
  );
}

function Row({ icon, color, children }: { icon?: IconName; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      {icon && <IconBadge name={icon} color={color ?? "var(--blue-2)"} size={28} icon={15} />}
      {children}
    </div>
  );
}

export function PerformanceReview({
  report,
  scenarioName,
  goHome,
  course = 0,
  streak = 1,
}: {
  report: Report;
  scenarioName: string;
  goHome: () => void;
  course?: number;
  streak?: number;
}) {
  const [step, setStep] = useState(0);
  const clock = useClock();
  const { composure, responses, incident, total, passed } = report;

  const avgHr = report.series.length ? Math.round(report.series.reduce((a, p) => a + p.hr, 0) / report.series.length) : 0;
  const avgBr = report.series.length ? Math.round(report.series.reduce((a, p) => a + p.br, 0) / report.series.length) : 0;
  const stressLabel = composure.avg >= 72 ? "Low" : composure.avg >= 55 ? "Moderate" : "Elevated";
  const emotion = composure.avg >= 58 ? "Focused" : composure.avg >= 45 ? "Tense" : "Anxious";

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* top bar — same chrome as the live console */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 18px", borderBottom: "1px solid var(--border)", background: "rgba(6,10,20,0.7)", position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(8px)" }}>
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
        <div style={{ flex: 1 }} />
        <div className="chip" style={{ padding: "6px 13px", fontSize: 13 }}>
          <Icon name="clock" size={16} color="var(--muted)" />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{clock}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 20px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <Stepper step={step} />

        <div
          key={step}
          className="anim-fadeup"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: step === 0 || step === 4 ? "center" : "flex-start",
          }}
        >
          {step === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 30, flexWrap: "wrap", justifyContent: "center", textAlign: "center" }}>
              <OwlMascot size={180} float />
              <div style={{ maxWidth: 380, textAlign: "left" }}>
                <h1 style={{ fontSize: 40 }}>Performance Analysis</h1>
                <p className="text-muted" style={{ marginTop: 8 }}>Great work! Let&apos;s review how you did on <b style={{ color: "var(--text)" }}>{scenarioName}</b>.</p>
                <div className="card card-pad" style={{ marginTop: 18, flexDirection: "row", alignItems: "center", gap: 14, display: "flex" }}>
                  <IconBadge name="chart" color="var(--blue-2)" size={44} icon={22} />
                  <div>
                    <div style={{ fontWeight: 800 }}>You&apos;ve completed the call.</div>
                    <div className="text-muted" style={{ fontSize: 13 }}>We&apos;ll break down your performance in 3 parts.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <StepHeading
                icon="heart"
                color="var(--red)"
                title="Composure (Vitals)"
                sub="How well you stayed calm under pressure, measured from your live vitals."
                score={composure.score}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div className="card card-pad" style={{ textAlign: "center" }}>
                  <div className="text-muted" style={{ fontSize: 12, fontWeight: 800 }}>Average Composure</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 38, color: "var(--green)" }}>{composure.avg}%</div>
                </div>
                <div className="card card-pad" style={{ textAlign: "center" }}>
                  <div className="text-muted" style={{ fontSize: 12, fontWeight: 800 }}>Lowest Composure</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 38, color: composure.dippedBelow50 ? "var(--red)" : "var(--amber)" }}>{composure.low}%</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: composure.dippedBelow50 ? "var(--red)" : "var(--muted)" }}>
                    {composure.dippedBelow50 ? "Dropped below 50% at some point" : "Did not drop below 50%"}
                  </div>
                </div>
              </div>
              <div className="card card-pad" style={{ textAlign: "center" }}>
                <div className="text-muted" style={{ fontSize: 12, fontWeight: 800 }}>Lowest Composure</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 38, color: composure.dippedBelow50 ? "var(--red)" : "var(--amber)" }}>{composure.low}%</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: composure.dippedBelow50 ? "var(--red)" : "var(--muted)" }}>
                  {composure.dippedBelow50 ? "Dropped below 50% at some point" : "Did not drop below 50%"}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <StepHeading
                icon="mic"
                color="var(--blue-2)"
                title="Responses"
                sub="Your communication and decision-making during the call."
                score={responses.score}
              />
              {responses.loading && (
                <div className="text-muted" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 13 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid var(--surface-3)", borderTopColor: "var(--blue-2)", borderRadius: "50%", animation: "dlSpin 0.8s linear infinite" }} />
                  Grading your responses with Gemini…
                </div>
              )}
              <div className="card card-pad" style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--green)", fontWeight: 800, marginBottom: 10 }}>
                  <IconBadge name="check" color="var(--green)" size={30} icon={16} /> What You Did Well
                </div>
                {report.responses.good.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 14 }}>
                    <Icon name="check" size={16} color="var(--green)" style={{ flex: "none", marginTop: 3 }} /> {g}
                  </div>
                ))}
              </div>
              <div className="card card-pad">
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--amber)", fontWeight: 800, marginBottom: 10 }}>
                  <IconBadge name="warning" color="var(--amber)" size={30} icon={16} /> What To Improve
                </div>
                {report.responses.improve.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 14 }}>
                    <Icon name="warning" size={16} color="var(--amber)" style={{ flex: "none", marginTop: 3 }} /> {g}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepHeading
                icon="pin"
                color="var(--amber)"
                title="Incident Details Accuracy"
                sub="How accurate the information you collected was."
                score={incident.score}
              />
              <div className="card card-pad">
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 40px", gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "var(--muted)", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                  <span>FIELD</span><span>YOUR ANSWER</span><span>CORRECT ANSWER</span><span style={{ textAlign: "right" }}>✓</span>
                </div>
                {incident.rows.map((r) => (
                  <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 40px", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{r.label}</span>
                    <span style={{ color: r.verdict === "wrong" ? "var(--red)" : "var(--text)", fontWeight: 700 }}>{r.your}</span>
                    <span className="text-muted" style={{ fontWeight: 700 }}>{r.correct}</span>
                    <span style={{ textAlign: "right" }}>
                      {r.verdict === "correct" && <Icon name="check" size={18} color="var(--green)" />}
                      {r.verdict === "wrong" && <Icon name="x" size={18} color="var(--red)" />}
                      {r.verdict === "na" && <span className="text-faint">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", alignItems: "center", gap: 34, flexWrap: "wrap", justifyContent: "center", position: "relative" }}>
              {passed && Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="anim-fadeup" style={{
                  position: "absolute", top: -10, left: `${(i * 7) % 100}%`,
                  width: 8, height: 8, borderRadius: 2,
                  background: ["var(--blue)", "var(--green)", "var(--amber)", "var(--red)", "var(--purple)"][i % 5],
                  animationDelay: `${(i % 5) * 0.12}s`,
                }} />
              ))}
              <OwlMascot size={190} wink={passed} float />
              <div style={{ textAlign: "center" }}>
                <div className="text-muted" style={{ fontWeight: 800 }}>Final Grade</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 68, lineHeight: 1 }}>
                  {total}<span className="text-muted" style={{ fontSize: 30 }}> / 30</span>
                </div>
                <div className="text-muted" style={{ fontWeight: 800, marginBottom: 12 }}>{Math.round((total / 30) * 100)}%</div>
                <div className="chip" style={{
                  fontSize: 16, padding: "10px 22px",
                  color: passed ? "var(--green)" : "var(--red)",
                  border: `2px solid ${passed ? "var(--green)" : "var(--red)"}`,
                }}>
                  {passed ? <Icon name="check" size={18} color="var(--green)" /> : <Icon name="x" size={18} color="var(--red)" />}
                  {passed ? "PASSED" : "KEEP TRAINING"}
                </div>
                <p className="text-muted" style={{ marginTop: 12, maxWidth: 300, fontSize: 13 }}>
                  {passed ? "Great job! You passed this training call." : "You need 24 / 30 to pass. Review the feedback and run it again."}
                </p>
              </div>
              <div className="card card-pad" style={{ minWidth: 280 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Score Breakdown</div>
                <Row icon="heart" color="var(--red)"><span style={{ flex: 1 }}>Composure (Vitals)</span><b>{composure.score} / 10</b></Row>
                <Row icon="mic" color="var(--blue-2)"><span style={{ flex: 1 }}>Responses</span><b>{responses.score} / 10</b></Row>
                <Row icon="pin" color="var(--amber)"><span style={{ flex: 1 }}>Incident Accuracy</span><b>{incident.score} / 10</b></Row>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 800, color: "var(--blue-2)" }}>
                  <span>Total Score</span><span>{total} / 30</span>
                </div>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <CompletionRing pct={Math.round((report.courseTo / 5) * 100)} size={54} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>Course Completion</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{report.courseFrom} / 5 → <b style={{ color: "var(--green)" }}>{report.courseTo} / 5</b> lessons</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer nav — previous · step pager · next */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 26 }}>
          <button className="btn btn-ghost" onClick={step === 0 ? goHome : back} style={{ gap: 8 }}>
            <Icon name="chevron" size={15} style={{ transform: "rotate(180deg)" }} />
            {step === 0 ? "Exit Review" : "Previous"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-heading)" }}>Step {step + 1} of {STEPS.length}</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === step ? 20 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === step ? "var(--blue-2)" : i < step ? "rgba(28,176,246,0.45)" : "var(--surface-3)",
                    transition: "width .3s",
                  }}
                />
              ))}
            </div>
          </div>
          {step < 4 ? (
            <button className="btn btn-primary" onClick={next} style={{ gap: 8 }}>
              {step === 0 ? "Start Review" : `Next: ${STEPS[step + 1]}`} <Icon name="chevron" size={16} color="#fff" />
            </button>
          ) : (
            <button className="btn btn-green" onClick={goHome}>Finish Review</button>
          )}
        </div>
      </div>
    </div>
  );
}
