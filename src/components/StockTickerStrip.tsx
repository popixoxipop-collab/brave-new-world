"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatTickerChangePercent,
  formatTickerPrice,
  STOCK_TICKER_SYMBOLS,
  tickerChangeTone,
  type StockTickerItem,
} from "@/lib/stockTickers";

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
}: {
  data: number[];
  tone: keyof typeof SPARKLINE_STROKE;
}) {
  const width = 52;
  const height = 18;

  if (data.length < 2) {
    return <span className="inline-block h-[18px] w-[52px] shrink-0 rounded bg-white/5" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={SPARKLINE_STROKE[tone]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function SkeletonStrip() {
  return (
    <div className="flex h-10 min-w-0 items-center gap-4 overflow-hidden px-3">
      {STOCK_TICKER_SYMBOLS.map((item) => (
        <div key={item.symbol} className="flex shrink-0 items-center gap-2">
          <span className="h-3 w-12 animate-pulse rounded bg-white/10" />
          <span className="h-[18px] w-[52px] animate-pulse rounded bg-white/10" />
          <span className="h-3 w-16 animate-pulse rounded bg-white/10" />
          <span className="h-3 w-10 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function TickerRow({ item }: { item: StockTickerItem }) {
  const tone = tickerChangeTone(item.changePercent);
  const changeText = formatTickerChangePercent(item.changePercent);

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span className="text-slate-300">{item.label}</span>
      <TickerSparkline data={item.sparkline} tone={tone} />
      <span className="text-slate-100">{formatTickerPrice(item.price)}</span>
      <span className={TONE_CLASS[tone]}>{changeText}</span>
    </span>
  );
}

export function StockTickerStrip() {
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

  return (
    <div
      className="pointer-events-auto h-10 w-full overflow-hidden border-y border-white/10 bg-[#0b0c10]/60 backdrop-blur-md"
      aria-label="글로벌 매크로·주요 증시 티커"
    >
      {loading && !tickers ? (
        <SkeletonStrip />
      ) : (
        <div className="stock-ticker-scroll flex h-10 items-center gap-5 overflow-x-auto px-3 text-xs font-mono">
          {(
            tickers ??
            STOCK_TICKER_SYMBOLS.map((item) => ({
              ...item,
              price: null,
              changePercent: null,
              sparkline: [],
            }))
          ).map((item) => (
            <TickerRow key={item.symbol} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
