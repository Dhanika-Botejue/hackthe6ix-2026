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
const CAPTURE_INTERVAL_MS = 150; // ~6.7 fps — enough for rPPG, light on bandwidth/CPU
const METRICS_POLL_MS = 1000;

export interface PresageLatest {
  pulseRate?: number;
  breathingRate?: number;
  faceTension?: number;
  validationHint?: string;
  error?: string;
}

export function usePresageVitals() {
  const [enabled, setEnabled] = useState(false);
  const [checkedStatus, setCheckedStatus] = useState(false);
  const [latest, setLatest] = useState<PresageLatest>({});

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

  const pollMetrics = useCallback(() => {
    fetch(`/api/vitals/metrics?sessionId=${sessionIdRef.current}`)
      .then((r) => r.json())
      .then(
        (d: {
          enabled: boolean;
          pulseRate?: number;
          breathingRate?: number;
          faceTension?: number;
          validation?: { hint: string };
          error?: { message: string };
        }) => {
          setLatest({
            pulseRate: d.pulseRate,
            breathingRate: d.breathingRate,
            faceTension: d.faceTension,
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
    })
      .catch(() => {})
      .finally(() => {
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

  useEffect(
    () => () => {
      stopCapture();
      const payload = JSON.stringify({ sessionId: sessionIdRef.current });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals/end", new Blob([payload], { type: "application/json" }));
      }
    },
    [stopCapture]
  );

  return { enabled, checkedStatus, latest, startCapture, stopCapture };
}
