# HƯỚNG DẪN KHÓA & GẮN KẾT PHIÊN CHAT ANTIGRAVITY TỪ TELEGRAM

Tài liệu này hướng dẫn cách cấu hình và điều khiển để mọi thông báo và nhiệm vụ mới gửi từ Telegram **chỉ làm việc trên đúng 1 phiên chat hiện tại**, không bị mở các phiên chat mới làm phân mảnh ngữ cảnh.

---

## 1. NGUYÊN LÝ HOẠT ĐỘNG

- **Trước đây:** Mỗi khi bạn nhắn tin yêu cầu qua Telegram, bridge tự động gọi lệnh `new-conversation` của Antigravity CLI. Điều này khiến Antigravity luôn khởi tạo một phiên chat mới độc lập.
- **Hiện tại:** Telegram Bridge đã được nâng cấp tính năng **Gắn kết phiên cố định (`pinned_conversation_id`)**. 
  - Khi đã gắn phiên, mọi tin nhắn bạn gửi từ Telegram (nhắn văn bản thường hoặc dùng `/task`) sẽ được chuyển tiếp trực tiếp vào phiên này thông qua lệnh:
    ```bash
    agentapi.bat send-message <pinned_conversation_id> <nội_dung>
    ```
  - Antigravity sẽ tiếp tục thực thi nhiệm vụ **ngay trong cùng cửa sổ chat hiện tại**, lưu giữ toàn bộ lịch sử code, cấu hình và ngữ cảnh trước đó.

---

## 2. THÔNG SỐ CẤU HÌNH HIỆN TẠI

Hệ thống đã được thiết lập sẵn trong tệp `C:\43. telegram\config.json`:

| Thông số | Giá trị đã cấu hình | Ghi chú |
| :--- | :--- | :--- |
| **Pinned Conversation ID** | `e4ba7ced-492a-4203-bd9b-e0bbf53eff95` | **Phiên chat hiện tại bạn đang làm việc** |
| **Target Project ID** | `d1f556e8-1565-47d7-98cd-d8d18acf9879` | Dự án "13 web code game" |
| **Target Workspace** | `c:\4 Antigravity all\13 web code game` | Thư mục code chính |
| **Owner Chat ID** | `7791142901` | Khóa bảo mật chỉ tài khoản này được giao việc |
| **Max Words Per Report** | `4000` | Giới hạn báo cáo không quá 4.000 từ |

---

## 3. CÁCH GIAO VIỆC TỪ TELEGRAM (ĐẢM BẢO CHỈ CHẠY TRÊN PHIÊN NÀY)

### Cách 1: Nhắn tin trực tiếp (Đơn giản nhất - Khuyên dùng)
Bạn chỉ cần mở Telegram bot và nhắn nội dung yêu cầu như nói chuyện bình thường:
```text
Sửa giúp tôi lỗi hiển thị số lượng kho còn lại
```
hoặc
```text
Kiểm tra lại toàn bộ nút sao chép giftcode trên mobile
```
👉 **Kết quả:** Bot sẽ tự động nhận diện và gửi lệnh thẳng vào phiên chat `e4ba7ced-492a-4203-bd9b-e0bbf53eff95`. Không mở thêm bất kỳ phiên mới nào!

---

### Cách 2: Các câu lệnh quản lý phiên chat trên Telegram

| Câu lệnh | Chức năng |
| :--- | :--- |
| `/session` | Kiểm tra ID phiên chat hiện đang được gắn kết. |
| `/bind` | Tự động quét và gắn kết với phiên chat gần nhất (hoặc phiên hiện tại). |
| `/bind <conversation_id>` | Gắn cố định vào một phiên chat cụ thể bạn chỉ định. |
| `/unbind` | Hủy gắn kết phiên (quay lại chế độ tạo phiên mới mỗi lần giao việc). |
| `/new <nội dung>` | **Ép tạo phiên chat mới** cho riêng tác vụ này (kể cả khi đang bật ghim). |
| `/msg <id> <nội dung>` | Gửi tin nhắn vào một phiên chat bất kỳ. |
| `/status` | Kiểm tra kết nối Antigravity Language Server, CSRF token, Project ID. |
| `/help` | Xem danh sách đầy đủ tất cả các lệnh điều khiển. |

---

## 4. QUY TRÌNH THÔNG BÁO & BÁO CÁO KHI HOÀN THÀNH

Khi Antigravity hoàn thành tác vụ trong phiên chat này, báo cáo sẽ được gửi về Telegram qua 2 tầng tự động:

1. **Tầng Hook tự động (`C:\43. telegram\notify_telegram.py`):**
   - Được kích hoạt tự động bởi Antigravity Lifecycle Hook mỗi khi hoàn tất một lượt trả lời (`Stop` event).
   - Tự động trích xuất phản hồi tóm tắt từ transcript của phiên chat và gửi đến Telegram.
   - Tự động kiểm soát độ dài dưới 4.000 từ và tự chia đoạn nếu tin nhắn dài.

2. **Tầng Script thông báo trực tiếp (`scripts/send_telegram_report.cjs`):**
   - Dành cho các tác vụ build, test, deploy đặc biệt cần gửi báo cáo tiến độ chi tiết tức thì.

---

## 5. HƯỚNG DẪN KHỞI CHẠY TELEGRAM BRIDGE

Mỗi khi mở máy tính để làm việc, bạn chỉ cần chạy:
- Nhấp đúp chuột vào file: `C:\43. telegram\start_bot.bat`
- Hoặc mở PowerShell/CMD và gõ:
  ```powershell
  python "C:\43. telegram\telegram_bridge.py"
  ```

> [!NOTE]
> Tiến trình chạy ngầm rất nhẹ (CPU ~0%, RAM ~25MB) và đã tích hợp cơ chế tự động dừng tiến trình cũ để tránh xung đột cổng `getUpdates` của Telegram.

---

## 6. XỬ LÝ SỰ CỐ NHANH

- **Hỏi: Nếu tôi đổi sang phiên chat mới khác thì làm thế nào?**
  - **Trả lời:** Trên Telegram, bạn chỉ cần gõ `/bind` để bot tự động nhận diện và gắn kết sang phiên mới nhất. Hoặc gõ `/bind <id_mới>`.
- **Hỏi: Nếu bot báo lỗi phiên chat không tồn tại?**
  - **Trả lời:** Gõ `/session` để kiểm tra. Nếu phiên cũ đã bị xóa, gõ `/bind` để gắn lại phiên hiện tại.
