# Giao diện sàn — khối 1 (chưa nối vào App, chờ điều phối viên gộp)

## Phạm vi khối 1 — đã làm xong

- `MarketplaceCatalogView`: danh sách sàn công khai, tìm kiếm không dấu
  (tên sản phẩm / game / gian hàng), lọc theo game, khoảng giá Core, chỉ
  hiện còn hàng, sắp xếp mới nhất / giá / bán chạy / giảm nhiều nhất.
- `MarketplaceProductCard`: thẻ sản phẩm, chỉ dùng số liệu thật từ API
  (giá, giá gốc, % giảm tính từ giá gốc, số mã còn lại, số đã bán, tên
  gian hàng). Không vẽ logo game vì API sản phẩm không có ảnh chính thức.
- `MarketplaceProductDetail`: chi tiết + ô mua. Số lượng chặn theo số mã
  còn lại, tạo đơn kèm Idempotency-Key, hiển thị mã đã giao ngay, nhắc
  không tự mua hàng của chính mình (máy chủ là nơi chặn cuối cùng).
- `SellerShopView`: trang gian hàng — tên, mô tả, ảnh đại diện thật (lỗi
  thì hiện chữ cái đầu trên nền gradient, không dùng ảnh mặc định chung),
  điểm đánh giá gian hàng từ `rating_sum`/`rating_count`, số đã bán, nhãn
  mức thử, tìm kiếm trong gian hàng, lưới sản phẩm của gian hàng.
- `BuyerOrdersView`: trang đơn của người mua — mã đã giao (che sẵn, bấm
  mới hiện, sao chép từng mã / tất cả), dòng thời gian giữ tiền
  (`EscrowTimeline`), nút xác nhận, nút mở khiếu nại kèm lý do + bằng
  chứng chữ. Nút xác nhận / khiếu nại chỉ hiện khi tiền còn giữ và không
  có khiếu nại mở, đúng luật của API.
- `marketplaceApi.ts`: chỉ gọi các đường API đợt 1+2 đã có
  (`products`, `orders/create`, `orders/confirm`, `disputes`).
- `filterProducts.ts` + `marketplaceSettings.ts`: logic thuần đã kiểm thử
  bằng script node (tìm kiếm không dấu, lọc, sắp xếp, % giảm, điểm gian
  hàng, che mã, khóa Idempotency-Key, trạng thái mức thử).

## Học từ cách làm chung của các sàn — và áp dụng khác đi ra sao

Không sao chép nội dung hay con số nào của sàn khác; dưới đây chỉ là mẫu
chung quan sát được, và cách khối 1 chỉnh lại cho khớp sàn mã số này:

1. Giữ tiền + xác nhận + tự động trả: mẫu chung là tiền giữ tới khi người
   mua xác nhận, hết cửa sổ thì tự trả, khiếu nại đóng băng đồng hồ.
   Áp dụng đúng nguyên mẫu nhưng khác ở chỗ mã được giao NGAY khi mua
   (không chờ người bán giao tay), nên dòng thời gian bắt đầu từ "Đã giao
   mã", và đồng hồ tính từ lúc giữ tiền (`held_at`), không phải lúc đặt đơn.
2. Khiếu nại có bằng chứng: mẫu chung cho người mua gửi lý do + bằng
   chứng, quản trị quyết. Áp dụng đúng, nhưng giao diện nói thẳng giới
   hạn thật của API này: hoàn tiền không thu hồi được mã đã giao.
3. Che mã cho tới khi người mua chủ động xem: mẫu chung của sàn mã số là
   mã lộ ra coi như mất. Áp dụng: mặc định che, sao chép từng mã, cảnh
   báo không chụp màn hình khi mã đang hiện.
4. So sánh nhiều gian hàng cùng loại mã: mẫu chung là lọc theo game, giá,
   uy tín người bán. Áp dụng: có lọc game + giá + còn hàng + sắp xếp,
   nhưng KHÔNG có lọc nền tảng / khu vực kích hoạt, vì API chưa có hai
   trường đó — không bịa giá trị lọc.
5. Uy tín gian hàng: mẫu chung là điểm + số lượt đánh giá + số đã bán.
   Áp dụng: chỉ hiện điểm của GIAN HÀNG (từ bảng `sellers`), ghi rõ chưa
   phải điểm từng sản phẩm, vì chưa có đường lấy đánh giá theo sản phẩm.
6. Khuyến mãi cho mã số: mẫu chung là giảm giá, số lượng còn lại. Áp dụng
   được ngay: % giảm từ `original_price`/`current_price` thật, "còn X mã"
   từ `available_codes` thật. KHÔNG làm ô nhập mã giảm giá / voucher, vì
   API chưa có hệ voucher — ô đó mà gọi đường không tồn tại sẽ chỉ lừa
   người mua. Voucher là việc tồn đọng cho khối API.

