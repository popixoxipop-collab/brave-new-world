"use client";

import type { TzevaAdomAlert } from "@/lib/tzevaAdom";

type TzevaAdomPanelProps = {
  active: TzevaAdomAlert[];
  history: TzevaAdomAlert[];
  live: boolean;
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked";
  geoRestricted?: boolean;
  error?: string | null;
};

function formatTime(iso: string) {
  try {
    return new Date(iso.replace(" ", "T")).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TzevaAdomPanel({
  active,
  history,
  live,
  liveStatus,
  geoRestricted,
  error,
}: TzevaAdomPanelProps) {
  const hasActive = active.length > 0;

  return (
    <div
      className={`pointer-events-auto absolute left-4 top-4 z-30 flex h-[calc(100vh-32px)] w-[min(92vw,384px)] flex-col overflow-hidden rounded-lg border backdrop-blur-md ${
        hasActive
          ? "border-red-400/50 bg-[#1a0a0e]/90 shadow-[0_0_28px_rgba(255,23,68,0.35)]"
          : "border-[#45f3ff]/30 bg-[#1a1a2e]/85 shadow-[0_0_20px_rgba(69,243,255,0.12)]"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 ${
          hasActive ? "border-red-400/30" : "border-[#45f3ff]/25"
        }`}
      >
        <div>
          <p
            className={`font-mono text-[10px] uppercase tracking-[0.28em] ${
              hasActive ? "text-red-200/90" : "text-[#45f3ff]/80"
            }`}
          >
            Tzeva Adom
          </p>
          <p className={`mt-0.5 text-sm font-semibold ${hasActive ? "text-red-50" : "text-[#45f3ff]"}`}>
            📡 INTEL COMMAND CENTER
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
            hasActive
              ? "border-red-300/40 bg-red-500/20 text-red-100 animate-pulse"
              : live
                ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
                : "border-slate-500/30 bg-slate-800/40 text-slate-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              hasActive ? "bg-red-400" : live ? "bg-emerald-400" : "bg-slate-500"
            }`}
          />
          {hasActive
            ? "ALERT"
            : liveStatus === "loading"
              ? "연결 중"
              : liveStatus === "geo-blocked"
                ? "지역 제한"
                : live
                  ? "LIVE"
                  : liveStatus === "stub"
                    ? "데모"
                    : "대기"}
        </span>
      </div>

      {hasActive ? (
        <div className="shrink-0 border-b border-red-400/20 bg-red-950/40 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-red-200/80">Active alerts</p>
          <ul className="mt-2 space-y-2">
            {active.map((alert) => (
              <li key={alert.id} className="rounded-md border border-red-400/25 bg-red-900/30 px-3 py-2">
                <p className="text-sm font-bold text-red-50">{alert.region}</p>
                <p className="mt-0.5 text-xs text-red-200/85">{alert.title}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {geoRestricted || liveStatus === "geo-blocked" ? (
          <p className="text-xs leading-5 text-amber-200/90">
            Pikud HaOref API는 <strong>이스라엘 IP</strong>에서만 접근 가능합니다. 해외에서는{" "}
            <code className="rounded bg-slate-800 px-1">OREF_HISTORY_URL</code> 프록시를 설정하거나{" "}
            <code className="rounded bg-slate-800 px-1">npm run tzeva-adom:poll</code>을 이스라엘/VPN
            환경에서 실행하세요.
          </p>
        ) : error ? (
          <p className="text-xs text-red-200/80">{error}</p>
        ) : history.length === 0 ? (
          <p className="font-mono text-xs text-slate-400">Awaiting stream connection…</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 40).map((alert) => (
              <li
                key={alert.id}
                className={`rounded-md border px-3 py-2 ${
                  alert.active
                    ? "border-red-400/30 bg-red-950/25"
                    : "border-slate-700/50 bg-black/20"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                  <span className="text-slate-300">{formatTime(alert.alertDate)}</span>
                  {alert.active ? (
                    <span className="rounded border border-red-400/30 px-1 text-red-200">ACTIVE</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-100">{alert.region}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{alert.title}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="shrink-0 border-t border-slate-700/40 px-4 py-2 font-mono text-[10px] text-slate-500">
        Source: Pikud HaOref (unofficial JSON) · DavidTheExplorer/Tzeva-Adom-API compatible
      </p>
    </div>
  );
}
