"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Client side of the real Presage integration (PRD §6.2 / §14 open question
 * #1). SmartSpectra's Node SDK is headless/native-only — there's no browser
 * SDK — so this hook captures webcam frames into a hidden canvas, downsizes
 * them, strips alpha, and POSTs raw RGB bytes to /api/vitals/frame, where
 * src/lib/presage-server.ts feeds them into a persistent per-session SDK
 * instance. Polls /api/vitals/metrics at 1Hz (PRD's vitals tick rate) for
 * the decoded pulse rate / breathing rate / facial-tension proxy.
 *
 * Fully inert (does nothing, costs nothing) until the server reports
 * `enabled` — i.e. until PRESAGE_API_KEY is set — so useSession can always
 * call this hook and just check `.enabled` to decide sim vs real vitals.
 */

const CAPTURE_WIDTH = 320;
// SmartSpectra's rPPG pipeline requires >=20fps to measure reliably — it errors
// ("Frame rate stayed below the 20 fps minimum") below that. 33ms gives ~30fps,
// with margin for the occasional dropped tick (inFlightRef skips a capture if the
// previous frame's POST hasn't resolved yet).
const CAPTURE_INTERVAL_MS = 33;
const METRICS_POLL_MS = 1000;

export interface TracePoint {
  t: number;
  v: number;
}

export interface PresageLatest {
  pulseRate?: number;
  breathingRate?: number;
  pulseStable?: boolean;
  breathingStable?: boolean;
  pulseConfidence?: number;
  breathingConfidence?: number;
  breathingTrace?: TracePoint[];
  pulseTrace?: TracePoint[];
  faceTension?: number;
  expression?: string;
  /** ValidationCode from the SDK — 0 (kOk) means signal is good; anything else pairs with validationHint. */
  validationCode?: number;
  validationHint?: string;
  error?: string;
}

export function usePresageVitals() {
  const [enabled, setEnabled] = useState(false);
  const [checkedStatus, setCheckedStatus] = useState(false);
  const [latest, setLatest] = useState<PresageLatest>({});
  // Browsers clamp timers in a backgrounded/hidden tab to ~1 callback/sec, which
  // collapses our ~30fps capture loop well below the SDK's 20fps floor — surfacing
  // this so the UI can explain a vitals stall instead of it looking broken.
  const [tabHidden, setTabHidden] = useState(false);

  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metricsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    fetch("/api/vitals/status")
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false))
      .finally(() => setCheckedStatus(true));
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const pollMetrics = useCallback(() => {
    fetch(`/api/vitals/metrics?sessionId=${sessionIdRef.current}`)
      .then((r) => r.json())
      .then(
        (d: {
          enabled: boolean;
          pulseRate?: number;
          breathingRate?: number;
          pulseStable?: boolean;
          breathingStable?: boolean;
          pulseConfidence?: number;
          breathingConfidence?: number;
          breathingTrace?: TracePoint[];
          pulseTrace?: TracePoint[];
          faceTension?: number;
          expression?: string;
          validation?: { code: number; hint: string };
          error?: { message: string };
        }) => {
          setLatest({
            pulseRate: d.pulseRate,
            breathingRate: d.breathingRate,
            pulseStable: d.pulseStable,
            breathingStable: d.breathingStable,
            pulseConfidence: d.pulseConfidence,
            breathingConfidence: d.breathingConfidence,
            breathingTrace: d.breathingTrace,
            pulseTrace: d.pulseTrace,
            faceTension: d.faceTension,
            expression: d.expression,
            validationCode: d.validation?.code,
            validationHint: d.validation?.hint,
            error: d.error?.message,
          });
        }
      )
      .catch(() => {});
  }, []);

  const captureTick = useCallback(() => {
    if (inFlightRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;

    let canvas = canvasRef.current;
    const h = Math.max(1, Math.round((CAPTURE_WIDTH * video.videoHeight) / video.videoWidth));
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    if (canvas.width !== CAPTURE_WIDTH || canvas.height !== h) {
      canvas.width = CAPTURE_WIDTH;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, h);

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, CAPTURE_WIDTH, h);
    } catch {
      return;
    }

    const rgba = imageData.data;
    const rgb = new Uint8Array((rgba.length / 4) * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i];
      rgb[j + 1] = rgba[i + 1];
      rgb[j + 2] = rgba[i + 2];
    }

    const tsUs = Math.round((performance.now() + startedAtRef.current) * 1000);
    inFlightRef.current = true;
    // A stalled/hung request (dropped connection, dev-server restart) would otherwise
    // hold inFlightRef forever, freezing the capture loop until it resolves — the next
    // frame's timestamp then shows a multi-second gap and trips the SDK's hard 2s limit.
    // Bail well under that so a single bad request costs one skipped tick, not the session.
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 1500);
    fetch("/api/vitals/frame", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-session-id": sessionIdRef.current,
        "x-width": String(CAPTURE_WIDTH),
        "x-height": String(h),
        "x-ts-us": String(tsUs),
      },
      body: rgb,
      signal: abort.signal,
    })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        inFlightRef.current = false;
      });
  }, []);

  const startCapture = useCallback(
    (stream: MediaStream) => {
      if (!enabled) return;
      if (captureTimerRef.current) return; // already running
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.play().catch(() => {});
      videoRef.current = video;
      startedAtRef.current = Date.now();

      captureTimerRef.current = setInterval(captureTick, CAPTURE_INTERVAL_MS);
      metricsTimerRef.current = setInterval(pollMetrics, METRICS_POLL_MS);
    },
    [enabled, captureTick, pollMetrics]
  );

  const stopCapture = useCallback(() => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    if (metricsTimerRef.current) clearInterval(metricsTimerRef.current);
    captureTimerRef.current = null;
    metricsTimerRef.current = null;
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.srcObject = null;
    videoRef.current = null;
  }, []);

  const endServerSession = useCallback(() => {
    const payload = JSON.stringify({ sessionId: sessionIdRef.current });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals/end", new Blob([payload], { type: "application/json" }));
    }
  }, []);

  useEffect(() => {
    // React's unmount cleanup (below) only runs while the page itself is still alive to run
    // JS — closing/reloading/navigating away the tab kills the execution context outright
    // without giving that a chance to fire, so the server-side native SDK session was never
    // actually torn down and sat there (holding GPU/native processing resources) until the
    // 2-minute idle sweep reaped it. `pagehide` is the reliable "this page is really going
    // away" signal (fires on close, reload, and navigation); `beforeunload` is a backup for
    // browsers/cases where pagehide doesn't fire.
    window.addEventListener("pagehide", endServerSession);
    window.addEventListener("beforeunload", endServerSession);
    return () => {
      window.removeEventListener("pagehide", endServerSession);
      window.removeEventListener("beforeunload", endServerSession);
    };
  }, [endServerSession]);

  useEffect(
    () => () => {
      stopCapture();
      endServerSession();
    },
    [stopCapture, endServerSession]
  );

  return { enabled, checkedStatus, latest, startCapture, stopCapture, tabHidden };
}
