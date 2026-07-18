"use client";

import { Blueprint } from "./Blueprint";

export function LoginScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Blueprint style={{ width: 380, background: "var(--color-bg)", padding: "34px 32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 14, height: 14, border: "1.5px solid var(--color-accent)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 3, background: "var(--color-accent)" }} />
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, letterSpacing: ".14em" }}>
            CODEBLUE
          </div>
        </div>
        <div
          className="text-muted"
          style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 26 }}
        >
          Dispatch training simulator
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Email</label>
          <input className="input" type="email" placeholder="trainee@dispatch.gov" />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input className="input" type="password" placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-block" onClick={onContinue}>
          Sign in
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          <span className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em" }}>
            OR
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        </div>
        <button className="btn btn-secondary btn-block" onClick={onContinue}>
          Continue with Auth0
        </button>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onContinue(); }}>
            Create an account
          </a>
        </div>
      </Blueprint>
    </div>
  );
}
