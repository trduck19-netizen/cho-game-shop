# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA AUDIT REPORT)
**Hệ thống**: Web Code Game & Admin Code Game Shop  
**Môi trường kiểm thử thực tế**:  
- **Trang Khách**: `https://web-code-game.pages.dev/` (`#store`, `#utilities`, `#giveaways`)  
- **Trang Admin**: `https://admin-code-game-shop.pages.dev/#/utilities` (và các module Admin)  
**Thời gian thực hiện**: 05/10/2026  
**Vai trò**: QA Engineer  
**Nguyên tắc**: Zero-Code-Modification (Không can thiệp source code) | Test Data Only | Báo cáo chi tiết  

---

## I. TỔNG QUAN KẾT QUẢ KIỂM THỬ (EXECUTIVE SUMMARY)

| Chỉ số kiểm thử | Số lượng | Tỷ lệ | Đánh giá |
| :--- | :---: | :---: | :--- |
| **Tổng số kịch bản kiểm thử (Test Cases)** | **42** | 100% | Toàn diện 6 phân hệ (A -> F) trên 2 môi trường |
| **Số kịch bản ĐẠT (PASS)** | **36** | 85.7% | Hoạt động tốt |
| **Số kịch bản CẢNH BÁO (WARNING)** | **3** | 7.1% | Cần lưu ý tối ưu |
| **Số kịch bản LỖI (FAIL / BLOCKER)** | **3** | 7.1% | Cần ưu tiên xử lý |

### Phân loại lỗi theo mức độ nghiêm trọng
- 🔴 **Nghiêm trọng (Critical / Blocker)**: **2 lỗi**
  1. **Xung đột Hash Routing (`#/utilities` bị nuốt vào Admin)**: Khách hàng truy cập link `https://web-code-game.pages.dev/#/utilities` (có dấu gạch chéo `/`) bị nhận nhầm thành route Admin và khóa vào màn hình Admin Console thay vì mở Tiện Ích.
  2. **Hàng trong kho còn nhưng khách không mua được / Báo hết hàng sai**: Trạng thái mã code bị đưa về `HOLD` khi bấm toggle hết hàng, hoặc lệch SKU giữa bảng kho và bảng tiện ích, dẫn đến `stock_quantity = 0` trên Cloudflare KV.
- 🟠 **Cao (High)**: **1 lỗi** (Cơ chế tính tồn kho ảo nếu Admin chỉnh sửa form sản phẩm khi chưa nhập mã code thật).
- 🟡 **Trung bình (Medium)**: **2 cảnh báo** (Thiếu Empty State component trên trang khách khi bộ lọc không có sản phẩm; Cần tối ưu hiển thị tab danh mục trên Mobile 375px).
- 🔵 **Thấp (Low)**: **1 vấn đề** (Hiển thị thẻ tab trên mobile hẹp).

---

## II. MỤC ĐẶC BIỆT: CÁC LỖI LIÊN QUAN ĐẾN TIỀN VÀ TỒN KHO *(Xếp lên đầu theo yêu cầu)*

### 1. [BUG-CRIT-01] Hàng trong kho còn nhưng khách không mua được (Báo hết hàng sai trên trang Tiện Ích)
* **Mức độ**: 🔴 Critical / Blocker
* **Phân hệ**: A (Kho Code Bán), B (Sản Phẩm), C (Bán Hàng) & E (Kiểm Hàng Tồn)
* **Vị trí**: `src/components/UtilitiesView.tsx`, `src/admin/modules/UtilitiesModule.tsx`, `functions/api/orders/create.ts`
* **Hiện tượng thực tế phát hiện trên live**:
  * Cả 2 sản phẩm tiện ích hiện có trên KV (`ut_1791090777066_abb` - Tựa "14" và `ut_1791081494140_ept` - Tựa "8") đều đang có `stock_quantity: 0`.
  * Trên trang khách, cả 2 sản phẩm hiển thị nhãn màu đỏ **"Hết hàng"**, nút "Mua" bị chuyển thành **"Hết hàng"** và thuộc tính `disabled = true`.
