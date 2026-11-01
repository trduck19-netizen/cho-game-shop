-- Migration 0007: Idempotency Key for Orders
-- Chống double-submit và tái lặp giao dịch ngoài ý muốn

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_member_idempotency ON orders(member_id, idempotency_key);
