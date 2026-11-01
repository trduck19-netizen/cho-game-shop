# 📚 BỘ DỮ LIỆU 188 TỰA GAME ĐẦY ĐỦ CHUẨN HÓA (DÀNH CHO WEBSITE MỚI)

Tài liệu này chứa toàn bộ thông tin chi tiết, chuẩn hóa của 188 tựa game có bản quyền tại Việt Nam (đã loại bỏ 100% mã code ảo / tự suy diễn và mã VIP rác), sẵn sàng để bạn chuyển dữ liệu sang bất kỳ website hay CMS mới nào.

---

## 📁 Danh sách các file trong thư mục này:

1. **`01_danh_sach_188_game_day_du.json`**: 
   - File JSON chứa trọn bộ 188 tựa game với đầy đủ tất cả các trường: ID, Tên, Slug, Nhà phát hành, Giấy phép G1, Link tải (Android/iOS/PC), Link đổi thưởng (Redeem URL), Icon, Banner, Mô tả SEO, Hướng dẫn nhập code.
   - Trường `codes: []` sạch sẽ 100%, sẵn sàng nhận code thật.

2. **`02_danh_sach_188_game_excel_chuan.csv`**: 
   - File định dạng CSV mã hóa UTF-8 with BOM, mở trực tiếp bằng Microsoft Excel, Google Sheets, LibreOffice không bị lỗi font tiếng Việt.

3. **`03_danh_sach_game_theo_the_loai.json` & `03_danh_sach_game_theo_the_loai.md`**: 
   - Danh sách phân loại game theo từng chuyên mục/thể loại (Tam Quốc, Tiên Hiệp, IDLE, MOBA, Gacha...).

4. **`04_danh_sach_game_theo_nha_phat_hanh.json` & `04_danh_sach_game_theo_nha_phat_hanh.md`**: 
   - Danh sách phân loại theo các Nhà phát hành (VNG, Garena, Sohagame, Funtap, CMN, VTC Game...).

5. **`05_import_games_schema.sql`**: 
   - Lệnh SQL tạo bảng và INSERT toàn bộ 188 game vào MySQL, PostgreSQL, SQLite hoặc Cloudflare D1.

6. **`game_icons/`**: 
   - Thư mục chứa toàn bộ 188 file icon game chuẩn WebP tối ưu dung lượng.

---

## 🛠️ Hướng dẫn tích hợp vào Web mới:

### Cách 1: Nạp vào Node.js / Next.js / React
```javascript
const games = require('./01_danh_sach_188_game_day_du.json');
console.log('Tổng số game:', games.length);
```

### Cách 2: Nạp vào Database (Cloudflare D1 / MySQL / SQLite)
```bash
# Dành cho Cloudflare D1
npx wrangler d1 execute your-db-name --file=./05_import_games_schema.sql

# Dành cho SQLite
sqlite3 my_database.db < 05_import_games_schema.sql
```

### Cách 3: Nạp vào WordPress / Laravel / Strapi / Excel
- Dùng file **`02_danh_sach_188_game_excel_chuan.csv`** qua công cụ WP All Import hoặc phpMyAdmin / TablePlus.
