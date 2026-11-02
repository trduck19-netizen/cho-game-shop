-- Migration 0015: Ghi chu duyet + khoa vinh vien cho san (da duyet 02/11).
-- Quyet da chot: khoa vinh vien la trang thai rieng, chi SUPER_ADMIN ap/go,
-- bat buoc ly do bang van ban, khieu nai 7 ngay, tien kha dung van duoc rut
-- sau khi khieu nai xong. Tam khoa toi da 14 ngay roi phai quyet.
-- Ky thuat: khong sua CHECK cu cua bang sellers (sua CHECK doi hoi dung lai
-- bang, rui ro mat du lieu tren DB dang chay). Thay vao do, khoa vinh vien
-- luu bang co permanent_ban = 1 + banned_at + banned_reason + appeal_until,
-- trang thai hien thi van la SUSPENDED de moi cho kiem tra APPROVED deu
-- chan ban. Ghi chu noi bo chi luu kiem toan; tu choi chi hien ly do cho
-- nguoi ban qua sellers/me, khong hien trong danh sach san pham cong khai.
ALTER TABLE sellers ADD COLUMN admin_note TEXT DEFAULT '';
ALTER TABLE sellers ADD COLUMN permanent_ban INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sellers ADD COLUMN banned_at TEXT;
ALTER TABLE sellers ADD COLUMN banned_reason TEXT DEFAULT '';
ALTER TABLE sellers ADD COLUMN appeal_until TEXT;
ALTER TABLE sellers ADD COLUMN suspended_at TEXT;
ALTER TABLE marketplace_products ADD COLUMN admin_note TEXT DEFAULT '';
