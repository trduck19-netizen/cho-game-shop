---
name: game-code-crawler-sync
description: >-
  Quét và cập nhật toàn bộ game có giấy phép G1/G234 (ABEI - Cục PTTH&TTĐT), tự động lọc bỏ các game và mã giftcode trùng lặp, đồng bộ icon chính xác, thu thập giftcode mới nhất, và đồng bộ dữ liệu vào web codegame.shop. Kích hoạt skill này khi người dùng yêu cầu: quét/cập nhật giấy phép game, lọc game trùng lặp, cập nhật icon chuẩn, quét giftcode mới hoặc đồng bộ dữ liệu web.
---

# Game, Giftcode & License Crawler & Sync Engine (codegame.shop)

Skill chuyên dụng cho nền tảng **CodeGame Shop (`codegame.shop`)** giúp tự động hóa các nhiệm vụ cốt lõi:
1. **Lọc trùng lặp game & Giftcode**: Tự động phát hiện các tựa game bị nhân bản hoặc có slug trùng, chỉ giữ lại 1 bản ghi chuẩn duy nhất và gộp toàn bộ giftcode không trùng lặp sang slug chuẩn.
2. **Quét & Đối soát giấy phép G1/G234 từ ABEI**: Tra cứu trực tiếp từ Cổng thông tin Cục Phát thanh, Truyền hình và Thông tin điện tử (`https://giayphep.abei.gov.vn/g1` và `https://giayphep.abei.gov.vn/g`), cập nhật số quyết định phê duyệt (`QĐ-PTTH&TTĐT`, `QĐ-BTTTT`, `GXN-PTTH&TTĐT`), ngày cấp phép, nhà phát hành, độ tuổi.
3. **Đồng bộ icon game chuẩn**: Kiểm tra và gắn đường dẫn ảnh icon chuẩn định dạng WebP từ `/game_icons/<slug>.webp` hoặc nguồn ảnh quét.
4. **Thu thập giftcode đa nguồn**: Crawl giftcode mới từ Sforum, Mọt Game, GameK, Thế Giới Di Động, CodeMoi, Yar.gg, Fanpage NPH.
5. **Đồng bộ hóa dữ liệu & Triển khai Web**: Cập nhật JSON master, D1 database, tái tạo sitemap XML, Prerender HTML tĩnh và Deploy Cloudflare Pages.

---

## Cấu trúc thư mục của Skill

- `SKILL.md`: Tài liệu hướng dẫn quy trình và các lệnh kích hoạt.
- `scripts/sync_games_licenses_icons.cjs`: **Script toàn diện**: Lọc game trùng lặp, cập nhật giấy phép ABEI G1/G234, đồng bộ icon chuẩn.
- `scripts/crawl-game-codes.cjs`: Quét giftcode từ các nguồn tin game uy tín.
- `scripts/add-custom-game-code.cjs`: Công cụ thêm nhanh game và code theo yêu cầu người dùng.
- `scripts/sync-to-database.cjs`: Đồng bộ dữ liệu JSON vào Cloudflare D1.

---

## Hướng dẫn quy trình thực hiện (Workflows)

### Quy trình 1: Lọc trùng game, Cập nhật giấy phép ABEI & Chuẩn hóa icon
Khi người dùng yêu cầu: *"Lọc game trùng nhau", "Cập nhật giấy phép chính xác từ abei.gov.vn", "Chuẩn hóa icon game"*:

1. **Chạy script quét & đồng bộ toàn diện**:
   ```bash
   node scripts/sync_games_licenses_icons.cjs
   ```
2. **Cơ chế hoạt động**:
   - Đối chiếu tên game và các biến thể slug (vd: `pirate-legends` -> `huyen-thoai-hai-tac`).
   - Loại bỏ game trùng, chuyển toàn bộ giftcode sang game chuẩn, khử các giftcode trùng mã.
   - Gửi yêu cầu tìm kiếm tới API Cục PTTH&TTĐT (`https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotPaging`).
   - Ghi đè số quyết định cấp phép thật vào `license_info`, `license_number`, `license_date`, `publisher`.
   - Cập nhật đồng bộ các file `public/data/games188.json`, `src/data/games188.json`, `public/data/crawled_codes_188.json`, `src/data/crawled_codes_188.json`.

---

### Quy trình 2: Quét & Thu thập Giftcode mới nhất từ các nguồn
Khi người dùng yêu cầu: *"Quét code mới cho các game", "Tìm giftcode mới nhất", "Crawl code từ mạng"*:

1. **Chạy script quét code**:
   ```bash
   node scripts/crawl-game-codes.cjs
   ```
2. **Khử trùng lặp & Chuẩn hóa**: Script tự động loại bỏ code trùng, viết hoa mã code, điền phần thưởng (`rewards`), ngày hết hạn (`expiresAt`).

---

### Quy trình 3: Đồng bộ dữ liệu lên Cloudflare D1 & Triển khai Web
Sau bất kỳ thao tác cập nhật nào:

1. **Đồng bộ D1 database**:
   ```bash
   node scripts/push_to_kv_sync.cjs
   ```
2. **Build & Prerender 100% trang HTML tĩnh**:
   ```bash
   npm run build
   ```
3. **Deploy lên Cloudflare Pages**:
   ```bash
   npm run deploy:all
   ```
