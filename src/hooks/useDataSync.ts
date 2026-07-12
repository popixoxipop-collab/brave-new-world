"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getClientSyncPollMs } from "@/lib/runtimeConfig.client";

export type DataSyncStatus = {
  ok?: boolean;
  stale?: boolean;
  running?: boolean;
  status?: {
    lastSuccessAt?: string | null;
    lastError?: string | null;
    running?: boolean;
    lastStartAt?: string | null;
  };
  sources?: Record<string, string | string[]>;
};

const STARTUP_DELAY_MS = 8_000;

/**
 * Periodically checks /api/data-sync and triggers snapshot refresh when stale.
 * Live feeds (GDELT/AIS/ADS-B) already poll their own APIs; this covers static snapshot refresh.
 */
export function useDataSync(options?: {
  enabled?: boolean;
  mode?: "quick" | "default" | "full";
  cameraMovingRef?: { current: boolean };
}) {
  const enabled = options?.enabled !== false;
  const mode = options?.mode || "default";
  const cameraMovingRef = options?.cameraMovingRef;
  const [syncInfo, setSyncInfo] = useState<DataSyncStatus | null>(null);
  const [syncGeneration, setSyncGeneration] = useState(0);
  const inFlightRef = useRef(false);
  const lastSuccessRef = useRef<string | null>(null);
  const hasPolledRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data-sync", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as DataSyncStatus;
      setSyncInfo(json);
      const success = json.status?.lastSuccessAt || null;
      if (success && success !== lastSuccessRef.current) {
        if (hasPolledRef.current) {
          setSyncGeneration((n) => n + 1);
        }
        lastSuccessRef.current = success;
      }
      hasPolledRef.current = true;
      return json;
    } catch {
      return null;
    }
  }, []);

  const pollUntilIdle = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 2_000));
    for (let i = 0; i < 40; i += 1) {
      const next = await refreshStatus();
      if (!next?.running) break;
      await new Promise((r) => setTimeout(r, 8_000));
    }
  }, [refreshStatus]);

  const triggerIfStale = useCallback(async () => {
    if (inFlightRef.current) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (cameraMovingRef?.current) return;
    inFlightRef.current = true;
    try {
      const status = await refreshStatus();
      if (!status?.stale || status.running) return;
      await fetch(`/api/data-sync?mode=${encodeURIComponent(mode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      await pollUntilIdle();
    } finally {
      inFlightRef.current = false;
    }
  }, [cameraMovingRef, mode, pollUntilIdle, refreshStatus]);

  const forceSync = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fetch(`/api/data-sync?force=1&mode=${encodeURIComponent(mode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, mode }),
      });
      await pollUntilIdle();
      await refreshStatus();
    } finally {
      inFlightRef.current = false;
    }
  }, [mode, pollUntilIdle, refreshStatus]);

  useEffect(() => {
    if (!enabled) return;
    const startup = window.setTimeout(() => {
      void triggerIfStale();
    }, STARTUP_DELAY_MS);
    const pollMs = getClientSyncPollMs();
    const timer = window.setInterval(() => {
      void triggerIfStale();
    }, pollMs);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
    };
  }, [enabled, triggerIfStale]);

  return { syncInfo, syncGeneration, refreshStatus, triggerIfStale, forceSync };
}