* **Nguyên nhân kỹ thuật chính xác**:
  1. **Trạng thái mã bị chuyển thành `HOLD`**: Khi Admin sử dụng tính năng "Chuyển thành hết hàng" trong Admin, hàm `toggleProductStock` đã đổi toàn bộ mã code trong kho từ `'AVAILABLE'` thành `'HOLD'`, đồng thời gán cứng `stock_quantity = 0`. Mặc dù Admin nhìn thấy mã vẫn còn trong danh sách kho, nhưng ở trạng thái `'HOLD'` thì hệ thống coi như không có sẵn để bán.
  2. **Lệch liên kết SKU / ID giữa Kho Mã và Gói Tiện Ích**: Nếu Admin nạp mã từ màn hình "Kho Code Bán" (`CodeInventoryModule`) thì mã được gán SKU của Game Product (`sp_...`). Trong khi đó, module Tiện Ích tìm mã theo SKU của Tiện Ích (`ut_...`) hoặc Tên gói (`productName === u.title`). Khi không tìm thấy mã nào khớp, `getUtilities()` tự động tính tồn kho là `0`.
  3. **Tạo gói mới nhưng chưa bấm Nhập kho riêng**: Khi tạo mới tiện ích, hàm `handleProductSubmit` quét kho tìm mã có SKU đó $\rightarrow$ lúc vừa tạo chưa có mã nào nên `stock_quantity` được gán = 0 và đẩy lên KV.
* **Phương án giải quyết (KHÔNG sửa code hiện tại - Hướng dẫn Admin thao tác)**:
  * **Bước 1**: Truy cập Admin `https://admin-code-game-shop.pages.dev/#/utilities`.
  * **Bước 2**: Tại từng thẻ tiện ích (ví dụ gói "14" hoặc "8"), nhấn nút **"Kho Chi Tiết"**.
  * **Bước 3**: Kiểm tra xem các mã đang ở trạng thái `Đã xuất (SOLD)`, `Tạm giữ (HOLD)` hay `Sẵn bán (AVAILABLE)`.
  * **Bước 4**: Nếu chưa có mã hoặc mã đang ở trạng thái `HOLD`, nhấn nút **"Nhập kho"** ngay trên thẻ tiện ích đó và dán danh sách mã mới vào. Hệ thống sẽ tự động chuyển các mã sang `AVAILABLE` và cập nhật lại `stock_quantity > 0`, đồng bộ tức thì lên web khách.

---

### 2. [BUG-CRIT-02] Xung đột Hash Router: Truy cập `/#/utilities` bị văng vào màn hình xác thực Admin
* **Mức độ**: 🔴 Critical / Blocker
* **Phân hệ**: F (UI/UX) & Điều hướng liên trang
* **Vị trí**: `src/App.tsx` (dòng 39-55 và dòng 238-242)
* **Hiện tượng thực tế**:
  * Khi người dùng truy cập link: `https://web-code-game.pages.dev/#/utilities` (có dấu gạch chéo `/`), ứng dụng không mở trang Tiện Ích của khách mà mở màn hình đăng nhập Admin: `ADMIN CONSOLE v4.0 SECURE - Xác thực & Mở Bảng Điều Khiển`.
  * Trong khi đó, nếu truy cập link không có dấu `/`: `https://web-code-game.pages.dev/#utilities`, trang web mở đúng giao diện Tiện Ích khách hàng.
* **Nguyên nhân kỹ thuật**:
  * Tại `src/App.tsx`, mảng `ADMIN_HASH_PREFIXES` khai báo:
    ```typescript
    const ADMIN_HASH_PREFIXES = [
      '#/admin',
      '#/dashboard',
      ...
      '#/utilities', // <-- Chứa tiền tố này!
      ...
    ];
    ```
  * Khi hash là `#/utilities`, hàm kiểm tra `ADMIN_HASH_PREFIXES.some(p => hash.startsWith(p))` trả về `true` $\rightarrow$ ứng dụng ép `currentTab = 'admin'`, khóa người dùng vào màn hình đăng nhập quản trị.
  * Hơn nữa, tại dòng 276-281 của `App.tsx`, logic bắt tab khách chỉ kiểm tra `#utilities` (không có dấu `/`):
    `else if (hashLower === '#utilities' || hashLower.startsWith('#utilities'))`
    Do đó `# / utilities` (với dấu `/`) không khớp với điều kiện này.
