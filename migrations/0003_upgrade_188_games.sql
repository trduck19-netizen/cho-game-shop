-- ==============================================================================
-- Migration: 0003_upgrade_188_games.sql
-- Description: Xóa dữ liệu cũ, nâng cấp schema games và nạp 188 tựa game bản quyền
-- ==============================================================================

-- 1. Xóa toàn bộ dữ liệu mẫu cũ
DELETE FROM free_codes;
DELETE FROM paid_code_items;
DELETE FROM paid_codes;
DROP TABLE IF EXISTS games;

-- 2. Tạo bảng GAMES với đầy đủ trường pháp lý, giấy phép G1, ngày phát hành & hướng dẫn nhập code
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  slug TEXT NOT NULL UNIQUE,
  publisher TEXT,
  category TEXT,
  rating REAL DEFAULT 5,
  icon_url TEXT,
  banner_url TEXT,
  description TEXT,
  instructions TEXT,
  platform TEXT,
  so_giay_phep TEXT,
  ngay_cap_phep TEXT,
  release_date TEXT,
  do_tuoi TEXT,
  trang_thai_gp TEXT,
  website_g1 TEXT,
  link_codemoi TEXT,
  download_android TEXT,
  download_ios TEXT,
  download_pc TEXT,
  redeem_url TEXT,
  is_featured INTEGER DEFAULT 1,
  is_hot INTEGER DEFAULT 1,
  is_new INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_release ON games(release_date);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);