## Đoạn nối cần thiết — điều phối viên gộp, khối 1 KHÔNG tự sửa App.tsx

```tsx
import {
  MarketplaceCatalogView,
  MarketplaceProductDetail,
  SellerShopView,
  BuyerOrdersView,
} from './marketplace';
// ... trong App, thêm một tab/chế độ xem "marketplace" và:
// - MarketplaceCatalogView: onOpenProduct -> mở MarketplaceProductDetail,
//   onOpenShop -> mở SellerShopView với shop lấy từ API (xem dưới).
// - MarketplaceProductDetail: isLoggedIn = !!currentUser,
//   onOpenAuth = mở AuthModal, onOrderCreated = thêm đơn vào state đơn
//   của người mua rồi (tùy chọn) chuyển sang BuyerOrdersView.
// - BuyerOrdersView: orders = state đơn của người mua, isLoggedIn,
//   onOpenAuth, onOrdersChanged = cập nhật state đơn đó.
```

Lưu ý nối thêm: `SellerShopView` nhận `shop: SellerShop` qua props. API
hiện có `GET /api/marketplace/sellers/me` (chỉ gian hàng của chính mình)
và `GET /api/marketplace/products?seller_id=` (lấy hàng của gian hàng
bất kỳ). Chưa có đường GET công khai lấy hồ sơ một gian hàng theo
`seller_id`/`shop_slug`; khi nối trang gian hàng cho người mua khác, cần
khối API bổ sung đường đó, hoặc điều phối viên cho phép dựng `shop` từ
hàng đầu tiên trong danh sách sản phẩm của gian hàng (tên gian hàng có
sẵn trong mỗi sản phẩm) — cách dựng tạm này thiếu điểm đánh giá và số
đã bán, nên chỉ là phương án dự phòng, không phải phương án chính.

## Tồn đọng — cần khối khác, khối 1 đã chuẩn bị sẵn đầu nhận

1. `GET /api/marketplace/orders/mine` (danh sách đơn của người mua, kèm
   `delivered_codes` + `escrow_status` + `escrow_held_at` + trạng thái
   khiếu nại): chưa có nên `BuyerOrdersView` hiện chỉ hiện đơn vừa tạo
   xong trong phiên. Khi có đường này, chỉ cần truyền danh sách vào props
   `orders`, không sửa component.
2. `GET` hồ sơ gian hàng công khai theo `seller_id`/`shop_slug` (xem trên).
3. `GET` đánh giá theo sản phẩm (để hiện điểm từng sản phẩm, thay vì chỉ
   điểm gian hàng) và `GET` đánh giá theo gian hàng (để liệt kê nhận xét).
4. Hệ voucher / mã giảm giá cho mã số (API + giao diện ô nhập mã).
5. Giới hạn người bán mới (mức thử): vị trí duy nhất trong khối 1 là
   `marketplaceSettings.ts` + `sellerTrialStatus` trong
   `filterProducts.ts`, và nhãn hiển thị trong `SellerShopView`. Cách
   xóa/tắt: đặt `SELLER_TRIAL_LIMITS_ENABLED = false` là giao diện ngừng
   hiện mọi nhãn mức thử; khi API có cột hạng người bán, thay
   `sellerTrialStatus` bằng hạng thật từ máy chủ và xóa các hằng TRIAL.
   Việc CHẶN tạo sản phẩm / nạp mã vượt mức thử thuộc về API, không thuộc
   khối 1, và hiện chưa có số khiếu nại trong API gian hàng nên nhãn mức
   thử trong khối 1 đang tính từ số đã bán (xem ghi chú trong
   `SellerShopView.tsx`).
6. Kiểm chứng live trên dự án mới: khối 1 chỉ nộp patch, KHÔNG tự triển
   khai (theo quyết của user: Muse chính triển khai lại lên dự án mới
   `cho-game-shop-muse-preview` sau khi đợt xong). Trang thật cần kiểm
   chứng bằng trình duyệt live sau khi điều phối viên gộp + triển khai.

## Lưu ý xung đột quy tắc trong kho (để điều phối viên quyết)

File `AGENTS.md` của kho có điều "build thành công 100% thì BẮT BUỘC tự
động triển khai + push main". Điều này ĐÃ BỊ quyết mới của user ghi đè:
chỉ làm trên dự án mới `cho-game-shop-muse-preview`, không động dự án cũ
hay nhánh `main`, và khối 1 chỉ nộp patch, không tự triển khai. Khối 1
đã làm theo quyết của user, không theo điều đó trong `AGENTS.md`.
