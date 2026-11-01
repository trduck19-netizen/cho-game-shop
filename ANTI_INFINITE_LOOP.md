# QUY CHUẨN CHỐNG TASK LẶP LẠI VÔ HẠN & TỐI ƯU HÓA TIẾN TRÌNH
*(ANTI-INFINITE-LOOP & EXECUTION EFFICIENCY POLICY)*

Tài liệu này là **chỉ thị bắt buộc** áp dụng cho mọi AI Assistant, Subagent và Developer khi làm việc trên dự án này nhằm loại bỏ triệt để tình trạng lặp vô hạn, nghẽn tác vụ hoặc tiêu tốn tài nguyên vô ích.

---

## 🛑 1. NGUYÊN TẮC CẤM VÒNG LẶP POLLING & CHỜ ĐỢI
1. **Tuyệt đối cấm Polling bằng lệnh**:
   - Nghiêm cấm chạy vòng lặp lệnh PowerShell / Bash (`while`, `for`, `sleep`, `Start-Sleep`) để kiểm tra trạng thái của server, build, hoặc tiến trình nền.
   - Không được liên tục gọi lệnh kiểm tra trạng thái (`manage_task action='status'`) trong một vòng lặp. Hệ thống Antigravity hoạt động theo cơ chế **Reactive Wakeup** — sẽ tự động đánh thức và gửi thông báo khi task nền hoàn tất.
2. **Không tạo Timer / Cron Schedule dư thừa**:
   - Chỉ dùng scheduler khi người dùng yêu cầu hẹn giờ cụ thể. Tuyệt đối không tự ý đặt cron/timer để kiểm tra định kỳ các lệnh thông thường.

---

## ⚡ 2. CƠ CHẾ THỰC THI ĐỒNG BỘ ĐƠN LẦN (SINGLE RUN & FAIL-FAST)
1. **Tối ưu hóa thời gian chờ (WaitMsBeforeAsync)**:
   - Với mọi lệnh CLI thông thường (như `git`, `npm run build`, `wrangler deploy`, `Get-ChildItem`), đặt `WaitMsBeforeAsync: 10000` (10 giây) để hoàn tất đồng bộ ngay trong 1 bước, tránh đẩy lệnh vào background task làm gián đoạn luồng làm việc.
2. **Chính sách Thất bại là Đổi hướng (Fail-Fast & Root-Cause)**:
   - Nếu 1 lệnh hoặc tác vụ bị lỗi hoặc timeout: **ĐỌC LOG VÀ PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ**.
   - **CẤM** chạy lại cùng một câu lệnh lỗi quá 1 lần nếu không có sự điều chỉnh mã nguồn hoặc tham số.
   - Nếu tác vụ không thể hoàn thành tự động, thông báo rõ ràng cho người dùng nguyên nhân thay vì lặp lại việc thử sai.

---

## 🔒 3. BẢO TỒN MÃ NGUỒN (ZERO REDUNDANT REFACTOR)
1. **Không lặp lại việc sửa code đã hoạt động**:
   - Khi một tính năng hoặc component đã build thành công và hoạt động đúng, không được tự ý sửa lại, định dạng lại hay thay đổi logic.
2. **Chỉnh sửa cục bộ chính xác (Surgical Edits)**:
   - Chỉ sửa đúng dòng/khối cần thiết. Không rewrite toàn bộ file dẫn đến nguy cơ mất code hoặc tạo vòng lặp sửa lỗi liên hoàn.

---

## 🎯 4. HOÀN THÀNH LƯỢT LÀM VIỆC DỨT KHOÁT (DECISIVE TURN COMPLETION)
1. Sau khi triển khai hoặc thực hiện xong yêu cầu của người dùng, kiểm tra nhanh bản build và **BÁO CÁO KẾT QUẢ NGAY**.
2. Không tự ý sinh ra các câu lệnh kiểm tra vô tận sau khi công việc chính đã thành công.

---

### Bảng tóm tắt hành vi:

| Hành vi SAI (CẤM) | Hành vi ĐÚNG (BẮT BUỘC) |
|---|---|
| Chạy `sleep` lặp đi lặp lại để đợi kết quả | Để hệ thống tự động thông báo khi tác vụ hoàn thành |
| Thử lại cùng 1 lệnh lỗi 3-4 lần liên tục | Phân tích log lỗi ngay từ lần đầu và sửa trực tiếp |
| Đẩy lệnh ngắn vào background task | Đặt `WaitMsBeforeAsync=10000` để chạy đồng bộ nhận kết quả ngay |
| Tự ý refactor lại code đã chạy ngon lành | Giữ nguyên vẹn tính năng cũ, chỉ thêm tính năng mới khi được yêu cầu |
