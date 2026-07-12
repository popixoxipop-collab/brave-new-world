import {
  theaterAssetNote,
  theaterAssetSymbols,
  type TheaterMarketFilter,
} from "@/lib/theaterAssets";

export type { TheaterMarketFilter } from "@/lib/theaterAssets";
export {
  THEATER_ASSETS,
  theaterAssetNote,
  theaterAssetSymbols,
  yahooQuoteUrl,
  tradingViewSymbolUrl,
} from "@/lib/theaterAssets";

export type StockTickerSymbol = {
  symbol: string;
  label: string;
};

export type StockTickerItem = {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
  /** 최근 2일 15분봉 종가 — 미니 스파크라인용 */
  sparkline: number[];
};

/**
 * Yahoo Finance — API 키 없이 동작 검증된 심볼만 (Massive 무료 미지원 아시아·원자재 대체).
 * @see `/api/stock-tickers` · `yahoo-finance2`
 */
export const STOCK_TICKER_SYMBOLS: StockTickerSymbol[] = [
  { symbol: "^VIX", label: "VIX" },
  { symbol: "CL=F", label: "WTI" },
  { symbol: "BZ=F", label: "Brent" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "DX-Y.NYB", label: "DXY" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "NASDAQ" },
  { symbol: "^N225", label: "Nikkei" },
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^HSI", label: "Hang Seng" },
  { symbol: "000001.SS", label: "Shanghai" },
];

/** 하단 스크롤 스트립 — 매크로·에너지·미국 지수 (지정학 트레이더 우선) */
export const TICKER_STRIP_SYMBOLS: string[] = [
  "^VIX",
  "CL=F",
  "BZ=F",
  "GC=F",
  "DX-Y.NYB",
  "^GSPC",
  "^IXIC",
];

export type MarketGroupId = "risk" | "commodities" | "us-equities" | "asia";

export const MARKET_GROUPS: Array<{ id: MarketGroupId; label: string; symbols: string[] }> = [
  { id: "risk", label: "리스크 · 달러", symbols: ["^VIX", "DX-Y.NYB"] },
  { id: "commodities", label: "에너지 · 금", symbols: ["CL=F", "BZ=F", "GC=F"] },
  { id: "us-equities", label: "미국 지수", symbols: ["^GSPC", "^IXIC"] },
  { id: "asia", label: "아시아 지수", symbols: ["^N225", "^KS11", "^HSI", "000001.SS"] },
];

export function formatTickerPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 10_000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(2);
}

export function formatTickerChangePercent(changePercent: number | null): string {
  if (changePercent === null) return "—";
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
}

export function tickerChangeTone(changePercent: number | null): "up" | "down" | "flat" {
  if (changePercent === null || Math.abs(changePercent) < 0.05) return "flat";
  return changePercent > 0 ? "up" : "down";
}

/** @deprecated Prefer theaterAssetSymbols — kept for existing imports */
export const THEATER_RELATED_SYMBOLS: Record<TheaterMarketFilter, string[]> = {
  all: theaterAssetSymbols("all"),
  "middle-east": theaterAssetSymbols("middle-east"),
  "russia-ukraine": theaterAssetSymbols("russia-ukraine"),
  "china-taiwan": theaterAssetSymbols("china-taiwan"),
  korea: theaterAssetSymbols("korea"),
  japan: theaterAssetSymbols("japan"),
  "south-asia": theaterAssetSymbols("south-asia"),
  global: theaterAssetSymbols("global"),
};

export function pickRelatedTickers(
  all: StockTickerItem[],
  filter: TheaterMarketFilter,
): StockTickerItem[] {
  const order = theaterAssetSymbols(filter);
  const bySymbol = new Map(all.map((t) => [t.symbol, t]));
  return order.map((symbol) => bySymbol.get(symbol)).filter((t): t is StockTickerItem => t != null);
}

export function theaterMarketBlurb(filter: TheaterMarketFilter): string {
  return theaterAssetNote(filter, "ko");
}
