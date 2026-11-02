-- Migration 0014: Bang bang chung khieu nai san so (dieu phoi vien viet khi gop).
-- Khong sua migration cu. API coord-reads.ts cung tao bang nay IF NOT EXISTS
-- nen chay hay khong chay migration nay thi API van hoat dong; file nay de
-- co so du lieu co dinh nghia tuong minh, de ra soat.
-- Bang chung chi la mo ta bang chu, khong co file anh/video (phan nay can
-- user duyet them bang luu file, xem danh sach can duyet).
CREATE TABLE IF NOT EXISTS marketplace_dispute_evidence (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('BUYER', 'SELLER')),
  evidence_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON marketplace_dispute_evidence(dispute_id);
