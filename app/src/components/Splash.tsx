"use client";

import { useEffect } from "react";
import { OwlMascot } from "./OwlMascot";

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* sweeping police-light beam */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: "linear-gradient(90deg, transparent, rgba(90,160,255,0.10), transparent)",
          animation: "dlSweep 3.2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div className="anim-pop" style={{ display: "flex", justifyContent: "center" }}>
          <OwlMascot size={168} float />
        </div>
        <div
          className="wordmark anim-fadeup"
          style={{ fontSize: 58, marginTop: 20, animationDelay: ".25s" }}
        >
          <span className="lo">dispatch</span>
          <span className="hi">lingo</span>
        </div>
        <div
          className="anim-fadeup text-muted"
          style={{ marginTop: 10, fontSize: 15, letterSpacing: ".18em", textTransform: "uppercase", animationDelay: ".5s" }}
        >
          Duolingo for dispatchers
        </div>
      </div>
    </div>
  );
}
