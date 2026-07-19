import { OwlMascot } from "./OwlMascot";

export function LoginScreen({ onDemo }: { onDemo: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card card-pad anim-pop" style={{ width: 380, maxWidth: "100%", padding: 32, alignItems: "center", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
        <OwlMascot size={110} />
        <div className="wordmark" style={{ fontSize: 34, marginTop: 6 }}>
          <span className="lo">dispatch</span><span className="hi">lingo</span>
        </div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 18 }}>Emergency dispatch training</div>

        <a href="/auth/login" className="btn btn-primary" style={{ width: "100%" }}>Sign in</a>
        <a href="/auth/login?screen_hint=signup" style={{ fontSize: 13, marginTop: 2 }}>Create an account</a>

        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span className="text-faint" style={{ fontSize: 11, fontWeight: 800 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <a href="/auth/login?connection=google-oauth2" className="btn btn-ghost" style={{ width: "100%" }}>Continue with Google</a>
        <button className="btn btn-green" onClick={onDemo} style={{ width: "100%", marginTop: 10 }}>Try the demo — no login</button>
        <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>Runs the scripted scenario locally. Nothing is saved.</div>
      </div>
    </div>
  );
}