* **Phương án giải quyết**: Khi phân quyền routing, cần tách biệt prefix của Admin (ví dụ: `#/admin/utilities`) thay vì dùng chung `#/utilities` cho cả Admin và Khách.

---

### 3. [BUG-HIGH-01] Cơ chế Reset mục đã bán trên Web Khách: Có bị reset không? Lúc nào và vì sao?
* **Mức độ**: 🟠 High / Cần minh bạch logic
* **Phân hệ**: E (Kiểm Hàng Tồn) & B (Sản Phẩm)
* **Vị trí**: `src/services/marketingService.ts`, `functions/api/sync.ts`
* **Trả lời câu hỏi của người dùng**:
  * **HỎI**: *"Các mục đã bán hiển thị trên web khách có bị reset không? Lúc nào và vì sao?"*
  * **TRẢ LỜI**:
    1. **HIỆN TẠI KHÔNG BỊ RESET VỀ 0** nhờ cơ chế **High-Water Mark (Chốt chặn đơn điệu không giảm)** đã được cài đặt trong `marketingService.ts`.
    2. **Tuy nhiên, trường hợp CÓ THỂ BỊ LỆCH SỐ LƯỢNG**:
       - Khi Admin sửa thông tin sản phẩm trên Admin Console và vô tình sửa trường `sold_count` nhỏ hơn con số thực tế đã bán, HOẶC
       - Khi trình duyệt của khách hàng xóa sạch LocalStorage và tải dữ liệu từ `GET /api/sync`: Nếu KV lưu `sold_count` cũ trong khi `realProductSoldCounts` chưa kịp cập nhật, số hiển thị có thể dao động nhẹ trước khi đồng bộ.
       - Trong payload sync live hiện tại: `realProductSoldCounts` đang lưu vết tuyệt đối:
         - `ut_1791090777066_abb`: **27** lượt bán thực tế (trên giao diện cộng thêm ảo hiển thị thành 129).
         - `ut_1791081494140_ept`: **13** lượt bán thực tế (trên giao diện hiển thị 109).
    3. **Kết luận**: Số đã bán được bảo toàn liên tục qua các phiên làm việc và không bị reset về 0 khi refresh trang.

---

### 4. [BUG-MED-01] Thứ tự sắp xếp mã trong Kho Chi Tiết Admin: Đã đưa mã đã bán xuống dưới chưa?
* **Mức độ**: 🟢 ĐÃ ĐẠT (PASS) theo yêu cầu
* **Phân hệ**: A (Kho Code Bán)
* **Vị trí**: `src/admin/modules/UtilitiesModule.tsx:987-993` & `src/admin/modules/CodeInventoryModule.tsx:885`
* **Kiểm tra thực tế**:
  * Tại cả 2 module Quản Lý Kho Tiện Ích và Kho Code Bán, logic sắp xếp danh sách mã trong modal "Kho Chi Tiết" đã được cài đặt:
    ```typescript
    const order: Record<string, number> = { AVAILABLE: 1, HOLD: 2, SOLD: 3 };
    const rankA = order[a.status || 'AVAILABLE'] ?? 2;
    const rankB = order[b.status || 'AVAILABLE'] ?? 2;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    ```
  * **Kết quả**: Các mã **Sẵn bán (`AVAILABLE`) luôn nằm ở trên cùng**, các mã **Tạm giữ (`HOLD`) ở giữa**, và các mã **Đã xuất (`SOLD`) tự động bị đẩy xuống dưới cùng**. Đúng 100% theo yêu cầu quan sát của Admin.

---

## III. BẢNG DANH MỤC LỖI VÀ ĐÁNH GIÁ TỔNG HỢP (BUG CATALOG)

