-- Migration 0013: Tuan thu san so (khoi 6: phap ly / chong gian lan)
-- Nhanh xem truoc: preview/marketplace-so-1
-- NGUYEN TAC:
-- - Khong sua migration cu (0012 tro ve truoc), khong sua cot role cua members,
--   khong sua rang buoc cua wallet_transactions.
-- - Chi them bang/cot/chi muc moi. Neu khoi khac da nhan phan gioi han
--   gian hang moi (muc 4 ben duoi), dieu phoi vien BO muc 4 khoi file nay
--   truoc khi chay de tranh trung lap cau hinh.
-- - Ma trong kho: chi ma dung mot lan. Cot code_norm chi phuc vu so trung,
--   khong bao gio ghi noi dung ma vao nhat ky (xem functions/api/marketplace/compliance.ts).

-- 1. Nhat ky thao tac quan tri: CHI GHI THEM, KHONG SUA, KHONG XOA.
--    Tang phong thu thu nhat la o tang API: module compliance chi co
--    endpoint DOC nhat ky, khong co endpoint sua/xoa/ghi truc tiep.
--    Tang phong thu thu hai la trigger ben duoi: moi UPDATE/DELETE deu bi
--    chan ngay trong co so du lieu. Chu y: trigger cung chan ca viec don
--    dep hop le, do la chu dinh (nhat ky khong duoc don dep am tham).
--    Neu sau nay user muon chinh sach luu tru (vi du xoa log qua 2 nam),
--    phai quyet rieng va lam bang migration moi, khong sua trigger lang le.
CREATE TABLE IF NOT EXISTS marketplace_admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_member_id TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_audit_actor ON marketplace_admin_audit_log(actor_member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_audit_target ON marketplace_admin_audit_log(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_audit_action ON marketplace_admin_audit_log(action, created_at);

CREATE TRIGGER IF NOT EXISTS trg_marketplace_audit_no_update
BEFORE UPDATE ON marketplace_admin_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Nhat ky quan tri chi ghi them, khong duoc sua.');
END;

CREATE TRIGGER IF NOT EXISTS trg_marketplace_audit_no_delete
BEFORE DELETE ON marketplace_admin_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Nhat ky quan tri chi ghi them, khong duoc xoa.');
END;

-- 2. Chong trung ma giua cac gian hang.
--    code_norm = UPPER(TRIM(code_content)): so trung khong phan biet hoa
--    thuong va khoang trang dau/cuoi, vi ma game thuc te thuong nhap
--    khong phan biet hoa thuong. Chu y: day la lua chon bao thu — cung
--    mot chuoi ma o hai game khac nhau cung bi tinh la trung (xem ghi chu
--    trong compliance.ts, muc can quyet). Chi muc partial ben duoi chi
--    chan ma DANG BAN (AVAILABLE/RESERVED). Ma DA BAN (SOLD) khong bi
--    chi muc chan, nhung tang API (checkCodeDuplicates) van chan nap lai
--    ma da ban; neu dieu phoi vien muon chan cung o tang DB thi doi
--    thanh chi muc duy nhat toan phan tren code_norm (can quyet rieng,
--    vi no se khoa vinh vien moi chuoi ma tung xuat hien).
--    Khong co trang thai EXPIRED trong migration 0012 nen khong co
--    ngoai le het han nao duoc ap dung o day.
ALTER TABLE marketplace_inventory_codes ADD COLUMN code_norm TEXT;

UPDATE marketplace_inventory_codes
SET code_norm = UPPER(TRIM(code_content))
WHERE code_norm IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_codes_norm_live
ON marketplace_inventory_codes(code_norm)
WHERE status IN ('AVAILABLE', 'RESERVED');

-- 3. Chap nhan dieu khoan theo tung phien ban: moi lan dieu khoan doi
--    phien ban, gian hang phai chap nhan lai (them dong moi, khong sua
--    dong cu). Phien ban hien tai: xem TERMS_VERSION trong
--    functions/api/marketplace/compliance-logic.ts.
CREATE TABLE IF NOT EXISTS marketplace_seller_terms (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(seller_id, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller_terms_seller ON marketplace_seller_terms(seller_id, accepted_at);

-- 4. TUY CHON — Gioi han gian hang moi (quyet user 02/11 ~02:23, mac dinh
--    dieu chinh duoc, khong cai cung kho go): NULL = tat gioi han do.
--    Y nghia: gian hang moi toi da 5 san pham, moi san pham toi da 20 ma;
--    len hang chuan khi co 20 don thanh cong va ty le khieu nai duoi 5%.
--    Cach tat: dat cac cot nay ve NULL. Cach xoa han: bo muc 4 va bo
--    ham checkNewSellerLimits trong compliance-logic.ts.
ALTER TABLE marketplace_settings ADD COLUMN new_seller_max_products INTEGER DEFAULT 5;
ALTER TABLE marketplace_settings ADD COLUMN new_seller_max_codes_per_product INTEGER DEFAULT 20;
ALTER TABLE marketplace_settings ADD COLUMN standard_tier_min_completed_orders INTEGER DEFAULT 20;
ALTER TABLE marketplace_settings ADD COLUMN standard_tier_max_dispute_percent INTEGER DEFAULT 5;

UPDATE marketplace_settings
SET new_seller_max_products = COALESCE(new_seller_max_products, 5),
    new_seller_max_codes_per_product = COALESCE(new_seller_max_codes_per_product, 20),
    standard_tier_min_completed_orders = COALESCE(standard_tier_min_completed_orders, 20),
    standard_tier_max_dispute_percent = COALESCE(standard_tier_max_dispute_percent, 5)
WHERE id = 'default';
