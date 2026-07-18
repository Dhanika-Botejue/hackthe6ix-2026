"use client";

import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { LoginScreen } from "@/components/LoginScreen";
import { ReadyRoom } from "@/components/ReadyRoom";
import { LiveConsole } from "@/components/LiveConsole";
import { ReportScreen } from "@/components/ReportScreen";
import { HistoryScreen } from "@/components/HistoryScreen";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export default function Home() {
  const s = useSession();
  const [loggedIn, setLoggedIn] = useState(!AUTH_ENABLED);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)" }}>
      {!loggedIn && <LoginScreen onContinue={() => setLoggedIn(true)} />}

      {loggedIn && s.screen === "ready" && (
        <ReadyRoom
          scenarios={s.scenarios}
          scenarioIdx={s.scenarioIdx}
          pickScenario={s.pickScenario}
          stream={s.stream}
          camDenied={s.camDenied}
          signal={s.signal}
          bl={s.bl}
          blT={s.blT}
          blHr={s.blHr}
          baselineHr={s.baselineHr}
          baselineSecs={s.baselineSecs}
          startBaseline={s.startBaseline}
          startCall={s.startCall}
          goHistory={() => s.go("history")}
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
          baselineHr={s.baselineHr}
          callT={s.callT}
          callerTitle="Unknown caller"
          scenarioName={s.scenario.name}
          callerState={s.callerState}
          callOver={s.callOver}
          copilot={s.copilot}
          brief={s.brief}
          transcript={s.transcript}
          liveNotice={s.liveNotice}
          onEndCall={s.endCall}
        />
      )}

      {loggedIn && s.screen === "report" && s.report && (
        <ReportScreen
          report={s.report}
          baselineHr={s.baselineHr}
          scenarioName={s.scenario.name}
          goReady={() => s.go("ready")}
          goHistory={() => s.go("history")}
        />
      )}

      {loggedIn && s.screen === "history" && (
        <HistoryScreen sessions={s.sessions} goReady={() => s.go("ready")} />
      )}
    </div>
  );
}
