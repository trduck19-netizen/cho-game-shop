-- Migration: 0010_game_download_links_and_tracking.sql
-- Thêm bảng theo dõi lượt bấm tải game (download_clicks) và bổ sung cột link store vào bảng games

-- 1. Bảng lưu lượt tải game (không lưu IP thô, không lưu PII)
CREATE TABLE IF NOT EXISTS download_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_slug TEXT NOT NULL,
  store TEXT NOT NULL CHECK (store IN ('google_play', 'app_store')),
  platform_detected TEXT NOT NULL CHECK (platform_detected IN ('android', 'ios', 'desktop', 'other')),
  via TEXT NOT NULL CHECK (via IN ('button', 'qr_scan')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_download_clicks_game ON download_clicks(game_slug);
CREATE INDEX IF NOT EXISTS idx_download_clicks_created ON download_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_download_clicks_store ON download_clicks(store);

-- 2. Thêm các cột lưu link store và package name vào bảng games (Idempotent qua try-catch D1)
-- ALTER TABLE games ADD COLUMN google_play_url TEXT;
-- ALTER TABLE games ADD COLUMN app_store_url TEXT;
-- ALTER TABLE games ADD COLUMN android_package_name TEXT;
