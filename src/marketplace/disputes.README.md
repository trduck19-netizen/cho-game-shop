# Khối 4 — Khiếu nại / chăm sóc khách (sàn cho-game-shop)

Tài liệu quy trình + đoạn nối cho điều phối viên. Thuần tiếng Việt; tên kỹ thuật
(`OPEN`, `RESOLVED_REFUND`, đường API...) giữ nguyên vì đó là tên gọi chính xác.

## 1. File mới trong khối này (không sửa file cũ nào)

| File | Vai trò |
|---|---|
| `src/marketplace/disputes.ts` | Kiểu dữ liệu, nhãn tiếng Việt, lý do + gợi ý bằng chứng, luật phân loại hàng chờ duyệt, dòng thời gian, client gọi API khiếu nại đã có, và các hàm trả về trạng thái chờ nối cho phần API chưa có. |
| `src/marketplace/DisputeCenter.tsx` | Giao diện người mua + người bán: mở khiếu nại, xem danh sách, xem chi tiết + dòng thời gian, lưu bản nháp bằng chứng của người bán. |
| `src/marketplace/DisputeAdminPanel.tsx` | Giao diện quản trị: hàng chờ cần duyệt ưu tiên, quyết định 3 hướng, bắt buộc ghi lý do quyết định. |
| `scripts/block4-disputes-check.cjs` | Kiểm thử logic (chạy ngoài, không nằm trong bản build). |

Không sửa: `functions/_worker.ts`, `src/App.tsx`, migration cũ, role members,
ràng buộc `wallet_transactions`. Không triển khai, không push.

## 2. Sự thật về API đã có (đã đọc code, không đoán)

- `POST /api/marketplace/disputes` — chỉ người mua, chỉ khi tiền giữ còn ở
  trạng thái `HELD`, mỗi đơn tối đa 1 khiếu nại `OPEN`. Thân gửi: `order_id`,
  `reason`, `evidence_text`. Khi mở, tiền giữ đứng yên; người mua không xác
  nhận đơn được nữa.
- `POST /api/marketplace/disputes/resolve` — chỉ quản trị. Thân gửi:
  `dispute_id`, `decision`, `admin_note`.
- `marketplace_disputes` (migration 0012): `id, order_id (duy nhất), buyer_id,
  seller_id, reason, evidence_text, status, admin_note, created_at, resolved_at`.
  Trạng thái: `OPEN`, `RESOLVED_RELEASE`, `RESOLVED_REFUND`, `REJECTED`.
- Tham số sàn đã chốt: phí 5%, giữ tiền 168 giờ, tự động trả 168 giờ, cửa sổ
  khiếu nại 168 giờ.

## 3. Quy trình xử lý hai hướng + hòa giải

### 3.1. Người mua thắng — hoàn tiền (`RESOLVED_REFUND`)

- Người mua được hoàn **toàn bộ số tiền đã trả**; tiền giữ không trả cho người bán.
- Đơn chuyển thành `CANCELLED`.
- **Mã đã giao KHÔNG bị thu hồi**, vì mã có thể đã được dùng rồi. Giao diện và
  tài liệu phải ghi rõ điều này ở chỗ người mua và người bán đều thấy — hoàn
  tiền không đồng nghĩa lấy lại mã.

### 3.2. Người bán thắng — trả tiền giữ (`RESOLVED_RELEASE`)

- Tiền giữ (sau phí 5%) chuyển thành tiền khả dụng của người bán.
- Đơn chuyển thành `COMPLETED`. Mã đã giao giữ nguyên.

### 3.3. Bác khiếu nại (`REJECTED`) — khác với "người bán thắng ngay"

- Chỉ đổi trạng thái khiếu nại thành `REJECTED`; **tiền vẫn giữ nguyên**, không
  trả ngay cho người bán.
- Tiền chỉ được trả khi người mua xác nhận đơn, hoặc hết 168 giờ thì hệ thống
  tự động trả (đường `escrow/auto-release` bỏ qua đơn còn khiếu nại `OPEN`).
- Giao diện ghi rõ điểm này để người bán không hiểu lầm là đã nhận được tiền.

### 3.4. Hòa giải — không chia tiền theo tỷ lệ

- Quản trị trao đổi với hai bên trước khi bấm quyết định. Nếu hai bên thỏa
  thuận được (ví dụ người bán gửi lại mã đúng), quản trị vẫn kết khiếu nại
  bằng **một trong ba quyết định trên** — hệ thống không có trạng thái "hòa
  giải một phần" và không tự chia tiền.
- Mã gửi lại (nếu có) phải là mã thật từ kho của người bán, nạp qua đường nạp
  mã đã có; hệ thống không tự sinh mã, không tự mua.
- Không có trạng thái khiếu nại lại trong API: nếu có bằng chứng mới sau khi
  đóng, hai bên liên hệ quản trị để xem xét ngoài luồng khiếu nại (quy trình
  ngoài hệ thống, không tự tạo trạng thái mới).

## 4. Hàng chờ cần quản trị duyệt (không tự quyết)

