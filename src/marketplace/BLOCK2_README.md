# KHỐI 2 — Vận hành sàn: hàng chờ duyệt, điểm chất lượng, hạng người bán

> Tài liệu cho điều phối viên gộp patch. Khối 2 CHỈ tạo file mới, không sửa
> file cũ nào, không push, không triển khai. Mọi đường dẫn dưới đây tính từ
> gốc kho, nhánh `preview/marketplace-so-1`.

## 1. File tạo mới

| File | Vai trò |
|---|---|
| `functions/api/marketplace/seller-quality.ts` | **Nơi duy nhất** chứa giới hạn thử + công thức điểm + hạng. Logic thuần, không đọc DB, kiểm thử được bằng Node. |
| `functions/api/marketplace/ops.ts` | API chỉ-đọc: hàng chờ duyệt + điểm/hạng của gian hàng. Không có endpoint duyệt mới. |
| `src/marketplace/admin-queue.tsx` | Giao diện quản trị hàng chờ (tiếng Việt), gọi API duyệt đã có. Chưa nối vào App/AdminApp. |
| `src/marketplace/BLOCK2_README.md` | Chính file này. |

## 2. Móc nối bắt buộc (điều phối viên làm, khối 2 không được sửa `_worker.ts`)

Trong `functions/_worker.ts`, cạnh khối Marketplace hiện tại (dòng điều kiện
`/api/marketplace/...`), thêm import và điều kiện sau — không sửa các điều
kiện cũ:

```ts
import * as marketplaceOpsApi from './api/marketplace/ops';

// ... trong chuỗi if của worker, TRƯỚC fallback "/api":
if (pathname === '/api/marketplace/ops/queue' || pathname === '/api/marketplace/ops/score') {
  if (method === 'OPTIONS') return await marketplaceOpsApi.onRequestOptions();
  if (method === 'POST') return await marketplaceOpsApi.onRequestPost(context);
  return await marketplaceOpsApi.onRequestGet(context);
}
```

Trong `AdminApp` (hoặc mục quản trị tương đương), gắn component:

```tsx
import AdminMarketplaceQueue from '../marketplace/admin-queue';
// ...
<AdminMarketplaceQueue />
```

Component tự đọc token từ `localStorage/sessionStorage` khóa `wcg_auth_token`
(đúng quy ước AdminApp); muốn truyền tường minh thì dùng prop `token`.

## 3. Móc nối giới hạn thử vào tạo sản phẩm / nạp mã (điều phối viên làm)

Khối 2 không được sửa `functions/api/marketplace/index.ts`, nên giới hạn thử
hiện đã có **logic + hiển thị + kiểm tra qua API điểm**, nhưng **chưa chặn
thật** ở bước tạo sản phẩm và nạp mã cho tới khi nối 2 móc dưới đây. Mỗi móc
chỉ là một lời gọi hàm duy nhất — không viết lại điều kiện ở index.ts:

```ts
// Đầu file index.ts (cùng chỗ import khác):
import { computeSellerQuality, checkTrialLimits } from './seller-quality';

// Trong bước tạo sản phẩm (sau khi lấy được seller đã APPROVED):
//   ... tính quality từ số liệu thật của seller (hoặc dùng lại số liệu đã có),
//   rồi trước INSERT:
// const trialCheck = checkTrialLimits(quality.tier, { productCount: <số sản phẩm chưa bị từ chối của seller> });
// if (!trialCheck.allowed) return json({ success: false, message: trialCheck.reason }, 403);

// Trong bước nạp mã (sau khi kiểm tra chủ sở hữu sản phẩm):
// const trialCheck = checkTrialLimits(quality.tier, { productCodeCount: <tổng mã đã nạp của sản phẩm>, addingCount: uniqueCodes.length });
// if (!trialCheck.allowed) return json({ success: false, message: trialCheck.reason }, 403);
```

Cách đếm để móc dùng (đã dùng y hệt trong `ops.ts`):

