-- 텔레그램 OSINT 라이브 속보 (Cloudflare cron 워커 → D1 공유)
CREATE TABLE IF NOT EXISTS telegram_alerts (
  id TEXT PRIMARY KEY NOT NULL,
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
