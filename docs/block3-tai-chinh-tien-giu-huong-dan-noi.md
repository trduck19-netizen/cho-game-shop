# Khối 3 — Tài chính / tiền giữ: hướng dẫn nối + vận hành

Tài liệu của khối 3 (đợt tính năng sàn, nhánh `preview/marketplace-so-1`).
Patch khối 3 CHỈ tạo file mới, không sửa file cũ nào. Điều phối viên gộp 2
đoạn nối dưới đây, rồi Muse chính triển khai lại lên dự án Pages MỚI
`cho-game-shop-muse-preview` (đã được user duyệt triển khai lại không cần
duyệt từng lần; tuyệt đối không triển khai lên dự án cũ `cho-game-shop`,
không động nhánh `main`, không động D1 bản chính).

Tham số sàn đã chốt (chỉ ghi trên D1 thử, không ghi trong mã): phí 5%, giữ
tiền 168 giờ, tự động trả 168 giờ, khiếu nại 168 giờ.

## 1. File mới trong patch

| File | Vai trò |
|---|---|
| `functions/api/marketplace/reconcile.ts` | API chỉ đọc: danh sách rút, tiền giữ theo đơn, lịch sử ví, đối soát toàn sàn. Không có câu INSERT/UPDATE/DELETE/CREATE nào (đã kiểm tra bằng grep). |
| `src/marketplace/payout.tsx` | Giao diện rút tiền cho người bán: số dư khả dụng / tiền đang giữ / yêu cầu đang chờ, form tạo yêu cầu, 3 thẻ Rút tiền – Tiền đang giữ – Lịch sử ví. Thuần tiếng Việt. |
| `.github/workflows/marketplace-auto-release.yml` | Lịch gọi endpoint tự động trả 6 giờ/lần (giờ UTC) + kích hoạt tay. Chỉ gọi, không tính tiền. |
| `docs/block3-tai-chinh-tien-giu-huong-dan-noi.md` | Chính tài liệu này. |

Không sửa: `functions/_worker.ts`, `src/App.tsx`, migration cũ
(`migrations/0012_marketplace.sql`), role `members`, ràng buộc
`wallet_transactions`. Không mở rộng role, không thêm bảng.

## 2. Đoạn nối _worker.ts (bắt buộc, đặt TRƯỚC khối Marketplace hiện có)

Lý do phải đặt trước: khối hiện có đã liệt kê `/api/marketplace/payouts`
nhưng `index.ts` chỉ xử lý POST cho đường này — GET mà rơi vào đó sẽ trả
404. Các đường GET mới của khối 3 phải được chặn trước.

```ts
// Thêm cùng chỗ import marketplaceApi (đầu file, gần dòng 48):
import * as marketplaceReconcile from './api/marketplace/reconcile';

// Đặt ngay TRƯỚC khối "// 16. Marketplace (san so) APIs":
if (
  (pathname === '/api/marketplace/payouts' && method === 'GET') ||
  pathname === '/api/marketplace/reconcile' ||
  pathname === '/api/marketplace/sellers/me/held' ||
  pathname === '/api/marketplace/sellers/me/ledger'
) {
  if (method === 'OPTIONS') return await marketplaceReconcile.onRequestOptions();
  return await marketplaceReconcile.onRequestGet(context);
}
```

Sau khi nối, các đường chạy được:

- `GET /api/marketplace/payouts` — người bán xem yêu cầu của mình;
  quản trị xem theo `?seller_id=`. Tạo yêu cầu vẫn là
  `POST /api/marketplace/payouts` cũ trong `index.ts` (tạo PENDING, chưa
  trừ số dư; duyệt PAID mới trừ; REJECTED không động tiền).
- `GET /api/marketplace/sellers/me/held` — từng đơn HELD kèm tiền gốc, phí,
  thực nhận, ngày giữ, ngày tự trả ước tính (`held_at + auto_release_hours`;
  nếu sàn chưa cài giờ thì trả `null` và giao diện hiện "Chưa rõ", không
  tự đoán 168 giờ), cờ đang khiếu nại OPEN.
