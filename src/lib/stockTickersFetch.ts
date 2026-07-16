import YahooFinance from "yahoo-finance2";
import {
  STOCK_TICKER_SYMBOLS,
  type StockTickerItem,
  type StockTickerSymbol,
} from "@/lib/stockTickers";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const LIVE_FETCH_TIMEOUT_MS = 20_000;

let inflightLiveFetch: Promise<StockTickerItem[]> | null = null;

/** stub 모드용 — Yahoo 호출 없이 UI 레이아웃만 유지 */
export function stubStockTickers(): StockTickerItem[] {
  return STOCK_TICKER_SYMBOLS.map((config) => ({
    symbol: config.symbol,
    label: config.label,
    price: null,
    changePercent: null,
    sparkline: [],
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeQuoteList(
  quotes: Awaited<ReturnType<typeof yahooFinance.quote>>,
): Array<Record<string, unknown>> {
  if (Array.isArray(quotes)) return quotes as Array<Record<string, unknown>>;
  if (quotes && typeof quotes === "object") return [quotes as Record<string, unknown>];
  return [];
}

function toTickerItem(
  config: StockTickerSymbol,
  quote: Record<string, unknown> | undefined,
  sparkline: number[],
): StockTickerItem {
  const priceRaw = quote?.regularMarketPrice;
  const changeRaw = quote?.regularMarketChangePercent;
  const price = typeof priceRaw === "number" && Number.isFinite(priceRaw) ? priceRaw : null;
  const changePercent =
    typeof changeRaw === "number" && Number.isFinite(changeRaw) ? changeRaw : null;

  return {
    symbol: config.symbol,
    label: config.label,
    price,
    changePercent,
    sparkline,
  };
}

/**
 * 사건(뉴스) 발생 시점 근처 종가 — "이 사건 이후 종목이 얼마나 움직였나" 계산용 앵커 가격.
 * chart() 15분봉에서 atMs와 가장 가까운 바를 고른다. 없으면 null(호출부에서 카드 숨김 처리).
 */
export async function fetchPriceNearTimestamp(
  symbol: string,
  atMs: number,
): Promise<number | null> {
  try {
    const period1 = new Date(atMs - 45 * 60 * 1000);
    const period2 = new Date(atMs + 45 * 60 * 1000);
    const chart = await yahooFinance.chart(symbol, { period1, period2, interval: "15m" });
    let closest: number | null = null;
    let closestDiff = Infinity;
    for (const bar of chart.quotes ?? []) {
      if (typeof bar.close !== "number" || !Number.isFinite(bar.close)) continue;
      const barDate = bar.date instanceof Date ? bar.date : new Date(bar.date as unknown as string);
      const diff = Math.abs(barDate.getTime() - atMs);
      if (diff < closestDiff) {
        closest = bar.close;
        closestDiff = diff;
      }
    }
    return closest;
  } catch {
    return null;
  }
}

async function fetchSparkline(symbol: string): Promise<number[]> {
  try {
    const chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      interval: "15m",
    });
    return (chart.quotes ?? [])
      .map((bar) => bar.close)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  } catch {
    return [];
  }
}

export async function fetchStockTickers(): Promise<StockTickerItem[]> {
  if (inflightLiveFetch) return inflightLiveFetch;

  inflightLiveFetch = withTimeout(fetchStockTickersLive(), LIVE_FETCH_TIMEOUT_MS, "yahoo-finance").finally(
    () => {
      inflightLiveFetch = null;
    },
  );

  return inflightLiveFetch;
}

async function fetchStockTickersLive(): Promise<StockTickerItem[]> {
  const symbols = STOCK_TICKER_SYMBOLS.map((item) => item.symbol);
  const [quotes, sparklines] = await Promise.all([
    yahooFinance.quote(symbols),
    Promise.all(STOCK_TICKER_SYMBOLS.map((config) => fetchSparkline(config.symbol))),
  ]);
  const quoteBySymbol = new Map<string, Record<string, unknown>>();

  for (const quote of normalizeQuoteList(quotes)) {
    const symbol = typeof quote.symbol === "string" ? quote.symbol : null;
    if (symbol) quoteBySymbol.set(symbol, quote);
  }

  return STOCK_TICKER_SYMBOLS.map((config, index) =>
    toTickerItem(config, quoteBySymbol.get(config.symbol), sparklines[index] ?? []),
  );
}
