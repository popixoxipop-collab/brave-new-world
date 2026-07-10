import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { fetchStockTickers } from "@/lib/stockTickersFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Yahoo Finance IP 차단 방지 — 10분 서버 메모리 캐시 */
const TTL_MS = 10 * 60 * 1000;

export async function GET() {
  try {
    const { data, cached } = await cachedFetchJson("stock-tickers-v3", TTL_MS, fetchStockTickers);
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      tickers: data,
      attribution: "Yahoo Finance (via yahoo-finance2)",
    });
  } catch (error) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached: false,
        tickers: [],
        error: error instanceof Error ? error.message : "stock-tickers failed",
      },
      { status: 502 },
    );
  }
}
