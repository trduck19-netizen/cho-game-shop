# GIT_WORKFLOW.md — Quy Trình Quản Lý Phiên Bản Git Chuyên Nghiệp

Quy trình quản lý mã nguồn Git chuẩn mực bắt buộc áp dụng cho toàn bộ dự án **Web Code Game & Shop**. Mọi nhà phát triển và AI Agent phải tuân thủ nghiêm ngặt từng bước dưới đây.

---

## 📌 1. THIẾT LẬP VÀ BẢO VỆ MÃ NGUỒN (GIT SETUP & PROTECTION)
- **Kho lưu trữ**: Dự án đã được khởi tạo Git với nhánh chính `main`, liên kết với Remote `origin` (`https://github.com/synqpe-jpg/web-code-game.git`).
- **Bảo mật `.gitignore`**:
  - Tuyệt đối không commit các file chứa bí mật: `.env`, `.env.*`, khóa bảo mật `*.pem`, `*.key`, chứng chỉ, tokens.
  - Loại trừ toàn bộ thư mục dependencies (`node_modules/`), thư mục build (`dist/`, `.wrangler/`), thư mục tạm (`scratch/`, `*.tmp`, `*.bak`) và logs.
- **Bảo toàn lịch sử**: Tuyệt đối không xóa hoặc ghi đè lịch sử Git hiện có (`no forced push`, `no rebase rewrite on shared branch`).

---

## 🔍 2. QUY TẮC TRƯỚC KHI SỬA CODE (PRE-MODIFICATION)
1. **Kiểm tra trạng thái dự án**:
   - Chạy `git status` để xem các file đang thay đổi hoặc untracked.
   - Xem `git log -n 5 --oneline` để nắm các commit gần nhất.
   - Đọc kỹ [**`PROJECT_MEMORY.md`**](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/PROJECT_MEMORY.md), [**`CHANGELOG.md`**](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/CHANGELOG.md), [**`KNOWN_ISSUES.md`**](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/KNOWN_ISSUES.md).
2. **Xác định nguyên nhân gốc rễ trước khi sửa**:
   - Chỉ bắt đầu chỉnh sửa khi đã hiểu rõ trạng thái hiện tại và xác định được chính xác nguyên nhân gây lỗi.
   - Nếu chưa rõ: In log, tạo script kiểm tra nhỏ, thu thập dữ liệu; không được sửa mò.
3. **Lưu trạng thái ổn định (Checkpoint)**:
   - Trước mỗi thay đổi lớn, tạo commit lưu trạng thái ổn định hiện tại.
   - **Tuyệt đối không commit code đang lỗi hoặc chưa kiểm thử với nhãn ổn định.**

---

## ⚙️ 3. QUY TẮC TRONG KHI SỬA CODE (IN-FLIGHT MODIFICATION)
1. **Sửa từng lỗi một (Atomic Edits)**:
   - Giới hạn phạm vi thay đổi trong đúng component/hàm liên quan.
   - Tuyệt đối không tự ý viết lại các module không liên quan.
2. **Kiểm tra liên tục (Continuous Verification)**:
   - Sau mỗi thay đổi, chạy kiểm tra biên dịch (`npm run build`), kiểm tra TypeScript và kiểm thử hồi quy phù hợp.
3. **Xử lý khi phát sinh lỗi mới**:
   - Nếu phát sinh lỗi mới, dừng lại để phân tích nguyên nhân.
   - Khôi phục thay đổi gây lỗi ngay khi cần thiết; **không tiếp tục chồng các bản sửa chưa được xác minh lên nhau.**

---

## 📦 4. QUY TẮC SAU KHI SỬA CODE (POST-MODIFICATION & COMMIT)
1. **Điều kiện commit**:
   - Chỉ commit khi tất cả các kiểm tra cần thiết đều đạt (Build thành công 100%, không lỗi runtime, không vi phạm quy tắc kho hàng và marketing).
2. **Chuẩn đặt thông điệp commit (Conventional Commits)**:
   - Thông điệp phải rõ ràng, phản ánh chính xác nội dung thay đổi.
   - Cú pháp mẫu:
     - `fix: resolve video playback freeze`
     - `fix(orders): remove invalid sku column in D1 purchase transaction`
     - `feat(crawler): add smart searchable game selector with Vietnamese diacritic support`
     - `docs: update project memory and changelog`
3. **Cập nhật tài liệu ghi nhớ**:
   - Ghi lại thay đổi vào [**`CHANGELOG.md`**](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/CHANGELOG.md).
   - Nếu phát hiện bẫy mới, cập nhật ngay vào [**`KNOWN_ISSUES.md`**](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/KNOWN_ISSUES.md).
   - Phân biệt rõ phiên bản ổn định (Stable) với phiên bản đang thử nghiệm (Experimental).
4. **Tự động triển khai lên Web & đồng bộ GitHub khi kiểm thử đạt 100% (Mệnh lệnh từ Chủ sở hữu)**:
   - Khi chạy kiểm thử / build báo thành công 100% và đã tạo commit lưu trạng thái ổn định:
     1. Tự động chạy `cmd.exe /c npm run deploy:all` để xuất bản ngay lập tức lên Cloudflare Pages Web Khách (`web-code-game`) và Web Quản trị (`admin-code-game-shop`).
     2. Tự động chạy `git push origin main` để đồng bộ toàn bộ lịch sử commit lên repository GitHub.
     3. Báo cáo kết quả và URL môi trường trực tiếp cho người dùng (không cần dừng lại hỏi trước).

---

## ⏪ 5. QUY TẮC KHÔI PHỤC AN TOÀN (RECOVERY & ROLLBACK)
1. **Cam kết không phá hủy (Zero Destructive Commands)**:
   - **TUYỆT ĐỐI KHÔNG** sử dụng `git reset --hard`, `git clean -fd`, hoặc các lệnh xóa lịch sử khi chưa kiểm tra và chưa được người dùng cho phép rõ ràng.
2. **Khôi phục commit đã chia sẻ**:
   - Ưu tiên sử dụng `git revert <commit-id>` để tạo một commit đảo ngược an toàn, bảo tồn toàn bộ lịch sử.
3. **Khôi phục thay đổi chưa commit trong working tree**:
   - Chạy `git diff <file>` để kiểm tra chi tiết các dòng đã sửa.
   - Chỉ khôi phục đúng file hoặc hunk cần thiết bằng `git restore <file>` hoặc phục hồi thủ công, không làm mất các thay đổi hợp lệ khác.

---

## 📋 6. TIÊU CHUẨN BÁO CÁO SAU MỖI NHIỆM VỤ (REPORTING STANDARD)
Sau mỗi nhiệm vụ hoặc lần sửa đổi, báo cáo cho người dùng đầy đủ 6 thông tin:
1. **Nguyên nhân lỗi (Root Cause)**: Phân tích chính xác tại sao lỗi xảy ra.
2. **File đã sửa (Modified Files)**: Danh sách file và vùng mã đã can thiệp.
3. **Kiểm thử đã chạy (Tests Executed)**: Lệnh kiểm tra build, lint, hoặc script đã chạy.
4. **Kết quả (Results)**: Trạng thái sau kiểm thử (ví dụ: Build 100% thành công, 486 trang prerender đạt chuẩn).
5. **Commit ID & Thông điệp**: Mã băm commit (Hash) và tiêu đề commit lưu trạng thái ổn định.
6. **Cách khôi phục (Rollback Method)**: Hướng dẫn lệnh cụ thể để hoàn tác nếu cần quay lại phiên bản trước.