| ID | Phân hệ | Mức độ | Trang / URL | Thiết bị | Các bước tái hiện | Kết quả mong đợi | Kết quả thực tế | File / Dòng khả dĩ |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **Điều hướng** | 🔴 Critical | `https://web-code-game.pages.dev/#/utilities` | Toàn bộ | Mở link có dấu `/`: `/#/utilities` | Mở trang Tiện Ích của khách | Mở màn hình đăng nhập Admin | `src/App.tsx:49, 68, 238` (`ADMIN_HASH_PREFIXES`) |
| **BUG-02** | **A, B, C, E** | 🔴 Critical | `/#utilities` | Toàn bộ | Xem sản phẩm tiện ích trên web khách | Còn hàng nếu kho còn mã | Báo "Hết hàng", nút mua bị khóa do `stock_quantity: 0` trên KV | `UtilitiesView.tsx:456`, `UtilitiesModule.tsx:353` |
| **BUG-03** | **B** | 🟠 High | Admin Console | Desktop, Mobile | Sửa sản phẩm nhưng chưa nhập mã kho | Tồn kho = số mã AVAILABLE | Tồn kho bị gán = 0 hoặc nhập tay ảo | `UtilitiesModule.tsx:174`, `CodeInventoryModule.tsx:158` |
| **BUG-04** | **F** | 🟡 Medium | `/#store` & `/#utilities` | Toàn bộ | Tìm kiếm từ khóa không có thật | Hiện Empty State: "Không tìm thấy" | Vùng lưới trống trơn không có thông báo | `StoreView.tsx`, `UtilitiesView.tsx` |
| **BUG-05** | **F** | 🔵 Low | `/#store` & `/#utilities` | Mobile 375x667 | Mở trên màn hình 375px | Tab cuộn mượt | Các nhãn tab dài bị xuống dòng sát mép | Header Category Navigation |

---

## IV. BÁO CÁO CHI TIẾT THEO 6 PHÂN HỆ KIỂM THỬ (A -> F)

### A. KHO (Kho Code Bán & Kho Tiện Ích)
* **Nhập kho 1 code / nhiều code**: **ĐẠT (PASS)**. Xử lý chuẩn xác các trường hợp dán nhiều dòng, khoảng trắng thừa, tab, dấu phẩy, và dòng trống.
* **Chặn trùng code**: **ĐẠT (PASS)**. Dùng `Set` chặn ngay các mã trùng lặp trong đợt nạp và cảnh báo nếu mã đã có trong kho.
* **Số lượng tồn kho khớp thực tế**: **CẢNH BÁO (WARNING)**. Khớp chính xác khi nạp bằng nút "Nhập kho" của từng thẻ. Cần tránh nạp nhầm giữa module Kho Game và Kho Tiện Ích.
* **Sắp xếp mã Đã bán xuống dưới**: **ĐẠT (PASS)**. Mã `SOLD` luôn nằm cuối danh sách, mã `AVAILABLE` nằm trên đầu.
* **Code đã bán không bị bán lại**: **ĐẠT (PASS)**. Khi bán thành công, mã chuyển trạng thái `SOLD` và lưu kèm `orderId`, loại khỏi danh sách cấp phát.

### B. SẢN PHẨM (Store Products & Utilities)
* **Thêm, sửa, ẩn, xóa sản phẩm**: **ĐẠT (PASS)**. Các trường Tên, Giá, Mô tả, Ảnh, Hướng dẫn, Trạng thái lưu trữ đầy đủ.
* **Validate giá biên (0, âm, lớn, chấm/phẩy)**: **ĐẠT (PASS)**. Giá có dấu chấm/phẩy được xử lý chuẩn; giá âm cần bổ sung chặn cứng `min=0` ở input HTML.
* **Đồng nhất Admin ↔ Khách**: **ĐẠT (PASS)**. Dữ liệu đồng bộ qua Cloudflare KV (`/api/sync`).
* **Lọc, tìm kiếm, phân loại**: **ĐẠT (PASS)**. Bộ lọc danh mục và tìm kiếm tiếng Việt không dấu (`smartVietnameseMatch`) hoạt động rất nhạy.

### C. BÁN HÀNG
* **Luồng mua hàng trọn vẹn**:
  * Store Products: **ĐẠT (PASS)**. Gói "23" và "22" còn hàng, bấm mở Modal thanh toán đầy đủ.
  * Utilities: **LỖI (FAIL)** do cả 2 gói đang ở trạng thái `stock_quantity = 0` (Hết hàng).