-- 3. Nạp 188 tựa game bản quyền
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('anh-hung-tien-len', 'Anh Hùng Tiến Lên', 'anh-hung-tien-len', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM (CMN Online)', 'IDLE & Nhập Vai', 5, '/game_icons/anh-hung-tien-len.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Anh Hùng Tiến Lên mới nhất Tháng 09/2026. Tựa game IDLE ARPG phong cách Châu Âu đỉnh cao do CMN Online phát hành chính thức tại Việt Nam theo Giấy phép G1 số 218/QĐ-BTTTT. Chiêu mộ hiệp sĩ, pháp sư, cung thủ huyền thoại, tự động vượt ải nhận ngay Kim Cương, Rương Thần Tướng VIP!', '1. Mở game Anh Hùng Tiến Lên trên điện thoại hoặc giả lập PC.
2. Bấm vào Avatar nhân vật (góc trên bên trái màn hình) hoặc biểu tượng Sảnh Phúc Lợi / Cài Đặt.
3. Chọn mục ''Giftcode'' hoặc ''Mã Kích Hoạt''.
4. Dán mã code vừa sao chép và bấm ''Đổi Quà'' / ''Xác Nhận'' để nhận phần thưởng qua Hòm Thư.', 'Android, iOS, PC', '218/QĐ-BTTTT', '20/07/2026', '2026-07-20', '12+', 'Đang hoạt động', 'https://anhhungcmn.vn, https://cmn.vn', 'https://codemoi.net/games/anh-hung-tien-len/', 'https://play.google.com/store/apps/details?id=vn.cmn.anhhungtienlen', 'https://apps.apple.com/app/anh-hung-tien-len/id6478901234', 'https://anhhungcmn.vn', 'https://anhhungcmn.vn/giftcode', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('lien-quan-mobile', 'Liên Quân Mobile', 'lien-quan-mobile', 'CÔNG TY CỔ PHẦN GIẢI TRÍ VÀ THỂ THAO ĐIỆN TỬ VIỆT NAM', 'Chiến Thuật & MOBA', 5, '/game_icons/lien-quan-mobile.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Liên Quân Mobile mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ VÀ THỂ THAO ĐIỆN TỬ VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 351/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Liên Quân Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '351/QĐ-PTTH&TTĐT', '15/06/2026', '2026-06-15', '16+', 'Đang hoạt động', 'https://lienquan.garena.vn, https://lienquanmobi.vn', 'https://codemoi.net/games/lien-quan-mobile/', 'https://lienquan.garena.vn, https://lienquanmobi.vn', 'https://lienquan.garena.vn, https://lienquanmobi.vn', 'https://lienquan.garena.vn, https://lienquanmobi.vn', 'https://lienquan.garena.vn, https://lienquanmobi.vn', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('genshin-impact', 'Genshin Impact', 'genshin-impact', 'CÔNG TY CỔ PHẦN FUNTAP GAMES', 'Gacha & Anime', 5, '/game_icons/genshin-impact.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Genshin Impact mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP GAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 401/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Genshin Impact trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '401/QĐ-PTTH&TTĐT', '06/07/2026', '2026-07-06', '18+', 'Đang hoạt động', 'https://genshin.funtap.games', 'https://codemoi.net/games/genshin-impact/', 'https://genshin.funtap.games', 'https://genshin.funtap.games', 'https://genshin.funtap.games', 'https://genshin.funtap.games', 1, 1, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dau-truong-chan-ly', 'Đấu Trường Chân Lý', 'dau-truong-chan-ly', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Thẻ Bài Đấu Tướng', 5, '/game_icons/dau-truong-chan-ly.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đấu Trường Chân Lý mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 104/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đấu Trường Chân Lý trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '104/QĐ-PTTH&TTĐT', '01/03/2026', '2026-03-01', '18+', 'Đang hoạt động', 'https://dtcl.vnggames.com', 'https://codemoi.net/games/dau-truong-chan-ly/', 'https://dtcl.vnggames.com', 'https://dtcl.vnggames.com', 'https://dtcl.vnggames.com', 'https://dtcl.vnggames.com', 1, 1, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('play-together', 'Play Together', 'play-together', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Casual & Giải Trí', 5, '/game_icons/play-together.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Play Together mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 280/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Play Together trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '280/QĐ-PTTH&TTĐT', '26/05/2026', '2026-05-26', '12+', 'Đang hoạt động', 'https://playtogether.vnggames.com', 'https://codemoi.net/games/play-together/', 'https://playtogether.vnggames.com', 'https://playtogether.vnggames.com', 'https://playtogether.vnggames.com', 'https://playtogether.vnggames.com', 1, 1, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('pubg-mobile', 'PUBG MOBILE', 'pubg-mobile', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Hành Động FPS & MOBA', 4.9, '/game_icons/pubg-mobile.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode PUBG MOBILE mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 311/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game PUBG MOBILE trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '311/QĐ-PTTH&TTĐT', '09/07/2025', '2025-07-09', '18+', 'Đang hoạt động', 'https://pubgm.vnggames.com, https://pubgm.zing.vn', 'https://codemoi.net/games/pubg-mobile/', 'https://pubgm.vnggames.com, https://pubgm.zing.vn', 'https://pubgm.vnggames.com, https://pubgm.zing.vn', 'https://pubgm.vnggames.com, https://pubgm.zing.vn', 'https://pubgm.vnggames.com, https://pubgm.zing.vn', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('call-of-duty-mobile-vn', 'Call of Duty: Mobile VN', 'call-of-duty-mobile-vn', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Hành Động FPS & MOBA', 4.9, '/game_icons/call-of-duty-mobile-vn.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Call of Duty: Mobile VN mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 133/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Call of Duty: Mobile VN trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '133/QĐ-PTTH&TTĐT', '15/03/2026', '2026-03-15', '18+', 'Đang hoạt động', 'https://codm.360mobi.vn, https://codm.vnggames.com', 'https://codemoi.net/games/call-of-duty-mobile-vn/', 'https://codm.360mobi.vn, https://codm.vnggames.com', 'https://codm.360mobi.vn, https://codm.vnggames.com', 'https://codm.360mobi.vn, https://codm.vnggames.com', 'https://codm.360mobi.vn, https://codm.vnggames.com', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('zingspeed-mobile', 'ZingSpeed Mobile', 'zingspeed-mobile', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Hành Động FPS & MOBA', 4.9, '/game_icons/zingspeed-mobile.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode ZingSpeed Mobile mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 79/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game ZingSpeed Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '79/QĐ-PTTH&TTĐT', '11/02/2026', '2026-02-11', '12+', 'Đang hoạt động', 'https://zingspeedm.vnggames.com', 'https://codemoi.net/games/zingspeed-mobile/', 'https://zingspeedm.vnggames.com', 'https://zingspeedm.vnggames.com', 'https://zingspeedm.vnggames.com', 'https://zingspeedm.vnggames.com', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mobile-legends-bang-bang', 'Mobile Legends: Bang Bang', 'mobile-legends-bang-bang', 'CÔNG TY CỔ PHẦN PHÁT TRIỂN CÔNG NGHỆ SỐ HỒNG HÀ', 'Hành Động FPS & MOBA', 4.9, '/game_icons/mobile-legends-bang-bang.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Mobile Legends: Bang Bang mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN PHÁT TRIỂN CÔNG NGHỆ SỐ HỒNG HÀ phát hành chính thức tại Việt Nam theo Giấy phép G1 số 96/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Mobile Legends: Bang Bang trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '96/QĐ-BTTTT', '23/01/2022', '2022-01-23', '18+', 'Đang hoạt động', 'https://mladventure.hhgame.vn', 'https://codemoi.net/games/mobile-legends-bang-bang/', 'https://mladventure.hhgame.vn', 'https://mladventure.hhgame.vn', 'https://mladventure.hhgame.vn', 'https://mladventure.hhgame.vn', 1, 1, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vo-lam-truyen-ky-1-mobile', 'Võ Lâm Truyền Kỳ 1 Mobile', 'vo-lam-truyen-ky-1-mobile', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Tiên Hiệp & Kiếm Hiệp', 4.9, '/game_icons/vo-lam-truyen-ky-1-mobile.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Võ Lâm Truyền Kỳ 1 Mobile mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 112/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Võ Lâm Truyền Kỳ 1 Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '112/QĐ-PTTH&TTĐT', '04/03/2026', '2026-03-04', '18+', 'Đang hoạt động', 'https://vltkm.zing.vn, https://vltkm.360game.vn, https://vltkm.vnggames.com', 'https://codemoi.net/games/vo-lam-truyen-ky-1-mobile/', 'https://vltkm.zing.vn, https://vltkm.360game.vn, https://vltkm.vnggames.com', 'https://vltkm.zing.vn, https://vltkm.360game.vn, https://vltkm.vnggames.com', 'https://vltkm.zing.vn, https://vltkm.360game.vn, https://vltkm.vnggames.com', 'https://vltkm.zing.vn, https://vltkm.360game.vn, https://vltkm.vnggames.com', 1, 1, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-the-origin', 'Kiếm Thế Origin VNG', 'kiem-the-origin', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Tiên Hiệp & Kiếm Hiệp', 4.9, '/game_icons/kiem-the-origin.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Thế Origin VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 533/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Thế Origin VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '533/QĐ-PTTH&TTĐT', '01/12/2025', '2025-12-01', '18+', 'Đang hoạt động', 'https://kto.vnggames.com', 'https://codemoi.net/games/kiem-the-origin/', 'https://kto.vnggames.com', 'https://kto.vnggames.com', 'https://kto.vnggames.com', 'https://kto.vnggames.com', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('gunny-origin', 'Gunny Origin', 'gunny-origin', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Game Mobile Hot', 4.9, '/game_icons/gunny-origin.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Gunny Origin mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 534/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Gunny Origin trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '534/QĐ-PTTH&TTĐT', '01/12/2025', '2025-12-01', '12+', 'Đang hoạt động', 'https://gunnyorigin.vnggames.com', 'https://codemoi.net/games/gunny-origin/', 'https://gunnyorigin.vnggames.com', 'https://gunnyorigin.vnggames.com', 'https://gunnyorigin.vnggames.com', 'https://gunnyorigin.vnggames.com', 1, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('zenless-zone-zero', 'Zenless Zone Zero', 'zenless-zone-zero', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.9, '/game_icons/zenless-zone-zero.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Zenless Zone Zero mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 674/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Zenless Zone Zero trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '674/QĐ-BTTTT', '25/04/2024', '2024-04-25', '18+', 'Đang hoạt động', 'www.zenless.gamota.com', 'https://codemoi.net/games/zenless-zone-zero/', 'www.zenless.gamota.com', 'www.zenless.gamota.com', 'www.zenless.gamota.com', 'www.zenless.gamota.com', 1, 1, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thoi-dai-anh-hung', 'Top Heroes - Thời Đại Anh Hùng', 'thoi-dai-anh-hung', 'CÔNG TY CỔ PHẦN FUNTAP GAMES', 'Game Mobile', 4.8, '/game_icons/thoi-dai-anh-hung.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Top Heroes - Thời Đại Anh Hùng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP GAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 519/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Top Heroes - Thời Đại Anh Hùng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '519/QĐ-PTTH&TTĐT', '13/08/2026', '2026-08-13', '18+', 'Đang hoạt động', 'https://topheroes.funtap.games', 'https://codemoi.net/games/thoi-dai-anh-hung/', 'https://topheroes.funtap.games', 'https://topheroes.funtap.games', 'https://topheroes.funtap.games', 'https://topheroes.funtap.games', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tieu-cuong-3q', 'Tiểu Cường 3Q', 'tieu-cuong-3q', 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO', 'Tam Quốc', 4.8, '/game_icons/tieu-cuong-3q.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tiểu Cường 3Q mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 365 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tiểu Cường 3Q trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '365 /QĐ-PTTH&TTĐT', '22/06/2026', '2026-06-22', '18+', 'Đang hoạt động', 'https://tieucuong.alogame.vn', 'https://codemoi.net/games/tieu-cuong-3q/', 'https://tieucuong.alogame.vn', 'https://tieucuong.alogame.vn', 'https://tieucuong.alogame.vn', 'https://tieucuong.alogame.vn', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('omg-3q', 'OMG 3Q', 'omg-3q', 'Công ty TNHH VNGGames', 'Tam Quốc', 4.8, '/game_icons/omg-3q.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode OMG 3Q mới nhất 2026. Tựa game do Công ty TNHH VNGGames phát hành chính thức tại Việt Nam theo Giấy phép G1 số 574/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game OMG 3Q trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '574/QĐ-PTTH&TTĐT', '23/12/2025', '2025-12-23', '18+', 'Đang hoạt động', 'https://omg3q.vnggames.com/', 'https://codemoi.net/games/omg-3q/', 'https://omg3q.vnggames.com/', 'https://omg3q.vnggames.com/', 'https://omg3q.vnggames.com/', 'https://omg3q.vnggames.com/', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thieu-nien-3q-vng', 'Thiếu Niên 3Q VNG', 'thieu-nien-3q-vng', 'CÔNG TY CỔ PHẦN GAMOTA', 'Tam Quốc', 4.8, '/game_icons/thieu-nien-3q-vng.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thiếu Niên 3Q VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 583/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thiếu Niên 3Q VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '583/QĐ-PTTH&TTĐT', '29/12/2025', '2025-12-29', '18+', 'Đang hoạt động', 'https://tn3q.gamota.com', 'https://codemoi.net/games/thieu-nien-3q-vng/', 'https://tn3q.gamota.com', 'https://tn3q.gamota.com', 'https://tn3q.gamota.com', 'https://tn3q.gamota.com', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dau-la-dai-luc', 'Đấu La Đại Lục', 'dau-la-dai-luc', 'CÔNG TY CỔ PHẦN FUNTAP GAMES', 'Game Mobile Hot', 4.8, '/game_icons/dau-la-dai-luc.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đấu La Đại Lục mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP GAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 251/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đấu La Đại Lục trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '251/QĐ-PTTH&TTĐT', '14/05/2026', '2026-05-14', '18+', 'Đang hoạt động', 'https://daulasanhon.funtap.games', 'https://codemoi.net/games/dau-la-dai-luc/', 'https://daulasanhon.funtap.games', 'https://daulasanhon.funtap.games', 'https://daulasanhon.funtap.games', 'https://daulasanhon.funtap.games', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('nhat-niem-tieu-dao-gzone', 'Nhất Niệm Tiêu Dao - Gzone', 'nhat-niem-tieu-dao-gzone', 'CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM', 'Game Mobile Hot', 4.8, '/game_icons/nhat-niem-tieu-dao-gzone.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Nhất Niệm Tiêu Dao - Gzone mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1622/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Nhất Niệm Tiêu Dao - Gzone trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1622/QĐ-BTTTT', '28/08/2022', '2022-08-28', '18+', 'Đang hoạt động', 'www.nntd.zoneplay.vn', 'https://codemoi.net/games/nhat-niem-tieu-dao-gzone/', 'www.nntd.zoneplay.vn', 'www.nntd.zoneplay.vn', 'www.nntd.zoneplay.vn', 'www.nntd.zoneplay.vn', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('nam-lun-tien-len', 'Nấm Lùn Tiến Lên', 'nam-lun-tien-len', 'CÔNG TY CỔ PHẦN GIẢI TRÍ THIÊN THƯỢNG HỎA', 'Game Mobile Hot', 4.8, '/game_icons/nam-lun-tien-len.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Nấm Lùn Tiến Lên mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ THIÊN THƯỢNG HỎA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 150/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Nấm Lùn Tiến Lên trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '150/QĐ-BTTTT', '05/02/2024', '2024-02-05', '18+', 'Đang hoạt động', 'http://maplerushtth.com', 'https://codemoi.net/games/nam-lun-tien-len/', 'http://maplerushtth.com', 'http://maplerushtth.com', 'http://maplerushtth.com', 'http://maplerushtth.com', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('rise-of-kingdoms', 'Rise of Kingdoms', 'rise-of-kingdoms', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.8, '/game_icons/rise-of-kingdoms.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Rise of Kingdoms mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1731 /QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Rise of Kingdoms trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1731 /QĐ-BTTTT', '31/10/2021', '2021-10-31', '18t', 'Đang hoạt động', 'www.riseofkingdoms.gamota.com', 'https://codemoi.net/games/rise-of-kingdoms/', 'www.riseofkingdoms.gamota.com', 'www.riseofkingdoms.gamota.com', 'www.riseofkingdoms.gamota.com', 'www.riseofkingdoms.gamota.com', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('lords-mobile', 'Lords Mobile: Kingdom Wars', 'lords-mobile', 'CÔNG TY CỔ PHẦN GAMOTA', 'Chiến Thuật & MOBA', 4.8, '/game_icons/lords-mobile.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Lords Mobile: Kingdom Wars mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 286/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Lords Mobile: Kingdom Wars trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '286/QĐ-PTTH&TTĐT', '28/05/2026', '2026-05-28', '18+', 'Đang hoạt động', 'www.lordsmobile.igg.gamota.com', 'https://codemoi.net/games/lords-mobile/', 'www.lordsmobile.igg.gamota.com', 'www.lordsmobile.igg.gamota.com', 'www.lordsmobile.igg.gamota.com', 'www.lordsmobile.igg.gamota.com', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ever-night-thuc-tinh-oeg', 'Ever Night: Thức Tỉnh - OEG', 'ever-night-thuc-tinh-oeg', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG', 'Game Mobile', 4.8, '/game_icons/ever-night-thuc-tinh-oeg.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ever Night: Thức Tỉnh - OEG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 532/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ever Night: Thức Tỉnh - OEG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '532/QĐ-PTTH&TTĐT', '19/08/2026', '2026-08-19', '18+', 'Đang hoạt động', 'https://evernight.oeg.vn', 'https://codemoi.net/games/ever-night-thuc-tinh-oeg/', 'https://evernight.oeg.vn', 'https://evernight.oeg.vn', 'https://evernight.oeg.vn', 'https://evernight.oeg.vn', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('delta-force', 'Delta Force', 'delta-force', 'CÔNG TY TNHH DỊCH VỤ PHẦN MỀM HÒA THÁI', 'Game Mobile Hot', 4.8, '/game_icons/delta-force.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Delta Force mới nhất 2026. Tựa game do CÔNG TY TNHH DỊCH VỤ PHẦN MỀM HÒA THÁI phát hành chính thức tại Việt Nam theo Giấy phép G1 số 231/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Delta Force trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '231/QĐ-PTTH&TTĐT', '05/05/2026', '2026-05-05', '18+', 'Đang hoạt động', 'https://deltaforce.vn', 'https://codemoi.net/games/delta-force/', 'https://deltaforce.vn', 'https://deltaforce.vn', 'https://deltaforce.vn', 'https://deltaforce.vn', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('crossfire-legends-mobile-vng', 'Crossfire: Legends Mobile VNG', 'crossfire-legends-mobile-vng', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Hành Động FPS & MOBA', 4.8, '/game_icons/crossfire-legends-mobile-vng.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Crossfire: Legends Mobile VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 252/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Crossfire: Legends Mobile VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '252/QĐ-PTTH&TTĐT', '14/05/2026', '2026-05-14', '18+', 'Đang hoạt động', 'https://cfl.vnggames.com', 'https://codemoi.net/games/crossfire-legends-mobile-vng/', 'https://cfl.vnggames.com', 'https://cfl.vnggames.com', 'https://cfl.vnggames.com', 'https://cfl.vnggames.com', 0, 1, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-quoc-chi-chien-luoc-tth', 'Tam Quốc Chí - Chiến Lược -TTH', 'tam-quoc-chi-chien-luoc-tth', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Tam Quốc', 4.7, '/game_icons/tam-quoc-chi-chien-luoc-tth.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Quốc Chí - Chiến Lược -TTH mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 410/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Quốc Chí - Chiến Lược -TTH trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '410/QĐ-PTTH&TTĐT', '07/07/2026', '2026-07-07', '18+', 'Đang hoạt động', 'https://tamquocchi.splay.vn', 'https://codemoi.net/games/tam-quoc-chi-chien-luoc-tth/', 'https://tamquocchi.splay.vn', 'https://tamquocchi.splay.vn', 'https://tamquocchi.splay.vn', 'https://tamquocchi.splay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('loan-xi-ngau-3q-oeg', 'Loạn Xì Ngầu 3Q – OEG', 'loan-xi-ngau-3q-oeg', 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO', 'Tam Quốc', 4.7, '/game_icons/loan-xi-ngau-3q-oeg.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Loạn Xì Ngầu 3Q – OEG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 264/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Loạn Xì Ngầu 3Q – OEG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '264/QĐ-PTTH&TTĐT', '19/05/2026', '2026-05-19', '18+', 'Đang hoạt động', 'http://loanxingau3q.alogame.vn', 'https://codemoi.net/games/loan-xi-ngau-3q-oeg/', 'http://loanxingau3q.alogame.vn', 'http://loanxingau3q.alogame.vn', 'http://loanxingau3q.alogame.vn', 'http://loanxingau3q.alogame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('danh-tuong-3q-vng', 'Danh Tướng 3Q - VNG', 'danh-tuong-3q-vng', 'CÔNG TY CỔ PHẦN VNG', 'Tam Quốc', 4.7, '/game_icons/danh-tuong-3q-vng.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Danh Tướng 3Q - VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 215/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Danh Tướng 3Q - VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '215/QĐ-PTTH&TTĐT', '28/05/2025', '2025-05-28', '18+', 'Đang hoạt động', 'www.dt3q.zing.vn', 'https://codemoi.net/games/danh-tuong-3q-vng/', 'www.dt3q.zing.vn', 'www.dt3q.zing.vn', 'www.dt3q.zing.vn', 'www.dt3q.zing.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('arknights-endfield', 'Arknights: Endfield', 'arknights-endfield', 'CÔNG TY CỔ PHẦN FUNTAP GAMES', 'Gacha & Anime', 4.7, '/game_icons/arknights-endfield.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Arknights: Endfield mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP GAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 381/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Arknights: Endfield trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '381/QĐ-PTTH&TTĐT', '02/07/2026', '2026-07-02', '18+', 'Đang hoạt động', 'https://endfield.funtap.games', 'https://codemoi.net/games/arknights-endfield/', 'https://endfield.funtap.games', 'https://endfield.funtap.games', 'https://endfield.funtap.games', 'https://endfield.funtap.games', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tokyo-ghoul-thuc-tinh', 'Tokyo Ghoul：Thức Tỉnh', 'tokyo-ghoul-thuc-tinh', 'CÔNG TY CỔ PHẦN GAMOTA', 'Anime & Manga', 4.7, '/game_icons/tokyo-ghoul-thuc-tinh.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tokyo Ghoul：Thức Tỉnh mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 465/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tokyo Ghoul：Thức Tỉnh trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '465/QĐ-PTTH&TTĐT', '21/10/2025', '2025-10-21', '18+', 'Đang hoạt động', 'https://tgtt.gamota.com', 'https://codemoi.net/games/tokyo-ghoul-thuc-tinh/', 'https://tgtt.gamota.com', 'https://tgtt.gamota.com', 'https://tgtt.gamota.com', 'https://tgtt.gamota.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('lineage-w', 'Lineage W', 'lineage-w', 'Công ty TNHH VNGGames', 'Game Mobile Hot', 4.7, '/game_icons/lineage-w.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Lineage W mới nhất 2026. Tựa game do Công ty TNHH VNGGames phát hành chính thức tại Việt Nam theo Giấy phép G1 số 40/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Lineage W trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '40/QĐ-PTTH&TTĐT', '29/01/2026', '2026-01-29', '18+', 'Đang hoạt động', 'https://lineagew.vnggames.com/', 'https://codemoi.net/games/lineage-w/', 'https://lineagew.vnggames.com/', 'https://lineagew.vnggames.com/', 'https://lineagew.vnggames.com/', 'https://lineagew.vnggames.com/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hero-clash', 'Hero Clash', 'hero-clash', 'CÔNG TY CỔ PHẦN TRÒ CHƠI MỘC', 'Game Mobile Hot', 4.7, '/game_icons/hero-clash.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hero Clash mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRÒ CHƠI MỘC phát hành chính thức tại Việt Nam theo Giấy phép G1 số 807/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hero Clash trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '807/QĐ-BTTTT', '15/05/2024', '2024-05-15', '18+', 'Đang hoạt động', 'http://heroclash.mocgame.vn', 'https://codemoi.net/games/hero-clash/', 'http://heroclash.mocgame.vn', 'http://heroclash.mocgame.vn', 'http://heroclash.mocgame.vn', 'http://heroclash.mocgame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mu-vinh-hang', 'MU: Vĩnh Hằng', 'mu-vinh-hang', 'CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN 3T', 'Game Mobile Hot', 4.7, '/game_icons/mu-vinh-hang.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode MU: Vĩnh Hằng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN 3T phát hành chính thức tại Việt Nam theo Giấy phép G1 số 514/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game MU: Vĩnh Hằng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '514/QĐ-PTTH&TTĐT', '13/11/2025', '2025-11-13', '18+', 'Đang hoạt động', 'www.muvh.vn', 'https://codemoi.net/games/mu-vinh-hang/', 'www.muvh.vn', 'www.muvh.vn', 'www.muvh.vn', 'www.muvh.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mu-hong-hoa-dao', 'MU: Hồng Hoả Đao', 'mu-hong-hoa-dao', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.7, '/game_icons/mu-hong-hoa-dao.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode MU: Hồng Hoả Đao mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 333/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game MU: Hồng Hoả Đao trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '333/QĐ-PTTH&TTĐT', '29/07/2025', '2025-07-29', '18+', 'Đang hoạt động', 'www.muhhd.gamota.com', 'https://codemoi.net/games/mu-hong-hoa-dao/', 'www.muhhd.gamota.com', 'www.muhhd.gamota.com', 'www.muhhd.gamota.com', 'www.muhhd.gamota.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tay-du-vng', 'Tây Du VNG: Đại Náo Tam Giới', 'tay-du-vng', 'CÔNG TY CỔ PHẦN VNG', 'Game Mobile Hot', 4.7, '/game_icons/tay-du-vng.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tây Du VNG: Đại Náo Tam Giới mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 118/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tây Du VNG: Đại Náo Tam Giới trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '118/QĐ-PTTH&TTĐT', '16/04/2025', '2025-04-16', '18+', 'Đang hoạt động', 'https://taydu.vnggames.net', 'https://codemoi.net/games/tay-du-vng/', 'https://taydu.vnggames.net', 'https://taydu.vnggames.net', 'https://taydu.vnggames.net', 'https://taydu.vnggames.net', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vo-lam-dai-minh-tinh', 'Võ Lâm Đại Minh Tinh', 'vo-lam-dai-minh-tinh', 'CÔNG TY TNHH PHẦN MỀM MGOL', 'Tiên Hiệp & Kiếm Hiệp', 4.7, '/game_icons/vo-lam-dai-minh-tinh.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Võ Lâm Đại Minh Tinh mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM MGOL phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1791/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Võ Lâm Đại Minh Tinh trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1791/QĐ-BTTTT', '17/10/2024', '2024-10-17', '18+', 'Đang hoạt động', 'http://vldmt.mgol.vn', 'https://codemoi.net/games/vo-lam-dai-minh-tinh/', 'http://vldmt.mgol.vn', 'http://vldmt.mgol.vn', 'http://vldmt.mgol.vn', 'http://vldmt.mgol.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tan-vo-lam', 'Tân Võ Lâm', 'tan-vo-lam', 'CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN GIGANTIC', 'Tiên Hiệp & Kiếm Hiệp', 4.7, '/game_icons/tan-vo-lam.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tân Võ Lâm mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN GIGANTIC phát hành chính thức tại Việt Nam theo Giấy phép G1 số 200/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tân Võ Lâm trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '200/QĐ-PTTH&TTĐT', '15/04/2026', '2026-04-15', '18+', 'Đang hoạt động', 'https://tanvolam.gigantic.vn', 'https://codemoi.net/games/tan-vo-lam/', 'https://tanvolam.gigantic.vn', 'https://tanvolam.gigantic.vn', 'https://tanvolam.gigantic.vn', 'https://tanvolam.gigantic.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-quoc-tranh-ba-thien-ha', 'Tam Quốc: Tranh Bá Thiên Hạ', 'tam-quoc-tranh-ba-thien-ha', 'Công ty TNHH Trò chơi Mộc', 'Tam Quốc', 4.7, '/game_icons/tam-quoc-tranh-ba-thien-ha.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Quốc: Tranh Bá Thiên Hạ mới nhất 2026. Tựa game do Công ty TNHH Trò chơi Mộc phát hành chính thức tại Việt Nam theo Giấy phép G1 số 419/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Quốc: Tranh Bá Thiên Hạ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '419/QĐ-PTTH&TTĐT', '14/07/2026', '2026-07-14', '18+', 'Đang hoạt động', 'https://tqywvn.mocgame.vn/', 'https://codemoi.net/games/tam-quoc-tranh-ba-thien-ha/', 'https://tqywvn.mocgame.vn/', 'https://tqywvn.mocgame.vn/', 'https://tqywvn.mocgame.vn/', 'https://tqywvn.mocgame.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('doi-tuong-nhi-nho', 'Đội Tướng Nhí Nhố', 'doi-tuong-nhi-nho', 'CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN KAN', 'Casual & Giải Trí', 4.7, '/game_icons/doi-tuong-nhi-nho.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đội Tướng Nhí Nhố mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN KAN phát hành chính thức tại Việt Nam theo Giấy phép G1 số 440 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đội Tướng Nhí Nhố trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '440 /QĐ-PTTH&TTĐT', '21/07/2026', '2026-07-21', '18+', 'Đang hoạt động', 'http://doituongnhinho.vn/', 'https://codemoi.net/games/doi-tuong-nhi-nho/', 'http://doituongnhinho.vn/', 'http://doituongnhinho.vn/', 'http://doituongnhinho.vn/', 'http://doituongnhinho.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('manga-ba-chay', 'Manga Bá Cháy', 'manga-ba-chay', 'CÔNG TY CỔ PHẦN VGP', 'Gacha & Anime', 4.7, '/game_icons/manga-ba-chay.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Manga Bá Cháy mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 409/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Manga Bá Cháy trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '409/QĐ-PTTH&TTĐT', '07/07/2026', '2026-07-07', '18+', 'Đang hoạt động', 'https://mangabachay.vgplay.vn', 'https://codemoi.net/games/manga-ba-chay/', 'https://mangabachay.vgplay.vn', 'https://mangabachay.vgplay.vn', 'https://mangabachay.vgplay.vn', 'https://mangabachay.vgplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('phuong-hoang-tru-tien', 'Phượng Hoàng Tru Tiên', 'phuong-hoang-tru-tien', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Kiếm Hiệp & Tiên Hiệp', 4.7, '/game_icons/phuong-hoang-tru-tien.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Phượng Hoàng Tru Tiên mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 267/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Phượng Hoàng Tru Tiên trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '267/QĐ-PTTH&TTĐT', '19/05/2026', '2026-05-19', '18+', 'Đang hoạt động', 'https://phuonghoangtrutien.vplay.vn', 'https://codemoi.net/games/phuong-hoang-tru-tien/', 'https://phuonghoangtrutien.vplay.vn', 'https://phuonghoangtrutien.vplay.vn', 'https://phuonghoangtrutien.vplay.vn', 'https://phuonghoangtrutien.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thao-tung-tam-quoc', 'Thao Túng Tam Quốc', 'thao-tung-tam-quoc', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tam Quốc', 4.7, '/game_icons/thao-tung-tam-quoc.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thao Túng Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 277/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thao Túng Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '277/QĐ-PTTH&TTĐT', '25/05/2026', '2026-05-25', '18+', 'Đang hoạt động', 'www.thaotungtamquoc.vplay.vn', 'https://codemoi.net/games/thao-tung-tam-quoc/', 'www.thaotungtamquoc.vplay.vn', 'www.thaotungtamquoc.vplay.vn', 'www.thaotungtamquoc.vplay.vn', 'www.thaotungtamquoc.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('quan-anh-phong-hoa-luc', 'Tam Quốc Quần Anh', 'quan-anh-phong-hoa-luc', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tam Quốc', 4.7, '/game_icons/quan-anh-phong-hoa-luc.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Quốc Quần Anh mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 350/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Quốc Quần Anh trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '350/QĐ-PTTH&TTĐT', '15/06/2026', '2026-06-15', '18+', 'Đang hoạt động', 'https://tamquocquananh.vplay.vn', 'https://codemoi.net/games/quan-anh-phong-hoa-luc/', 'https://tamquocquananh.vplay.vn', 'https://tamquocquananh.vplay.vn', 'https://tamquocquananh.vplay.vn', 'https://tamquocquananh.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('loan-the-3q-than-ma-lenh-oeg', 'Loạn Thế 3Q: Thần Ma Lệnh - OEG', 'loan-the-3q-than-ma-lenh-oeg', 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO', 'Tam Quốc', 4.7, '/game_icons/loan-the-3q-than-ma-lenh-oeg.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Loạn Thế 3Q: Thần Ma Lệnh - OEG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 475/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Loạn Thế 3Q: Thần Ma Lệnh - OEG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '475/QĐ-PTTH&TTĐT', '02/08/2026', '2026-08-02', '18+', 'Đang hoạt động', 'https://loanthe3q.alogame.vn/', 'https://codemoi.net/games/loan-the-3q-than-ma-lenh-oeg/', 'https://loanthe3q.alogame.vn/', 'https://loanthe3q.alogame.vn/', 'https://loanthe3q.alogame.vn/', 'https://loanthe3q.alogame.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('giang-ho-bat-phai-phan-tranh', 'Giang Hồ Bát Phái Phân Tranh', 'giang-ho-bat-phai-phan-tranh', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Kiếm Hiệp & Tiên Hiệp', 4.7, '/game_icons/giang-ho-bat-phai-phan-tranh.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Giang Hồ Bát Phái Phân Tranh mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 434/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Giang Hồ Bát Phái Phân Tranh trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '434/QĐ-PTTH&TTĐT', '20/07/2026', '2026-07-20', '18+', 'Đang hoạt động', 'https://gianghobatphai.splay.vn', 'https://codemoi.net/games/giang-ho-bat-phai-phan-tranh/', 'https://gianghobatphai.splay.vn', 'https://gianghobatphai.splay.vn', 'https://gianghobatphai.splay.vn', 'https://gianghobatphai.splay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('cookierun-banh-quy', 'CookieRun: Bánh Quy Đại Chiến', 'cookierun-banh-quy', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Casual & Giải Trí', 4.7, '/game_icons/cookierun-banh-quy.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode CookieRun: Bánh Quy Đại Chiến mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 469/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game CookieRun: Bánh Quy Đại Chiến trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '469/QĐ-PTTH&TTĐT', '28/07/2026', '2026-07-28', '16+', 'Đang hoạt động', 'https://ovensmash.vnggames.com', 'https://codemoi.net/games/cookierun-banh-quy/', 'https://ovensmash.vnggames.com', 'https://ovensmash.vnggames.com', 'https://ovensmash.vnggames.com', 'https://ovensmash.vnggames.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('huyen-thoai-lang-la', 'Huyền Thoại Làng Lá', 'huyen-thoai-lang-la', 'CÔNG TY CỔ PHẦN ACE GAME', 'Game Mobile Hot', 4.7, '/game_icons/huyen-thoai-lang-la.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Huyền Thoại Làng Lá mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN ACE GAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 388/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Huyền Thoại Làng Lá trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '388/QĐ-BTTTT', '25/03/2024', '2024-03-25', '18+', 'Đang hoạt động', 'www.huyenthoailangla.vn', 'https://codemoi.net/games/huyen-thoai-lang-la/', 'www.huyenthoailangla.vn', 'www.huyenthoailangla.vn', 'www.huyenthoailangla.vn', 'www.huyenthoailangla.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dislyte', 'Dislyte: Nhịp Điệu Huyền Bí', 'dislyte', 'CÔNG TY CỔ PHẦN TRAVELLET VIỆT NAM', 'Game Mobile Hot', 4.7, '/game_icons/dislyte.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Dislyte: Nhịp Điệu Huyền Bí mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRAVELLET VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 501/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Dislyte: Nhịp Điệu Huyền Bí trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '501/QĐ-BTTTT', '30/03/2023', '2023-03-30', '18+', 'Đang hoạt động', 'http://games.travellet.vn/games/ddhb', 'https://codemoi.net/games/dislyte/', 'http://games.travellet.vn/games/ddhb', 'http://games.travellet.vn/games/ddhb', 'http://games.travellet.vn/games/ddhb', 'http://games.travellet.vn/games/ddhb', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ragnarok-huyen-thoai-mmo', 'Ragnarok: Huyền Thoại MMO', 'ragnarok-huyen-thoai-mmo', 'CÔNG TY CỔ PHẦN THS GAME', 'Game Mobile Hot', 4.7, '/game_icons/ragnarok-huyen-thoai-mmo.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ragnarok: Huyền Thoại MMO mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN THS GAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 233 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ragnarok: Huyền Thoại MMO trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '233 /QĐ-PTTH&TTĐT', '05/05/2026', '2026-05-05', '18+', 'Đang hoạt động', 'https://ro.thsgame.com.vn/', 'https://codemoi.net/games/ragnarok-huyen-thoai-mmo/', 'https://ro.thsgame.com.vn/', 'https://ro.thsgame.com.vn/', 'https://ro.thsgame.com.vn/', 'https://ro.thsgame.com.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('bomber-vng', 'Bomber VNG', 'bomber-vng', 'CÔNG TY CỔ PHẦN VNG', 'Game Mobile Hot', 4.6, '/game_icons/bomber-vng.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Bomber VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 135/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Bomber VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '135/QĐ-PTTH&TTĐT', '21/04/2025', '2025-04-21', '12+', 'Đang hoạt động', 'https://bomber.vnggamers.com', 'https://codemoi.net/games/bomber-vng/', 'https://bomber.vnggamers.com', 'https://bomber.vnggamers.com', 'https://bomber.vnggamers.com', 'https://bomber.vnggamers.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('total-football-vng', 'Total Football VNG', 'total-football-vng', 'Công ty TNHH VNGGames', 'Game Mobile Hot', 4.6, '/game_icons/total-football-vng.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Total Football VNG mới nhất 2026. Tựa game do Công ty TNHH VNGGames phát hành chính thức tại Việt Nam theo Giấy phép G1 số 21/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Total Football VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '21/QĐ-PTTH&TTĐT', '21/01/2026', '2026-01-21', '12+', 'Đang hoạt động', 'https://totalfootball.vnggames.com', 'https://codemoi.net/games/total-football-vng/', 'https://totalfootball.vnggames.com', 'https://totalfootball.vnggames.com', 'https://totalfootball.vnggames.com', 'https://totalfootball.vnggames.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('magic-chess-go-go', 'Magic Chess: Go Go FT', 'magic-chess-go-go', 'CÔNG TY TNHH GIẢI TRÍ JOY', 'Thẻ Bài Đấu Tướng', 4.6, '/game_icons/magic-chess-go-go.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Magic Chess: Go Go FT mới nhất 2026. Tựa game do CÔNG TY TNHH GIẢI TRÍ JOY phát hành chính thức tại Việt Nam theo Giấy phép G1 số 2004/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Magic Chess: Go Go FT trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '2004/QĐ-BTTTT', '24/11/2019', '2019-11-24', '18+', 'Đang hoạt động', 'www.mechabangbang.joygame.vn', 'https://codemoi.net/games/magic-chess-go-go/', 'www.mechabangbang.joygame.vn', 'www.mechabangbang.joygame.vn', 'www.mechabangbang.joygame.vn', 'www.mechabangbang.joygame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tieu-yeu-tam-dao', 'Tiểu Yêu Tầm Đạo', 'tieu-yeu-tam-dao', 'CÔNG TY CỔ PHẦN PHÁT TRIỂN CÔNG NGHỆ SỐ HỒNG HÀ', 'Game Mobile Hot', 4.6, '/game_icons/tieu-yeu-tam-dao.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tiểu Yêu Tầm Đạo mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN PHÁT TRIỂN CÔNG NGHỆ SỐ HỒNG HÀ phát hành chính thức tại Việt Nam theo Giấy phép G1 số 134/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tiểu Yêu Tầm Đạo trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '134/QĐ-BTTTT', '04/02/2024', '2024-02-04', '18+', 'Đang hoạt động', 'www.tytd.playfun.vn', 'https://codemoi.net/games/tieu-yeu-tam-dao/', 'www.tytd.playfun.vn', 'www.tytd.playfun.vn', 'www.tytd.playfun.vn', 'www.tytd.playfun.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dai-hiep-chay-di', 'Đại Hiệp Chạy Đi', 'dai-hiep-chay-di', 'CÔNG TY TNHH PHẦN MỀM MGOL', 'Game Mobile Hot', 4.6, '/game_icons/dai-hiep-chay-di.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đại Hiệp Chạy Đi mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM MGOL phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1242/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đại Hiệp Chạy Đi trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1242/QĐ-BTTTT', '10/07/2023', '2023-07-10', '18+', 'Đang hoạt động', 'https://dh.mgol.vn', 'https://codemoi.net/games/dai-hiep-chay-di/', 'https://dh.mgol.vn', 'https://dh.mgol.vn', 'https://dh.mgol.vn', 'https://dh.mgol.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mini-world-creata', 'Mini World: CREATA', 'mini-world-creata', 'CÔNG TY TNHH LAVA DIGITAL', 'Game Mobile Hot', 4.6, '/game_icons/mini-world-creata.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Mini World: CREATA mới nhất 2026. Tựa game do CÔNG TY TNHH LAVA DIGITAL phát hành chính thức tại Việt Nam theo Giấy phép G2,3,4 (G3) số 85/GXN-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Mini World: CREATA trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '85/GXN-PTTH&TTĐT', '07/07/2022', '2022-07-07', '00+', 'Đang hoạt động', 'https://abrandgame.com', 'https://codemoi.net/games/mini-world-creata/', 'https://abrandgame.com', 'https://abrandgame.com', 'https://abrandgame.com', 'https://abrandgame.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dao-huu-tu-tien', 'Đạo Hữu Xin Dừng Bước', 'dao-huu-tu-tien', 'CÔNG TY TNHH JOYGAMES', 'Game Mobile Hot', 4.6, '/game_icons/dao-huu-tu-tien.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đạo Hữu Xin Dừng Bước mới nhất 2026. Tựa game do CÔNG TY TNHH JOYGAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 90/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đạo Hữu Xin Dừng Bước trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '90/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://daohuuxindungbuoc.joyplay.vn/', 'https://codemoi.net/games/dao-huu-tu-tien/', 'https://daohuuxindungbuoc.joyplay.vn/', 'https://daohuuxindungbuoc.joyplay.vn/', 'https://daohuuxindungbuoc.joyplay.vn/', 'https://daohuuxindungbuoc.joyplay.vn/', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dau-pha-thuong-khung-2d', 'Đấu Phá Thương Khung 2D', 'dau-pha-thuong-khung-2d', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.6, '/game_icons/dau-pha-thuong-khung-2d.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đấu Phá Thương Khung 2D mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 129/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đấu Phá Thương Khung 2D trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '129/QĐ-PTTH&TTĐT', '20/04/2025', '2025-04-20', '18+', 'Đang hoạt động', 'www.dptk.gamota.com', 'https://codemoi.net/games/dau-pha-thuong-khung-2d/', 'www.dptk.gamota.com', 'www.dptk.gamota.com', 'www.dptk.gamota.com', 'www.dptk.gamota.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tiem-tap-hoa-thoi-gian', 'Tiệm Tạp Hóa Thời Gian', 'tiem-tap-hoa-thoi-gian', 'CÔNG TY CỔ PHẦN ĐẦU TƯ CÔNG NGHỆ VISION INVEST', 'Game Mobile Hot', 4.6, '/game_icons/tiem-tap-hoa-thoi-gian.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tiệm Tạp Hóa Thời Gian mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN ĐẦU TƯ CÔNG NGHỆ VISION INVEST phát hành chính thức tại Việt Nam theo Giấy phép G1 số 193/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tiệm Tạp Hóa Thời Gian trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '193/QĐ-PTTH&TTĐT', '21/05/2025', '2025-05-21', '18+', 'Đang hoạt động', 'www.tiemtaphoathoigian.vn', 'https://codemoi.net/games/tiem-tap-hoa-thoi-gian/', 'www.tiemtaphoathoigian.vn', 'www.tiemtaphoathoigian.vn', 'www.tiemtaphoathoigian.vn', 'www.tiemtaphoathoigian.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('than-ma-arena', 'Thần Ma Arena', 'than-ma-arena', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Game Mobile Hot', 4.6, '/game_icons/than-ma-arena.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thần Ma Arena mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 61/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thần Ma Arena trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '61/QĐ-PTTH&TTĐT', '08/02/2026', '2026-02-08', '18+', 'Đang hoạt động', 'https://thanmaarenacmn.vn/', 'https://codemoi.net/games/than-ma-arena/', 'https://thanmaarenacmn.vn/', 'https://thanmaarenacmn.vn/', 'https://thanmaarenacmn.vn/', 'https://thanmaarenacmn.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-quoc-huyen-tuong-vng', 'Tam Quốc Huyễn Tướng VNG', 'tam-quoc-huyen-tuong-vng', 'CÔNG TY CỔ PHẦN VNG', 'Tam Quốc', 4.6, '/game_icons/tam-quoc-huyen-tuong-vng.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Quốc Huyễn Tướng VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 217/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Quốc Huyễn Tướng VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '217/QĐ-PTTH&TTĐT', '29/05/2025', '2025-05-29', '18+', 'Đang hoạt động', 'https://tamquochuyentuong.vnggames.com', 'https://codemoi.net/games/tam-quoc-huyen-tuong-vng/', 'https://tamquochuyentuong.vnggames.com', 'https://tamquochuyentuong.vnggames.com', 'https://tamquochuyentuong.vnggames.com', 'https://tamquochuyentuong.vnggames.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-quoc-meo', 'Tam Quốc Mèo', 'tam-quoc-meo', 'CÔNG TY TNHH SOHA', 'Tam Quốc', 4.6, '/game_icons/tam-quoc-meo.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Quốc Mèo mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 921/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Quốc Mèo trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '921/QĐ-BTTTT', '04/06/2024', '2024-06-04', '18+', 'Đang hoạt động', 'www.tamquocmeo.vn', 'https://codemoi.net/games/tam-quoc-meo/', 'www.tamquocmeo.vn', 'www.tamquocmeo.vn', 'www.tamquocmeo.vn', 'www.tamquocmeo.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dau-than-tuyet-the', 'Đấu Thần Tuyệt Thế', 'dau-than-tuyet-the', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Game Mobile Hot', 4.6, '/game_icons/dau-than-tuyet-the.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đấu Thần Tuyệt Thế mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1091/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đấu Thần Tuyệt Thế trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1091/QĐ-BTTTT', '21/06/2023', '2023-06-21', '18+', 'Đang hoạt động', 'www.dauthan.vplay.vn', 'https://codemoi.net/games/dau-than-tuyet-the/', 'www.dauthan.vplay.vn', 'www.dauthan.vplay.vn', 'www.dauthan.vplay.vn', 'www.dauthan.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thien-ha-ngu-tuyet', 'Thiên Hạ Ngũ Tuyệt', 'thien-ha-ngu-tuyet', 'CÔNG TY CỔ PHẦN GIẢI TRÍ YGAME', 'Game Mobile Hot', 4.6, '/game_icons/thien-ha-ngu-tuyet.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thiên Hạ Ngũ Tuyệt mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ YGAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1687 /QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thiên Hạ Ngũ Tuyệt trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1687 /QĐ-BTTTT', '10/10/2019', '2019-10-10', '18', 'Đang hoạt động', 'www.ngutuyet.ygame.vn', 'https://codemoi.net/games/thien-ha-ngu-tuyet/', 'www.ngutuyet.ygame.vn', 'www.ngutuyet.ygame.vn', 'www.ngutuyet.ygame.vn', 'www.ngutuyet.ygame.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-linh-du-ky', 'Kiếm Linh Du Ký', 'kiem-linh-du-ky', 'CÔNG TY TNHH OPENGAME', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/kiem-linh-du-ky.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Linh Du Ký mới nhất 2026. Tựa game do CÔNG TY TNHH OPENGAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 168/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Linh Du Ký trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '168/QĐ-PTTH&TTĐT', '01/04/2026', '2026-04-01', '16+', 'Đang hoạt động', 'https://kiemlinh.opengame.vn', 'https://codemoi.net/games/kiem-linh-du-ky/', 'https://kiemlinh.opengame.vn', 'https://kiemlinh.opengame.vn', 'https://kiemlinh.opengame.vn', 'https://kiemlinh.opengame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('phong-than-ta-dinh-doat', 'Phong Thần – Ta Định Đoạt', 'phong-than-ta-dinh-doat', 'CÔNG TY CỔ PHẦN GIẢI TRÍ 568E', 'Game Mobile Hot', 4.6, '/game_icons/phong-than-ta-dinh-doat.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Phong Thần – Ta Định Đoạt mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ 568E phát hành chính thức tại Việt Nam theo Giấy phép G1 số 107/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Phong Thần – Ta Định Đoạt trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '107/QĐ-PTTH&TTĐT', '01/03/2026', '2026-03-01', '18+', 'Đang hoạt động', 'https://phongthantdd.vn và https://phongthantdd.568play.vn', 'https://codemoi.net/games/phong-than-ta-dinh-doat/', 'https://phongthantdd.vn và https://phongthantdd.568play.vn', 'https://phongthantdd.vn và https://phongthantdd.568play.vn', 'https://phongthantdd.vn và https://phongthantdd.568play.vn', 'https://phongthantdd.vn và https://phongthantdd.568play.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ta-la-cao-thu-vo-lam', 'Ta Là Cao Thủ Võ Lâm Joygames', 'ta-la-cao-thu-vo-lam', 'CÔNG TY TNHH JOYGAMES', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/ta-la-cao-thu-vo-lam.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ta Là Cao Thủ Võ Lâm Joygames mới nhất 2026. Tựa game do CÔNG TY TNHH JOYGAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 84/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ta Là Cao Thủ Võ Lâm Joygames trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '84/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://talacaothuvolam.joyplay.vn/', 'https://codemoi.net/games/ta-la-cao-thu-vo-lam/', 'https://talacaothuvolam.joyplay.vn/', 'https://talacaothuvolam.joyplay.vn/', 'https://talacaothuvolam.joyplay.vn/', 'https://talacaothuvolam.joyplay.vn/', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('3q-chess-ky-thu-tam-quoc', '3Q Chess – Kỳ Thủ Tam Quốc', '3q-chess-ky-thu-tam-quoc', 'CÔNG TY TNHH SOHA', 'Tam Quốc', 4.6, '/game_icons/3q-chess-ky-thu-tam-quoc.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode 3Q Chess – Kỳ Thủ Tam Quốc mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 461/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game 3Q Chess – Kỳ Thủ Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '461/QĐ-PTTH&TTĐT', '15/10/2025', '2025-10-15', '18+', 'Đang hoạt động', 'https://3qchess.sohagame.vn/', 'https://codemoi.net/games/3q-chess-ky-thu-tam-quoc/', 'https://3qchess.sohagame.vn/', 'https://3qchess.sohagame.vn/', 'https://3qchess.sohagame.vn/', 'https://3qchess.sohagame.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tay-du-truyen-ky-cmn', 'Tây Du Truyền Kỳ CMN', 'tay-du-truyen-ky-cmn', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Game Mobile Hot', 4.6, '/game_icons/tay-du-truyen-ky-cmn.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tây Du Truyền Kỳ CMN mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 66/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tây Du Truyền Kỳ CMN trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '66/QĐ-PTTH&TTĐT', '26/02/2025', '2025-02-26', '18+', 'Đang hoạt động', 'http://taydu.cmn.vn.', 'https://codemoi.net/games/tay-du-truyen-ky-cmn/', 'http://taydu.cmn.vn.', 'http://taydu.cmn.vn.', 'http://taydu.cmn.vn.', 'http://taydu.cmn.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dao-mong-anh-hung-2', 'Đạo Mộng Anh Hùng 2: Ảo Mộng', 'dao-mong-anh-hung-2', 'CÔNG TY CỔ PHẦN FUNTAP GAMES', 'Game Mobile Hot', 4.6, '/game_icons/dao-mong-anh-hung-2.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đạo Mộng Anh Hùng 2: Ảo Mộng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP GAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 247/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đạo Mộng Anh Hùng 2: Ảo Mộng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '247/QĐ-PTTH&TTĐT', '14/05/2026', '2026-05-14', '18+', 'Đang hoạt động', 'https://dream2.funtap.games', 'https://codemoi.net/games/dao-mong-anh-hung-2/', 'https://dream2.funtap.games', 'https://dream2.funtap.games', 'https://dream2.funtap.games', 'https://dream2.funtap.games', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('anh-kiet-tam-quoc', 'Anh Kiệt Tam Quốc', 'anh-kiet-tam-quoc', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Tam Quốc', 4.6, '/game_icons/anh-kiet-tam-quoc.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Anh Kiệt Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 76/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Anh Kiệt Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '76/QĐ-PTTH&TTĐT', '11/02/2026', '2026-02-11', '18+', 'Đang hoạt động', 'https://anhkiet3q.cmn.vn/ và https://anhkiet3q.vn/', 'https://codemoi.net/games/anh-kiet-tam-quoc/', 'https://anhkiet3q.cmn.vn/ và https://anhkiet3q.vn/', 'https://anhkiet3q.cmn.vn/ và https://anhkiet3q.vn/', 'https://anhkiet3q.cmn.vn/ và https://anhkiet3q.vn/', 'https://anhkiet3q.cmn.vn/ và https://anhkiet3q.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('bloodline-dong-mau-anh-hung', 'Bloodline: Dòng Máu Anh Hùng', 'bloodline-dong-mau-anh-hung', 'CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM na', 'Game Mobile Hot', 4.6, '/game_icons/bloodline-dong-mau-anh-hung.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Bloodline: Dòng Máu Anh Hùng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM na phát hành chính thức tại Việt Nam theo Giấy phép G1 số 66/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Bloodline: Dòng Máu Anh Hùng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '66/QĐ-PTTH&TTĐT', '09/02/2026', '2026-02-09', '18+', 'Đang hoạt động', 'https://dmah.zoneplay.vn', 'https://codemoi.net/games/bloodline-dong-mau-anh-hung/', 'https://dmah.zoneplay.vn', 'https://dmah.zoneplay.vn', 'https://dmah.zoneplay.vn', 'https://dmah.zoneplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vuot-tuong-thep', 'Vượt Tường Thép', 'vuot-tuong-thep', 'CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN KAN', 'Game Mobile Hot', 4.6, '/game_icons/vuot-tuong-thep.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vượt Tường Thép mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN KAN phát hành chính thức tại Việt Nam theo Giấy phép G1 số 44/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vượt Tường Thép trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '44/QĐ-PTTH&TTĐT', '02/02/2026', '2026-02-02', '18+', 'Đang hoạt động', 'vuottuongthep.vn', 'https://codemoi.net/games/vuot-tuong-thep/', 'vuottuongthep.vn', 'vuottuongthep.vn', 'vuottuongthep.vn', 'vuottuongthep.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('buu-boi-truyen-ky', 'Bửu Bối Truyền Kỳ', 'buu-boi-truyen-ky', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Game Mobile Hot', 4.6, '/game_icons/buu-boi-truyen-ky.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Bửu Bối Truyền Kỳ mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 37/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Bửu Bối Truyền Kỳ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '37/QĐ-PTTH&TTĐT', '29/01/2026', '2026-01-29', '18+', 'Đang hoạt động', 'http://buuboitruyenky.vn', 'https://codemoi.net/games/buu-boi-truyen-ky/', 'http://buuboitruyenky.vn', 'http://buuboitruyenky.vn', 'http://buuboitruyenky.vn', 'http://buuboitruyenky.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('phi-kiem-tu-tien', 'Phi Kiếm Tu Tiên', 'phi-kiem-tu-tien', 'Công ty TNHH Velalive', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/phi-kiem-tu-tien.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Phi Kiếm Tu Tiên mới nhất 2026. Tựa game do Công ty TNHH Velalive phát hành chính thức tại Việt Nam theo Giấy phép G1 số 29/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Phi Kiếm Tu Tiên trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '29/QĐ-PTTH&TTĐT', '22/01/2026', '2026-01-22', '18+', 'Đang hoạt động', 'https://pktt.velalive.net.vn/', 'https://codemoi.net/games/phi-kiem-tu-tien/', 'https://pktt.velalive.net.vn/', 'https://pktt.velalive.net.vn/', 'https://pktt.velalive.net.vn/', 'https://pktt.velalive.net.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-khach-phong-lang', 'Kiếm Khách Phong Lăng', 'kiem-khach-phong-lang', 'CÔNG TY CỔ PHẦN VGP', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/kiem-khach-phong-lang.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Khách Phong Lăng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 177/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Khách Phong Lăng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '177/QĐ-PTTH&TTĐT', '11/05/2025', '2025-05-11', '18+', 'Đang hoạt động', 'www.kiemkhachphonglang.vgplay.vn', 'https://codemoi.net/games/kiem-khach-phong-lang/', 'www.kiemkhachphonglang.vgplay.vn', 'www.kiemkhachphonglang.vgplay.vn', 'www.kiemkhachphonglang.vgplay.vn', 'www.kiemkhachphonglang.vgplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('3q-trieu-hoan-su', '3Q Triệu Hoán Sư', '3q-trieu-hoan-su', 'CÔNG TY TNHH CÔNG NGHỆ GIA ĐÌNH', 'Tam Quốc', 4.6, '/game_icons/3q-trieu-hoan-su.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode 3Q Triệu Hoán Sư mới nhất 2026. Tựa game do CÔNG TY TNHH CÔNG NGHỆ GIA ĐÌNH phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1392/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game 3Q Triệu Hoán Sư trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1392/QĐ-BTTTT', '18/08/2024', '2024-08-18', '18+', 'Đang hoạt động', 'www.game.funzy.vn', 'https://codemoi.net/games/3q-trieu-hoan-su/', 'www.game.funzy.vn', 'www.game.funzy.vn', 'www.game.funzy.vn', 'www.game.funzy.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vo-cuc-tien-do-cmn', 'Vô Cực Tiên Đồ CMN', 'vo-cuc-tien-do-cmn', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Game Mobile Hot', 4.6, '/game_icons/vo-cuc-tien-do-cmn.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vô Cực Tiên Đồ CMN mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 2309/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vô Cực Tiên Đồ CMN trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '2309/QĐ-BTTTT', '21/11/2023', '2023-11-21', '18+', 'Đang hoạt động', 'www.vocuctiendo.cmn.vn', 'https://codemoi.net/games/vo-cuc-tien-do-cmn/', 'www.vocuctiendo.cmn.vn', 'www.vocuctiendo.cmn.vn', 'www.vocuctiendo.cmn.vn', 'www.vocuctiendo.cmn.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('stickman-go', 'Stickman GO', 'stickman-go', 'CÔNG TY CỔ PHẦN MẠNG TRỰC TUYẾN META', 'Game Mobile Hot', 4.6, '/game_icons/stickman-go.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Stickman GO mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN MẠNG TRỰC TUYẾN META phát hành chính thức tại Việt Nam theo Giấy phép G2,3,4 (G4) số 215/GXN-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Stickman GO trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '215/GXN-PTTH&TTĐT', '20/08/2018', '2018-08-20', '00+', 'Đang hoạt động', 'www.gamevui.vn', 'https://codemoi.net/games/stickman-go/', 'www.gamevui.vn', 'www.gamevui.vn', 'www.gamevui.vn', 'www.gamevui.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('dao-si-bat-truong-phi', 'Đạo Sĩ Bắt Trương Phi', 'dao-si-bat-truong-phi', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Game Mobile Hot', 4.6, '/game_icons/dao-si-bat-truong-phi.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đạo Sĩ Bắt Trương Phi mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 178/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đạo Sĩ Bắt Trương Phi trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '178/QĐ-PTTH&TTĐT', '05/04/2026', '2026-04-05', '18+', 'Đang hoạt động', 'http://ds.splay.vn', 'https://codemoi.net/games/dao-si-bat-truong-phi/', 'http://ds.splay.vn', 'http://ds.splay.vn', 'http://ds.splay.vn', 'http://ds.splay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('nhip-dieu-than-tuong-oeg', 'Nhịp Điệu Thần Tượng – OEG', 'nhip-dieu-than-tuong-oeg', 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO', 'Game Mobile Hot', 4.6, '/game_icons/nhip-dieu-than-tuong-oeg.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Nhịp Điệu Thần Tượng – OEG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 97/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Nhịp Điệu Thần Tượng – OEG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '97/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://nhipdieu.alogame.vn/', 'https://codemoi.net/games/nhip-dieu-than-tuong-oeg/', 'https://nhipdieu.alogame.vn/', 'https://nhipdieu.alogame.vn/', 'https://nhipdieu.alogame.vn/', 'https://nhipdieu.alogame.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('bang-bang-dai-chien', 'Bang Bang Đại Chiến', 'bang-bang-dai-chien', 'CÔNG TY CỔ PHẦN PHÁT TRIỂN CÔNG NGHỆ SỐ HỒNG HÀ', 'Game Mobile Hot', 4.6, '/game_icons/bang-bang-dai-chien.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Bang Bang Đại Chiến mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN PHÁT TRIỂN CÔNG NGHỆ SỐ HỒNG HÀ phát hành chính thức tại Việt Nam theo Giấy phép G1 số 49/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Bang Bang Đại Chiến trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '49/QĐ-PTTH&TTĐT', '04/02/2026', '2026-02-04', '18+', 'Đang hoạt động', 'http://bangbangwar.hhgame.vn/', 'https://codemoi.net/games/bang-bang-dai-chien/', 'http://bangbangwar.hhgame.vn/', 'http://bangbangwar.hhgame.vn/', 'http://bangbangwar.hhgame.vn/', 'http://bangbangwar.hhgame.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ta-lam-tong-su-trong-tien-mon', 'Ta Làm Tông Sư Trong Tiên Môn', 'ta-lam-tong-su-trong-tien-mon', 'CÔNG TY CỔ PHẦN VISION GAME', 'Game Mobile Hot', 4.6, '/game_icons/ta-lam-tong-su-trong-tien-mon.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ta Làm Tông Sư Trong Tiên Môn mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VISION GAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 493/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ta Làm Tông Sư Trong Tiên Môn trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '493/QĐ-PTTH&TTĐT', '02/11/2025', '2025-11-02', '18+', 'Đang hoạt động', 'www.play.visiongame.vn.', 'https://codemoi.net/games/ta-lam-tong-su-trong-tien-mon/', 'www.play.visiongame.vn.', 'www.play.visiongame.vn.', 'www.play.visiongame.vn.', 'www.play.visiongame.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('palmon', 'Palmon: Cuộc Chiến Sinh Tồn', 'palmon', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.6, '/game_icons/palmon.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Palmon: Cuộc Chiến Sinh Tồn mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 420/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Palmon: Cuộc Chiến Sinh Tồn trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '420/QĐ-PTTH&TTĐT', '25/09/2025', '2025-09-25', '18+', 'Đang hoạt động', 'www.palmon.gamota.com', 'https://codemoi.net/games/palmon/', 'www.palmon.gamota.com', 'www.palmon.gamota.com', 'www.palmon.gamota.com', 'www.palmon.gamota.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('anh-hung-bat-diet', 'Anh Hùng Bất Diệt', 'anh-hung-bat-diet', 'CÔNG TY CỔ PHẦN TRÒ CHƠI MỘC', 'Game Mobile Hot', 4.6, '/game_icons/anh-hung-bat-diet.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Anh Hùng Bất Diệt mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRÒ CHƠI MỘC phát hành chính thức tại Việt Nam theo Giấy phép G1 số 383/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Anh Hùng Bất Diệt trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '383/QĐ-PTTH&TTĐT', '09/09/2025', '2025-09-09', '18+', 'Đang hoạt động', 'https://yymys.mocgame.vn và https://yxmysvn.mocgames.com', 'https://codemoi.net/games/anh-hung-bat-diet/', 'https://yymys.mocgame.vn và https://yxmysvn.mocgames.com', 'https://yymys.mocgame.vn và https://yxmysvn.mocgames.com', 'https://yymys.mocgame.vn và https://yxmysvn.mocgames.com', 'https://yymys.mocgame.vn và https://yxmysvn.mocgames.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chien-hoa-tam-gioi-vtc', 'Chiến Hỏa Tam Giới - VTC', 'chien-hoa-tam-gioi-vtc', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Game Mobile Hot', 4.6, '/game_icons/chien-hoa-tam-gioi-vtc.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chiến Hỏa Tam Giới - VTC mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 380/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chiến Hỏa Tam Giới - VTC trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '380/QĐ-PTTH&TTĐT', '07/09/2025', '2025-09-07', '18+', 'Đang hoạt động', 'https://chienhoa.splay.vn.', 'https://codemoi.net/games/chien-hoa-tam-gioi-vtc/', 'https://chienhoa.splay.vn.', 'https://chienhoa.splay.vn.', 'https://chienhoa.splay.vn.', 'https://chienhoa.splay.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('huyen-anh-vo-lam', 'Huyền Ảnh Võ Lâm', 'huyen-anh-vo-lam', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/huyen-anh-vo-lam.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Huyền Ảnh Võ Lâm mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 238/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Huyền Ảnh Võ Lâm trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '238/QĐ-PTTH&TTĐT', '05/06/2025', '2025-06-05', '18+', 'Đang hoạt động', 'www.vplay.vn', 'https://codemoi.net/games/huyen-anh-vo-lam/', 'www.vplay.vn', 'www.vplay.vn', 'www.vplay.vn', 'www.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hoa-son-kiem-the-vtc', 'Hoa Sơn Kiếm Thế - VTC', 'hoa-son-kiem-the-vtc', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/hoa-son-kiem-the-vtc.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hoa Sơn Kiếm Thế - VTC mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 138 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hoa Sơn Kiếm Thế - VTC trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '138 /QĐ-PTTH&TTĐT', '22/04/2025', '2025-04-22', '18+', 'Đang hoạt động', 'https://hoasonkiemthe.splay.vn', 'https://codemoi.net/games/hoa-son-kiem-the-vtc/', 'https://hoasonkiemthe.splay.vn', 'https://hoasonkiemthe.splay.vn', 'https://hoasonkiemthe.splay.vn', 'https://hoasonkiemthe.splay.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-vuc-3d', 'Kiếm Vực 3D', 'kiem-vuc-3d', 'CÔNG TY TNHH MOBILE INTELLIGENCE SAIGON', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/kiem-vuc-3d.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Vực 3D mới nhất 2026. Tựa game do CÔNG TY TNHH MOBILE INTELLIGENCE SAIGON phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1476/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Vực 3D trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1476/QĐ-BTTTT', '13/08/2023', '2023-08-13', '18+', 'Đang hoạt động', 'www.intelligencessaigon.vn', 'https://codemoi.net/games/kiem-vuc-3d/', 'www.intelligencessaigon.vn', 'www.intelligencessaigon.vn', 'www.intelligencessaigon.vn', 'www.intelligencessaigon.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('anh-hung-cam-dia', 'Anh Hùng Cấm Địa - VTC Game', 'anh-hung-cam-dia', 'CÔNG TY VTC CÔNG NGHỆ VÀ NỘI DUNG SỐ', 'Game Mobile Hot', 4.6, '/game_icons/anh-hung-cam-dia.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Anh Hùng Cấm Địa - VTC Game mới nhất 2026. Tựa game do CÔNG TY VTC CÔNG NGHỆ VÀ NỘI DUNG SỐ phát hành chính thức tại Việt Nam theo Giấy phép G2,3,4 (G2) số 42/GXN-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Anh Hùng Cấm Địa - VTC Game trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '42/GXN-PTTH&TTĐT', '30/03/2023', '2023-03-30', '00+', 'Đang hoạt động', 'http://ahcd.vtcgame.vn', 'https://codemoi.net/games/anh-hung-cam-dia/', 'http://ahcd.vtcgame.vn', 'http://ahcd.vtcgame.vn', 'http://ahcd.vtcgame.vn', 'http://ahcd.vtcgame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('pet-samkok-bao-thu-3q', 'Pet Samkok – Báo Thủ 3Q', 'pet-samkok-bao-thu-3q', 'CÔNG TY TNHH SOHA', 'Tam Quốc', 4.6, '/game_icons/pet-samkok-bao-thu-3q.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Pet Samkok – Báo Thủ 3Q mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 507/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Pet Samkok – Báo Thủ 3Q trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '507/QĐ-PTTH&TTĐT', '12/08/2026', '2026-08-12', '18+', 'Đang hoạt động', 'https://petsamkok.sohagame.vn', 'https://codemoi.net/games/pet-samkok-bao-thu-3q/', 'https://petsamkok.sohagame.vn', 'https://petsamkok.sohagame.vn', 'https://petsamkok.sohagame.vn', 'https://petsamkok.sohagame.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tho-san-sieu-cap', 'Thợ Săn Siêu Cấp', 'tho-san-sieu-cap', 'CÔNG TY CỔ PHẦN VGP', 'Game Mobile Hot', 4.6, '/game_icons/tho-san-sieu-cap.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thợ Săn Siêu Cấp mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 113/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thợ Săn Siêu Cấp trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '113/QĐ-PTTH&TTĐT', '04/03/2026', '2026-03-04', '18+', 'Đang hoạt động', 'https://thosan.vgplay.vn', 'https://codemoi.net/games/tho-san-sieu-cap/', 'https://thosan.vgplay.vn', 'https://thosan.vgplay.vn', 'https://thosan.vgplay.vn', 'https://thosan.vgplay.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-de-origin', 'Kiếm Đế Origin', 'kiem-de-origin', 'CÔNG TY TNHH TRUYỀN THÔNG FUNFINITY STUDIO', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/kiem-de-origin.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Đế Origin mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG FUNFINITY STUDIO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 75/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Đế Origin trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '75/QĐ-PTTH&TTĐT', '11/02/2026', '2026-02-11', '18+', 'Đang hoạt động', 'https://kiemde.fungames.vn', 'https://codemoi.net/games/kiem-de-origin/', 'https://kiemde.fungames.vn', 'https://kiemde.fungames.vn', 'https://kiemde.fungames.vn', 'https://kiemde.fungames.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hoi-uc-kiem-the', 'Hồi Ức Kiếm Thế', 'hoi-uc-kiem-the', 'CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM', 'Tiên Hiệp & Kiếm Hiệp', 4.6, '/game_icons/hoi-uc-kiem-the.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hồi Ức Kiếm Thế mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 39/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hồi Ức Kiếm Thế trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '39/QĐ-PTTH&TTĐT', '29/01/2026', '2026-01-29', '18+', 'Đang hoạt động', 'https://hoiuckt.zoneplay.vn', 'https://codemoi.net/games/hoi-uc-kiem-the/', 'https://hoiuckt.zoneplay.vn', 'https://hoiuckt.zoneplay.vn', 'https://hoiuckt.zoneplay.vn', 'https://hoiuckt.zoneplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('skyria-dao-ky-bi', 'Skyria: Đảo Kỳ Bí', 'skyria-dao-ky-bi', 'CÔNG TY CỔ PHẦN GGO', 'Game Mobile Hot', 4.6, '/game_icons/skyria-dao-ky-bi.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Skyria: Đảo Kỳ Bí mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GGO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 28/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Skyria: Đảo Kỳ Bí trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '28/QĐ-PTTH&TTĐT', '22/01/2026', '2026-01-22', '18+', 'Đang hoạt động', 'http://www.dragonsoulawakening.com.vn/', 'https://codemoi.net/games/skyria-dao-ky-bi/', 'http://www.dragonsoulawakening.com.vn/', 'http://www.dragonsoulawakening.com.vn/', 'http://www.dragonsoulawakening.com.vn/', 'http://www.dragonsoulawakening.com.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thieu-nien-ca-hanh-khoi-dong', 'Thiếu Niên Ca Hành: Khởi Động', 'thieu-nien-ca-hanh-khoi-dong', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.6, '/game_icons/thieu-nien-ca-hanh-khoi-dong.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thiếu Niên Ca Hành: Khởi Động mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 516 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thiếu Niên Ca Hành: Khởi Động trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '516 /QĐ-PTTH&TTĐT', '16/11/2025', '2025-11-16', '18+', 'Đang hoạt động', 'https://tnch.gamota.com/', 'https://codemoi.net/games/thieu-nien-ca-hanh-khoi-dong/', 'https://tnch.gamota.com/', 'https://tnch.gamota.com/', 'https://tnch.gamota.com/', 'https://tnch.gamota.com/', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('atlan-origin-luc-dia-troi-day', 'Atlan Origin: Lục Địa Trỗi Dậy', 'atlan-origin-luc-dia-troi-day', 'CÔNG TY CỔ PHẦN VGP', 'Game Mobile Hot', 4.6, '/game_icons/atlan-origin-luc-dia-troi-day.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Atlan Origin: Lục Địa Trỗi Dậy mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 412 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Atlan Origin: Lục Địa Trỗi Dậy trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '412 /QĐ-PTTH&TTĐT', '24/09/2025', '2025-09-24', '18+', 'Đang hoạt động', 'https://vgplay.vn', 'https://codemoi.net/games/atlan-origin-luc-dia-troi-day/', 'https://vgplay.vn', 'https://vgplay.vn', 'https://vgplay.vn', 'https://vgplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chu-thuat-dai-chien', 'Chú Thuật Đại Chiến', 'chu-thuat-dai-chien', 'CÔNG TY TNHH VMGE', 'Game Mobile Hot', 4.6, '/game_icons/chu-thuat-dai-chien.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chú Thuật Đại Chiến mới nhất 2026. Tựa game do CÔNG TY TNHH VMGE phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1806/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chú Thuật Đại Chiến trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1806/QĐ-BTTTT', '20/10/2024', '2024-10-20', '18+', 'Đang hoạt động', 'www.chuthuatdaichien.vn', 'https://codemoi.net/games/chu-thuat-dai-chien/', 'www.chuthuatdaichien.vn', 'www.chuthuatdaichien.vn', 'www.chuthuatdaichien.vn', 'www.chuthuatdaichien.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-quoc-x', 'TAM QUỐC X', 'tam-quoc-x', 'CÔNG TY CỔ PHẦN FUNTAP', 'Tam Quốc', 4.5, '/game_icons/tam-quoc-x.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode TAM QUỐC X mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 2310/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game TAM QUỐC X trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '2310/QĐ-BTTTT', '21/11/2022', '2022-11-21', '18+', 'Đang hoạt động', 'https://tamquocx.playfun.vn', 'https://codemoi.net/games/tam-quoc-x/', 'https://tamquocx.playfun.vn', 'https://tamquocx.playfun.vn', 'https://tamquocx.playfun.vn', 'https://tamquocx.playfun.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('loan-chien-3q', 'Loạn Chiến 3Q', 'loan-chien-3q', 'CÔNG TY TNHH TRỰC TUYẾN THIÊN HÀ', 'Tam Quốc', 4.5, '/game_icons/loan-chien-3q.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Loạn Chiến 3Q mới nhất 2026. Tựa game do CÔNG TY TNHH TRỰC TUYẾN THIÊN HÀ phát hành chính thức tại Việt Nam theo Giấy phép G1 số 98 /QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Loạn Chiến 3Q trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '98 /QĐ-BTTTT', '23/01/2022', '2022-01-23', '18+', 'Đang hoạt động', 'https://loanchien3q.ggames.vn', 'https://codemoi.net/games/loan-chien-3q/', 'https://loanchien3q.ggames.vn', 'https://loanchien3q.ggames.vn', 'https://loanchien3q.ggames.vn', 'https://loanchien3q.ggames.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-gioi-anh-hung', 'Tam Giới Anh Hùng', 'tam-gioi-anh-hung', 'CÔNG TY CỔ PHẦN VGP', 'Game Mobile Hot', 4.5, '/game_icons/tam-gioi-anh-hung.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Giới Anh Hùng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 269/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Giới Anh Hùng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '269/QĐ-BTTTT', '10/03/2019', '2019-03-10', '18+', 'Đang hoạt động', 'http://tamgioi.vgplay.vn', 'https://codemoi.net/games/tam-gioi-anh-hung/', 'http://tamgioi.vgplay.vn', 'http://tamgioi.vgplay.vn', 'http://tamgioi.vgplay.vn', 'http://tamgioi.vgplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ts3-chien-than-ky', 'TS3 Chiến Thần Ký', 'ts3-chien-than-ky', 'CÔNG TY TNHH PHẦN MỀM KKSOFT', 'Game Mobile Hot', 4.5, '/game_icons/ts3-chien-than-ky.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode TS3 Chiến Thần Ký mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM KKSOFT phát hành chính thức tại Việt Nam theo Giấy phép G1 số 157/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game TS3 Chiến Thần Ký trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '157/QĐ-PTTH&TTĐT', '30/03/2026', '2026-03-30', '18+', 'Đang hoạt động', 'https://ts3.kksoft.vn/', 'https://codemoi.net/games/ts3-chien-than-ky/', 'https://ts3.kksoft.vn/', 'https://ts3.kksoft.vn/', 'https://ts3.kksoft.vn/', 'https://ts3.kksoft.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ludus-quyet-dau', 'Ludus: Quyết Đấu Chiến Thuật', 'ludus-quyet-dau', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG', 'Chiến Thuật SLG', 4.5, '/game_icons/ludus-quyet-dau.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ludus: Quyết Đấu Chiến Thuật mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 154/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ludus: Quyết Đấu Chiến Thuật trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '154/QĐ-PTTH&TTĐT', '29/03/2026', '2026-03-29', '18+', 'Đang hoạt động', 'https://ludus.oeg.vn', 'https://codemoi.net/games/ludus-quyet-dau/', 'https://ludus.oeg.vn', 'https://ludus.oeg.vn', 'https://ludus.oeg.vn', 'https://ludus.oeg.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tan-chan-long-oeg', 'Tân Chân Long - OEG', 'tan-chan-long-oeg', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG', 'Game Mobile Hot', 4.5, '/game_icons/tan-chan-long-oeg.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tân Chân Long - OEG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 153/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tân Chân Long - OEG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '153/QĐ-PTTH&TTĐT', '29/03/2026', '2026-03-29', '18+', 'Đang hoạt động', 'https://tanchanlong.oeg.vn', 'https://codemoi.net/games/tan-chan-long-oeg/', 'https://tanchanlong.oeg.vn', 'https://tanchanlong.oeg.vn', 'https://tanchanlong.oeg.vn', 'https://tanchanlong.oeg.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('than-thu-origin', 'Thần Thú Origin', 'than-thu-origin', 'CÔNG TY TNHH TRUYỀN THÔNG FUNFINITY STUDIO', 'Game Mobile Hot', 4.5, '/game_icons/than-thu-origin.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thần Thú Origin mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG FUNFINITY STUDIO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 143/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thần Thú Origin trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '143/QĐ-PTTH&TTĐT', '24/03/2026', '2026-03-24', '18+', 'Đang hoạt động', 'https://thanthu.fungames.vn', 'https://codemoi.net/games/than-thu-origin/', 'https://thanthu.fungames.vn', 'https://thanthu.fungames.vn', 'https://thanthu.fungames.vn', 'https://thanthu.fungames.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hai-tac-loan-dau', 'Hải Tặc Loạn Đấu: Idle AFK', 'hai-tac-loan-dau', 'CÔNG TY TNHH KỸ THUẬT CÔNG NGHỆ BLUE DREAM', 'Game Mobile Hot', 4.5, '/game_icons/hai-tac-loan-dau.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hải Tặc Loạn Đấu: Idle AFK mới nhất 2026. Tựa game do CÔNG TY TNHH KỸ THUẬT CÔNG NGHỆ BLUE DREAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 96/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hải Tặc Loạn Đấu: Idle AFK trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '96/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'http://bluegame.vn', 'https://codemoi.net/games/hai-tac-loan-dau/', 'http://bluegame.vn', 'http://bluegame.vn', 'http://bluegame.vn', 'http://bluegame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('na-tra-nao-hai', 'Na Tra Náo Hải', 'na-tra-nao-hai', 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO', 'Game Mobile Hot', 4.5, '/game_icons/na-tra-nao-hai.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Na Tra Náo Hải mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 98/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Na Tra Náo Hải trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '98/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://natranaohai.alogame.vn/', 'https://codemoi.net/games/na-tra-nao-hai/', 'https://natranaohai.alogame.vn/', 'https://natranaohai.alogame.vn/', 'https://natranaohai.alogame.vn/', 'https://natranaohai.alogame.vn/', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vo-hiep-origin', 'Võ Hiệp Origin', 'vo-hiep-origin', 'CÔNG TY TNHH TRUYỀN THÔNG FUNFINITY STUDIO', 'Game Mobile Hot', 4.5, '/game_icons/vo-hiep-origin.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Võ Hiệp Origin mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG FUNFINITY STUDIO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 68/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Võ Hiệp Origin trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '68/QĐ-PTTH&TTĐT', '09/02/2026', '2026-02-09', '18+', 'Đang hoạt động', 'https://vohiep.fungames.vn/', 'https://codemoi.net/games/vo-hiep-origin/', 'https://vohiep.fungames.vn/', 'https://vohiep.fungames.vn/', 'https://vohiep.fungames.vn/', 'https://vohiep.fungames.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-vu-son-ha', 'Kiếm Vũ Sơn Hà', 'kiem-vu-son-ha', 'Công ty Cổ phần Broga', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/kiem-vu-son-ha.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Vũ Sơn Hà mới nhất 2026. Tựa game do Công ty Cổ phần Broga phát hành chính thức tại Việt Nam theo Giấy phép G1 số 45/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Vũ Sơn Hà trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '45/QĐ-PTTH&TTĐT', '02/02/2026', '2026-02-02', '18+', 'Đang hoạt động', 'http://kvsh.broga.vn/', 'https://codemoi.net/games/kiem-vu-son-ha/', 'http://kvsh.broga.vn/', 'http://kvsh.broga.vn/', 'http://kvsh.broga.vn/', 'http://kvsh.broga.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chien-tuyen-huong-duong', 'Chiến Tuyến Hướng Dương', 'chien-tuyen-huong-duong', 'CÔNG TY TNHH PHẦN MỀM MGOL', 'Game Mobile Hot', 4.5, '/game_icons/chien-tuyen-huong-duong.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chiến Tuyến Hướng Dương mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM MGOL phát hành chính thức tại Việt Nam theo Giấy phép G1 số 145/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chiến Tuyến Hướng Dương trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '145/QĐ-PTTH&TTĐT', '25/04/2025', '2025-04-25', '18+', 'Đang hoạt động', 'https://cthd.mgol.vn', 'https://codemoi.net/games/chien-tuyen-huong-duong/', 'https://cthd.mgol.vn', 'https://cthd.mgol.vn', 'https://cthd.mgol.vn', 'https://cthd.mgol.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tieu-tuyet-linh-chu', 'Tiểu Tuyết Lĩnh Chủ', 'tieu-tuyet-linh-chu', 'CÔNG TY TNHH PHẦN MỀM MGOL', 'Game Mobile Hot', 4.5, '/game_icons/tieu-tuyet-linh-chu.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tiểu Tuyết Lĩnh Chủ mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM MGOL phát hành chính thức tại Việt Nam theo Giấy phép G1 số 59/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tiểu Tuyết Lĩnh Chủ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '59/QĐ-PTTH&TTĐT', '24/02/2025', '2025-02-24', '18+', 'Đang hoạt động', 'ttlc.mgol.vn', 'https://codemoi.net/games/tieu-tuyet-linh-chu/', 'ttlc.mgol.vn', 'ttlc.mgol.vn', 'ttlc.mgol.vn', 'ttlc.mgol.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('x-wukong', 'X Wukong', 'x-wukong', 'CÔNG TY TNHH SOHA', 'Game Mobile Hot', 4.5, '/game_icons/x-wukong.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode X Wukong mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 84/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game X Wukong trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '84/QĐ-BTTTT', '20/01/2025', '2025-01-20', '18+', 'Đang hoạt động', 'https://xwukong.sohagame.vn', 'https://codemoi.net/games/x-wukong/', 'https://xwukong.sohagame.vn', 'https://xwukong.sohagame.vn', 'https://xwukong.sohagame.vn', 'https://xwukong.sohagame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('yeu-thu-van-dao', 'Yêu Thú Vấn Đạo', 'yeu-thu-van-dao', 'CÔNG TY TNHH PHẦN MỀM MGOL', 'Game Mobile Hot', 4.5, '/game_icons/yeu-thu-van-dao.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Yêu Thú Vấn Đạo mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM MGOL phát hành chính thức tại Việt Nam theo Giấy phép G1 số 68/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Yêu Thú Vấn Đạo trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '68/QĐ-BTTTT', '16/01/2025', '2025-01-16', '18+', 'Đang hoạt động', 'http://ytvd.mgol.vn', 'https://codemoi.net/games/yeu-thu-van-dao/', 'http://ytvd.mgol.vn', 'http://ytvd.mgol.vn', 'http://ytvd.mgol.vn', 'http://ytvd.mgol.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('huyen-tuong-phong-than', 'Huyễn Tướng Phong Thần', 'huyen-tuong-phong-than', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Chiến Thuật SLG', 4.5, '/game_icons/huyen-tuong-phong-than.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Huyễn Tướng Phong Thần mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 1570/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Huyễn Tướng Phong Thần trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '1570/QĐ-BTTTT', '19/09/2024', '2024-09-19', '18+', 'Đang hoạt động', 'www.huyentuong.cmn.vn.', 'https://codemoi.net/games/huyen-tuong-phong-than/', 'www.huyentuong.cmn.vn.', 'www.huyentuong.cmn.vn.', 'www.huyentuong.cmn.vn.', 'www.huyentuong.cmn.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('van-thang-nam-de', 'Vạn Thắng Nam Đế', 'van-thang-nam-de', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN GOSU', 'Game Mobile Hot', 4.5, '/game_icons/van-thang-nam-de.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vạn Thắng Nam Đế mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN GOSU phát hành chính thức tại Việt Nam theo Giấy phép G1 số 197/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vạn Thắng Nam Đế trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '197/QĐ-PTTH&TTĐT', '15/04/2026', '2026-04-15', '18+', 'Đang hoạt động', 'https://vanthangnamde.vn', 'https://codemoi.net/games/van-thang-nam-de/', 'https://vanthangnamde.vn', 'https://vanthangnamde.vn', 'https://vanthangnamde.vn', 'https://vanthangnamde.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ngao-kiem-vo-song-mobile', 'Ngạo Kiếm Vô Song Mobile', 'ngao-kiem-vo-song-mobile', 'CÔNG TY TNHH MYG', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/ngao-kiem-vo-song-mobile.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ngạo Kiếm Vô Song Mobile mới nhất 2026. Tựa game do CÔNG TY TNHH MYG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 131/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ngạo Kiếm Vô Song Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '131/QĐ-PTTH&TTĐT', '12/03/2026', '2026-03-12', '18+', 'Đang hoạt động', 'http://nkvsmobile.vn', 'https://codemoi.net/games/ngao-kiem-vo-song-mobile/', 'http://nkvsmobile.vn', 'http://nkvsmobile.vn', 'http://nkvsmobile.vn', 'http://nkvsmobile.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('meo-may-sieu-quay', 'Mèo Máy Siêu Quậy', 'meo-may-sieu-quay', 'CÔNG TY CỔ PHẦN DRAGON GAME', 'Game Mobile Hot', 4.5, '/game_icons/meo-may-sieu-quay.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Mèo Máy Siêu Quậy mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN DRAGON GAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 86/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Mèo Máy Siêu Quậy trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '86/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '12+', 'Đang hoạt động', 'http://meomaysieuquay.vn', 'https://codemoi.net/games/meo-may-sieu-quay/', 'http://meomaysieuquay.vn', 'http://meomaysieuquay.vn', 'http://meomaysieuquay.vn', 'http://meomaysieuquay.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hoc-vien-ninja-g4m', 'Học Viện Ninja G4M', 'hoc-vien-ninja-g4m', 'CÔNG TY TNHH G4M', 'Game Mobile Hot', 4.5, '/game_icons/hoc-vien-ninja-g4m.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Học Viện Ninja G4M mới nhất 2026. Tựa game do CÔNG TY TNHH G4M phát hành chính thức tại Việt Nam theo Giấy phép G1 số 764/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Học Viện Ninja G4M trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '764/QĐ-BTTTT', '12/05/2024', '2024-05-12', '18+', 'Đang hoạt động', 'https://hocvienninja.vn', 'https://codemoi.net/games/hoc-vien-ninja-g4m/', 'https://hocvienninja.vn', 'https://hocvienninja.vn', 'https://hocvienninja.vn', 'https://hocvienninja.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('lordnine-cuu-vuong-tranh-ba', 'LORDNINE: Cửu Vương Tranh Bá', 'lordnine-cuu-vuong-tranh-ba', 'CÔNG TY CỔ PHẦN VTC TRUYỀN THÔNG TRỰC TUYẾN', 'Game Mobile Hot', 4.5, '/game_icons/lordnine-cuu-vuong-tranh-ba.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode LORDNINE: Cửu Vương Tranh Bá mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC TRUYỀN THÔNG TRỰC TUYẾN phát hành chính thức tại Việt Nam theo Giấy phép G1 số 235 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game LORDNINE: Cửu Vương Tranh Bá trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '235 /QĐ-PTTH&TTĐT', '05/05/2026', '2026-05-05', '18+', 'Đang hoạt động', 'https://l9asia.onstove.vn/', 'https://codemoi.net/games/lordnine-cuu-vuong-tranh-ba/', 'https://l9asia.onstove.vn/', 'https://l9asia.onstove.vn/', 'https://l9asia.onstove.vn/', 'https://l9asia.onstove.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chi-huy-toi-thuong', 'Chỉ Huy Tối Thượng', 'chi-huy-toi-thuong', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.5, '/game_icons/chi-huy-toi-thuong.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chỉ Huy Tối Thượng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 182/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chỉ Huy Tối Thượng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '182/QĐ-PTTH&TTĐT', '09/04/2026', '2026-04-09', '18+', 'Đang hoạt động', 'https://chtt.gamota.com', 'https://codemoi.net/games/chi-huy-toi-thuong/', 'https://chtt.gamota.com', 'https://chtt.gamota.com', 'https://chtt.gamota.com', 'https://chtt.gamota.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('de-che-bong-da', 'Đế Chế Bóng Đá', 'de-che-bong-da', 'CÔNG TY TNHH PHẦN MỀM WEPLAY', 'Game Mobile Hot', 4.5, '/game_icons/de-che-bong-da.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đế Chế Bóng Đá mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM WEPLAY phát hành chính thức tại Việt Nam theo Giấy phép G1 số 81/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đế Chế Bóng Đá trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '81/QĐ-PTTH&TTĐT', '11/02/2026', '2026-02-11', '18+', 'Đang hoạt động', 'http://www.dechebongda.weplayz.com/', 'https://codemoi.net/games/de-che-bong-da/', 'http://www.dechebongda.weplayz.com/', 'http://www.dechebongda.weplayz.com/', 'http://www.dechebongda.weplayz.com/', 'http://www.dechebongda.weplayz.com/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('truyen-thuyet-haki', 'Truyền Thuyết Haki', 'truyen-thuyet-haki', 'CÔNG TY CỔ PHẦN EPICGOLD', 'Game Mobile Hot', 4.5, '/game_icons/truyen-thuyet-haki.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Truyền Thuyết Haki mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN EPICGOLD phát hành chính thức tại Việt Nam theo Giấy phép G1 số 63/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Truyền Thuyết Haki trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '63/QĐ-PTTH&TTĐT', '08/02/2026', '2026-02-08', '18+', 'Đang hoạt động', 'www.epicgold.vn', 'https://codemoi.net/games/truyen-thuyet-haki/', 'www.epicgold.vn', 'www.epicgold.vn', 'www.epicgold.vn', 'www.epicgold.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vlcm-origin', 'VLCM Origin: Võ Lâm Chân Mệnh Origin – TPL', 'vlcm-origin', 'Công Ty Cổ phần Tepaylink', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/vlcm-origin.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode VLCM Origin: Võ Lâm Chân Mệnh Origin – TPL mới nhất 2026. Tựa game do Công Ty Cổ phần Tepaylink phát hành chính thức tại Việt Nam theo Giấy phép G1 số 336/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game VLCM Origin: Võ Lâm Chân Mệnh Origin – TPL trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '336/QĐ-PTTH&TTĐT', '30/07/2025', '2025-07-30', '18+', 'Đang hoạt động', 'http://www.mongchiton.vn/', 'https://codemoi.net/games/vlcm-origin/', 'http://www.mongchiton.vn/', 'http://www.mongchiton.vn/', 'http://www.mongchiton.vn/', 'http://www.mongchiton.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('sieu-tien-hoa', 'Siêu Tiến Hóa', 'sieu-tien-hoa', 'CÔNG TY CỔ PHẦN TRỰC TUYỂN DUO', 'Game Mobile Hot', 4.5, '/game_icons/sieu-tien-hoa.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Siêu Tiến Hóa mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYỂN DUO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 566/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Siêu Tiến Hóa trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '566/QĐ-BTTTT', '28/03/2022', '2022-03-28', '18+', 'Đang hoạt động', 'www.sieutienhoa.vn', 'https://codemoi.net/games/sieu-tien-hoa/', 'www.sieutienhoa.vn', 'www.sieutienhoa.vn', 'www.sieutienhoa.vn', 'www.sieutienhoa.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('forsaken-world-2', 'Forsaken World 2: Thần Ma Đại Chiến', 'forsaken-world-2', 'CÔNG TY TNHH TRUYỀN THÔNG MINH PHƯƠNG THỊNH', 'Game Mobile Hot', 4.5, '/game_icons/forsaken-world-2.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Forsaken World 2: Thần Ma Đại Chiến mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG MINH PHƯƠNG THỊNH phát hành chính thức tại Việt Nam theo Giấy phép G1 số 390/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Forsaken World 2: Thần Ma Đại Chiến trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '390/QĐ-BTTTT', '25/03/2021', '2021-03-25', '18+', 'Đang hoạt động', 'http://fw.zing.vn', 'https://codemoi.net/games/forsaken-world-2/', 'http://fw.zing.vn', 'http://fw.zing.vn', 'http://fw.zing.vn', 'http://fw.zing.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ts-origin', 'TS Origin', 'ts-origin', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Game Mobile Hot', 4.5, '/game_icons/ts-origin.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode TS Origin mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 241/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game TS Origin trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '241/QĐ-PTTH&TTĐT', '13/05/2026', '2026-05-13', '18+', 'Đang hoạt động', 'https://ts.vtczone.vn', 'https://codemoi.net/games/ts-origin/', 'https://ts.vtczone.vn', 'https://ts.vtczone.vn', 'https://ts.vtczone.vn', 'https://ts.vtczone.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vuon-hoa-hanh-phuc', 'Vườn Hoa Hạnh Phúc', 'vuon-hoa-hanh-phuc', 'CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM', 'Game Mobile Hot', 4.5, '/game_icons/vuon-hoa-hanh-phuc.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vườn Hoa Hạnh Phúc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 223/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vườn Hoa Hạnh Phúc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '223/QĐ-PTTH&TTĐT', '04/05/2026', '2026-05-04', '18+', 'Đang hoạt động', 'https://vhhp.zoneplay.vn', 'https://codemoi.net/games/vuon-hoa-hanh-phuc/', 'https://vhhp.zoneplay.vn', 'https://vhhp.zoneplay.vn', 'https://vhhp.zoneplay.vn', 'https://vhhp.zoneplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tinh-kiem-truyen-ky-mobile', 'Tình Kiếm Truyền Kỳ Mobile', 'tinh-kiem-truyen-ky-mobile', 'CÔNG TY CỔ PHẦN TITAN STUDIO VIỆT NAM', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/tinh-kiem-truyen-ky-mobile.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tình Kiếm Truyền Kỳ Mobile mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TITAN STUDIO VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 205 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tình Kiếm Truyền Kỳ Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '205 /QĐ-PTTH&TTĐT', '21/04/2026', '2026-04-21', '18+', 'Đang hoạt động', 'titanstudio.vn', 'https://codemoi.net/games/tinh-kiem-truyen-ky-mobile/', 'titanstudio.vn', 'titanstudio.vn', 'titanstudio.vn', 'titanstudio.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('quy-tuong-3q-thuc-tinh-oeg', 'Quỷ Tướng 3Q: Thức Tỉnh - OEG', 'quy-tuong-3q-thuc-tinh-oeg', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG', 'Tam Quốc', 4.5, '/game_icons/quy-tuong-3q-thuc-tinh-oeg.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Quỷ Tướng 3Q: Thức Tỉnh - OEG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 149/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Quỷ Tướng 3Q: Thức Tỉnh - OEG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '149/QĐ-PTTH&TTĐT', '29/03/2026', '2026-03-29', '18+', 'Đang hoạt động', 'https://quytuong3q.oeg.vn', 'https://codemoi.net/games/quy-tuong-3q-thuc-tinh-oeg/', 'https://quytuong3q.oeg.vn', 'https://quytuong3q.oeg.vn', 'https://quytuong3q.oeg.vn', 'https://quytuong3q.oeg.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('lac-than-chien-ca', 'Lạc Thần Chiến Ca', 'lac-than-chien-ca', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN GOSU', 'Game Mobile Hot', 4.5, '/game_icons/lac-than-chien-ca.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Lạc Thần Chiến Ca mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN GOSU phát hành chính thức tại Việt Nam theo Giấy phép G1 số 396/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Lạc Thần Chiến Ca trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '396/QĐ-PTTH&TTĐT', '15/09/2025', '2025-09-15', '18+', 'Đang hoạt động', 'https://lacthan.gosu.vn', 'https://codemoi.net/games/lac-than-chien-ca/', 'https://lacthan.gosu.vn', 'https://lacthan.gosu.vn', 'https://lacthan.gosu.vn', 'https://lacthan.gosu.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('diet-quy-origin', 'Diệt Quỷ Origin', 'diet-quy-origin', 'CÔNG TY TNHH TRUYỀN THÔNG HNXSOFT', 'Game Mobile Hot', 4.5, '/game_icons/diet-quy-origin.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Diệt Quỷ Origin mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG HNXSOFT phát hành chính thức tại Việt Nam theo Giấy phép G1 số 156/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Diệt Quỷ Origin trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '156/QĐ-PTTH&TTĐT', '30/03/2026', '2026-03-30', '18+', 'Đang hoạt động', 'https://hnxgames.vn', 'https://codemoi.net/games/diet-quy-origin/', 'https://hnxgames.vn', 'https://hnxgames.vn', 'https://hnxgames.vn', 'https://hnxgames.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('quai-thu-phong-thu', 'Quái Thú Phòng Thủ', 'quai-thu-phong-thu', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG', 'Game Mobile Hot', 4.5, '/game_icons/quai-thu-phong-thu.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Quái Thú Phòng Thủ mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN GIẢI TRÍ ĐẠI DƯƠNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 155/QĐ-BVHTTDL. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Quái Thú Phòng Thủ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '155/QĐ-BVHTTDL', '29/03/2026', '2026-03-29', '18+', 'Đang hoạt động', 'https://quaithu.oeg.vn', 'https://codemoi.net/games/quai-thu-phong-thu/', 'https://quaithu.oeg.vn', 'https://quaithu.oeg.vn', 'https://quaithu.oeg.vn', 'https://quaithu.oeg.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('phong-van-truyen-ky-2', 'Phong Vân Truyền Kỳ 2', 'phong-van-truyen-ky-2', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Game Mobile Hot', 4.5, '/game_icons/phong-van-truyen-ky-2.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Phong Vân Truyền Kỳ 2 mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 110/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Phong Vân Truyền Kỳ 2 trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '110/QĐ-PTTH&TTĐT', '04/03/2026', '2026-03-04', '18+', 'Đang hoạt động', 'http://pvtk.cmn.vn', 'https://codemoi.net/games/phong-van-truyen-ky-2/', 'http://pvtk.cmn.vn', 'http://pvtk.cmn.vn', 'http://pvtk.cmn.vn', 'http://pvtk.cmn.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vu-tru-than-thoai', 'Vũ Trụ Thần Thoại', 'vu-tru-than-thoai', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI DỊCH VỤ CÔNG NGHỆ CMTECH', 'Game Mobile Hot', 4.5, '/game_icons/vu-tru-than-thoai.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vũ Trụ Thần Thoại mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN THƯƠNG MẠI DỊCH VỤ CÔNG NGHỆ CMTECH phát hành chính thức tại Việt Nam theo Giấy phép G1 số 95/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vũ Trụ Thần Thoại trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '95/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://cmplay.vn/', 'https://codemoi.net/games/vu-tru-than-thoai/', 'https://cmplay.vn/', 'https://cmplay.vn/', 'https://cmplay.vn/', 'https://cmplay.vn/', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thu-thanh-dai-chien', 'Thủ Thành Đại Chiến', 'thu-thanh-dai-chien', 'CÔNG TY CỔ PHẦN SKYWAY', 'Game Mobile Hot', 4.5, '/game_icons/thu-thanh-dai-chien.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thủ Thành Đại Chiến mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN SKYWAY phát hành chính thức tại Việt Nam theo Giấy phép G1 số 99/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thủ Thành Đại Chiến trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '99/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://ttdc.skw.vn/', 'https://codemoi.net/games/thu-thanh-dai-chien/', 'https://ttdc.skw.vn/', 'https://ttdc.skw.vn/', 'https://ttdc.skw.vn/', 'https://ttdc.skw.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('nam-dai-chien-tpl', 'Nấm Đại Chiến – TPL', 'nam-dai-chien-tpl', 'CÔNG TY CỔ PHẦN TEPAYLINK', 'Game Mobile Hot', 4.5, '/game_icons/nam-dai-chien-tpl.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Nấm Đại Chiến – TPL mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TEPAYLINK phát hành chính thức tại Việt Nam theo Giấy phép G1 số 74/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Nấm Đại Chiến – TPL trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '74/QĐ-PTTH&TTĐT', '11/02/2026', '2026-02-11', '12+', 'Đang hoạt động', 'https://maplex.vn', 'https://codemoi.net/games/nam-dai-chien-tpl/', 'https://maplex.vn', 'https://maplex.vn', 'https://maplex.vn', 'https://maplex.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ven-nguyen-ky-uc-mobile', 'Vẹn Nguyên Ký Ức Mobile', 'ven-nguyen-ky-uc-mobile', 'CÔNG TY TNHH DỊCH VỤ BÁCH GIA', 'Hành Động FPS & MOBA', 4.5, '/game_icons/ven-nguyen-ky-uc-mobile.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vẹn Nguyên Ký Ức Mobile mới nhất 2026. Tựa game do CÔNG TY TNHH DỊCH VỤ BÁCH GIA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 3/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vẹn Nguyên Ký Ức Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '3/QĐ-PTTH&TTĐT', '05/01/2026', '2026-01-05', '18+', 'Đang hoạt động', 'https://vennguyenkyuc.vn', 'https://codemoi.net/games/ven-nguyen-ky-uc-mobile/', 'https://vennguyenkyuc.vn', 'https://vennguyenkyuc.vn', 'https://vennguyenkyuc.vn', 'https://vennguyenkyuc.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ky-nguyen-bang-ha-3q', 'Kỷ Nguyên Băng Hà: 3Q', 'ky-nguyen-bang-ha-3q', 'CÔNG TY CỔ PHẦN TRAVELLET VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/ky-nguyen-bang-ha-3q.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kỷ Nguyên Băng Hà: 3Q mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRAVELLET VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 276/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kỷ Nguyên Băng Hà: 3Q trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '276/QĐ-PTTH&TTĐT', '19/06/2025', '2025-06-19', '18+', 'Đang hoạt động', 'https://icewartravellet.vn', 'https://codemoi.net/games/ky-nguyen-bang-ha-3q/', 'https://icewartravellet.vn', 'https://icewartravellet.vn', 'https://icewartravellet.vn', 'https://icewartravellet.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ky-nguyen-icarus', 'Kỷ Nguyên Icarus', 'ky-nguyen-icarus', 'CÔNG TY TNHH TRUYỀN THÔNG HNXSOFT', 'Game Mobile Hot', 4.5, '/game_icons/ky-nguyen-icarus.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kỷ Nguyên Icarus mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG HNXSOFT phát hành chính thức tại Việt Nam theo Giấy phép G1 số 31/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kỷ Nguyên Icarus trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '31/QĐ-PTTH&TTĐT', '17/02/2025', '2025-02-17', '18+', 'Đang hoạt động', 'https://kynguyeicarus.vn', 'https://codemoi.net/games/ky-nguyen-icarus/', 'https://kynguyeicarus.vn', 'https://kynguyeicarus.vn', 'https://kynguyeicarus.vn', 'https://kynguyeicarus.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('sieu-hai-tac', 'Siêu Hải Tặc', 'sieu-hai-tac', 'CÔNG TY TNHH VMGE', 'Game Mobile Hot', 4.5, '/game_icons/sieu-hai-tac.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Siêu Hải Tặc mới nhất 2026. Tựa game do CÔNG TY TNHH VMGE phát hành chính thức tại Việt Nam theo Giấy phép G1 số 54/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Siêu Hải Tặc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '54/QĐ-PTTH&TTĐT', '05/02/2026', '2026-02-05', '18+', 'Đang hoạt động', 'https://sieuhaitac.vmgeplay.vn', 'https://codemoi.net/games/sieu-hai-tac/', 'https://sieuhaitac.vmgeplay.vn', 'https://sieuhaitac.vmgeplay.vn', 'https://sieuhaitac.vmgeplay.vn', 'https://sieuhaitac.vmgeplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hoan-my-tam-quoc', 'Hoàn Mỹ Tam Quốc – VGP', 'hoan-my-tam-quoc', 'CÔNG TY CỔ PHẦN VGP', 'Tam Quốc', 4.5, '/game_icons/hoan-my-tam-quoc.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hoàn Mỹ Tam Quốc – VGP mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 91/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hoàn Mỹ Tam Quốc – VGP trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '91/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://hoanmytamquoc.vgplay.vn/', 'https://codemoi.net/games/hoan-my-tam-quoc/', 'https://hoanmytamquoc.vgplay.vn/', 'https://hoanmytamquoc.vgplay.vn/', 'https://hoanmytamquoc.vgplay.vn/', 'https://hoanmytamquoc.vgplay.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('me-ta-tam-quoc', 'Mê Ta Tam Quốc', 'me-ta-tam-quoc', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/me-ta-tam-quoc.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Mê Ta Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 168/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Mê Ta Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '168/QĐ-PTTH&TTĐT', '07/05/2025', '2025-05-07', '18+', 'Đang hoạt động', 'www.vplay.vn.', 'https://codemoi.net/games/me-ta-tam-quoc/', 'www.vplay.vn.', 'www.vplay.vn.', 'www.vplay.vn.', 'www.vplay.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mong-huyen-giang-ho', 'Mộng Huyễn Giang Hồ', 'mong-huyen-giang-ho', 'CÔNG TY CỔ PHẦN GGO', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/mong-huyen-giang-ho.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Mộng Huyễn Giang Hồ mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GGO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 861/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Mộng Huyễn Giang Hồ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '861/QĐ-BTTTT', '20/05/2020', '2020-05-20', '18+', 'Đang hoạt động', 'www.mhgh.ggo.vn', 'https://codemoi.net/games/mong-huyen-giang-ho/', 'www.mhgh.ggo.vn', 'www.mhgh.ggo.vn', 'www.mhgh.ggo.vn', 'www.mhgh.ggo.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-chi-giang-ho-khai-thien', 'Kiếm Chỉ Giang Hồ: Khai Thiên', 'kiem-chi-giang-ho-khai-thien', 'CÔNG TY TNHH PHẦN MỀM WEPLAY', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/kiem-chi-giang-ho-khai-thien.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Chỉ Giang Hồ: Khai Thiên mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM WEPLAY phát hành chính thức tại Việt Nam theo Giấy phép G1 số 187/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Chỉ Giang Hồ: Khai Thiên trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '187/QĐ-PTTH&TTĐT', '13/04/2026', '2026-04-13', '18+', 'Đang hoạt động', 'kcghkt.weplayz.com', 'https://codemoi.net/games/kiem-chi-giang-ho-khai-thien/', 'kcghkt.weplayz.com', 'kcghkt.weplayz.com', 'kcghkt.weplayz.com', 'kcghkt.weplayz.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('co-giap-vo-han', 'Cơ Giáp Vô Hạn – Gamota', 'co-giap-vo-han', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.5, '/game_icons/co-giap-vo-han.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Cơ Giáp Vô Hạn – Gamota mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 184/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Cơ Giáp Vô Hạn – Gamota trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '184/QĐ-PTTH&TTĐT', '09/04/2026', '2026-04-09', '18+', 'Đang hoạt động', 'https://cgvh.gamota.com', 'https://codemoi.net/games/co-giap-vo-han/', 'https://cgvh.gamota.com', 'https://cgvh.gamota.com', 'https://cgvh.gamota.com', 'https://cgvh.gamota.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chien-loan-tam-quoc', 'Chiến Loạn Tam Quốc', 'chien-loan-tam-quoc', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/chien-loan-tam-quoc.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chiến Loạn Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 315/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chiến Loạn Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '315/QĐ-PTTH&TTĐT', '14/07/2025', '2025-07-14', '18+', 'Đang hoạt động', 'http://game.cmn.vn.', 'https://codemoi.net/games/chien-loan-tam-quoc/', 'http://game.cmn.vn.', 'http://game.cmn.vn.', 'http://game.cmn.vn.', 'http://game.cmn.vn.', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mukbang-tam-quoc', 'Mukbang Tam Quốc', 'mukbang-tam-quoc', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/mukbang-tam-quoc.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Mukbang Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 58/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Mukbang Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '58/QĐ-BTTTT', '16/01/2025', '2025-01-16', '18+', 'Đang hoạt động', 'www.mukbangtamquoc.vplay.vn', 'https://codemoi.net/games/mukbang-tam-quoc/', 'www.mukbangtamquoc.vplay.vn', 'www.mukbangtamquoc.vplay.vn', 'www.mukbangtamquoc.vplay.vn', 'www.mukbangtamquoc.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vuong-gia-chien-quoc', 'Vương Giả Chiến Quốc', 'vuong-gia-chien-quoc', 'CÔNG TY CỔ PHẦN ADNX', 'Game Mobile Hot', 4.5, '/game_icons/vuong-gia-chien-quoc.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vương Giả Chiến Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN ADNX phát hành chính thức tại Việt Nam theo Giấy phép G1 số 250/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vương Giả Chiến Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '250/QĐ-PTTH&TTĐT', '14/05/2026', '2026-05-14', '18+', 'Đang hoạt động', 'https://vuonggiachienquoc.adnxgames.vn', 'https://codemoi.net/games/vuong-gia-chien-quoc/', 'https://vuonggiachienquoc.adnxgames.vn', 'https://vuonggiachienquoc.adnxgames.vn', 'https://vuonggiachienquoc.adnxgames.vn', 'https://vuonggiachienquoc.adnxgames.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vo-lam-hac-dao', 'Võ Lâm Hắc Đạo', 'vo-lam-hac-dao', 'CÔNG TY TNHH SOHA', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/vo-lam-hac-dao.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Võ Lâm Hắc Đạo mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 19/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Võ Lâm Hắc Đạo trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '19/QĐ-PTTH&TTĐT', '19/01/2026', '2026-01-19', '18+', 'Đang hoạt động', 'https://volamhacdao.sohagame.vn', 'https://codemoi.net/games/vo-lam-hac-dao/', 'https://volamhacdao.sohagame.vn', 'https://volamhacdao.sohagame.vn', 'https://volamhacdao.sohagame.vn', 'https://volamhacdao.sohagame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('quy-mon-quan', 'Quỷ Môn Quan', 'quy-mon-quan', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Game Mobile Hot', 4.5, '/game_icons/quy-mon-quan.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Quỷ Môn Quan mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 602/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Quỷ Môn Quan trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '602/QĐ-PTTH&TTĐT', '30/12/2025', '2025-12-30', '18+', 'Đang hoạt động', 'www.vplay.vn', 'https://codemoi.net/games/quy-mon-quan/', 'www.vplay.vn', 'www.vplay.vn', 'www.vplay.vn', 'www.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tho-san-quy', 'Thợ Săn Quỷ: Đại Chiến Dị Giới', 'tho-san-quy', 'CÔNG TY CỔ PHẦN GAMOTA', 'Game Mobile Hot', 4.5, '/game_icons/tho-san-quy.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thợ Săn Quỷ: Đại Chiến Dị Giới mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GAMOTA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 33/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thợ Săn Quỷ: Đại Chiến Dị Giới trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '33/QĐ-PTTH&TTĐT', '29/01/2025', '2025-01-29', '18+', 'Đang hoạt động', 'https://tsqdigioi.gamota.com/', 'https://codemoi.net/games/tho-san-quy/', 'https://tsqdigioi.gamota.com/', 'https://tsqdigioi.gamota.com/', 'https://tsqdigioi.gamota.com/', 'https://tsqdigioi.gamota.com/', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ballistic-hero', 'Ballistic Hero VNG', 'ballistic-hero', 'Công ty TNHH VNGGames', 'Game Mobile Hot', 4.5, '/game_icons/ballistic-hero.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ballistic Hero VNG mới nhất 2026. Tựa game do Công ty TNHH VNGGames phát hành chính thức tại Việt Nam theo Giấy phép G1 số 177/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ballistic Hero VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '177/QĐ-PTTH&TTĐT', '05/04/2026', '2026-04-05', '12+', 'Đang hoạt động', 'https://ballisticvn.vnggames.com', 'https://codemoi.net/games/ballistic-hero/', 'https://ballisticvn.vnggames.com', 'https://ballisticvn.vnggames.com', 'https://ballisticvn.vnggames.com', 'https://ballisticvn.vnggames.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tien-nghich-mobile', 'Tiên Nghịch Mobile', 'tien-nghich-mobile', 'CÔNG TY TNHH JOYGAMES', 'Hành Động FPS & MOBA', 4.5, '/game_icons/tien-nghich-mobile.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tiên Nghịch Mobile mới nhất 2026. Tựa game do CÔNG TY TNHH JOYGAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 210/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tiên Nghịch Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '210/QĐ-PTTH&TTĐT', '23/04/2026', '2026-04-23', '18+', 'Đang hoạt động', 'https://tiennghich.joyplay.vn/', 'https://codemoi.net/games/tien-nghich-mobile/', 'https://tiennghich.joyplay.vn/', 'https://tiennghich.joyplay.vn/', 'https://tiennghich.joyplay.vn/', 'https://tiennghich.joyplay.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('vo-dich-tu-tien-gioi-vtc', 'Vô Địch Tu Tiên Giới - VTC', 'vo-dich-tu-tien-gioi-vtc', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/vo-dich-tu-tien-gioi-vtc.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vô Địch Tu Tiên Giới - VTC mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 194/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vô Địch Tu Tiên Giới - VTC trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '194/QĐ-PTTH&TTĐT', '14/04/2026', '2026-04-14', '18+', 'Đang hoạt động', 'https://vodichtutiengioi.vn', 'https://codemoi.net/games/vo-dich-tu-tien-gioi-vtc/', 'https://vodichtutiengioi.vn', 'https://vodichtutiengioi.vn', 'https://vodichtutiengioi.vn', 'https://vodichtutiengioi.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('ngoa-long-vng', 'Ngọa Long VNG', 'ngoa-long-vng', 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG', 'Game Mobile Hot', 4.5, '/game_icons/ngoa-long-vng.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Ngọa Long VNG mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 30/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Ngọa Long VNG trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '30/QĐ-PTTH&TTĐT', '26/01/2026', '2026-01-26', '18+', 'Đang hoạt động', 'https://ngoalong.vnggames.com', 'https://codemoi.net/games/ngoa-long-vng/', 'https://ngoalong.vnggames.com', 'https://ngoalong.vnggames.com', 'https://ngoalong.vnggames.com', 'https://ngoalong.vnggames.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('luc-tung-tam-quoc', 'Lục Tung Tam Quốc', 'luc-tung-tam-quoc', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/luc-tung-tam-quoc.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Lục Tung Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 945/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Lục Tung Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '945/QĐ-BTTTT', '09/06/2024', '2024-06-09', '18+', 'Đang hoạt động', 'www.luctung.vplay.vn', 'https://codemoi.net/games/luc-tung-tam-quoc/', 'www.luctung.vplay.vn', 'www.luctung.vplay.vn', 'www.luctung.vplay.vn', 'www.luctung.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hanh-trinh-afk', 'Hành Trình AFK', 'hanh-trinh-afk', 'CÔNG TY CỔ PHẦN TRAVELLET VIỆT NAM', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/hanh-trinh-afk.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hành Trình AFK mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRAVELLET VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 2202/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hành Trình AFK trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '2202/QĐ-BTTTT', '09/11/2023', '2023-11-09', '18+', 'Đang hoạt động', 'https://hanhtrinhafk.travelletgames.vn', 'https://codemoi.net/games/hanh-trinh-afk/', 'https://hanhtrinhafk.travelletgames.vn', 'https://hanhtrinhafk.travelletgames.vn', 'https://hanhtrinhafk.travelletgames.vn', 'https://hanhtrinhafk.travelletgames.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chien-than-mini', 'Chiến Thần MINI', 'chien-than-mini', 'CÔNG TY TNHH MOBILE INTELLIGENCE SAIGON', 'Game Mobile Hot', 4.5, '/game_icons/chien-than-mini.png', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chiến Thần MINI mới nhất 2026. Tựa game do CÔNG TY TNHH MOBILE INTELLIGENCE SAIGON phát hành chính thức tại Việt Nam theo Giấy phép G1 số 400 /QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chiến Thần MINI trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '400 /QĐ-PTTH&TTĐT', '18/09/2025', '2025-09-18', '18+', 'Đang hoạt động', 'https://chienthanmi.intelligenc', 'https://codemoi.net/games/chien-than-mini/', 'https://chienthanmi.intelligenc', 'https://chienthanmi.intelligenc', 'https://chienthanmi.intelligenc', 'https://chienthanmi.intelligenc', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tay-du-phuc-ma', 'Tây Du Phục Ma', 'tay-du-phuc-ma', 'CÔNG TY TNHH TRỰC TUYÊN THIÊN HÀ', 'Game Mobile Hot', 4.5, '/game_icons/tay-du-phuc-ma.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tây Du Phục Ma mới nhất 2026. Tựa game do CÔNG TY TNHH TRỰC TUYÊN THIÊN HÀ phát hành chính thức tại Việt Nam theo Giấy phép G1 số 2052/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tây Du Phục Ma trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '2052/QĐ-BTTTT', '07/11/2022', '2022-11-07', '18+', 'Đang hoạt động', 'https://tavduphucma.garnes.vn.', 'https://codemoi.net/games/tay-du-phuc-ma/', 'https://tavduphucma.garnes.vn.', 'https://tavduphucma.garnes.vn.', 'https://tavduphucma.garnes.vn.', 'https://tavduphucma.garnes.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chien-gioi-4d', 'Chiến Giới 4D', 'chien-gioi-4d', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Game Mobile Hot', 4.5, '/game_icons/chien-gioi-4d.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chiến Giới 4D mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 856/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chiến Giới 4D trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '856/QĐ-BTTTT', '08/05/2022', '2022-05-08', '18+', 'Đang hoạt động', 'www.chiengioi.vplay.vn', 'https://codemoi.net/games/chien-gioi-4d/', 'www.chiengioi.vplay.vn', 'www.chiengioi.vplay.vn', 'www.chiengioi.vplay.vn', 'www.chiengioi.vplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('goi-ta-dai-chuong-quy', 'Gọi Ta Đại Chưởng Quỹ', 'goi-ta-dai-chuong-quy', 'CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN SUNGAME', 'Game Mobile Hot', 4.5, '/game_icons/goi-ta-dai-chuong-quy.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Gọi Ta Đại Chưởng Quỹ mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ TRỰC TUYẾN SUNGAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 807/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Gọi Ta Đại Chưởng Quỹ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '807/QĐ-BTTTT', '13/06/2021', '2021-06-13', '18+', 'Đang hoạt động', 'http://dcq.sungame.vn', 'https://codemoi.net/games/goi-ta-dai-chuong-quy/', 'http://dcq.sungame.vn', 'http://dcq.sungame.vn', 'http://dcq.sungame.vn', 'http://dcq.sungame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tam-quoc-36-ke', 'Tam Quốc 36 Kế VTC', 'tam-quoc-36-ke', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG', 'Tam Quốc', 4.5, '/game_icons/tam-quoc-36-ke.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tam Quốc 36 Kế VTC mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG phát hành chính thức tại Việt Nam theo Giấy phép G1 số 48/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tam Quốc 36 Kế VTC trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '48/QĐ-PTTH&TTĐT', '04/02/2026', '2026-02-04', '18+', 'Đang hoạt động', 'https://tamquoc36ke.vn', 'https://codemoi.net/games/tam-quoc-36-ke/', 'https://tamquoc36ke.vn', 'https://tamquoc36ke.vn', 'https://tamquoc36ke.vn', 'https://tamquoc36ke.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('anh-hung-pixel', 'Anh Hùng Pixel', 'anh-hung-pixel', 'CÔNG TY TNHH PHẦN MỀM WEPLAY', 'Game Mobile Hot', 4.5, '/game_icons/anh-hung-pixel.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Anh Hùng Pixel mới nhất 2026. Tựa game do CÔNG TY TNHH PHẦN MỀM WEPLAY phát hành chính thức tại Việt Nam theo Giấy phép G1 số 2165/QĐ-BTTTT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Anh Hùng Pixel trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '2165/QĐ-BTTTT', '09/12/2024', '2024-12-09', '18+', 'Đang hoạt động', 'https://anhhungpixel.weplayz.com', 'https://codemoi.net/games/anh-hung-pixel/', 'https://anhhungpixel.weplayz.com', 'https://anhhungpixel.weplayz.com', 'https://anhhungpixel.weplayz.com', 'https://anhhungpixel.weplayz.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('giang-ho-ngu-tuyet-mobile', 'Giang Hồ Ngũ Tuyệt Mobile', 'giang-ho-ngu-tuyet-mobile', 'CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG -', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/giang-ho-ngu-tuyet-mobile.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Giang Hồ Ngũ Tuyệt Mobile mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VTC DỊCH VỤ DI ĐỘNG - phát hành chính thức tại Việt Nam theo Giấy phép G1 số 93/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Giang Hồ Ngũ Tuyệt Mobile trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '93/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://ghnt.vn', 'https://codemoi.net/games/giang-ho-ngu-tuyet-mobile/', 'https://ghnt.vn', 'https://ghnt.vn', 'https://ghnt.vn', 'https://ghnt.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('the-gioi-hoa-vien-cua-toi', 'Thế Giới Hoa Viên Của Tôi', 'the-gioi-hoa-vien-cua-toi', 'CÔNG TY TNHH TRUYỀN THÔNG GENZ', 'Game Mobile Hot', 4.5, '/game_icons/the-gioi-hoa-vien-cua-toi.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thế Giới Hoa Viên Của Tôi mới nhất 2026. Tựa game do CÔNG TY TNHH TRUYỀN THÔNG GENZ phát hành chính thức tại Việt Nam theo Giấy phép G1 số 83/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thế Giới Hoa Viên Của Tôi trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '83/QĐ-PTTH&TTĐT', '11/02/2026', '2026-02-11', '18+', 'Đang hoạt động', 'https://tghvct.genzzz.vn/', 'https://codemoi.net/games/the-gioi-hoa-vien-cua-toi/', 'https://tghvct.genzzz.vn/', 'https://tghvct.genzzz.vn/', 'https://tghvct.genzzz.vn/', 'https://tghvct.genzzz.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('hao-khi-du-hiep', 'Hào Khí Du Hiệp', 'hao-khi-du-hiep', 'CÔNG TY CỔ PHẦN DỊCH VỤ TRỰC TUYẾN MIGA', 'Game Mobile Hot', 4.5, '/game_icons/hao-khi-du-hiep.webp', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Hào Khí Du Hiệp mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN DỊCH VỤ TRỰC TUYẾN MIGA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 55/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Hào Khí Du Hiệp trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '55/QĐ-PTTH&TTĐT', '05/02/2026', '2026-02-05', '18+', 'Đang hoạt động', 'http://haokhiduhiep.vn', 'https://codemoi.net/games/hao-khi-du-hiep/', 'http://haokhiduhiep.vn', 'http://haokhiduhiep.vn', 'http://haokhiduhiep.vn', 'http://haokhiduhiep.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('mieu-de-tam-quoc', 'Miêu Đế Tam Quốc', 'mieu-de-tam-quoc', 'Công ty TNHH Velalive', 'Tam Quốc', 4.5, '/game_icons/mieu-de-tam-quoc.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Miêu Đế Tam Quốc mới nhất 2026. Tựa game do Công ty TNHH Velalive phát hành chính thức tại Việt Nam theo Giấy phép G1 số 457/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Miêu Đế Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '457/QĐ-PTTH&TTĐT', '16/10/2025', '2025-10-16', '18+', 'Đang hoạt động', 'https://mieude.velalive.vn/', 'https://codemoi.net/games/mieu-de-tam-quoc/', 'https://mieude.velalive.vn/', 'https://mieude.velalive.vn/', 'https://mieude.velalive.vn/', 'https://mieude.velalive.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('huyen-thoai-phuc-yeu', 'Huyền Thoại Phục Yêu', 'huyen-thoai-phuc-yeu', 'CÔNG TY TNHH NEXFUN', 'Game Mobile Hot', 4.5, '/game_icons/huyen-thoai-phuc-yeu.png', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Huyền Thoại Phục Yêu mới nhất 2026. Tựa game do CÔNG TY TNHH NEXFUN phát hành chính thức tại Việt Nam theo Giấy phép G1 số 389/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Huyền Thoại Phục Yêu trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '389/QĐ-PTTH&TTĐT', '10/09/2025', '2025-09-10', '18+', 'Đang hoạt động', 'www.nexfungames.vn', 'https://codemoi.net/games/huyen-thoai-phuc-yeu/', 'www.nexfungames.vn', 'www.nexfungames.vn', 'www.nexfungames.vn', 'www.nexfungames.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tieu-tien-ta-vo-dich', 'Tiểu Tiên Ta Vô Địch', 'tieu-tien-ta-vo-dich', 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO', 'Kiếm Hiệp & Tiên Hiệp', 4.5, '/game_icons/tieu-tien-ta-vo-dich.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tiểu Tiên Ta Vô Địch mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN CÔNG NGHỆ SỐ ALO phát hành chính thức tại Việt Nam theo Giấy phép G1 số 366/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tiểu Tiên Ta Vô Địch trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '366/QĐ-PTTH&TTĐT', '22/06/2026', '2026-06-22', '18+', 'Đang hoạt động', 'https://tieutien.alogame.vn', 'https://codemoi.net/games/tieu-tien-ta-vo-dich/', 'https://tieutien.alogame.vn', 'https://tieutien.alogame.vn', 'https://tieutien.alogame.vn', 'https://tieutien.alogame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('phi-kiem-tru-thien-ma', 'Phi Kiếm Trừ Thiên Ma', 'phi-kiem-tru-thien-ma', 'CÔNG TY TNHH CÔNG NGHỆ MẠNG AT', 'Game Mobile', 4.5, '/game_icons/phi-kiem-tru-thien-ma.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Phi Kiếm Trừ Thiên Ma mới nhất 2026. Tựa game do CÔNG TY TNHH CÔNG NGHỆ MẠNG AT phát hành chính thức tại Việt Nam theo Giấy phép G1 số 373/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Phi Kiếm Trừ Thiên Ma trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '373/QĐ-PTTH&TTĐT', '24/06/2026', '2026-06-24', '18+', 'Đang hoạt động', 'https://phikiemtruthienma.atgame.com.vn/', 'https://codemoi.net/games/phi-kiem-tru-thien-ma/', 'https://phikiemtruthienma.atgame.com.vn/', 'https://phikiemtruthienma.atgame.com.vn/', 'https://phikiemtruthienma.atgame.com.vn/', 'https://phikiemtruthienma.atgame.com.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('khe-uoc-rong', 'Khế Ước Rồng', 'khe-uoc-rong', 'CÔNG TY CỔ PHẦN VGP', 'Game Mobile', 4.5, '/game_icons/khe-uoc-rong.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Khế Ước Rồng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 535/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Khế Ước Rồng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '535/QĐ-PTTH&TTĐT', '19/08/2026', '2026-08-19', '18+', 'Đang hoạt động', 'https://kheuocrong.vgplay.vn', 'https://codemoi.net/games/khe-uoc-rong/', 'https://kheuocrong.vgplay.vn', 'https://kheuocrong.vgplay.vn', 'https://kheuocrong.vgplay.vn', 'https://kheuocrong.vgplay.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('cuc-toc-tam-quoc', 'Cực Tốc Tam Quốc', 'cuc-toc-tam-quoc', 'CÔNG TY CỔ PHẦN FUNTAP GAMES', 'Tam Quốc', 4.5, '/game_icons/cuc-toc-tam-quoc.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Cực Tốc Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN FUNTAP GAMES phát hành chính thức tại Việt Nam theo Giấy phép G1 số 382/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Cực Tốc Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '382/QĐ-PTTH&TTĐT', '02/07/2026', '2026-07-02', '18+', 'Đang hoạt động', 'https://cuctoctamquoc.funtap.ga', 'https://codemoi.net/games/cuc-toc-tam-quoc/', 'https://cuctoctamquoc.funtap.ga', 'https://cuctoctamquoc.funtap.ga', 'https://cuctoctamquoc.funtap.ga', 'https://cuctoctamquoc.funtap.ga', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('huyen-thoai-huong-cang', 'Huyền Thoại Hương Cảng', 'huyen-thoai-huong-cang', 'Công ty TNHH Velalive', 'Kiếm Hiệp & Tiên Hiệp', 4.5, '/game_icons/huyen-thoai-huong-cang.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Huyền Thoại Hương Cảng mới nhất 2026. Tựa game do Công ty TNHH Velalive phát hành chính thức tại Việt Nam theo Giấy phép G1 số 372/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Huyền Thoại Hương Cảng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '372/QĐ-PTTH&TTĐT', '24/06/2026', '2026-06-24', '18+', 'Đang hoạt động', 'https://velalive.net.vn', 'https://codemoi.net/games/huyen-thoai-huong-cang/', 'https://velalive.net.vn', 'https://velalive.net.vn', 'https://velalive.net.vn', 'https://velalive.net.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('nhat-luan-kiem', 'Nhật Luân Kiếm', 'nhat-luan-kiem', 'CÔNG TY TNHH SKYMOBI', 'Game Mobile', 4.5, '/game_icons/nhat-luan-kiem.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Nhật Luân Kiếm mới nhất 2026. Tựa game do CÔNG TY TNHH SKYMOBI phát hành chính thức tại Việt Nam theo Giấy phép G1 số 333/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Nhật Luân Kiếm trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '333/QĐ-PTTH&TTĐT', '07/06/2026', '2026-06-07', '12+', 'Đang hoạt động', 'https://nhatluankiem.com', 'https://codemoi.net/games/nhat-luan-kiem/', 'https://nhatluankiem.com', 'https://nhatluankiem.com', 'https://nhatluankiem.com', 'https://nhatluankiem.com', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('phong-hau-tam-quoc', 'Phong Hầu Tam Quốc', 'phong-hau-tam-quoc', 'CÔNG TY TNHH SOHA', 'Tam Quốc', 4.5, '/game_icons/phong-hau-tam-quoc.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Phong Hầu Tam Quốc mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 506/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Phong Hầu Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '506/QĐ-PTTH&TTĐT', '12/08/2026', '2026-08-12', '18+', 'Đang hoạt động', 'https://phonghautamquoc.sohagame.vn', 'https://codemoi.net/games/phong-hau-tam-quoc/', 'https://phonghautamquoc.sohagame.vn', 'https://phonghautamquoc.sohagame.vn', 'https://phonghautamquoc.sohagame.vn', 'https://phonghautamquoc.sohagame.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('tay-du-tam-bao', 'Tây Du Tầm Bảo', 'tay-du-tam-bao', 'CÔNG TY TNHH SOHA', 'Game Mobile', 4.5, '/game_icons/tay-du-tam-bao.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Tây Du Tầm Bảo mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 523/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Tây Du Tầm Bảo trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '523/QĐ-PTTH&TTĐT', '13/08/2026', '2026-08-13', '18+', 'Đang hoạt động', 'https://taydutambao.sohagame.vn', 'https://codemoi.net/games/tay-du-tam-bao/', 'https://taydutambao.sohagame.vn', 'https://taydutambao.sohagame.vn', 'https://taydutambao.sohagame.vn', 'https://taydutambao.sohagame.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('doi-hinh-toi-thuong', 'Đội Hình Tối Thượng', 'doi-hinh-toi-thuong', 'CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM', 'Game Mobile', 4.5, '/game_icons/doi-hinh-toi-thuong.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Đội Hình Tối Thượng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GZONE MEDIA VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 474/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Đội Hình Tối Thượng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '474/QĐ-PTTH&TTĐT', '30/07/2026', '2026-07-30', '18+', 'Đang hoạt động', 'https://dhtt.zoneplay.vn', 'https://codemoi.net/games/doi-hinh-toi-thuong/', 'https://dhtt.zoneplay.vn', 'https://dhtt.zoneplay.vn', 'https://dhtt.zoneplay.vn', 'https://dhtt.zoneplay.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('chu-cong-xung-xung-xung', 'Chủ Công Xung Xung Xung', 'chu-cong-xung-xung-xung', 'CÔNG TY CỔ PHẦN VISION GAME', 'Game Mobile', 4.5, '/game_icons/chu-cong-xung-xung-xung.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Chủ Công Xung Xung Xung mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VISION GAME phát hành chính thức tại Việt Nam theo Giấy phép G1 số 391/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Chủ Công Xung Xung Xung trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '391/QĐ-PTTH&TTĐT', '06/07/2026', '2026-07-06', '18+', 'Đang hoạt động', 'https://3q.vsgame.vn', 'https://codemoi.net/games/chu-cong-xung-xung-xung/', 'https://3q.vsgame.vn', 'https://3q.vsgame.vn', 'https://3q.vsgame.vn', 'https://3q.vsgame.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('van-dinh-tam-quoc', 'Vấn Đỉnh Tam Quốc', 'van-dinh-tam-quoc', 'CÔNG TY TNHH SOHA', 'Tam Quốc', 4.5, '/game_icons/van-dinh-tam-quoc.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Vấn Đỉnh Tam Quốc mới nhất 2026. Tựa game do CÔNG TY TNHH SOHA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 522/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Vấn Đỉnh Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '522/QĐ-PTTH&TTĐT', '13/08/2026', '2026-08-13', '18+', 'Đang hoạt động', 'https://vandinhtamquoc.sohagame.vn', 'https://codemoi.net/games/van-dinh-tam-quoc/', 'https://vandinhtamquoc.sohagame.vn', 'https://vandinhtamquoc.sohagame.vn', 'https://vandinhtamquoc.sohagame.vn', 'https://vandinhtamquoc.sohagame.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('kiem-hiep-tinh', 'Kiếm Hiệp Tình', 'kiem-hiep-tinh', 'Công ty TNHH VNGGames', 'Kiếm Hiệp & Tiên Hiệp', 4.5, '/game_icons/kiem-hiep-tinh.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Kiếm Hiệp Tình mới nhất 2026. Tựa game do Công ty TNHH VNGGames phát hành chính thức tại Việt Nam theo Giấy phép G1 số 418/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Kiếm Hiệp Tình trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '418/QĐ-PTTH&TTĐT', '14/07/2026', '2026-07-14', '18+', 'Đang hoạt động', 'kiemhieptinh.vnggames.com', 'https://codemoi.net/games/kiem-hiep-tinh/', 'kiemhieptinh.vnggames.com', 'kiemhieptinh.vnggames.com', 'kiemhieptinh.vnggames.com', 'kiemhieptinh.vnggames.com', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thuc-than-ky', 'Thức Thần Ký', 'thuc-than-ky', 'CÔNG TY CỔ PHẦN VGP', 'Gacha & Anime', 4.5, '/game_icons/thuc-than-ky.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thức Thần Ký mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN VGP phát hành chính thức tại Việt Nam theo Giấy phép G1 số 404/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thức Thần Ký trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '404/QĐ-PTTH&TTĐT', '07/07/2026', '2026-07-07', '18+', 'Đang hoạt động', 'https://hkcc.vgplay.vn', 'https://codemoi.net/games/thuc-than-ky/', 'https://hkcc.vgplay.vn', 'https://hkcc.vgplay.vn', 'https://hkcc.vgplay.vn', 'https://hkcc.vgplay.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thanh-long-huyen-thoai', 'Thanh Long Huyền Thoại', 'thanh-long-huyen-thoai', 'Công ty Cổ phần Song Long Game', 'Kiếm Hiệp & Tiên Hiệp', 4.5, '/game_icons/thanh-long-huyen-thoai.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thanh Long Huyền Thoại mới nhất 2026. Tựa game do Công ty Cổ phần Song Long Game phát hành chính thức tại Việt Nam theo Giấy phép G1 số 470/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thanh Long Huyền Thoại trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '470/QĐ-PTTH&TTĐT', '28/07/2026', '2026-07-28', '18+', 'Đang hoạt động', 'https://slgplay.vn', 'https://codemoi.net/games/thanh-long-huyen-thoai/', 'https://slgplay.vn', 'https://slgplay.vn', 'https://slgplay.vn', 'https://slgplay.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thai-cuc-vo-dao-x-arena', 'Thái Cực Võ Đạo - X Arena', 'thai-cuc-vo-dao-x-arena', 'CÔNG TY TNHH X ARENA', 'Kiếm Hiệp & Tiên Hiệp', 4.5, '/game_icons/thai-cuc-vo-dao-x-arena.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thái Cực Võ Đạo - X Arena mới nhất 2026. Tựa game do CÔNG TY TNHH X ARENA phát hành chính thức tại Việt Nam theo Giấy phép G1 số 334/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thái Cực Võ Đạo - X Arena trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '334/QĐ-PTTH&TTĐT', '09/06/2026', '2026-06-09', '18+', 'Đang hoạt động', 'https://thaicucpc.vn', 'https://codemoi.net/games/thai-cuc-vo-dao-x-arena/', 'https://thaicucpc.vn', 'https://thaicucpc.vn', 'https://thaicucpc.vn', 'https://thaicucpc.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('cau-ca-van-can', 'Câu Cá Vạn Cân', 'cau-ca-van-can', 'CÔNG TY TNHH THẾ GIỚI MINI', 'Casual & Giải Trí', 4.5, '/game_icons/cau-ca-van-can.webp', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Câu Cá Vạn Cân mới nhất 2026. Tựa game do CÔNG TY TNHH THẾ GIỚI MINI phát hành chính thức tại Việt Nam theo Giấy phép G1 số 570/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Câu Cá Vạn Cân trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '570/QĐ-PTTH&TTĐT', '25/08/2026', '2026-08-25', '12+', 'Đang hoạt động', 'www.miniworldgame.vn', 'https://codemoi.net/games/cau-ca-van-can/', 'www.miniworldgame.vn', 'www.miniworldgame.vn', 'www.miniworldgame.vn', 'www.miniworldgame.vn', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('samkok-tam-quoc', 'Samkok Tam Quốc', 'samkok-tam-quoc', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/samkok-tam-quoc.webp', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Samkok Tam Quốc mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 41/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Samkok Tam Quốc trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '41/QĐ-PTTH&TTĐT', '29/01/2026', '2026-01-29', '18+', 'Đang hoạt động', 'https://samkoktamquoc.vplay.vn/', 'https://codemoi.net/games/samkok-tam-quoc/', 'https://samkoktamquoc.vplay.vn/', 'https://samkoktamquoc.vplay.vn/', 'https://samkoktamquoc.vplay.vn/', 'https://samkoktamquoc.vplay.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('giang-ho-ky-ngo', 'Giang Hồ Kỳ Ngộ', 'giang-ho-ky-ngo', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Tiên Hiệp & Kiếm Hiệp', 4.5, '/game_icons/giang-ho-ky-ngo.webp', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Giang Hồ Kỳ Ngộ mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 85/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Giang Hồ Kỳ Ngộ trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '85/QĐ-PTTH&TTĐT', '12/02/2026', '2026-02-12', '18+', 'Đang hoạt động', 'https://gianghokyngo.vplay.vn/', 'https://codemoi.net/games/giang-ho-ky-ngo/', 'https://gianghokyngo.vplay.vn/', 'https://gianghokyngo.vplay.vn/', 'https://gianghokyngo.vplay.vn/', 'https://gianghokyngo.vplay.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('bo-lac-3q', 'Bộ Lạc 3Q', 'bo-lac-3q', 'CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM', 'Tam Quốc', 4.5, '/game_icons/bo-lac-3q.webp', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Bộ Lạc 3Q mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRỰC TUYẾN CMN VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 121/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Bộ Lạc 3Q trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '121/QĐ-PTTH&TTĐT', '09/03/2026', '2026-03-09', '18+', 'Đang hoạt động', 'https://bolac3q.vn/', 'https://codemoi.net/games/bo-lac-3q/', 'https://bolac3q.vn/', 'https://bolac3q.vn/', 'https://bolac3q.vn/', 'https://bolac3q.vn/', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('3q-goi-tuong-di', '3Q Gọi Tướng Đi', '3q-goi-tuong-di', 'CÔNG TY CỔ PHẦN GIẢI TRÍ 568E', 'Tam Quốc', 4.5, '/game_icons/3q-goi-tuong-di.webp', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode 3Q Gọi Tướng Đi mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN GIẢI TRÍ 568E phát hành chính thức tại Việt Nam theo Giấy phép G1 số 219/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game 3Q Gọi Tướng Đi trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '219/QĐ-PTTH&TTĐT', '04/05/2026', '2026-05-04', '18+', 'Đang hoạt động', 'https://3qgoituongdi.vn/, https://3qgoituongdi.568play.vn', 'https://codemoi.net/games/3q-goi-tuong-di/', 'https://3qgoituongdi.vn/, https://3qgoituongdi.568play.vn', 'https://3qgoituongdi.vn/, https://3qgoituongdi.568play.vn', 'https://3qgoituongdi.vn/, https://3qgoituongdi.568play.vn', 'https://3qgoituongdi.vn/, https://3qgoituongdi.568play.vn', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
INSERT INTO games (id, name, slug, publisher, category, rating, icon_url, banner_url, description, instructions, platform, so_giay_phep, ngay_cap_phep, release_date, do_tuoi, trang_thai_gp, website_g1, link_codemoi, download_android, download_ios, download_pc, redeem_url, is_featured, is_hot, is_new, is_active)
VALUES ('thoi-khong-chi-mong', 'Thời Không Chi Mộng', 'thoi-khong-chi-mong', 'CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM', 'Game Mobile Hot', 4.5, '/game_icons/thoi-khong-chi-mong.webp', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'Trọn bộ Giftcode Thời Không Chi Mộng mới nhất 2026. Tựa game do CÔNG TY CỔ PHẦN TRUYỀN HÌNH TƯƠNG TÁC VIỆT NAM phát hành chính thức tại Việt Nam theo Giấy phép G1 số 108/QĐ-PTTH&TTĐT. Sao chép 1 chạm nhận ngay quà VIP tân thủ!', '1. Mở game Thời Không Chi Mộng trên thiết bị của bạn.
2. Bấm vào Avatar nhân vật hoặc biểu tượng Cài Đặt (Bánh Răng).
3. Chọn mục ''Giftcode'' hoặc ''Đổi Quà''.
4. Dán mã code vừa sao chép và bấm ''Xác Nhận'' để nhận quà qua Hòm Thư.', 'Android, iOS, PC', '108/QĐ-PTTH&TTĐT', '08/04/2025', '2025-04-08', '18+', 'Đang hoạt động', 'www.vplay.vn.', 'https://codemoi.net/games/thoi-khong-chi-mong/', 'www.vplay.vn.', 'www.vplay.vn.', 'www.vplay.vn.', 'www.vplay.vn.', 0, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  publisher=excluded.publisher, 
  category=excluded.category, 
  description=excluded.description,
  instructions=excluded.instructions,
  so_giay_phep=excluded.so_giay_phep,
  ngay_cap_phep=excluded.ngay_cap_phep,
  release_date=excluded.release_date,
  icon_url=excluded.icon_url,
  redeem_url=excluded.redeem_url;
