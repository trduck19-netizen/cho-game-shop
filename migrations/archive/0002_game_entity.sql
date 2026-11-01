-- ==============================================================================
-- Migration: 0002_game_entity.sql
-- Description: Tách Game thành thực thể riêng và liên kết với free_codes, paid_codes
-- ==============================================================================

-- 1. Tạo bảng GAMES
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE,
    cover_image_url TEXT,
    publisher TEXT,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);

-- 2. Thêm cột game_id vào free_codes và paid_codes
ALTER TABLE free_codes ADD COLUMN game_id TEXT REFERENCES games(id);
ALTER TABLE paid_codes ADD COLUMN game_id TEXT REFERENCES games(id);

-- 3. Di chuyển dữ liệu cũ: Trích xuất các tựa game hiện có vào bảng games
INSERT OR IGNORE INTO games (id, name, slug, created_at)
SELECT DISTINCT
    lower(hex(randomblob(16))),
    game_name,
    game_slug,
    CURRENT_TIMESTAMP
FROM (
    SELECT game_name, game_slug FROM free_codes WHERE game_name IS NOT NULL AND game_name != ''
    UNION
    SELECT game_name, game_slug FROM paid_codes WHERE game_name IS NOT NULL AND game_name != ''
);

-- 4. Cập nhật game_id cho các mã code hiện có
UPDATE free_codes
SET game_id = (SELECT id FROM games WHERE games.slug = free_codes.game_slug OR games.name = free_codes.game_name)
WHERE game_id IS NULL;

UPDATE paid_codes
SET game_id = (SELECT id FROM games WHERE games.slug = paid_codes.game_slug OR games.name = paid_codes.game_name)
WHERE game_id IS NULL;
