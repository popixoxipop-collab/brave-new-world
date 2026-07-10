"use client";

import type { MenuCoreAlert } from "@/lib/regionFilter";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import { TIER_LABELS, isFreshEvent } from "@/data/eventTiers";

type GdeltAlertPanelProps = {
  alerts: MenuCoreAlert[];
  liveStatus: "idle" | "loading" | "ok" | "error";
  selectionLabel?: string | null;
  onSelect: (alert: MenuCoreAlert) => void;
};

export function GdeltAlertPanel({
  alerts,
  liveStatus,
  selectionLabel,
  onSelect,
}: GdeltAlertPanelProps) {
  return (
    <div className="pointer-events-auto absolute bottom-5 right-4 z-20 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-orange-300/20 bg-[#140f0a]/82 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-orange-300/15 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-orange-200/75">GDELT 뉴스 알림</p>
          <p className="mt-0.5 text-xs text-orange-50/90">
            {selectionLabel ? `${selectionLabel} · 메뉴 핵심 뉴스` : "메뉴 연관 핵심 뉴스"}
          </p>
        </div>
        <span className="rounded-full border border-orange-300/25 bg-orange-300/10 px-2 py-0.5 text-[10px] text-orange-100/80">
          {liveStatus === "loading"
            ? "동기화 중"
            : liveStatus === "error"
              ? "오프라인"
              : `${alerts.length}건`}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-5 text-slate-400">
          {liveStatus === "loading"
            ? "메뉴와 연관된 핵심 속보를 모으는 중…"
            : "표시할 지정학 속보가 없습니다. 상단 메뉴에서 지역을 고르거나 새로고침을 눌러 보세요."}
        </p>
      ) : (
        <ul className="max-h-[min(42vh,320px)] divide-y divide-orange-300/10 overflow-y-auto">
          {alerts.map((alert) => {
            const regionTitle = alert.menuRegion.parentLabel
              ? `${alert.menuRegion.parentLabel} · ${alert.menuRegion.label}`
              : alert.menuRegion.label;
            const fresh = isFreshEvent(alert);

            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => onSelect(alert)}
                  className="flex w-full gap-3 px-3 py-2.5 text-left transition hover:bg-orange-300/10"
                >
                  <span className="relative mt-0.5 flex shrink-0 items-end">
                    <LocationPinIcon tier={alert.eventTier} size={16} fresh={fresh} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span className="rounded-full border border-orange-300/30 bg-orange-400/10 px-1.5 py-0.5 text-[10px] text-orange-100/90">
                        뉴스
                      </span>
                      <span className="font-medium text-orange-50">
                        {TIER_LABELS[alert.eventTier]}
                      </span>
                      {fresh && (
                        <span className="rounded-full bg-yellow-400/15 px-1.5 py-0.5 text-[10px] text-yellow-200">
                          최신
                        </span>
                      )}
                      {alert.eventDate && (
                        <span className="text-slate-500">{alert.eventDate}</span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-orange-100/70">
                      {regionTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                      {alert.category}
                      {alert.actor1Country || alert.actor2Country
                        ? ` · ${alert.actor1Country || "?"} ↔ ${alert.actor2Country || "?"}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
