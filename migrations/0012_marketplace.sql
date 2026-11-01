-- Migration 0012: Bang san so (giai doan 1: chi ma dung mot lan)
-- Nhanh xem truoc: preview/marketplace-so-1
-- Nguyen tac: khong sua migration cu, khong sua cot role cua members,
-- khong sua rang buoc cua wallet_transactions, tien giu ghi o bang rieng.
-- Tham so phi / thoi gian giu / tu dong tra CHUA chot: quan tri phai cap nhat
-- bang marketplace_settings truoc khi mo ban.

CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL UNIQUE,
  shop_name TEXT NOT NULL,
  shop_slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED')),
  available_balance INTEGER NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  held_balance INTEGER NOT NULL DEFAULT 0 CHECK (held_balance >= 0),
  total_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_sold >= 0),
  rating_sum INTEGER NOT NULL DEFAULT 0 CHECK (rating_sum >= 0),
  rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sellers_member_id ON sellers(member_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);

CREATE TABLE IF NOT EXISTS marketplace_products (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  game_slug TEXT,
  game_name TEXT,
  product_type TEXT NOT NULL DEFAULT 'CODE' CHECK (product_type IN ('CODE')),
  original_price INTEGER NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  current_price INTEGER NOT NULL DEFAULT 0 CHECK (current_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  instructions TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_seller_id ON marketplace_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_approval ON marketplace_products(approval_status, is_active);

CREATE TABLE IF NOT EXISTS marketplace_inventory_codes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  code_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')),
  order_id TEXT,
  sold_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_codes_product_status ON marketplace_inventory_codes(product_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_codes_order_id ON marketplace_inventory_codes(order_id);

CREATE TABLE IF NOT EXISTS marketplace_escrow (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  gross_amount INTEGER NOT NULL CHECK (gross_amount >= 0),
  commission_amount INTEGER NOT NULL CHECK (commission_amount >= 0),
  net_amount INTEGER NOT NULL CHECK (net_amount >= 0),
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED')),
  held_at TEXT NOT NULL DEFAULT (datetime('now')),
  released_at TEXT,
  refunded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_seller_status ON marketplace_escrow(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_buyer_id ON marketplace_escrow(buyer_id);

CREATE TABLE IF NOT EXISTS marketplace_ledger (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  order_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'PAYOUT', 'ADJUST')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  held_before INTEGER NOT NULL CHECK (held_before >= 0),
  held_after INTEGER NOT NULL CHECK (held_after >= 0),
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_ledger_seller_id ON marketplace_ledger(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ledger_order_id ON marketplace_ledger(order_id);
DROP INDEX IF EXISTS idx_marketplace_ledger_order_release;
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_ledger_order_settle ON marketplace_ledger(order_id) WHERE type IN ('ESCROW_RELEASE', 'ESCROW_REFUND');

CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_text TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED')),
  admin_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_seller_status ON marketplace_disputes(seller_id, status);

CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_seller_id ON marketplace_reviews(seller_id);

CREATE TABLE IF NOT EXISTS marketplace_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  commission_percent INTEGER,
  hold_hours INTEGER,
  auto_release_hours INTEGER,
  dispute_window_hours INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marketplace_payouts (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
  admin_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_seller_status ON marketplace_payouts(seller_id, status);

-- Hang tham so duy nhat; cac gia tri de trong cho toi khi user chot truoc khi mo ban.
INSERT OR IGNORE INTO marketplace_settings (id, commission_percent, hold_hours, auto_release_hours, dispute_window_hours)
VALUES ('default', NULL, NULL, NULL, NULL);
