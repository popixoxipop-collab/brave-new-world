-- Lightweight UI event log (share button adoption, mobile home-view toggle, etc.)
-- Append-only, no PII (no session/user identifiers stored).
CREATE TABLE IF NOT EXISTS ui_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  meta_json TEXT,
  viewer_mode TEXT,
  lang TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ui_events_event ON ui_events (event);
CREATE INDEX IF NOT EXISTS idx_ui_events_created ON ui_events (created_at);
