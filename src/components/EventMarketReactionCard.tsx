"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { formatTickerChangePercent, tickerChangeTone, type MarketReactionItem } from "@/lib/stockTickers";
import type { TheaterMarketFilter } from "@/lib/theaterAssets";

type EventMarketReactionCardProps = {
  theater: TheaterMarketFilter;
  ageMinutes: number;
};

const TONE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
} as const;

/**
 * "이 사건 이후" 관련 종목 변동 — 사건 시점 가격과 지금 가격을 비교한 실제 반응.
 * IntelRelatedMarketsPanel의 "지금 이 전장 연관 종목"(정적 태깅)과 달리,
 * 이 카드는 이 히어로 사건의 발생 시각을 앵커로 잡은 사건-종목 인과 표시다.
 */
export function EventMarketReactionCard({ theater, ageMinutes }: EventMarketReactionCardProps) {
  const { lang } = useLocale();
  const [items, setItems] = useState<MarketReactionItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      theater,
      ageMinutes: String(Math.round(ageMinutes)),
    });
    fetch(`/api/stock-tickers/reaction?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { items?: MarketReactionItem[] }) => {
        if (!cancelled) setItems(payload.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [theater, ageMinutes]);

  const withData = (items ?? []).filter((item) => item.changePercentSinceEvent !== null);
  if (items !== null && withData.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/8 bg-black/15 px-3 py-1.5">
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {lang === "en" ? "Since this event" : "이 사건 이후"}
      </span>
      {items === null ? (
        <span className="text-[10px] text-slate-600">…</span>
      ) : (
        withData.map((item) => {
          const tone = tickerChangeTone(item.changePercentSinceEvent);
          return (
            <span
              key={item.symbol}
              className={`font-mono text-[11px] font-semibold ${TONE_CLASS[tone]}`}
            >
              {item.symbol} {formatTickerChangePercent(item.changePercentSinceEvent)}
            </span>
          );
        })
      )}
    </div>
  );
}
