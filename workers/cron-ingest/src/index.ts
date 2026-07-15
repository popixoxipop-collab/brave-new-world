import type { IngestEnv } from "./env";
import {
  getFirmsMapKey,
  pruneOldRows,
  readFirmsFires,
  readGdeltPoints,
  readIntVar,
  readTelegramAlerts,
  recordIngestRun,
  upsertFirmsFires,
  upsertGdeltPoints,
  upsertTelegramAlerts,
} from "./db";
import { fetchFirmsForTheaters } from "./firms";
import { fetchGdeltTensionPoints } from "./gdeltExport";
import { fetchTelegramAlerts } from "./telegram";

export type { IngestEnv };

type WarmResult = { ok: boolean; status: number; detail?: string };

type IngestResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  firmsCount: number;
  gdeltCount: number;
  telegramCount: number;
  newsWarm?: WarmResult;
  videoNewsWarm?: WarmResult;
  aisWarm?: WarmResult;
  adsbWarm?: WarmResult;
  tunnelsWarm?: WarmResult;
  disputeHatchWarm?: WarmResult;
  ukraineHatchWarm?: WarmResult;
  firmsErrors: string[];
  gdeltErrors: string[];
  telegramErrors: string[];
  pruned?: {
    firmsDeleted: number;
    gdeltDeleted: number;
    newsSnapshotsDeleted?: number;
    newsItemsDeleted?: number;
    aisDeleted?: number;
    adsbDeleted?: number;
    telegramDeleted?: number;
    cutoff: string;
  };
  error: string | null;
};

async function warmEndpoint(
  url: string | undefined,
  env: IngestEnv,
  label: string,
): Promise<WarmResult | undefined> {
  const warmUrl = url?.trim();
  if (!warmUrl) return undefined;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const secret = env.INGEST_CRON_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(warmUrl, { method: "POST", headers });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      detail: text.slice(0, 400),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : `${label} warm failed`,
    };
  }
}

