# PROJECT_RULES: Sàn Thương Mại Điện Tử Gaming (Chợ Game)

Các chỉ thị hoạt động bắt buộc trong suốt quá trình xây dựng và phát triển dự án tại `C:\4 Antigravity all\31 Chợ`:

### 🛡️ 1. NGUYÊN TẮC KHO HÀNG THẬT & TUYỆT ĐỐI KHÔNG DÙNG MÃ ẢO (ZERO TEST ARTIFACTS)
- Hàng thật trong kho = 0 thì tồn kho hiển thị = 0 ("Hết hàng").
- **TUYỆT ĐỐI KHÔNG** tự tiện sinh mã code giả lập, mã mẫu (dạng `HNK-VIP-...`, `TEST-...`, `GIFT-...`) nạp vào cơ sở dữ liệu.
- **CHỈ CÓ** Quản trị viên/Chủ sở hữu mới có quyền nhập mã thật vào kho. Mọi dữ liệu do AI tự chế đều bị coi là mã rác.
- Bất kỳ dữ liệu test nào sinh ra trong quá trình chạy kiểm thử tự động **PHẢI TỰ ĐỘNG XÓA SẠCH 100%** sau khi test xong trong khối `finally`.

### 🌿 2. QUY TRÌNH GIT WORKFLOW 6 BƯỚC & KHÔNG DÙNG LỆNH PHÁ HỦY
- **Trước khi sửa**: Chạy `git status`, xem log commit gần nhất, đọc `CHANGELOG.md` và `KNOWN_ISSUES.md`. Tạo commit lưu trạng thái ổn định trước thay đổi lớn.
- **Trong khi sửa**: Sửa từng lỗi một (Atomic edits), thu hẹp phạm vi thay đổi. Không tự ý viết lại các module không liên quan. Sau mỗi thay đổi chạy build/lint/test kiểm tra hồi quy. Nếu phát sinh lỗi mới, phân tích và khôi phục ngay, không chồng bản sửa chưa xác minh.
- **Sau khi sửa**: Chỉ commit khi vượt qua mọi bài kiểm tra. Đặt commit message rõ ràng (ví dụ: `fix: ...`, `feat: ...`). Cập nhật `CHANGELOG.md`, `KNOWN_ISSUES.md`. Phân biệt rõ bản ổn định với bản thử nghiệm.
- **Khôi phục an toàn (Zero Destructive Commands)**: Ưu tiên `git restore` hoặc `git revert`. Với thay đổi chưa commit: kiểm tra `git diff` và chỉ khôi phục đúng phần cần thiết. **TUYỆT ĐỐI CẤM** dùng `git reset --hard`, `git clean -fd` hoặc các lệnh xóa lịch sử khi chưa kiểm tra và chưa được người dùng cho phép rõ ràng.
- **Báo cáo chuẩn 6 phần**: Luôn báo cáo đủ 6 nội dung: (1) Nguyên nhân lỗi, (2) File đã sửa, (3) Kiểm thử đã chạy, (4) Kết quả, (5) Commit ID, (6) Cách khôi phục nếu cần.

### 🚀 3. TỰ ĐỘNG TRIỂN KHAI KHI BUILD THÀNH CÔNG 100% (MỆNH LỆNH BẮT BUỘC TỪ CHỦ SỞ HỮU)
- Bất cứ khi nào kiểm thử và build báo thành công 100%: AI Agent **BẮT BUỘC TỰ ĐỘNG** chạy:
  `cmd.exe /c npm run deploy:all` (triển khai đồng thời Web Khách `cho-game-shop` và Web Quản Trị `admin-cho-game-shop`) và `git push origin main` (đồng bộ GitHub nếu có remote), sau đó báo cáo kết quả và URL môi trường trực tiếp cho người dùng mà không cần dừng lại hỏi trước.

### ⚠️ 4. CÁC BẪY KỸ THUẬT CẦN TRÁNH (TRÁNH LẶP LẠI THẤT BẠI CŨ)
1. **Bẫy SQLite Integer (0/1 vs Boolean)**: SQLite D1 lưu boolean thành `0/1`. Không dùng `g.is_active !== false` (vì `0 !== false` ra `true`). Luôn dùng helper chuẩn hóa `isGwActive(g)`.
2. **Bẫy Tìm kiếm tiếng Việt**: Không dùng `toLowerCase().includes(q)` thuần túy vì không khớp tiếng Việt không dấu. Luôn dùng `smartVietnameseMatch` và ưu tiên tìm kiếm toàn diện khi có `searchQuery`, không để bộ lọc chip game chặn kết quả.
3. **Bẫy Vỡ ảnh & Không dùng /vite.svg**: Không bao giờ gán `target.src = '/vite.svg'` khi ảnh lỗi. Luôn fallback đa tầng: `.webp` -> `.jpg` -> Avatar gradient chữ cái đẹp mắt.
4. **Bẫy Lưu trữ D1**: Mọi thao tác nạp mã, thêm hàng phải lưu trực tiếp xuống bảng SQL Cloudflare D1 nguyên tử, không được chỉ lưu vào LocalStorage/JSON.
5. **Bẫy Anti-Hang Windows**: Chạy lệnh npm/wrangler qua `cmd.exe /c`, gắn cờ `--no-audit --no-fund`, tuyệt đối không gọi lệnh bật prompt UAC hoặc interactive.

### 🛑 5. PHẠM VI DỰ ÁN & BẢO VỆ CÁCH LY TUYỆT ĐỐI
- Dự án này **CHỈ LÀM VIỆC** với:
  * Pages Web Khách: `cho-game-shop` (https://cho-game-shop.pages.dev)
  * Pages Web Quản Trị: `admin-cho-game-shop` (https://admin-cho-game-shop.pages.dev)
  * Database D1: `cho-game-db`
  * KV Storage: `CHO_GAME_KV`
- **TUYỆT ĐỐI KHÔNG** can thiệp, không deploy đè, không sửa đổi hay xóa bất kỳ tài nguyên nào của dự án cũ (`web-code-game`, `admin-code-game-shop`, `codegame.store`, database `web-code-game-db` hay `codegamestore-db`).