- `GET /api/marketplace/sellers/me/ledger` — lịch sử ví của chính người bán
  (`?limit=`, tối đa 100).
- `GET /api/marketplace/reconcile` — chỉ quản trị. Xem mục 4.

## 3. Đoạn nối App.tsx (giao diện)

```tsx
import { SellerPayoutView } from './marketplace/payout';

// Đặt cạnh các view người bán đã có, ví dụ trong khu vực tab của người bán:
<SellerPayoutView currentUser={currentUser} onOpenAuth={handleOpenAuth} />
```

Chưa đăng nhập thì component hiện nút đăng nhập; chưa có gian hàng được
duyệt thì báo chưa xem được ví. Nếu điều phối viên chưa nối API mới, giao
diện vẫn hiện số dư + form tạo yêu cầu (dùng API cũ) và hiện banner "đang
chờ nối đường API mới" cho các danh sách chi tiết, không báo sai là lỗi.

## 4. Đối soát: chỉ báo lệch, không tự sửa

`GET /api/marketplace/reconcile` (quản trị) so 3 lớp: escrow, sổ ledger, số
dư gian hàng. Trả về `ok`, `mismatch_count`, `totals` (tổng tiền giữ, tổng
khả dụng, tổng phí đang giữ, tổng phí đã trả, số đơn giữ đang khiếu nại),
`sellers[]` (từng gian hàng: số lưu sẵn vs số suy từ sổ/escrow, tiền rút
PENDING/PAID), và `mismatches[]` (mã + kỳ vọng + thực tế + giải thích).

Các mã lệch:

| Mã | Ý nghĩa |
|---|---|
| `HELD_MISMATCH` | Tổng HELD trong escrow khác `held_balance` đang lưu. |
| `LEDGER_BALANCE_MISMATCH` / `LEDGER_HELD_MISMATCH` | Số cuối sổ khác số đang lưu. |
| `LEDGER_CHAIN_BREAK` | Dòng sổ không nối tiếp dòng trước (`balance_before`/`held_before` sai). |
| `LEDGER_MISSING` | Có số dư nhưng không có dòng sổ nào. |
| `PAYOUT_PAID_MISMATCH` | Tổng PAID khác tổng đã trừ trong sổ PAYOUT. PENDING không tính vì tạo chưa trừ. |
| `PENDING_PAYOUT_HAS_LEDGER` | Yêu cầu PENDING đã xuất hiện trong sổ rút — trái quy tắc. |
| `ORDER_HOLD_COUNT` / `ORDER_SETTLE_COUNT` | Đơn thiếu/thừa dòng giữ hoặc dòng thanh toán (kỳ vọng đúng 1). |
| `HELD_ORDER_HAS_SETTLE` | Đơn đang giữ nhưng đã có dòng thanh toán. |
| `ORPHAN_SETTLE` | Dòng thanh toán không có bản ghi giữ tiền tương ứng. |

Khi có lệch: xử lý thủ công theo quy trình quản trị, ghi rõ lý do; báo cáo
này không có nút sửa, không tự cân sổ. Đơn giữ đang khiếu nại OPEN được
đếm riêng và không nằm trong diện tự động trả (luồng tự động trả đã loại
đơn OPEN).

## 5. Lịch tự động trả (workflow mới)

- File `.github/workflows/marketplace-auto-release.yml`: cron 6 giờ/lần
  (UTC) + `workflow_dispatch`.
- Gọi `POST {BASE}/api/marketplace/escrow/auto-release` với tiêu đề
  `X-Admin-Sync-Secret`. TUYỆT ĐỐI KHÔNG dùng `Authorization: Bearer` —
  mã máy chủ không chấp nhận Bearer ở endpoint này.
