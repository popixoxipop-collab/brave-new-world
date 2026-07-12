"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import {
  translateOrefRegion,
  translateOrefTitle,
  tzevaUi,
} from "@/lib/tzevaAdomI18n";

export type AirRaidFocusTarget = {
  lat: number;
  lng: number;
  label?: string;
};

type TzevaAdomPanelProps = {
  active: TzevaAdomAlert[];
  history: TzevaAdomAlert[];
  live: boolean;
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked";
  geoRestricted?: boolean;
  error?: string | null;
  lang?: LabelLanguage;
  /** 칩·목록 클릭 시 해당 지역으로 이동 */
  onFocusRegion?: (target: AirRaidFocusTarget) => void;
};

function formatTime(iso: string, lang: LabelLanguage) {
  try {
    return new Date(iso.replace(" ", "T")).toLocaleString(lang === "en" ? "en-US" : "ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AlertBellIcon({ urgent }: { urgent: boolean }) {
  const stroke = urgent ? "#fecaca" : "#f87171";
  const fill = urgent ? "rgba(220, 38, 38, 0.55)" : "rgba(127, 29, 29, 0.55)";
  return (
    <svg
      viewBox="0 0 48 48"
      className={`h-4 w-4 shrink-0 ${urgent ? "animate-pulse" : ""}`}
      aria-hidden
    >
      <path
        d="M24 4c-7.2 0-13 5.6-13 12.6V24l-4.2 7.2c-.7 1.2.2 2.8 1.6 2.8h31.2c1.4 0 2.3-1.6 1.6-2.8L37 24v-7.4C37 9.6 31.2 4 24 4z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 36.5c1.4 2.6 3.4 4 5.5 4s4.1-1.4 5.5-4"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M24 2.5v3.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="2.2" r="1.6" fill={stroke} />
    </svg>
  );
}

const ISRAEL_FALLBACK = { lat: 31.5, lng: 34.85 };

export function TzevaAdomPanel({
  active,
  history,
  live,
  liveStatus,
  geoRestricted,
  error,
  lang = "ko",
  onFocusRegion,
}: TzevaAdomPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasActive = active.length > 0;

  const headline = useMemo(() => {
    const alert = active[0] ?? history[0] ?? null;
    if (!alert) return null;
    return {
      region: translateOrefRegion(alert.region, lang),
      title: translateOrefTitle(alert.title, lang, alert.category),
      active: alert.active || hasActive,
      lat: alert.lat,
      lng: alert.lng,
    };
  }, [active, hasActive, history, lang]);

  const list = useMemo(() => {
    const seen = new Set<string>();
    const merged: TzevaAdomAlert[] = [];
    for (const alert of [...active, ...history]) {
      if (seen.has(alert.id)) continue;
      seen.add(alert.id);
      merged.push(alert);
      if (merged.length >= 20) break;
    }
    return merged;
  }, [active, history]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusLabel = hasActive
    ? tzevaUi("alert", lang)
    : liveStatus === "loading"
      ? tzevaUi("connecting", lang)
      : liveStatus === "geo-blocked"
        ? tzevaUi("geoBlocked", lang)
        : live
          ? tzevaUi("live", lang)
          : liveStatus === "stub"
            ? tzevaUi("demo", lang)
            : tzevaUi("idle", lang);

  function focusAlert(alert: Pick<TzevaAdomAlert, "lat" | "lng" | "region">) {
    const lat = Number.isFinite(alert.lat) ? alert.lat : ISRAEL_FALLBACK.lat;
    const lng = Number.isFinite(alert.lng) ? alert.lng : ISRAEL_FALLBACK.lng;
    onFocusRegion?.({
      lat,
      lng,
      label: translateOrefRegion(alert.region, lang),
    });
  }

  return (
    <div ref={rootRef} className="pointer-events-auto relative z-[62]">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={tzevaUi("brand", lang)}
        title={tzevaUi("openList", lang)}
        onClick={() => {
          const primary = active[0] ?? history[0];
          if (primary) focusAlert(primary);
          else if (onFocusRegion) onFocusRegion({ ...ISRAEL_FALLBACK });
          setOpen((v) => !v);
        }}
        className={`flex max-w-[min(52vw,280px)] items-center gap-2 border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-200 ${
          hasActive
            ? "border-red-400/45 bg-[#2a0c12]/72 text-red-50"
            : "border-red-300/20 bg-[#1a0c10]/55 text-red-100/90 hover:border-red-300/35"
        } ${open ? "rounded-t-full rounded-b-md" : "rounded-full"}`}
      >
        <AlertBellIcon urgent={hasActive} />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200/80">
            {tzevaUi("brand", lang)}
          </span>
          <span className="mt-0.5 block truncate font-medium tracking-tight">
            {headline
              ? `${headline.region} · ${headline.title}`
              : statusLabel}
          </span>
        </span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            hasActive ? "animate-pulse bg-red-400" : live ? "bg-emerald-400" : "bg-slate-500"
          }`}
        />
      </button>

      <div
        className={`absolute right-0 top-full z-[70] w-[min(92vw,320px)] origin-top transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[0.98] opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-b-2xl rounded-tl-2xl border border-red-400/25 border-t-0 bg-[#1a0c10]/95 shadow-2xl backdrop-blur-md">
          <div className="border-b border-red-400/15 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200/75">
              {tzevaUi("brand", lang)}
            </p>
            <p className="mt-0.5 text-[11px] text-red-100/55">{tzevaUi("subtitle", lang)}</p>
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
            {geoRestricted || liveStatus === "geo-blocked" ? (
              <p className="px-2 py-3 text-[11px] leading-relaxed text-amber-200/90">
                {tzevaUi("geoHint", lang)}
              </p>
            ) : error ? (
              <p className="px-2 py-3 text-[11px] text-red-200/85">{error}</p>
            ) : list.length === 0 ? (
              <p className="px-2 py-3 font-mono text-[11px] text-slate-500">
                {tzevaUi("awaiting", lang)}
              </p>
            ) : (
              <ul className="divide-y divide-red-400/10" role="listbox">
                {list.map((alert) => {
                  const region = translateOrefRegion(alert.region, lang);
                  const title = translateOrefTitle(alert.title, lang, alert.category);
                  const isLive = alert.active || active.some((a) => a.id === alert.id);
                  return (
                    <li key={alert.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isLive}
                        onClick={() => focusAlert(alert)}
                        className="w-full px-2.5 py-2 text-left transition hover:bg-red-500/10"
                      >
                        <div className="flex flex-wrap items-center gap-x-1.5 text-[9px] text-slate-500">
                          <span className="text-slate-400">{formatTime(alert.alertDate, lang)}</span>
                          {isLive ? (
                            <span className="rounded border border-red-400/35 px-1 text-red-200">
                              {tzevaUi("activeBadge", lang)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-50">
                          {region}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{title}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="border-t border-red-950/40 px-3 py-1.5 font-mono text-[8px] text-slate-600">
            {tzevaUi("source", lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
