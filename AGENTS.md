# AGENTS.md — Quy Tắc Bắt Buộc Dành Cho Các Tác Nhân (Agents & Subagents)

### 🧠 1. BẮT BUỘC ĐỌC HỆ THỐNG GHI NHỚ TRƯỚC KHI SỬA ĐỔI
Trước mỗi lần chỉnh sửa bất kỳ file nào trong dự án, tác nhân **BẮT BUỘC** phải đọc các file sau:
1. [`PROJECT_MEMORY.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/PROJECT_MEMORY.md): Kiến trúc toàn dự án, tech stack, quy tắc kho hàng, cơ chế đồng bộ 1 - 1, state management.
2. [`CHANGELOG.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/CHANGELOG.md): Lịch sử thay đổi, nguyên nhân gốc rễ, giải pháp đã áp dụng và giải pháp đã thất bại.
3. [`KNOWN_ISSUES.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/KNOWN_ISSUES.md): Danh mục lỗi đã biết, các bẫy cần tránh (Failed Attempts), pre-flight và post-flight checklists.
4. [`GIT_WORKFLOW.md`](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/GIT_WORKFLOW.md): Quy trình quản lý phiên bản Git 6 bước chuyên nghiệp.

### 🌿 2. QUY TRÌNH QUẢN LÝ PHIÊN BẢN GIT CHUYÊN NGHIỆP
- **Trước khi sửa**: Chạy `git status`, xem lịch sử commit và tài liệu ghi nhớ. Lưu checkpoint ổn định trước thay đổi lớn.
- **Trong khi sửa**: Sửa từng lỗi một, thu hẹp phạm vi thay đổi. Không viết lại module không liên quan. Chạy kiểm thử hồi quy sau mỗi thay đổi. Nếu phát sinh lỗi mới, khôi phục ngay, không chồng bản sửa chưa xác minh.
- **Sau khi sửa**: Chỉ commit khi vượt qua mọi bài kiểm tra. Đặt commit message chuẩn mực (ví dụ: `fix: ...`, `feat: ...`). Cập nhật tài liệu ghi nhớ. Phân biệt rõ bản ổn định với bản thử nghiệm.
- **Khôi phục an toàn (Zero Destructive Commands)**: Ưu tiên `git revert`. Với thay đổi chưa commit: kiểm tra diff và chỉ khôi phục đúng phần cần thiết. **TUYỆT ĐỐI KHÔNG** dùng `git reset --hard`, `git clean -fd` hoặc lệnh xóa lịch sử khi chưa được người dùng cho phép.
- **Báo cáo chuẩn mực**: Sau mỗi nhiệm vụ, báo cáo đủ: (1) Nguyên nhân lỗi, (2) File đã sửa, (3) Kiểm thử đã chạy, (4) Kết quả, (5) Commit ID, (6) Cách khôi phục nếu cần.

### 🚫 3. KHÔNG LẶP LẠI THẤT BẠI
- Tuyệt đối **KHÔNG LẶP LẠI** cách sửa đã ghi nhận thất bại trong `KNOWN_ISSUES.md` nếu chưa có bằng chứng mới rõ ràng.

### 🔍 4. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ & PHẠM VI ẢNH HƯỞNG
- Trước khi sửa: Luôn phân tích rõ nguyên nhân gốc rễ (Root Cause) và phạm vi ảnh hưởng (Impact Scope).
- Nếu chưa xác định được nguyên nhân: Phải điều tra, in log hoặc viết script kiểm tra trước. **KHÔNG ĐƯỢC SỬA MÒ**, đoán mò hoặc tự ý viết lại các phần không liên quan.

### ✅ 5. KIỂM THỬ HỒI QUY & CẬP NHẬT TÀI LIỆU
- Sau khi sửa xong: Chạy kiểm thử hồi quy, xác nhận các chức năng liên quan vẫn hoạt động bình thường.
- Cập nhật tài liệu: Ghi nhận đầy đủ vào `CHANGELOG.md` và `KNOWN_ISSUES.md`.

### 🚀 6. TỰ ĐỘNG TRIỂN KHAI KHI KIỂM THỬ THÀNH CÔNG 100% (MỆNH LỆNH CHỦ SỞ HỮU)
- Từ nay về sau, bất cứ khi nào tác nhân kiểm thử và build báo thành công 100%: **BẮT BUỘC TỰ ĐỘNG** chạy `npm run deploy:all` (triển khai đồng thời Web Khách `web-code-game` và Web Quản trị `admin-code-game-shop`) và `git push origin main` (đồng bộ GitHub), sau đó báo cáo kết quả và URL môi trường trực tiếp cho người dùng mà không cần dừng lại hỏi trước.

### 🧹 7. NGUYÊN TẮC TỰ ĐỘNG XÓA SẢN PHẨM TEST (ZERO TEST ARTIFACTS ON PRODUCTION)
- Tất cả sản phẩm, mã code hay dữ liệu test do tác nhân/hệ thống sinh ra trong khi kiểm thử **BẮT BUỘC** phải tự động xóa sạch sau khi kiểm thử xong (sử dụng khối `finally` hoặc lệnh dọn dẹp chuyên dụng).
- Tuyệt đối không giữ lại hay để hiển thị bất kỳ sản phẩm test nào trên web thực tế.
- Chỉ những sản phẩm thực tế do người dùng nhập vào kho mới được công nhận, lưu trữ và ghi nhận trạng thái còn hàng.

### 🔑 8. NGUYÊN TẮC TỰ ĐỘNG ĐỒNG BỘ QUYỀN API MỚI VÀO MỤC QUẢN LÝ API (AUTO-REGISTER NEW API PERMISSIONS)
- Bất cứ khi nào trong tương lai tác nhân phát triển, mở thêm hoặc cấu hình bất kỳ quyền/endpoint API mới nào trên website:
  1. **BẮT BUỘC TỰ ĐỘNG** bổ sung quyền đó vào danh mục `ALL_API_SCOPES` trong `src/admin/modules/ApiKeysModule.tsx`.
  2. Cập nhật hàm phân giải quyền `hasScope` trong `functions/services/mission_service.ts`.
  3. Cập nhật Modal "Set Quyền Cho Khóa API" và Modal "Tạo Khóa API Mới" để Quản trị viên có thể dùng 1 mã API cấu hình và gán quyền mới đó ngay lập tức.
  4. Cập nhật bảng tra cứu cấp quyền và tài liệu mẫu cURL/JS tương ứng.

