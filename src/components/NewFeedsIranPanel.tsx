"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  NEWFEEDS_ATTRIBUTION_SHORT,
  NEWFEEDS_REPO_URL,
  type NewfeedsAttackPoint,
} from "@/lib/newfeeds";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";

type NewFeedsIranPanelProps = {
  attacks: NewfeedsAttackPoint[];
  threatLabel: string | null;
  live: boolean;
  liveStatus: "idle" | "loading" | "ok" | "error";
  error?: string | null;
  lang?: LabelLanguage;
  onFocusAttack?: (target: AirRaidFocusTarget) => void;
  compact?: boolean;
};

function formatTime(iso: string | null, lang: LabelLanguage) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function NewFeedsIranPanel({
  attacks,
  threatLabel,
  live,
  liveStatus,
  error,
  lang = "ko",
  onFocusAttack,
  compact = false,
}: NewFeedsIranPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const en = lang === "en";

  const topAttacks = useMemo(() => attacks.slice(0, 10), [attacks]);
  const urgent = attacks.some((a) => a.severity === "major" || a.severity === "high");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusLine = threatLabel
    ? threatLabel
    : liveStatus === "loading"
      ? en
        ? "Loading…"
        : "불러오는 중…"
      : liveStatus === "error"
        ? en
          ? "Feed error"
          : "피드 오류"
        : en
          ? `${attacks.length} mapped events`
          : `지도 ${attacks.length}건`;

  const listBody = (
    <div className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto px-3 py-2.5">
      {error ? <p className="text-[10px] leading-4 text-red-200">{error}</p> : null}

      {topAttacks.length > 0 ? (
        <ul className="space-y-1.5">
          {topAttacks.map((attack) => (
            <li key={attack.id}>
              <button
                type="button"
                onClick={() =>
                  onFocusAttack?.({
                    lat: attack.lat,
                    lng: attack.lng,
                    label: attack.location || attack.title,
                  })
                }
                className="w-full rounded-md border border-red-400/15 bg-red-950/30 px-2 py-1.5 text-left transition hover:border-red-300/35 hover:bg-red-950/50"
              >
                <p className="line-clamp-2 text-[11px] leading-4 text-red-50">{attack.title}</p>
                <p className="mt-0.5 text-[10px] text-red-200/55">
                  {[attack.severity, attack.location, formatTime(attack.publishedAt, lang)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-0.5 text-[9px] text-red-200/40">
                  {attack.sourceName} · {NEWFEEDS_ATTRIBUTION_SHORT}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : liveStatus === "ok" ? (
        <p className="text-[10px] text-red-200/55">
          {en ? "No Iran-linked mapped events yet." : "이란 관련 지도 이벤트가 아직 없습니다."}
        </p>
      ) : null}

      <a
        href={NEWFEEDS_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-red-300/15 pt-2 text-[9px] leading-4 text-red-200/45 underline-offset-2 hover:text-red-100 hover:underline"
      >
        {en
          ? `Source: ${NEWFEEDS_ATTRIBUTION_SHORT} (MIT) · GitHub`
          : `출처: ${NEWFEEDS_ATTRIBUTION_SHORT} (MIT) · GitHub`}
      </a>
    </div>
  );

  return (
    <div ref={rootRef} className="pointer-events-auto relative z-[55]">
      <button
        type="button"
        aria-expanded={open}
        title={en ? "Iran mapped events · NewFeeds" : "이란 지도 이벤트 · NewFeeds"}
        onClick={() => {
          const first = attacks[0];
          if (first) onFocusAttack?.({ lat: first.lat, lng: first.lng, label: first.location || first.title });
          setOpen((v) => !v);
        }}
        className={
          compact
            ? `relative flex h-11 w-11 items-center justify-center rounded-full border text-[12px] font-semibold shadow-lg backdrop-blur-md transition ${
                urgent
                  ? "animate-pulse border-red-400/50 bg-[#2a0c12]/85 text-red-50"
                  : "border-red-300/25 bg-[#1a0c10]/7 text-red-100/90"
              }`
            : `flex max-w-[min(52vw,280px)] items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition ${
                urgent
                  ? "border-red-400/45 bg-[#2a0c12]/72 text-red-50"
                  : "border-red-300/20 bg-[#1a0c10]/55 text-red-100/90 hover:border-red-300/35"
              } ${open ? "rounded-t-full rounded-b-md" : "rounded-full"}`
        }
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            live ? (urgent ? "bg-red-400 animate-pulse" : "bg-emerald-400") : "bg-slate-500"
          }`}
        />
        {compact ? (
          <span>IR</span>
        ) : (
          <div className="min-w-0 text-left">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200/80">
              {en ? "Iran · NewFeeds" : "이란 · NewFeeds"}
            </p>
            <p className="truncate text-[11px] font-medium tracking-tight opacity-90">{statusLine}</p>
          </div>
        )}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-[60] mt-0 w-[min(18rem,calc(100vw-5rem))] overflow-hidden border border-red-400/25 bg-[#1a0c10]/95 text-red-50 shadow-xl backdrop-blur-md ${
            compact ? "bottom-full mb-1.5 rounded-2xl" : "top-full rounded-b-2xl rounded-tl-2xl border-t-0"
          }`}
        >
          {listBody}
        </div>
      ) : null}
    </div>
  );
}
