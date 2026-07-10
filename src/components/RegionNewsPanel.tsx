"use client";

import type { ScoredEvent } from "@/data/eventTiers";
import { TIER_LABELS } from "@/data/eventTiers";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import type { NavSelection } from "@/data/navRegions";

type RegionNewsPanelProps = {
  selection: NavSelection;
  events: ScoredEvent[];
  onSelectEvent: (event: ScoredEvent) => void;
  onClose: () => void;
};

export function RegionNewsPanel({
  selection,
  events,
  onSelectEvent,
  onClose,
}: RegionNewsPanelProps) {
  const title = selection.parentLabel
    ? `${selection.parentLabel} · ${selection.label}`
    : selection.label;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/70">
            {selection.groupId === "conflict-zones" ? "충돌지역" : "대륙간 갈등과 협력"}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{selection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
        >
          닫기
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-black/25 px-3 py-2 text-xs text-slate-400">
        관련 뉴스 <span className="text-slate-200">{events.length.toLocaleString()}건</span>
        {selection.actorCountries?.length ? (
          <span className="ml-2 text-slate-500">
            · 행위자 {selection.actorCountries.slice(0, 4).join(", ")}
            {selection.actorCountries.length > 4 ? "…" : ""}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-black/20">
        {events.length === 0 ? (
          <p className="p-4 text-sm leading-6 text-slate-500">
            이 지역·동맹 범위에 해당하는 GDELT 이벤트가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-emerald-300/5"
                >
                  <LocationPinIcon tier={event.eventTier} size={16} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-slate-100">
                        {TIER_LABELS[event.eventTier]}
                      </span>
                      {event.eventDate && (
                        <span className="text-slate-500">{event.eventDate}</span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      {event.category}
                      {event.actor1Country || event.actor2Country
                        ? ` · ${event.actor1Country || "?"} ↔ ${event.actor2Country || "?"}`
                        : ""}
                      {event.country ? ` · ${event.country}` : ""}
                    </span>
                    {event.sourceUrl && (
                      <span className="mt-1 block truncate text-[10px] text-slate-600">
                        {hostFromUrl(event.sourceUrl)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function hostFromUrl(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
