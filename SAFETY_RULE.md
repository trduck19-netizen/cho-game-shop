# QUY TẮC CÁCH LY TUYỆT ĐỐI (PROJECT ISOLATION RULE)

Dự án này là: SÀN THƯƠNG MẠI ĐIỆN TỬ GAMING (CHỢ GAME).
Thư mục gốc: C:\4 Antigravity all\31 Chợ

🛑 MỆNH LỆNH BẤT DI BẤT DỊCH TỪ CHỦ SỞ HỮU:
1. Dự án này hoạt động HOÀN TOÀN ĐỘC LẬP 100% với:
   - "C:\4 Antigravity all\13 web code game" (Domain: codegame.shop, Cloudflare Pages: web-code-game, admin-code-game-shop, D1: web-code-game-db).
   - "C:\4 Antigravity all\3 Codegame store" (Domain: codegame.store).
2. TUYỆT ĐỐI KHÔNG ĐƯỢC:
   - Không chạy lệnh deploy hay sửa file trỏ vào web-code-game hay admin-code-game-shop.
   - Không query hay can thiệp vào cơ sở dữ liệu web-code-game-db hay codegamestore-db.
3. Dự án này CHỈ LÀM VIỆC VỚI:
   - Cloudflare Pages Projects: cho-game-shop và admin-cho-game-shop
   - Database D1: cho-game-db
   - KV: CHO_GAME_KV
