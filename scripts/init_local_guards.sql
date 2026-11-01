CREATE TABLE IF NOT EXISTS order_purchase_guards (
  order_id TEXT PRIMARY KEY,
  balance_ok INTEGER NOT NULL,
  stock_ok INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active)
VALUES ('sp_test_1', 'Gói Nạp Test Idempotency', 'test-game', 'Test Game', 100000, 50, 50000, 10, 1);

INSERT OR IGNORE INTO inventory_codes (id, product_id, code_content, status)
VALUES 
  ('inv_1', 'sp_test_1', 'CODE_TEST_AAA_111', 'AVAILABLE'),
  ('inv_2', 'sp_test_1', 'CODE_TEST_BBB_222', 'AVAILABLE'),
  ('inv_3', 'sp_test_1', 'CODE_TEST_CCC_333', 'AVAILABLE'),
  ('inv_4', 'sp_test_1', 'CODE_TEST_DDD_444', 'AVAILABLE');

ALTER TABLE members ADD COLUMN session_token TEXT;
UPDATE members SET balance = 100000, session_token = 'token_test_session_123' WHERE id = 'usr_admin';
