"use client";

import { useState } from "react";
import type { User } from "@auth0/nextjs-auth0/types";
import { useSession } from "@/hooks/useSession";
import { LoginScreen } from "@/components/LoginScreen";
import { Splash } from "@/components/Splash";
import { Home } from "@/components/Home";
import { Calibrating } from "@/components/Calibrating";
import { LiveConsole } from "@/components/LiveConsole";
import { PerformanceReview } from "@/components/PerformanceReview";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const STREAK = 7;

export function HomeClient({ user }: { user: User | null }) {
  const s = useSession();
  const [guest, setGuest] = useState(false);
  const loggedIn = !AUTH_ENABLED || !!user || guest;
  const account = user
    ? { label: user.email ?? user.name ?? "Signed in", href: "/auth/logout", cta: "Sign out" }
    : guest
      ? { label: "Demo mode", href: undefined, cta: undefined }
      : null;

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      {!loggedIn && <LoginScreen onDemo={() => setGuest(true)} />}

      {loggedIn && s.screen === "splash" && <Splash onDone={() => s.go("home")} />}

      {loggedIn && (s.screen === "home" || s.screen === "ready") && (
        <Home
          course={s.course}
          streak={STREAK}
          pickScenario={s.pickScenario}
          startCall={s.beginCalibration}
          account={account}
        />
      )}

      {loggedIn && s.screen === "calibrating" && (
        <Calibrating
          stream={s.stream}
          camDenied={s.camDenied}
          blT={s.blT}
          blHr={s.blHr}
          baselineSecs={s.baselineSecs}
          presageEnabled={s.presageEnabled}
          signal={s.signal}
        />
      )}

      {loggedIn && s.screen === "console" && (
        <LiveConsole
          stream={s.stream}
          camDenied={s.camDenied}
          hr={s.hr}
          br={s.br}
          comp={s.comp}
          band={s.band}
          presageEnabled={s.presageEnabled}
          emotion={s.emotion}
          stress={s.stress}
          pulseStable={s.pulseStable}
          breathingStable={s.breathingStable}
          breathingTrace={s.breathingTrace}
          pulseTrace={s.pulseTrace}
          presageTabHidden={s.presageTabHidden}
          validationCode={s.validationCode}
          validationHint={s.validationHint}
          baselineHr={s.baselineHr}
          callT={s.callT}
          scenarioName={s.scenario.name}
          difficulty={s.scenario.difficulty}
          course={s.course}
          streak={STREAK}
          callOver={s.callOver}
          transcript={s.transcript}
          liveNotice={s.liveNotice}
          details={s.details}
          setField={s.setField}
          onEndCall={s.endCall}
        />
      )}

      {loggedIn && s.screen === "report" && s.report && (
        <PerformanceReview report={s.report} scenarioName={s.scenario.name} goHome={() => s.go("home")} />
      )}
    </div>
  );
}