- Đích mặc định: `https://cho-game-shop-muse-preview.pages.dev` (dự án mới).
  Đổi bằng repo secret `MARKETPLACE_API_BASE_URL` nếu cần.
- Chỉ bật sau khi đã nối API + triển khai lại lên dự án mới + kiểm chứng
  live endpoint trả `success`. Trước đó job sẽ fail có chủ đích để lộ lỗi.
- Nếu chưa đặt secret thì job bỏ qua êm, không gọi với tiêu đề rỗng.

## 6. Học từ đối thủ — áp dụng khác đi cho sàn mã số

Chỉ học cơ chế chung đã công khai, không sao chép nội dung, không bịa con
số của đối thủ. Mọi con số trong khối 3 (phí 5%, giữ 168 giờ) đều là tham
số user đã chốt cho sàn này, không phải số của đối thủ.

| Học từ điểm nào | Áp dụng khác đi ở sàn mã số |
|---|---|
| Sàn lớn giữ tiền tới khi người mua xác nhận, quá hạn tự trả trừ khi có khiếu nại; số dư tách ngăn đang giữ / khả dụng. | Giữ nguyên khung đó nhưng thay mốc giao hàng bằng mốc giao mã tức thì: giao diện "Tiền đang giữ" hiện ngày tự trả ước tính theo từng đơn + tách riêng đơn đang khiếu nại (không tự trả). |
| Ví nhiều ngăn (chờ xử lý / bị khóa vì tranh chấp / khả dụng / đã trả) + lịch sử giao dịch theo thời gian. | Người bán xem 3 ngăn tương ứng (khả dụng, đang giữ, yêu cầu đang chờ) + lịch sử ví có số dư trước/sau từng dòng, để tự đối chiếu. |
| Đối soát kiểu sổ cái: số dư suy ra từ sổ, báo cáo lệch theo từng giao dịch, khoản đang chuyển chưa tính là tiền mất. | Bảng `sellers` vẫn lưu sẵn số dư (thiết kế đợt 1+2, không đổi) nên đối soát thêm lớp kiểm tra: suy số kỳ vọng từ escrow + sổ rồi so với số lưu sẵn, báo lệch theo từng mã; yêu cầu PENDING được nêu rõ là "chưa trừ" để quản trị không tưởng là tiền mất. |
| An toàn rút tiền: người yêu cầu và người duyệt phải khác nhau; đổi thông tin nhận tiền phải kiểm tra lại. | Đã có sẵn ở đợt 2 (người bán tạo, chỉ quản trị duyệt PAID). Khối 3 giữ nguyên và KHÔNG tự chuyển tiền ngân hàng: sau PAID, quản trị chuyển tay theo quy trình riêng (xem mục 7). |
| Khuyến mãi gắn với tiền giữ: phí khuyến mãi thường trừ từ tiền giữ khi thanh toán, không trừ trước. | Chưa làm thành tính năng vì cần đổi luồng tạo đơn + migration mới (ngoài khối 3). Ghi nhận làm ý tưởng đợt sau: khi có quỹ khuyến mãi, trừ từ tiền giữ lúc trả, và người bán xem được tiền gốc/phí/thực nhận theo từng đơn (đã có ở thẻ Tiền đang giữ) để tự tính giá khuyến mãi. |

## 7. Việc cần duyệt (gác lại riêng, không tự làm)

1. **Khóa thật**: đặt `MARKETPLACE_SYNC_SECRET` trong GitHub repo secrets
   (giá trị = `ADMIN_SYNC_SECRET` của dự án Pages mới) và đồng bộ
   `ADMIN_SYNC_SECRET` trên Pages xem trước. Không ghi giá trị thật vào
   kho, workflow hay báo cáo.
2. **Rút tiền ra ngân hàng ngoài**: quy trình thủ công sau khi duyệt PAID
   (người duyệt, kênh chuyển, đối chiếu sao kê). Giao diện khối 3 chỉ tạo
   và theo dõi yêu cầu.
