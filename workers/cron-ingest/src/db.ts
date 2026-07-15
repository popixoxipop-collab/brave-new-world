import type { FirmsFireRow, GdeltPointRow, IngestEnv, TelegramAlertRow } from "./env";

const INSERT_CHUNK = 40;

function nowIso() {
  return new Date().toISOString();
}

export async function upsertFirmsFires(db: D1Database, fires: FirmsFireRow[]) {
  if (fires.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < fires.length; i += INSERT_CHUNK) {
    const chunk = fires.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((fire) =>
      db
        .prepare(
          `INSERT INTO firms_fires (
            id, lat, lng, frp, brightness, confidence,
            acq_date, acq_time, satellite, daynight, source, theater, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            frp = excluded.frp,
            brightness = excluded.brightness,
            confidence = excluded.confidence,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          fire.id,
          fire.lat,
          fire.lng,
          fire.frp,
          fire.brightness,
          fire.confidence,
          fire.acq_date,
          fire.acq_time,
          fire.satellite,
          fire.daynight,
          fire.source,
          fire.theater,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function upsertGdeltPoints(db: D1Database, points: GdeltPointRow[]) {
  if (points.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < points.length; i += INSERT_CHUNK) {
    const chunk = points.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((point) =>
      db
        .prepare(
          `INSERT INTO gdelt_points (
            id, lat, lng, name, url, mention_count, share_image, query_tag, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            url = excluded.url,
            mention_count = excluded.mention_count,
            share_image = excluded.share_image,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          point.id,
          point.lat,
          point.lng,
          point.name,
          point.url,
          point.mention_count,
          point.share_image,
          point.query_tag,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function upsertTelegramAlerts(db: D1Database, alerts: TelegramAlertRow[]) {
  if (alerts.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < alerts.length; i += INSERT_CHUNK) {
    const chunk = alerts.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((alert) =>
      db
        .prepare(
          `INSERT INTO telegram_alerts (
            id, channel_username, channel_title, region, text, message_url, received_at, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            text = excluded.text,
            channel_title = excluded.channel_title,
            region = excluded.region,
            received_at = excluded.received_at,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          alert.id,
          alert.channel_username,
          alert.channel_title,
          alert.region,
          alert.text,
          alert.message_url,
          alert.received_at,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function readFirmsFires(
  db: D1Database,
  opts: { west: number; south: number; east: number; north: number; limit: number },
) {
  const rows = await db
    .prepare(
      `SELECT id, lat, lng, frp, brightness, confidence, acq_date, acq_time, satellite, daynight, source, theater
       FROM firms_fires
       WHERE lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?
       ORDER BY ingested_at DESC LIMIT ?`,
    )
    .bind(opts.south, opts.north, opts.west, opts.east, opts.limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function readGdeltPoints(db: D1Database, limit = 1200) {
  const rows = await db
    .prepare(
      `SELECT id, lat, lng, name, url, mention_count, query_tag
       FROM gdelt_points ORDER BY ingested_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function readTelegramAlerts(db: D1Database, limit = 200) {
  const rows = await db
    .prepare(
      `SELECT id, channel_username, channel_title, region, text, message_url, received_at, ingested_at
       FROM telegram_alerts ORDER BY received_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<TelegramAlertRow & { ingested_at: string }>();
  return rows.results ?? [];
}

export async function pruneOldRows(db: D1Database, retentionHours: number) {
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();
  const firms = await db
    .prepare(`DELETE FROM firms_fires WHERE ingested_at < ?`)
    .bind(cutoff)
    .run();
  const gdelt = await db
    .prepare(`DELETE FROM gdelt_points WHERE ingested_at < ?`)
    .bind(cutoff)
    .run();

  let newsSnapshotsDeleted = 0;
  let newsItemsDeleted = 0;
  let aisDeleted = 0;
  let adsbDeleted = 0;
  try {
    const snaps = await db
      .prepare(`DELETE FROM news_stream_snapshots WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    const items = await db
      .prepare(`DELETE FROM news_stream_items WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    newsSnapshotsDeleted = snaps.meta.changes ?? 0;
    newsItemsDeleted = items.meta.changes ?? 0;
  } catch {
    // table may not exist until migration 0001
  }

  try {
    const ais = await db
      .prepare(`DELETE FROM ais_vessels WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    aisDeleted = ais.meta.changes ?? 0;
  } catch {
    // until migration 0002
  }
  try {
    const adsb = await db
      .prepare(`DELETE FROM adsb_aircraft WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    adsbDeleted = adsb.meta.changes ?? 0;
  } catch {
    // until migration 0002
  }

  // 텔레그램은 저빈도 채널이 있어 보존창을 2배로 (최소 24h)
  let telegramDeleted = 0;
  try {
    const tgCutoff = new Date(
      Date.now() - Math.max(24, retentionHours * 2) * 60 * 60 * 1000,
    ).toISOString();
    const tg = await db
      .prepare(`DELETE FROM telegram_alerts WHERE received_at < ?`)
      .bind(tgCutoff)
      .run();
    telegramDeleted = tg.meta.changes ?? 0;
  } catch {
    // until migration 0005
  }

  return {
    firmsDeleted: firms.meta.changes ?? 0,
    gdeltDeleted: gdelt.meta.changes ?? 0,
    newsSnapshotsDeleted,
    newsItemsDeleted,
    aisDeleted,
    adsbDeleted,
    telegramDeleted,
    cutoff,
  };
}

export async function recordIngestRun(
  db: D1Database,
  run: {
    startedAt: string;
    finishedAt: string;
    firmsCount: number;
    gdeltCount: number;
    ok: boolean;
    error: string | null;
    detail: unknown;
  },
) {
  await db
    .prepare(
      `INSERT INTO ingest_runs (
        started_at, finished_at, firms_count, gdelt_count, ok, error, detail_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      run.startedAt,
      run.finishedAt,
      run.firmsCount,
      run.gdeltCount,
      run.ok ? 1 : 0,
      run.error,
      JSON.stringify(run.detail ?? null),
    )
    .run();
}

export function readIntVar(env: IngestEnv, key: keyof IngestEnv, fallback: number) {
  const raw = env[key];
  if (typeof raw !== "string") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getFirmsMapKey(env: IngestEnv): string | null {
  const key = (env.NASA_FIRMS_API_KEY || env.FIRMS_MAP_KEY || "").trim();
  return key || null;
}
