"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import {
  isNeptunThreatVisible,
  neptunPredict,
  type NeptunAlerts,
  type NeptunArchivedThreat,
  type NeptunLiveThreat,
  type NeptunPayload,
  type NeptunThreat,
  NEPTUN_WS_URL,
} from "@/lib/neptun";

export type { NeptunLiveThreat, NeptunArchivedThreat } from "@/lib/neptun";

export type NeptunStreamStatus = "idle" | "loading" | "ok" | "error" | "stub";

type StreamEnvelope =
  | { type: "snapshot"; ts: string; data: { threats?: NeptunThreat[] } }
  | { type: "upsert"; ts: string; data: NeptunThreat }
  | { type: "remove"; ts: string; data: { id: string } }
  | { type: "alerts"; ts: string; data: NeptunAlerts }
  | { type: "heartbeat"; ts: string };

const EMPTY_ALERTS: NeptunAlerts = { raions: [], oblasts: [] };
const REST_POLL_MS = 5000;
const STUB_POLL_MS = 120_000;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
const MAX_ARCHIVED_TRAILS = 96;

function neptunEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NEPTUN_ENABLED === "true";
}

function withPrediction(threats: NeptunThreat[], nowMs: number): NeptunLiveThreat[] {
  return threats
    .filter(isNeptunThreatVisible)
    .map((threat) => {
      const p = neptunPredict(threat, nowMs);
      return {
        ...threat,
        predictedLat: p.lat,
        predictedLon: p.lon,
        predictedHeading: p.heading,
        flying: p.flying,
      };
    });
}

function hasArchivableTrail(threat: NeptunThreat): boolean {
  if ((threat.trail?.length ?? 0) >= 2) return true;
  return Number.isFinite(threat.lat) && Number.isFinite(threat.lon);
}

function archiveThreat(
  archivedRef: Map<string, NeptunArchivedThreat>,
  threat: NeptunThreat,
  archivedAt: string,
) {
  if (!hasArchivableTrail(threat)) return;
  archivedRef.set(threat.id, { ...threat, archivedAt });
  if (archivedRef.size <= MAX_ARCHIVED_TRAILS) return;

  const oldest = [...archivedRef.values()].sort((a, b) =>
    a.archivedAt.localeCompare(b.archivedAt),
  )[0];
  if (oldest) archivedRef.delete(oldest.id);
}

function publishArchived(
  archivedRef: Map<string, NeptunArchivedThreat>,
  setArchivedThreats: (threats: NeptunArchivedThreat[]) => void,
) {
  setArchivedThreats(
    [...archivedRef.values()].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
  );
}

