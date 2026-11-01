-- ==============================================================================
-- CLOUDFLARE D1 INITIAL SCHEMA FOR WEB-CODE-GAME
-- Migration: 0001_initial_schema.sql
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Bảng Thành Viên (Members)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  username TEXT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'VIP', 'ADMIN', 'SUPER_ADMIN')),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BANNED')),
  salt TEXT,
  password_hash TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- 2. Bảng Sản Phẩm Cửa Hàng (Store Products)
CREATE TABLE IF NOT EXISTS store_products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  game_slug TEXT,
  game_name TEXT,
  original_price INTEGER NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  current_price INTEGER NOT NULL DEFAULT 0 CHECK (current_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_store_products_active ON store_products(is_active);

-- 3. Bảng Kho Mã Số (Inventory Codes)
CREATE TABLE IF NOT EXISTS inventory_codes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  code_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')),
  order_id TEXT,
  sold_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES store_products(id)
);
CREATE INDEX IF NOT EXISTS idx_inv_product_status ON inventory_codes(product_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_order_id ON inventory_codes(order_id);

-- 4. Bảng Chốt Chặn Kiểm Tra Kho Nguyên Tử (Order Stock Validation Guard)
-- Ràng buộc NOT NULL trên cột verified: nếu số code gán != số lượng mua, subquery trả về NULL làm vỡ constraint -> ROLLBACK toàn bộ batch!
CREATE TABLE IF NOT EXISTS order_stock_validation (
  order_id TEXT PRIMARY KEY,
  verified INTEGER NOT NULL
);

-- 5. Bảng Đơn Hàng (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  delivered_codes TEXT NOT NULL, -- JSON Array định dạng ["CODE1", "CODE2"] sinh tự động bằng SQL json_group_array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (product_id) REFERENCES store_products(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- 6. Bảng Biến Động Số Dư Ví (Wallet Transactions)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'ORDER_PAYMENT', 'REFUND', 'ADMIN_ADJUST')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_member ON wallet_transactions(member_id);

-- 7. Bảng Nhật Ký Webhook SePay (SePay Transactions)
CREATE TABLE IF NOT EXISTS sepay_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL UNIQUE, -- Ràng buộc UNIQUE chống cộng ví 2 lần tuyệt đối!
  gateway TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount_in INTEGER NOT NULL CHECK (amount_in > 0),
  transaction_content TEXT NOT NULL,
  member_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'IGNORED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sepay_tx_id ON sepay_transactions(transaction_id);

-- 8. Bảng Chương Trình Quà Tặng (Giveaways)
CREATE TABLE IF NOT EXISTS giveaways (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  game_slug TEXT NOT NULL,
  total_codes INTEGER NOT NULL DEFAULT 0,
  remaining_codes INTEGER NOT NULL DEFAULT 0,
  max_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_per_user > 0),
  max_per_ip INTEGER NOT NULL DEFAULT 1 CHECK (max_per_ip > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Bảng Mã Quà Tặng Giveaway (Giveaway Codes)
CREATE TABLE IF NOT EXISTS giveaway_codes (
  id TEXT PRIMARY KEY,
  giveaway_id TEXT NOT NULL,
  code_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'CLAIMED')),
  claim_id TEXT,
  claimed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
);
CREATE INDEX IF NOT EXISTS idx_gw_codes_status ON giveaway_codes(giveaway_id, status);

-- 10. Bảng Nhật Ký Nhận Quà (Giveaway Claims)
CREATE TABLE IF NOT EXISTS giveaway_claims (
  id TEXT PRIMARY KEY,
  giveaway_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  client_ip TEXT NOT NULL,
  code_id TEXT NOT NULL UNIQUE,
  claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (giveaway_id) REFERENCES giveaways(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (code_id) REFERENCES giveaway_codes(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gw_claim_user ON giveaway_claims(giveaway_id, member_id);

-- 11. Bảng Guard Kiểm Tra Nhận Quà Nguyên Tử
CREATE TABLE IF NOT EXISTS giveaway_claim_guards (
  claim_id TEXT PRIMARY KEY,
  user_ok INTEGER NOT NULL,
  ip_ok INTEGER NOT NULL,
  stock_ok INTEGER NOT NULL
);
