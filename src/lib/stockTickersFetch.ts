import YahooFinance from "yahoo-finance2";
import {
  STOCK_TICKER_SYMBOLS,
  type StockTickerItem,
  type StockTickerSymbol,
} from "@/lib/stockTickers";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

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