async function runIngest(env: IngestEnv): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const firmsErrors: string[] = [];
  const gdeltErrors: string[] = [];
  const telegramErrors: string[] = [];
  let firmsCount = 0;
  let gdeltCount = 0;
  let telegramCount = 0;
  let pruned: IngestResult["pruned"];
  let newsWarm: IngestResult["newsWarm"];
  let videoNewsWarm: IngestResult["videoNewsWarm"];
  let aisWarm: IngestResult["aisWarm"];
  let adsbWarm: IngestResult["adsbWarm"];
  let tunnelsWarm: IngestResult["tunnelsWarm"];
  let disputeHatchWarm: IngestResult["disputeHatchWarm"];
  let ukraineHatchWarm: IngestResult["ukraineHatchWarm"];

  try {
    const dayRange = Math.min(5, Math.max(1, readIntVar(env, "FIRMS_DAY_RANGE", 1)));
    const maxPerTheater = Math.min(
      800,
      Math.max(50, readIntVar(env, "FIRMS_MAX_PER_THEATER", 400)),
    );
    const gdeltMax = Math.min(400, Math.max(80, readIntVar(env, "GDELT_MAX_POINTS", 250)));
    const retentionHours = Math.min(
      168,
      Math.max(6, readIntVar(env, "RETENTION_HOURS", 48)),
    );

    const mapKey = getFirmsMapKey(env);
    if (mapKey) {
      const firms = await fetchFirmsForTheaters({
        mapKey,
        dayRange,
        maxPerTheater,
      });
      firmsErrors.push(...firms.errors);
      firmsCount = await upsertFirmsFires(env.DB, firms.fires);
    } else {
      firmsErrors.push("NASA_FIRMS_API_KEY (or FIRMS_MAP_KEY) missing — FIRMS skipped");
    }

    const gdelt = await fetchGdeltTensionPoints({ maxPoints: gdeltMax });
    gdeltErrors.push(...gdelt.errors);
    gdeltCount = await upsertGdeltPoints(env.DB, gdelt.points);

    const telegramEnabled =
      (env.TELEGRAM_INGEST_ENABLED ?? "true").toLowerCase() !== "false" &&
      env.TELEGRAM_INGEST_ENABLED !== "0";
    if (telegramEnabled) {
      const tgMax = Math.min(400, Math.max(50, readIntVar(env, "TELEGRAM_MAX_ALERTS", 200)));
      const telegram = await fetchTelegramAlerts({ maxAlerts: tgMax });
      telegramErrors.push(...telegram.errors.slice(0, 10));
      telegramCount = await upsertTelegramAlerts(env.DB, telegram.alerts);
    }

    pruned = await pruneOldRows(env.DB, retentionHours);
    newsWarm = await warmEndpoint(env.NEWS_WARM_URL, env, "news");
    videoNewsWarm = await warmEndpoint(env.VIDEO_NEWS_WARM_URL, env, "video-news");
    aisWarm = await warmEndpoint(env.AIS_WARM_URL, env, "ais");
    adsbWarm = await warmEndpoint(env.ADSB_WARM_URL, env, "adsb");
    tunnelsWarm = await warmEndpoint(env.TUNNELS_WARM_URL, env, "tunnels");
    disputeHatchWarm = await warmEndpoint(env.DISPUTE_HATCH_WARM_URL, env, "dispute-hatch");
    ukraineHatchWarm = await warmEndpoint(env.UKRAINE_HATCH_WARM_URL, env, "ukraine-hatch");

    const finishedAt = new Date().toISOString();
    const hardFail =
      Boolean(mapKey) && firmsCount === 0 && firmsErrors.length > 0 && gdeltCount === 0;

    const result: IngestResult = {
      ok: !hardFail,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      telegramCount,
      newsWarm,
      videoNewsWarm,
      aisWarm,
      adsbWarm,
      tunnelsWarm,
      disputeHatchWarm,
      ukraineHatchWarm,
      firmsErrors,
      gdeltErrors,
      telegramErrors,
      pruned,
      error: hardFail ? firmsErrors.join("; ") || "ingest failed" : null,
    };

    await recordIngestRun(env.DB, {
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      ok: result.ok,
      error: result.error,
      detail: {
        firmsErrors,
        gdeltErrors,
        telegramErrors,
        telegramCount,
        pruned,
        newsWarm,
        videoNewsWarm,
        aisWarm,
        adsbWarm,
        tunnelsWarm,
        disputeHatchWarm,
        ukraineHatchWarm,
      },
    });

    return result;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "ingest crashed";
    try {
      await recordIngestRun(env.DB, {
        startedAt,
        finishedAt,
        firmsCount,
        gdeltCount,
        ok: false,
        error: message,
        detail: { firmsErrors, gdeltErrors, telegramErrors, telegramCount, newsWarm, aisWarm, adsbWarm, tunnelsWarm, disputeHatchWarm, ukraineHatchWarm },
      });
    } catch {
      // ignore secondary logging failure
    }
    return {
      ok: false,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      telegramCount,
      newsWarm,
      aisWarm,
      adsbWarm,
      tunnelsWarm,
      disputeHatchWarm,
      ukraineHatchWarm,
      firmsErrors,
      gdeltErrors,
      telegramErrors,
      error: message,
    };
  }
}

function jsonPublic(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60",
    },
  });
}

