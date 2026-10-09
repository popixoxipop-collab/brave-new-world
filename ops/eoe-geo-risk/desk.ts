/**
 * EOE Geo-Risk Desk. Loopback-only, observation-only, no PRE/OMS/broker imports.
 * Reuses the July 2026 Brave New World Telegram collector, deterministic
 * event detection, router and NVIDIA analysis contract. SQLite replaces D1.
 * The LLM never establishes verification authority; all exposures remain
 * unverified until a separate independently grounded evidence mechanism exists.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";




import type { AlertInput } from "../../src/lib/geo-risk/detect";
import type { RiskEvent, ExposureAnalysis } from "../../src/lib/geo-risk/types";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const localRequire = createRequire(import.meta.url);
const { fetchTelegramAlerts: collectTelegram } = localRequire("../../workers/cron-ingest/src/telegram.ts");
const { detectEvents } = localRequire("../../src/lib/geo-risk/detect.ts");
const { runRouterCycle } = localRequire("../../src/lib/geo-risk/router.ts");
const { parseAnalysis } = localRequire("../../src/lib/geo-risk/analyze.ts");
const { fetchGdeltTensionPoints } = localRequire("../../workers/cron-ingest/src/gdeltExport.ts");
const { fetchAdsbAircraft } = localRequire("../../workers/cron-ingest/src/adsb.ts");
const STATE = path.join(DIR, "state");
const DB_PATH = path.join(STATE, "geo-risk.sqlite3");
const HOST = "127.0.0.1";
const PORT = 38471;
const PERIOD_MS = 600_000;
const MAX_ALERT_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_ANALYSES_PER_CYCLE = 2;
const MAX_DAILY_ANALYSIS_ATTEMPTS = 12;

process.umask(0o077);
fs.mkdirSync(STATE, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
db.exec([
  "CREATE TABLE IF NOT EXISTS telegram_alerts (id TEXT PRIMARY KEY, channel TEXT NOT NULL, text TEXT NOT NULL, received_at TEXT NOT NULL, ingested_at TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS gdelt_points (id TEXT PRIMARY KEY, lat REAL NOT NULL, lng REAL NOT NULL, name TEXT, query_tag TEXT NOT NULL, collected_at TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS adsb_aircraft (id TEXT PRIMARY KEY, hex TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, mode TEXT NOT NULL, collected_at TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_tg_received ON telegram_alerts(received_at DESC);",
  "CREATE TABLE IF NOT EXISTS risk_events (id TEXT PRIMARY KEY, source TEXT NOT NULL, source_ref TEXT NOT NULL, event_class TEXT NOT NULL, geography TEXT, severity TEXT NOT NULL, summary TEXT NOT NULL, lat REAL, lon REAL, corroboration_count INTEGER NOT NULL, first_seen_at TEXT NOT NULL, status TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_risk_seen ON risk_events(first_seen_at DESC);",
  "CREATE TABLE IF NOT EXISTS risk_analyses (event_id TEXT PRIMARY KEY REFERENCES risk_events(id), exposures_json TEXT NOT NULL, portfolio_delta REAL, verified INTEGER NOT NULL, model TEXT NOT NULL, created_at TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS llm_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, day_key TEXT NOT NULL, event_id TEXT NOT NULL, attempted_at TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS ingest_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, finished_at TEXT NOT NULL, ok INTEGER NOT NULL, telegram_count INTEGER NOT NULL, detector_count INTEGER NOT NULL, analyzed_count INTEGER NOT NULL, model_attempts INTEGER NOT NULL, error TEXT);",
].join("\n"));

const USE_MLX = process.env.GEO_EOE_LLM_MODE === "mlx";
const ENABLE_MODEL = USE_MLX;
const LOCAL_MLX_URL = "http://127.0.0.1:38472/v1/chat/completions";
const LOCAL_MLX_MODEL = "/Users/eoe/.cache/huggingface/hub/models--mlx-community--DeepSeek-V2-Lite-Chat-4bit-mlx/snapshots/a33a8ad64477b9ca7a65b6dc1d8c06c997f87216";
async function callEoeMlx(opts: { system: string; user: string; maxTokens?: number }) {
  try {
    const response = await fetch(LOCAL_MLX_URL, {
      method: "POST", signal: AbortSignal.timeout(40_000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: LOCAL_MLX_MODEL,
        messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.user }],
        temperature: 0, max_tokens: 768,
      }),
    });
    if (!response.ok) return { ok: false as const, status: response.status, error: "MLX_LOCAL_HTTP" };
    const json = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
    const text = json.choices?.[0]?.message?.content || "";
    const parsed = parseAnalysis(text, "eoe-mlx/deepseek-v2-lite-4bit");
    if (!text.trim()) return { ok: false as const, status: 422, error: "MLX_EMPTY_TEXT" };
    return { ok: true as const, text, model: "eoe-mlx/deepseek-v2-lite-4bit", parsed_exposures: parsed.exposures.length, finish_reason: json.choices?.[0]?.finish_reason ?? null };
  } catch {
    return { ok: false as const, status: 503, error: "MLX_LOCAL_UNAVAILABLE" };
  }
}

const upsertTelegram = db.prepare("INSERT INTO telegram_alerts (id,channel,text,received_at,ingested_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET channel=excluded.channel,text=excluded.text,received_at=excluded.received_at,ingested_at=excluded.ingested_at");
const upsertGdelt = db.prepare("INSERT INTO gdelt_points(id,lat,lng,name,query_tag,collected_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,name=excluded.name,query_tag=excluded.query_tag,collected_at=excluded.collected_at");
const upsertAdsb = db.prepare("INSERT INTO adsb_aircraft(id,hex,lat,lng,mode,collected_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET hex=excluded.hex,lat=excluded.lat,lng=excluded.lng,mode=excluded.mode,collected_at=excluded.collected_at");
const countGdelt = db.prepare("SELECT COUNT(*) AS n FROM gdelt_points");
const countAdsb = db.prepare("SELECT COUNT(*) AS n FROM adsb_aircraft");
const eventStatus = db.prepare("SELECT status FROM risk_events WHERE id=?");
const upsertRisk = db.prepare("INSERT INTO risk_events (id,source,source_ref,event_class,geography,severity,summary,lat,lon,corroboration_count,first_seen_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET severity=excluded.severity,corroboration_count=excluded.corroboration_count,summary=excluded.summary");
const saveAnalysis = db.prepare("INSERT INTO risk_analyses (event_id,exposures_json,portfolio_delta,verified,model,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING");
const analyzedStatus = db.prepare("UPDATE risk_events SET status='analyzed' WHERE id=?");
const dayAttempts = db.prepare("SELECT COUNT(*) AS n FROM llm_attempts WHERE day_key=?");
const recordAttempt = db.prepare("INSERT INTO llm_attempts(day_key,event_id,attempted_at) VALUES (?,?,?)");
const lastRunQuery = db.prepare("SELECT * FROM ingest_runs ORDER BY id DESC LIMIT 1");
const countTelegram = db.prepare("SELECT COUNT(*) AS n FROM telegram_alerts");
const countRisks = db.prepare("SELECT COUNT(*) AS n FROM risk_events WHERE status='analyzed'");
const selectTelegram = db.prepare("SELECT id,channel,text,received_at FROM telegram_alerts ORDER BY received_at DESC LIMIT ?");
const selectRisks = db.prepare("SELECT e.*,a.exposures_json,a.verified,a.created_at FROM risk_events e JOIN risk_analyses a ON a.event_id=e.id WHERE e.status='analyzed' ORDER BY e.first_seen_at DESC LIMIT ?");

type DbScalarRow = Record<string, unknown>;
const asN = (r: unknown): number => Number((r as DbScalarRow)?.n ?? 0);
function sha(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function nowIso(): string { return new Date().toISOString(); }
function safeError(err: unknown): string {
  const code = err instanceof Error ? err.name : typeof err;
  return "EOE_GEO_CYCLE_ERROR_" + code.slice(0, 35);
}
let recentModelStatus: Record<string, unknown> = { state: "NOT_YET_ATTEMPTED" };
let running = false;
let lastCompleted = lastRunQuery.get() as DbScalarRow | undefined;

async function cycle(): Promise<void> {
  if (running) return;
  running = true;
  const started = nowIso();
  let count = 0;
  let detectorCount = 0;
  let analyzedCount = 0;
  let attempts = 0;
  let ok = 0;
  let err = "";
  try {
    // Original Cloudflare Worker parsing of real public t.me message-id/date.
    // No dependency on the Cloudflare deployment or its D1 database.
    const response = await collectTelegram({ maxAlerts: 200, maxChannels: 25 });
    const cut = Date.now() - MAX_ALERT_AGE_MS;
    const valid: AlertInput[] = [];
    const ingestedAt = nowIso();
    for (const a of response.alerts) {
      if (!a || typeof a.id !== "string" || typeof a.channel_username !== "string") continue;
      const received = Date.parse(a.received_at);
      if (!Number.isFinite(received) || received < cut || received > Date.now() + 300_000) continue;
      if (typeof a.text !== "string" || a.text.length < 20) continue;
      const clean: AlertInput = {
        id: a.id.slice(0, 160),
        channelUsername: a.channel_username.slice(0, 80),
        text: a.text.slice(0, 1000),
        receivedAt: new Date(received).toISOString(),
      };
      upsertTelegram.run(clean.id, clean.channelUsername, clean.text, clean.receivedAt, ingestedAt);
      valid.push(clean);
    }
    count = valid.length;
    if (!count) throw new Error("TELEGRAM_NO_RECENT_MESSAGES");
    detectorCount = detectEvents(valid).length;
    const day = started.slice(0, 10);
    const result = await runRouterCycle({
      fetchAlerts: async () => valid,
      upsertEvent: async (ev: RiskEvent) => {
        upsertRisk.run(ev.id, ev.source, ev.sourceRef, ev.eventClass, ev.geography,
          ev.severity, ev.summary, ev.lat, ev.lon, ev.corroborationCount,
          ev.firstSeenAt, ev.status);
      },
      getEventStatus: async (id: string) => {
        const row = eventStatus.get(id) as DbScalarRow | undefined;
        return (row?.status ?? null) as RiskEvent["status"] | null;
      },
      saveAnalysis: async (id: string, analysis: ExposureAnalysis, when: string) => {
        // The model's own "verified:true" assertion is NOT external corroboration.
        // Do not promote it to Finance as independently verified market evidence.
        const draft = analysis.exposures.map((e) => ({
          ticker: e.ticker, direction: e.direction, rationale: e.rationale, verified: false,
        }));
        saveAnalysis.run(id, JSON.stringify(draft), null, 0, analysis.model, when);
        analyzedStatus.run(id);
      },
      callClaude: async (opts) => {
        if (!ENABLE_MODEL) return { ok: false, error: "LOCAL_MODEL_NOT_CONFIGURED" };
        if (attempts >= MAX_ANALYSES_PER_CYCLE) return { ok: false, error: "CYCLE_BUDGET_EXCEEDED" };
        if (asN(dayAttempts.get(day)) >= MAX_DAILY_ANALYSIS_ATTEMPTS) {
          return { ok: false, error: "DAILY_BUDGET_EXCEEDED" };
        }
        recordAttempt.run(day, "geo-research", nowIso());
        attempts++;
        const result = await callEoeMlx(opts);
        recentModelStatus = result.ok
          ? { state: result.text.trim() ? "RETURNED" : "EMPTY_RESPONSE",
              model: result.model, content_chars: result.text.length, parsed_exposures: "parsed_exposures" in result ? result.parsed_exposures : null, finish_reason: "finish_reason" in result ? result.finish_reason : null }
          : { state: "PROVIDER_FAILED", http_status: result.status,
              rate_limited: Boolean(result.rateLimited) };
        if (!result.ok) return { ok: false, error: "EOE_MLX_ANALYSIS_FAILED" };
        return { ok: true, text: result.text, model: result.model };
      },
      portfolio: null, apiKey: "", nowIso: nowIso(),
    });
    analyzedCount = result.analyzed;
    // Existing GDELT 15-minute export and ADS-B public-source fetchers,
    // executed on EOE without Cloudflare Worker/D1. Raw data is NOT a
    // corroborated finance event and is stored in separate local tables.
    const [gdelt, adsb] = await Promise.all([
      fetchGdeltTensionPoints({ maxPoints: 250 }),
      fetchAdsbAircraft({}, { milMax: 100, civPerHub: 20, maxHubs: 2 }),
    ]);
    const sourcesAt = nowIso();
    for (const g of gdelt.points) {
      upsertGdelt.run(String(g.id), g.lat, g.lng, g.name, g.query_tag, sourcesAt);
    }
    for (const a of adsb.aircraft) {
      upsertAdsb.run(String(a.id), a.hex, a.lat, a.lng, a.mode, sourcesAt);
    }
    // Partial provider errors are exposed as degraded separate feeds.
    if (gdelt.errors.length) console.log(JSON.stringify({event:"GDELT_PARTIAL",errors:gdelt.errors.length}));
    if (adsb.errors.length) console.log(JSON.stringify({event:"ADSB_PARTIAL",errors:adsb.errors.length}));
    ok = 1; // Ingestion may succeed despite unverified or failed analyst drafts.
  } catch (error) {
    err = safeError(error);
  }
  const finished = nowIso();
  db.prepare("INSERT INTO ingest_runs(started_at,finished_at,ok,telegram_count,detector_count,analyzed_count,model_attempts,error) VALUES(?,?,?,?,?,?,?,?)")
    .run(started, finished, ok, count, detectorCount, analyzedCount, attempts, err || null);
  lastCompleted = lastRunQuery.get() as DbScalarRow;
  running = false;
  // No raw Telegram body, API credentials or analyst prompts ever written to logs.
  console.log(JSON.stringify({
    time: finished, ok: Boolean(ok), alerts: count, detector_events: detectorCount,
    analyzed_drafts: analyzedCount, model_attempts: attempts,
    error_code: err || null, model_status: recentModelStatus,
  }));
}
function telegramJson(limit: number) {
  const rows = selectTelegram.all(limit) as DbScalarRow[];
  return {
    alerts: rows.map((r) => ({
      id: String(r.id), channelUsername: String(r.channel),
      receivedAt: String(r.received_at), text: String(r.text),
    })),
  };
}
function eventsJson(limit: number) {
  const rows = selectRisks.all(limit) as DbScalarRow[];
  return {
    source: "eoe-sqlite",
    fetchedAt: nowIso(),
    count: rows.length,
    events: rows.map((r) => ({
      id: "geo:" + sha(String(r.id)).slice(0, 40),
      eventClass: String(r.event_class), severity: String(r.severity),
      geography: r.geography === null ? null : String(r.geography),
      firstSeenAt: String(r.first_seen_at),
      corroborationCount: Number(r.corroboration_count),
      lat: r.lat, lon: r.lon, analyzedAt: String(r.created_at),
      verified: false, // Unverified draft; never authority for PRE or orders.
      exposures: (JSON.parse(String(r.exposures_json)) as Array<Record<string, unknown>>)
        .slice(0, 8).map((e) => ({
          ticker: String(e.ticker ?? "").slice(0, 8),
          direction: String(e.direction ?? "watch"),
          verified: false,
        })),
    })),
  };
}
function latestJson() {
  const r = lastCompleted;
  return {
    source: "eoe-local-sqlite",
    lastRun: r ? {
      ok: Number(r.ok), started_at: String(r.started_at),
      finished_at: String(r.finished_at), error: r.error,
    } : null,
    telegramRows: asN(countTelegram.get()),
    gdeltRows: asN(countGdelt.get()), firmsRows: null, aisRows: null, adsbRows: asN(countAdsb.get()),
    analyzedEventDraftRows: asN(countRisks.get()),
    model: { mode: ENABLE_MODEL ? "EOE_LOCAL_MLX" : "DETECT_ONLY",
             external_provider_enabled: false,
             max_analyses_per_cycle: MAX_ANALYSES_PER_CYCLE,
             daily_limit: MAX_DAILY_ANALYSIS_ATTEMPTS, last_result: recentModelStatus },
    missing_local_feeds: ["FIRMS_API_KEY_MISSING", "AIS_PROVIDER_KEY_MISSING"],
  };
}
function json(res: http.ServerResponse, code: number, obj: unknown) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}
const server = http.createServer((req, res) => {
  if (req.method !== "GET") { json(res, 405, { error: "GET_ONLY" }); return; }
  const url = new URL(req.url ?? "/", "http://" + HOST + ":" + PORT);
  if (url.pathname === "/health") {
    json(res, 200, {
      service: "eoe-geo-risk-desk", ingestion: "TELEGRAM_GDELT_ADSB_DIRECT_EOE",
      cron: "*/10 * * * *", endpoints: { health: true, latest: true, telegram: true, geoRiskEvents: true },
      bind: HOST, read_only: true, order_capable: false, latest: latestJson().lastRun,
    });
  } else if (url.pathname === "/latest") {
    json(res, 200, latestJson());
  } else if (url.pathname === "/telegram") {
    const max = Math.max(1, Math.min(40, Number(url.searchParams.get("limit") || 40) || 40));
    json(res, 200, telegramJson(max));
  } else if (url.pathname === "/api/geo-risk/events") {
    const max = Math.max(1, Math.min(50, Number(url.searchParams.get("max") || 50) || 50));
    json(res, 200, eventsJson(max));
  } else {
    json(res, 404, { error: "NOT_FOUND" });
  }
});
server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    event: "EOE_GEO_DESK_READY", host: HOST, port: PORT,
    source: "brave-new-world:80d398ce", storage: "LOCAL_SQLITE",
    model_mode: ENABLE_MODEL ? "EOE_LOCAL_MLX" : "DETECT_ONLY", authority: "OBSERVATION_ONLY",
  }));
  void cycle();
});
setInterval(() => { void cycle(); }, PERIOD_MS);
process.on("SIGTERM", () => { server.close(); db.close(); process.exit(0); });
