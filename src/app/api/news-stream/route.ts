import { NextResponse } from "next/server";
import { buildNewsStream } from "@/lib/news/pipeline";
import { translateNewsStreamPayload } from "@/lib/news/translateNews";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import type { ViewPackageId } from "@/lib/viewPackages";

/** RSS/GDELT only — Telegram OSINT must stay on /api/telegram-alerts (telegramOsintPolicy) */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 90_000;
const VALID_PACKAGES = new Set<ViewPackageId>([
  "conflict-watch",
  "geo-trader",
  "frontline-live",
  "custom",
]);

const cache = new Map<string, { at: number; payload: NewsStreamPayload }>();

function parsePackagesParam(raw: string | null): ViewPackageId[] | undefined {
  if (!raw) return undefined;
  const parsed = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is ViewPackageId => VALID_PACKAGES.has(part as ViewPackageId));
  return parsed.length > 0 ? parsed : undefined;
}

function parseLangParam(raw: string | null): LabelLanguage {
  return raw === "en" ? "en" : "ko";
}

function cacheKey(packages?: ViewPackageId[], lang: LabelLanguage = "ko"): string {
  const pkg = packages?.length ? packages.join(",") : "default";
  return `${pkg}:${lang}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const packages = parsePackagesParam(url.searchParams.get("packages"));
    const lang = parseLangParam(url.searchParams.get("lang"));
    const key = cacheKey(packages, lang);
    const now = Date.now();
    const hit = cache.get(key);

    if (hit && now - hit.at < CACHE_TTL_MS) {
      return NextResponse.json(hit.payload, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
      });
    }

    const payload = await translateNewsStreamPayload(await buildNewsStream({ packages }), lang);
    cache.set(key, { at: now, payload });

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
        stats: { total: 0, tier1: 0, tier2: 0, tier3: 0, economy: 0, theaters: {} as Record<NewsTheater, number> },
        error: message,
      } satisfies NewsStreamPayload,
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
