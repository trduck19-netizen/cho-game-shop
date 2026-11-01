-- Migration 0006: Target D1 Production Schema
-- ACID Compliance, Atomic Guards, Strict Constraints, Zero-KV Architecture

PRAGMA foreign_keys = ON;

-- 1. Bảng Guard cho giao dịch Mua Hàng Nguyên Tử
CREATE TABLE IF NOT EXISTS order_purchase_guards (
  order_id TEXT PRIMARY KEY,
  balance_ok INTEGER NOT NULL,
  stock_ok INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Bảng Quản Lý Rate Limit theo IP trên D1 (Thay thế KV Rate Limits)
CREATE TABLE IF NOT EXISTS ip_rate_limits (
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  locked_until INTEGER DEFAULT 0,
  last_attempt INTEGER NOT NULL,
  PRIMARY KEY (ip_address, action_type)
);

-- 3. Bảng Nhật Ký Bảo Mật (Security Logs) trên D1
CREATE TABLE IF NOT EXISTS security_logs (
  id TEXT PRIMARY KEY,
  actor_name TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  ip_address TEXT,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at);

-- 4. Bổ sung các Index tăng tốc tra cứu thành viên
CREATE INDEX IF NOT EXISTS idx_members_created ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_ip ON members(registered_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_member_created ON orders(member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_member_created ON wallet_transactions(member_id, created_at);