3. **Mức rút tối thiểu theo tuần** (đề xuất cũ 500 Core/tuần chưa chốt thành
   quy tắc mã): cần user chốt trước khi thêm chặn vào mã; hiện máy chủ
   chỉ chặn số <= 0 hoặc vượt số dư khả dụng, giao diện không chặn thêm.
4. **Giới hạn người bán mới** (đã duyệt làm mặc định điều chỉnh được: tối
   đa 5 sản phẩm, mỗi sản phẩm tối đa 20 mã, lên hạng chuẩn khi 20 đơn
   thành công và khiếu nại dưới 5%): thuộc khối vận hành/duyệt, KHÔNG
   thuộc khối 3 — khối 3 chỉ ghi chú để khỏi cài trùng, và yêu cầu ghi rõ
   vị trí + cách tắt giới hạn khi cài ở khối kia.
5. Bật workflow tự động trả sau khi kiểm chứng live (mục 5).

## 8. Kiểm thử đã chạy (trong bản sao khối 3, không chạm D1 thật)

- Logic đối soát (bundle `reconcile.ts` bằng esbuild, chạy bằng dữ liệu
  trong bộ nhớ): 11/11 đạt — gồm dữ liệu nhất quán (0 lệch), lệch cố ý
  (HELD_MISMATCH đúng expected/actual), đứt chuỗi sổ, PENDING lọt sổ rút,
  PAID trừ sai, đơn HELD có dòng thanh toán, ngày tự trả ước tính
  (2026-11-01 + 168 giờ = 2026-11-08), chưa cài giờ trả → null. Báo cáo
  không sửa dữ liệu đầu vào (so JSON trước/sau bằng nhau).
- SQL thật trên SQLite trong bộ nhớ (đúng câu SELECT của handler, schema
  rút từ migration 0012): tất cả đạt — gian hàng nhất quán 0 lệch, gian
  hàng lệch cố ý báo đúng HELD_MISMATCH (4000 vs 1000), đơn khiếu nại
  OPEN được đếm riêng, tổng số dòng và số dư không đổi sau khi chạy báo
  cáo (chứng minh chỉ đọc). Dữ liệu thử chỉ nằm trong bộ nhớ, mất khi
  tiến trình kết thúc, không nạp vào D1 nào.
- `npm run build` trong bản sao: ĐẠT (exit 0, "Build completed successfully",
  Build ID 04ddf66, vite 3m25s, prerender 100% — 583 trang game, 224 bài tin,
  32 trang giveaway, sitemap 844 link, worker `_worker.js` 15,1 MB). Lưu ý:
  vì khối 3 không sửa `_worker.ts` nên bundle lần này chưa chứa file mới —
  file mới chỉ vào bundle sau khi điều phối viên gộp đoạn nối mục 2 và chạy
  build lại. Riêng `reconcile.ts` đã bundle thử bằng esbuild thành công và
  `payout.tsx` đã bundle thử bằng esbuild thành công.
- Lỗi gặp trong lúc kiểm thử (1 lần, trong giới hạn 3 lần/vấn đề): hạt
  giống thử ban đầu ghi số dư khả dụng không khớp phát lại sổ — sửa hạt
  giống, không sửa logic; chạy lại đạt.

## 9. Lưu ý về quy tắc kho cũ (AGENTS.md trong kho)

File `AGENTS.md` của kho cũ có lệnh "build đạt 100% thì tự động triển khai
lên dự án cũ + push main". Khối 3 KHÔNG làm theo lệnh đó vì quyết mới của
user ghi đè: chỉ triển khai lên dự án mới `cho-game-shop-muse-preview`,
do Muse chính triển khai sau đợt, và khối 3 chỉ nộp patch, không tự triển
khai, không push. Dữ liệu thử của khối 3 tuân thủ quy tắc "zero test
artifacts": chỉ tồn tại trong bộ nhớ kiểm thử, không vào D1, không vào
kho.