function authorizeManual(request: Request, env: IngestEnv): boolean {
  const secret = env.INGEST_CRON_SECRET?.trim();
  if (!secret) return true; // open in local/dev when secret unset
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

const worker = {
  async scheduled(
    _controller: ScheduledController,
    env: IngestEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      runIngest(env).then((result) => {
        console.log(
          `[ingest] ok=${result.ok} firms=${result.firmsCount} gdelt=${result.gdeltCount} telegram=${result.telegramCount}` +
            (result.newsWarm
              ? ` newsWarm=${result.newsWarm.ok ? "ok" : "fail"}`
              : ""),
          result.error ? `error=${result.error}` : "",
        );
      }),
    );
  },

  async fetch(request: Request, env: IngestEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        service: "conflict-view-ingest",
        cron: "*/10 * * * *",
        endpoints: {
          health: "GET /health",
          run: "POST /run (optional Bearer INGEST_CRON_SECRET)",
          latest: "GET /latest",
          telegram: "GET /telegram?limit=200 (public read of D1 alerts)",
          firms: "GET /firms?west&south&east&north&max (public read of D1 fires)",
          gdelt: "GET /gdelt?limit=1200 (public read of D1 tension points)",
        },
      });
    }

    if (url.pathname === "/firms") {
      const num = (k: string, d: number) => {
        const v = Number(url.searchParams.get(k));
        return Number.isFinite(v) ? v : d;
      };
      const west = num("west", -180);
      const south = num("south", -90);
      const east = num("east", 180);
      const north = num("north", 90);
      const max = Math.min(2000, Math.max(1, Math.floor(num("max", 900))));
      let fires: Array<Record<string, unknown>> = [];
      try {
        const rows = await readFirmsFires(env.DB, { west, south, east, north, limit: max });
        fires = rows.map((row) => ({
          id: row.id,
          lat: row.lat,
          lng: row.lng,
          frp: row.frp,
          brightness: row.brightness,
          confidence: row.confidence,
          acqDate: row.acq_date,
          acqTime: row.acq_time,
          satellite: row.satellite,
          daynight: row.daynight,
        }));
      } catch {
        fires = [];
      }
      return jsonPublic({
        receivedAt: new Date().toISOString(),
        source: "d1-cron",
        count: fires.length,
        bbox: { west, south, east, north },
        fires,
      });
    }

    if (url.pathname === "/gdelt") {
      const limitRaw = Number.parseInt(url.searchParams.get("limit") || "1200", 10);
      const limit = Math.min(2000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 1200));
      let events: Array<Record<string, unknown>> = [];
      try {
        const rows = await readGdeltPoints(env.DB, limit);
        events = rows.map((row) => ({
          id: row.id,
          lat: row.lat,
          lng: row.lng,
          name: row.name,
          url: row.url,
          mentionCount: row.mention_count,
          queryTag: row.query_tag,
        }));
      } catch {
        events = [];
      }
      return jsonPublic({
        fetchedAt: new Date().toISOString(),
        source: "d1-cron",
        count: events.length,
        events,
      });
    }

    if (url.pathname === "/telegram") {
      const limitRaw = Number.parseInt(url.searchParams.get("limit") || "200", 10);
      const limit = Math.min(400, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200));
      let alerts: Array<Record<string, unknown>> = [];
      let fetchedAt: string | null = null;
      try {
        const rows = await readTelegramAlerts(env.DB, limit);
        alerts = rows.map((row) => ({
          id: row.id,
          channelUsername: row.channel_username,
          channelTitle: row.channel_title,
          region: row.region,
          text: row.text,
          messageUrl: row.message_url,
          receivedAt: row.received_at,
        }));
        fetchedAt = rows[0]?.ingested_at ?? null;
      } catch {
        alerts = [];
      }
      return jsonPublic({
        fetchedAt: fetchedAt ?? new Date().toISOString(),
        live: alerts.length > 0,
        source: "d1-cron",
        alerts,
      });
    }

    if (url.pathname === "/latest") {
      const firms = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM firms_fires`,
      ).first<{ c: number }>();
      const gdelt = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM gdelt_points`,
      ).first<{ c: number }>();
      let telegramRows = 0;
      try {
        const tg = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM telegram_alerts`,
        ).first<{ c: number }>();
        telegramRows = tg?.c ?? 0;
      } catch {
        // migration 0005 not applied yet
      }
      let newsSnapshots = 0;
      let newsItems = 0;
      try {
        const snap = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM news_stream_snapshots`,
        ).first<{ c: number }>();
        const items = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM news_stream_items`,
        ).first<{ c: number }>();
        newsSnapshots = snap?.c ?? 0;
        newsItems = items?.c ?? 0;
      } catch {
        // migration not applied yet
      }
      const last = await env.DB.prepare(
        `SELECT started_at, finished_at, firms_count, gdelt_count, ok, error
         FROM ingest_runs ORDER BY id DESC LIMIT 1`,
      ).first();
      return Response.json({
        firmsRows: firms?.c ?? 0,
        gdeltRows: gdelt?.c ?? 0,
        telegramRows,
        newsSnapshots,
        newsItems,
        lastRun: last ?? null,
      });
    }

    if (url.pathname === "/run" && (request.method === "POST" || request.method === "GET")) {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const result = await runIngest(env);
      ctx.waitUntil(Promise.resolve());
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
};

export default worker;