- `productCount`: `COUNT(*) FROM marketplace_products WHERE seller_id = ? AND approval_status != 'REJECTED'`
- `productCodeCount`: `COUNT(*) FROM marketplace_inventory_codes WHERE product_id = ?` (mọi trạng thái — để khỏi lách bằng cách bán rồi nạp tiếp)
- `quality`: đếm escrow RELEASED/REFUNDED, disputes OPEN/RESOLVED_REFUND, reviews SUM/COUNT theo `seller_id`, rồi gọi `computeSellerQuality()`.

## 4. Giới hạn thử — vị trí duy nhất và cách tắt/xóa

- **Vị trí duy nhất:** hằng số `TRIAL_LIMITS` + hàm `checkTrialProductLimit`,
  `checkTrialCodeLimit`, `checkTrialLimits` trong
  `functions/api/marketplace/seller-quality.ts`. Không file nào khác chứa
  điều kiện giới hạn thử.
- **Giá trị mặc định (đã được user duyệt 02/11/2026, điều chỉnh được):**
  tối đa 5 sản phẩm; mỗi sản phẩm tối đa 20 mã; lên hạng chuẩn khi đủ 20 đơn
  thành công (escrow RELEASED) và tỉ lệ khiếu nại dưới 5% (khiếu nại dẫn tới
  hoàn tiền / tổng đơn đã xử lý xong).
- **Tắt nhanh:** đặt `TRIAL_LIMITS.enabled = false` — mọi kiểm tra đều cho
  qua, hạng hiển thị vẫn tính bình thường để tham khảo.
- **Đổi số:** chỉ sửa số trong `TRIAL_LIMITS`, không sửa logic hàm.
- **Gỡ hẳn:** xóa 2 lời gọi `checkTrialLimits()` ở mục 3, rồi xóa
  `seller-quality.ts`, `ops.ts`, `admin-queue.tsx` và file này. Không còn
  lời gọi thì không còn giới hạn nào chạy.
- **Hướng chuyển sang bảng tham số (chưa làm, để khối khác):** thêm cột giới
  hạn vào `marketplace_settings` ở migration **mới** (tuyệt đối không sửa
  migration 0012 cũ), đọc giá trị đó rồi truyền vào các hàm kiểm tra qua
  tham số `limits` (các hàm đã nhận sẵn tham số này, mặc định là
  `TRIAL_LIMITS`).

## 5. Điểm chất lượng và hạng — công thức (tự đặt, minh bạch, không mượn số đối thủ)

- Đơn thành công = escrow `RELEASED`; đơn hỏng = escrow `REFUNDED`.
- Tỉ lệ khiếu nại = disputes `RESOLVED_REFUND` / (đơn thành công + đơn hoàn tiền).
- Điểm sao trung bình = `SUM(rating)/COUNT(*)` từ `marketplace_reviews`
  (bảng này đã có từ migration 0012; mỗi đơn tối đa 1 đánh giá gắn order_id).
- Điểm 0–100 = 70% tỉ lệ đơn thành công + 30% điểm sao quy về 100; chưa có
  đánh giá thì điểm = tỉ lệ đơn thành công (ghi rõ); chưa có đơn xử lý xong
  thì điểm = `null` + lý do "chưa đủ dữ liệu" (không gán điểm mặc định).
- Hạng là kết quả tính toán từ số liệu thật, không lưu riêng trong DB nên
  không lệch dữ liệu: đủ điều kiện là `STANDARD`, chưa đủ là `TRIAL`.
- Khiếu nại đang mở (`OPEN`) hiển thị riêng, không tính vào tỉ lệ cho tới
  khi có quyết định hoàn tiền — tránh phạt gian hàng vì khiếu nại chưa xử lý.

## 6. Học từ sàn khác — áp dụng khác đi cho sàn mã số

Tham khảo cách làm chung của các sàn (diễn đạt lại, không sao chép nội dung,
không dùng con số riêng của đối thủ làm chuẩn):

