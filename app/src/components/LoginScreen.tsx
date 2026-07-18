import { Blueprint } from "./Blueprint";

export function LoginScreen({ onDemo }: { onDemo: () => void }) {
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

        <a href="/auth/login" className="btn btn-primary btn-block" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Sign in
        </a>
        <a
          href="/auth/login?screen_hint=signup"
          style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 13 }}
        >
          Create an account
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          <span className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em" }}>
            OR
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        </div>

        <a
          href="/auth/login?connection=google-oauth2"
          className="btn btn-secondary btn-block"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: 10 }}
        >
          Continue with Google
        </a>
        <div className="text-muted" style={{ fontSize: 12, textAlign: "center" }}>
          Enterprise SSO and passwordless email are also available on the sign-in page.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          <span className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em" }}>
            OR
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        </div>

        <button className="btn btn-secondary btn-block" onClick={onDemo}>
          Try the demo — no login
        </button>
        <div className="text-muted" style={{ fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Runs the scripted scenario locally. Nothing is saved to an account.
        </div>
      </Blueprint>
    </div>
  );
}
