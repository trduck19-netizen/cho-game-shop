# PROJECT_RULES: Web Code Game Development & Guardrails

Các chỉ thị hoạt động bắt buộc trong suốt quá trình xây dựng và phát triển dự án:

### 🧠 1. HỆ THỐNG GHI NHỚ DÀI HẠN & QUY TRÌNH SỬA CODE (Long-Term Memory Protocol)
* **BẮT BUỘC ĐỌC TRƯỚC KHI SỬA**: Trước mỗi lần chỉnh sửa bất kỳ file mã nguồn nào, **BẮT BUỘC** phải đọc các file sau:
  - [`PROJECT_MEMORY.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/PROJECT_MEMORY.md): Kiến trúc, quy tắc kinh doanh, bản đồ dữ liệu.
  - [`CHANGELOG.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/CHANGELOG.md): Lịch sử thay đổi, nguyên nhân gốc rễ, giải pháp đã thử.
  - [`KNOWN_ISSUES.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/KNOWN_ISSUES.md): Danh mục lỗi, bẫy cần tránh (Failed Attempts), checklists.
  - [`GIT_WORKFLOW.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/GIT_WORKFLOW.md): Quy trình quản lý phiên bản Git 6 bước chuyên nghiệp.
* **KHÔNG LẶP LẠI THẤT BẠI**: Tuyệt đối không lặp lại bất kỳ cách sửa nào đã được ghi nhận thất bại trong `KNOWN_ISSUES.md` nếu chưa có bằng chứng mới rõ ràng.
* **PHÂN TÍCH TRƯỚC KHI LÀM**: Trước khi sửa, phân tích kỹ nguyên nhân gốc rễ (Root Cause) và phạm vi ảnh hưởng (Impact Scope).
* **THU THẬP THÔNG TIN KHI CHƯA RÕ**: Nếu chưa xác định được chính xác nguyên nhân, phải tiến hành kiểm tra, in log và thu thập thông tin trước. Nghiêm cấm sửa mò, đoán mò hoặc tự ý viết lại các phần không liên quan.
* **KIỂM THỬ HỒI QUY & CẬP NHẬT TÀI LIỆU**: Sau khi sửa, chạy kiểm thử hồi quy, xác nhận toàn bộ các chức năng liên quan vẫn hoạt động tốt, sau đó cập nhật ngay `CHANGELOG.md` và `KNOWN_ISSUES.md`.

### 🌿 2. QUY TRÌNH QUẢN LÝ PHIÊN BẢN GIT CHUYÊN NGHIỆP (Git Version Control Protocol)
* **Trước khi sửa**: Chạy `git status`, xem log commit gần nhất, đọc tài liệu ghi nhớ. Tạo commit lưu trạng thái ổn định trước thay đổi lớn. Không commit code đang lỗi hoặc chưa kiểm thử với nhãn ổn định.
* **Trong khi sửa**: Sửa từng lỗi một, thu hẹp phạm vi thay đổi. Không tự ý viết lại các module không liên quan. Sau mỗi thay đổi chạy build/lint/test kiểm tra hồi quy. Nếu phát sinh lỗi mới, phân tích và khôi phục ngay, không chồng bản sửa chưa xác minh.
* **Sau khi sửa**: Chỉ commit khi vượt qua mọi bài kiểm tra. Đặt commit message rõ ràng (ví dụ: `fix: ...`, `feat: ...`). Cập nhật `CHANGELOG.md`, `KNOWN_ISSUES.md`. Phân biệt rõ bản ổn định với bản thử nghiệm.
* **Tự động triển khai lên Web & GitHub (Mệnh lệnh bắt buộc từ Chủ sở hữu)**: Từ nay về sau, bất cứ khi nào kiểm thử và build báo thành công 100%, AI Agent **BẮT BUỘC TỰ ĐỘNG** chạy `npm run deploy:all` (triển khai đồng thời Web Khách `web-code-game` và Web Quản trị `admin-code-game-shop`) và `git push origin main` (đồng bộ GitHub), sau đó báo cáo kết quả và URL môi trường trực tiếp cho người dùng mà không cần dừng lại hỏi trước.
* **Khôi phục an toàn (Zero Destructive Commands)**:
  - Ưu tiên `git revert` cho commit đã chia sẻ.
  - Với thay đổi chưa commit: Kiểm tra `git diff` và chỉ khôi phục đúng phần cần thiết.
  - **TUYỆT ĐỐI CẤM** dùng `git reset --hard`, `git clean -fd` hoặc các lệnh xóa lịch sử khi chưa kiểm tra và chưa được người dùng cho phép rõ ràng.
