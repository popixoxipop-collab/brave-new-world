-- Conflict View D1 schema — FIRMS + GDELT ingest snapshots
-- Apply: npm run cf:d1:migrate:remote   (or :local)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS firms_fires (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  frp REAL,
  brightness REAL,
  confidence TEXT,
  acq_date TEXT,
  acq_time TEXT,
  satellite TEXT,
  daynight TEXT,
  source TEXT NOT NULL DEFAULT 'VIIRS_SNPP_NRT',
  theater TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_firms_ingested ON firms_fires (ingested_at);
CREATE INDEX IF NOT EXISTS idx_firms_theater ON firms_fires (theater);
CREATE INDEX IF NOT EXISTS idx_firms_geo ON firms_fires (lat, lng);

CREATE TABLE IF NOT EXISTS gdelt_points (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  name TEXT,
  url TEXT,
  mention_count INTEGER,
  share_image TEXT,
  query_tag TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gdelt_ingested ON gdelt_points (ingested_at);
CREATE INDEX IF NOT EXISTS idx_gdelt_tag ON gdelt_points (query_tag);
CREATE INDEX IF NOT EXISTS idx_gdelt_geo ON gdelt_points (lat, lng);

CREATE TABLE IF NOT EXISTS news_stream_snapshots (
  cache_key TEXT PRIMARY KEY,
  packages TEXT,
  lang TEXT NOT NULL DEFAULT 'ko',
  payload_json TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  tier1_count INTEGER NOT NULL DEFAULT 0,
  tier2_count INTEGER NOT NULL DEFAULT 0,
  tier3_count INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_snap_fetched ON news_stream_snapshots (fetched_at);
CREATE INDEX IF NOT EXISTS idx_news_snap_lang ON news_stream_snapshots (lang);

CREATE TABLE IF NOT EXISTS news_stream_items (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  trust_tier INTEGER NOT NULL,
  theater TEXT,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  source TEXT,
  publisher TEXT,
  pub_date TEXT,
  feed_topic TEXT,
  econ_genre TEXT,
  category TEXT,
  image_url TEXT,
  summary TEXT,
  role TEXT NOT NULL DEFAULT 'verified',
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_items_cache ON news_stream_items (cache_key);
CREATE INDEX IF NOT EXISTS idx_news_items_tier ON news_stream_items (trust_tier);
CREATE INDEX IF NOT EXISTS idx_news_items_theater ON news_stream_items (theater);
CREATE INDEX IF NOT EXISTS idx_news_items_ingested ON news_stream_items (ingested_at);

CREATE TABLE IF NOT EXISTS telegram_alerts (
  id TEXT PRIMARY KEY,
  channel_username TEXT NOT NULL,
  channel_title TEXT,
  region TEXT NOT NULL DEFAULT 'global',
  text TEXT NOT NULL,
  message_url TEXT,
  received_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tg_received ON telegram_alerts (received_at);
CREATE INDEX IF NOT EXISTS idx_tg_ingested ON telegram_alerts (ingested_at);
CREATE INDEX IF NOT EXISTS idx_tg_region ON telegram_alerts (region);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  firms_count INTEGER DEFAULT 0,
  gdelt_count INTEGER DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  detail_json TEXT
);

-- geo-risk-desk 라우터 테이블 (schema.ts riskEvents/riskAnalyses 미러)
CREATE TABLE IF NOT EXISTS risk_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  event_class TEXT NOT NULL DEFAULT 'other',
  geography TEXT,
  severity TEXT NOT NULL DEFAULT 'L1',
  summary TEXT NOT NULL,
  lat REAL,
  lon REAL,
  corroboration_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected'
);
CREATE INDEX IF NOT EXISTS idx_re_first_seen ON risk_events (first_seen_at);
CREATE INDEX IF NOT EXISTS idx_re_status ON risk_events (status);
CREATE INDEX IF NOT EXISTS idx_re_class ON risk_events (event_class);

CREATE TABLE IF NOT EXISTS risk_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  exposures_json TEXT NOT NULL,
  portfolio_delta REAL,
  verified INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ra_event ON risk_analyses (event_id);
CREATE INDEX IF NOT EXISTS idx_ra_created ON risk_analyses (created_at);
