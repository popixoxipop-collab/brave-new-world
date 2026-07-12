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
  yahooQuoteUrl,
  type StockTickerItem,
  type TheaterMarketFilter,
} from "@/lib/stockTickers";
import { theaterAssetNote } from "@/lib/theaterAssets";
import { THEATER_CHIP_LABELS, type IntelTheaterFilter } from "@/lib/news/theaterMap";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import { loadWatchSymbols, toggleWatchSymbol } from "@/lib/watchlistPrefs";
import { useLocale } from "@/contexts/LocaleContext";

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

function MarketCard({
  item,
  highlight,
  watched,
  onToggleWatch,
  watchLabel,
  unwatchLabel,
  yahooLabel,
}: {
  item: StockTickerItem;
  highlight?: boolean;
  watched?: boolean;
  onToggleWatch?: (symbol: string) => void;
  watchLabel: string;
  unwatchLabel: string;
  yahooLabel: string;
}) {
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
        <div className="flex shrink-0 items-center gap-1">
          {onToggleWatch ? (
            <button
              type="button"
              onClick={() => onToggleWatch(item.symbol)}
              aria-label={watched ? unwatchLabel : watchLabel}
              className={`rounded px-1.5 py-0.5 text-xs transition ${
                watched
                  ? "bg-amber-400/20 text-amber-200"
                  : "text-slate-500 hover:bg-white/10 hover:text-amber-200"
              }`}
            >
              {watched ? "★" : "☆"}
            </button>
          ) : null}
          <span className={`text-xs font-mono font-semibold ${TONE_CLASS[tone]}`}>
            {formatTickerChangePercent(item.changePercent)}
          </span>
        </div>
      </div>
      <TickerSparkline data={item.sparkline} tone={tone} large />
      <div className="flex items-end justify-between gap-2">
        <span className="font-mono text-base font-medium text-slate-50">
          {formatTickerPrice(item.price)}
        </span>
        <a
          href={yahooQuoteUrl(item.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[10px] text-emerald-300/80 underline-offset-2 hover:text-emerald-200 hover:underline"
          title={yahooLabel}
        >
          {item.symbol} ↗
        </a>
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
  /** 경제 뉴스 시트 상단 — 증시 + RSS 통합 */
  embedInNews?: boolean;
  /** 키워드 필터 (symbol·label) */
  searchQuery?: string;
};

function matchesTickerSearch(item: StockTickerItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.label.toLowerCase().includes(q) || item.symbol.toLowerCase().includes(q);
}

export function IntelRelatedMarketsPanel({
  theaterFilter,
  fullPage = false,
  embedInNews = false,
  searchQuery = "",
}: IntelRelatedMarketsPanelProps) {
  const { lang, t } = useLocale();
  const [tickers, setTickers] = useState<StockTickerItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchSymbols, setWatchSymbols] = useState<string[]>([]);

  useEffect(() => {
    setWatchSymbols(loadWatchSymbols());
  }, []);

  const handleToggleWatch = useCallback((symbol: string) => {
    setWatchSymbols(toggleWatchSymbol(symbol));
  }, []);

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
    const timer = window.setInterval(() => void refresh(), liveTickerPollMs());
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
  const filteredRelated = useMemo(
    () => related.filter((item) => matchesTickerSearch(item, searchQuery)),
    [related, searchQuery],
  );
  const watchItems = useMemo(
    () =>
      watchSymbols
        .map((symbol) => bySymbol.get(symbol))
        .filter((t): t is StockTickerItem => t != null),
    [watchSymbols, bySymbol],
  );
  const hasSearch = searchQuery.trim().length > 0;

  const titleSuffix =
    theaterFilter === "all" ? "" : ` · ${THEATER_CHIP_LABELS[theaterFilter]}`;

  const cardProps = {
    onToggleWatch: handleToggleWatch,
    watchLabel: t("addWatch"),
    unwatchLabel: t("removeWatch"),
    yahooLabel: t("openYahoo"),
  };

  const marketBody = (
    <>
      <div
        className={`border-b border-emerald-400/15 px-4 py-3 ${
          embedInNews ? "bg-emerald-950/30" : "bg-emerald-950/25"
        }`}
      >
        <p className={`font-semibold text-emerald-50 ${embedInNews ? "text-sm" : "text-sm"}`}>
          {embedInNews ? "증시 · 매크로" : `지정학 연관 증시${titleSuffix}`}
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-200/60">
          {theaterAssetNote(marketFilter, lang)}
          {embedInNews ? " · 경제 RSS와 함께 표시" : " · 분쟁·긴장 이벤트와 연동되는 매크로·지수·원자재"}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">{t("marketsNotAdvice")}</p>
      </div>

      <div className={`space-y-5 ${embedInNews ? "px-3 py-3" : "px-4 py-4"}`}>
        {!hasSearch ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300/90">
              {t("watchlistLabel")}
            </h3>
            {watchItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {watchItems.map((item) => (
                  <MarketCard
                    key={`watch-${item.symbol}`}
                    item={item}
                    highlight
                    watched
                    {...cardProps}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">{t("watchlistEmpty")}</p>
            )}
          </section>
        ) : null}

        {hasSearch ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
              검색 결과
            </h3>
            {loading && !tickers ? (
              <SkeletonGrid count={4} />
            ) : filteredRelated.length > 0 || allTickers.some((t) => matchesTickerSearch(t, searchQuery)) ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {allTickers
                  .filter((item) => matchesTickerSearch(item, searchQuery))
                  .map((item) => (
                    <MarketCard
                      key={item.symbol}
                      item={item}
                      highlight={relatedSet.has(item.symbol)}
                      watched={watchSymbols.includes(item.symbol)}
                      {...cardProps}
                    />
                  ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                &quot;{searchQuery.trim()}&quot; 검색 결과가 없습니다.
              </p>
            )}
          </section>
        ) : null}

        {!hasSearch && theaterFilter !== "all" && related.length > 0 ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
              이 전장 핵심 연관
            </h3>
            {loading && !tickers ? (
              <SkeletonGrid count={related.length} />
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {related.map((item) => (
                  <MarketCard
                    key={item.symbol}
                    item={item}
                    highlight
                    watched={watchSymbols.includes(item.symbol)}
                    {...cardProps}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!hasSearch
          ? MARKET_GROUPS.map((group) => {
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
                          watched={watchSymbols.includes(item.symbol)}
                          {...cardProps}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          : null}
      </div>

      <p className={`text-[10px] text-slate-500 ${embedInNews ? "px-3 pb-3" : "px-4 pb-4"}`}>
        Yahoo Finance · 10분 캐시 · {t("marketsNotAdvice")}
      </p>
    </>
  );

  if (fullPage || embedInNews) {
    return (
      <div
        className={
          embedInNews
            ? "overflow-y-auto"
            : "flex min-h-0 flex-1 flex-col overflow-y-auto"
        }
      >
        {marketBody}
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
              <MarketCard
                key={item.symbol}
                item={item}
                watched={watchSymbols.includes(item.symbol)}
                {...cardProps}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] text-slate-500">Yahoo Finance · 10분 캐시</p>
      </div>
    </section>
  );
}
