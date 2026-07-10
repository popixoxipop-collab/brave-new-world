"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatTickerChangePercent,
  formatTickerPrice,
  MARKET_GROUPS,
  pickRelatedTickers,
  STOCK_TICKER_SYMBOLS,
  theaterMarketBlurb,
  tickerChangeTone,
  type StockTickerItem,
  type TheaterMarketFilter,
} from "@/lib/stockTickers";
import { THEATER_CHIP_LABELS, type IntelTheaterFilter } from "@/lib/news/theaterMap";

const POLL_MS = 10 * 60 * 1000;

type StockTickersResponse = {
  tickers?: StockTickerItem[];
  error?: string;
};

const TONE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
} as const;

const SPARKLINE_STROKE = {
  up: "#34d399",
  down: "#fb7185",
  flat: "#94a3b8",
} as const;

function TickerSparkline({
  data,
  tone,
  large,
}: {
  data: number[];
  tone: keyof typeof SPARKLINE_STROKE;
  large?: boolean;
}) {
  const width = large ? 120 : 72;
  const height = large ? 36 : 28;

  if (data.length < 2) {
    return <span className={`block w-full rounded bg-white/5 ${large ? "h-9" : "h-7"}`} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={SPARKLINE_STROKE[tone]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function MarketCard({ item, highlight }: { item: StockTickerItem; highlight?: boolean }) {
  const tone = tickerChangeTone(item.changePercent);

  return (
    <div
      className={`flex min-w-0 flex-col gap-2 rounded-xl border px-3 py-3 ${
        highlight
          ? "border-emerald-400/35 bg-emerald-950/30 shadow-[0_0_20px_rgba(52,211,153,0.08)]"
          : "border-emerald-400/15 bg-black/25"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-emerald-50/95">{item.label}</span>
        <span className={`shrink-0 text-xs font-mono font-semibold ${TONE_CLASS[tone]}`}>
          {formatTickerChangePercent(item.changePercent)}
        </span>
      </div>
      <TickerSparkline data={item.sparkline} tone={tone} large />
      <div className="flex items-end justify-between gap-2">
        <span className="font-mono text-base font-medium text-slate-50">
          {formatTickerPrice(item.price)}
        </span>
        <span className="truncate text-[10px] text-slate-500">{item.symbol}</span>
      </div>
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-[108px] animate-pulse rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

type IntelRelatedMarketsPanelProps = {
  theaterFilter: IntelTheaterFilter;
  fullPage?: boolean;
};

export function IntelRelatedMarketsPanel({
  theaterFilter,
  fullPage = false,
}: IntelRelatedMarketsPanelProps) {
  const [tickers, setTickers] = useState<StockTickerItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stock-tickers", { cache: "no-store" });
      const payload = (await res.json()) as StockTickersResponse;
      if (res.ok && Array.isArray(payload.tickers) && payload.tickers.length > 0) {
        setTickers(payload.tickers);
      }
    } catch {
      // keep last good values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const marketFilter = theaterFilter as TheaterMarketFilter;
  const allTickers = useMemo(
    () =>
      tickers ??
      STOCK_TICKER_SYMBOLS.map((item) => ({
        ...item,
        price: null,
        changePercent: null,
        sparkline: [],
      })),
    [tickers],
  );

  const bySymbol = useMemo(() => new Map(allTickers.map((t) => [t.symbol, t])), [allTickers]);
  const related = pickRelatedTickers(allTickers, marketFilter);
  const relatedSet = useMemo(() => new Set(related.map((t) => t.symbol)), [related]);

  const titleSuffix =
    theaterFilter === "all" ? "" : ` · ${THEATER_CHIP_LABELS[theaterFilter]}`;

  if (fullPage) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-emerald-400/15 bg-emerald-950/25 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-50">지정학 연관 증시{titleSuffix}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-200/60">
            {theaterMarketBlurb(marketFilter)} · 분쟁·긴장 이벤트와 연동되는 매크로·지수·원자재
          </p>
        </div>

        <div className="space-y-5 px-4 py-4">
          {theaterFilter !== "all" && related.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                이 전장 핵심 연관
              </h3>
              {loading && !tickers ? (
                <SkeletonGrid count={related.length} />
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {related.map((item) => (
                    <MarketCard key={item.symbol} item={item} highlight />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {MARKET_GROUPS.map((group) => {
            const items = group.symbols
              .map((symbol) => bySymbol.get(symbol))
              .filter((t): t is StockTickerItem => t != null);
            if (items.length === 0) return null;

            return (
              <section key={group.id}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h3>
                {loading && !tickers ? (
                  <SkeletonGrid count={items.length} />
                ) : (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {items.map((item) => (
                      <MarketCard
                        key={item.symbol}
                        item={item}
                        highlight={theaterFilter !== "all" && relatedSet.has(item.symbol)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <p className="px-4 pb-4 text-[10px] text-slate-500">Yahoo Finance · 10분 캐시</p>
      </div>
    );
  }

  return (
    <section className="shrink-0 border-t-2 border-emerald-400/25 bg-emerald-950/20">
      <div className="border-b border-emerald-400/15 px-4 py-2.5">
        <p className="text-xs font-semibold text-emerald-100">주요 연관 증시{titleSuffix}</p>
        <p className="mt-0.5 text-[11px] text-emerald-200/55">{theaterMarketBlurb(marketFilter)}</p>
      </div>
      <div className="px-4 py-3">
        {loading && !tickers ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {related.map((item) => (
              <MarketCard key={item.symbol} item={item} />
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] text-slate-500">Yahoo Finance · 10분 캐시</p>
      </div>
    </section>
  );
}
