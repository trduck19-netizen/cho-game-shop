-- Migration 0008: Wallet Transactions Order Reference & SePay Indexes
-- Cung cấp cột order_id cho wallet_transactions nhằm đối soát 100% chính xác
-- Bổ sung index cho sepay_transactions và NOCASE index cho thành viên

ALTER TABLE wallet_transactions ADD COLUMN order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order_id ON wallet_transactions(order_id);

CREATE TABLE IF NOT EXISTS sepay_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL UNIQUE,
  gateway TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount_in INTEGER NOT NULL CHECK (amount_in > 0),
  transaction_content TEXT NOT NULL,
  member_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'IGNORED', 'FAILED', 'UNMATCHED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sepay_tx_id ON sepay_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sepay_status ON sepay_transactions(status);

CREATE INDEX IF NOT EXISTS idx_members_id_nocase ON members(id COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_members_username_nocase ON members(username COLLATE NOCASE);