Giao diện **không bao giờ tự quyết** — API cũng không có đường tự quyết. Hai
trường hợp chỉ được liệt kê vào hàng chờ ưu tiên trong `DisputeAdminPanel`:

1. **Hai bên đều có bằng chứng** (`classifyReview` → `CONFLICTING_EVIDENCE`):
   giao diện chỉ biết cả hai bên đều đã trình bày, không đọc được "trái nhau"
   từ chữ nên không kết luận bên nào đúng; quản trị là người đối chiếu.
2. **Hoàn tiền vượt ngưỡng** (`OVER_THRESHOLD`): chỉ có hiệu lực khi user chốt
   một con số ngưỡng. Hiện `REFUND_REVIEW_THRESHOLD_CORE = null` (chưa chốt)
   nên chưa gắn cờ đơn nào theo tiêu chí này — **việc cần user duyệt, không
   tự bịa ngưỡng**.

Tín hiệu phụ (không phải cờ quyết định): người bán chưa gửi bằng chứng chỉ
hiển thị để quản trị cân nhắc, không phải căn cứ tự động xử người bán thua.

## 5. Học từ sàn khác — áp dụng khác đi cho sàn mã số

Tham khảo cách làm chung của các sàn lớn về khiếu nại/hòa giải/bằng chứng
(không sao chép nội dung có bản quyền, không lấy con số của họ làm luật của
mình). Bảng dưới ghi rõ: học điểm nào, áp dụng khác đi ra sao, và cái nào làm
được ngay / cái nào chỉ là đề xuất chờ duyệt.

| Điểm học được (mô tả chung) | Áp dụng cho sàn mã số | Trạng thái |
|---|---|---|
| Lý do khiếu nại quyết định loại bằng chứng cần (kiểu eBay: lý do khác nhau thì bằng chứng quyết định khác nhau) | Lý do riêng cho mã số (mã đã dùng, mã không hợp lệ, mã sai game, mã sai mô tả) + gợi ý bằng chứng riêng cho từng lý do trong `DISPUTE_REASON_OPTIONS` | Làm được ngay (giao diện) |
| Người mua nêu mong muốn giải quyết ngay khi mở (kiểu eBay: chọn hướng giải quyết mong muốn) | Ô "mong muốn giải quyết" (hoàn tiền / gửi lại mã đúng / để quản trị quyết), ghép công khai vào cuối `evidence_text` vì API chưa có trường riêng; ghi rõ đây là nguyện vọng, không phải cam kết | Làm được ngay |
| Liên hệ người bán trước khi leo thang (kiểu Etsy: trao đổi trước, rồi mới thành vụ việc chính thức) | Áp dụng khác đi: sàn mình giữ tiền nên người mua được mở khiếu nại ngay để khóa tiền giữ; bù lại, giao diện luôn cho người bán gửi bằng chứng + đề xuất hướng giải quyết, và quản trị hòa giải trước khi quyết | Làm được ngay (phần người bán ở dạng bản nháp, chờ đường API — xem §6) |
| Người bán phải phản hồi trong thời hạn hiển thị; không phản hồi là tín hiệu xấu (kiểu eBay/Etsy) | Áp dụng khác đi, KHÔNG tự động xử thua: người bán chưa phản hồi chỉ hiện thành tín hiệu trong khung quản trị. Thời hạn phản hồi bắt buộc là **đề xuất chờ user duyệt**, chưa cài thành luật vì API không có mốc thời hạn riêng cho khiếu nại | Đề xuất, chưa làm |
| Lý do + mô tả chi tiết + bằng chứng hình ảnh; sàn có thể yêu cầu bổ sung bằng chứng (kiểu Shopee) | Áp dụng khác đi: bằng chứng hiện chỉ là mô tả bằng chữ (`evidence_text`), giao diện hướng dẫn ghi nguyên văn thông báo lỗi; tải file ảnh/video và "yêu cầu bổ sung bằng chứng" là đề xuất (cần thêm bảng tin nhắn/bằng chứng + chỗ lưu file), chưa làm | Đề xuất, chưa làm |
| Lý do "không còn nhu cầu" không được hỗ trợ (kiểu Shopee) | Áp dụng thẳng: "Đổi ý, không còn nhu cầu" là lý do không đủ điều kiện, giao diện chặn gửi kèm giải thích (mã dùng một lần đã giao thì không trả lại được như hàng vật lý) | Làm được ngay (giao diện) |
| Vụ việc mở cho tới khi có quyết định; quyết định có ghi chú (kiểu Etsy: vụ việc chỉ đóng khi giải quyết xong) | Dòng thời gian 3 bước suy ra từ `created_at` / `resolved_at` / `admin_note`; khung quản trị bắt buộc ghi lý do quyết định | Làm được ngay |

Điểm khác biệt cốt lõi với sàn hàng vật lý (không học theo): không có trả
hàng, không có kiểm tra hàng hoàn, không có đổi trả vật lý — nên toàn bộ bằng
chứng và hòa giải đều xoay quanh "mã có dùng được không", và hoàn tiền không
đi kèm thu hồi mã.

## 6. Đoạn nối điều phối viên cần gộp (chưa làm trong khối này)

