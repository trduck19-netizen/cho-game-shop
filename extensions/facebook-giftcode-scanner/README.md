# ⚡ CodeGame.Shop - 1-Click Facebook Giftcode & Link Scanner (Chrome Extension v1.3.0)

Tiện ích mở rộng Google Chrome chính thức dành cho Quản trị viên và CTV của **codegame.shop**, cho phép trích xuất tự động **toàn bộ mã giftcode**, **toàn bộ bài viết**, và **toàn bộ đường link liên kết sự kiện / web NPH** từ bất kỳ Fanpage Facebook nào chỉ với 1-Click.

---

## 🌟 TÍNH NĂNG ĐỘT PHÁ MỚI (v1.3.0)

1. **🛡️ Bộ Lọc Mã Giftcode Siêu Chuẩn Xác (Zero Trash Guarantee)**:
   - Tích hợp từ điển âm tiết tiếng Việt không dấu (`VIETNAMESE_SYLLABLES`) bao gồm toàn bộ âm tiết thông dụng.
   - **Loại bỏ triệt để 100% các từ tiếng Việt** viết hoa bị bắt nhầm (như `THAM`, `NGHEN`, `CHOI`, `NGAY`, `MUNG`, `LOAN`, `TIN`, `CHINH`, `THUC`...).
   - **Phân loại độ tin cậy**:
     - ⭐ `Mã chuẩn (Chữ + Số)`: Các mã chứa cả chữ và số (như `LLDKPIB18`, `TSVDKPI0910`, `TNN20B`, `SVIP888`, `CTDT9R0609`) được ưu tiên tối đa.
     - Các chuỗi toàn chữ cái $\le 5$ ký tự bị loại bỏ hoàn toàn, chỉ giữ lại các mã $\ge 6$ ký tự không phải từ ngữ tiếng Việt.
   - Nút **"🧹 Lọc Mã Rác"**: Bấm 1-chạm là tự động dọn sạch mọi mã nghi vấn.

2. **🌀 Quét Sâu Không Giới Hạn (Cumulative Post Registry)**:
   - **Tích lũy bài viết vĩnh viễn**: Khắc phục triệt để hiện tượng Facebook unmount/thu hồi bài viết cũ khỏi DOM. Mọi bài viết đã đi qua đều được lưu vĩnh viễn vào bộ nhớ của Extension.
   - **Tùy chọn độ sâu linh hoạt**:
     - `15 bài viết (~8-10 lượt)`
     - `35 bài viết (~15-20 lượt)`
     - `60 bài viết (~30-40 lượt)`
     - `100 bài viết (~50-60 lượt)`
     - ♾️ **Quét Toàn Bộ Fanpage (Không giới hạn - Đến khi hết bài hoặc bấm Dừng)**
   - Nút **"⏹️ Dừng Quét"**: Cho phép bạn dừng tiến trình quét bất cứ lúc nào khi đã thu thập đủ mã mình cần.

3. **📊 Thẻ Thống Kê Chi Tiết Thời Gian Thực (Stats Card)**:
   - **Bài đã duyệt**: Số lượng bài viết thực tế đã quét qua (15, 35, 60, 100+ bài).
   - **Tổng code**: Tổng số mã quà tặng tìm được.
   - **⭐ Mã chuẩn**: Số lượng mã chất lượng cao có cả chữ và số.
   - **Liên kết**: Tổng số link sự kiện và website NPH.

4. **🎯 Nhận Diện Fanpage Siêu Chuẩn**:
   - Khắc phục triệt để lỗi Facebook hiển thị tiêu đề menu "Thông báo" / "Notifications" / "Bảng tin" đè lên tên Fanpage.
   - Tự động nhận diện chính xác tên game (ví dụ: `Tiên Nghịch Mobile - JoyGames`) và tự động chọn ngay game tương ứng trong danh mục 486 game.

5. **🗑️ Nút Xóa Code Đã Quét**:
   - Nút **"🗑️ Xóa Tất Cả Code"** để làm sạch bảng danh sách khi bạn muốn quét lại từ đầu.
   - Nút xóa đơn lẻ `×` trên từng mã để loại bỏ thủ công từng dòng theo ý muốn.

6. **🔗 Bóc Tách & Giải Mã Toàn Bộ Đường Link (Links Extractor)**:
   - Giải mã link chuyển tiếp Facebook `l.facebook.com/l.php?u=...` thành link gốc sạch sẽ 100%.
   - Bóc tách link bài viết gốc (permalink) và gắn trực tiếp làm `sourceUrl` cho giftcode khi bắn lên web [codegame.shop](https://codegame.shop).

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CẬP NHẬT (MẤT 5 GIÂY)

1. Mở trình duyệt Chrome hoặc Cốc Cốc, truy cập: `chrome://extensions/`
2. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
3. Nếu đã cài trước đó: Bấm vào biểu tượng **xoay tròn 🔄 (Tải lại / Reload)** trên thẻ của Extension.
4. Nếu cài mới: Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** và chọn thư mục:
   `c:\4 Antigravity all\13 web code game\extensions\facebook-giftcode-scanner`
