"use client";

import { useMemo } from "react";
import type { NavSelection } from "@/data/navRegions";
import {
  ECON_REGION_KEYWORDS,
  ECON_REGION_TICKERS,
} from "@/data/econNavRegions";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { NewsArticleCard } from "@/components/NewsArticleCard";
import { ECONOMY_TIER_LABELS } from "@/lib/news/mediaTiers";
import { useLocale } from "@/contexts/LocaleContext";
import { localizedDisplayText, useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";

type EconomyRegionPanelProps = {
  selection: NavSelection;
  onClose: () => void;
  onOpenIntel: () => void;
};

function matchesRegionKeywords(text: string, keywords: string[]): boolean {
  const blob = text.toLowerCase();
  return keywords.some((kw) => blob.includes(kw.toLowerCase()));
}

export function EconomyRegionPanel({
  selection,
  onClose,
  onOpenIntel,
}: EconomyRegionPanelProps) {
  const { lang } = useLocale();
  const { payload } = useNewsStreamContext();
  const tickers = ECON_REGION_TICKERS[selection.id];

  const articles = useMemo(() => {
    const keywords = ECON_REGION_KEYWORDS[selection.id] ?? [
      selection.label,
      ...(selection.parentLabel ? [selection.parentLabel] : []),
    ];
    if (!payload) return [];
    const all = [...payload.verified, ...payload.stateMedia].filter(
      (item) => item.feedTopic === "economy",
    );
    return all
      .filter((item) =>
        matchesRegionKeywords(`${item.title} ${item.summary ?? ""} ${item.source}`, keywords),
      )
      .slice(0, 12);
  }, [payload, selection.id, selection.label, selection.parentLabel]);

  const tier1 = articles.filter((a) => a.trustTier === 1);
  const tier2 = articles.filter((a) => a.trustTier === 2);
  const tier3 = articles.filter((a) => a.trustTier === 3);

  const koreanEntries = useMemo(() => {
    const entries: Array<{ key: string; text: string }> = [];
    for (const item of articles) {
      entries.push({ key: `title:${item.id}`, text: item.title });
      if (item.summary) entries.push({ key: `summary:${item.id}`, text: item.summary });
    }
    return entries;
  }, [articles]);
  const localizedMap = useLocalizedTextMap(koreanEntries, lang);

  const renderCard = (item: (typeof articles)[number], tier3Card?: boolean) => (
    <NewsArticleCard
      key={item.id}
      item={item}
      economyMode
      tier3={tier3Card}
      titleOverride={localizedDisplayText(localizedMap, `title:${item.id}`, item.title)}
      summaryOverride={
        item.summary
          ? localizedDisplayText(localizedMap, `summary:${item.id}`, item.summary)
          : undefined
      }
    />
  );

  return (
    <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-30 flex h-full w-[min(100%,380px)] flex-col overflow-hidden border-l border-emerald-800/40 bg-[#071018]/95 p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-400/15 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/70">Geo Markets</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-50">{selection.label}</h2>
          {selection.parentLabel ? (
            <p className="text-[11px] text-emerald-100/45">{selection.parentLabel}</p>
          ) : null}
          <p className="mt-1.5 text-[12px] leading-5 text-emerald-100/65">{selection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-emerald-200/15 px-2 py-1 text-xs text-emerald-100/80 transition hover:text-emerald-50"
          aria-label="패널 닫기"
        >
          ✕
        </button>
      </div>

      {tickers ? (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-950/25 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/55">관련 시장</p>
          <p className="mt-1 text-sm font-medium text-emerald-50">{tickers}</p>
        </div>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {articles.length === 0 ? (
          <p className="py-8 text-center text-sm text-emerald-100/45">
            이 구역 관련 경제 RSS가 아직 없습니다.
            <br />
            <button
              type="button"
              onClick={onOpenIntel}
              className="mt-2 text-emerald-300 underline-offset-2 hover:underline"
            >
              전체 경제 Intel 열기
            </button>
          </p>
        ) : (
          <div className="space-y-4">
            {tier1.length > 0 ? (
              <section>
                <p className="text-xs font-semibold text-emerald-50">
                  {ECONOMY_TIER_LABELS[1].label}
                </p>
                <p className="text-[10px] text-emerald-100/45">{ECONOMY_TIER_LABELS[1].detail}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {tier1.map((item) => renderCard(item))}
                </div>
              </section>
            ) : null}
            {tier2.length > 0 ? (
              <section>
                <p className="text-xs font-semibold text-emerald-50">
                  {ECONOMY_TIER_LABELS[2].label}
                </p>
                <p className="text-[10px] text-emerald-100/45">{ECONOMY_TIER_LABELS[2].detail}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {tier2.map((item) => renderCard(item))}
                </div>
              </section>
            ) : null}
            {tier3.length > 0 ? (
              <section>
                <p className="text-xs font-semibold text-emerald-50">
                  {ECONOMY_TIER_LABELS[3].label}
                </p>
                <p className="text-[10px] text-emerald-100/45">{ECONOMY_TIER_LABELS[3].detail}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {tier3.map((item) => renderCard(item, true))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenIntel}
        className="mt-3 w-full rounded-xl border border-emerald-400/30 bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/25"
      >
        📈 전체 경제 Intel
      </button>
    </aside>
  );
}
