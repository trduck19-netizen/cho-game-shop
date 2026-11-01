-- Migration: 0002_initial_data.sql
-- Sinh tự động từ bản sao lưu Cloudflare KV
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) VALUES ('sp_1', 'Gói Nạp Khởi Đầu Tân Thủ Siêu Cấp', 'honkai-star-rail', 'Honkai: Star Rail', 100000, 50, 50000, 0, 1);
INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) VALUES ('sp_2', 'Combo Nạp VIP Kèm Thẻ Quà Tặng', 'genshin-impact', 'Genshin Impact', 250000, 40, 150000, 0, 1);
INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) VALUES ('sp_3', 'Nạp Kim Cương 520 + Tặng 200', 'free-fire', 'Free Fire', 120000, 25, 90000, 0, 1);
INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) VALUES ('sp_4', 'Gói UC Battle Royale Pro', 'pubg-mobile', 'PUBG Mobile', 200000, 30, 140000, 0, 1);
INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) VALUES ('sp_5', 'Nạp Robux Premium 1000R$', 'roblox', 'Roblox', 300000, 33, 200000, 0, 1);
INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) VALUES ('sp_6', 'Gói Quân Huy Vĩnh Viễn Mùa 2026', 'lien-quan-mobile', 'Liên Quân Mobile', 150000, 20, 120000, 0, 1);
INSERT OR IGNORE INTO members (id, username, display_name, email, role, balance, status, salt, password_hash) VALUES ('usr_admin', 'admin290200', 'admin290200', 'admin@codegame.store', 'SUPER_ADMIN', 9999000, 'ACTIVE', 'wcg_admin_salt_seed_2026', '69ea02563957ebf469d695bd94910669ace925bbeceffc0f3dffecce2ce51aac');
