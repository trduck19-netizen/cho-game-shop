-- ==============================================================================
-- CLOUDFLARE D1 INITIAL SCHEMA (MIGRATION 0001)
-- Enterprise-grade SQLite Edge Schema with ACID Compliance & Anti-Race Guards
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (USERS / MEMBERS)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'VIP', 'ADMIN', 'SUPER_ADMIN')),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BANNED')),
  avatar_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- 2. BẢNG DANH MỤC SẢN PHẨM & GÓI BÁN (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'game' CHECK (category IN ('game', 'utility', 'giftcard', 'account')),
  game_slug TEXT DEFAULT '',
  game_name TEXT DEFAULT '',
  original_price INTEGER NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  cover_image_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, is_active);

-- 3. BẢNG KHO MÃ CODE XUẤT BÁN (INVENTORY ITEMS - TÁCH TỪNG ROW)
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  code_value TEXT NOT NULL,
  serial_number TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  order_id TEXT DEFAULT NULL,
  sold_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inv_product_status ON inventory_items(product_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_order_id ON inventory_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inv_code_lookup ON inventory_items(code_value);

-- 4. BẢNG CHỐT CHẶN KIỂM TRA SỐ LƯỢNG KHO NGUYÊN TỬ (STOCK VALIDATION GUARD)
-- Ràng buộc NOT NULL trên verified: nếu số mã thực tế gán != số lượng mua, subquery trả về NULL
-- làm vỡ CHECK constraint -> ROLLBACK toàn bộ transaction batch, loại bỏ 100% nguy cơ over-selling!
CREATE TABLE IF NOT EXISTS order_stock_validation (
  order_id TEXT PRIMARY KEY,
  verified INTEGER NOT NULL
);

-- 5. BẢNG ĐƠN HÀNG (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  product_title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  delivered_codes TEXT NOT NULL, -- JSON Array các mã đã xuất: ["CODE1", "CODE2"]
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);

-- 6. BẢNG BIẾN ĐỘNG SỐ DƯ VÍ (WALLET TRANSACTIONS)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference_id TEXT NOT NULL, -- ORD-xxx hoặc SEPAY-xxx
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'ORDER_PAYMENT', 'REFUND', 'ADMIN_ADJUST')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ref ON wallet_transactions(reference_id);

-- 7. BẢNG GIAO DỊCH NẠP TIỀN SEPAY (SEPAY TRANSACTIONS - IDEMPOTENCY GUARD)
-- Ràng buộc UNIQUE trên gateway_tx_id: chống nạp tiền 2 lần tuyệt đối ở cấp độ cơ sở dữ liệu!
CREATE TABLE IF NOT EXISTS sepay_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway_tx_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  gateway TEXT NOT NULL,
  account_number TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'IGNORED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sepay_gateway_tx_id ON sepay_transactions(gateway_tx_id);
CREATE INDEX IF NOT EXISTS idx_sepay_user ON sepay_transactions(user_id);
