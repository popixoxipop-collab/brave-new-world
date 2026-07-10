import type { NewsTheater } from "@/lib/news/types";

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

/** 하단 스크롤 스트립 — 매크로·미국 지수 6종 (항상 우선 표시) */
export const TICKER_STRIP_SYMBOLS: string[] = [
  "^VIX",
  "BZ=F",
  "GC=F",
  "DX-Y.NYB",
  "^GSPC",
  "^IXIC",
];

export type MarketGroupId = "risk" | "commodities" | "us-equities" | "asia";

export const MARKET_GROUPS: Array<{ id: MarketGroupId; label: string; symbols: string[] }> = [
  { id: "risk", label: "리스크 · 달러", symbols: ["^VIX", "DX-Y.NYB"] },
  { id: "commodities", label: "에너지 · 금", symbols: ["BZ=F", "GC=F"] },
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

export type TheaterMarketFilter = NewsTheater | "all";

/** 전장별 우선 표시할 매크로·증시 심볼 (^VIX 등) */
export const THEATER_RELATED_SYMBOLS: Record<TheaterMarketFilter, string[]> = {
  all: ["^VIX", "BZ=F", "GC=F", "DX-Y.NYB", "^GSPC", "^IXIC"],
  "middle-east": ["BZ=F", "GC=F", "DX-Y.NYB", "^VIX", "^GSPC", "^IXIC"],
  "russia-ukraine": ["BZ=F", "GC=F", "^GSPC", "DX-Y.NYB", "^VIX", "^IXIC"],
  "china-taiwan": ["000001.SS", "^HSI", "^IXIC", "DX-Y.NYB", "^GSPC", "^VIX"],
  korea: ["^KS11", "^IXIC", "^HSI", "^VIX", "BZ=F", "^GSPC"],
  japan: ["^N225", "^HSI", "^IXIC", "^GSPC", "BZ=F", "^VIX"],
  "south-asia": ["BZ=F", "GC=F", "^HSI", "DX-Y.NYB", "^GSPC", "^VIX"],
  global: ["^VIX", "^GSPC", "^IXIC", "BZ=F", "GC=F", "DX-Y.NYB"],
};

const THEATER_MARKET_BLURB: Record<TheaterMarketFilter, string> = {
  all: "글로벌 리스크·에너지·주요 지수",
  "middle-east": "유가·금·달러 — 중동 리스크 프리미엄",
  "russia-ukraine": "유가·금·미국 지수 — 유럽 전쟁 프리미엄",
  "china-taiwan": "중국·홍콩·미국 기술주 — 대만해협 긴장",
  korea: "KOSPI·미국 지수 — 한반도·북핵 리스크",
  japan: "니케이·아시아 지수·유가 — 동북아 안보",
  "south-asia": "유가·금·인도 인접 시장",
  global: "방산·매크로 헤지 지표",
};

export function pickRelatedTickers(
  all: StockTickerItem[],
  filter: TheaterMarketFilter,
): StockTickerItem[] {
  const order = THEATER_RELATED_SYMBOLS[filter];
  const bySymbol = new Map(all.map((t) => [t.symbol, t]));
  return order.map((symbol) => bySymbol.get(symbol)).filter((t): t is StockTickerItem => t != null);
}

export function theaterMarketBlurb(filter: TheaterMarketFilter): string {
  return THEATER_MARKET_BLURB[filter];
}
