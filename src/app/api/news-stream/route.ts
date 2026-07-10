import { NextResponse } from "next/server";
import { buildNewsStream } from "@/lib/news/pipeline";
import { translateNewsStreamPayload } from "@/lib/news/translateNews";
import type { NewsStreamPayload, NewsTheater } from "@/lib/news/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 90_000;
let cache: { at: number; payload: NewsStreamPayload } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
      });
    }

    const payload = await translateNewsStreamPayload(await buildNewsStream());
    cache = { at: now, payload };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "뉴스 스트림 로드 실패";
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        hero: null,
        verified: [],
        stateMedia: [],
        stats: { total: 0, tier1: 0, tier2: 0, tier3: 0, theaters: {} as Record<NewsTheater, number> },
        error: message,
      } satisfies NewsStreamPayload,
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