export function useNeptunStream(enabled: boolean) {
  const [threats, setThreats] = useState<NeptunLiveThreat[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<NeptunArchivedThreat[]>([]);
  const [alerts, setAlerts] = useState<NeptunAlerts>(EMPTY_ALERTS);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<NeptunStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);

  const threatsRef = useRef<Map<string, NeptunThreat>>(new Map());
  const archivedRef = useRef<Map<string, NeptunArchivedThreat>>(new Map());
  const rafRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const lastPublishRef = useRef(0);
  const PUBLISH_MS = 500;

  const applyThreatMap = useCallback((nowMs: number) => {
    setThreats(withPrediction(Array.from(threatsRef.current.values()), nowMs));
  }, []);

  const ingestPayload = useCallback(
    (payload: NeptunPayload) => {
      const nextIds = new Set(payload.threats.map((threat) => threat.id));
      for (const [id, threat] of threatsRef.current) {
        if (!nextIds.has(id)) {
          archiveThreat(archivedRef.current, threat, payload.serverTime || payload.fetchedAt);
        }
      }
      threatsRef.current = new Map(payload.threats.map((t) => [t.id, t]));
      if (payload.archivedThreats?.length) {
        for (const archived of payload.archivedThreats) {
          if (hasArchivableTrail(archived)) {
            archivedRef.current.set(archived.id, archived);
          }
        }
      }
      publishArchived(archivedRef.current, setArchivedThreats);
      setAlerts(payload.alerts ?? EMPTY_ALERTS);
      setServerTime(payload.serverTime || payload.fetchedAt);
      setLive(Boolean(payload.live));
      setError(payload.error ?? null);
      setStatus(payload.stub ? "stub" : "ok");
      applyThreatMap(Date.now());
    },
    [applyThreatMap],
  );

  const refreshRest = useCallback(async () => {
    if (!enabled || !neptunEnabled()) return;
    setStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/neptun", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as NeptunPayload;
      ingestPayload(payload);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "fetch failed");
    }
  }, [enabled, ingestPayload]);

  const startAnimationLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const tick = (nowMs: number) => {
      if (nowMs - lastPublishRef.current >= PUBLISH_MS) {
        applyThreatMap(nowMs);
        lastPublishRef.current = nowMs;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, [applyThreatMap]);

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cleanupWs = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connect: () => void) => {
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    },
    [],
  );

  const connectWebSocket = useCallback(() => {
    if (!enabled || !neptunEnabled() || isClientApiStubMode()) return;

    cleanupWs();
    setStatus((prev) => (prev === "idle" ? "loading" : prev));

    const ws = new WebSocket(NEPTUN_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setLive(true);
      setStatus("ok");
      setError(null);
      startAnimationLoop();
    };

    ws.onmessage = (event) => {
      try {
        const env = JSON.parse(event.data as string) as StreamEnvelope;
        const archivedAt = env.ts || new Date().toISOString();
        if (env.ts) setServerTime(env.ts);

        switch (env.type) {
          case "snapshot": {
            const list = Array.isArray(env.data?.threats) ? env.data.threats : [];
            const nextIds = new Set(list.map((threat) => threat.id));
            for (const [id, threat] of threatsRef.current) {
              if (!nextIds.has(id)) {
                archiveThreat(archivedRef.current, threat, archivedAt);
              }
            }
            threatsRef.current = new Map(list.map((t) => [t.id, t]));
            publishArchived(archivedRef.current, setArchivedThreats);
            applyThreatMap(Date.now());
            break;
          }
          case "upsert":
            threatsRef.current.set(env.data.id, env.data);
            applyThreatMap(Date.now());
            break;
          case "remove": {
            const threat = threatsRef.current.get(env.data.id);
            if (threat) {
              archiveThreat(archivedRef.current, threat, archivedAt);
              publishArchived(archivedRef.current, setArchivedThreats);
            }
            threatsRef.current.delete(env.data.id);
            applyThreatMap(Date.now());
            break;
          }
          case "alerts":
            setAlerts(env.data ?? EMPTY_ALERTS);
            break;
          case "heartbeat":
            break;
          default:
            break;
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      setError("WebSocket error");
    };

    ws.onclose = () => {
      wsRef.current = null;
      stopAnimationLoop();
      if (!enabled || !neptunEnabled()) return;
      setLive(false);
      scheduleReconnect(connectWebSocket);
    };
  }, [applyThreatMap, cleanupWs, enabled, scheduleReconnect, startAnimationLoop, stopAnimationLoop]);

  useEffect(() => {
    if (!enabled || !neptunEnabled()) {
      threatsRef.current.clear();
      archivedRef.current.clear();
      setThreats([]);
      setArchivedThreats([]);
      setAlerts(EMPTY_ALERTS);
      setLive(false);
      setStatus("idle");
      setError(null);
      setServerTime(null);
      stopAnimationLoop();
      cleanupWs();
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    if (isClientApiStubMode()) {
      void refreshRest();
      pollTimerRef.current = window.setInterval(() => {
        void refreshRest();
      }, STUB_POLL_MS);
    } else {
      connectWebSocket();
      void refreshRest();
    }

    return () => {
      stopAnimationLoop();
      cleanupWs();
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [
    cleanupWs,
    connectWebSocket,
    enabled,
    refreshRest,
    startAnimationLoop,
    stopAnimationLoop,
  ]);

  return {
    threats,
    archivedThreats,
    alerts,
    live,
    status,
    error,
    serverTime,
    alertCount: alerts.raions.length + alerts.oblasts.length,
  };
}
