-- Migration 0013 (khối 5): bình chọn "Hữu ích" cho đánh giá sàn.
-- File MỚI, không sửa migration cũ. Bảng marketplace_reviews đã có từ
-- migration 0012 nên ở đây chỉ thêm bảng bình chọn.
-- Lưu ý: API reviews.ts cũng có bảo vệ CREATE TABLE IF NOT EXISTS cho bảng
-- này, nên chạy hay không chạy migration này thì API vẫn hoạt động; file này
-- tồn tại để cơ sở dữ liệu có định nghĩa tường minh, dễ rà soát.
-- Số hữu ích KHÔNG lưu bộ đếm sẵn: luôn đếm trực tiếp COUNT(*) từ bảng này.

CREATE TABLE IF NOT EXISTS marketplace_review_votes (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(review_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_review_votes_review_id ON marketplace_review_votes(review_id);
