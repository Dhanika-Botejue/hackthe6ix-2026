"use client";

import { useEffect, type CSSProperties } from "react";
import { Icon } from "./icons";

/**
 * The "dispatch console pickup" moment. An emergency call rings in (audio +
 * visual) and the trainee answers to take control — which is how a real
 * dispatcher works: a headset at a console, calls coming *in*, never dialing
 * out. Answering starts the live call; declining returns home. (A real-phone /
 * Twilio version can hang off onAnswer later without touching this screen.)
 */
export function IncomingCall({
  onAnswer,
  onDecline,
  line = "911 · Emergency Line",
  region = "Toronto, ON",
}: {
  onAnswer: () => void;
  onDecline: () => void;
  line?: string;
  region?: string;
}) {
  // North American ringback tone (440+480 Hz, ~2s on / 4s off) via Web Audio —
  // no audio asset needed. If the browser blocks it, the visual ring still reads.
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      void ctx.resume();
      const ring = () => {
        if (stopped || !ctx || ctx.state === "closed") return;
        const t0 = ctx.currentTime;
        const g = ctx.createGain();
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.05);
        g.gain.setValueAtTime(0.4, t0 + 1.95);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2);
        for (const f of [440, 480]) {
          const o = ctx.createOscillator();
          o.frequency.value = f;
          o.connect(g);
          o.start(t0);
          o.stop(t0 + 2);
        }
      };
      ring();
      interval = setInterval(ring, 6000);
    } catch {
      // Web Audio unavailable/blocked — visual ring conveys the incoming call.
    }
    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      ctx?.close().catch(() => {});
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      {/* sweeping emergency-light beam */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: "linear-gradient(90deg, transparent, rgba(255,75,75,0.10), transparent)",
          animation: "dlSweep 3.2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div style={{ textAlign: "center", position: "relative", padding: 24 }}>
        <div
          className="text-muted"
          style={{ fontSize: 13, letterSpacing: ".24em", textTransform: "uppercase", marginBottom: 30, animation: "dlPulse 1.4s infinite" }}
        >
          ● Incoming call
        </div>

        {/* pulsing avatar with expanding rings */}
        <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 28px" }}>
          {[0, 0.6, 1.2].map((d) => (
            <span
              key={d}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid var(--blue)",
                animation: `dlRing 1.8s ease-out ${d}s infinite`,
              }}
            />
          ))}
          <div
            className="anim-pop"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--surface-3)",
              border: "1px solid var(--border-strong)",
              display: "grid",
              placeItems: "center",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <Icon name="phone" size={54} color="var(--blue)" />
          </div>
        </div>

        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 32, marginBottom: 6 }}>{line}</div>
        <div className="text-muted" style={{ fontSize: 15, marginBottom: 4 }}>
          Unknown caller · {region}
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          Answer and take control of the call.
        </div>

        {/* call controls */}
        <div style={{ display: "flex", gap: 68, justifyContent: "center", marginTop: 42 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button onClick={onDecline} aria-label="Decline call" style={roundBtn("var(--red)", "#c92c2c")}>
              <Icon name="phone" size={28} color="#fff" style={{ transform: "rotate(135deg)" }} />
            </button>
            <span className="text-muted" style={{ fontSize: 13, fontWeight: 700 }}>Decline</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button
              onClick={onAnswer}
              aria-label="Answer call"
              style={{ ...roundBtn("var(--green)", "var(--green-deep)"), animation: "dlFloat 1.2s ease-in-out infinite" }}
            >
              <Icon name="phone" size={28} color="#06210a" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)" }}>Answer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundBtn(bg: string, shadow: string): CSSProperties {
  return {
    width: 74,
    height: 74,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    background: bg,
    boxShadow: `0 5px 0 0 ${shadow}`,
    display: "grid",
    placeItems: "center",
  };
}