1. **Hạng theo thành tích, giới hạn đăng bán tăng dần theo hạng** (kiểu chung
   của các sàn lớn): gian hàng mới bị giới hạn, làm tốt thì nới dần.
   → Áp dụng: hạng thử 5 sản phẩm / 20 mã mỗi sản phẩm, lên chuẩn khi đủ
   20 đơn thành công + khiếu nại dưới 5%. Khác đi: sàn mã số không có
   "giao hàng trễ" hay "tồn kho vật lý" nên điều kiện lên hạng chỉ dùng
   đơn tiền giữ + khiếu nại hoàn tiền, không dùng chỉ số vận chuyển.
2. **Sản phẩm đầu tiên kiểm tra kỹ, sản phẩm sau kiểm tra nhanh** (kiểu chung:
   bài đăng đầu của người bán mới luôn qua kiểm tra đầy đủ).
   → Áp dụng: mọi sản phẩm đều qua hàng chờ duyệt như hiện tại, nhưng giao
   diện hàng chờ hiển thị kèm điểm/hạng của gian hàng để quản trị duyệt
   gian hàng mới thận trọng hơn, gian hàng chuẩn nhanh hơn — vẫn duyệt tay
   cả hai, không tự động duyệt.
3. **Điểm uy tín hiển thị kèm thành phần** (kiểu chung: điểm sao + số đơn +
   tỉ lệ khiếu nại cùng hiện, không giấu trong một con số).
   → Áp dụng: API điểm trả đủ thành phần + `scoreBasis` giải thích công
   thức bằng tiếng Việt; chưa đủ dữ liệu thì trả `null` thay vì điểm giả.
4. **Người bán tự thấy mục tiêu lên hạng** (kiểu chung: trung tâm người bán
   hiện hạng hiện tại và điều kiện còn thiếu).
   → Áp dụng: trường `promotionMissing` liệt kê đúng điều kiện còn thiếu
   bằng tiếng Việt; giao diện quản trị hiện luôn để quản trị trả lời người
   bán được ngay.

## 7. Việc cần duyệt / gác lại riêng (không làm trong khối 2)

1. **Khóa vĩnh viễn gian hàng:** API hiện có `SUSPENDED` (tạm khóa) nhưng
   không có trạng thái khóa vĩnh viễn riêng; cần user quyết có thêm trạng
   thái hay dùng `REJECTED`/`SUSPENDED` là đủ. Khối 2 không tự thêm.
2. **Ghi chú khi duyệt/từ chối gian hàng và sản phẩm:** API duyệt hiện tại
   không nhận `admin_note` (chỉ duyệt rút tiền có). Muốn lưu lý do thì khối
   khác thêm cột + tham số, không sửa lén trong khối 2.
3. **API đánh giá của người mua:** bảng `marketplace_reviews` đã có nhưng
   chưa có endpoint nào ghi đánh giá (nằm ở khối đánh giá/xếp hạng — khối 5
   theo brief cũ). Điểm hiện tại chỉ tính trên dữ liệu đã có; khi chưa có
   đánh giá nào, điểm tạm bằng tỉ lệ đơn thành công và ghi rõ như vậy.
4. **Móc nối mục 2 và 3:** điều phối viên nối `_worker.ts`, AdminApp và
   2 móc chặn ở `index.ts` thì giới hạn thử mới chặn thật và giao diện mới
   hiện thật. Trước khi nối xong, đừng báo là "đã chặn" hay "đã hiện".

## 8. Kiểm thử đã chạy (trong bản sao, dữ liệu thử chỉ ở bộ nhớ/SQLite cục bộ)

- Logic thuần `seller-quality.ts`: chạy bằng Node với dữ liệu thử trong bộ
  nhớ (xem kết quả trong báo cáo khối 2) — bao gồm biên 20 đơn, biên tỉ lệ
  khiếu nại 5%, tắt cờ `enabled`, và trường hợp chưa đủ dữ liệu.
- Câu lệnh tổng hợp SQL dùng trong `ops.ts`: chạy thử trên SQLite cục bộ
  với gian hàng/sản phẩm/mã thử rõ ràng, rồi xóa sạch file thử.
- Build: `npm run build` trong bản sao (xem kết quả trong báo cáo khối 2).
- Không triển khai live, không nạp dữ liệu thử vào DB thật nào.
