import { and, desc, gte, lte, sql } from "drizzle-orm";
import type { FirmsFire } from "@/data/geoTypes";
import { getDb } from "@/db";
import { firmsFires, gdeltPoints } from "@/db/schema";

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