* **Báo cáo chuẩn mực sau mỗi nhiệm vụ**: Luôn báo cáo đủ 6 nội dung: (1) Nguyên nhân lỗi, (2) File đã sửa, (3) Kiểm thử đã chạy, (4) Kết quả, (5) Commit ID, (6) Cách khôi phục nếu cần.

### 🛑 3. BẢO TỒN MÃ NGUỒN VÀ TÍNH NĂNG (Code Preservation Guard)
* Không được tự ý xóa, thay thế hoặc viết lại các tính năng, component, hàm hay logic đang chạy bình thường nếu người dùng không yêu cầu.
* Mọi tính năng mới phải được phát triển theo hướng bổ sung (additive), bảo đảm backward compatibility.
* Giữ nguyên vẹn toàn bộ chú thích, comments, cấu hình Cloudflare Pages và KV bindings.

### ⚡ 4. TỐI ƯU HIỆU SUẤT & CHỐNG LẶP VÔ HẠN (Anti-Loop & Fast Execution)
* Nghiêm cấm chạy các lệnh vòng lặp vô hạn (polling status / sleep loop).
* Khi gặp lỗi, phân tích nguyên nhân gốc rễ và sửa chính xác, không chạy lại lệnh hỏng quá 2 lần.
* Thực hiện các thao tác dứt khoát, chính xác theo vùng thay đổi (surgical edits).

### 🎨 5. CHUẨN THIẾT KẾ UI/UX PRO MAX
* Tuân thủ triệt để các tiêu chuẩn thiết kế chuyên nghiệp.
* Không "AI Generic Slop": Dùng SVG icons (Lucide), không emoji trôi nổi; độ tương phản contrast >= 4.5:1; bảng màu có chiều sâu; responsive 375px đến 1440px+.

### 📢 6. BÁO CÁO KẾT QUẢ & TIẾP NHẬN CÔNG VIỆC MỚI
* Khi hoàn thành công việc: Luôn lập báo cáo kết quả rõ ràng, súc tích (đảm bảo độ dài không quá 4.000 từ).
* Tích hợp và tự động gửi thông báo qua Telegram khi được cấu hình `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`.
* Luôn sẵn sàng tiếp nhận và triển khai ngay các nhiệm vụ mới tiếp theo của người dùng.

### 🔐 7. BẢO MẬT & XÁC THỰC DUY NHẤT CHỦ SỞ HỮU (Owner-Only Access Guard)
* **Quyền hạn duy nhất**: Chỉ duy nhất tài khoản Telegram của bạn (ID: `7791142901`) mới có quyền tương tác, nhận báo cáo, điều khiển và giao việc cho trợ lý/bot.
* **Chống giả mạo & Xâm nhập**: Mọi yêu cầu từ bất kỳ tài khoản/Chat ID nào khác đều bị chặn và từ chối tuyệt đối (Strict ID Whitelist).
* **Bảo mật mã nguồn & Token**: Toàn bộ Bot Token và API Keys được lưu trữ an toàn trong `.env`, không bao giờ để lộ công khai ra bên ngoài.

### 📌 8. LÀM VIỆC CỐ ĐỊNH TRÊN 1 PHIÊN CHAT DUY NHẤT (Single Session Continuity)
* **Khóa phiên làm việc**: Mọi yêu cầu và nhiệm vụ giao qua Telegram đều được định tuyến trực tiếp vào đúng phiên chat hiện tại (`e4ba7ced-492a-4203-bd9b-e0bbf53eff95`) bằng lệnh `send-message`.
* **Không phân mảnh ngữ cảnh**: Tuyệt đối không tự ý mở phiên chat mới (`new-conversation`) khi người dùng đang giao việc trong tiến trình dự án.
* **Bảo toàn lịch sử**: Giữ trọn vẹn context làm việc, biến môi trường và tiến độ dự án xuyên suốt một phiên làm việc.
