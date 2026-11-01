-- ==============================================================================
-- Migration: 0011_games_and_codes_optimized_schema.sql
-- Description: Bảng games và codes chuẩn hóa D1 kèm cột tính sẵn (precomputed)
--              active_codes_count, total_codes_count, last_code_at và các Index tăng tốc
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Bảng Games chuẩn hóa
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  publisher TEXT,
  category TEXT,
  rating REAL DEFAULT 5,
  icon_url TEXT,
  banner_url TEXT,
  description TEXT,
  instructions TEXT,
  platform TEXT DEFAULT 'Mobile / PC',
  so_giay_phep TEXT,
  ngay_cap_phep TEXT,
  release_date TEXT,
  do_tuoi TEXT,
  trang_thai_gp TEXT,
  website_g1 TEXT,
  link_codemoi TEXT,
  download_android TEXT,
  download_ios TEXT,
  download_pc TEXT,
  google_play_url TEXT,
  app_store_url TEXT,
  android_package_name TEXT,
  redeem_url TEXT,
  is_featured INTEGER DEFAULT 0,
  is_hot INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE',
  active_codes_count INTEGER DEFAULT 0,
  total_codes_count INTEGER DEFAULT 0,
  last_code_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Idempotent column migrations nếu bảng đã tồn tại từ trước
-- (D1 runtime migration wrapper sẽ thực thi an toàn)

-- 2. Bảng Codes chuẩn hóa
CREATE TABLE IF NOT EXISTS codes (
  id TEXT PRIMARY KEY,
  game_slug TEXT NOT NULL,
  code TEXT NOT NULL,
  rewards TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  source TEXT DEFAULT 'crawler',
  added_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(game_slug, code)
);

-- 3. Tạo các Index tăng tốc truy vấn D1 SQL
CREATE INDEX IF NOT EXISTS idx_games_status_category ON games(status, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_last_code_at ON games(last_code_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_active_codes ON games(active_codes_count DESC);
CREATE INDEX IF NOT EXISTS idx_games_is_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating DESC);
CREATE INDEX IF NOT EXISTS idx_codes_game_slug_expires ON codes(game_slug, expires_at);
CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_codes_slug_code ON codes(game_slug, code);
