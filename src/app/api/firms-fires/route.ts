import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import {
  buildFirmsAreaUrl,
  clampBbox,
  getFirmsMapKey,
  isFirmsLiveEnabled,
  parseFirmsCsv,
} from "@/lib/firmsParse";
import { readFirmsFromD1 } from "@/lib/d1LiveSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 3 * 60 * 1000;
/** 클라이언트 firmsLiveFetchMax와 맞춤 — query max 무시 상한 */
const FIRMS_SERVER_HARD_CAP = 900;

function parseBBox(searchParams: URLSearchParams) {
  const west = Number(searchParams.get("west"));
  const south = Number(searchParams.get("south"));
  const east = Number(searchParams.get("east"));
  const north = Number(searchParams.get("north"));
  if ([west, south, east, north].every(Number.isFinite)) {
    return clampBbox(west, south, east, north);
  }
  return clampBbox(-180, -90, 180, 90);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bbox = parseBBox(searchParams);
  const dayRange = Math.min(5, Math.max(1, Number(searchParams.get("days") || 1)));
  const source = searchParams.get("source") || "VIIRS_SNPP_NRT";
  const max = Math.min(
    Number(searchParams.get("max") || FIRMS_SERVER_HARD_CAP),
    FIRMS_SERVER_HARD_CAP,
  );
  const preferLive = searchParams.get("live") === "1";

  // Cron → D1 스냅샷 우선 (NASA 중복 호출·CSV 파싱 생략)
  if (!preferLive) {
    const fromD1 = await readFirmsFromD1({ ...bbox, max });
    if (fromD1 && fromD1.count > 0) {
      return NextResponse.json({
        receivedAt: fromD1.receivedAt,
        cached: true,
        count: fromD1.count,
        fires: fromD1.fires,
        source: "d1",
        bbox,
        attribution: "NASA FIRMS (via Cloudflare D1 cron ingest)",
      });
    }
  }

  if (!isFirmsLiveEnabled()) {
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      fires: [],
      count: 0,
      stub: true,
      error: "FIRMS_MAP_KEY 또는 NASA_FIRMS_API_KEY가 서버 환경변수에 없습니다.",
    });
  }

  const mapKey = getFirmsMapKey()!;
  const cacheKey = `firms:${source}:${bbox.west.toFixed(1)},${bbox.south.toFixed(1)},${bbox.east.toFixed(1)},${bbox.north.toFixed(1)}:${dayRange}`;

  try {
    const { data, cached } = await cachedFetchJson(cacheKey, TTL_MS, async () => {
      const url = buildFirmsAreaUrl({ mapKey, ...bbox, dayRange, source });
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "text/csv" },
      });
      const csv = await response.text();
      if (!response.ok) {
        throw new Error(`FIRMS HTTP ${response.status}: ${csv.slice(0, 160)}`);
      }
      const head = csv.trim().slice(0, 120).toLowerCase();
      if (
        head.startsWith("<!DOCTYPE") ||
        head.includes("invalid") ||
        head.includes("error") ||
        head.includes("unauthorized") ||
        !head.includes("latitude")
      ) {
        throw new Error(`FIRMS unexpected response: ${csv.trim().slice(0, 160)}`);
      }
      return parseFirmsCsv(csv, max);
    });

    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      count: data.length,
      fires: data,
      source,
      bbox,
      attribution: "NASA FIRMS",
    });
  } catch (error) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        fires: [],
        count: 0,
        error: error instanceof Error ? error.message : "FIRMS fetch failed",
      },
      { status: 502 },
    );
  }
}
