import { and, desc, gte, lte, sql } from "drizzle-orm";
import type { FirmsFire } from "@/data/geoTypes";
import { getDb } from "@/db";
import { firmsFires, gdeltPoints, telegramAlerts } from "@/db/schema";
import type { TelegramAlert, TelegramAlertRegion } from "@/lib/telegramAlerts";

export type D1FirmsSnapshot = {
  fires: FirmsFire[];
  count: number;
  source: "d1";
  receivedAt: string;
};

/** Cron ingest 된 FIRMS를 D1에서 읽어 NASA 재호출을 피한다. */
export async function readFirmsFromD1(options: {
  west: number;
  south: number;
  east: number;
  north: number;
  max: number;
}): Promise<D1FirmsSnapshot | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(firmsFires)
      .where(
        and(
          gte(firmsFires.lat, options.south),
          lte(firmsFires.lat, options.north),
          gte(firmsFires.lng, options.west),
          lte(firmsFires.lng, options.east),
        ),
      )
      .orderBy(desc(firmsFires.ingestedAt))
      .limit(options.max);

    if (rows.length === 0) return null;

    return {
      source: "d1",
      receivedAt: new Date().toISOString(),
      count: rows.length,
      fires: rows.map((row) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        frp: row.frp,
        brightness: row.brightness,
        confidence: row.confidence,
        acqDate: row.acqDate,
        acqTime: row.acqTime,
        satellite: row.satellite,
        daynight: row.daynight,
      })),
    };
  } catch {
    return null;
  }
}

export type D1GdeltSnapshot = {
  events: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string | null;
    url: string | null;
    mentionCount: number | null;
    queryTag: string | null;
  }>;
  count: number;
  source: "d1";
  fetchedAt: string;
};

/** Cron GDELT Geo 포인트를 D1에서 읽어 ZIP 파싱을 피한다. */
export async function readGdeltPointsFromD1(max = 1200): Promise<D1GdeltSnapshot | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(gdeltPoints)
      .orderBy(desc(gdeltPoints.ingestedAt))
      .limit(max);

    if (rows.length === 0) return null;

    return {
      source: "d1",
      fetchedAt: new Date().toISOString(),
      count: rows.length,
      events: rows.map((row) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        name: row.name,
        url: row.url,
        mentionCount: row.mentionCount,
        queryTag: row.queryTag,
      })),
    };
  } catch {
    return null;
  }
}

const DEFAULT_INGEST_URL = "https://conflict-view-ingest.kangps7675.workers.dev";

/** cron 워커 공개 엔드포인트 베이스 URL (Vercel 등 D1 바인딩 없는 호스팅용) */
export function ingestWorkerBase(): string | null {
  const raw = (
    process.env.TELEGRAM_INGEST_URL ||
    process.env.INGEST_WORKER_URL ||
    DEFAULT_INGEST_URL
  )
    .trim()
    .replace(/\/$/, "");
  return raw || null;
}

/** Vercel 등에서 D1 바인딩 대신 cron 워커 /firms 로 산불을 읽는다. */
export async function readFirmsFromIngestWorker(options: {
  west: number;
  south: number;
  east: number;
  north: number;
  max: number;
}): Promise<D1FirmsSnapshot | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  try {
    const qs = new URLSearchParams({
      west: String(options.west),
      south: String(options.south),
      east: String(options.east),
      north: String(options.north),
      max: String(options.max),
    });
    const res = await fetch(`${base}/firms?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { fires?: FirmsFire[] };
    if (!Array.isArray(payload.fires) || payload.fires.length === 0) return null;
    return {
      source: "d1",
      receivedAt: new Date().toISOString(),
      count: payload.fires.length,
      fires: payload.fires,
    };
  } catch {
    return null;
  }
}

/** Vercel 등에서 D1 바인딩 대신 cron 워커 /gdelt 로 긴장 포인트를 읽는다. */
export async function readGdeltFromIngestWorker(max = 1200): Promise<D1GdeltSnapshot | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/gdelt?limit=${max}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      events?: Array<{
        id: string;
        lat: number;
        lng: number;
        name: string | null;
        url: string | null;
        mentionCount: number | null;
        queryTag: string | null;
      }>;
    };
    if (!Array.isArray(payload.events) || payload.events.length === 0) return null;
    return {
      source: "d1",
      fetchedAt: new Date().toISOString(),
      count: payload.events.length,
      events: payload.events.map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        name: e.name,
        url: e.url,
        mentionCount: e.mentionCount,
        queryTag: e.queryTag,
      })),
    };
  } catch {
    return null;
  }
}

export type D1TelegramSnapshot = {
  alerts: TelegramAlert[];
  count: number;
  source: "d1";
  fetchedAt: string;
};

/** Cron 워커가 적재한 텔레그램 속보를 D1에서 읽는다 (Cloudflare 배포 시). */
export async function readTelegramAlertsFromD1(
  max = 200,
): Promise<D1TelegramSnapshot | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(telegramAlerts)
      .orderBy(desc(telegramAlerts.receivedAt))
      .limit(max);

    if (rows.length === 0) return null;

    return {
      source: "d1",
      fetchedAt: new Date().toISOString(),
      count: rows.length,
      alerts: rows.map((row) => ({
        id: row.id,
        channelUsername: row.channelUsername,
        channelTitle: row.channelTitle ?? row.channelUsername,
        region: (row.region as TelegramAlertRegion) || "global",
        text: row.text,
        receivedAt: row.receivedAt,
        messageUrl: row.messageUrl,
      })),
    };
  } catch {
    return null;
  }
}

/** D1 행 존재 여부만 빠르게 확인 */
export async function d1HasFirmsRows(): Promise<boolean> {
  try {
    const db = await getDb();
    const row = await db
      .select({ n: sql<number>`count(*)` })
      .from(firmsFires)
      .limit(1);
    return Number(row[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}
