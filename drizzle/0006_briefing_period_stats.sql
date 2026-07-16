-- Periodic briefing stats (LLM-free aggregates for daily/weekly/monthly parchment)
-- Cron upserts daily snapshot from live D1 counts; weekly/monthly roll up from daily rows.
CREATE TABLE IF NOT EXISTS briefing_period_stats (
  period_key TEXT PRIMARY KEY NOT NULL,
  tier TEXT NOT NULL,
  gdelt_count INTEGER NOT NULL DEFAULT 0,
  firms_count INTEGER NOT NULL DEFAULT 0,
  telegram_count INTEGER NOT NULL DEFAULT 0,
  news_item_count INTEGER NOT NULL DEFAULT 0,
  top_gdelt_tag TEXT,
  top_telegram_region TEXT,
  detail_json TEXT,
  window_start TEXT,
  window_end TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_briefing_tier ON briefing_period_stats (tier);
CREATE INDEX IF NOT EXISTS idx_briefing_updated ON briefing_period_stats (updated_at);