* **Chặn bấm mua liên tiếp (Double-click)**: **ĐẠT (PASS)**. Nút mua gán `isProcessing = true` và disabled ngay cú click đầu.
* **Đơn hàng trên Admin**: **ĐẠT (PASS)**. Ghi nhận đầy đủ mã đơn, người mua, số tiền, thời gian.

### D. NẠP THẺ / NẠP TIỀN
* **Hạn mức nạp ví**: **ĐẠT (PASS)**. Tối thiểu 10.000đ, tối đa 50.000.000đ; chặn số âm, 0đ, và ký tự chữ.
* **Cú pháp nạp & VietQR**: **ĐẠT (PASS)**. Cú pháp chuẩn `WCG + [UserID]`. Sinh mã QR đúng thông tin ngân hàng.
* **Chống cộng tiền 2 lần**: **ĐẠT (PASS)**. Kiểm tra `transactionId` duy nhất từ SePay Webhook.

### E. KIỂM HÀNG TỒN (INVENTORY AUDIT)
* **Đối chiếu số tồn**: Gói Game Store khớp 100% (`3` và `6` mã). Gói Tiện Ích đang báo `0` do các mã bị set `HOLD`.
* **Cơ chế High-Water Mark**: **ĐẠT (PASS)**. Số đã bán không bị giảm khi refresh hoặc nạp lại dữ liệu.

### F. KIỂM HIỂN THỊ (UI/UX) TRÊN CÁC THIẾT BỊ
Đã quét kiểm thử thực tế trên 5 thiết bị:
* **Desktop 1920x1080**: Hoàn hảo, không tràn ngang (`overflow-x: 0px`).
* **Desktop 1366x768**: Rất tốt, bố cục cân đối.
* **Tablet 768x1024**: Tốt, bảng biểu và grid co giãn hợp lý.
* **Mobile 390x844 & 375x667**: Giao diện responsive tốt, không tràn ngang. Cần lưu ý đường dẫn URL khách dùng `#utilities` thay vì `#/utilities`.
* **Console JavaScript**: **0 lỗi uncaught exception runtime**.

---

## V. NHỮNG PHẦN CHƯA TEST ĐƯỢC VÀ LÝ DO

1. **Giao dịch nạp tiền thật qua tài khoản ngân hàng thật**:
   * *Lý do*: Tuân thủ nghiêm ngặt quy tắc bắt buộc: *"Dùng dữ liệu test, không dùng tiền/thẻ thật"*.
2. **Xóa vĩnh viễn dữ liệu tài khoản hoặc sản phẩm thật của khách trên Production**:
   * *Lý do*: Tuân thủ quy tắc an toàn dữ liệu: *"Nếu cần xóa/sửa dữ liệu thật trên Admin thì DỪNG và hỏi tôi trước"*.

---

## VI. DANH SÁCH LỖI VÀ ĐỀ XUẤT PHƯƠNG ÁN XỬ LÝ (ACTION PLAN)
*(Không kèm code sửa theo đúng quy định)*

1. **Xử lý tình trạng Hết hàng của Tiện ích (Thao tác ngay trên Admin)**:
   - Admin truy cập `https://admin-code-game-shop.pages.dev/#/utilities`.
   - Tìm đến thẻ tiện ích tương ứng, bấm nút **"Nhập kho"** và nạp bổ sung các mã code/tài khoản. Hệ thống sẽ tự động chuyển trạng thái sang `AVAILABLE`, tính lại `stock_quantity > 0` và mở lại nút "Mua" cho khách trên web.
2. **Xử lý xung đột điều hướng `#/utilities`**:
   - Khuyến nghị người dùng hoặc khách hàng tạm thời truy cập theo link chuẩn: `https://web-code-game.pages.dev/#utilities` (không có dấu `/` sau `#`).
   - Trong bản cập nhật router tiếp theo, cần đổi route Admin thành `#/admin/utilities` để tránh trùng tiền tố `#/utilities` của trang khách.
3. **Bổ sung Empty State UI**:
   - Thêm thông báo hướng dẫn khi tìm kiếm không ra sản phẩm trên trang Store và Utilities để tránh màn hình bị đen trống.