### 6.1. Nối giao diện (không sửa logic cũ)

- Trang đơn hàng của người mua: gắn `<DisputeCenter role="buyer" />`.
- Trang gian hàng của người bán: gắn `<DisputeCenter role="seller" />`.
- Trang quản trị: gắn
  `<DisputeAdminPanel disputes={...} amountByOrderId={...} />`
  (danh sách lấy từ đường đọc admin bên dưới; `amountByOrderId` là số tiền đơn
  gross theo đơn, chỉ dùng để gắn cờ vượt ngưỡng).
- Không gắn `DisputeCenter`/`DisputeAdminPanel` vào `src/App.tsx` trong khối
  này để tránh xung đột với các khối khác; điều phối viên là người nối.

### 6.2. Đường đọc danh sách (thêm vào `functions/_worker.ts` + `functions/api/marketplace/index.ts`)

Thêm 3 đường GET vào danh sách pathname ở `_worker.ts` (cùng nhóm marketplace
đã có), rồi thêm handler GET tương ứng trong `index.ts`. Hợp đồng trả về mà
`fetchDisputesFor` trong `disputes.ts` đang chờ:

- `GET /api/marketplace/disputes/mine` — cần đăng nhập; trả
  `{ success: true, disputes: [...] }` với các khiếu nại có `buyer_id` là người
  gọi. Không trả `code_content` (mã hàng) trong bất kỳ trường nào.
- `GET /api/marketplace/disputes/seller` — cần đăng nhập + gian hàng của người
  gọi; trả các khiếu nại có `seller_id` là gian hàng đó.
- `GET /api/marketplace/disputes/admin` — chỉ quản trị; trả tất cả, `OPEN` trước,
  mới nhất trước.

Quyền: chỉ trả đúng khiếu nại của người gọi (người mua chỉ thấy đơn mình mua,
người bán chỉ thấy đơn gian hàng mình); cấm trả toàn bộ cho tài khoản thường.

### 6.3. Đường gửi bằng chứng của người bán + bổ sung bằng chứng (đề xuất)

Hiện `marketplace_disputes` chỉ có `evidence_text` của người mua và `admin_note`
của quản trị, nên người bán chưa có chỗ gửi chính thức. Đề xuất (chưa áp dụng,
cần điều phối viên quyết trước khi viết migration mới — tuyệt đối không sửa
migration 0012):

```sql
-- Migration mới (đề xuất, CHƯA áp dụng):
CREATE TABLE IF NOT EXISTS marketplace_dispute_evidence (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('BUYER', 'SELLER')),
  evidence_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute
  ON marketplace_dispute_evidence(dispute_id);
```

```text
POST /api/marketplace/disputes/evidence
- Cần đăng nhập; người gọi phải là buyer_id hoặc seller_id của khiếu nại đó.
- Chỉ nhận khi khiếu nại còn OPEN; thân gửi: { dispute_id, evidence_text }.
- Trả về bản ghi bằng chứng vừa lưu. Giao diện người bán hiện đã soạn sẵn bản
  nháp đúng nội dung này (submitSellerEvidence) — khi đường này xong, chỉ cần
  đổi hàm đó sang gọi POST thật, không sửa giao diện.
```

### 6.4. Đề xuất chưa chốt (gác lại riêng, không tự làm)

- Ngưỡng hoàn tiền cần duyệt (con số Core): chờ user chốt.
- Thời hạn phản hồi bắt buộc của người bán + hành vi khi quá hạn: chờ user
  duyệt (hiện chỉ là tín hiệu, không tự động xử).
- Tải file ảnh/video làm bằng chứng + "yêu cầu bổ sung bằng chứng" của quản
  trị: cần thêm bảng + chỗ lưu file, chưa làm.
- Nhắc người bán khi có khiếu nại mới (thông báo): chưa có kênh thông báo
  riêng cho sàn trong khối này, không tự bịa kênh.

## 7. Kiểm thử đã chạy (xem `scripts/block4-disputes-check.cjs`)

- Logic thuần (`disputes.ts`): nhãn trạng thái, mô tả 3 quyết định (đặc biệt
  `REJECTED` giữ tiền, `RESOLVED_REFUND` không thu hồi mã), lý do không đủ
  điều kiện bị chặn, phân loại hàng chờ (hai bên có bằng chứng / vượt ngưỡng /
  ngưỡng chưa chốt thì không gắn cờ), ghép nguyện vọng vào `evidence_text`.
- SQLite trong bộ nhớ (`:memory:`, xóa khi đóng, không chạm DB thật): mô phỏng
  đúng ràng buộc migration 0012 — mỗi đơn tối đa 1 khiếu nại `OPEN` (cột
  `order_id` duy nhất), `REJECTED` giữ `escrow` ở `HELD`, đường hoàn tiền
  không xóa/sửa hàng mã đã giao.
- Dữ liệu thử chỉ là chuỗi ghi rõ trong bộ nhớ, không nạp vào DB thật, không
  sinh mã bán thật, đã xóa sạch sau kiểm thử (xem khối `finally` trong script).
