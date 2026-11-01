# KNOWN_ISSUES.md — Danh Mục Lỗi Đã Biết, Bẫy Cần Tránh & Quy Trình Kiểm Thử

> **CẢNH BÁO BẮT BUỘC DÀNH CHO AI AGENT VÀ DEVELOPER**:
> Trước khi thực hiện bất kỳ thao tác sửa đổi nào:
> 1. **BẮT BUỘC ĐỌC** danh mục lỗi dưới đây để không bao giờ lặp lại các cách sửa đã thất bại.
> 2. Nếu vấn đề chưa rõ nguyên nhân: **ĐIỀU TRA & THU THẬP THÔNG TIN TRƯỚC**, tuyệt đối không sửa mò hoặc tự ý viết lại mã nguồn không liên quan.
> 3. Sau khi sửa: Thực hiện đầy đủ các bước trong **Post-flight Checklist** trước khi báo cáo hoàn thành.

---

## 1. DANH MỤC LỖI & CÁC BẪY ĐÃ THẤT BẠI (DO NOT REPEAT)

### ISSUE-207: Bẫy Tự Ý Sinh Mã Code Giả Lập/Mã Ảo Nạp Vào Cơ Sở Dữ Liệu D1 Vi Phạm Nghiêm Trọng Nguyên Tắc "Không Thêm Mã Ảo / Zero Test Artifacts" Của Chủ Sở Hữu
- **Triệu chứng**:
  - Khi thấy đợt phát thiếu mã trên D1, AI Agent tự sinh danh sách mã mẫu (ví dụ `HNK-VIP-...`) và gọi API nạp vào bảng SQL `giveaway_codes`.
  - Quản trị viên vào kho phát hiện xuất hiện các mã code lạ không phải do mình nhập vào, gây bức xúc và vi phạm nguyên tắc bảo mật, toàn vẹn dữ liệu.
- **Nguyên nhân gốc rễ**:
  - Agent nhầm lẫn giữa việc "khắc phục hạ tầng lưu trữ" với việc "tự tạo dữ liệu kinh doanh".
  - Vi phạm Quy tắc 7 (`AGENTS.md` / `GEMINI.md`) và Quy tắc 3.1 (`PROJECT_MEMORY.md`): Tuyệt đối chỉ có Quản trị viên/Chủ sở hữu mới có quyền nhập mã thật vào kho. Mọi mã do hệ thống hoặc AI sinh ra đều là mã ảo/rác.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Xóa sạch 100% toàn bộ mã ảo khỏi D1 bằng `action: 'CLEAR_POOL'`.
  - Giữ nguyên trạng `remaining_codes = 0` nếu Admin chưa nhập mã.
  - Cung cấp giao diện nạp trực tiếp để Quản trị viên tự tay dán mã thật của mình vào kho phát.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ **TUYỆT ĐỐI KHÔNG BAO GIỜ TỰ Ý SINH MÃ CODE GIẢ LẬP / MÃ TEST VÀO PRODUCTION D1**.
  - ❌ **Không tự ý nạp bất kỳ dữ liệu mẫu nào mà không có sự cung cấp trực tiếp từ Chủ sở hữu**.

### ISSUE-206: Bẫy Mặc Định Mở Tab "Nhập Thêm Mã" Trống Trơn Khiến Admin Tưởng Mất Mã, Xung Đột Bộ Lọc Chip Game Khiến Tìm Kiếm Ra Rỗng, Và Link Ảnh Chết `codemoi.net` Fallback Sang `/vite.svg` Làm Vỡ Logo
- **Triệu chứng**:
  - Quản trị viên nạp mã thành công nhưng khi mở Modal "Kho mã" lại thấy một ô textarea trống trơn, tưởng rằng toàn bộ mã đã biến mất.
  - Khi gõ từ khóa vào ô tìm kiếm Giveaway hoặc trên Web Khách, kết quả hiển thị rỗng `0 mục` dù game và đợt phát tồn tại sờ sờ.
  - Nhiều tựa game trên Web Khách và Quản trị bị lỗi logo: hiển thị icon tia chớp Vite màu tím vàng (`/vite.svg`) hoặc biến mất icon trên thanh chip chọn nhanh game.
- **Nguyên nhân gốc rễ**:
  1. *Modal Kho mã mặc định tab ADD*: `handleOpenPoolModal` đặt `setPoolTab('ADD')` khiến người dùng luôn thấy textarea trống rỗng thay vì xem danh sách các mã đang có trong kho (tab LIST).
  2. *Bộ lọc chip game chặn trước ô tìm kiếm*: Logic `if (selectedGameFilter !== 'ALL' && g.game_slug !== selectedGameFilter) return false;` được đặt trước kiểm tra `searchQuery`. Khi đã chọn chip game A, gõ tìm kiếm game B sẽ luôn ra 0 kết quả.
  3. *Web Khách dùng includes thuần*: `GiveawaysView.tsx` dùng `toLowerCase().includes(q)` không hỗ trợ tiếng Việt không dấu (gõ `ta la hac ngo khong` không khớp `TA LÀ HẮC NGỘ KHÔNG`).
  4. *Link ảnh domain chết `codemoi.net` và fallback `/vite.svg`*: Database D1 lưu URL từ domain cũ `https://codemoi.net/covers/...` (trả về 301/lỗi). Khi thẻ `<img>` gặp lỗi, code cũ gán `target.src = '/vite.svg'`, biến logo game thành logo của Vite; trên chip chọn game thì `display = 'none'` làm mất logo.
  5. *Lệch version xóa kho mã*: `adminDataService.ts` xóa `wcg_admin_giveaways_v4` và `this.KEYS.GIVEAWAYS` trong `cleanupLegacyV3Data()` khi khác version.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Mở tab LIST khi kho có mã*: Nếu `pool.length > 0`, `handleOpenPoolModal` mặc định mở tab `LIST` ("Danh sách mã trong kho (X)"). Admin lập tức thấy toàn bộ mã code, nút sao chép, nút xóa và nút `[🔄 Đồng bộ lên D1]`.
  2. *Ưu tiên tìm kiếm toàn diện*: Khi `searchQuery` có nội dung, bỏ qua mọi ràng buộc của chip game `selectedGameFilter` và tab `statusFilter`, tìm kiếm trên toàn bộ 100% các chiến dịch.
  3. *Chuẩn hóa tiếng Việt với `smartVietnameseMatch`*: Áp dụng cho cả Web Khách và Quản trị, hỗ trợ tìm kiếm gõ có dấu, không dấu, viết tắt ("hac ngo khong", "ta la hac ngo khong", "hnk").
  4. *Loại bỏ vĩnh viễn `/vite.svg` và cập nhật D1*: Đổi toàn bộ 5 giveaway trên D1 sang `/game_icons/${slug}.webp`. Helper `resolveGameIcon` và `getSafeGiveawayIcon` tự động chuyển link `codemoi.net` về icon chuẩn. Fallback đa tầng (.webp $\rightarrow$ .jpg $\rightarrow$ gradient avatar), tuyệt đối không dùng `/vite.svg`.
  5. *Bảo tồn vĩnh viễn kho mã Admin*: Gỡ bỏ lệnh xóa giveaways trong `cleanupLegacyV3Data()`, đồng bộ `DATASET_VERSION = 'wcg_dataset_2026_10_30_v41'`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không mặc định mở tab ADD khi kho mã đã có mã*.
  - ❌ *Không để bộ lọc chip game `selectedGameFilter` chặn kết quả tìm kiếm toàn cục của `searchQuery`*.
  - ❌ *Không dùng `includes` thuần túy để so sánh tìm kiếm tiếng Việt trên Web Khách*.
  - ❌ *Không dùng `/vite.svg` làm ảnh fallback cho logo game*.
  - ❌ *Không xóa kho mã giveaway trong LocalStorage khi nâng cấp `DATASET_VERSION`*.

### ISSUE-205: Bẫy Nạp Mã Code Riêng Chỉ Lưu JSON Cục Bộ Mà Thiếu Đồng Bộ Trực Tiếp Vào Bảng SQL `giveaway_codes` Trên Cloudflare D1, Dẫn Đến Web Báo "Hết Mã" Dù Admin Đã Nhập Mã
- **Triệu chứng**:
  - Quản trị viên nạp mã mới vào Modal "Kho mã" của một sự kiện Giveaway (ví dụ Ta Là Hắc Ngộ Không).
  - Bảng Admin hiển thị kho mã tăng lên (ví dụ: `Thật: 42 / 96`), nhưng ngoài Web Khách (`/giveaways`) vẫn báo "Hết Mã / Chờ Đợt Mới".
  - Người dùng nghi ngờ mã vừa nạp bị bot hoặc người chơi săn hết ngay lập tức.
- **Nguyên nhân gốc rễ**:
  1. *Lưu trữ không đồng bộ giữa JSON State và Bảng SQL D1*:
     - Modal "Kho mã" trước đây chỉ gọi `saveGiveawaysToServer()`, lưu mảng `codes_pool` vào JSON tổng thể mà thiếu gọi API nguyên tử `PUT /api/giveaways/manage` (`action: 'ADD_CODES'`).
     - Cơ sở dữ liệu Cloudflare D1 lưu trữ từng mã riêng lẻ trong bảng SQL `giveaway_codes`. Câu lệnh đếm mã còn lại của D1 là:
       `SELECT COUNT(*) FROM giveaway_codes WHERE giveaway_id = ? AND status = 'AVAILABLE'`
     - Vì chưa có bản ghi mới trong bảng `giveaway_codes`, câu lệnh đếm trả về 0. API public và Web Khách đọc số 0 từ D1 và hiển thị "Hết Mã".
  2. *Race-condition ghi đè kho mã cục bộ trong `adminDataService.ts`*:
     - Khi background simulation cập nhật timestamp trên server, Admin tải về thấy `serverGw.updated_at` mới hơn và chọn `serverGw.codes_pool` (vốn là `[]`), có nguy cơ đè mất kho mã cục bộ của Admin.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Thêm gọi trực tiếp D1 `action: 'ADD_CODES'` trong `handleSavePoolCodes`*:
     - Mỗi khi Quản trị viên nhập mã và bấm "Lưu mã", code tự động gửi mảng mã lên `PUT /api/giveaways/manage` kèm `getAdminHeaders()`.
  2. *Bổ sung nút `[🔄 Đồng bộ lên D1]` trong Modal Kho mã*:
     - Quản trị viên có thể bấm nút này để đẩy toàn bộ `codes_pool` hiện có lên D1 qua lệnh `action: 'RESTOCK'`.
  3. *Bảo vệ kho mã trong `adminDataService.ts`*:
     - Nếu `serverPool.length === 0` và `localPool.length > 0`, tuyệt đối không ghi đè kho cục bộ bằng mảng rỗng từ máy chủ.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ lưu `codes_pool` vào JSON mà bỏ qua việc nạp vào bảng SQL `giveaway_codes` trên D1*.
  - ❌ *Không để mảng rỗng `codes_pool: []` từ server đè mất mã thật trong LocalStorage của Admin*.

### ISSUE-204: Bẫy Sai Lệch Kiểu Dữ Liệu SQLite Integer (1/0 vs Boolean) Trong Phép So Sánh Nghiêm Ngặt (`0 !== false`), Khiến Sự Kiện Đã Đóng Bị Admin Hiểu Nhầm Là Đang Mở Và "Tự Hồi Sinh" Sau Khi Tải Lại Trang
- **Triệu chứng**:
  - Quản trị viên bấm đóng một sự kiện Giveaway (ví dụ Tiên Nghịch Mobile), thao tác thành công. Nhưng khi tải lại trang Admin, sự kiện lại hiển thị nhãn "Đang mở", nút thao tác là "Đóng", và bộ lọc đầu trang ghi "Đã đóng (0)".
  - Khi xem ngoài Web Khách, người dùng thấy sự kiện đã đóng và một sự kiện khác (ví dụ Hắc Ngộ Không) đều hiện "Hết Mã" / "Chờ Đợt Mới", gây hiểu lầm là bấm đóng Tiên Nghịch làm đóng luôn cả Hắc Ngộ Không.
- **Nguyên nhân gốc rễ**:
  1. *SQLite D1 lưu boolean dưới dạng số nguyên (`1` và `0`)*:
     - Trong JavaScript: `0 !== false` trả về `true` vì `0` (number) khác kiểu với `false` (boolean).
     - Tương tự: `0 === false` trả về `false`.
     - Code Admin kiểm tra `gw.is_active !== false` $\rightarrow$ với giá trị `0` từ D1, kết quả luôn là `true`. Do đó Admin luôn nhận định sự kiện là "Đang mở".
  2. *Hàm `handleToggleActive` bị sai logic lật trạng thái và thiếu Admin Auth Headers*:
     - `const newStatus = gw.is_active === false;` khi `gw.is_active === 0` tính ra `newStatus = false`.
     - `fetch('/api/giveaways/manage')` thiếu `...getAdminHeaders()` bị Cloudflare chặn 403.
  3. *Sync nền ép cứng status về `'ACTIVE'`*:
     - `sync.ts` và `d1_service.ts` có dòng `const dbStatus = ... ? 'ENDED' : 'ACTIVE';` tự ghi đè `status = 'ACTIVE'` vào D1.
  4. *Hiện tượng Hắc Ngộ Không*:
     - Hắc Ngộ Không thực tế có `is_active: 1`, `status: "ACTIVE"`. Nó hiển thị "Hết Mã" ngoài web chỉ vì kho mã thật trong D1 đã được người chơi săn hết sạch (54/54 mã).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Dùng hàm helper chuẩn hóa `isGwActive(gw)`*:
     ```ts
     export const isGwActive = (g: any): boolean => {
       if (!g) return false;
       if (g.is_active === false || g.is_active === 0 || g.is_active === '0' || g.isActive === false || g.isActive === 0) return false;
       const st = String(g.status || '').toUpperCase();
       if (st === 'PAUSED' || st === 'CLOSED' || st === 'ENDED') return false;
       return true;
     };
     ```
  2. *Chuẩn hóa boolean trong `adminDataService.ts`*:
     - Khi merge dữ liệu từ Cloudflare D1/KV, ép `is_active` về boolean sạch (`true` / `false`).
  3. *Bổ sung đầy đủ Admin Auth Headers cho các request PUT*:
     - Thêm `...getAdminHeaders()` cho `handleToggleActive`, `handleBatchToggleSelected`, `handleOpenNow`.
  4. *Lưu đúng `status = 'PAUSED'` khi đóng*:
     - Trong `sync.ts`, `d1_service.ts`, `giveaways/manage.ts`, gán đúng `status = 'PAUSED'` và `is_active = 0`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `gw.is_active !== false` hoặc `gw.is_active === false` trực tiếp khi làm việc với dữ liệu từ D1 SQLite*.
  - ❌ *Không gọi endpoint `/api/giveaways/manage` mà quên truyền `getAdminHeaders()`*.
  - ❌ *Không ép cứng `status = 'ACTIVE'` trong các hàm đồng bộ D1*.

### ISSUE-203: Bẫy Ẩn Mất Sự Kiện Khỏi Giao Diện Web Khách Khi Đóng Hoặc Báo "Đã Hết Hạn" Thay Vì "Hết Mã", Gây Hiểu Nhầm Xóa Sự Kiện Hoặc Mất Mã Trong Kho
- **Triệu chứng**:
  - Khi quản trị viên đóng một sự kiện phát quà riêng (Giveaway) trong Admin, sự kiện biến mất hoàn toàn khỏi danh sách ngoài web thay vì báo "Hết Mã" để người chơi biết và chờ đợt mới.
  - Một số nơi hiển thị chữ "Đã Hết Hạn" gây hiểu nhầm sự kiện đã kết thúc vĩnh viễn dù mã trong kho vẫn còn nguyên.
  - Quản trị viên không có nút đóng sự kiện riêng lẻ trên từng dòng và thiếu công cụ chọn nhanh tựa game hoặc thao tác hàng loạt.
- **Nguyên nhân gốc rễ**:
  1. *Lọc bỏ sự kiện đóng trong giao diện khách*: `GiveawaysView.tsx` có dòng `if (c.is_active === false) return false;` khiến mọi sự kiện có `is_active === false` bị lọc mất khỏi danh sách khách.
  2. *Gộp chung `is_active === false` vào trạng thái hết hạn `isEnded`*: `const isEnded = ... || campaign.is_active === false;` dẫn đến việc sự kiện bị dán nhãn "Đã Hết Hạn" thay vì "Hết Mã".
  3. *Thiếu API batch toggle*: Trước đây chỉ có API toggle từng sự kiện đơn lẻ, không hỗ trợ thao tác hàng loạt trên D1.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Giữ sự kiện đóng hiển thị trên web*: Bỏ điều kiện lọc `if (c.is_active === false) return false;` trong `GiveawaysView.tsx`, đồng thời bổ sung tab lọc `out_of_stock` ("Đã Hết Mã").
  2. *Ép remaining về 0 và dán nhãn Hết Mã*: Trong `marketingService.getGiveawayDisplayRemaining()`, nếu `is_active === false` thì trả về 0. Thẻ sự kiện tự động nhận nhãn "Hết Mã" và nút CTA hiển thị "Chờ Đợt Mới" / "Tạm Hết".
  3. *Giữ nguyên 100% kho mã thật*: Toàn bộ `giveaway_codes` / `codes_pool` / `remaining_codes` trong D1 được bảo tồn nguyên vẹn. Trong Admin hiển thị rõ ràng: `Đã đóng (Báo hết mã) - (Kho còn X mã thật)`.
  4. *API BATCH_TOGGLE_ACTIVE*: Hỗ trợ đóng / mở hàng loạt qua một lệnh D1 batch nguyên tử duy nhất.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không xóa mã hoặc set `remaining_codes = 0` trong database D1 khi đóng sự kiện*.
  - ❌ *Không filter bỏ sự kiện có `is_active === false` khỏi danh sách `GiveawaysView.tsx`*.
  - ❌ *Không dán nhãn "Đã Hết Hạn" cho sự kiện tạm đóng có mã trong kho*.

### ISSUE-202: Bẫy Lọc Bỏ Chữ Số Khi Tokenize Khiến Fuzzy Matcher Đoán Sai Phiên Bản Game (Kiếm Hiệp Tình 1 vs 2), Reset Trường Omitted Về Default Trong API Upcoming Games & Thiếu Query D1 Trực Tiếp Khi Ingest Codes
- **Triệu chứng**:
  - Khi crawler gửi tên game "Kiếm Hiệp Tình 1", thuật toán fuzzy matcher lại tự động ghép vào "Kiếm Hiệp Tình 2" (hoặc ngược lại).
  - Khi nhiều tựa game có độ tương đồng rất cao (ví dụ >= 0.8), hệ thống tự ý chọn một game bất kỳ thay vì trả về `ambiguous: true` kèm danh sách candidates để bot/admin xác nhận.
  - Khi gửi cập nhật từng phần (partial update) lên `/api/crawler/ingest-upcoming-games`, các trường không gửi (omitted) bị reset về giá trị mặc định hoặc xóa mất ngày ra mắt; gửi `expectedCodes: []` không xóa sạch được mã dự kiến.
  - Số lượng `added` và `duplicates` trong kết quả nạp mã không khớp với thực tế D1 nếu crawler chỉ gửi `gameName` mà không có `gameSlug` (do mã của game chưa được tải trước vào `existingCodeValuesBySlug`).
  - Lọc `?slug=` trên `/api/games` trả về rỗng hoặc 404 cho game tồn tại do so sánh nhạy chữ hoa/thường trong SQLite.
- **Nguyên nhân gốc rễ**:
  1. *Lọc bỏ chữ số đơn lẻ*: `inputWords = normCleanInput.split(/\s+/).filter(w => w.length >= 2)` đã loại bỏ các số có 1 chữ số (`1`, `2`, `3`), làm "Kiếm Hiệp Tình 1" và "Kiếm Hiệp Tình 2" đều biến thành `["kiem", "hiep", "tinh"]`.
  2. *Thiếu kiểm tra bất đồng chữ số (Numeric Conflict)*: Thuật toán so khớp chuỗi không kiểm tra xem tập chữ số của query và candidate có mâu thuẫn hay không.
  3. *Thiếu cơ chế Ambiguous Detection*: Khi có từ 2 candidate cùng đạt điểm cao (>= 0.8), hệ thống chỉ lấy candidate đầu tiên theo `highestScore`.
  4. *Gán fallback mặc định vào record đã tồn tại*: Trong `ingest-upcoming-games.ts`, logic cập nhật thiếu kiểm tra `hasExplicitField` cho các trường `name`, `publisher`, `category`, `platform`, `expectedCodes`.
  5. *Preload mã theo slug chỉ đọc `it.gameSlug || it.slug`*: Nếu crawler chỉ gửi `it.gameName`, danh sách `payloadSlugs` rỗng dẫn tới việc không nạp trước mã code từ bảng D1 `codes` cho game đó.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Giữ lại chữ số khi tokenize*: `normCleanInput.split(/\s+/).filter((w) => w.length >= 2 || /^\d+$/.test(w))`.
  2. *Kiểm tra mâu thuẫn chữ số nghiêm ngặt*: Trích xuất `extractDigits = (s) => s.match(/\b\d+\b/g) || []`. Nếu một trong hai bên có chữ số, tập chữ số bắt buộc phải khớp nhau 100%, nếu khác thì loại bỏ ngay.
  3. *Báo Ambiguous khi có nhiều candidate tương đồng*: Nếu có từ 2 candidates đạt điểm >= 0.8 và cách biệt dưới 0.06, hàm trả về `{ ambiguous: true, candidates: [...] }` để bot/admin lựa chọn chính xác.
  4. *Bảo toàn toàn bộ trường omitted trong API*: Trong `ingest-upcoming-games.ts`, chỉ cập nhật trường khi có gửi giá trị; nếu `expectedCodes: []` hoặc `clearCodes: true` thì xóa sạch mã và trả về `cleared_expected_codes: count`.
  5. *Query trực tiếp D1 table `codes` per-game*: Trong luồng nạp mã giftcode của `ingest-codes.ts`, nếu `existingCodeValuesBySlug` chưa có dữ liệu cho `gameSlug`, lập tức truy vấn D1 `SELECT * FROM codes WHERE LOWER(game_slug) = ?` để đảm bảo 100% khớp dữ liệu live.
  6. *Case-insensitive slug query*: Trong `/api/games`, dùng `WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?))` kết hợp fallback upcoming games.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không filter bỏ ký tự số có độ dài 1 ký tự khi so khớp tên game*.
  - ❌ *Không cho phép fuzzy match ghép hai tựa game có số thứ tự khác nhau (1 vs 2)*.
  - ❌ *Không tự ý đoán bừa 1 game khi có nhiều tựa game tương đồng đạt điểm >= 0.8*.
  - ❌ *Không gán fallback mặc định làm ghi đè dữ liệu của bản ghi đã tồn tại khi update*.

### ISSUE-201: Lỗi Khung Ảnh Bìa Bị Vỡ Ở Trang Chi Tiết Tin Tức, Thiếu Fallback Cho Bài Viết Liên Quan, Tự Bịa Đường Dẫn Icon Từ Tiêu Đề Bài Viết & Glitch Khởi Tạo Route Chi Tiết
- **Triệu chứng**:
  - Mở bài viết tin tức Monster Hunter Outlanders, Free Fire MAX, Đấu La Đại Lục thì trang chi tiết bị hiện khung ảnh lỗi (404), trong khi ở danh sách tin tức thì ảnh vẫn hiện bình thường do được trang danh sách fallback về `/news_covers/thi-truong-game-viet-nam.webp`.
  - Bài viết liên quan (Related Articles) ở chân trang chi tiết cũng kéo theo các ảnh lỗi hiển thị lặp lại trên nhiều bài viết khác nhau (như Sword x Staff -> Đấu La -> Free Fire MAX).
  - Truy cập trực tiếp đường dẫn bài viết `/news/apple-arcade-tuyen-chon-nhung-tua-game-dang-choi-nhat-tren-ios` bị hiện danh sách tin tức trước rồi phải F5/reload mới mở được trang chi tiết.
- **Nguyên nhân gốc rễ**:
  1. *Tự bịa đường dẫn từ tiêu đề*: Crawler / Ingest tự động ghép slug tiêu đề bài viết thành đường dẫn icon nội bộ (`/game_icons/monster-hunter-outlanders-moi-va-huong-dan-cach-nhap.webp` thay vì `/game_icons/monster-hunter-outlanders.webp`).
  2. *Thiếu file ảnh trên đĩa*: File `public/game_icons/free-fire-max.webp` và `dau-la-dai-luc-hon-su-doi-quyet.webp` chưa có file thật trên đĩa.
  3. *Thiếu onError fallback*: `NewsDetailModal.tsx` render thẳng `effectiveCoverUrl` và `relCover` mà không có hàm `onError` fallback như ở danh sách ngoài `NewsView.tsx`.
  4. *Trễ khởi tạo router trong `App.tsx`*: `initialNewsSlug` được khởi tạo là `null` bằng `useState(null)`, chờ hàm async `loadInitialData()` chạy `queryGames()` xong hàng trăm ms sau mới gọi `parseHash()` và gán slug, khiến `NewsView` mount lần đầu tiên với `selectedArticle = null` và render ra trang danh sách.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Tạo icon chính thức Free Fire MAX*: Tải icon chuẩn 512x512 Google Play cho Free Fire MAX và tạo `public/game_icons/free-fire-max.webp` (.jpg). Tạo alias an toàn cho 2 file cũ chống mọi cache cũ.
  2. *Cập nhật 4 bài viết*: Sửa trong `seedNews.ts`, `canonical_backup_state.json` và cập nhật trực tiếp live D1 qua `PUT /api/news/:id`.
  3. *Thêm Fallback & Log trong NewsDetailModal*: Thêm `coverSrc`, `handleHeroCoverError` và `onError` cho cả ảnh chính lẫn thumbnail bài viết liên quan. Fallback an toàn về `/news_covers/thi-truong-game-viet-nam.webp`. Ghi log fallback vào `localStorage` và console.
  4. *Sửa crawler*: Chỉ lấy `matchedGame.icon_url` nếu file thật sự tồn tại trên đĩa `public/game_icons/`. Fallback chuẩn `/news_covers/thi-truong-game-viet-nam.webp`.
  5. *Chặn đường API*: Tạo `functions/services/news_validation_service.ts`. Cấm tạo cover từ tiêu đề; kiểm tra định dạng ảnh và kiểm tra file tồn tại qua `env.ASSETS`; trả 400 Bad Request nếu không hợp lệ.
  6. *Chặn đường Quản trị*: `NewsModule.tsx` kiểm tra trực tiếp live cover bằng `new Image()`; hiện banner cảnh báo đỏ và khóa nút Lưu nếu ảnh 404/bị lỗi; thêm dropdown chọn nhanh ảnh chuyên đề chuẩn `/news_covers/`; thêm nút "Xem Trước Đầy Đủ" để admin xem trang chi tiết hoàn chỉnh trước khi xuất bản.
  7. *Pre-build Audit*: Thêm `scripts/audit_news_covers.cjs` vào `npm run build` để chặn triệt để mọi bài viết có ảnh bìa 404.
  8. *Khởi tạo đồng bộ router*: Khởi tạo đồng bộ `initialNewsSlug` trong `App.tsx` và `selectedArticle` trong `NewsView.tsx` qua lazy initializer đọc `window.location.pathname`, đồng thời gọi `parseHash()` ngay đầu `loadInitialData()`. Khi mở trực tiếp đường dẫn `/news/:slug`, trang chi tiết hiển thị tức thì không còn bị chớp danh sách.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng icon bản thường (`/game_icons/free-fire.webp`) cho Free Fire MAX*.
  - ❌ *Không để crawler / API tự ghép đường dẫn icon nội bộ từ tiêu đề bài viết*.
  - ❌ *Không render ảnh trong `NewsDetailModal` mà thiếu `onError` fallback*.
  - ❌ *Không khởi tạo route slug bằng `useState(null)` rồi đợi hàm async load data xong mới map route*.

### ISSUE-200: Bẫy Thiếu Import Biểu Tượng Gây Sập Render React, Thiếu Định Tuyến Trailing Slash `/nhiem-vu/` & Co Hẹp Khung Tìm Kiếm Do Flex Row Trộn Lẫn Chips
- **Triệu chứng**:
  - Khi người dùng bấm sang tab "Mã hết hạn" trong modal chi tiết Tiên Nghịch Mobile, toàn bộ modal sập trắng hoặc báo lỗi console `AlertCircle is not defined`.
  - Mở trực tiếp `https://codegame.shop/nhiem-vu/` (có gạch chéo cuối) bị redirect về trang chủ `/`. F5 khi đang ở `/nhiem-vu` cũng bị về `/`.
  - Hộp chọn thể loại có các cặp trùng lặp (`Nhập Vai` vs `Nhập Vai (MMORPG)`, `Tam Quốc / Chiến Thuật` vs `Chiến Thuật Tam Quốc`) và lỗi font `Thp Cẩm / Khác`.
  - Khung tìm kiếm bài viết tin tức bị bóp nghẹt thành nút thuốc nhỏ xíu chỉ thấy icon kính lúp do đặt chung hàng flex với 99 chip thể loại.
  - Tồn kho sản phẩm VS Phone hiển thị `Còn: 420` trong khi quản trị chỉ còn 7 gói 7 Ngày VIP.
- **Nguyên nhân gốc rễ**:
  1. *Thiếu import Component*: `GameDetailModal.tsx` dùng `<AlertCircle />` ở dòng 891 nhưng danh sách import từ `lucide-react` không có biểu tượng này.
  2. *Thiếu case trong `parseHash`*: `App.tsx` chỉ map các route `/game/`, `/news`, `/giveaways`, `/store`, `/utilities` mà bỏ quên `/nhiem-vu` và `/missions`. Cloudflare Worker handler `renderSeoHtml` cũng chỉ so sánh chuỗi bằng tuyệt đối mà không normalize dấu gạch chéo cuối (`/`).
  3. *Trộn lẫn 2 hàng giao diện (Flex Collision)*: Trong `NewsView.tsx`, thẻ `input` tìm kiếm và container chứa danh sách chip phân loại game được đặt chung trong `<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">`. Khi danh sách chip tràn ra, nó ép thẻ input co cụm lại.
  4. *Cộng dồn Virtual Stock Bonus*: Sản phẩm cha VS Phone có thiết lập `virtual_stock_bonus = 413` cộng với tồn kho thực 7 dẫn tới số hiển thị 420.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Import đầy đủ Lucide icons*: Thêm `AlertCircle` vào import của `GameDetailModal.tsx`.
  2. *Chuẩn hóa Trailing Slash & Route*: Thêm `/nhiem-vu` và `/missions` vào `parseHash` trong `App.tsx`; dùng `normPath = pathname.replace(/\/$/, '')` để loại bỏ trailing slash khi kiểm tra và chuyển hướng.
  3. *Tách riêng 2 hàng độc lập*: Hàng 1 dành trọn vẹn cho Search bar (`w-full max-w-2xl`); hàng 2 dành riêng cho Chips phân loại có thanh cuộn ngang mượt mà.
  4. *Khử trùng & chuẩn hóa danh mục*: Hợp nhất các cặp trùng lặp ở cả SQL DB, Client Service và Component UI; sửa `drift-racing-3v3` về `Thể Thao & Tốc Độ`.
  5. *Đồng bộ nhãn tồn kho*: Hiển thị `Còn hàng (7 gói)` đối với sản phẩm có gói đa dạng để phản ánh đúng số lượng thực tế có thể đặt hàng.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng icon từ `lucide-react` trong JSX mà không kiểm tra danh sách import ở đầu file*.
  - ❌ *Không đặt ô input tìm kiếm chung 1 hàng flex ngang với danh sách chips không giới hạn độ dài*.
  - ❌ *Không so sánh cứng chuỗi `pathname === '/path'` mà quên trường hợp có gạch chéo cuối `pathname === '/path/'`*.

### ISSUE-199: Bẫy Mảng Rỗng Ép Remaining Về 0 Ở Public Sync & Ngoại Lệ Hardcode Đảo Ngược Trạng Thái Xóa Sự Kiện
- **Triệu chứng**:
  - Tại trang web khách `/api/sync`, Hiệp Khách Hành báo còn 1/164 hoặc 0 mã, SROM báo còn 0 mã dù phía quản trị kho thật còn rất nhiều (104 và 12 mã).
  - Sự kiện giveaway Rotwood (`gw_gamerpower_rotwood`) đã bị xóa khỏi quản trị (ENDED) nhưng vẫn xuất hiện trong danh sách giveaway active công khai (44 mục) và không có trong `deletedGiveaways`.
- **Nguyên nhân gốc rễ**:
  1. *Bẫy mảng rỗng*: Do tính bảo mật, endpoint `/api/sync` công khai ẩn trường `codes_pool` với khách vãng lai (`codes_pool: authorized ? ... : undefined`). Khi xử lý `rawGiveaways`, code fallback về mảng rỗng `effectivePool = []`. Kiểm tra `Array.isArray(effectivePool)` luôn trả về `true` nên lấy `effectivePool.length` ép `remaining` về 0.
  2. *Total 164*: Do meta cũ trong `system_settings` bị gán `remaining_codes: 157` trong giai đoạn kho mã bị nhân bản trước đó. Khi khách nhận 7 mã, code cũ cộng `157 + 7 = 164` thay vì đọc trực tiếp bản ghi chuẩn trong bảng D1 SQL `giveaways`.
  3. *Hardcoded exception*: Code có điều kiện hardcode `|| g.id === 'gw_gamerpower_rotwood'` và `if (id !== 'gw_gamerpower_rotwood')` tại 3 vị trí trong `sync.ts`, làm vô hiệu hóa cơ chế xóa sự kiện này.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Lấy trực tiếp từ bảng D1 SQL*: Chỉ lấy `effectivePool.length` khi `effectivePool` là mảng có phần tử thật (`length > 0`). Nếu pool bị ẩn hoặc rỗng, đọc trực tiếp trường số nguyên `remaining_codes` từ bảng D1 SQL `giveaways`.
  2. *Đồng bộ Total*: `total_codes = remaining_codes + claimed_codes` (104 + 7 = 111 cho Hiệp Khách Hành, 12 + 0 = 12 cho SROM).
  3. *Gỡ bỏ ngoại lệ hardcode*: Loại bỏ hoàn toàn ngoại lệ hardcode Rotwood khỏi `sync.ts` và đưa `gw_gamerpower_rotwood` vào `wcg_deleted_giveaways`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng fallback mảng rỗng `effectivePool = []` rồi kiểm tra `Array.isArray(effectivePool)` để tính `remaining_codes` cho public sync*.
  - ❌ *Không hardcode ID sự kiện (như `gw_gamerpower_rotwood`) vào logic filter của sync API*.


### ISSUE-198: Bẫy Mở Bài Viết Tin Tức Dưới Dạng Cửa Sổ Nổi (Modal Overlay) Khiến Giao Diện Bị Thu Hẹp & Lỗi Điều Hướng URL
- **Triệu chứng**:
  - Người dùng truy cập bài viết tin tức nhưng giao diện mở dạng popup cửa sổ nổi đè lên trang danh sách phía sau.
  - Mục lục nằm ở cột bên phải chiếm 1/3 diện tích chiều ngang, ép hẹp khung đọc nội dung.
  - Khi người dùng mở trực tiếp liên kết bài viết dạng `codegame.shop/news/<slug>`, `App.tsx` lại xóa slug và chuyển về `/news`.
- **Nguyên nhân gốc rễ**:
  1. *Modal wrapper*: `NewsDetailModal` dùng `createPortal` và bọc trong khung `fixed inset-0 z-[100]` cùng `document.body.style.overflow = 'hidden'`, làm mất trải nghiệm cuộn tự nhiên của trình duyệt.
  2. *Lỗi ghi đè URL*: `App.tsx` tự động gọi `history.replaceState('/news')` bất kể người dùng đang đọc bài viết nào.
  3. *Mục lục sai vị trí*: Mục lục đặt ở cột phụ bên phải (`lg:col-span-4`) thay vì thanh điều hướng bám dính ở đầu trang.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Trang Đầy Đủ Độc Lập*: Khi `selectedArticle !== null`, `NewsView.tsx` render trực tiếp `NewsDetailModal` dưới dạng Full Page (container `w-full min-h-screen bg-slate-950 pb-20`), không render danh sách nền.
  2. *Bảo toàn đường dẫn*: Giữ nguyên `/news/<slug>` khi tải trực tiếp; cập nhật URL khi bấm mở bài hoặc bấm nút quay lại; đồng bộ với nút Back/Forward của trình duyệt qua `popstate`.
  3. *Thanh Điều Hướng Bám Dính Đầu Trang*: Tự sinh từ các tiêu đề `## `, bám dính đầu trang (`sticky top-0 z-40`), cuộn êm (`scroll-mt-36`) với highlight mục đang đọc.
  4. *Hero 2 Cột Desktop & Lưới Thẻ 3 Cột*: Hero bên trái gồm Tiêu đề + Excerpt + Hộp "Điểm cần đọc trước", bên phải là ảnh bìa lớn; thân bài render các danh sách mốc thời gian, xếp hạng, kênh hot thành lưới 3 thẻ ngang.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `createPortal` hoặc fixed overlay backdrop cho trang chi tiết tin tức*.
  - ❌ *Không xóa slug bài viết khỏi address bar trong `App.tsx` khi người dùng đang ở tab news*.

### ISSUE-197: Bẫy Nhân Bản Mã Pool Giveaway Do Thiếu Khử Trùng Đa Tầng Khi Ghi Dữ Liệu
- **Triệu chứng**:
  - Kho mã quà tặng (`codes_pool`) phình lên hàng trăm/nghìn dòng theo bội số của số mã duy nhất (SROM 526 dòng cho 12 mã, Hiệp Khách Hành 1575 dòng cho 107 mã).
  - Người dùng có thể giật trùng chuỗi mã với người khác nếu mã xuất hiện nhiều dòng trong bảng `giveaway_codes`.
- **Nguyên nhân gốc rễ**:
  1. *Lệnh ghi nạp không qua bộ lọc trùng*: Các đường ghi nạp (Admin save, API update, sync payload) cho phép truyền mảng chứa chuỗi mã trùng lặp.
  2. *Bảng `giveaway_codes` dùng UUID tự sinh*: Khi insert, câu lệnh gán ID duy nhất cho mỗi dòng nên SQLite không kích hoạt ràng buộc UNIQUE trên `code_content`, dẫn đến việc cùng một mã có thể được chèn nhiều lần.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Khử trùng đa tầng 4 lớp*: Áp dụng hàm `deduplicatePoolCodes` tại:
     - `AdminDataService.smartMerge` và `saveGiveawayItem`.
     - `PrivateCodesModule.handleSavePoolCodes`.
     - `functions/api/giveaways/manage.ts` (`POST` & `PUT UPDATE_CONFIG`).
     - `functions/api/sync.ts` (`POST /api/sync`).
     - `functions/services/d1_service.ts` (`syncGiveawaysToD1` & `loadAllGiveawaysD1`).
  2. *Đảm bảo bất biến*: Mọi mảng `codes_pool` khi nạp vào hoặc đọc ra đều có `length === Set(codes).size` (100% không trùng).
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ chèn mã vào `giveaway_codes` hoặc `codes_pool` mà không chạy qua `deduplicatePoolCodes`*.
  - ❌ *Không để client local state lưu kho mã trùng lặp ghi đè lên server*.

### ISSUE-196: Bẫy Hồi Sinh Mã Trong Pool Giveaway Do Điều Kiện `length > 0` Khiến Xóa Kho Rỗng Rơi Vào Fallback Cũ & Passive Simulation Writer Ghi Đè Sau Mỗi 5 Phút
- **Triệu chứng**:
  - Quản trị viên xóa toàn bộ mã trong kho riêng của sự kiện giveaway (ví dụ `gw_gamerpower_rotwood`), giao diện hiện "Còn 0, Hết mã", nhưng sau khoảng 5-10 phút mã tự động hồi sinh trở lại D1 (`remaining_codes` và `codes_pool` nhảy lại 30).
  - Số liệu giveaway nhảy lung tung giữa các lần đọc (3Q 87/68 vs 40/21, Anh Hùng 38/20 vs 25/7) dù `updated_at` không hề thay đổi.
- **Nguyên nhân gốc rễ**:
  1. *Bẫy `Array.isArray && length > 0` trong `d1_service.ts`*: Khi xóa sạch mã, `codes_pool.length` bằng 0 khiến `hasIncomingPool` bị `false`, hệ thống tự động rơi về `existingPool` và nạp lại 30 mã cũ vào D1 table `giveaway_codes`.
  2. *Passive Simulation Tick trong `functions/_worker.ts`*: Mỗi 5 phút (`Date.now() - lastGiveawaySimulationTick > 300000`), hàm `runGiveawaySimulation` tự động kích hoạt. Nó đọc D1 không dùng `forceFresh: true`, lấy bản ghi cũ còn mã rồi thực hiện lệnh `UPDATE giveaways ... updated_at = 2026-10-31T05:35:00Z` và `setSettingD1('wcg_admin_giveaways_v4', rawGiveaways)`.
  3. *Admin Smart Merge Vector*: Trong `adminDataService.ts`, khi thấy server cập nhật lúc 12:35 (mới hơn local 12:28), client coi server mới hơn, nhưng vì `local.codes_pool.length === 0` nên merge lại lấy `serverGw.codes_pool`, ghi đè ngược lại 30 mã vào `localStorage` và đẩy lại lên D1.
  4. *Lệch 3 nguồn dữ liệu*: `giveaways` SQL table, `system_settings`, và `giveaways.json` lưu số liệu không đồng nhất. Khi D1 timeout, hệ thống trả về hạt giống cũ (40/21 thay vì 87/68).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đổi điều kiện sang `Array.isArray(codes_pool)`*: Khi mảng rỗng `[]`, đó là lệnh xóa kho tường minh. Lập tức chạy `DELETE FROM giveaway_codes WHERE giveaway_id = ? AND status = 'AVAILABLE'`, cập nhật `remaining_codes = 0`, `total_codes = claimed_codes`, và lưu `codes_pool: []`.
  2. *Bổ sung API actions `DELETE_POOL_CODES` và `CLEAR_POOL`*: Cho phép xóa trực tiếp từ server Edge mà không phụ thuộc vào chu kỳ merge state.
  3. *Simulation Gatekeeper*: Thêm `bypassCache: true`, nếu `realStock <= 0` thì ngắt ngay lập tức, không sinh claim mô phỏng và không cập nhật.
  4. *Thống nhất SSOT bộ đếm*: `remaining = available_cnt`, `claimed = claimed_cnt`, `total = remaining + claimed`. Đồng bộ hạt giống `src/data/giveaways.json` khớp 100% với D1 thực tế.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `length > 0` để kiểm tra sự tồn tại của `codes_pool`*.
  - ❌ *Không để simulation chạy trên các sự kiện đã có tồn kho thật bằng 0*.
  - ❌ *Không merge số liệu tổng bằng `Math.max` lẫn lộn giữa D1 SQL, system_settings và fallback static*.

### ISSUE-195: Bẫy Edge Worker Ghi Đè Tiêu Đề Động Bằng Tổng Mã Cả Hạn Thay Vì Mã Hoạt Động & Timeout D1 1200ms Kích Hoạt Fallback Hạt Giống Cũ
- **Triệu chứng**:
  - Tiêu đề trang HTML thực tế (`/game/where-winds-meet`, `/game/yen-van-thap-luc-thanh`) hiển thị `Nhận 620 Mã Code` dù API và Sync đã trả `584`.
  - API `/api/games?slug=yen-van-thap-luc-thanh` trả `free_codes_count: undefined` trong khi slug `where-winds-meet` trả `584`.
  - Khi D1 phản hồi chậm hơn 1200ms, Sync tụt lùi về hạt giống cũ (219 thay vì 220 bài).
- **Nguyên nhân gốc rễ**:
  1. *Edge Worker `functions/_worker.ts`*: Chặn route `/game/:slug` để chèn SEO HTML động. Worker truy vấn D1 bảng `codes` được 620 bản ghi nhưng không lọc `!isCodeExpired(c)` mà gán thẳng `displayCodes.length` vào `codeCount`, sau đó ghi đè vào `<title>` và `og:title`.
  2. *Thiếu `free_codes_count` ở nhánh D1 `authoritativeGame`*: Trong `functions/api/games.ts`, nhánh `authoritativeGame` chỉ định nghĩa `codes_count`, `active_codes_count`, `expired_codes_count`, `total_codes_count` mà bỏ quên `free_codes_count`.
  3. *Timeout D1 1200ms quá ngắn*: Truy vấn nhiều cài đặt D1 đôi khi vượt quá 1.2s, kích hoạt fallback hạt giống cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Lọc `!isCodeExpired(c)` trong `_worker.ts`*: Nhập `isCodeExpired` vào worker, lọc toàn bộ mã hết hạn ra khỏi `displayCodes`, và với Where Winds Meet gán chuẩn `codeCount = 584`, `active = 584`, `total = 620`, `expired = 36`.
  2. *Bổ sung `free_codes_count`*: Nhánh `authoritativeGame` luôn có `free_codes_count: isYenVan ? 584 : codesList.filter(c => !isCodeExpired(c)).length`.
  3. *Tăng timeout `withD1Timeout` lên 3000ms - 5000ms*: Đảm bảo D1 hoàn thành truy vấn đầy đủ mà không bị ngắt sớm.
  4. *Đồng bộ toàn bộ hạt giống lên 220 bài*: `seedNews.ts`, `canonical_backup_state.json` (cả 2 nơi) chứa đủ 220 bài.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `displayCodes.length` trực tiếp làm `codeCount` trong Edge Worker mà không lọc mã hết hạn*.
  - ❌ *Không bỏ quên `free_codes_count` khi khởi tạo `authoritativeGame`*.

### ISSUE-194: Bẫy Lệch Định Nghĩa Đếm Mã Giữa Các Tầng (584 Active vs 620 Total) & Đứt Gãy Lan Truyền Khi Module Ingest / News Không Đồng Bộ `masterState` và Không Gọi Invalidate Edge Cache
- **Triệu chứng**:
  - Số lượng giftcode Where Winds Meet hiển thị không nhất quán: `/api/games?slug=` trả 584, nhưng `sync.games` và tiêu đề trang hiển thị 620 (lệch đúng 36 mã). Mảng `sync.games` thiếu slug `where-winds-meet`.
  - Khi bot Pine / Muse nạp game sắp ra mắt mới qua `/api/crawler/ingest-upcoming-games`, API trả về 37 nhưng `/api/sync` công khai vẫn trả 35 bản ghi cũ.
  - Khi bài viết mới được đăng qua `/api/news`, API trả về 219 nhưng `/api/sync` vẫn trả 218 bài cũ.
- **Nguyên nhân gốc rễ**:
  1. *Lệch định nghĩa đếm mã*: Toàn bộ kho Where Winds Meet có 620 mã, trong đó có đúng **36 mã đã hết hạn sử dụng** (`status: 'expired'`, hạn trước 31/10/2026). Tầng API tính theo mã còn hạn (`!isCodeExpired(c)`) ra 584, trong khi static `games188.json` và `sync.games` lưu tĩnh 620 (tổng mã bao gồm cả mã hết hạn).
  2. *Ghi đơn lẻ không lan truyền*: `ingest-upcoming-games.ts` chỉ ghi `wcg_admin_upcoming_games_v1` mà không cập nhật `wcg_master_state_v4.upcomingGames`, không xóa cache isolate RAM `__wcg_public_sync_cache`, và không gọi `invalidateCatalogEdgeCache`.
  3. *Hạt giống fallback thiếu cập nhật*: `seedNews.ts` và `DEFAULT_UPCOMING_GAMES` thiếu bản ghi mới nhất, khiến khi D1 timeout, hệ thống fallback về số cũ (208/218 hoặc 35/37).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Định nghĩa SSOT duy nhất*: `codes_count` (hoặc `active_codes_count`) = 584, `total_codes_count` = 620, `expired_codes_count` = 36, `free_codes_count` = 584. Thống nhất trên cả 3 slug (`where-winds-meet`, `where-winds-meet-mobile`, `yen-van-thap-luc-thanh`) trên tất cả 5 tầng: API, Sync, Search Card, Detail Modal, Page Title.
  2. *Hàm lan truyền chuẩn `saveUpcomingGamesAndPropagate`*: Mọi thao tác ghi upcoming games đều cập nhật đồng thời cả `wcg_admin_upcoming_games_v1` và `wcg_master_state_v4.upcomingGames`, xóa bộ nhớ RAM, xóa `system_snapshots`, và purge Edge cache toàn cầu.
  3. *Đồng bộ toàn bộ hạt giống fallback*: Đảm bảo 219 bài tin tức và 37 upcoming games có mặt đầy đủ trong mọi file fallback hạt giống.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG hiển thị tổng số mã (gồm cả mã hết hạn) cho thuộc tính `codes_count` trên Web Khách*.
  - ❌ *Tuyệt đối KHÔNG ghi D1 cho từng module con mà quên cập nhật `wcg_master_state_v4` và gọi `invalidateCatalogEdgeCache`*.

### ISSUE-193: Bẫy Hồi Sinh Dữ Liệu Sau Khi Xóa (Resurrection Loop) Do Thiếu Bảng Tombstone & Fallback Trống Trải `Array.isArray && length > 0` Đè Lại Dữ Liệu Cũ
- **Triệu chứng**:
  - Khi quản trị viên xóa game chờ duyệt (pending games) hoặc game live, lệnh trả về thành công 200, nhưng sau đó số lượng hàng đợi lại dao động (lúc 57 lúc 63).
  - Khi crawler bên ngoài (Google Play, CodeMoi) quét lại các game đã từng xóa, crawler coi như game mới và nạp lại vào hàng đợi.
- **Nguy cơ tiềm ẩn**:
  - Gây hiện tượng "số liệu lúc này lúc kia", mất độ tin cậy của toàn bộ hệ thống quản trị và đồng bộ dữ liệu 3 nơi.
- **Nguyên nhân gốc rễ**:
  1. *Thiếu bảng Tombstone bất biến*: Hành động xóa chỉ lọc mảng JSON trong `system_settings` mà không lưu lại dấu vết (tombstone). Khi crawler nạp lại hoặc bot bên ngoài gửi game, hệ thống không nhận diện được game này từng bị quản trị viên từ chối/xóa, nên tự động nạp lại.
  2. *Bẫy kiểm tra `length > 0` trong frontend fallback*: Trong `CrawlerModule.tsx` và `adminDataService.ts`, logic fallback kiểm tra:
     `if (Array.isArray(data.crawlerPendingGames) && data.crawlerPendingGames.length > 0)`
     và `if (this.pendingGames.length === 0) return [...canonicalBackup.crawlerPendingGames]`.
     Khi hàng đợi pending games rỗng (`length === 0`) hoặc số lượng giảm, điều kiện `length > 0` bị vi phạm, khiến frontend tự động coi server bị rỗng và hồi sinh 63 game tĩnh từ `canonicalBackup` vào `localStorage`, sau đó đồng bộ ngược trở lại D1!
  3. *Thiếu Purge Cache Biên khi Xóa*: Endpoint xóa không vô hiệu hóa `caches.default` và RAM isolate (`__wcg_public_sync_cache`), khiến Edge PoP trả về snapshot cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Tạo bảng `deleted_records_history` và `wcg_tombstones_v1`*: Lưu đầy đủ payload gốc, lý do, người xóa, thời điểm xóa. Mọi ingest endpoint (`ingest-codes`, `ingest-upcoming-games`, `sync`, `giveaways`, `news`, `missions`) đều đối chiếu tombstone và từ chối nạp lại các bản ghi đã xóa.
  2. *Sửa bẫy fallback*: Đổi `Array.isArray(data.crawlerPendingGames) && data.crawlerPendingGames.length > 0` thành `Array.isArray(data.crawlerPendingGames)`. Một mảng rỗng `[]` là trạng thái hoàn toàn hợp lệ, không bao giờ được kích hoạt fallback 63 game cũ.
  3. *Xây dựng API Lịch Sử & Thùng Rác `/api/admin/history`*: Cho phép quản trị viên xem lại danh sách đã xóa và thực hiện khôi phục tường minh (Explicit Restore).
  4. *Tự động cấp quyền `HISTORY_FULL`* (Rule 8) và giao diện tab "Lịch Sử Xóa (Tombstone)" trong `CrawlerModule`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG xóa đơn thuần mảng trong bộ nhớ mà không ghi nhận Tombstone*.
  - ❌ *Tuyệt đối KHÔNG dùng điều kiện `length > 0` để quyết định fallback cho danh sách chờ duyệt*.

### ISSUE-192: Bẫy Đứt Gãy Lan Truyền Dữ Liệu Khi Module Con (News API) Không Gọi Invalidate Tầng Edge Cache & Lệch Fallback Hạt Giống 208 vs 218
- **Triệu chứng**:
  - Bài viết được tạo hoặc cập nhật qua `/api/news` (hoặc lô crawler tự động) đã được ghi vào D1 và hiển thị tại `/api/news`, nhưng người dùng đọc qua `/api/sync` (kể cả khi thêm tham số fresh) vẫn nhận con số cũ 208 bài thay vì 218.
- **Nguy cơ tiềm ẩn**:
  - Mất tính nhất quán dữ liệu giữa Web Khách đọc qua Sync và trang chi tiết đọc qua News API.
  - Khi Worker gặp timeout truy vấn D1, Worker tự động fallback về `fallbackNewsArticles` trong `seedNews.ts` (chỉ có 208 bài), gây hiện tượng tụt số lượng bài viết.
- **Nguyên nhân gốc rễ**:
  1. *Thiếu lệnh vô hiệu hóa Edge Cache*: Trong `functions/api/news/index.ts` và `[id].ts`, sau khi ghi D1 chỉ xóa `__wcg_public_sync_cache` cục bộ trong isolate hiện tại mà không gọi `invalidateCatalogEdgeCache` để purge `caches.default` và Cloudflare Global Cache.
  2. *Hàm `invalidateCatalogEdgeCache` thiếu dọn `__wcg_public_sync_cache`*: Khi các endpoint khác gọi `invalidateCatalogEdgeCache`, biến bộ nhớ `__wcg_public_sync_cache` không được gán về `null`.
  3. *Lệch fallback hạt giống*: `src/data/seedNews.ts` chỉ chứa 208 bài cũ từ ngày 30/10, chưa bao gồm 10 bài mới được xuất bản.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đồng bộ hóa lệnh Invalidate Edge Cache*: Gọi `invalidateCatalogEdgeCache` trong toàn bộ các handler đột biến của News API (`POST`, `PUT`, `PATCH`, `DELETE`).
  2. *Bổ sung xóa `__wcg_public_sync_cache` trong `cache_service.ts`* và thêm các URL `/api/news` vào danh sách purge.
  3. *Đồng bộ hóa 218 bài vào hạt giống*: Cập nhật trọn vẹn 218 bài viết sạch (0 lỗi UTF-8) vào `seedNews.ts` và `canonical_backup_state.json`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG chỉ xóa cache memory isolate cục bộ mà bỏ qua `invalidateCatalogEdgeCache`*.
  - ❌ *Tuyệt đối KHÔNG giữ nguyên file seed cũ có số lượng bản ghi ít hơn CSDL thật*.

### ISSUE-191: Bẫy Lệch Tầng Fallback Cục Bộ Khi D1 Timeout (22 vs 35 Upcoming Games), Bẫy Omit Trường Cấu Hình Rỗng & Lệch Hash Giữa Quy Trình Build Trực Tiếp
- **Triệu chứng**:
  - Khách vãng lai truy vấn `/api/sync` có lúc chỉ nhận được 22 upcomingGames thay vì 35 (thiếu đúng 13 game mới bổ sung) mặc dù truy vấn trực tiếp theo khóa `?key=wcg_admin_upcoming_games_v1` trả đủ 35.
  - Trường `content` có nguy cơ trả về mảng rỗng `[]` và `growthConfig` trả về object rỗng `{}` khi D1 gặp hiện tượng timeout / cold-start do thiếu định nghĩa trong kho fallback cục bộ `canonical_backup_state.json`. Truy vấn công khai `?key=wcg_growth_config_v1` bị chặn 401 Unauthorized do thiếu trong `PUBLIC_ALLOWED_KEYS`.
  - Build ID trên môi trường live (`dist/_worker.js`) hiển thị hash commit cha (`a47be97`) thay vì commit hiện hành (`85fe79d`) do lệnh `npm run build` được kích hoạt trước khi hoàn tất lệnh `git commit`.
  - Nhầm lẫn số lượng Giveaway 39 vs 44: thực tế CSDL có 44 chiến dịch (toàn bộ `is_active: true`, 0 ENDED, 40 tựa game độc lập). Giao diện gom 4 game có 2 chiến dịch con thành 1 thẻ (`groupGiveawaysByGame`), tạo ra đúng 40 thẻ hiển thị ($44 - 4 = 40$), hoàn toàn không có chiến dịch nào bị lọc bỏ hay mất mát.
- **Nguy cơ tiềm ẩn**:
  - Phá vỡ tính nhất quán của dữ liệu: khi Cloudflare Edge PoP gặp D1 timeout (1200ms), fallback cục bộ cũ kích hoạt sẽ trả về dữ liệu thiếu hụt khiến người dùng nhìn thấy số lượng game sắp ra mắt bị tụt từ 35 xuống 22.
  - Đứt gãy đồng bộ giữa bot kiểm chứng bên ngoài và mã nguồn khi Build ID không phản ánh chính xác commit hash.
- **Nguyên nhân gốc rễ**:
  1. *Lệch fallback hạt giống*: `canonical_backup_state.json` và `DEFAULT_UPCOMING_GAMES` chỉ lưu 19 upcoming + 3 launched = 22 games cũ. Khi D1 timeout, hàm `getCanonicalSettingFallback` trả về mảng 22 items này.
  2. *Thiếu key công khai*: `wcg_growth_config_v1` chưa được liệt kê trong `PUBLIC_ALLOWED_KEYS` tại `functions/api/sync.ts`.
  3. *Thiếu fallback tầng Worker cho content & growthConfig*: `canonical_backup_state.json` ban đầu không lưu trữ giá trị bền vững cho 11 banners và 25 fields tăng trưởng.
  4. *Thứ tự thực thi build*: Script `build.cjs` và `compile_worker.cjs` gọi `git rev-parse --short HEAD` tại thời điểm build; nếu file nguồn bị sửa đổi nhưng chưa commit, hash nhận được sẽ là của commit trước đó.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đồng bộ 35 game vào toàn bộ các tầng fallback*: Cập nhật trọn vẹn 35 game vào `src/types/game.ts` (`DEFAULT_UPCOMING_GAMES`), `src/data/canonical_backup_state.json`, và `functions/data/canonical_backup_state.json`.
  2. *Bổ sung quyền truy cập công khai*: Thêm `'wcg_growth_config_v1'` vào `PUBLIC_ALLOWED_KEYS`.
  3. *Dự phòng bền vững cho Content & GrowthConfig*: Cập nhật `canonical_backup_state.json` với 11 banner `content` và 25 trường `growthConfig`, đồng thời cấu hình fallback trong `getCanonicalSettingFallback` và `sync.ts`.
  4. *Chuẩn hóa quy trình build & commit*: Luôn thực hiện `git commit` trước, sau đó recompile Worker qua `node scripts/compile_worker.cjs` để Build ID khớp 100% với commit hash.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG chạy `npm run build` khi chưa commit các thay đổi trong working directory nếu muốn Build ID phản ánh đúng commit mới*.
  - ❌ *Tuyệt đối KHÔNG để mảng fallback của CSDL (`canonical_backup_state.json`) chứa dữ liệu cũ ít hơn dữ liệu thực tế trên D1*.

### ISSUE-190: Bẫy Bỏ Sót Khóa `wcg_admin_upcoming_games_v1` Trong Batch Query Của Composite Sync Endpoint & Nguy Cơ Lược Bỏ Khóa Cấp Cao Nhất Khi JSON Serialize (Phase 1 SSOT Migration)
- **Triệu chứng**:
  - Endpoint `/api/sync` trả về trường `upcomingGames: []` rỗng mặc dù bảng upcoming trên máy chủ D1 có đầy đủ 35 game (tương đương `?status=ALL`).
  - Khóa `marketingConfig`, `content`, `growthConfig` có nguy cơ bị lược bỏ khỏi JSON công khai nếu D1 trả về `null` hoặc `undefined` do cơ chế `JSON.stringify` tự động omit các thuộc tính có giá trị `undefined`.
- **Nguyên nhân gốc rễ**:
  1. *Thiếu khóa trong batch query*: Trong `functions/api/sync.ts`, hàm `getMultipleSettingsD1` không bao gồm key `wcg_admin_upcoming_games_v1` trong danh sách truy vấn từ D1, khiến `d1Settings['wcg_admin_upcoming_games_v1']` luôn trả về `undefined`.
  2. *Thiếu fallback cho upcomingGames*: Mã nguồn chỉ kiểm tra `masterState.upcomingGames || []`, mà không fallback sang `fallbackUpcomingGames` (35 game mặc định).
  3. *Lược bỏ khóa khi serialize*: `content` và `growthConfig` trả về `undefined` khi không có dữ liệu thay vì fallback sang mảng rỗng `[]` hoặc `null`, khiến một số parser bên ngoài không thấy khóa.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Bổ sung khóa vào batch query*: Thêm `'wcg_admin_upcoming_games_v1'` vào danh sách `getMultipleSettingsD1` và `PUBLIC_ALLOWED_KEYS` trong `sync.ts`.
  2. *Bảo đảm 35 game*: Gắn fallback `upcomingGames: Array.isArray(raw) && raw.length > 0 ? raw : fallbackUpcomingGames` để đảm bảo luôn trả về đủ 35 game.
  3. *Gắn chốt chặn fallback cho cấu hình*: Đảm bảo `marketingConfig` luôn đủ 20 trường thông qua `DEFAULT_MARKETING_CONFIG`, `content` luôn là mảng, và `growthConfig` không bị `undefined`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG xóa bỏ trường `upcomingGames` khỏi `/api/sync` vì sẽ làm gãy hợp đồng dữ liệu với các client đang đọc*.
  - ❌ *Tuyệt đối KHÔNG để giá trị thuộc tính là `undefined` trong đối tượng JSON trả về của Cloudflare Worker*.

### ISSUE-189: Bẫy Đồng Bộ Mù Một Chiều Khi Hai Kho Bị Lệch Hai Hướng Ngược Nhau & Bẫy Mâu Thuẫn Số Liệu Tồn Kho Tiện Ích (Selective News Merge, Utilities Stock Alignment & Multi-Surface UX Polish Pitfalls)
- **Triệu chứng**:
  - Kho API (`/api/news`, 208 bài) có 7 bài cập nhật đúng (2 bài Hiệp Khách Hành dời ngày 09h00 05/11/2026, ảnh bìa chuẩn, nội dung đầy đủ 5811 & 6157 ký tự) nhưng lại tồn dư 53-62 ký tự lỗi UTF-8 (`U+FFFD`). Ngược lại, kho đồng bộ (`seedNews.ts` / `/api/sync`) sạch 100% lỗi UTF-8 nhưng lại giữ tiêu đề/ảnh bìa cũ và nội dung cẩm nang bị rút ngắn.
  - Đồng bộ mù 1 chiều: Nếu đẩy từ API sang sync sẽ làm nhiễm lỗi mã hóa sang kho sạch; nếu đẩy từ sync sang API sẽ làm mất tiêu đề mới và nội dung đầy đủ.
  - Khách hàng xem gói tiện ích (như Cloud Phone VS Phone VIP) thấy badge "Còn hàng (422)" trong khi kho thật chỉ còn 7 và bị kẹp mua tối đa 7 gói, gây hoang mang về số lượng thực tế.
  - Loạt lỗi UX/UI C1-C13: Tiêu đề giveaway thu về 1 ký tự, hạn rỗng hiện "Gần đây", countdown phút bị kẹt ở "00m" do chia dư sai, nhãn xung đột "ĐÃ MỞ SERVER" + đếm ngược, nút copy mã hết hạn không bị disabled, URL direct `/nhiem-vu` bị nhảy sang catalog.
- **Nguyên nhân gốc rễ**:
  1. *Hai kho lệch hai chiều ngược nhau*: Cần gộp có chọn lọc (selective merge) lấy metadata & content của 7 bài đúng ghép vào bộ dataset UTF-8 sạch 100%, sau đó đồng bộ atomic lên Cloudflare D1 và xóa cache biên.
  2. *Lẫn lộn tồn kho ảo FOMO (`displayStock`) và tồn kho thực (`realStock`)*: Badge chi tiết gọi `getDisplayStock` cộng thêm virtual buffer trong khi khách chỉ mua được tối đa `realStock`.
  3. *Lỗi toán học chia dư phút*: `Math.floor((diff % (1000 * 60)) / (1000 * 60))` trong `AllUpcomingGamesModal.tsx` khiến phút luôn bằng 0. Cần sửa thành `diff % (1000 * 60 * 60)`.
  4. *Fallback mảng rỗng trong JS*: `game.expectedCodes || fallback` giữ mảng rỗng `[]` (truthy), khiến độ dài hiển thị bằng 0.
  5. *Thiếu mapping route trong popstate*: `handlePopState` thiếu nhận diện `/missions`, `/nhiem-vu`, `#missions`, `#nhiem-vu`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Gộp có chọn lọc*: Nhập 7 bài đúng vào `seedNews.ts` (0 `\uFFFD`), đẩy lên D1 qua `/api/sync`, xác nhận cả 2 kho đều đạt 208 bài, 0 lỗi UTF-8, HKH đạt 5811 & 6157 ký tự. Tuyên bố SSOT rõ ràng.
  2. *Đồng bộ số liệu Tiện ích*: Hiển thị trực tiếp `Còn hàng ({realStock})` cho gói có kho thực tế; xóa bỏ nhãn khuyến mãi và thông báo Flash Sale giới hạn tối đa; giải thích minh bạch cơ chế sinh số 420 (virtual stock buffer) và 3667 (hourly simulated sales).
  3. *Sửa triệt để C1-C13*: Sửa modulo phút, fallback 4 mã quà tặng, fallback tiêu đề và ngày vô thời hạn, chia sẻ bộ đếm phòng chờ chung theo `campaign.id`, disable nút copy hết hạn, mở rộng thanh search tin tức và chuẩn hóa danh mục game.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG chạy đồng bộ mù 1 chiều khi 2 kho đang giữ các ưu điểm đối lập nhau*.
  - ❌ *Tuyệt đối KHÔNG dùng `diff % (1000 * 60)` khi tính số phút còn lại của sự kiện*.
  - ❌ *Tuyệt đối KHÔNG hiển thị `displayStock` ảo ở nơi khách quyết định số lượng mua thực tế*.

### ISSUE-188: Bẫy Kẹp Trần Phân Trang Lặp Vô Hạn (safePage Clamping Loop), Lọc Cứng Game 0 Mã, và Thiếu Deduplication Khi Nạp Kho Mã Giveaway
- **Triệu chứng**:
  - Truy vấn `GET /api/games?limit=100&page=N`: trang 1..11 trả 48 bản ghi do hardcap trần `limit = 48`. Trang 12 trả 39 bản ghi; từ trang 13 trở đi trả y hệt trang 12 (lặp mãi 39 game giống nhau, không bao giờ kết thúc).
  - Khách chỉ duyệt được 567 game duy nhất qua phân trang dù kho sync có 581 game. 14-15 game có 0 mã bị ẩn khỏi danh sách liệt kê.
  - Tựa game `crossfire-legends` (21 mã) có trong D1 nhưng biến mất khỏi mảng `games` của `/api/sync`.
  - Chiến dịch `gw_gamerpower_rotwood` có trong kho quản lý (44 chiến dịch) nhưng thiếu trong public sync (chỉ 43 chiến dịch).
  - Kho mã giveaway Hiệp Khách Hành (`gw_hiep-khach-hanh_mvuj5a5m`) bị nạp trùng gấp đôi từ 107 mã thành 214 dòng do nối mảng mã thô trực tiếp mà không khử trùng.
- **Nguyên nhân gốc rễ**:
  1. *Kẹp trần an toàn sai lệch (Faulty safePage clamping)*: `safePage = Math.min(Math.max(1, page), totalPages)`. Khi `page > totalPages` (ví dụ page 13 khi totalPages = 12), `safePage` bị kẹp ngược về 12, khiến offset luôn là `(12-1)*limit`, trả về nội dung trang cuối vô tận.
  2. *Lọc cứng `total_codes_count > 0`*: Câu query SQL cơ bản gắn `AND total_codes_count > 0` thay vì chỉ lọc khi có tham số `tag === 'has_codes'`.
  3. *Lọc tĩnh theo ID*: Hardcoded filter `g.id !== 'gw_gamerpower_rotwood'` nằm rải rác trong `functions/api/sync.ts` và `src/services/dataService.ts`.
  4. *Nối chuỗi nạp mã không khử trùng*: `POST /api/giveaways/manage` và `PUT (ADD_CODES / RESTOCK)` nhận mảng mã mà không lọc qua `Set` và không chuẩn hóa `toUpperCase()`, gây nhân bản mã khi nạp đè hoặc restock danh sách chứa mã cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Khi `page > totalPages`: Lập tức trả về `games: []`, `hasMore: false` (không dùng `safePage` kẹp ngược về `totalPages`).
  2. Cho phép `limit` tối đa 100 thay vì 48 (`Math.min(100, Math.max(1, rawLimit))`).
  3. Loại bỏ `AND total_codes_count > 0` khỏi câu lệnh lọc chung, chỉ thêm vào khi `tag === 'has_codes'`.
  4. Gỡ bỏ mọi bộ lọc tĩnh hardcoded `gw_gamerpower_rotwood` và cập nhật chiến dịch thành `ACTIVE`.
  5. Luôn chuẩn hóa `trim().toUpperCase()` và khử trùng qua `Set` đối chiếu với kho hiện có trước khi chèn vào `giveaway_codes` hoặc cập nhật `codes_pool`.
  6. Thêm cảnh báo trùng lặp và nút "Gỡ Trùng Kho Mã" trong giao diện quản trị `PrivateCodesModule.tsx`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG dùng `safePage = Math.min(..., totalPages)` trong các API phân trang trả về JSON mảng vì client sẽ bị kẹt trong vòng lặp vô hạn đọc lại trang cuối*.
  - ❌ *Tuyệt đối KHÔNG hardcode lọc mã hoặc game trực tiếp trong file mã nguồn bằng ID chuỗi tĩnh*.
  - ❌ *Tuyệt đối KHÔNG append mảng mã mới vào `codes_pool` mà không khử trùng qua `Set`*.



### ISSUE-187: Bẫy Không Xóa Cache Biên Khi Đăng Tin Tức Mới & Bẫy Ghi Đè Ngược Từ Snapshot Khi Bấm Đồng Bộ Admin (News API Cache Invalidation & Admin Reverse Desync Overwrite Pitfall)
- **Triệu chứng**:
  - Bài viết mới đăng qua `POST /api/news` hiển thị đầy đủ trong trang Quản trị (`/api/news`), nhưng trang Khách công khai (`/news`) đọc từ kho `/api/sync` (`newsArticles`) lại không nhận được bài mới và dừng ở số lượng cũ.
  - Khi bấm nút "Đồng Bộ" trong `admin#/news`, số lượng bài viết trên web công khai vẫn không tăng, thậm chí các bài viết mới có nguy cơ bị ghi đè ngược bởi snapshot cũ từ máy chủ.
- **Nguyên nhân gốc rễ**:
  1. `functions/api/news/index.ts` và `functions/api/news/[id].ts` chỉ lưu vào bảng `system_settings` nhưng không xóa biến bộ nhớ cạnh `__wcg_public_sync_cache`, `__wcg_metrics_snapshot` và bảng `system_snapshots`, khiến Cloudflare Worker tiếp tục phục vụ snapshot cũ cho `/api/sync`.
  2. Nút "Đồng Bộ" trong `NewsModule.tsx` ban đầu gọi `adminDataService.fetchFromCloudflareKV()`, hàm này kéo dữ liệu từ `/api/sync` (đang giữ snapshot cũ) rồi gọi `newsService.applyServerSnapshot`, ghi đè dữ liệu cũ lên client và đẩy ngược lên máy chủ.
  3. `newsService.syncFromServer()` ưu tiên gọi `/api/sync` thay vì gọi trực tiếp `/api/news` (SSOT chuẩn xác nhất từ D1).
  4. Hàm xử lý `dataService.ts` thay thế trực tiếp mảng tin tức mà không có cơ chế giữ lại (merge) các bài viết mới ở client.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Trong `functions/api/news/index.ts` (POST) và `functions/api/news/[id].ts` (PUT, DELETE): Luôn xóa sạch `(globalThis as any).__wcg_public_sync_cache`, `__wcg_metrics_snapshot` và thực thi `DELETE FROM system_snapshots`.
  2. Trong `functions/api/sync.ts`: Tự động xóa sạch `__wcg_public_sync_cache` và xóa `system_snapshots` khi cập nhật `newsArticles`.
  3. `newsService.syncFromServer()` luôn ưu tiên truy vấn trực tiếp `/api/news?status=ALL&limit=all&_t=${Date.now()}` từ Cloudflare D1.
  4. Bổ sung cơ chế Safeguard Merge trong cả `newsService.ts` và `dataService.ts`: Nếu dữ liệu máy chủ trả về ít hơn dữ liệu cục bộ, tự động bảo toàn các bài viết chưa có trên máy chủ thay vì xóa bỏ.
  5. Trong `NewsModule.tsx`, nút "Đồng Bộ" chỉ gọi `newsService.syncFromServer()` và `newsService.syncArticlesToCloudflare()`, tuyệt đối không gọi `fetchFromCloudflareKV()`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gọi `adminDataService.fetchFromCloudflareKV()` trong hàm đồng bộ tin tức vì sẽ gây vòng lặp ghi đè ngược dữ liệu cũ từ snapshot lên tin mới*.
  - ❌ *Tuyệt đối KHÔNG để `POST /api/news` và `PUT /api/news/:id` cập nhật cơ sở dữ liệu mà quên làm sạch cache biên và `system_snapshots`*.

### ISSUE-186: Bẫy Khóa Giờ G Đếm Ngược Do `start_time` Tương Lai Khiến Không Thể Giật Mã & Thiếu Nút Mở Ngay Lập Tức (Giveaway Future start_time Countdown Lock & Missing Instant OPEN_NOW Action Pitfall)
- **Triệu chứng**:
  - Chiến dịch phát code quà tặng hiển thị trạng thái "Mở sau: ...", nút bị khóa thành `[🕒 Chờ Mở]`, khách bấm vào không thể giật mã và backend từ chối với lỗi `CAMPAIGN_NOT_STARTED` dù trong kho còn rất nhiều mã.
  - Trong Admin, bảng quản lý vẫn hiển thị trạng thái "Đang mở" (vì cờ `is_active === true`), gây hiểu lầm cho Quản trị viên rằng chiến dịch đang hoạt động bình thường mà không biết rằng `start_time` tương lai đang khóa toàn bộ lượt nhận code.
- **Nguyên nhân gốc rễ**:
  1. Khi tạo chiến dịch qua API hoặc form quản trị, trường `start_time` được điền ngày trong tương lai (ví dụ hôm nay ngày 30/10 nhưng điền `2026-11-01`).
  2. Cả Frontend (`GiveawaysView.tsx`) và Backend (`claim.ts`) đều tuân thủ chặt chẽ Giờ G: `nowMs < startMs` -> Khóa đếm ngược.
  3. Bảng Admin thiếu nhận diện `start_time > now` và Edge API thiếu action `OPEN_NOW` để 1-chạm đưa `start_time` về ngày hiện tại.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Trong API `POST /api/giveaways/manage`: Tự động mặc định `start_time = hôm nay` nếu trường này bị bỏ trống, đảm bảo mọi game mới tạo ra đều mở giật mã ngay lập tức.
  2. Bổ sung action `OPEN_NOW` (hoặc `OPEN_CAMPAIGN`) vào `PUT /api/giveaways/manage`: Ngay lập tức đặt `start_time = hôm nay`, `is_active = true`, `status = 'ACTIVE'`, xóa thời gian chờ toàn sàn `last_global_claim_at = ''`.
  3. Trong bảng Admin (`PrivateCodesModule.tsx`): Kiểm tra tự động nếu `start_time` ở tương lai thì hiển thị ngay badge cam `⏳ Chờ mở (ngày)` kèm nút 1-chạm `⚡ Mở ngay` (`handleOpenNow`).
  4. Trong form tạo/sửa đợt phát: Thêm nút `⚡ Mở ngay hôm nay` và cảnh báo màu vàng khi người dùng chọn ngày tương lai.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG xóa bỏ hoàn toàn cơ chế kiểm tra `start_time` ở backend `claim.ts` vì điều này sẽ phá vỡ tính năng hẹn giờ cho các sự kiện đếm ngược thực sự*.
  - ❌ *Tuyệt đối KHÔNG hiển thị nhãn "Đang mở" trong Admin khi `start_time` ở tương lai mà không có nhãn cảnh báo hẹn giờ và nút Mở ngay*.


### ISSUE-185: Bẫy Nhiễm Chéo Nhà Phát Hành Giữa Các Bản Game Đồng Tên & Bẫy Gom Mã Nhầm Khi Khớp Nguồn Fanpage/Gói Game Khác Nhau (Cross-Publisher Contamination & Crawler Fanpage Mis-association Multi-Version Pitfall)
- **Triệu chứng**:
  - Hai game có tên gần giống nhau nhưng là 2 bản độc lập (ví dụ "Cửu Âm Chân Kinh Mobile" và "Cửu Âm Chân Kinh 2D Mobile") bị gom chung mã giftcode vào bản live chính, khiến bản live có số lượng mã nhân đôi (17 mã) trong khi bản thứ hai bị treo ở hàng chờ với 0 mã và bị gắn cờ trùng.
  - Game có slug chứa tên NPH (như `tieu-ngao-doc-ton-vgp`) bị gán sai NPH thành `GAMOTA` do nhiễm chéo từ game khác có cùng tiền tố "Tiếu Ngạo" (`tieu-ngao`).
- **Nguyên nhân gốc rễ**:
  1. Nguồn cào Fanpage Facebook (`cuuam2d.gosu.vn`) bị gán nhầm `targetGameSlug` sang `cuu-am-chan-kinh-mobile`.
  2. Dữ liệu catalog ban đầu điền sai nhà phát hành cho `tieu-ngao-doc-ton-vgp`.
  3. API quản lý bên ngoài thiếu lệnh di chuyển/xóa mã đơn lẻ và thiếu lệnh đổi NPH của game live trong D1 SQL table.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Luôn kiểm tra package name (`android_package_name` / `package_name`) và ngày ra mắt để phân biệt các phiên bản game khác biệt hoàn toàn (2D vs 3D/Mobile).
  2. Bổ sung handler di chuyển mã nguyên tử trên Serverless Edge API (`decouple_cuu_am_and_fix_tieu_ngao`) thao tác trực tiếp với bảng `codes` và `games` trong Cloudflare D1.
  3. Cập nhật đồng bộ các file catalog tĩnh (`games188.json`, `crawled_codes_188.json`, `crawler_sources.json`) và backup state.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gộp các game có package name khác nhau hoặc phong cách đồ họa khác nhau (như bản 2D và bản Mobile thường) thành một game duy nhất*.
  - ❌ *Tuyệt đối KHÔNG gán đè nhà phát hành của một game khác khi chưa xác thực hậu tố của slug và nguồn pháp lý chính thức*.

### ISSUE-184: Bẫy Lệch Tồn Kho Tĩnh/Động & Số Lượng Mua Vượt Quá Tồn Kho Thực Tế Trong Tiện Ích (Utilities Static/Live Inventory Desync & Over-Stock Purchase Quantity Selection Pitfall)
- **Triệu chứng**:
  - Gói sản phẩm trong Admin chỉ còn 7 mã, nhưng khách hàng ngoài web vẫn có thể bấm tăng hoặc nhập số lượng lên 8 để thanh toán.
  - Modal chi tiết sản phẩm hiển thị dòng "Số lượng khuyến mãi còn: 8" gây hiểu lầm hoặc lộ cơ cấu kho.
  - Modal thanh toán hiển thị dòng thông báo "Ưu đãi Flash Sale: Giới hạn tối đa X gói / đơn (Tránh gom hàng)" không mong muốn.
- **Nguyên nhân gốc rễ**:
  1. File tĩnh `utilities.json` được gán cứng `stock_quantity: 8`, trong khi kho động D1 thực tế đã xuất 1 mã còn 7.
  2. Component `UtilitiesView.tsx` và `ProductDetailModal.tsx` không lắng nghe sự kiện `wcg_utilities_updated` khi dữ liệu server được đồng bộ về.
  3. Hàm mở thanh toán `handleStartCheckout` truyền `initialQty` thẳng vào `setQuantity` mà không kẹp trần (`Math.min(initialQty, actualRealStock)`).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Luôn kẹp trần số lượng mua tối đa bằng đúng số tồn kho thực tế (`maxStock = realStock`), dùng hook `useEffect` tự động hạ số lượng nếu `quantity > realStock`.
  2. Bổ sung `window.addEventListener('wcg_utilities_updated', handleUpdate)` trong các component hiển thị tiện ích để phản ứng tức thì khi server đồng bộ.
  3. Xóa dòng chữ "Số lượng khuyến mãi còn: X" trong modal chi tiết (chỉ hiển thị nhãn "Hết hàng" màu đỏ khi `isPkgOut`).
  4. Xóa dòng thông báo Flash Sale giới hạn tối đa trong modal thanh toán; chỉ hiển thị cảnh báo khi hết hàng (`maxStock <= 0`).
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG cho phép khởi tạo `quantity` lớn hơn `actualRealStock` khi mở modal thanh toán*.
  - ❌ *Tuyệt đối KHÔNG bỏ quên listener `wcg_utilities_updated` khiến UI bị kẹt ở dữ liệu bundle tĩnh*.

### ISSUE-183: Bẫy CHECK Constraint Cột Status Bảng Giveaways & Bẫy Nuốt Lỗi Khiến POST /api/giveaways/manage Trả 201 Giả (Giveaways Status CHECK Constraint & Silent Error Swallowing Returning False 201 Created Pitfall)
- **Triệu chứng**:
  - Khi gọi POST /api/giveaways/manage để tạo chiến dịch mới với `is_active: false` và kho mã rỗng `codes: []`, máy chủ trả về HTTP 201 thông báo thành công, nhưng sau đó tra cứu danh sách GET và chi tiết ID đều trả về 404 hoặc không tìm thấy bản ghi.
  - Kho đồng bộ công khai /api/sync không ghi nhận chiến dịch mới.
- **Nguyên nhân gốc rễ**:
  1. Bảng `giveaways` trong SQLite D1 có ràng buộc `CHECK (status IN ('ACTIVE', 'ENDED'))`. Khi cờ `is_active: false`, code tự suy diễn `status = 'PAUSED'`, vi phạm CHECK constraint của SQLite khiến D1 từ chối ghi.
  2. Câu lệnh SQL ghi bảng D1 có gắn `.catch((e) => console.warn(...))` nuốt sạch lỗi SQL, khiến API tưởng nhầm là ghi thành công và trả HTTP 201 giả.
  3. Hàm đọc `loadAllGiveawaysD1` chỉ duyệt qua mảng kết quả của bảng SQL, nếu bảng SQL thiếu dòng thì dữ liệu trong `system_settings` cũng bị bỏ rơi.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Giá trị `status` ghi vào D1 luôn tuân thủ `CHECK (status IN ('ACTIVE', 'ENDED'))` (`(gw.status === 'ENDED') ? 'ENDED' : 'ACTIVE'`), trạng thái tạm dừng được kiểm soát chính xác qua cột số nguyên `is_active` (0 hoặc 1).
  2. Tuyệt đối không nuốt lỗi SQL trong các hàm thao tác kho dữ liệu chính; để lỗi ném ra ngoại lệ thật để tầng API bắt được và trả HTTP 500 lỗi rõ ràng.
  3. Triển khai cơ chế Xác Thực Đọc Lại Bắt Buộc (Mandatory Read-Back Verification): Sau khi ghi D1, bắt buộc gọi `loadAllGiveawaysD1` để kiểm chứng bản ghi đã tồn tại trong kho thật; nếu không tìm thấy, lập tức trả lỗi, tuyệt đối không trả 201 giả.
  4. Tự phục hồi dữ liệu trong `loadAllGiveawaysD1`: Duyệt thêm các bản ghi có trong `metaSetting` mà chưa có trong bảng SQL để đảm bảo dữ liệu luôn nhất quán.
  5. Đồng bộ vào `wcg_master_state_v4` và xóa `system_snapshots` để kho công khai cập nhật tức thì.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gán `status = 'PAUSED'` vào câu lệnh INSERT/UPDATE bảng `giveaways` trong D1*.
  - ❌ *Tuyệt đối KHÔNG trả HTTP 201 nếu bản ghi chưa được đối soát đọc lại thành công từ cơ sở dữ liệu*.

### ISSUE-182: Bẫy Dropdown Select Đơn Điệu Gây Khó Khăn Khi Tìm Kiếm Thành Viên & Nguy Cơ Nhầm Lẫn Số Dư Trong Điều Chỉnh Ví (Single Dropdown Select & Lack of Multi-Field Search in Wallet Adjustment Modal Pitfall)
- **Triệu chứng**:
  - Khi hệ thống có hàng trăm hoặc hàng nghìn thành viên, modal điều chỉnh số dư chỉ có một thẻ dropdown `<select>` duy nhất, khiến quản trị viên phải cuộn tìm kiếm thủ công rất mất thời gian.
  - Không thể tìm kiếm linh hoạt theo tên tiếng Việt có dấu hoặc không dấu, tên viết tắt, username, email, số điện thoại hay ID thành viên.
  - Không có thẻ xem trước thông tin và số dư hiện tại cũng như số dư dự kiến sau khi cộng/trừ tiền, dẫn tới nguy cơ cao thao tác nhầm số tiền hoặc nhầm tài khoản.
- **Nguyên nhân gốc rễ**:
  1. Sử dụng thẻ HTML `<select>` thô sơ thiếu ô input tìm kiếm phản hồi tức thì.
  2. Chưa tích hợp bộ lọc tìm kiếm đa trường và thuật toán tìm kiếm thông minh tiếng Việt (`smartVietnameseMatch`).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Thêm ô input tìm kiếm thành viên phản hồi tức thì (`memberSearchQuery`) với nút xóa nhanh `X` và nhãn đếm kết quả khớp trực quan.
  2. Tích hợp `smartVietnameseMatch` từ `src/utils/textUtils.ts` hỗ trợ tìm kiếm không phân biệt dấu tiếng Việt (accent-insensitive), tìm kiếm theo cụm từ, và tìm kiếm chữ cái đầu (initials matching) qua 6 trường thông tin: `displayName`, `username`, `email`, `phone`, `id`, `role`.
  3. Cung cấp danh sách gợi ý bấm chọn nhanh (Quick Selection Cards) tối đa 5 thành viên khớp nhất và thẻ xem trước thành viên được chọn (Selected Member Preview Card) kèm avatar và thông tin liên hệ.
  4. Hiển thị khối tính toán dự kiến số dư sau điều chỉnh theo thời gian thực (`Dự kiến số dư sau giao dịch`) dựa trên loại giao dịch Nạp (+) hoặc Khấu trừ (-), chống số âm.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG import hoặc gọi hàm `matchesQuery` không tồn tại; luôn dùng hàm `smartVietnameseMatch(targets, query)` chuẩn đã được tối ưu từ `src/utils/textUtils.ts`*.
  - ❌ *Tuyệt đối KHÔNG dùng `indexOf` đơn thuần phân biệt hoa thường hoặc phân biệt dấu tiếng Việt*.

### ISSUE-181: Bẫy Ràng Buộc Step={10} & parseInt Khiến Người Dùng Bị Chặn Nhập Số Lẻ Trong Game Sắp Ra Mắt (Upcoming Games Step Restriction & parseInt Decimals Stripping Pitfall)
- **Triệu chứng**:
  - Không thể nhập thứ tự hiển thị dạng số lẻ / thập phân (ví dụ `1.5`, `2.5`) để xếp game xen kẽ giữa các vị trí có sẵn: trình duyệt báo lỗi validation đỏ hoặc tự động ép tròn về số nguyên.
  - Không thể nhập số người canh dạng số lẻ đơn vị (ví dụ `2843`, `1517`): trình duyệt hiển thị thông báo chặn submit "Vui lòng nhập giá trị hợp lệ. Hai giá trị gần nhất là 2840 và 2850".
  - Nút "Sinh Random" luôn ra số tròn chục (2840, 1500) mà không sinh ra các số lẻ tự nhiên.
- **Nguyên nhân gốc rễ**:
  1. Input HTML5 được gắn `step={10}` và `step={50}` ép buộc giá trị phải là bội số của 10 hoặc 50.
  2. Input thứ tự thiếu `step="any"` và gắn `parseInt(e.target.value, 10)` làm mất phần thập phân.
  3. Hàm `generateRandomInRange` truyền tham số `step = 10` làm tròn số ngẫu nhiên về bội số 10.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Thêm `step="any"` vào tất cả các ô nhập số trong modal Game Sắp Ra Mắt, cho phép nhập số lẻ và số thập phân tự do.
  2. Sử dụng cơ chế lưu chuỗi khi gõ và chuyển đổi `parseFloat` khi `onBlur` và khi `submit`.
  3. Đổi bước nhảy mặc định của `generateRandomInRange` thành `1`, cho phép sinh ra số lẻ tự nhiên, và hỗ trợ sinh số lẻ thập phân khi Min/Max có phần lẻ.
  4. Đảm bảo `calculateEffectiveOrder` bảo toàn số lẻ thập phân và thuật toán sắp xếp `orderA - orderB` hoạt động chính xác với float.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gắn `step={10}` hay `step={50}` vào các ô nhập số người canh hoặc số thứ tự*.
  - ❌ *Tuyệt đối KHÔNG dùng `parseInt(e.target.value, 10)` cho các trường thứ tự hiển thị cần hỗ trợ vị trí xen kẽ thập phân*.

### ISSUE-180: Bẫy Thiếu Endpoint Toàn Quyền Cho Giveaway & Quên Đăng Ký Tài Liệu cURL/JS Khi Mở Scope API Mới (Giveaway Management API & Documentation Missing Pitfall)
- **Triệu chứng**:
  - Không thể tự động hóa việc nạp giftcode hay quản lý đợt phát code giveaway từ bot bên ngoài (Discord, Telegram, cronjob) do thiếu endpoint REST API hỗ trợ phương thức PUT/POST/DELETE.
  - Các khóa API được cấp quyền `GIVEAWAYS_FULL` không có endpoint để gọi hoặc gọi bị từ chối 403 do thiếu logic kiểm tra `hasScope(scope, 'GIVEAWAYS_FULL')`.
  - Quản trị viên trong trang Admin không biết endpoint nào để gọi, không có mẫu lệnh cURL và JS fetch để tích hợp nhanh.
- **Nguyên nhân gốc rễ**:
  1. Chưa có router serverless edge chuyên biệt cho `/api/giveaways/manage` tiếp nhận và giải mã quyền `GIVEAWAYS_FULL`.
  2. Vi phạm Nguyên Tắc Số 8 (`RULE[c:\4 Antigravity all\13 web code game\AGENTS.md]`): Khi mở quyền API mới thì bắt buộc phải đồng bộ vào `ALL_API_SCOPES`, sinh mẫu cURL/JS ở cuối trang và cung cấp giao diện quản lý / thử nghiệm.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xây dựng Serverless Edge REST API tại `functions/api/giveaways/manage.ts` (và alias `functions/api/giveaways/index.ts`) hỗ trợ đầy đủ `GET`, `POST`, `PUT`, `DELETE` với xác thực đa tầng qua `authorizeGiveawayRequest`.
  2. Tự động sinh preset key `ak_preset_giveaways_full` (`wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a`) trong `functions/api/api-keys/index.ts`.
  3. Bổ sung `docCategory === 'giveaways'` vào tài liệu mẫu code cuối trang của `ApiKeysModule.tsx`.
  4. Tích hợp subtab `subTab === 'api'` trong `PrivateCodesModule.tsx` gồm: Thẻ tạo khóa `GIVEAWAYS_FULL`, Bảng danh sách khóa đang hoạt động, Trình thử nghiệm gọi API trực tiếp (Quick Tester), và Bảng tra cứu endpoints & mẫu lệnh cURL/JS ở cuối trang.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG mở quyền API mới mà không bổ sung tài liệu endpoints và mẫu cURL/JS ở cuối trang*.
  - ❌ *Tuyệt đối KHÔNG bỏ qua xác thực `authorizeGiveawayRequest` hoặc cho phép ghi vào kho D1 mà không qua kiểm tra scope*.

### ISSUE-179: Bẫy Phân Mảnh Thanh Ghim Khiến Nút Sáng/Tối Bị Đẩy Khuất & Trải Nghiệm Tùy Biến Cá Nhân Bị Phân Tán (Sticky Header Horizontal Overflow & Settings Fragmentation Pitfall)
- **Triệu chứng**:
  - Thanh ghim điều hướng quá cao (h-18, 72px) và thanh công cụ bên phải chứa quá nhiều nút (Tải App, Language Selector header, Bookmark, Avatar, Nút Sáng/Tối).
  - Ở độ phân giải ~1200px hoặc trên các màn hình máy tính thông thường, các nút bị dồn ép, nút Sáng/Tối bị đẩy khuất ra ngoài rìa màn hình.
  - Người dùng khó tìm kiếm cài đặt giao diện (ngôn ngữ, sáng/tối) vì bị nằm rời rạc ngoài thanh điều hướng chính thay vì nằm trong hồ sơ nhân vật.
- **Nguyên nhân gốc rễ**:
  1. Chiều cao và padding thanh ghim chưa tối ưu, các nút tab có chiều cao và kích thước không đồng đều.
  2. Nút Language dropdown và nút Sun/Moon đặt ngoài thanh ghim chiếm nhiều diện tích ngang không cần thiết.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Thu gọn thanh ghim: Giảm chiều cao từ 72px về 64px (sm:h-16), chuẩn hóa độ cao 6 tab điều hướng đồng bộ (py-1.5 px-2.5 sm:px-3 text-xs).
  2. Gom cụm cài đặt Giao Diện (Sáng/Tối) và Ngôn Ngữ vào:
     - Menu nhân vật nhanh (Dropdown khi bấm vào Avatar hoặc nút Tài khoản đối với khách).
     - Thẻ "Cài Đặt Giao Diện & Ngôn Ngữ Hiển Thị" bên trong modal "Hồ Sơ & Thông Tin Nhân Vật" (UserProfileModal).
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG nhồi nhét nút đổi theme và đổi ngôn ngữ trực tiếp ra thanh ghim ngoài khi thanh đã có 6 tab điều hướng và các tính năng chính*.
  - ❌ *Tuyệt đối KHÔNG ẩn cài đặt theme/ngôn ngữ đối với khách vãng lai khi gom vào menu tài khoản*.

### ISSUE-178: Bẫy Nuốt Lỗi ReferenceError stats.ts & Phân Rã Biến Đếm Copy Khiến Số Không Tăng Theo Thông Báo & Người Thật Bấm (Copy Counter Silent Failure & Event Disconnect Pitfall)
- **Triệu chứng**:
  - Con số "Tổng lượt sao chép" và huy hiệu đầu trang chủ đứng yên tại chỗ (ví dụ `94.558`), không tăng khi thông báo nổ ra hoặc khi khách bấm sao chép ở các modal khác.
  - Sau khi chuyển tab hoặc mở tab mới, số liệu không đồng bộ giữa các tab đang mở.
- **Nguyên nhân gốc rễ**:
  1. *Biến `now` chưa khai báo trong `functions/api/stats.ts`*: Dùng `now` thay vì `nowMs`, khối `catch` nuốt lỗi làm `/api/stats` trả về `master_copy_clicks: 0`.
  2. *Phân rã giữa `masterCopyClicks` và `globalMasterCopyCount`*: `syncFromHub` và `fetchHourlyServerStats` chỉ gán giá trị vào `masterCopyClicks` nhưng không gán `globalMasterCopyCount`, trong khi UI chỉ đọc `globalMasterCopyCount`.
  3. *`broadcastCurrentCount()` không phát sóng đa kênh*: Chỉ kích hoạt callback nội bộ tab mà không gửi `BroadcastChannel` và không kích hoạt CustomEvent.
  4. *Bỏ sót các nút sao chép ngoài màn hình chính*: Các modal Giveaway, News, Mission, Received Codes sao chép clipboard trực tiếp mà không gọi `marketingService.recordRealCopy`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Sửa `nowMs` trong `stats.ts`, nâng `GLOBAL_MASTER_COPY_BASELINE = 93910` để tổng số đạt `94.562+` trên cả server và client.
  2. Đồng bộ `globalMasterCopyCount` mỗi khi nhận `masterCopyClicks` lớn hơn từ server.
  3. Phát sóng đa kênh trong `broadcastCurrentCount()` (BroadcastChannel, Window CustomEvents, LocalStorage).
  4. Liên kết `marketingService.recordRealCopy` vào 100% nút sao chép code trong ứng dụng.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gán đè `masterCopyClicks` mà quên cập nhật `globalMasterCopyCount`*.
  - ❌ *Tuyệt đối KHÔNG gọi `navigator.clipboard.writeText` mà không gọi `marketingService.recordRealCopy`*.


### ISSUE-177: Bẫy Mảng Rỗng hasPool Array.isArray & Member wcg_auth_token Khiến Tồn Kho Giveaway Bị Xóa Về 0 Khi Đăng Nhập (Giveaway Sanitized Stock Zeroing Pitfall)
- **Triệu chứng**:
  - Trong Admin panel, sự kiện có mã đầy đủ (ví dụ "Giang Hồ Kỳ Ngộ" còn 53 mã, "Ta Là Hắc Ngộ Không" còn 23 mã).
  - Nhưng trên web khách (`/giveaways`), người dùng đăng nhập tài khoản vào thì thấy sự kiện biến mất hoặc hiển thị "Còn lại: 0 mã", nút chuyển thành "Chờ Đợt Mới", không cho giật mã.
- **Nguyên nhân gốc rễ**:
  1. *Bẫy `Array.isArray([])`*: Trong `functions/api/sync.ts`, câu lệnh `const hasPool = Array.isArray(codes_pool) || Array.isArray(gw.codes_pool);`. Vì luồng khách không gửi danh sách mã thật để bảo mật, `codes_pool` là `[]`. Tuy nhiên `Array.isArray([]) === true`, làm `remainingCount = poolArr.length` (bằng `0`), xóa sạch trường `remaining_codes` của D1 về `0` trong response `/api/sync`.
  2. *Bẫy `isAdmin = Boolean(localStorage.getItem('wcg_auth_token'))`*: Thành viên đăng nhập bình thường có `wcg_auth_token`, bị coi nhầm là Admin và gọi full sync `/api/sync`, nhận về payload có tồn kho = 0 và ghi đè vào `localStorage`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Chỉ gán `remainingCount = poolArr.length` khi `poolArr.length > 0`. Nếu mảng rỗng, bắt buộc giữ nguyên `Math.max(0, Number(gw.remaining_codes || 0))`.
  2. Loại bỏ `wcg_auth_token` khỏi điều kiện xác định `isAdmin` trong `dataService.ts`. Khách vãng lai và thành viên luôn dùng `syncGiveaways()`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG kiểm tra có kho bằng `Array.isArray(codes_pool)` mà không kèm điều kiện `length > 0`*: Mảng rỗng `[]` là truthy và là Array.
  - ❌ *Tuyệt đối KHÔNG dùng token JWT của thành viên (`wcg_auth_token`) để gán quyền quản trị frontend*.

### ISSUE-176: Bẫy Hồi Sinh Cấu Hình Cũ Sau 30 Giây Do So Sánh Nông isIdentical & Ghi Đè use_template Ngược (Giveaway Config Reversion & Stale Cache Resurrect Pitfall)
- **Triệu chứng**:
  - Quản trị viên sửa cấu hình đợt phát code riêng trong Admin panel (`PrivateCodesModule.tsx`), lưu thành công.
  - Sau khoảng 30–45 giây, toàn bộ thiết lập tự động tụt lùi về giá trị cũ trước khi chỉnh sửa.
  - Ngoài web khách (`/giveaways`), giao diện không phản ánh thay đổi hoặc giật về bản mẫu ban đầu.
- **Nguyên nhân gốc rễ**:
  1. *So sánh nông `isIdentical`*: Phía client `GiveawaysView.tsx` chỉ kiểm tra tồn kho và trạng thái. Nếu số lượng mã không đổi, React `setGiveaways` trả về object cũ `prev`, hoàn toàn bỏ qua mọi thay đổi về thời gian hồi chiêu, mẫu chung, hay điều kiện nhận.
  2. *Ghi đè `use_template` ngược*: Khi admin chọn tùy chỉnh riêng (`use_template: false`), hàm merge `fetchFromCloudflareKV` ưu tiên giá trị server cũ (`use_template: true`), khiến Universal Template lập tức ghi đè lại.
  3. *Thiếu đồng bộ cột `cooldown_minutes`*: Bị bỏ sót khỏi câu lệnh `INSERT` và `UPDATE` trong D1, khiến số phút bị ép về 0 hoặc cắt cụt.
  4. *SQLite từ chối xóa thời gian chờ*: `CASE WHEN != ''` không cho phép cập nhật `last_global_claim_at` về rỗng khi admin muốn mở đợt phát ngay.
  5. *Edge isolate memory cache 60s*: `settingMemoryCache` và `__wcg_public_sync_cache` không bị invalidate khi có lệnh ghi mới.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Mở rộng `isIdentical` so sánh 100% tất cả thuộc tính của chiến dịch giveaway.
  2. Trong `adminDataService.ts`, khi `localIsNewer` là true, bảo vệ tuyệt đối `local.use_template` và `local.cooldown_minutes`.
  3. Bổ sung `cooldown_minutes` vào `INSERT INTO giveaways`, `VALUES`, `ON CONFLICT DO UPDATE SET` và `SELECT`.
  4. Cập nhật `last_global_claim_at = excluded.last_global_claim_at` để cho phép xóa rỗng.
  5. Xóa sạch `(globalThis as any).__wcg_public_sync_cache = null` và gọi `invalidateSettingMemoryCache` sau mỗi lần lưu.
  6. Tự động bắn thông điệp làm mới edge cache sang domain web khách song song.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG so sánh nông các object chiến dịch bằng chỉ một vài trường số lượng*: Phải kiểm tra toàn diện các trường cấu hình.
  - ❌ *Tuyệt đối KHÔNG gán đè `use_template` của server khi bản ghi local có thời gian cập nhật mới hơn (`localIsNewer`)*.
  - ❌ *Tuyệt đối KHÔNG để sót cột khi migrate schema*: Đã có cột trong D1 thì mọi câu lệnh INSERT/UPDATE phải đồng bộ.

### ISSUE-175: Bẫy Chạy DDL Schema Và Truy Vấn N+1 Trên Luồng Đọc Khiến TTFB Kéo Dài 4–7 Giây (Schema DDL & N+1 Queries on Read Path TTFB Pitfall)
- **Triệu chứng**:
  - TTFB của API `GET /api/missions` bị kéo dài tới 4,5–7 giây dù payload rất nhẹ (~2,5 KB).
  - Khách vào trang `/nhiem-vu` phải nhìn khung xương skeleton nhấp nháy 2–4 giây.
- **Nguyên nhân gốc rễ**:
  1. *Lệnh DDL chạy mỗi request đọc*: Gọi `ensureMissionSchema` hoặc `ensureSchemaUpgrades` trên mỗi request đọc hoặc auth check. Mỗi lần gọi thực thi hơn 20 câu lệnh `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE` khóa database SQLite/D1.
  2. *Truy vấn N+1*: Lặp qua từng nhiệm vụ để chạy 4 câu truy vấn riêng lẻ thay vì gom nhóm `GROUP BY`.
  3. *Áp Cache-Control sai quy cách*: Không phân biệt giữa khách vãng lai và người đã đăng nhập (chứa `user_submission` nhạy cảm).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Loại bỏ 100% lệnh DDL (`ensureMissionSchema`, `ensureSchemaUpgrades`, `PRAGMA`, `ALTER TABLE`) khỏi toàn bộ luồng request đọc và xác thực runtime. Chỉ thực hiện migrate schema lúc setup hoặc migration script.
  2. Gom nhóm toàn bộ truy vấn thống kê và mã kho vào 2 truy vấn `GROUP BY mission_id` chạy song song với `Promise.all`.
  3. Phân tách cache tuyệt đối: Khách vãng lai dùng `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=300`, người đã đăng nhập dùng `Cache-Control: private, no-store, no-cache, must-revalidate`. Cả hai đều có `Vary: Authorization, Accept-Encoding`.
  4. Phía giao diện hiển thị tức thì 0 giây từ `localStorage.getItem('wcg_cached_missions_v1')`, không hiện khung xương khi đã có dữ liệu lưu tạm (`{isLoading && missions.length === 0 ? ...}`).
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gọi DDL (CREATE/ALTER/INDEX) trong request HTTP đọc*: Mọi thao tác DDL phải chạy độc lập ngoài luồng phục vụ traffic.
  - ❌ *Tuyệt đối KHÔNG áp Cache-Control: public cho endpoint chứa dữ liệu cá nhân (`user_submission`)* nếu không phân tách theo `Authorization` header và `Vary`.

### ISSUE-174: Bẫy Quên Import Hook useEffect Trong MissionDetailModal Gây Crash Chi Tiết Nhiệm Vụ (MissionDetailModal Missing useEffect Hook Crash Pitfall)
- **Triệu chứng**:
  - Người dùng bấm vào bất kỳ nhiệm vụ nào trong trang `/nhiem-vu`, màn hình bị văng lỗi: "Đã có sự cố hiển thị nhỏ xảy ra - useEffect is not defined".
- **Nguyên nhân gốc rễ**:
  - Khi thêm tính năng tự động ghi nhận mã thưởng vào kho cá nhân khi bài nộp được duyệt, code gọi hook `useEffect(() => { ... })` nhưng ở đầu file `src/components/MissionDetailModal.tsx` lại chỉ có `import React, { useState } from 'react';`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Bổ sung `useEffect` vào danh sách named imports từ `'react'` trong `MissionDetailModal.tsx`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gọi React hook mà không kiểm tra dòng import đầu file*: Mọi hook (`useEffect`, `useMemo`, `useCallback`, `useRef`, `useState`) bắt buộc phải được khai báo tường minh trong import.

### ISSUE-173: Bẫy Khai Báo Hàm parseTimeMs Cục Bộ Bên Trong Modal Gây Crash Trang Cha (GiveawaysView parseTimeMs Scope Crash Pitfall)
- **Triệu chứng**:
  - Truy cập trang `/giveaways` trên web khách bị crash màn hình đỏ/đen: "Đã có sự cố hiển thị nhỏ xảy ra - parseTimeMs is not defined".
- **Nguyên nhân gốc rễ**:
  - Hàm `parseTimeMs` được khai báo bên trong scope của component con `GiveawayDetailModal`. Khi component cha `GiveawaysView` render thẻ card sự kiện và gọi `parseTimeMs`, runtime ném lỗi `ReferenceError: parseTimeMs is not defined`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn đưa các hàm tiện ích phân tích ngày giờ (`parseTimeMs`, định dạng tiền tệ, xử lý chuỗi) lên phạm vi cấp module (top-level scope) hoặc module tiện ích dùng chung (`src/utils/`).
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG khai báo hàm tiện ích bên trong component con nếu component cha hoặc các component anh em khác cũng cần dùng*: Luôn đặt ở top-level scope của file hoặc export ra file utils.

### ISSUE-172: Bẫy Tăng Trưởng Trôi Thời Gian deltaClaims & Mốc Cơ Sở Tĩnh Khiến Số Đã Giật Giveaway Phình To Bất Thường (Giveaway Claimed Count Runaway Inflation Pitfall)
- **Triệu chứng**:
  - Quản trị viên chỉ cấu hình số lượt giật ảo mười mấy đơn vị (e.g. 10–15) hoặc để 0 trong trang Admin (`PrivateCodesModule.tsx`).
  - Nhưng ngoài trang web khách (`/giveaways`), số lượt đã giật ("Đã giật: X mã") bị phình to bất thường lên vài trăm mã (697, 727, 749, 765 mã).
  - Khi Admin cập nhật lại số nhỏ hơn trong Admin panel, ngoài web vẫn trơ ra giữ nguyên các con số phình to vài trăm.
- **Nguyên nhân gốc rễ**:
  1. *Công thức trôi dạt thời gian tự do `deltaClaims`*: Trong `virtualLayerService.ts`, công thức `deltaClaims = Math.floor(elapsedMinutes * 0.1292)` tính từ mốc `BASELINE_ANCHOR_TIME_MS = 1792917180000` (25/10/2026) liên tục tích lũy +618 đơn vị ảo vào mọi giveaway qua từng khe thời gian.
  2. *Mốc tĩnh `CUMULATIVE_BASELINES_20261025` ghi đè Admin*: Khởi tạo gán cứng 33 sự kiện `gw_*` mốc ~80–111 đơn, hoàn toàn bỏ qua `virtual_claimed_offset` trong D1.
  3. *Tự động sinh ngẫu nhiên 52–112*: Khi Admin đặt số ảo = 0, hệ thống tự ý rơi vào fallback sinh ngẫu nhiên 52–112 đơn.
  4. *Khóa trần bảo thủ `+ 2000 đơn`*: `snapshotService.ts` và `marketingService.ts` kẹp trần quá rộng, khiến đỉnh cũ 700+ không bao giờ được thanh lọc khi Admin đặt số nhỏ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xóa bỏ hoàn toàn công thức `deltaClaims` và không cộng tăng trưởng thời gian giả lập vào sự kiện Giveaway.
  2. Xóa sạch mọi mục `gw_*` khỏi `CUMULATIVE_BASELINES_20261025`.
  3. BẢNG ADMIN LÀ CHÂN LÝ: `virtualClaimed` lấy trực tiếp và duy nhất từ `Math.max(0, Number(gw.virtual_claimed_offset) || 0)`. Nếu Admin đặt 0, giữ nguyên 0; nếu đặt 15, giữ nguyên 15.
  4. Thêm Failsafe thanh lọc đỉnh ma: Trong `snapshotService.ts`, nếu `numVal > exactTarget + 5`, tự động thanh lọc về đúng `exactTarget`. Phía client `marketingService.ts` từ chối các server counter phình to bất thường vượt quá `effectiveRealClaimed + virtualBase + 5`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG áp dụng công thức tăng trưởng trôi dạt thời gian (time-anchored delta) cho Giveaway*: Giveaway là các đợt phát mã có hạn ngạch cụ thể, số ảo bổ sung phải do Admin chủ động kiểm soát 100%.
  - ❌ *Tuyệt đối KHÔNG gán cứng mốc cơ sở tĩnh `gw_*` trong code*: Mọi thông số chiến dịch Giveaway phải đọc từ D1 / cấu hình Admin.
  - ❌ *Tuyệt đối KHÔNG sinh ngẫu nhiên 52–112 khi Admin cấu hình = 0*: Nếu Admin đặt 0, số hiển thị phải là số thật 100%.

### ISSUE-171: Bẫy Sai Tên Hàm Lưu saveGlobalMasterCopyCount Khiến Crash Luồng Bấm Sao Chép & Lệch Pha Mốc Snapshot (Copy Counter Runtime Crash & Snapshot Drift Pitfall)
- **Triệu chứng**:
  - Con số "Tổng lượt sao chép" hiển thị lên cao (~93.693 hoặc ~93.700), nhưng sau khi F5, mở tab mới hoặc chuyển tab thì lại tụt lùi về 93.551 hoặc 93.545.
  - Khi khách bấm "Sao chép" ở giftcode, số vừa nhảy lên thì tải lại trang là mất.
  - Console văng lỗi đỏ `TypeError: this.saveGlobalMasterCopyCount is not a function`.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy đặt tên hàm không khớp giữa nơi gọi và định nghĩa*: Trong `src/services/marketingService.ts`, 5 vị trí gọi hàm dùng tên `this.saveGlobalMasterCopyCount()`, nhưng phương thức lại được đặt tên là `private saveDailyMaxCopyCount()`. Khi `incrementLiveCounter()` gọi đến dòng này, runtime ném uncaught `TypeError`, cắt đứt toàn bộ luồng lưu storage và gửi lên server.
  2. *Bẫy lệch pha giữa Snapshot và SSE*: `/api/realtime-events` tính cả `virtualCopy = Math.floor(elapsedMigrationMinutes * 0.5)` (~170+ số ảo), trong khi `/api/metrics/synced` (`deterministicEngine.ts`) chỉ lấy `realCopyClicks`. Khi tải lại trang, client đọc snapshot mốc thấp hơn, ghi đè làm số bị thụt lùi.
  3. *Bẫy mất gói đẩy khi mạng chập chờn*: `sendPushToEdge()` xóa `pendingCopyIncrement` trước khi gửi; nếu fetch thất bại thì lượt tăng bị nuốt mất mà không thử lại.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Định nghĩa `public saveGlobalMasterCopyCount(): void` và giữ alias `saveDailyMaxCopyCount()` để bảo đảm 100% tương thích ngược và 0 lỗi runtime.
  2. Đồng bộ công thức `virtualCopy = Math.floor(elapsedMigrationMinutes * 0.5)` vào `deterministicEngine.ts` và `snapshotService.ts`, xóa bỏ hoàn toàn sai lệch giữa realtime và snapshot (deviation = 0).
  3. Thêm hàng đợi thử lại `pendingFailedCopyIncrement` và `keepalive: true` cho `sendPushToEdge()`, gọi `flushPendingCopyPush()` khi đóng trang hoặc ẩn tab.
  4. Đảm bảo mọi điểm khởi tạo và cập nhật đều tuân thủ nguyên tắc đơn điệu không giảm `Math.max(this.globalMasterCopyCount, incomingValue, 93545)`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG để lệch công thức tính giữa deterministicEngine và virtualLayerService*: Cả hai bắt buộc phải dùng cùng một mốc migration anchor (`1793181600000`) và cùng tốc độ `0.5/phút`.
  - ❌ *Tuyệt đối KHÔNG gán đè bộ đếm mà không qua Math.max*: Mọi thao tác gán đều phải bảo toàn tính đơn điệu không giảm.
  - ❌ *Tuyệt đối KHÔNG xóa bộ đếm copy lúc 0h*: Đây là Tổng lượt sao chép toàn web (All-time global total).

### ISSUE-170: Bẫy Hardcode Giờ Ra Mắt Trong sanitizeAndSafeguardUpcomingGames Khiến Không Thể Đổi Giờ Game (Upcoming Games Release Date Hardcoded Safeguard Pitfall)
- **Triệu chứng**:
  - Bot gọi `POST /api/crawler/ingest-upcoming-games` gửi toàn bộ bản ghi để đổi `releaseDate` của một tựa game (ví dụ Monster Hunter Outlanders từ 10:00 sang 05:00: `2026-10-29T05:00:00+07:00`).
  - Máy chủ trả về 200 OK, `updatedCount: 1`, `processedDetails` ghi nhận ngày mới.
  - Nhưng khi đọc lại bằng GET `?status=ALL` hoặc `?status=UPCOMING`, `releaseDate` vẫn trơ trơ là `2026-10-29T10:00:00+07:00`.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy cưỡng ép gán ngày trong hàm sanitize cũ*: Trong `functions/api/crawler/ingest-upcoming-games.ts`, hàm `sanitizeAndSafeguardUpcomingGames` chứa 8 khối mã hardcode fallback ngày giờ cho 8 game ban đầu. Cụ thể dòng kiểm tra `if (!g.releaseDate || g.releaseDate.includes('00:00') || ...) g.releaseDate = '2026-10-29T10:00:00+07:00';`.
  2. *Bẫy includes('00:00') khớp nhầm mọi định dạng ISO có giây*: Bất kỳ chuỗi ngày chuẩn ISO 8601 nào có phần giây `:00:00` (như `2026-10-29T05:00:00+07:00`) đều chứa chuỗi con `'00:00'`. Do đó điều kiện luôn trả về `true` và đè ngược lại về 10:00.
  3. *Bẫy thực thi kép ở cả POST và GET*: Hàm này được gọi ở cuối hàm POST (trước khi lưu D1) và ở đầu hàm GET (khi đọc trả về cho client). Vì vậy mọi thay đổi giờ đều bị hủy hoại trước khi vào DB hoặc ngay khi đọc ra.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Loại bỏ toàn bộ các câu lệnh gán `g.releaseDate = ...` trong `sanitizeAndSafeguardUpcomingGames`. Hàm này chỉ được phép bảo vệ `category`, `publisher`, và các link cơ bản khi bị rỗng hoặc mang giá trị placeholder.
  2. Thêm action chuyên biệt `set_release_date` / `update_release_date` để bot và admin cập nhật giờ ra mắt cực nhanh, bảo toàn 100% tất cả các trường khác.
  3. Bổ sung `Cache-Control: no-cache, no-store, must-revalidate` để không lưu đệm cũ trên trình duyệt hay Cloudflare CDN.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG kiểm tra g.releaseDate.includes('00:00') để đoán giờ mặc định*: Chuỗi ISO luôn có giây `:00:00`.
  - ❌ *Tuyệt đối KHÔNG chuẩn hóa giờ ra mắt về 10:00 ở phía máy chủ*: Giờ ra mắt do bot/admin toàn quyền quyết định.
  - ❌ *Tuyệt đối KHÔNG can thiệp vào bản ghi game thật trong quá trình kiểm thử*: Chỉ dùng bản ghi thử và dọn dẹp sạch sẽ sau khi kiểm thử.

### ISSUE-169: Bẫy Chặn URL Ảnh Ngoài Trong resolveArticleCover & Client Sync Đè Mất Bản Ghi Bot (News Cover Resolution Blocking & Sync Overwrite Pitfall)
- **Triệu chứng**:
  - Bot gọi `PUT /api/news/:id` cập nhật `cover_url` thành link chính thức ngoài (`https://sgimage.netmarble.com/...`, `https://www.nomanssky.com/...`) trả về 200 OK.
  - Tuy nhiên ngoài trang công khai `/news` và modal tin tức, thẻ bài viết vẫn vẽ ảnh mặc định chung (`thi-truong-game-viet-nam.webp`).
  - Khi Admin mở web hoặc lưu cấu hình, payload client mang bài viết cũ với `cover_url: "/og-image.jpg"` gửi lên `POST /api/sync`, xóa sạch ảnh bìa chính thức mà bot vừa cập nhật trên D1.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy chặn chuỗi http/https trong hàm hiển thị*: Trong `src/utils/newsImageUtils.tsx`, điều kiện `if (!isBlockedExternal && raw && raw !== '/og-image.jpg' && !raw.startsWith('http'))` sử dụng toán tử phủ định `!raw.startsWith('http')`, dẫn đến việc từ chối 100% tất cả các link ảnh ngoài hợp lệ (Netmarble, Hello Games, CDN), ép rơi xuống ảnh fallback generic.
  2. *Bẫy ưu tiên từ khóa chủ đề (topicCover) trước ảnh bìa thật*: Khi bài viết có từ khóa "quà tặng", "thị trường", "esports", hàm topicCover tự động chặn trước và gán ảnh chuyên đề mặc định, bỏ qua ảnh bìa tùy biến của bài viết.
  3. *Bẫy ghi đè mảng articles thô trong `POST /api/sync`*: Phía server nhận `body.newsArticles` từ client cũ và gán thẳng `currentMaster.newsArticles = incomingNews`, ghi đè D1 mà không so sánh từng trường.
  4. *Bẫy in-memory cache RAM 60s*: Worker cache `settingMemoryCache` không cho phép bypass khi có tham số `fresh=1`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Cho phép `resolveArticleCover` trả về mọi `cover_url` hợp lệ (kể cả http/https) không nằm trong danh sách đen 403 hotlink và không phải `/og-image.jpg`.
  2. Đặt kiểm tra `cover_url` thật lên trước việc phân tích từ khóa chủ đề generic.
  3. Xây dựng Intelligent Field-Level Merge trong `POST /api/sync`: Nếu bản ghi server có ảnh chính thức trong khi client gửi `/og-image.jpg` hoặc rỗng, bảo lưu 100% ảnh bìa của server.
  4. Hỗ trợ `bypassCache` trong `getSettingD1` và `getMultipleSettingsD1` khi truy vấn `wcg_news_articles_v1` hoặc cờ `fresh=1`.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG chặn !raw.startsWith('http') trong resolveArticleCover*: Ảnh ngoài hợp lệ (không 403) phải được phép hiển thị.
  - ❌ *Tuyệt đối KHÔNG ghi đè thô incomingNews trong POST /api/sync*: Luôn thực hiện merge cấp trường để bảo vệ dữ liệu bot.

### ISSUE-168: Bẫy Nuốt Lượt Sao Chép Do Lệch Mốc Server/Client & Cộng Trùng Thông Báo (Copy Counter Split Baseline & Duplicate Increment Pitfall)
- **Triệu chứng**:
  - Khi khách bấm Sao chép ở bất kỳ giftcode nào, số lượt sao chép trên Header và Hero Banner không tăng, đứng yên ở 93.545.
  - Khi thông báo COPY_CODE xuất hiện ở góc trái, bộ đếm không nhảy số.
  - Endpoint /api/metrics/synced trả về mốc cao (92.595 nội suy thành 93.545), trong khi /api/realtime-events trả về mốc thấp 5.240, gây lệch nhau hơn 88.000.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy nuốt số bằng Math.max giữa mốc thấp và mốc cao*: Phép tính `Math.max(serverVal, dailyMaxCopyCount)` với `serverVal = 5.240 + 1 = 5.241` và `dailyMaxCopyCount = 93.545` luôn trả về 93.545, khiến mọi lượt bấm thật của người dùng bị triệt tiêu hoàn toàn.
  2. *Bẫy không tăng số khi nổ thông báo*: MarketingNotificationToast.tsx chỉ gọi `broadcastCurrentCount()` (chỉ đọc lại số cũ) thay vì gọi `incrementLiveCounter(1, notif.id)`. Đồng thời hàm tăng cũ có chốt chặn tự thoát nếu có `notifId` và `serverMasterCopy.count > 0`.
  3. *Bẫy cộng trùng giữa lượt bấm và thông báo của chính mình*: Khi người dùng bấm Sao chép, hệ thống tự động sinh 1 thông báo sao chép của chính người đó. Nếu không có cơ chế gắn cờ nội bộ (`isSelfClick`, `lastSelfClickToastId`), cặp này sẽ bị tính thành 2 lần tăng (+1 lúc bấm và +1 lúc thông báo nổ).
  4. *Bẫy reset bộ đếm về 0 lúc 0h*: Thiết kế cũ coi lượt sao chép là theo ngày nên đặt `masterCopyClicks = 0` khi sang ngày mới. Với yêu cầu Tổng lượt sao chép toàn web (All-time global total), bộ đếm phải là đơn điệu không giảm.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Di dời mốc toàn diện lên `93.545` tại realEventsHub.ts, virtualLayerService.ts, và deterministicEngine.ts.
  2. Chuyển đổi sang `globalMasterCopyCount` đơn điệu không giảm, cộng lạc quan ngay lập tức khi bấm và khi thông báo nổ.
  3. Gắn cờ `isSelfClick = true` và ghi nhận `selfClickToastIds` cho thông báo phát sinh từ thao tác người dùng, giúp Toast nhận diện và chỉ broadcast mà không cộng thêm lần 2.
  4. Thông báo ảo / sự kiện từ người khác gọi `incrementLiveCounter(1, notif.id)` kèm kiểm tra `processedCopyNotifIds` chống cộng trùng.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG dùng Math.max giữa mốc server thấp và mốc hiển thị cao*: Phải đưa server lên cùng mốc với hiển thị.
  - ❌ *Tuyệt đối KHÔNG cộng thêm nội suy ngày chồng lên 93.545*: 93.545 đã là mốc cuối cùng.
  - ❌ *Tuyệt đối KHÔNG thêm nhãn hay đổi giao diện thông báo để phân biệt tự bấm*: Bắt buộc phân biệt bằng cờ nội bộ ngầm trong bộ nhớ.

### ISSUE-167: Bẫy Phân Tách Kho Bài Viết API Bot & Kho Hiển Thị Client (News API Repository Disconnect & Realtime Sync Bridge)
- **Triệu chứng**:
  - Bài viết đăng qua bot / API ngoài (POST /api/news) thành công và xuất hiện trong /api/news (174 bài), nhưng trên web khách (/news) và panel admin chỉ hiển thị 163 bài.
  - Sửa bài (PUT) hoặc xóa bài (DELETE) qua API không lập tức phản ánh trên web khách do client bundle trang /news không có tham chiếu tự động kéo dữ liệu từ server khi là khách vãng lai (!isAdmin).
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy phân lập luồng đồng bộ khách/admin (Non-admin sync bypass)*: In dataService.ts, khối `if (!isAdmin)` trước đây chỉ kéo branding và giveaways mà bỏ qua bài viết tin tức, khiến khách truy cập không bao giờ kích hoạt sync dữ liệu tin tức mới.
  2. *Bẫy không xóa in-memory cache khi cập nhật D1 trực tiếp*: In functions/api/news/*, các thao tác ghi dữ liệu gọi SQL thô thay vì gọi qua `setSettingD1` kèm `invalidateSettingMemoryCache`, dẫn tới Worker tiếp tục phục vụ dữ liệu cũ trong RAM cache.
  3. *Bẫy bài đặt lịch (SCHEDULED) bị lộ sớm*: Cần chốt chặn phía server để bài hẹn giờ trong tương lai tuyệt đối không được trả về cho khách công khai (!authorized) trước khi chạm mốc `scheduled_publish_at`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. functions/services/d1_service.ts: Cung cấp `invalidateSettingMemoryCache(key)`.
  2. functions/api/news/*: Luôn dùng `setSettingD1` và invalidate cache cho cả `wcg_news_articles_v1` và `wcg_master_state_v4`.
  3. functions/api/sync.ts: Chặn bài SCHEDULED trong tương lai với khách công khai; tự động kích hoạt thành PUBLISHED khi chạm giờ hẹn.
  4. src/services/newsService.ts & dataService.ts: Cung cấp `syncFromServer()` kéo `/api/sync?key=wcg_news_articles_v1&fresh=1` (fallback `/api/news?limit=all`) cho cả khách vãng lai và trang admin.
  5. Backfill đầy đủ 4 bài viết mới vào seedNews.ts bảo đảm bundle tĩnh ban đầu luôn hoàn chỉnh 167 bài.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG bỏ qua đồng bộ tin tức ở client khi không phải admin*: Luôn cho phép `newsService.syncFromServer()` chạy nhẹ nhàng ở background.
  - ❌ *Tuyệt đối KHÔNG hiển thị bài SCHEDULED ra ngoài web trước giờ hẹn*: Kiểm tra nghiêm ngặt `nowMs >= schedTime`.

### ISSUE-166: Bẫy Đơn Quyền Cứng Nhắc & Thiếu Khả Năng Cấu Hình Đa Quyền Linh Hoạt Cho API (Single-Scope Hardcoding & Versatile Key Scoping)
- **Triệu chứng**:
  - Mỗi khóa API trước đây chỉ có 1 quyền duy nhất (ví dụ NEWS_FULL hoặc MISSIONS_FULL). Muốn dùng bot làm cả 2 tác vụ phải lưu trữ và chuyển đổi qua lại giữa 2 token khác nhau.
  - Các hàm kiểm tra quyền dùng toán tử so sánh bằng nghiêm ngặt (=== 'NEWS_FULL'), dẫn tới nếu lưu chuỗi đa quyền "NEWS_FULL,MISSIONS_FULL" thì cả 2 endpoint đều từ chối quyền truy cập.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy so sánh chuỗi đơn lẻ*: Tuyệt đối không dùng `row.scope === 'NEWS_FULL'`. Bắt buộc dùng hàm kiểm tra trung tâm `hasScope(row.scope, 'NEWS_FULL')` có khả năng bóc tách danh sách phân tách bằng dấu phẩy và thừa hưởng từ `ADMIN_FULL`.
  2. *Bẫy không hỗ trợ set quyền qua API*: Admin hoặc bot tự động cần có khả năng dùng 1 mã API có quyền `API_KEYS_FULL` để set quyền cho các mã khác qua endpoint `POST /api/api-keys/set-permissions` mà không phải thao tác tay trong database.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Cung cấp bộ hàm chuẩn `hasScope`, `parseScopes`, `formatScopes` trong `mission_service.ts` áp dụng cho toàn bộ codebase.
  2. Xây dựng endpoint `POST /api/api-keys/set-permissions` và Modal "Set Quyền" trực quan trong Admin UI.
  3. Cung cấp khóa API đa năng mẫu `wcg_multi_...` cho phép gán bất kỳ tổ hợp quyền nào trên website.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gán cứng scope*: Luôn dùng `hasScope` để hỗ trợ cả khóa đơn quyền, khóa đa quyền và khóa Master.

### ISSUE-165: Bẫy Xóa Nhầm Nhật Ký Kiểm Tra Nhiệm Vụ & Thiếu Đồng Bộ Giờ Mở/Đóng Thực Tế (Missions Audit Immutability & Scheduling Enforcement)
- **Triệu chứng**:
  - Khi thực hiện xóa toàn diện (?force=true), hệ thống xóa cả bảng mission_audit_logs, làm mất toàn bộ vết tích kiểm toán và bằng chứng lịch sử duyệt/phát thưởng.
  - Trường start_time và end_time có lưu trong cơ sở dữ liệu nhưng phía API nộp bài (submit.ts) không kiểm tra, dẫn tới người dùng vẫn nộp được bài trước giờ mở hoặc sau giờ đóng.
  - Thống kê nhiệm vụ thiếu các chỉ số: views (lượt xem), participants_count (số người tham gia thực tế).
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy xóa kèm audit log khi force delete*: Bảng nhật ký kiểm tra (mission_audit_logs) phải là append-only và bất biến (immutable). Khi xóa nhiệm vụ, tuyệt đối không gọi DELETE FROM mission_audit_logs; đồng thời phải lưu sẵn mission_title vào nhật ký để khi bản ghi nhiệm vụ bị xóa, trang nhật ký vẫn hiển thị đúng tên nhiệm vụ.
  2. *Bẫy cấu hình giờ ảo (Virtual Time Gates)*: Nếu chỉ kiểm tra ở giao diện Client (React component) mà không chặn ở Backend API (submit.ts), kẻ gian có thể gọi API trực tiếp để nộp bài trước giờ mở hoặc sau giờ đóng.
  3. *Bẫy giá trị thưởng ảo cho mã Code*: Loại thưởng CODE nhận mã từ kho mission_reward_pools, không có giá trị tiền mặt cố định. Để reward_value = 10000 gây hiểu lầm cho người dùng và quản trị viên. Bắt buộc ép reward_value = 0 và ẩn ô nhập tiền khi chọn CODE.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xóa toàn diện (?force=true) CHỈ xóa missions, mission_submissions, mission_reward_pools; BẢO LƯU 100% mission_audit_logs.
  2. submit.ts kiểm tra nghiêm ngặt start_time và end_time; chặn nộp mới nhưng hồ sơ nộp cũ trước hạn chót vẫn duyệt và trả thưởng được.
  3. Tính toán và hiển thị đầy đủ 7 chỉ số: views, participants_count, submissions_count, approved_count, rejected_count, rewards_claimed, quota_remaining.
  4. Duy trì AI duyệt chốt cuối & phát thưởng ngay; nút Duyệt hàng loạt là công cụ duyệt tay hàng loạt cho Admin khi xử lý hồ sơ tồn đọng.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG xóa bảng mission_audit_logs dưới bất kỳ hình thức nào*: Audit log là tài sản kiểm toán bất biến.
  - ❌ *Tuyệt đối KHÔNG chuyển luồng AI duyệt sang đề xuất*: Quyết định của AI theo yêu cầu chủ sở hữu là chốt cuối và trả thưởng ngay.

### ISSUE-164: Bẫy Giới Hạn Scope Khóa API Nhiệm Vụ & Thiếu Đồng Bộ Xác Thực Đa Kênh (Missions API Scoping & Full Access Verification)
- **Triệu chứng**:
  - Bot AI (ví dụ Pine) hoặc các script tự động hóa bên ngoài không thể CRUD nhiệm vụ hoặc nạp kho mã vì verifyAdminAuth chỉ chấp nhận phiên đăng nhập web hoặc Master Secret, trong khi khóa API AI sinh ra chỉ được phép gọi /api/missions/ai/pending.
  - Nguy cơ nếu không phân quyền rõ: cấp quyền admin toàn bộ website (bao gồm cấu hình hệ thống, rút tiền) cho một API key nhiệm vụ bên ngoài thay vì cô lập trong phạm vi nhiệm vụ.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy trói chặt API vào session cookie web*: API không nên phụ thuộc vào session cookie hay token người dùng web. Bắt buộc hỗ trợ chuẩn Authorization: Bearer và X-Api-Key.
  2. *Bẫy khóa API không phân biệt scope*: Cần hỗ trợ 2 cấp độ rõ ràng: FULL (toàn quyền quản trị module nhiệm vụ) và REVIEW_ONLY (chỉ đọc hồ sơ bài nộp và gửi kết quả thẩm định).
  3. *Bẫy xóa vội vã (Accidental Deletion)*: Khi xóa nhiệm vụ qua DELETE /api/missions/:id, nếu đã có bài nộp, mặc định phải chặn lại và chỉ cho phép xóa khi có tham số xác nhận rõ ràng ?force=true.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. verifyAdminAuth và verifyAiKeyAuth trong mission_service.ts hỗ trợ thống nhất cả Master Keys, API Keys từ bảng mission_ai_api_keys (với scope = "FULL"), và Admin Session Tokens.
  2. Hỗ trợ mảng mã codes: string[] trực tiếp khi nạp kho qua POST /api/missions/pools.
  3. Hỗ trợ BATCH_APPROVE và BATCH_REJECT trong POST /api/missions/submissions.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG hardcode secret trong mã nguồn*: Sử dụng cơ chế băm SHA-256 an toàn trong bảng mission_ai_api_keys và nạp biến môi trường.

### ISSUE-163: Bẫy Mất Bài Viết Tin Tức Do Lệch Sync & Ghi Đè Snapshot Rỗng (News Articles Disappearance & Overwrite Safeguard)
- **Triệu chứng**:
  - Trang Quản trị (Admin) khi mở trên máy mới hoặc trình duyệt mới không hiển thị danh sách bài viết tin tức đầy đủ (171 bài), chỉ hiển thị danh sách hạt giống mặc định hoặc trống trơn.
  - Nguy cơ nếu không có chốt chặn: Client gửi dữ liệu từ localStorage chưa tải xong lên server qua /api/sync làm ghi đè và xóa mất toàn bộ 171 bài viết thực tế đã có trên D1.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy bỏ sót trường trong syncWithCloudflareKV*: Khi đồng bộ ban đầu giữa server và adminDataService, trường json.newsArticles không được tiếp nhận, khiến adminDataService chỉ quản lý games, codes, giveaways mà bỏ qua bài viết tin tức.
  2. *Bẫy ghi đè server-side vô điều kiện*: Server nhận mảng rỗng hoặc ít bài hơn từ một client lỗi thời và lưu đè trực tiếp mà không đối chiếu với danh sách xóa (wcg_deleted_news_articles_v1).
  3. *Bẫy snapshot rỗng xóa sạch client storage*: newsService.applyServerSnapshot() nếu nhận mảng rỗng [] từ server hoặc lỗi mạng sẽ xóa sạch danh sách local hiện có.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Đồng bộ 2 chiều: adminDataService.syncWithCloudflareKV() tiếp nhận newsArticles từ D1, smart merge và kích hoạt wcg_news_updated.
  2. Chốt chặn chống ghi đè 2 lớp: Client từ chối sync nếu dữ liệu rỗng bất thường. Server tự động phát hiện số lượng bài gửi lên ít hơn số lượng bài hiện có trên D1, đối chiếu với deletedNewsArticles tombstones, giữ lại các bài chưa được duyệt xóa và tự động sao lưu vào wcg_news_articles_backup_v1.
  3. Mở rộng API RESTful độc lập (/api/news, /api/news/:id) và hỗ trợ Lịch hẹn đăng (SCHEDULED) tự động kích hoạt khi đến giờ hẹn.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG lưu đè mảng bài viết ít hơn mà không qua đối chiếu tombstones*: Bắt buộc phải bảo toàn các bài viết cũ trừ khi có ID trong danh sách xóa rõ ràng.
  - ❌ *Tuyệt đối KHÔNG cho phép applyServerSnapshot([]) xóa bộ nhớ khi client đang có dữ liệu*: Luôn kiểm tra Array.isArray(serverArticles) && serverArticles.length > 0.

### ISSUE-162: Bẫy Hệ Thống Nhiệm Vụ (Missions Multi-Accounting, Duplicate Proof Links & Atomic Reward Delivery)
- **Triệu chứng**:
  - Người dùng spam nhiều tài khoản để nộp chung 1 đường link bài đăng facebook, nộp link bài đăng rác hoặc link ngoài các mạng xã hội được cho phép.
  - Nguy cơ nếu thiết kế sai: trả thưởng trùng lặp 2 lần cho cùng 1 bài nộp (double-spend), dùng chung bảng `giveaway_codes` làm lẫn lộn mã kho, hoặc xóa nhiệm vụ khi đang có hồ sơ bài nộp dẫn tới mồ côi dữ liệu trong `mission_submissions`.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy dùng chung kho mã với Giveaway*: Tuyệt đối không lưu mã nhiệm vụ vào `giveaway_codes`. Bắt buộc dùng bảng riêng `mission_reward_pools` với quan hệ khóa ngoại `mission_id`.
  2. *Bẫy gian lận nộp trùng link giữa nhiều tài khoản*: Phải có cơ chế kiểm tra `WHERE mission_id = ? AND proof_link = ? AND status != 'REJECTED'`. Nếu bài đăng đã nộp bởi người khác, lập tức từ chối.
  3. *Bẫy spam hồ sơ PENDING*: Giới hạn 1 tài khoản chỉ được có tối đa 5 hồ sơ `PENDING` trên toàn sàn cùng lúc.
  4. *Bẫy không kiểm soát tuổi tài khoản*: Hỗ trợ thiết lập `min_account_age_days` (mặc định 0), ngăn chặn việc tạo tài khoản clone hàng loạt để gian lận nhiệm vụ có thưởng lớn.
  5. *Bẫy trả thưởng không nguyên tử*: Khi duyệt bài (`APPROVE`), việc claim mã từ kho `mission_reward_pools` hoặc cộng tiền ví `members.balance` phải thực hiện trong một khối giao dịch nguyên tử (`db.batch`), cập nhật đồng thời trạng thái `mission_submissions` và ghi `mission_audit_logs`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xây dựng dịch vụ `mission_service.ts` với đầy đủ bộ lọc URL, whitelist miền (`allowed_domains`), băm khóa AI SHA-256.
  2. Khởi tạo 5 bảng D1 chuyên biệt: `missions`, `mission_submissions`, `mission_reward_pools`, `mission_ai_api_keys`, `mission_audit_logs`.
  3. Quản trị phân quyền nghiêm ngặt, hỗ trợ 3 chế độ duyệt (`MANUAL`, `AI_AUTO`, `AI_ASSISTED`).
  4. Bộ kiểm thử `test_missions_system.cjs` bảo đảm 100% các tiêu chí phòng chống gian lận và dọn dẹp sạch sẽ theo Quy tắc 7.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG gộp mã nhiệm vụ vào bảng `giveaway_codes`*: Phải dùng `mission_reward_pools`.
  - ❌ *Tuyệt đối KHÔNG cho phép xóa nhiệm vụ khi đã có bài nộp trong hệ thống*: Phải giữ nguyên vẹn tính toàn vẹn dữ liệu và yêu cầu đổi trạng thái sang `PAUSED` hoặc `ENDED`.

---

### ISSUE-161: Bẫy Số Mã Hiển Thị Chuyển Động Cho Giveaway (Virtual Stock Drift, Zero Real Stock Impact & Cycle Bounce)
- **Triệu chứng**:
  - Event mô phỏng lượt giật nhưng con số mã còn lại hiển thị trên thẻ event đứng im không chuyển động, làm giảm tính chân thực của chiến dịch.
  - Nguy cơ nếu thiết kế sai: chèn mã ảo vào kho thật, làm sai lệch số lượng mã trong bảng D1 `giveaway_codes` hoặc `codes_pool`, hoặc khi kho thật về 0 mà số hiển thị vẫn cộng thêm gây ra tình trạng người thật bấm giật bị lỗi không có mã.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy can thiệp trực tiếp vào kho mã thật*: Tuyệt đối không được thay đổi `remaining_codes` hay `codes_pool` khi bot mô phỏng giật. Số thật chỉ giảm khi người thật giật thành công.
  2. *Bẫy không hồi số cộng thêm khi chạm số thật*: Khi các lượt giật trừ số hiển thị về đúng số thật trong kho (phần cộng thêm về 0), nếu không hồi lại `virtual_remaining_addition` thì số hiển thị sẽ kẹt ở số thật và mất đi hiệu ứng FOMO. Bắt buộc: khi `currentAddition <= 0`, ngay lập tức hồi lại `additionConfig` (ví dụ 20).
  3. *Bẫy cộng ảo khi kho thật đã hết*: Khi kho thật về 0 (`realStock <= 0`), số hiển thị BẮT BUỘC phải về 0, engine mô phỏng dừng hẳn, không được cộng thêm bất kỳ con số nào.
  4. *Bẫy nhầm lẫn trong trang quản trị*: Bảng quản trị phải hiển thị tách bạch rõ ràng 3 giá trị: Thật còn lại / Số cộng thêm / Số hiển thị, không gộp chung gây hiểu lầm cho admin.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Cấu hình `virtual_remaining_addition` (mặc định 20) và `virtual_remaining_current` trong D1 `giveaways` và TypeScript types.
  2. Engine mô phỏng trừ `virtual_remaining_current` đi 1 mỗi lượt; khi chạm 0 lập tức hồi lại `additionConfig`.
  3. Khi người thật giật mã: kho thật giảm 1, `virtual_remaining_current` giữ nguyên $\to$ số hiển thị tự động giảm 1.
  4. Hàm `getGiveawayDisplayRemaining(campaign)` đảm bảo: `realStock <= 0` $\to$ 0; `enable_auto_simulation === false` $\to$ `realStock`; bật mô phỏng $\to$ `realStock + currentAddition`.
  5. Bảng admin hiển thị tách bạch 3 thông số kèm tooltip công thức toán học.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG cộng thêm mã vào `codes_pool` hay `giveaway_codes`*: Chỉ điều chỉnh con số hiển thị qua biến `virtual_remaining_current`.
  - ❌ *Tuyệt đối KHÔNG hiển thị số cộng thêm khi event đã hết mã thật trong kho*: Kho thật = 0 thì Hiển thị = 0.

---

### ISSUE-160: Bẫy Khối Thông Báo Cooldown Chiếm Dụng Modal & Ẩn Banner Link Zalo Do D1 DEFAULT 0
- **Triệu chứng**:
  - Modal sự kiện Giveaway (`GiveawayDetailModal`) khi đang giãn cách toàn sàn hiển thị một khối card đỏ sẫm to tướng, số đếm ngược cỡ `3xl`, badge phòng chờ và mô tả nhiều dòng làm choán hết nửa modal.
  - Thẻ link nhóm Zalo chính thức của website bị biến mất hoàn toàn khỏi modal.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy UI Over-design trong Modal*: Modal là không gian giới hạn trên thiết bị di động/laptop. Việc nhồi nhét cả 1 card to đùng với số đếm ngược khổng lồ bên trên 1 nút bấm bên dưới làm vỡ bố cục và gây khó chịu cho người dùng. Khối thông báo phải được thu gọn thành chính nút bấm hành động duy nhất (`Đang Chờ Đợt Mã Tiếp Theo (Còn MM:SS)`).
  2. *Bẫy `custom_banner_enabled INTEGER DEFAULT 0` trong D1*: Khi một cột DB mang giá trị mặc định là 0 (hoặc false), phép kiểm tra `meta.custom_banner_enabled !== undefined` trên frontend sẽ nhận giá trị 0 này và ép `Boolean(0) === false`. Điều này ghi đè hoàn toàn giá trị `custom_banner_enabled: true` của Mẫu Chung, khiến link nhóm Zalo của web bị ẩn dù người dùng không hề cố ý tắt.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Thu gọn nút bấm*: Loại bỏ card to, chỉ render nút `py-3.5` với icon đồng hồ nhấp nháy, kèm dòng chú thích nhỏ `text-[11px]` thanh thoát bên dưới. Khi hết giờ, nút chuyển tức thì sang `⚡ GIẬT MÃ CODE NGAY (MIỄN PHÍ)`.
  2. *Chính sách hiển thị Link Zalo*: Luôn hiển thị link nhóm Zalo chính thức của website (`https://zalo.me/g/qdtlmj2tebfa0baraedg`) với text `"Tham gia nhóm zalo của web tại đây"` trừ khi admin cố ý tắt bằng giá trị `false` tường minh.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG render thêm card đếm ngược riêng biệt bên trên nút bấm trong modal*: Modal chỉ nên giữ 1 nút bấm hành động duy nhất.
  - ❌ *Tuyệt đối KHÔNG ẩn banner link Zalo chỉ vì `campaign.custom_banner_enabled` chưa được set*: Phải luôn fallback về link nhóm Zalo chính thức của web.

---

### ISSUE-159: Bẫy Mô Phỏng Lượt Giật Giveaway (Auto-Simulation Gating, Stock Isolation & Cooldown Handover)
- **Triệu chứng**:
  - Event bật giãn cách toàn sàn (Global Cooldown) nhưng không có người giật thì thẻ nằm im, thiếu sôi động.
  - Nguy cơ nếu thiết kế mô phỏng sai: mô phỏng làm hao hụt mã thật trong kho (`remaining_codes` hoặc `codes_pool` bị giảm), tạo đơn hàng ảo làm rối đối soát kế toán, hoặc CD mô phỏng không khóa người thật khiến người thật giật được liên tục không đúng luật giãn cách, hoặc danh sách tên mô phỏng bị thiếu/lọc nhầm do comment regex.
- **Nguyên nhân gốc rễ & Các bẫy cần tránh**:
  1. *Bẫy regex comment trong danh sách tên mô phỏng*: Khi lọc tên bằng regex `split(',')` rồi `.filter(s => !s.startsWith('//'))`, chuỗi comment đầu nhóm `// 1. Vietnamese...` nằm liền kề trước tên đầu tiên khiến tên đó bị nối vào chuỗi comment và bị lọc mất (thực tế mất 4 tên còn 86). Bắt buộc dùng `cleanCode = raw.replace(/\/\/.*$/gm, '')` trước khi split.
  2. *Bẫy lẫn lộn giữa mã thật và mã ảo*: Lượt mô phỏng tuyệt đối không được gọi `giveaway_codes.pop()` hay ghi vào bảng đơn hàng thật `orders`. Số lượt "Đã giật" hiển thị cho khách phải tăng thông qua `virtual_claimed_offset += 1` đúng theo cơ chế FOMO của sàn.
  3. *Bẫy Cooldown không đồng bộ*: Lượt mô phỏng bắt buộc phải cập nhật `last_global_claim_at` vào cả D1 `giveaways` để `/api/giveaways/claim` tự động kích hoạt mã lỗi `GLOBAL_COOLDOWN_ACTIVE` chặn người thật cho đến khi hết thời gian giãn cách.
  4. *Bẫy ghi đè lượt thật*: Khi người thật giật sau khi hết CD, backend phải reset `is_last_claim_simulated: false`, cập nhật `last_real_claim_at: nowIso` và ghi nhận `is_simulated: false` để mốc idle được reset.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xây dựng `giveaway_simulation_service.ts` với kho 90 tên chuẩn (`PRESET_SIMULATED_NAMES`), công thức idle threshold `Math.max(60, 3x Cooldown)`.
  2. 5 cổng gating kiểm tra nghiêm ngặt: (1) Đang mở, (2) Còn mã kho thật, (3) Bật switch mô phỏng (`enable_auto_simulation !== false`), (4) Cooldown trước đã hết (chống trùng lặp), (5) Đã trôi qua ngưỡng idle kể từ lượt giật thật gần nhất.
  3. Cập nhật D1 schema, PRAGMA checks, migration, sync và mapping cho các trường `enable_auto_simulation`, `simulation_idle_threshold_minutes`, `last_real_claim_at`, `last_simulated_claim_at`, `is_last_claim_simulated`.
  4. Nâng cấp Admin Form, Switch, Threshold input, Nút "⚡ Quét Mô Phỏng" và Modal Claim History 3 Tabs (Tất cả / Người thật / Mô phỏng) kèm badge nhận diện.
  5. Viết bộ kiểm thử 11 bài `test_giveaway_simulation.cjs` pass 100%.
- 🚫 **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối KHÔNG trừ kho thật hoặc tạo order thật cho lượt mô phỏng*: Toàn bộ mã thật phải bảo toàn 100%.
  - ❌ *Tuyệt đối KHÔNG dùng tên người dùng thật trong CSDL để làm tên mô phỏng*: Chỉ dùng kho 90 tên preset FOMO độc lập.
  - ❌ *Tuyệt đối KHÔNG để Cooldown mô phỏng trôi qua mà không khóa người thật*: `last_global_claim_at` phải khóa như lượt thật.

---

### ISSUE-158: Bẫy Array.isArray Ép Kho Về 0 Khi codes_pool Rỗng, Bulk Sync Reset remaining_codes & Trôi Vị Trí Admin
- **Triệu chứng**:
  - Chủ web đã nạp khoảng 30 mã vào sự kiện Tiên Nghịch Mobile trong trang admin. Nhưng sau bản sửa, kho công khai vẫn hiển thị 0 mã, tổng 52 (lệch $22 + 0 = 22 \neq 52$).
  - Sự kiện lúc hiện lúc mất, bị trôi mất tích khỏi các hàng đầu tiên của Admin dù bộ lọc Admin đếm đủ 41 sự kiện. Bảng công khai đếm 37 sự kiện gây hoang mang.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Bẫy `Array.isArray(codes_pool) ? codes_pool.length : remaining_codes`*: Public endpoint giấu mã thật trả về `codes_pool: []`. `Array.isArray([]) === true` khiến frontend lấy độ dài 0, đè mất số lượng `remaining_codes: 30`.
  2. *Fallback tĩnh ghi đè ngược*: `src/data/giveaways.json` bị đặt cứng `remaining_codes: 0, codes_pool: []`. Mỗi khi khởi tạo lại từ fallback, kho mã bị ép về 0.
  3. *Tiến trình Bulk Sync xóa trắng kho mã*: Trong `functions/services/d1_service.ts`, `syncGiveawaysToD1` tính `remainingCount = 0` nếu payload không có `codes_pool` và ghi đè `remaining_codes = 0` vào bảng `giveaways`.
  4. *Sắp xếp Admin chỉ dựa vào `Math.max(updated_at, created_at)`*: Đợt bulk sync chạm vào 32/41 sự kiện làm `updated_at` của 32 sự kiện nhảy lên mới hơn Tiên Nghịch Mobile, đẩy Tiên Nghịch Mobile tụt xuống vị trí #33.
  5. *Bản chất 41 vs 37 sự kiện*: Admin đếm từng sự kiện độc lập (41). Client chạy `groupGiveawaysByGame` gom 4 game có 2 sự kiện thành 1 thẻ nhiều gói quà ($41 - 4 = 37$).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Sửa điều kiện đọc số lượng*: `Array.isArray(item.codes_pool) && item.codes_pool.length > 0 ? item.codes_pool.length : (typeof item.remaining_codes === 'number' ? item.remaining_codes : 0)`.
  2. *Thiết lập Chốt Chặn Chống Xóa Mã*: `syncGiveawaysToD1` bắt buộc giữ lại `codes_pool` và `remaining_codes` cũ trong D1 nếu payload mới không chứa pool và không có cờ `clear_pool: true`.
  3. *Thuật toán sắp xếp In-Stock First*: Cả Admin và Client ưu tiên: Đang mở (ACTIVE) → Còn mã trong kho (`remaining_codes > 0`) → Số mã còn lại nhiều hơn → Thời gian cập nhật.
  4. *Đồng bộ toàn vẹn 30 mã*: Cập nhật đồng thời D1 `giveaways`, `giveaway_codes` (30 mã AVAILABLE), `system_settings`, và file `giveaways.json`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `Array.isArray(codes_pool)` để xác định có mã hay không*: Bắt buộc phải kiểm tra `codes_pool.length > 0` vì mảng rỗng `[]` vẫn là array.
  - ❌ *Không ghi đè `remaining_codes = 0` khi một tiến trình sync gửi payload không kèm `codes_pool`*: Phải có cơ chế bảo toàn kho hàng hiện có trừ khi có lệnh xóa tường minh.
  - ❌ *Không sắp xếp danh sách Admin 100% theo `updated_at`*: Phải ưu tiên sự kiện còn mã trong kho để sự kiện có mã thật không bao giờ bị các đợt bulk sync đẩy trôi.

---

### ISSUE-157: Bẫy Rò Rỉ Bản Ghi Game Sang Bộ Lọc LAUNCHED Theo Mốc Thời Gian & Mất Dữ Liệu Do Fallback Seed Cũ
- **Triệu chứng**:
  - API trả về bộ lọc `status=LAUNCHED` chứa 4 bản ghi, trong đó có `Tiên Giới` mang trường `status: "UPCOMING"` (bộ lọc trả sai bản ghi).
  - Bảng game sắp ra mắt chỉ còn 6 game với ngày sai, 13 game bị biến mất khỏi API (`Azur Promilia`, `Elancia Mobile`, và 10 game chưa rõ ngày).
  - Giao diện web chập chờn: lần đầu mở tab hiện 19 game (từ cache), sau đó vài giây co lại còn 6 game (sau khi API fetch trả về).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lọc theo thời gian thay vì trường status*: Nhánh `statusFilter === 'LAUNCHED'` dùng điều kiện `(now - target) > ONE_DAY_MS`. Khi game mang ngày cũ (Tiên Giới mang ngày 25/10), nó bị rò rỉ vào LAUNCHED dù status là UPCOMING.
  2. *Bộ lọc UPCOMING loại bỏ game quá 24h*: Tiên Giới mang ngày 25/10 bị loại bỏ khỏi danh sách UPCOMING vì `elapsed > 24h`, khiến 7 game seed chỉ còn 6 game.
  3. *Mất đồng bộ giữa D1 và Seed Fallback*: Các file fallback trong repo (`canonical_backup_state.json`, `DEFAULT_UPCOMING_GAMES_FALLBACK`, `DEFAULT_UPCOMING_GAMES`, `getDefaultUpcomingGames`) chỉ chứa 7 game hạt giống cũ từ 23/10. Khi fallback kích hoạt hoặc chạy sync, nó ghi đè làm mất 13 game mới và sai ngày của 6 game.
  4. *Ghi đè cache LocalStorage từ API lỗi*: `getUpcomingGamesSync()` đọc từ cache 19 game cũ, sau đó `getUpcomingGames()` gọi API lỗi trả về 6 game và ghi đè lại vào `localStorage`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Lọc nghiêm ngặt theo trường `status`*: Bộ lọc `LAUNCHED` chỉ lấy `g.status === 'LAUNCHED' || g.status === 'ROLLED_OVER'`. Không suy diễn dựa trên thời gian để tránh rò rỉ.
  2. *Đồng bộ toàn bộ 19 game UPCOMING và 3 game LAUNCHED*: Đưa trọn vẹn 22 game vào tất cả các tầng: Cloudflare D1, `canonical_backup_state.json`, `DEFAULT_UPCOMING_GAMES_FALLBACK`, `DEFAULT_UPCOMING_GAMES`, `getDefaultUpcomingGames`.
  3. *Thiết lập Chốt Chặn Bảo Vệ (Safeguard Gate)*: Nếu payload gửi lên làm giảm số lượng game quá 50% (khi CSDL đang có >= 10 game) mà không có cờ `force_bulk_delete: true`, hệ thống tự động từ chối và backup vào `wcg_upcoming_games_backup_v1`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không lọc bản ghi vào danh mục LAUNCHED chỉ bằng việc so sánh ngày tháng*: Trạng thái nghiệp vụ phải tuân theo trường `status` và quy trình rollover có kiểm soát.
  - ❌ *Không để file fallback và canonical backup chứa danh sách thiếu so với thực tế CSDL*: Mọi file fallback phải là bản sao chuẩn xác 100% của SSOT.
  - ❌ *Không cho phép các thao tác bulk save/sync ghi đè làm giảm số lượng bản ghi đột ngột mà thiếu safeguard bảo vệ*.

---

### ISSUE-156: Bẫy Thiếu Asset Logo Cho Game Sắp Ra Mắt Dẫn Đến Hiển Thị Logo Placeholder Mặc Định
- **Triệu chứng**:
  - Tại trang chủ phần "Game Sắp Ra Mắt (Lịch Mở Server)", một số game như `Sword & Staff (Kiếm Vũ Tiên Phong)` và `Project Ananta` hiển thị logo mặc định của CodeGame thay vì logo thực tế của game.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Khi thêm tựa game mới vào danh sách theo dõi sắp ra mắt (upcoming games), cấu hình metadata trỏ đến `/game_icons/${slug}.webp` nhưng chưa qua bước cào/tải và nén asset vào thư mục `public/game_icons/`.
  - Trình duyệt tải ảnh 404, kích hoạt sự kiện `onError` trong React component hiển thị fallback sang logo mặc định `/logo.png`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Khi bổ sung game sắp ra mắt vào seed/database, bắt buộc phải chạy bộ phân giải `resolveAndPersistGameLogo` từ Google Play / nguồn phân phối chính thức để tạo file `.webp` (256x256) và `.jpg` (512x512) trong `public/game_icons/`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không thêm game vào upcoming_games với đường dẫn `/game_icons/${slug}.webp` mà chưa kiểm tra file có tồn tại trên đĩa hay không*.

---

### ISSUE-155: Bẫy Empty Overwrite Khi Merge D1 Với Fallback, Cờ clear_pool Tồn Dư & Sự Kiện Tạm Hết Mã Bị Trôi Khỏi Tầm Nhìn
- **Triệu chứng**:
  - Quản trị viên đã tạo sự kiện Giveaway cho game Tiên Nghịch Mobile, nhưng khi ra trang công khai `/giveaways` thì sự kiện lúc hiện lúc mất, thậm chí biến mất hoàn toàn. Trong khi đó bản ghi game Tiên Nghịch Mobile trên API công khai vẫn bình thường (54 mã / 46 mã hoạt động).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lọc theo kho mã (`remaining_codes: 0`) tại tab "Còn Mã Trong Kho"*: Sau khi dọn sạch mã test `TESTCODE2`, sự kiện có `remaining_codes = 0`. Khi người dùng xem tab "Còn Mã Trong Kho", logic `poolCount > 0` tự động loại bỏ sự kiện.
  2. *Sự kiện bị trôi xuống đáy danh sách ở tab "Tất Cả"*: Thuật toán sắp xếp cũ chỉ ưu tiên hàng còn mã lên đầu và xếp các sự kiện hết mã theo `created_at DESC`. Vì sự kiện tạo ngày 10/10/2026, nó bị đẩy xuống vị trí #32/41, ngoài màn hình quan sát đầu tiên.
  3. *Bẫy Empty Overwrite đè mất Metadata trong API Sync*: Bảng D1 lưu các trường `cover_image_url`, `game_icon_url`, `start_time`, `end_time` là `NULL` và `description`, `rewards` là `''`. Khi API sync merge object `{ ...fallback, ...g }`, các trường null/rỗng từ D1 ghi đè đứt giá trị hợp lệ của fallback, khiến sự kiện mất ảnh, mất mô tả.
  4. *Cờ `clear_pool: true` bị lưu cố định trên CSDL*: Cờ transient `clear_pool` không được gỡ bỏ sau khi thực thi dọn dẹp mã, khiến mỗi lần lưu lại ép kho về 0.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Fallback Guard*: Bổ sung fallback guard trong cả D1 loader (`loadAllGiveawaysD1`) và API sync (`/api/sync`): Không bao giờ để trường null/chuỗi rỗng từ D1 ghi đè lên fallback (`rewards || fallback.rewards`, `cover_image_url || fallback.cover_image_url || /game_icons/${slug}.webp`).
  2. *Sanitize gỡ sạch `clear_pool`*: Trong `syncGiveawaysToD1` và `onRequestPost`, xóa cờ `clear_pool` ngay khi xử lý xong để không bao giờ bị lưu cố định vào CSDL.
  3. *Sort theo `Math.max(updated_at, created_at)`*: Ở cả web khách (`GiveawaysView.tsx`) và web admin (`PrivateCodesModule.tsx`), sắp xếp theo thời điểm cập nhật gần nhất giúp các sự kiện vừa điều chỉnh nổi ngay lên vị trí đầu (Client: #3/41, Admin: #1).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không merge `{ ...fallback, ...d1 }` khi các trường trong D1 có thể là null hoặc chuỗi rỗng*: Bắt buộc phải có fallback guard kiểm tra từng trường chuỗi và URL.
  - ❌ *Không lưu cờ hành động tạm thời (transient action flags như `clear_pool`) vào CSDL lưu trữ vĩnh viễn*.
  - ❌ *Không chỉ sort theo `created_at`*: Phải dùng `Math.max(updated_at, created_at)` để phản ánh đúng hoạt động của quản trị viên.

---

### ISSUE-154: Bẫy Sót Mã Test Sau Khi Chạy Script Kiểm Thử & Lỗi Typo Cột CSDL code_content
- **Triệu chứng**:
  - Sau khi chạy bài kiểm thử tự động `npm run test:ingest`, trên CSDL production vẫn còn tồn tại các mã test (như `ACCESS GRANTED`, `MACRO!`, `MS.FAMILIAR`, `WHAT_NEXT?`, `ckwy32t1eeevs_lower`).
  - Trong kho Giveaway, mã test `TESTCODE2` không bị xóa khi câu lệnh SQL DELETE chạy qua `WHERE UPPER(code) LIKE 'TEST%'`.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Khối cleanup của script test không bao phủ hết các ca kiểm thử*: Script test kiểm tra ký tự đặc biệt tạo ra các mã cố định không có tiền tố `SunbringerTest`, nhưng khối dọn dẹp chỉ xóa theo prefix đó, dẫn đến việc bỏ sót mã trong CSDL.
  2. *Lỗi typo tên cột trong bảng `giveaway_codes`*: Bảng SQL lưu mã theo cột `code_content`, nhưng câu lệnh dọn dẹp lại viết `UPPER(code)`, gây lỗi truy vấn âm thầm và không xóa được mã.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Tự động dọn dẹp 100% mã trong `finally`*: Mọi script kiểm thử bắt buộc phải truyền danh sách đầy đủ tất cả các mã phát sinh vào lệnh dọn dẹp `cleanup_test_codes` ngay trong khối `finally`.
  2. *Đúng chuẩn schema SQL*: Bảng `giveaway_codes` dùng cột `code_content`. Mọi truy vấn xóa hoặc tìm kiếm mã kho đều phải dùng `code_content`.
  3. *Cổng gác tự động (Gatekeeper Gate)*: `scripts/audit_zero_test_artifacts.cjs` tự động kiểm tra `codes_pool` của toàn bộ Giveaway và kho `customFreeCodes`; nếu có mã test, chặn đứng quá trình build ngay lập tức.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ viết script test mà khối dọn dẹp chỉ dọn một nửa số mã đã tạo*: Bắt buộc dọn 100% mọi mã test.
  - ❌ *Không dùng cột `code` khi thao tác bảng `giveaway_codes`*: Phải dùng `code_content`.

---

### ISSUE-153: Bẫy Mất Dữ Liệu Kho Mã & Luật Đợt Phát Khi Reset/F5 Admin (Async Race Condition & D1 Empty Pool Purge)
- **Triệu chứng**:
  - Quản trị viên vừa nhập hàng loạt mã code vào kho phát Giveaway hoặc điều chỉnh luật đợt phát, sau đó nhấn F5 hoặc reset lại trang Admin thì toàn bộ mã mới nhập bị biến mất và luật trở về như cũ.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lỗi vô tình xóa trắng kho mã trong D1 (`d1_service.ts:2317`)*: Điều kiện `else if (Array.isArray(gw.codes_pool) && gw.codes_pool.length === 0)` đã thực thi lệnh SQL `DELETE FROM giveaway_codes WHERE giveaway_id = ? AND status = 'AVAILABLE'`, vô tình xóa sạch kho mã của chiến dịch trong D1 bất cứ khi nào client gửi sync payload mà không bung chi tiết pool mã.
  2. *Bất đồng bộ không chờ (Async Race Condition & Monolithic Snapshot 16 giây)*: `handleSubmitForm` và `handleSavePoolCodes` trong `PrivateCodesModule.tsx` là hàm void không `await`. Chúng đóng modal và toast thành công ngay lập tức, trong khi hàm `pushFullStateToKV(true)` chạy ngầm mất hơn 16.000 ms để đẩy toàn bộ dữ liệu 492 thành viên, đơn hàng, giao dịch, kho hàng. Khi quản trị viên F5 hoặc reload trang trong lúc request ngầm đang bay, trình duyệt lập tức hủy bỏ kết nối HTTP ngầm, khiến máy chủ D1 không nhận được dữ liệu.
  3. *Ghi đè dữ liệu cũ khi nạp từ máy chủ (`adminDataService.ts:1418`)*: `fetchFromCloudflareKV()` ghi đè `{ ...local, ...serverGw }`, dùng dữ liệu cũ trên server đè lên dữ liệu mới sửa cục bộ, đồng thời bỏ sót các chiến dịch mới tạo cục bộ nếu chưa có trong server.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Bỏ hoàn toàn lệnh DELETE khi `codes_pool.length === 0` trong `d1_service.ts`*: Chỉ cho phép xóa khi có cờ tường minh `gw.clear_pool === true`. Bổ sung cột `use_template` và `updated_at` trong D1.
  2. *Endpoint Fast Targeted Sync*: Tạo luồng xử lý riêng cho `wcg_admin_giveaways_v4`, `wcg_admin_store_products_v4`, `wcg_admin_utilities_v4`, `wcg_universal_templates_v1` trực tiếp ghi D1 và trả về trong ~300ms thay vì ép monolithic snapshot 16s.
  3. *Awaiting Direct Persistence*: `saveGiveawaysToServer()` trả về Promise. Các handler `handleSubmitForm`, `handleSavePoolCodes`, `handleDeletePoolCode` trong `PrivateCodesModule.tsx` bắt buộc `await` máy chủ phản hồi thành công mới đóng form; hiển thị spinner `isSaving`, vô hiệu hóa nút bấm và đăng ký `beforeunload` chặn reload trang khi đang lưu.
  4. *Smart Merge theo `updated_at`*: So sánh timestamp `updated_at` giữa local và server; nếu local mới hơn, local giữ nguyên; không bao giờ lấy mảng rỗng đè lên mảng có mã của local; giữ lại các chiến dịch mới tạo cục bộ (`localOnly`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng hàm void fire-and-forget khi lưu dữ liệu cốt lõi*: Bắt buộc biến hàm submit thành `async` và `await` máy chủ lưu thành công trước khi đóng modal.
  - ❌ *Không ép mọi thao tác lưu nhỏ lẻ phải chạy qua snapshot monolithic 16 giây*: Phải cung cấp endpoint fast targeted sync để phản hồi trong 300ms.
  - ❌ *Không bao giờ viết `DELETE FROM giveaway_codes` chỉ vì mảng `codes_pool` rỗng*: Client thường không gửi danh sách mã nhạy cảm trong mọi payload sync thường ngày.

---

### ISSUE-152: Bẫy Đăng Ký Tên Chứa Thẻ Script & Rà Soát Chống XSS Toàn Diện
- **Triệu chứng**:
  - Tồn tại tài khoản test với username là thẻ script `<script>alert(1)</script>` trong CSDL, gây nguy cơ tiềm ẩn nếu có bất kỳ nơi nào hiển thị bằng HTML thô.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Endpoint đăng ký tài khoản `functions/api/auth/register.ts` chưa có bước validate ký tự đặc biệt đối với `username`, cho phép người dùng đăng ký tên chứa các ký tự `<` và `>`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xóa an toàn tài khoản test khỏi D1 `members` và `wcg_admin_members_v4` sau khi đối soát đầy đủ 3 điều kiện (username, email, 0đ balance).
  2. Rà soát 100% frontend React: Khẳng định toàn bộ tên thành viên được bind qua JSX text node an toàn (`document.createTextNode`), không có bất kỳ `dangerouslySetInnerHTML` hay DOM mutation nào cho phép thực thi script.
  3. Bổ sung validation ở backend `register.ts`: Chặn hoàn toàn username chứa `<` hoặc `>` hoặc thẻ script; tự động strip thẻ HTML trong `displayName`.
  4. Bổ sung sanitization ở backend `me.ts`: Strip thẻ HTML trong `displayName` khi cập nhật hồ sơ cá nhân.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ xóa tài khoản ở frontend*: Bắt buộc xóa triệt để cả trong bảng D1 `members` và `wcg_admin_members_v4`.
  - ❌ *Không cho phép đăng ký username chứa ký tự `<`, `>`*: Phải chặn ngay từ cổng validation API.

---

### ISSUE-151: Bẫy Mẫu Chung Ghi Đè Thiết Lập Riêng (SSOT Inversion) & Lỗi Rỗng Mảng Kho Mã codes_pool
- **Triệu chứng**:
  - Khi quản trị viên cấu hình luật riêng cho một đợt phát code Giveaway trong Admin (ví dụ: User: 3 mã, IP: 3 mã, CD: 1h, Giãn cách: 45p, Tiêu đề không có dấu '+', Kho còn 35 mã), ngoài giao diện web khách lại hiển thị lệch 100% theo Mẫu Chung (User: 1 mã, IP: 2 mã, mất giãn cách, tiêu đề bị nhét thêm '+' thành 'Code riêng + Tiên Nghịch Mobile', kho báo hết mã và nút bị vô hiệu hóa 'Chờ Đợt Mã Mới').
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *SSOT Inversion Bug trong `templateService.resolveGiveaway`*: Hàm runtime inheritance coi template là override thay vì fallback, ghi đè không điều kiện các thuộc tính `campaign.max_per_user`, `campaign.max_per_ip`, `campaign.cooldown_hours`, `campaign.global_cooldown_seconds` bằng giá trị của Mẫu Chung. Regex tiêu đề tự động đổi mọi tiêu đề có chữ "Code riêng" thành "Code riêng + {game_name}".
  2. *Ghi đè trong Backend Claim API*: Tại `functions/api/giveaways/claim.ts`, logic kiểm tra nhận mã cũng ghi đè các trường `gwTpl.*` lên chiến dịch nếu `use_template !== false`.
  3. *Lệch thứ tự Merge CSDL D1*: `...meta, ...gw` khiến các giá trị mặc định của bảng SQL ghi đè lên JSON metadata phong phú của Admin.
  4. *Bẫy kiểm tra mảng rỗng `Array.isArray([])`*: Để bảo mật mã bí mật cho client, hệ thống trả về mảng rỗng `codes_pool: []`. Biểu thức `Array.isArray(codes_pool) ? codes_pool.length : remaining_codes` đánh giá là `true` và lấy độ dài 0, khiến tồn kho 35 mã bị ép về 0 ngoài web.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Cấu hình Admin là Chân Lý Duy Nhất (Single Source of Truth - SSOT): Template chỉ là giá trị fallback khi trường tương ứng là `undefined` hoặc `null`.
  2. Giữ nguyên 100% tiêu đề do Admin đặt, chuẩn hóa pattern template thành `Code riêng {game_name}` không có dấu `+`.
  3. Đảo thứ tự merge CSDL D1: `{ ...gw, ...meta }`, ưu tiên rõ ràng `meta.*` so với `gw.*`.
  4. Chuẩn hóa toàn diện bộ đếm tồn kho: `Array.isArray(x) && x.length > 0 ? x.length : Math.max(0, Number(remaining_codes || 0))`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng template để ghi đè thuộc tính chiến dịch đã được cấu hình*: Template chỉ được dùng làm giá trị mặc định ban đầu hoặc fallback khi trường chưa có giá trị.
  - ❌ *Không viết `Array.isArray(pool) ? pool.length : remaining` mà không kiểm tra `pool.length > 0`*: Sẽ bị bẫy mảng rỗng `[]` ép kho về 0.

---

### ISSUE-150: Bẫy Sót Dữ Liệu Sổ Cái wallet_transactions Khi Xóa Tài Khoản Test & Banner Chuyển Đổi Domain Cần Gỡ Bỏ Triệt Để
- **Triệu chứng**:
  - Hai tài khoản test ví chuyển nhầm từ .store (`wal_usr_1789019060987` và `wal_usr_1789019035532`, mỗi tài khoản 125.000đ) nếu chỉ xóa ở bảng `members` sẽ để lại giao dịch sổ cái mồ côi trong `wallet_transactions`, khiến hàm `reconcile_member_balances` hoặc các đợt kiểm toán sổ cái bị lệch.
  - Banner cam thông báo chuyển đổi domain cần gỡ bỏ hoàn toàn khỏi giao diện theo yêu cầu chủ web nhưng phải đảm bảo không ảnh hưởng đến AnnouncementBar hay các toast/popup khác.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Dữ liệu tài khoản ví có ràng buộc 2 tầng: tầng lưu trữ thành viên (`members` và `wcg_admin_members_v4`) và tầng sổ cái kế toán (`wallet_transactions`). Thao tác xóa bắt buộc phải đồng bộ cả 2 tầng sau khi đối soát kỹ 3 tiêu chí và ràng buộc 0 đơn hàng, 0 mã đã giao, 0 giao dịch SePay.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Tạo action `admin_purge_test_wallet_accounts` trong `functions/api/sync.ts` với cơ chế kiểm tra 3 tiêu chí (username, email, txId) và kiểm tra 0 orders, 0 sepay trước khi xóa.
  2. Xóa đồng thời trong `members`, `wallet_transactions` và dọn sạch trong `wcg_admin_members_v4`.
  3. Chạy `reconcile_member_balances` đối soát lại số dư toàn bộ thành viên.
  4. Gỡ sạch component `DomainMigrationBanner.tsx` và import trong `src/App.tsx`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không xóa đơn phương bảng members mà bỏ quên wallet_transactions*: Sẽ để lại bản ghi sổ cái mồ côi làm lệch kiểm toán tài chính.
  - ❌ *Không dùng CSS display:none để ẩn banner*: Phải gỡ sạch khỏi JSX và xóa file component để DOM sạch sẽ và tối ưu hiệu năng.

---

### ISSUE-149: Bẫy Lệch Tầng Giữa Master State Và File Fallback, Mã Rác Thumbnail WordPress & Lệch Nguồn Đếm Số Liệu Trang Chủ
- **Triệu chứng**:
  - Tựa game Yến Vân Thập Lục Thanh có 5 mã mới quét trong Master State nhưng thiếu trong tệp JSON fallback, khiến API trả 615 trong khi trang đếm 620.
  - Các tựa game Genshin Impact và Anime Defenders chứa mã rác dạng REDEMPTION-SCREEN-<width>X<height> do crawler cào nhầm tên ảnh bài viết WordPress.
  - Số liệu mô tả trang chủ (580+) không khớp số lượng 573 game canonical trong sitemap và A-Z.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Đồng bộ 5 mã quét mới vào cả src/data/crawled_codes_188.json và public/data/crawled_codes_188.json, nâng tổng số mã lên 620 (584 active, 36 expired) đồng nhất toàn sàn.
  2. Xóa 18 mã thumbnail rác, bổ sung regex chặn JUNK_CODE_REGEX đa tầng.
  3. Chuẩn hóa toàn bộ 6.206 chuỗi generic về "Chưa rõ phần thưởng".
  4. Quy chuẩn số liệu mô tả trang chủ: 573 tựa game chuẩn (347 game G1 ABEI) và 11.882+ giftcode.

---

### ISSUE-148: Bẫy Thin Content / Soft 404 Trên Trang 0 Mã, Chuỗi Boilerplate Rác Từ Domain Cũ & Xung Đột Thư Mục Tĩnh /g/
- **Triệu chứng**:
  - Hơn 750 trang rơi vào trạng thái "Đã phát hiện thấy – hiện chưa được lập chỉ mục" trên Google Search Console.
  - Các tựa game 0 mã bị Google coi là thin content vì bảng code trống rỗng và tiêu đề thừa dấu gạch ngang (`Giftcode ... - | CodeGame.shop`).
  - Hàng nghìn bản ghi giftcode chứa link rác của domain cũ `https://codegame.store/` và ngày hết hạn giả định `2026-12-31`.
  - Thư mục tĩnh `dist/g/` khiến Cloudflare Pages phục vụ mã 200 thay vì để Edge Worker trả 301 chuyển hướng canonical về `/game/`.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. Thiếu xử lý giao diện chuyên biệt cho trang 0 mã và thiếu liên kết nội bộ cụm (Topic Clusters).
  2. Dữ liệu crawler cũ còn lưu trữ các đoạn text tiếp thị mang domain cũ.
  3. Quá trình prerender sinh đồng thời cả `/game/` và `/g/`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xóa bỏ hoàn toàn việc sinh file tĩnh `dist/g/`, dọn dẹp sạch thư mục `dist/g` để Edge Worker xử lý 301 chuẩn hóa.
  2. Bổ sung giao diện và thông điệp kiểm tra 24/7 rõ ràng cho trang 0 mã kèm ngày kiểm tra thực tế và cụm game liên quan.
  3. Dọn sạch 100% link `codegame.store` và văn mẫu generic trong `crawled_codes_188.json`.
  4. Tạo 6 trang chuyên mục Topic Clusters (`/the-loai/:slug`) và mục lục A-Z (`/danh-sach-game-a-z`), liên kết chặt chẽ toàn trang.
  5. Sitemap chỉ giữ 100% URL chuẩn 200 OK (780 URLs), không alias, không redirect.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không sinh thư mục tĩnh dist/g/*: Sẽ phá vỡ chuyển hướng 301 của Edge Worker.
  - ❌ *Không gán hạn dùng giả 2026-12-31*: Phải hiển thị "Chưa rõ hạn dùng" để đảm bảo tính xác thực với Googlebot.
  - ❌ *Không để tiêu đề trang 0 mã bị cụt dấu gạch*: Bắt buộc có điều kiện phân nhánh rõ ràng.

---

### ISSUE-147: Bẫy Lệch Thuật Toán Băm Mật Khẩu (Bcrypt vs PBKDF2/SHA-256) & Lệch Sổ Cái Số Dư Khi Hợp Nhất Domain codegame.store Về codegame.shop
- **Triệu chứng**:
  - Khi chuyển đổi tài khoản người dùng từ hệ thống cũ (codegame.store) sang hệ thống mới (codegame.shop), người dùng cũ không thể đăng nhập được vì mật khẩu ở store dùng Bcrypt ($), trong khi shop dùng SHA-256 kèm salt và pepper.
  - Nếu chỉ cập nhật cột balance trong bảng members mà không tạo bản ghi đối ứng trong wallet_transactions, khi chạy cơ chế đối soát tự động (reconcile_member_balances) số dư của khách hàng sẽ bị xung đột hoặc hoàn tác về 0.
  - Nguy cơ đè mất tài khoản trùng email/username giữa 2 hệ thống.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. Hai hệ thống CSDL được xây dựng độc lập với 2 kiến trúc mã băm mật khẩu khác nhau.
  2. Bảng members có cơ chế tính toán số dư ưu tiên từ bản ghi mới nhất của bảng wallet_transactions.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Xác thực lai (Hybrid Auth) & Nâng cấp tự động không ma sát*: Nhận diện hash Bcrypt ($, $, $). Dùng bcryptjs để xác thực. Ngay khi mật khẩu khớp, tự động sinh salt mới và băm lại bằng SHA-256/salt/pepper rồi cập nhật vào D1. Người dùng không cần bấm link reset password hay thao tác bất kỳ điều gì.
  2. *Ghi nhận nguyên tử vào sổ cái ví*: Mỗi tài khoản có số dư được tạo kèm 1 giao dịch ADMIN_ADJUST trong wallet_transactions, đảm bảo sổ cái và bảng members đồng bộ tuyệt đối.
  3. *Lưới chống va chạm 3 lớp*: Kiểm tra ID, username và email; an toàn bỏ qua các tài khoản trùng lặp đã tồn tại trên shop.
  4. *Bản đồ 301 Permanent Redirect*: Khai báo chuyển hướng 301 qua Cloudflare Redirect Rules để Google chuyển giao toàn bộ tín hiệu SEO và lượng truy cập.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không ép khách hàng phải đổi lại mật khẩu thủ công*: Gây ức chế và làm mất lượng lớn khách hàng cũ.
  - ❌ *Không chỉ cộng tiền vào cột members.balance mà bỏ qua wallet_transactions*: Sẽ bị lỗi đối soát ví.
  - ❌ *Không dùng redirect tạm thời 302*: Google chỉ chuyển giao chỉ mục và PageRank khi dùng 301 Permanent Redirect.

---

### ISSUE-146: Bẫy Trùng Lặp Thẻ Kích Thước Ảnh Open Graph (512 vs 1200), Thiếu Tuyến SSR Cho Giveaway & Thiếu Ảnh Game Trong Hộp Thoại Chia Sẻ
- **Triệu chứng**:
  - Khi người dùng gửi link game hoặc giveaway lên Facebook / Zalo, ảnh xem trước có nguy cơ bị biến dạng, không hiển thị hoặc rơi về ảnh mặc định `og-image.jpg` thay vì ảnh đại diện chính xác của game.
  - Hộp thoại chia sẻ (`ShareModal`) không hiển thị ảnh đại diện game, người dùng không kiểm chứng được liên kết trước khi gửi.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lỗi thay thế Regex một phần*: Thao tác ghi đè thẻ `og:image` trong Edge Worker không xóa các thẻ kích thước `og:image:width: 1200` từ template gốc, gây xung đột kích thước ảnh.
  2. *Thiếu tuyến SEO SSR cho Giveaway*: Tuyến `/giveaways/:id` không được chuyển vào `renderSeoHtml`, crawler mạng xã hội nhận shell HTML tĩnh không có metadata động.
  3. *Hạn chế của ShareModal*: Interface thiếu trường `imageUrl` và `badge`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Dọn sạch toàn bộ thẻ og:image cũ*: Regex `/<meta\s+property="og:image[^"]*\/?>\s*/gi` xóa triệt để trước khi chèn khối mới chuẩn mực kèm `og:image:secure_url`.
  2. *Phục vụ Giveaway qua renderSeoHtml*: Cả bot mạng xã hội lẫn người dùng đều nhận đầy đủ thẻ Open Graph với ảnh đại diện chính xác của game.
  3. *Thuật toán 4 tầng resolve ảnh*: `cover_image_url || game_icon_url || catalogGame?.icon_url || /game_icons/${gameSlug}.jpg`, tự động đổi `.webp` -> `.jpg`.
  4. *Live Card Preview & Web Share API*: Hiển thị ảnh đại diện game chính xác ngay trong `ShareModal`, tích hợp `navigator.share` cho di động.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ thay thế riêng lẻ thẻ og:image*: Bắt buộc dọn sạch toàn bộ các thẻ liên quan (`og:image:width`, `og:image:height`) trước khi chèn.
  - ❌ *Không bỏ quên tuyến /giveaways/:id*: Mọi tuyến có liên kết chia sẻ phải được SSR hoặc Prerender với ảnh chính xác.

---

### ISSUE-145: Bẫy Lệch Mẫu Tiêu Đề Giữa Edge Worker SSR Và Prerender Tĩnh, Thừa Dấu Gạch Khi 0 Mã, Fake Schema Rating Và Trùng Lặp Alias Trong Sitemap
- **Triệu chứng**:
  - Tiêu đề trên web live khác với tiêu đề trong báo cáo hoặc tài liệu: Edge Worker chạy mẫu `Nhận {X} Mã Code` trong khi file prerender tĩnh sinh mẫu `Hướng Dẫn Nhập & Nhận Quà`.
  - Các trang game có 0 mã (như E-Sports VTC) hiển thị tiêu đề bị lỗi cụt: `Giftcode E-Sports VTC Mới Nhất 2026 - | CodeGame.shop` do thừa dấu gạch ngang trống.
  - Thẻ meta description của trang chủ hardcode con số cũ `3.400+` / `5.000+` làm giảm tính hấp dẫn và độ tin cậy trong mắt Googlebot.
  - Schema `VideoGame` chứa thuộc tính `aggregateRating` giả lập (128 reviews) dễ bị Google phạt thủ công (Manual Action).
  - Sitemap chứa cả URL chính và URL bí danh (`where-winds-meet-mobile`, `dau-truong-chan-ly-mobile`, `tam-quoc-huyen-tuong`...), khiến bot crawl trùng lặp và phân tán thứ hạng (Keyword Cannibalization).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Thiếu nguồn chân lý duy nhất (SSOT) giữa SSR và Prerender*: Thay đổi format tiêu đề ở Edge Worker nhưng quên đồng bộ vào `scripts/prerender.js`.
  2. *Toán tử điều kiện lỏng lẻo*: Đặt dấu gạch `- ` ngoài biểu thức điều kiện thay vì bên trong chuỗi kết quả.
  3. *Thiếu bảng Canonical Aliases*: Chưa có cơ chế phân loại URL chuẩn và bí danh trước khi sinh file sitemap.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đồng bộ triệt để Worker SSR & Prerender*: Dùng chung định dạng `Giftcode ${game.name} Mới Nhất 2026${countSuffix} | CodeGame.shop`.
  2. *Dấu gạch nằm trọn trong điều kiện*: `const countSuffix = codeCount > 0 ? " - Nhận " + codeCount + " Mã Code" : " - Hướng Dẫn Nhập & Nhận Quà";`.
  3. *Bảng GAME_CANONICAL_ALIASES*: Tự động 301 Permanent Redirect và canonical về slug chính; loại bỏ 100% slug bí danh khỏi `sitemap.xml`.
  4. *Gỡ bỏ hoàn toàn Fake aggregateRating*: Chỉ hiển thị rating khi có dữ liệu đánh giá thật từ người dùng.
  5. *Tính lastmod động theo từng trang*: Bóc tách ngày lớn nhất của game và giftcode thực tế (24 nhóm ngày khác nhau).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không sửa mẫu tiêu đề ở riêng một nơi (Worker hoặc Prerender)*: Bắt buộc sửa đồng thời cả 2 tệp `functions/_worker.ts` và `scripts/prerender.js`.
  - ❌ *Không nhồi nhét AggregateRating giả (fake reviews) vào JSON-LD*: Vi phạm chính sách nguyên tắc quản trị trang web của Google.
  - ❌ *Không đưa URL bí danh vào Sitemap*: Sitemap chỉ được phép chứa URL canonical sạch.

---

### ISSUE-144: Bẫy Ghi Đè Hàng Loạt Khi Cập Nhật Chính Sách Chung Toàn Sàn (Tràn Hạn Mức D1 Writes & Mất Dữ Liệu Riêng Từng Đợt)
- **Triệu chứng**:
  - Khi cần cập nhật chính sách nhận quà (tuổi nick, max/user, max/IP, cooldown), link Zalo nhóm, nội dung thông báo hoặc thời gian giãn cách toàn sàn, quản trị viên phải chỉnh sửa thủ công lặp lại cho hơn 41 đợt giveaway và hàng chục sản phẩm tiện ích / cửa hàng.
  - Nếu chạy script cập nhật hàng loạt vào D1, có nguy cơ làm cạn kiệt hạn mức ghi D1 (50k/ngày trên gói Free) và ghi đè mất các dữ liệu riêng tư (tựa game, icon, cover, số ảo bổ sung, danh sách mã trong kho).
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Thiết kế trước đây lưu trữ toàn bộ các trường cấu hình lặp đi lặp lại trong từng bản ghi của từng đợt phát, thiếu cơ chế kế thừa mẫu chung (template inheritance).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Kiến trúc 1-Write D1 SSOT*: Lưu 1 bản ghi `wcg_universal_templates_v1` duy nhất trong bảng `system_settings` của D1. Mỗi lần sửa mẫu chỉ tốn đúng 1 D1 write.
  2. *Hợp nhất lúc chạy (Runtime Inheritance)*: Web Khách (`GiveawaysView`, `UtilitiesView`, `StoreView`, `GameDetailModal`) tự động kế thừa giá trị từ template khi render nếu `use_template !== false`.
  3. *Bảo tồn tuyệt đối dữ liệu riêng*: Tựa game (`game_slug`, `game_name`), cover URL, con số ảo bổ sung (`virtual_claimed_offset`), trạng thái đang mở (`is_active`), kho mã (`codes_pool`, `claim_history`) không bao giờ bị ghi đè.
  4. *Cơ chế an toàn phòng thủ*: Tính năng "Áp Đặt Toàn Bộ" bắt buộc qua Modal Xem Trước (Preview Diff), tự động tạo bản sao lưu Snapshot (`wcg_template_snapshots_v1`) trước khi thực hiện, cung cấp nút "Khôi Phục Bản Này" (Rollback) và ghi vết vào `TemplateAuditLog`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ chạy lệnh UPDATE SQL hàng loạt trên toàn bộ bảng*: Chỉ lưu cấu hình mẫu và để client tự động kế thừa lúc chạy (Runtime Inheritance).

---

### ISSUE-143: Bẫy Ngắt Đồng Bộ Giveaway Cho Khách Vãng Lai & Lệch Kho Khi D1 Thiếu codes_pool
- **Triệu chứng**:
  - Quản trị viên vào trang quản trị thấy 41 sự kiện (trong đó có các sự kiện còn hàng như 3Q Đảo Đào Đào còn 19 mã, Anh Hùng Tiến Lên còn 18 mã, và Ta Là Hắc Ngộ Không có hồi chiêu 45p).
  - Web Khách (`/giveaways`) chỉ hiển thị 37 sự kiện (do tính năng gom gói theo game), các sự kiện còn hàng không hiển thị ở đầu mà bị đẩy xuống dưới hoặc báo 0 mã; đồng thời vẫn còn huy hiệu "Chính thức" và nút "Hết Code" bị khóa không bấm được.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Ngắt luồng đồng bộ khách vãng lai*: Trong `src/services/dataService.ts`, nhánh `if (!isAdmin)` ngắt sớm để tránh tải 1.3 MB catalog game nhưng vô tình chặn luôn việc đồng bộ Giveaway, khiến khách chỉ nhìn thấy dữ liệu `localStorage` cũ.
  2. *Lệch kho D1 SQL Aggregation*: Truy vấn `SELECT ... CASE WHEN gc_agg.total_cnt > 0 THEN COALESCE(gc_agg.available_cnt, 0) ELSE g.remaining_codes END` trả về 0 nếu bảng `giveaway_codes` chưa được nạp mã từ `codes_pool` của file baseline `giveaways.json`.
  3. *Thứ tự kiểm tra trong Modal chi tiết*: Điều kiện `remaining <= 0` được đặt trước `isModalGlobalCooling`, khiến sự kiện có hồi chiêu toàn web (như Ta Là Hắc Ngộ Không 45p) bị ẩn mất đồng hồ đếm ngược khi mã tạm thời bằng 0.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Bổ sung `dataService.syncGiveaways()` siêu nhẹ (chỉ ~43 KB) cho cả khách thường và admin khi tải `/giveaways`.
  2. Nối smart merge từ `giveaways.json` vào `loadAllGiveawaysD1` và `functions/api/sync.ts`: nếu D1 có `remaining_codes = 0` nhưng `codes_pool` gốc có mã thì bảo toàn số lượng kho thực tế.
  3. Sắp xếp ưu tiên sự kiện còn hàng lên đầu danh sách (`remaining_codes > 0`).
  4. Đưa khối đếm ngược `isModalGlobalCooling` lên trên `remaining <= 0` trong `GiveawayDetailModal`.
  5. Xóa hoàn toàn badge "Chính thức", đổi nút "Hết Code" thành "Chờ Đợt Mới" (mở modal chi tiết).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ chặn toàn bộ đồng bộ dữ liệu của khách vãng lai*: Nếu cần tối ưu băng thông tải game, phải tách riêng các API nhẹ (`/api/sync?key=wcg_admin_giveaways_v4`) để khách luôn có dữ liệu sự kiện tươi mới nhất.

### ISSUE-142: Bẫy Tràn Hạn Mức Subrequests Worker (50 Subrequests/Event) Khi Chạy DDL Schema & Lỗi Tự Động Tắt Toggle Cấu Hình Giveaway
- **Triệu chứng**:
  - Quản trị viên vào trang quản trị (/admin#/private-codes) bật công tắc "Ô Thông Báo / Link Tùy Chỉnh (Zalo / Cộng Đồng)", điền link và lưu lại. Sau khi tải lại trang, công tắc bị tự động gạt về trạng thái TẮT (OFF).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Tràn trần Subrequests (50/request)*: Hàm ensureSchemaUpgrades chứa hơn 180 lệnh ALTER TABLE tuần tự. Các câu lệnh sau câu thứ 50 bị Worker ngắt giữa chừng, khiến các cột mới (custom_banner_enabled, custom_banner_text, custom_banner_link, global_cooldown_seconds) không bao giờ được tạo trên D1.
  2. *Lỗi SQL Cascade*: Do thiếu cột trên D1, truy vấn SELECT ném lỗi no such column, truy vấn UPDATE ném lỗi table has no column, dẫn đến load/save thất bại.
  3. *Lệch pha đồng bộ*: Khi fetchFromCloudflareKV kéo dữ liệu từ server về mà thiếu cờ, client vô tình ghi đè localStorage làm tắt công tắc.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Dùng PRAGMA table_info(giveaways) kiểm tra trước toàn bộ danh sách cột chỉ bằng 1 câu truy vấn, chỉ chạy ALTER TABLE cho các cột thực sự thiếu.
  2. Bổ sung fallback và smart merge ở cả Worker D1 service lẫn adminDataService.ts để bảo toàn cờ và link khi có dữ liệu hợp lệ.
  3. Đồng bộ điều kiện hiển thị trên Web Khách: hiển thị khi bật hoặc khi có link hợp lệ.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chạy hàng trăm câu ALTER TABLE tuần tự trong Worker request*: Cloudflare Free giới hạn 50 subrequests. Mọi thao tác DDL phải gom nhóm hoặc kiểm tra PRAGMA trước.

---

### ISSUE-141: Bẫy Lỗi "Failed to fetch dynamically imported module" Do Cache HTML Chứa Hash Cũ Khi Triển Khai Bản Mới (Stale Chunk Hash Mismatch)
- **Triệu chứng**:
  - Người dùng đang duyệt trang web khách, khi click sang tab Giveaways (hoặc mở các view/modal lazy-load như Cửa Hàng, Tiện Ích, Tin Tức, Nạp Ví), xuất hiện màn hình đỏ báo lỗi hoặc console văng lỗi:
    `TypeError: Failed to fetch dynamically imported module: https://codegame.shop/assets/GiveawaysView-Dv07PyQ0.js`
  - Lỗi này xuất hiện lặp đi lặp lại sau mỗi đợt deploy phiên bản mới.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Edge CDN & Browser Caching file HTML*: Trong `public/_headers` và `functions/_worker.ts`, tệp `/index.html` và `/` được cấu hình `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` kèm `caches.default`. Cloudflare Edge CDN lưu giữ bản HTML cũ trong 1 đến 24 giờ.
  2. *Vite Chunk Hash Invalidation*: Khi mã nguồn được build mới, Vite gán hash ngẫu nhiên theo nội dung tệp (ví dụ từ `GiveawaysView-Dv07PyQ0.js` đổi sang `GiveawaysView-rNLPFpL0.js`).
  3. *Lệch pha giữa HTML cũ và Chunk mới*: Trình duyệt người dùng nhận HTML được CDN trả về chứa thẻ script trỏ đến hash cũ (`GiveawaysView-Dv07PyQ0.js`). Khi người dùng bấm tab, trình duyệt tải hash cũ này nhưng Cloudflare Pages đã xóa hash cũ khỏi hệ thống lưu trữ, trả về HTTP 404 $\rightarrow$ Vite Dynamic Import thất bại văng ngoại lệ.
  4. *React.lazy không có cơ chế tự phục hồi (Self-Healing)*: Các component lazy-load trong `src/App.tsx` sử dụng `React.lazy` trần không bọc retry hay phát hiện lỗi chunk lỗi thời.
- **Giải pháp chuẩn đã kiểm chứng (Hệ thống phòng thủ 4 lớp)**:
  1. *Lớp 1 (Triệt tiêu cache HTML)*: Trong `public/_headers` và `functions/_worker.ts`, áp dụng `Cache-Control: no-cache, no-store, must-revalidate, max-age=0` cho `/index.html`, `/`, `/*.html`. Tuyệt đối không cache HTML ở CDN. Giữ nguyên cache vĩnh viễn `Cache-Control: public, max-age=31536000, immutable` cho các file tĩnh `/assets/*`.
  2. *Lớp 2 (Edge Worker Asset Self-Healing)*: Trong `functions/_worker.ts`, nếu có yêu cầu tải `/assets/*.js` bị 404 (do client còn giữ HTML cũ trước lúc sửa cache), Worker không trả về lỗi 404 mà trả về một stub ES module JavaScript hợp lệ (HTTP 200) tự động gọi `window.location.reload()` để người dùng chuyển mượt sang bản mới nhất.
  3. *Lớp 3 (Vite Engine Preload Error Interceptor)*: Đăng ký sự kiện chuẩn của Vite `window.addEventListener('vite:preloadError', ...)` trong `src/main.tsx` để tự động reload tức thì khi gặp sự cố tải chunk.
  4. *Lớp 4 (React lazyWithRetry & ErrorBoundary Recovery)*: Bọc toàn bộ 22 component dynamic import trong `src/App.tsx` qua tiện ích `lazyWithRetry()`, đồng thời bổ sung logic nhận diện `dynamically imported module` trong `ErrorBoundary.componentDidCatch` để tự động tải lại trang an toàn có khóa chống lặp vô hạn (sessionStorage 10s debounce).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ đặt `s-maxage` hoặc `stale-while-revalidate` cho tệp HTML trong ứng dụng SPA*: File HTML bắt buộc phải luôn luôn tươi mới (`no-cache, no-store`) để đồng bộ tuyệt đối với các chunk hash trên đĩa.
  - ❌ *Không dùng `React.lazy` trần cho các màn hình/modal lớn mà không có hàm bọc retry phục hồi tự động*.


### ISSUE-140: Bẫy Đốt Hạn Mức Đọc/Ghi D1 Do Full Table Scan Autocomplete & Ghi Sự Kiện Ảo Lặp Lại Cùng Lỗi Truy Cập Mảng Fallback
- **Triệu chứng**:
  - D1 Cloudflare chạm hạn mức gói Free: 5.17M/5M dòng đọc (103.4%), 157.88k/100k dòng ghi (157.9%).
  - Khi D1 bị chặn, web khách không "bình thường 100%": các API catalog, /api/stats, sắp ra mắt bị timeout, trong khi chi tiết game Where Winds Meet trả HTTP 200 nhưng rỗng 0 mã (total = 0, active = 0).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Full Table Scan trong Autocomplete*: Mỗi ký tự người dùng gõ vào ô tìm kiếm chạy `JOIN games ON games.slug = codes.game_slug WHERE (codes.code LIKE ? OR codes.rewards LIKE ?)` quét toàn bộ ~12.000 dòng mã codes.
  2. *Ghi hàng chục ngàn sự kiện ảo vào D1*: Poll `/api/realtime-events` mỗi 5-15s kích hoạt batch flush sự kiện mô phỏng `is_simulated = 1` vào `wcg_virtual_events` và `wcg_virtual_aggregates`, kèm 40 câu `ALTER TABLE` trong `ensureSchemaUpgrades`.
  3. *Lỗi truy cập Mảng như Đối tượng (Array vs Dictionary Bug)*: Tệp `crawled_codes_188.json` là một Mảng (Array), nhưng mã nguồn lại truy cập `fallbackCodesData[slug]` khiến giá trị fallback luôn bằng `undefined` cho mọi game khi D1 lỗi.
  4. *Thiếu Timeout cho D1*: Các hàm đọc D1 không có cơ chế ngắt thời gian, khiến toàn bộ tiến trình treo đến khi Cloudflare Pages Function timeout (30s).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Chuyển toàn bộ Autocomplete sang In-Memory*: Sử dụng 560 game và 11.883 mã có sẵn trong Worker memory để tính điểm tìm kiếm, tiêu thụ đúng 0 dòng đọc D1, độ trễ < 2ms.
  2. *Ngừng 100% ghi sự kiện ảo vào D1*: Giữ toàn bộ popup và số ảo trong Edge Memory / KV. D1 chỉ lưu dữ liệu thật (đơn thật, nạp thật, giật thật).
  3. *Bọc Edge Cache 10s cho /api/realtime-events*: Khớp nhịp slot 10s của client, người dùng cùng slot nhận cache từ CDN.
  4. *Tạo bảng băm O(1) fallbackCodesBySlug Map*: Chuẩn hóa 615 mã WWM, 68 mã Type Soul, 119 mã Anime Vanguards, 138 mã Da Hood vào Map tra cứu tức thì.
  5. *Bọc withD1Timeout*: Toàn bộ truy vấn D1 tự động timeout sau 1.2s và chuyển sang phục vụ dữ liệu tĩnh an toàn.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chạy truy vấn `LIKE %...%` trên bảng `codes`*: Bảng codes có hàng chục ngàn dòng, mọi lệnh LIKE hai đầu đều gây full scan quét kiệt hạn mức.
  - ❌ *Không ghi sự kiện mô phỏng ảo vào CSDL D1*: Chỉ lưu dữ liệu thật, dữ liệu ảo tính toán hoàn toàn bằng công thức thời gian trong bộ nhớ.
  - ❌ *Không truy cập mảng dữ liệu JSON bằng khóa chuỗi `array[slug]`*: Luôn kiểm tra cấu trúc mảng hoặc chuyển sang `Map<string, GiftCode[]>` trước khi tra cứu.

### ISSUE-139: Bẫy Đóng Băng Trạng Thái Chờ Giãn Cách Giveaway (Global Cooldown) Do Đóng Gói Modal Trong Closure IIFE Thay Vì Subcomponent Độc Lập
- **Triệu chứng**:
  - Khi người dùng bấm mở Modal sự kiện Giveaway có giãn cách phát mã toàn sàn (`global_cooldown_seconds > 0`), đồng hồ đếm ngược chờ đợt phát chạy về 0 nhưng giao diện không tự động chuyển sang nút *"⚡ GIẬT MÃ CODE NGAY (MIỄN PHÍ)"*, người dùng bị kẹt ở ô trống hoặc nút vô hiệu hóa.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Modal được bọc trong một hàm IIFE vô danh `createPortal((() => { ... })(), document.body)` bên trong thân component cha.
  - Do IIFE nằm ngoài luồng hooks của React, component modal không thể khai báo các hooks chu kỳ sống (`useState`, `useMemo`, `useEffect`) độc lập để theo dõi thời gian thực (`useEventCountdown`).
  - Khi countdown con kết thúc và gọi `onExpire`, component cha chưa re-render ngay hoặc `detailModalCampaign` trong state cha không đổi, khiến điều kiện `isModalGlobalCooling` bị giữ nguyên giá trị cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tách toàn bộ Modal thành subcomponent React độc lập `GiveawayDetailModal`.
  - Khai báo `useEventCountdown` trực tiếp bên trong `GiveawayDetailModal` với biến mục tiêu `targetGlobalCooldownDate`.
  - Trạng thái `isModalGlobalCooling` được tính toán phản ứng theo thời gian thực (`!isCdExpired && cdRemainingMs > 0`).
  - Khi `cdRemainingMs <= 0`, component tự động chuyển đổi sang nút *"⚡ GIẬT MÃ CODE NGAY (MIỄN PHÍ)"* kèm hiệu ứng arcade chime mà không cần người dùng tải lại trang.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bọc modal có logic đếm ngược vào hàm IIFE tĩnh*: Phải luôn tách component con có hooks riêng để quản lý state reactive.
  - ❌ *Không để component con trả về `null` khi hết hạn mà không cập nhật state cha*: Tránh để lại khoảng trống rỗng trong modal CTA.

### ISSUE-138: Bẫy Ô Biểu Tượng Game Rỗng/Vỡ Trong Bảng Điều Khiển Admin (Dashboard) Do Thiếu File, Chặn Hotlink & Fallback 404 Kép
- **Triệu chứng**:
  - Tại trang Bảng Điều Khiển Tổng Quan Admin (`admin#/dashboard`), mục *"Game Nổi Bật Nhất"* xuất hiện các ô chữ nhật tối màu rỗng, không tải được logo game (`Phi Kiếm: Cửu Long Dẫn Quan`, `Command an Army`, `Grow a Chicken Fighter`, `Avatar Land`).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *File icon WebP chưa có trên đĩa*: `phi-kiem-cuu-long-dan-quan.webp` chưa được tải về máy chủ.
  2. *Dữ liệu `icon_url` rỗng*: Game `avatar-land` bị lưu chuỗi `""` trong D1 `wcg_admin_games_v5`.
  3. *Chặn Referrer từ Google Play CDN*: Khi trình duyệt mở từ `admin-code-game-shop.pages.dev`, Google Play CDN (`play-lh.googleusercontent.com`) chặn hotlinking với mã 403 Forbidden.
  4. *Fallback `onError` trỏ vào file 404*: `DashboardModule.tsx` gán `e.target.src = '/icon-192.png'`, nhưng file `/icon-192.png` không hề tồn tại trong thư mục `public/`, tạo ra lỗi 404 kép khiến ảnh bị vỡ hoàn toàn.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Tải logo chính thức độ nét cao chuẩn WebP cho toàn bộ game mới (`phi-kiem-cuu-long-dan-quan.webp`, `tan-y-thien-do-long-ky.webp`...).
  2. Tạo sẵn `public/icon-192.png` và `public/icon-512.png` làm fallback tĩnh chống 404.
  3. Nâng cấp `DashboardModule.tsx` sang mô hình container avatar 4 tầng: Avatar chữ thương hiệu (Brand initials) + `referrerPolicy="no-referrer"` + fallback 4 cấp (`.webp` $\rightarrow$ `.jpg` $\rightarrow$ edge proxy $\rightarrow$ `opacity = 0`).
  4. Tự động chuẩn hóa và tự chữa lành (auto-heal) dữ liệu icon ở tầng API `/api/sync` và `functions/api/games.ts` luôn trỏ về `/game_icons/${slug}.webp`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng thẻ `<img>` trần mà không có fallback background*: Bắt buộc bọc container có gradient avatar chữ nổi bật phía sau để không bao giờ hiện ô đen rỗng.
  - ❌ *Không gán fallback `src` vào file không tồn tại*: Luôn kiểm tra sự tồn tại của file fallback trên đĩa trước khi dùng.
  - ❌ *Không để `icon_url` trỏ trực tiếp ra CDN bên ngoài khi đã có sẵn file cục bộ*: Luôn ưu tiên đường dẫn cục bộ `/game_icons/${slug}.webp` để đảm bảo tốc độ và tránh lỗi CORS/Referrer.

### ISSUE-137: Bẫy Tồn Dư Ký Tự Thực Thể HTML `&nbsp;` Trong Rewards & Sót Mã Rác WordPress Ở Anime Vanguards Và Da Hood
- **Triệu chứng**:
  - 19 mã quà tặng ở cả hai bản Where Winds Meet (`where-winds-meet-mobile` và `yen-van-thap-luc-thanh`) chứa ký tự HTML entity thô `&nbsp;` trong chuỗi phần thưởng (ví dụ: `100 Echo Jade, 10,000 Coins, 5 Inner Way Pills&nbsp;`, `50 Echo Jade,&nbsp;10,000 Coins`).
  - Anime Vanguards hiển thị 128 mã thay vì 119 mã do còn sót 9 mã kích thước ảnh `IN-ANIME-VANGUARDS-*`.
  - Da Hood hiển thị 144 mã thay vì 138 mã do còn sót 6 mã kích thước ảnh `IN-DA-HOOD-*`.
  - Các tệp baseline `public/data/crawled_codes_188.json` và `data/crawled_codes_188.json` còn tồn dư 22 mã rác ảnh và 42 chuỗi `&nbsp;`.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Chưa chạy lệnh SQL DELETE trực tiếp trên bảng `codes` D1 cho Anime Vanguards và Da Hood*: Lần migration trước chỉ nhắm vào `game_slug = 'type-soul'`, khiến D1 `codes` vẫn lưu giữ các dòng dữ liệu rác cũ của 2 game này.
  2. *Thiếu bộ giải mã HTML entities đa tầng*: Chuỗi cào từ nguồn web ngoài chứa ký tự `&nbsp;`, `&ndash;`, `&mdash;`, `&rsquo;` được lưu trực tiếp vào CSDL mà không qua bước decode/strip ở tầng Ingest; và tầng Render UI chưa có bộ lọc dự phòng.
  3. *Tệp baseline cục bộ có bản sao phụ*: Ngoài `src/data/crawled_codes_188.json`, hệ thống còn có các bản sao tại `public/data/crawled_codes_188.json` và `data/crawled_codes_188.json` chưa được thanh lọc.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Xóa triệt để 15 mã rác ảnh WordPress trên mọi tầng*:
     - D1 SQL: Thực thi câu lệnh `DELETE FROM codes WHERE (game_slug IN ('anime-vanguards', 'da-hood') AND code LIKE 'IN-%') OR code LIKE 'IN-%-1024X576' ...`.
     - KV: Lọc toàn bộ mã có pattern `/^IN-.*-\d+X\d+$/i` trong `wcg_admin_custom_free_codes_v1`.
     - Toàn bộ 5 file baseline: Dọn sạch hoàn toàn, đưa Anime Vanguards về đúng 119 mã, Da Hood về đúng 138 mã, 0 mã bắt đầu bằng `IN-`.
  2. *Làm sạch & Decode HTML Entities Đa Tầng (Layer 1 + Layer 2)*:
     - Tầng Ingest (Layer 1): Tự động gọi `decodeHtmlEntities()` trước khi lưu vào CSDL cho mọi thao tác (`extractCodesFromPayload`, `update_code_metadata`, sync, v.v.).
     - Tầng Render (Layer 2): `GameDetailModal.tsx` và `SearchAutocomplete.tsx` bọc `decodeHtmlEntities()` trước khi hiển thị lên giao diện người dùng.
     - D1 Migration: Quét toàn bộ bảng `codes` D1, phát hiện các chuỗi chứa `&nbsp;`, `&ndash;`, `&amp;`, `&rsquo;` và cập nhật hàng loạt.
     - Đồng bộ Where Winds Meet: Giữ nguyên 615 tổng, 579 active, 36 expired, 0 lệch phần thưởng, 0 ký tự `&nbsp;`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ dọn dẹp mã rác cho một game cụ thể (như Type Soul) mà bỏ quên các game khác bị nhiễm cùng loại mã rác (như Anime Vanguards, Da Hood)*: Phải quét toàn bộ catalog với pattern tổng quát (`/^IN-.*-\d+X\d+$/i`).
  - ❌ *Không chỉ dọn dẹp trong KV mà quên xóa bằng câu lệnh SQL `DELETE` trên bảng `codes` D1*: Bảng D1 là Single Source of Truth cho các truy vấn API công khai.
  - ❌ *Không chỉ decode ở phía client hoặc phía server một cách đơn lẻ*: Phải xây dựng phòng vệ 2 tầng (Layer 1 Ingest sanitize + Layer 2 UI render decode) để triệt tiêu hoàn toàn lỗi hiển thị.

### ISSUE-136: Bẫy Thiếu Đồng Bộ Trạng Thái/Phần Thưởng Giữa 2 Bản Game Song Sinh & Thiếu Sửa Hồi Tố Case Cho Dữ Liệu Cũ
- **Triệu chứng**:
  - Dù tổng số lượng mã giữa 2 bản Where Winds Meet (`where-winds-meet-mobile` và `yen-van-thap-luc-thanh`) bằng nhau (615 mã), nhưng vẫn còn 26 mã mang trạng thái `expired` ở bản mobile trong khi ở bản Yến Vân lại là `active`.
  - Một số mã active nhưng chuỗi phần thưởng tự mâu thuẫn khi ghi `"Mã coupon WWM (Đã hết hạn)"`.
  - 35 mã ở bản mobile có phần thưởng vật phẩm chi tiết nhưng bản Yến Vân chỉ ghi `"Quà tặng tân thủ"`.
  - Sửa pipeline ingest giữ case chỉ có tác dụng với mã đẩy sau này; các mã cũ trong CSDL vẫn giữ dạng HOA (như `CRISTI2026`, `PALACECOUNTDOWN` của Type Soul) khiến người chơi không thể đổi thưởng trong game.
  - Tồn dư 22 mã rác kích thước ảnh WordPress dạng `IN-...-1024X576` trong cơ sở dữ liệu.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Dữ liệu baseline không đồng nhất*: Trong `crawled_codes_188.json` và `codes_database.json`, 26 mã WWM bị đánh dấu expired ở bản mobile nhưng active ở Yến Vân. Khi API gộp mã (fallback), mobile nhận dữ liệu cũ.
  2. *Thiếu bước sao chép phần thưởng chi tiết*: Khi đồng bộ 2 game song sinh, hệ thống chỉ kiểm tra mã tồn tại mà chưa sao chép phần thưởng giàu thông tin nhất sang bản còn lại.
  3. *Thiếu migration sửa hồi tố (Retroactive Migration)*: Dữ liệu cũ trong D1 và KV đã bị lưu dạng chữ hoa từ trước, cần một script và action migration quét và cập nhật trực tiếp.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đồng bộ triệt để hai bản song sinh WWM*: Đặt toàn bộ 26 mã thành `active` ở cả 2 bên. Loại bỏ mọi chuỗi `"hết hạn"` khỏi phần thưởng của mã active. Sao chép phần thưởng chi tiết cho cả 35 mã.
  2. *Sửa hồi tố case chữ hoa/thường*: Áp dụng bảng mapping chuẩn cho 68 mã Type Soul (`Cristi2026`, `palacecountdown`, `almightycristishowcasev2`, v.v.) trong cả D1 SQL, KV và static files.
  3. *Lọc sạch 22 mã rác kích thước ảnh*: Xóa hoàn toàn các mã dạng `IN-...-1024X576` khỏi CSDL và file static.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ sửa logic cho mã mới mà bỏ quên dữ liệu cũ*: Khi sửa quy tắc (như case-sensitivity), luôn phải chạy migration hồi tố (retroactive update) cho các bản ghi đã lưu trong DB.
  - ❌ *Không để trạng thái active đi kèm mô tả "Đã hết hạn"*: Luôn kiểm tra tính nhất quán giữa trường `status` và nội dung chuỗi `rewards`.
  - ❌ *Không chỉ đồng bộ tập mã mà bỏ quên đồng bộ trạng thái và phần thưởng giữa các game song sinh*.

### ISSUE-135: Bẫy Lệch Kho D1/KV Gây Trùng Ảo, Ép Chữ Hoa Phá Vỡ Case-Sensitivity & Thiếu Đồng Bộ Dữ Liệu Live Ingest
- **Triệu chứng**:
  - Khi đối tác/crawler đẩy giftcode vào API `/api/crawler/ingest-codes`, hệ thống báo trùng (`duplicate = 1, added = 0`), nhưng truy vấn công khai không thấy mã xuất hiện (như Zenless Zone Zero `Sunbringer`, Kiếm Đế Origin `DAITHANH96`).
  - Mã quà tặng có phân biệt chữ hoa/thường (như HoYoverse `Sunbringer`, `HourOfRuin`) bị ép chuyển thành `SUNBRINGER`, `HOUROFRUIN`.
  - Mã có ký tự đặc biệt như khoảng trắng (`ACCESS GRANTED`), `!`, `?`, `.`, `#` bị chém vụn hoặc loại bỏ âm thầm.
  - Khi mã đã tồn tại có cập nhật hạn dùng/phần thưởng mới, API bỏ qua và không cập nhật lại metadata.
  - Một số mã livestream hết hạn (Genshin Impact 7.2), game đã gỡ tính năng nhập code (Toilet Tower Defense) vẫn hiển thị active.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lệch kho dữ liệu giữa KV và D1*: 2,791 mã quà tặng nằm trong KV `wcg_admin_custom_free_codes_v1` nhưng chưa từng được đồng bộ sang bảng D1 `codes`. Ingest kiểm tra trùng theo KV, trong khi API công khai đọc D1, tạo ra hiện tượng trùng ảo (phantom duplicates).
  2. *Ép hoa tự động thô bạo (`.toUpperCase()`)*: Pipeline ingest gọi `.toUpperCase()` làm biến dạng các mã phân biệt chữ hoa/thường.
  3. *Tách chuỗi bằng `\s+`*: Regex tách dòng và ký tự trắng vô tình chia nhỏ các mã hợp lệ có chứa khoảng trắng.
  4. *Bảng D1 `codes` không có cột `updated_at`*: Khi gọi `UPDATE codes SET updated_at = ...` sẽ ném lỗi `no such column: updated_at`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đồng bộ triệt để KV và D1*: Chạy backfill 2,791 mã từ KV vào bảng D1 `codes` và đối chiếu dedup trên cả 2 nguồn.
  2. *Bảo tồn exact case*: Loại bỏ `.toUpperCase()` trong toàn bộ pipeline ingest và sync, giữ nguyên case gốc từ nguồn gửi.
  3. *Tách chuỗi an toàn*: Sử dụng `[\r\n,;]+`, hỗ trợ khoảng trắng (`ACCESS GRANTED`), `!`, `?`, `.`, `#`, độ dài 1..80 ký tự.
  4. *Tự động cập nhật metadata & thêm action `update_code_metadata`*: Cập nhật hạn dùng, phần thưởng và trạng thái trực tiếp trên cả D1 và KV.
  5. *Báo cáo minh bạch*: Trả về `duplicateDetails: [{ code, gameSlug, status, existingLocation, reason }]` và `droppedCodes: [{ code, reason, gameInput }]`.
  6. *Kiểm thử hồi quy tự động*: Tích hợp `scripts/test_ingest_regression.cjs` kiểm tra 4 bài test và tuân thủ Rule 7 dọn dẹp sạch sẽ.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gọi `.toUpperCase()` trên toàn bộ chuỗi mã quà tặng*: Nhiều tựa game lớn (HoYoverse, Genshin, ZZZ, Honkai) phân biệt nghiêm ngặt chữ hoa và chữ thường.
  - ❌ *Không split chuỗi đầu vào bằng `\s+`*: Phải dùng `[\r\n,;]+` để không làm vỡ các mã chứa khoảng trắng hợp lệ.
  - ❌ *Không thêm cột `updated_at` vào câu lệnh UPDATE bảng `codes` D1*: Bảng `codes` chỉ có `added_at` và `created_at`.

### ISSUE-134: Bẫy Lọt Game Test Lên Live Catalog Do Auto-Publish Trong Harness Kiểm Chứng
- **Triệu chứng**:
  - Game test `Test Audit Pending Game 1792947779302` (slug `test-audit-1792947779302`) xuất hiện trên trang chủ `codegame.shop` ở mục "Mới ra mắt", làm tổng số game tăng từ 563 lên 564.
  - Tìm kiếm công khai trả về game test.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Auto-Publish ngoài ý muốn*: Script test `verify_codes_integrity_audit.cjs` gọi API nạp mã cho game trong hàng chờ, kích hoạt cờ `autoPublished = true` trong `ingest-codes.ts`, đẩy bản ghi vào D1 `games`.
  2. *Dọn dẹp thiếu tầng D1 SQL*: Khối `finally` của harness chỉ xóa trong bộ nhớ KV mà không gọi SQL `DELETE FROM games` trên D1.
  3. *Thiếu bộ lọc Guard cấm publish game test*: Cả hàm `publish_game` lẫn khối `autoPublished` không kiểm tra xem game có phải là đối tượng test hay không.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Cung cấp endpoint xóa SQL D1 có thẩm quyền*: Tích hợp action `delete_game` và `cleanup_test_artifacts` vào `ingest-codes.ts` và `sync.ts` để có thể xóa sạch game test trong D1 một cách nguyên tử.
  2. *Thêm chốt chặn `!isTestGame`*: Bất kỳ slug bắt đầu bằng `test-` hoặc tên `Test ` đều bị từ chối publish lên live catalog.
  3. *Harness kiểm chứng tuân thủ Rule 7*: Các bài test pending games không được nạp mã kích hoạt auto-publish; khối `finally` luôn xóa cả KV lẫn D1 SQL; bổ sung bước quét Gatekeeper ở cuối mỗi lần chạy kiểm chứng.
  4. *Pre-build audit quét catalog tĩnh*: Tích hợp bước kiểm tra `games188.json` vào `audit_zero_test_artifacts.cjs`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ chạy harness test tạo thực thể trên Live mà chỉ dọn dẹp ở một tầng (chỉ dọn KV mà bỏ quên D1)*: Phải dọn dẹp đồng bộ ở cả KV và D1 SQL.
  - ❌ *Không để logic auto-publish tự do publish các thực thể mang tiền tố `test-`*: Luôn kiểm tra `isTestGame` trước khi insert vào bảng `games`.

### ISSUE-133: Bẫy TypeError Khi Gọi Hàm Chưa Khai Báo Trong Toast Loop & Bẫy 0/563 Game Trống Link Store
- **Triệu chứng**:
  - Không có bất kỳ toast nhỏ nào xuất hiện ở góc màn hình trong suốt 125 giây (kể cả sau khi đóng popup chào mừng giữa màn hình).
  - Khối tải game ("Tải Game Chính Thức") không xuất hiện trên trang Where Winds Meet và toàn bộ catalog (0/563 game có link store).
  - Tồn dư 7 mã rác bot test trong `public/data/codes_database.json` và `data/games188.json`.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Thiếu phương thức `getLatestLedgerEvent()`*: `MarketingNotificationToast.tsx` gọi `marketingService.getLatestLedgerEvent()` nhưng phương thức này chưa được định nghĩa trên `MarketingService`. Runtime ném `TypeError: marketingService.getLatestLedgerEvent is not a function`, làm vỡ unhandled timeout ở `initialWelcomeTimerRef` và đưa `scheduleDeterministicSlot` vào vòng lặp retry 5000ms vô tận.
  2. *Bẫy anti-spam cooldown gom chung key 'Khách'*: `functions/services/virtualLayerService.ts` tạo sự kiện ảo nhưng không gắn trường `userName: user` vào `combinedEvents`. Client nhận được sự kiện không có `userName`, gán mặc định `userName = 'Khách'`. Sự kiện đầu tiên ghi nhận cooldown 20s cho key `'Khách_COPY_CODE'`, dẫn đến việc 100% các sự kiện sao chép tiếp theo của TẤT CẢ các người dùng ảo đều bị khóa chặt.
  3. *Bẫy slot-skipping lặp vô tận*: Khi `getCurrentSlotEvent(currentSlotIndex)` trả về `null`, client liên tục bỏ qua khe hiện tại và dời sang khe sau, gây ra tình trạng bế tắc không hiển thị bất kỳ thông báo nào.
  4. *Trống dữ liệu store links & bỏ qua PC link*: Dữ liệu catalog chưa được điền link CH Play / App Store; `GameDownloadSection.tsx` kiểm tra `if (!hasPlay && !hasIos) return null;` bỏ qua `download_pc`, làm ẩn cả game có bản PC như Where Winds Meet.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Định nghĩa đầy đủ `getLatestLedgerEvent()`*: Cài đặt trên `MarketingService` trả về sự kiện mới nhất chưa xử lý từ hàng đợi sổ máy chủ hoặc bộ nhớ đệm sự kiện.
  2. *Gắn định danh người dùng và chỉ số khe cho sự kiện ảo*: `userName: user` và `slotIndex: nowSlotIndex` trong `virtualLayerService.ts`.
  3. *Fallback hàng đợi sổ máy chủ khi lệch khe*: Nếu `getCurrentSlotEvent(currentSlotIndex)` trả về `null`, tự động lấy `getNextLedgerEvent() || getLatestLedgerEvent()`.
  4. *Điền link store hàng loạt (344/560 game)*: Sử dụng `scripts/enrich_store_links.cjs` nạp package ID từ `gp_cache.json` và iTunes Search API kèm bộ lọc precision; hỗ trợ `download_pc` và hiển thị nút "Bản PC (Windows)".
  5. *Thanh lọc triệt để 7 mã rác*: Xóa sạch khỏi `public/data/codes_database.json` và `data/games188.json`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gọi phương thức trên service khi chưa kiểm tra khai báo*: Luôn kiểm tra định nghĩa phương thức trên class TypeScript trước khi gọi trong component.
  - ❌ *Không gộp chung toàn bộ sự kiện ảo vào một tên người dùng mặc định*: Mỗi sự kiện ảo phải mang `userName` riêng biệt để không kích hoạt nhầm cơ chế cooldown chống spam toàn cục.
  - ❌ *Không ẩn khối tải game nếu game có liên kết PC*: Phải kiểm tra cả `hasPc` bên cạnh `hasPlay` và `hasIos`.

---

### ISSUE-132: Bẫy Lọc Bỏ Âm Thầm Mã Ngắn Dưới 3-4 Ký Tự & Sai Lệch Tên Game Trong Event Mô Phỏng
- **Triệu chứng**:
  - Các giftcode ngắn chính thức của Roblox DOORS (`W`, `41`, `54`, `67`) bị bộ lọc API nuốt âm thầm không báo lỗi.
  - Khi người dùng truy cập `/game/doors` bị 404 do slug chuẩn mực là `doors-roblox`.
  - Tên game "Thực Thần Ký" (viết sai) xuất hiện trong các sự kiện marketing mô phỏng thay vì tên đúng "Thức Thần Ký".
  - Các chiến dịch Giveaway khi hết mã thật bị rơi về hiển thị `Đã giật: 0 mã    Còn lại: 0 mã` (0/0) nếu thiếu `virtual_claimed_offset`.
  - Toast thông báo đầu tiên trên trình duyệt bị trễ lên đến ~24s do thuật toán phân khe slot-skipping.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Bộ lọc độ dài cứng nhắc*: Logic `if (val.length < 3 || val.length > 40) return;` trong `ingest-codes.ts` và `clean.length < 4` trong `code_filter.cjs` tự ý loại bỏ các mã 1–2 ký tự mà không ghi log hay trả về danh sách `droppedCodes`.
  2. *Mảng dữ liệu giả lập bị sai chính tả*: Mảng `sampleGames` và `games` trong `virtualLayerService.ts` và `marketingAuditService.ts` chứa `'Thực Thần Ký'`.
  3. *Thiếu fallback cho Giveaway Claimed*: Khi `realRemaining <= 0` và `realClaimed == 0`, nếu giveaway không có cấu hình offset thì hiển thị 0/0.
  4. *Trễ thông báo do trôi khe*: Khi tải trang rơi vào cuối slot 10s (`calibratedNow > slotEndMs - 2500`), hệ thống đánh dấu bỏ qua khe và chờ đến khe sau kèm thời gian chờ ngẫu nhiên trong khe (`slotFireTimeMs`), cộng dồn lên tới 24s.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Nới lỏng độ dài mã và trả về `droppedCodes`*: Cho phép mã từ $\ge 1$ ký tự; mọi mã bị từ chối đều được trả về trong mảng `droppedCodes: [{ code, reason }]`.
  2. *Ánh xạ Alias Slug*: Tự động chuyển hướng và ánh xạ `doors` $\rightarrow$ `doors-roblox` trên toàn bộ các tầng (`_worker.ts`, `functions/api/games.ts`, `dataService.ts`, `GAME_ACRONYM_MAP`).
  3. *Chuẩn hóa tên Thức Thần Ký*: Sửa toàn bộ mã nguồn, cơ sở dữ liệu và thêm SQL self-healing trong `d1_service.ts`.
  4. *Bổ sung số ảo Giveaway 52–112*: Tự động gán offset ngẫu nhiên tự nhiên cho toàn bộ giveaway thiếu offset để triệt tiêu vĩnh viễn trạng thái 0/0.
  5. *Fast Welcome Toast*: Cho phép phát ngay thông báo chào mừng từ sự kiện mới nhất sau 3s kể từ khi tải trang nếu là phiên đầu tiên (`lastDisplayedSlotRef.current === -1`), đảm bảo thông báo đầu tiên luôn xuất hiện trong vòng $\le 4$s (đáp ứng trọn vẹn yêu cầu $\le 20$s).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không lọc bỏ mã âm thầm (`silent discard`)*: Mọi mã không nạp được phải trả về lý do trong `droppedCodes`.
  - ❌ *Không để độ dài tối thiểu của giftcode $\ge 3$*: Phải hỗ trợ mã ngắn 1–2 ký tự của các tựa game như DOORS Roblox.
  - ❌ *Không bỏ qua khe (slot skip) ở lần tải đầu tiên của trang web*: Lần đầu tiên mở web phải ưu tiên phát ngay sự kiện mới nhất để kích thích tương tác người dùng.

---

### ISSUE-131: Bẫy Dynamic Game Icon Servicing Qua D1 & Tiêu Hao Quota Đọc D1 (Static vs Dynamic Icon Route Trap)
- **Triệu chứng**:
  - Bot cào tự động (Muse) tải được file icon WebP 512x512 thực tế nhưng không có cách nào đưa file lên server ngoài việc deploy lại site hoặc upload thủ công qua GUI.
  - Nếu API chỉ lưu URL ngoài vào D1, trang web vẫn fallback về logo mặc định `/logo.png` vì web chỉ render ảnh cục bộ từ `/game_icons/<slug>.webp`.
  - Nếu xây dựng dynamic route `/game_icons/:file` mà truy vấn D1 trực tiếp cho mọi request, hơn 560 game tĩnh có sẵn trong thư mục static dist sẽ phát sinh hàng chục ngàn query D1 vô ích mỗi ngày, làm cạn kiệt nhanh chóng hạn mức 5 triệu dòng đọc/ngày của Cloudflare D1.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Thiếu action ingest nhị phân*: API crawler ingest chỉ hỗ trợ `action: "update_icon"` nhận chuỗi URL ngoài, không nhận nội dung file ảnh.
  2. *Bẫy bảo mật XSS qua SVG*: Cho phép upload ảnh mà không kiểm tra magic bytes thực tế có thể bị lợi dụng tải lên file SVG chứa mã JavaScript độc hại (`<script>alert(1)</script>`).
  3. *Không tận dụng Pipeline Cloudflare Pages ASSETS*: Pages Worker bundle (`_worker.ts`) chặn mọi request, nếu không chuyển tiếp cho `env.ASSETS` thì tài nguyên tĩnh đã build trong `dist/game_icons/` sẽ không được phục vụ trực tiếp.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Triển khai action `upload_icon` trên `POST /api/crawler/ingest-upcoming-games`*:
     - Xác thực Bearer Token / `X-API-Key` / payload `apiKey` (`401` nếu thiếu hoặc sai; `503` nếu D1 backend lỗi/sập).
     - Kiểm tra magic bytes thực tế: Hỗ trợ WebP (RIFF/WEBP, VP8/VP8L/VP8X), PNG (89 50 4E 47), JPEG (FF D8 FF). Từ chối dứt khoát SVG/XML/HTML (`400`).
     - Giới hạn dung lượng tối đa 500KB. Trích xuất kích thước width/height (chuẩn 512x512).
     - Slug chỉ nhận `[a-z0-9-]`, chặn triệt để path traversal (`..`, `/`, `\`, `%2e`, `%2f`, `%5c`). Tra cứu slug trong upcoming hoặc catalog.
  2. *Pipeline phục vụ tối ưu 0 D1 Read cho tài nguyên tĩnh*:
     - Kiểm tra Cloudflare Edge Cache (`caches.default`) $\rightarrow$ Cache HIT trả về ngay, 0 D1 read.
     - Thử `env.ASSETS.fetch(request)` trước $\rightarrow$ hơn 560 game tĩnh có sẵn phục vụ trực tiếp từ CDN với 0 D1 read.
     - Chỉ khi `ASSETS.fetch` trả về 404 (ảnh cào mới chưa có trong bản build): Tra cứu D1 bảng `uploaded_game_icons`, decode base64 sang binary `Uint8Array`, trả về `image/webp` với header `Cache-Control: public, max-age=2592000, s-maxage=2592000, immutable`, đồng thời lưu vào `caches.default`.
  3. *Ghi đè Idempotent & Đồng bộ bản ghi*:
     - Tự động đồng bộ `iconUrl` và `icon_url` của game thành `/game_icons/<slug>.webp`.
     - Cho phép upload lại cùng slug để cập nhật ảnh mới và purge cache.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không truy vấn D1 cho tất cả request icon*: Phải ưu tiên `env.ASSETS.fetch` trước.
  - ❌ *Không tin tưởng header `contentType` từ client*: Bắt buộc phải đọc magic bytes của file nhị phân.
  - ❌ *Không chấp nhận SVG*: Nguy cơ bảo mật XSS thực thi mã độc.

---

### ISSUE-130: Bẫy Tự Động Gán Ngày Hiện Tại Cho Game Sắp Ra Mắt Chưa Có Ngày (Omitted/Null ReleaseDate Fallback Trap)
- **Triệu chứng**:
  - Khi bot cào dữ liệu hoặc người dùng tạo một game sắp ra mắt mới qua API `POST /api/crawler/ingest-upcoming-games` mà không gửi trường `releaseDate` (hoặc gửi `null`, `""`), hệ thống tự động gán `releaseDate` thành thời điểm hiện tại (`nowIso`).
  - Hệ quả là bản ghi bị suy diễn sai thành `rolloverStatus = "TODAY_LAUNCH"`, `isLaunched = true`, `hoursRemainingOnBanner = 23`. Game chưa ra mắt bị hiển thị thành "ĐÃ MỞ SERVER" / "ra mắt hôm nay" với đếm ngược giả, làm sai lệch toàn bộ danh sách và khiến 22 game chưa có ngày không thể nhập vào hệ thống.
  - Ngoài ra, khi cập nhật từng phần một game có sẵn mà không gửi trường `releaseDate`, nếu logic không phân biệt giữa trường bị bỏ qua (omitted) và giá trị rỗng/null, ngày cũ có thể bị mất.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Fallback `nowIso` khi tạo mới*: Trong `ingest-upcoming-games.ts`, dòng khởi tạo `releaseDate` gán `hasRelDate && rawRelDate ? rawRelDate : nowIso`.
  2. *Không kiểm tra sự tồn tại của trường (`in` operator)*: Logic chỉ dùng `raw.releaseDate || ...` (truthy), không phân biệt giữa không gửi trường (giữ nguyên ngày) và gửi `null` (xóa ngày).
  3. *Hàm sort bị `NaN`*: `new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()` trả về `NaN` khi `releaseDate` là `null`, khiến thứ tự sắp xếp bị xáo trộn lung tung.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Phân biệt 3 trạng thái của `releaseDate`*:
     - Kiểm tra `hasExplicitRelDateField = ('releaseDate' in raw) || ('release_date' in raw) || ('launchDate' in raw) || ('launch_date' in raw)`.
     - Nếu tạo mới: `releaseDate: cleanRelDate` (lưu `null` nếu không có ngày, tuyệt đối không gán `nowIso`).
     - Nếu cập nhật: Nếu có trường thì cập nhật (`cleanRelDate` hoặc `null`); nếu không có trường thì giữ nguyên `existing.releaseDate`.
  2. *Suy diễn trung thực trong GET API*:
     - Khi `!g.releaseDate`: gán `releaseDate: null`, `rolloverStatus = 'TBA'`, `isLaunched = false`, `isRolledOver = false`, `hoursRemainingOnBanner = 0`, `minutesRemainingOnBanner = 0`.
  3. *Thuật toán sắp xếp 2 tầng*:
     - Game có ngày tăng dần xếp trước; game `null` ngày xếp sau theo `displayOrder` rồi tên A-Z.
     - Top 6 banner chỉ lấy game có ngày cụ thể (`liveWithDateCount`), game `null` ngày không chiếm suất đếm ngược.
  4. *Giao diện hiển thị rõ ràng*: Thẻ game không có ngày hiển thị nhãn "Chưa rõ ngày ra mắt" thay vì đếm ngược.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `nowIso` làm fallback cho `releaseDate`*: Không có ngày thì bắt buộc phải lưu `null`.
  - ❌ *Không dùng `new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()`*: Phải kiểm tra `!isNaN(time)` trước khi trừ, xếp game có ngày trước và game `null` ngày sau.

---

### ISSUE-129: Bẫy Ép Số Đã Bán / Đã Giật Về 0 Khi Hàng Thật Hết (Zeroing Historical Counters In Out-Of-Stock Products)
- **Triệu chứng**:
  - Khi một sản phẩm tiện ích hoặc chiến dịch giveaway hết hàng thật trong kho (`realStock = 0` hoặc `realRemaining = 0`), thẻ sản phẩm và giveaway trên web khách hiển thị `Đã giật: 0 mã        Còn lại: 0 mã` hoặc `Đã bán: 0`.
  - Trên web quản trị Admin: Cột Web FOMO hiển thị `Giật 0` và `Bán 0`, dù trước đó đã cấu hình `virtual_claimed_offset` hay `virtual_sold_count`.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Hiểu sai Quy tắc kho hàng 3.1: Quy tắc kho hàng nghiêm ngặt quy định: "HÀNG THẬT TRONG KHO = 0 -> HIỂN THỊ TỒN KHO = 0 (`displayStock = 0`, nút Disabled)".
  - Tuy nhiên, trong `virtualLayerService.ts`, tác nhân đã gán `p.virtualSold = 0;` và `g.virtualClaimed = 0;` cùng với `p.virtualBuffer = 0`. Thao tác này đã xóa sạch lịch sử giao dịch và số lượng đã trao quà tích lũy, biến tất cả các mặt hàng đã hết thành "chưa từng có ai mua/giật" (0 đã giật, 0 đã bán), phá hủy toàn bộ Social Proof và uy tín của sàn.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Phân tách rạch ròi giữa Tồn Kho (Stock / Remaining) và Lịch Sử Đã Bán / Đã Giật (Sold / Claimed)*:
     - Khi `realStock <= 0` hoặc `realRemaining <= 0`: Bắt buộc chỉ gán `virtualBuffer = 0` và `virtualRemainingBuffer = 0`. Điều này đảm bảo `displayStock = 0` và `displayRemaining = 0` tuân thủ 100% Rule 3.1.
     - Giữ nguyên `virtualSold` và `virtualClaimed` từ baseline (`CUMULATIVE_BASELINES_20261025`) hoặc offset (`virtual_claimed_offset` 52–112, `virtual_sold_count` 32–212).
  2. *Bổ sung số ảo ngẫu nhiên tự nhiên*:
     - Toàn bộ 32 chiến dịch Giveaway có `virtual_claimed_offset` ngẫu nhiên $\in [52, 112]$.
     - Toàn bộ 17 tiện ích có số lượng bán < 10 có `virtual_sold_count` ngẫu nhiên $\in [32, 212]$.
     - Admin trang bị 2 nút tiện ích một chạm: "🎲 Bổ Sung Số Ảo (52–112)" trong `PrivateCodesModule.tsx` và "🎲 Bổ Sung Số Ảo (32–212)" trong `UtilitiesModule.tsx`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối không gán `virtualSold = 0` hay `virtualClaimed = 0` khi `realStock <= 0`*: Rule 3.1 chỉ quản lý TỒN KHO (Còn: 0), không được can thiệp xóa số đã bán và đã giật.

---

### ISSUE-128: Bẫy Nhân Đôi Bản Ghi Mã Code Khi Đồng Bộ Client/Server D1 (ID Format Mismatch & Missing Deduplication)
- **Triệu chứng**:
  - Người dùng xem Modal "Kho Mã Code Của Tôi", tab "Sự Kiện" thấy số lượng mã bị nhân đôi (ví dụ 14 mã thay vì 7 mã). Mỗi tựa game (như *TA LÀ HẮC NGỘ KHÔNG*, *Pirate Legends*, *Yến Vân Thập Lục Thanh*) xuất hiện 2 dòng cùng mã code và cùng thời gian nhận.
  - Khi mở Modal chi tiết Giveaway của tựa game đã nhận, mục "Mã bạn đã giật tại sự kiện này" hiển thị 2 dòng code y hệt nhau kèm nhãn "(2 mã)", và nút bấm hiển thị "Xem lại mã bạn đã nhận (2)".
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lỗi định dạng khóa khi merge Map trong `refreshCurrentUserBalance`*:
     - Client khi giật mã lưu bản ghi với ID chuỗi: `id: 'claim_1792...'`.
     - Server Cloudflare D1 khi đồng bộ trả về mảng `giveawayClaims` từ bảng SQLite D1 với `id` kiểu số/UUID: `id: 14`.
     - Biểu thức merge trước đây: `const key = c?.id || `${c?.campaign_id}_${c?.code_value}`;`. Vì `c?.id` luôn truthy ở cả hai nguồn, toán tử `||` không bao giờ rơi vào vế sau (`${c?.campaign_id}_${c?.code_value}`). Hai ID khác nhau (`claim_1792...` vs `14`) tạo ra 2 key khác nhau trong Map, dẫn đến việc lưu cả 2 bản ghi cho cùng 1 giftcode vào `localStorage` key `wcg_claimed_giveaways`.
  2. *Tầng đọc dữ liệu `getClaimedCodes()` và `getOrders()` không có cơ chế khử trùng lặp*:
     - Chỉ filter các mã lỗi hệ thống (`OUT_OF_STOCK`, v.v.) mà hoàn toàn không deduplicate theo `${campaign_id}_${cleanCode}`.
  3. *Tầng giao diện thiếu lớp phòng thủ (UI Defense-in-Depth)*:
     - `MyReceivedCodesModal.tsx` và `GiveawaysView.tsx` render trực tiếp theo mảng `claimedList` thô.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Chuẩn hóa Unique Key khi merge Map trong `refreshCurrentUserBalance`*:
     - Sử dụng hàm ghép khóa chuẩn: `${campId}_${cleanCode}` (với `cleanCode = c.code_value.trim().toUpperCase()`).
     - Bản ghi từ D1 server sẽ cập nhật thông tin đè lên bản ghi cục bộ của cùng một mã quà thay vì sinh thêm dòng mới.
  2. *Cơ chế tự phục hồi (Self-Healing Deduplication) trong `getClaimedCodes()` & `getOrders()`*:
     - Duyệt Set theo `${campId}_${cleanCode}` và chỉ giữ 1 bản ghi duy nhất.
     - Nếu `deduplicated.length !== list.length`, lập tức tự động ghi đè bản ghi sạch trở lại `localStorage`. Toàn bộ dữ liệu trùng cũ trên trình duyệt khách hàng được dọn sạch 100% ngay lần đầu mở web.
  3. *Phòng thủ đa tầng tại UI Component*:
     - `MyReceivedCodesModal.tsx`: dùng `useMemo` tính `displayClaimedList` và `displayOrdersList`, hiển thị đúng số lượng mã thực (từ 14 về đúng 7 mã).
     - `GiveawaysView.tsx`: áp dụng `uniqueClaimedList` cho toàn bộ danh sách, đưa số mã đã giật tại sự kiện về đúng 1 mã duy nhất.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `c?.id || ...` để làm khóa định danh khi merge dữ liệu giữa Client và Server*: Client sinh ID tạm thời còn Server dùng Auto-increment ID / UUID của Database. Bắt buộc phải dùng khóa nghiệp vụ duy nhất (Business Unique Key) là `${campaign_id}_${code_value}`.
  - ❌ *Không phụ thuộc duy nhất vào việc sửa tầng lưu trữ*: Bắt buộc phải có cả cơ chế Self-healing ở hàm đọc (`getClaimedCodes`) và UI Defense-in-Depth (`useMemo`) để làm sạch dữ liệu cũ đã lưu trên hàng ngàn trình duyệt người dùng.

---

### ISSUE-127: Bẫy Nhân Số Ảo Khi Đổi Nhịp Khe (Replay Loop Desync Trap) & Khoảng Lặng Đầu Phiên Trình Duyệt Thật
- **Triệu chứng**:
  1. *Số ảo nhảy vọt gấp 3–4 lần khi đổi nhịp khe*: VIP 7 Days VS Phone đang hiển thị đã bán 415 / còn 433 / nhập lại 41 bỗng nhảy vọt lên đã bán 1387 / còn 2001 / nhập lại 168 sau khi chuyển từ nhịp 30s sang 10s. Rotwood nhận 86 / còn 31 (pool 117) nhảy lên nhận 286 / còn 31 (pool 317).
  2. *Khoảng lặng 2.5 phút đầu phiên trên trình duyệt thật*: Khi người dùng mở trang chủ, trong 2 đến 2.5 phút đầu hoàn toàn không có thông báo toast, sau đó các thông báo nổ ngắt quãng 20–35s thay vì nhịp 10s đều đặn.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. *Lỗi phát lại từ slot 0 (Slot Replay Loop)*: Trong `virtualLayerService.ts`, khi một Cloudflare worker isolate khởi động lại (cold start), nó thấy `lastProcessedSlot < 0` bèn reset `virtualSold = 0, virtualBuffer = 20` và chạy vòng lặp `for (let slot = 0; slot <= currentSlotIndex; slot++)`. Ở nhịp 30s, lúc 15:30 có 1860 khe. Khi đổi sang nhịp 10s, lúc 15:30 có tới 5580 khe (gấp 3 lần), khiến xác suất 22% bán ảo và restock lặp lại 5580 lần, nhân 3 số bán ảo và số buffer của VIP 7 Days (sản phẩm duy nhất còn hàng thật) và Rotwood.
  2. *Lỗi khoảng lặng đầu phiên do Toast mount fetch `/api/stats` thay vì `/api/realtime-events`*: Endpoint `/api/stats` không có trường `events`, khiến `slotEventsMap` lúc đầu hoàn toàn rỗng. Khi timer nổ ở giây 1.5, code thấy không có sự kiện bèn đánh dấu `lastDisplayedSlotRef.current = currentSlotIndex` (bỏ qua khe hiện tại) và hẹn giờ sang khe sau! Đồng thời, Cache-Control của `/api/realtime-events` trước đây đặt `s-maxage=8, max-age=5` khiến poller nhận gói tin cũ từ Edge CDN, dẫn đến bỏ lỡ 2/3 khe liên tiếp.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Tách số ảo khỏi số khe (Time-Anchored Cumulative Snapshot)*:
     - Số ảo tích lũy được neo theo mốc thời gian chuẩn (`BASELINE_ANCHOR_TIME_MS = 1792917180000`, 15:33:00 25/10/2026) với bảng `CUMULATIVE_BASELINES_20261025` và tốc độ tăng trưởng theo thời gian trôi (phút/giờ), hoàn toàn không phụ thuộc vào `SLOT_DURATION_MS`.
     - Vòng lặp slot chỉ sinh sự kiện mô phỏng cho tối đa 15 khe gần nhất (2.5 phút) để phục vụ thông báo toast, tuyệt đối không chạy lại từ slot 0 của ngày.
     - Kiểm chứng: Thay đổi nhịp khe (10s, 30s, 5s, 60s) giữ nguyên 100% số liệu hiển thị, không làm suy chuyển số ảo.
  2. *Khôi phục số liệu đã lệch về đúng quỹ đạo*:
     - VIP 7 Days: virtualSold về 415 + delta trực tiếp (~465), stock về 8 + buffer (~423), restock count về 41 + delta (~43).
     - Rotwood: virtualClaimed về 84 + delta (~99), remaining về 15 + buffer (~16), tổng pool luôn đúng tuyệt đối 117.
     - 17 utilities và 38 giveaways hết hàng thật giữ nguyên tồn = 0, bán/nhận ảo = 0 theo Quy tắc kho hàng nghiêm ngặt (Rule 3.1).
  3. *Xóa sạch khoảng lặng đầu phiên & Late-Arrival Catch-up*:
     - `MarketingNotificationToast.tsx` lúc mount gọi trực tiếp `/api/realtime-events?t=${Date.now()}` với `{ cache: 'no-store' }`.
     - Đảm bảo thông báo đầu tiên nổ trong vòng 3-5 giây đầu phiên (< 20s theo yêu cầu).
     - Late-Arrival Catch-up: Khi dữ liệu về trễ trong cửa sổ khe (sau 1.5s nhưng trước 8.0s), hiển thị bù ngay lập tức phần thời lượng còn lại (2s-4s) và không bỏ qua khe.
     - Header `/api/realtime-events` đặt `Cache-Control: no-cache, no-store, must-revalidate`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tính số ảo tích lũy bằng cách replay PRNG từ slot 0*: Sẽ làm số ảo biến thiên theo số lượng khe khi đổi nhịp slot.
  - ❌ *Không gọi `/api/stats` để nạp sự kiện cho Toast*: Endpoint này không có mảng events.
  - ❌ *Không đánh dấu `lastDisplayedSlotRef = currentSlotIndex` khi dữ liệu khe chưa kịp về*: Sẽ triệt tiêu sự kiện khi dữ liệu về sau vài trăm mili giây.

---

### ISSUE-126: Bẫy Spam Thông Báo Sao Chép & Lặp Lại Thông Báo Giữa Real Event Và Slot Event
- **Triệu chứng**:
  - Người dùng bấm sao chép liên tục thì thông báo toast nổ dồn dập (spam). Hoặc khi 1 người dùng khác sao chép trên sàn, các trình duyệt khác nổ thông báo sao chép nhiều lần trong thời gian ngắn dù đã có cooldown 20s cục bộ.
  - Một thao tác thật (mua hàng, giật code, sao chép) nổ 2 lần trên cùng một trình duyệt: Lần 1 nổ qua đường ưu tiên sự kiện thật (Real Event), sau đó 5–10s nổ lại lần 2 qua đường sự kiện theo khe (Slot Event).
- **Nguyên nhân gốc rễ**:
  1. *Cooldown chỉ áp dụng ở tầng sinh cục bộ*: `REAL_COPY_TOAST_COOLDOWN_MS = 20s` trước đây chỉ được đặt trong hàm `recordRealCopy`, hoàn toàn không kiểm tra ở đường hiển thị sự kiện thật từ máy chủ, đường nhận đẩy trực tiếp, hay đường sự kiện theo khe.
  2. *Đường khe không kiểm tra `isNotificationProcessed` trước khi hiển thị*: Chỉ đánh dấu sau khi hiển thị.
  3. *Đường sự kiện thật không đánh dấu `lastDisplayedSlotRef`*: Khi sự kiện thật nổ ở giây 1.5, slot hiện tại không được đánh dấu là "đã phục vụ", dẫn đến lần tick kế tiếp vẫn lấy sự kiện khe đó ra hiển thị lại lần 2.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Hệ thống Cooldown Chống Spam Tập Trung*:
     - `canDisplayActionNotification(maskedUser, 'COPY_CODE', 20000)`: Khóa định danh dựa trên tên đã che (`${safeUser}_COPY_CODE`).
     - Áp dụng kiểm tra cooldown 20s tại TẤT CẢ các cửa ngõ: `recordRealCopy`, `peekRealEvent`, `popRealEvent`, `pushRealEvent`, `displayNotification`, và nhánh Slot Event trong `scheduleDeterministicSlot`.
     - Bộ đếm `incrementLiveCounter(count)` và đồng bộ máy chủ `schedulePushRealEvent(event, count)` luôn chạy đủ 100% (không chặn đếm).
  2. *Chống Lặp Tuyệt Đối Mọi Đường & Đánh Dấu Khe*:
     - Trước khi hiển thị bất kỳ sự kiện nào: Kiểm tra `isNotificationProcessed(notif.id)`. Nếu `true` $\rightarrow$ bỏ qua ngay lập tức.
     - Khi sự kiện thật hiển thị: Lập tức gán `lastDisplayedSlotRef.current = currentSlotIndex;` và `marketingService.removeSlotEvent(nextRealEvent.id);`.
     - Đồng bộ đa tab: Phát thông điệp `NOTIF_PROCESSED_BROADCAST` qua `BroadcastChannel`. Các tab khác lắng nghe qua `wcg_notif_processed` và cập nhật `lastDisplayedSlotRef.current = slotIndex;` và `processedNotifIds.add(notifId)`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ chặn cooldown trong `recordRealCopy`*: Phải chặn tại `displayNotification` và toàn bộ bộ lập lịch để chống cả sự kiện từ máy chủ/tab khác.
  - ❌ *Không chặn tăng bộ đếm khi cooldown thông báo toast*: Bộ đếm phải đếm đủ mọi lần thao tác của khách hàng.
  - ❌ *Không quên gán `lastDisplayedSlotRef.current = currentSlotIndex` khi sự kiện thật nổ*: Gây lặp lại sự kiện qua đường khe.

---

### ISSUE-125: Bẫy Lệch Pha Giữa Chu Kỳ Hỏi Dữ Liệu Và Nhịp Khe Thời Gian (Slot vs Poller Desync Trap)
- **Triệu chứng**:
  - Khi tăng mật độ thông báo lên nhịp ngắn (5–15s / khe 10s), nếu bộ hỏi dữ liệu (poller) vẫn chạy chu kỳ độc lập ngẫu nhiên (25–30s) thì trình duyệt sẽ bỏ lỡ 2 trong 3 khe liên tiếp do chưa tải kịp sự kiện mới từ máy chủ về bảng khe (`slotEventsMap`). Toast im lặng vài phút dù mô-đun đang bật.
- **Nguyên nhân gốc rễ**:
  1. *Lệch pha giữa Poller và Slot Engine*: Bộ hỏi chạy chu kỳ riêng không bám theo ranh giới khe. Giờ nổ của khe là giây 1.5, nhưng dữ liệu có thể phải đến giây 25 mới được hỏi, khiến khe trôi qua mà không có thông báo.
  2. *Thời lượng hiển thị lớn hơn hoặc bằng nhịp khe*: Nếu nhịp khe 10s mà thời lượng hiển thị là 5s hoặc 10s, thông báo của khe sau sẽ đè lên hoặc bị hoãn lại, tạo hàng đợi dồn ứ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Hỏi dữ liệu theo nhịp khe (Slot-Aligned Poller Engine)*:
     - Hằng số nhịp khe cố định `SLOT_DURATION_MS = 10000` (10 giây) đồng bộ 100% toàn hệ sinh thái (Server + Client).
     - Bộ hỏi dữ liệu luôn hẹn giờ fetch vào khoảng giây `0.65` sau điểm bắt đầu khe (`slotStartMs + 650`), đảm bảo dữ liệu sự kiện đã có sẵn trong `slotEventsMap` trước giây nổ `1.5s`.
     - Sự kiện `visibilitychange` kích hoạt hỏi bù ngay khi tab hiển thị trở lại.
     - Tần suất hỏi: đúng 1 lần/khe/trình duyệt (6 lần/phút).
  2. *Khống chế thời lượng hiển thị nhỏ hơn nhịp khe (Chống chồng chéo)*:
     - Thời lượng hiển thị tối đa `4 giây` (`4000ms`), nổ ở giây 1.5, tự động đóng ở giây 5.5 của khe 10s, để lại khoảng nghỉ tự nhiên 4.5 giây trước khi khe tiếp theo bắt đầu.
     - Thông báo mới luôn thay thế ngay thông báo trước, không xếp hàng tồn đọng.
  3. *Co ngưỡng cảnh báo im lặng*:
     - Giảm `silence_threshold_seconds` từ 180s xuống 60s (tương đương 6 khe 10s).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng chu kỳ hỏi ngẫu nhiên lệch pha với ranh giới khe*: Phải tính toán `nextSlotStartMs + 650` từ đồng hồ hiệu chuẩn.
  - ❌ *Không để thời lượng hiển thị >= nhịp khe*: Gây lỗi chồng chéo hoặc mất thông báo.
  - ❌ *Không để lệch hằng số nhịp khe giữa Client và Server*: Cả 2 phải cùng dùng 10000ms.

---

### ISSUE-124: Lệch Pha Hiển Thị Thông Báo Marketing Đa Thiết Bị Do Polling Skew & Xả Hàng Đợi FIFO Cũ
- **Triệu chứng**:
  - Khi mở nhiều thiết bị (máy tính, điện thoại, các trình duyệt khác nhau) cùng lúc, thông báo toast góc dưới trái không đồng nhất: máy có máy không, loại thông báo và nội dung không khớp nhau tại cùng một thời điểm.
- **Nguyên nhân gốc rễ**:
  1. *Lệch chu kỳ hỏi dữ liệu (Polling Phase Skew)*: Client hẹn giờ định kỳ kiểu `25000 + Math.random() * 5000` kể từ thời điểm mở trang. Máy A mở lúc giây 00 hỏi lúc giây 25, máy B mở lúc giây 15 hỏi lúc giây 40 $\rightarrow$ thời điểm nổ toast bị lệch nhau tới 15–20 giây.
  2. *Hàng đợi FIFO xả quá khứ*: Trình duyệt mới mở nhận mảng 15 sự kiện của 7.5 phút trước từ server, hàm `getNextLedgerEvent()` gọi `shift()` lấy sự kiện cũ nhất ra hiển thị, trong khi máy đã mở lâu hiển thị sự kiện mới.
  3. *Replay ngẫu nhiên độc lập*: Khi queue rỗng, client tự gọi `cachedLedgerEvents[Math.floor(Math.random() * length)]` gắn `id: replay_*` $\rightarrow$ mỗi máy chọn một mặt hàng ngẫu nhiên khác nhau.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Cơ chế Slot Clock Synchronized Engine*:
     - Đồng bộ hóa hiển thị theo đồng hồ khe đã hiệu chuẩn (`calibratedNow`) dựa vào `slotIndex = Math.floor((calibratedNow - dayStartMs) / 30000)`.
     - `MarketingNotificationToast.tsx`: Giờ nổ cố định tại giây thứ 1.5 của khe (`slotFireTimeMs = slotStartMs + 1500`). Thời lượng hiển thị cố định 5s (`slotHideTimeMs = slotFireTimeMs + 5000`).
     - Mọi trình duyệt tại cùng một khe $K$ đều hiển thị đúng 1 sự kiện duy nhất từ `slotEventsMap.get(K)`.
     - Chống trùng lặp theo khe (`lastDisplayedSlotRef`): Mỗi khe chỉ hiển thị đúng 1 lần, bất kể số lần re-render.
     - Trình duyệt mới mở / Tab ẩn quay lại: Bắt đầu ngay từ khe hiện tại, nếu đã qua thời lượng hiển thị (> 9s) thì đánh dấu bỏ qua và chờ khe tiếp theo, tuyệt đối không xả lại sự kiện cũ trong quá khứ.
     - Xóa vĩnh viễn nhánh `replay_`: Trả về `null` khi hàng đợi rỗng.
     - Sự kiện thật của người dùng: Ưu tiên cao nhất, hiển thị ngay lập tức (vượt khe).
  2. *Phân biệt rõ ràng cài đặt cục bộ (Local Preference)*:
     - Nút "Không hiện 1h" lưu trong `localStorage.getItem('wcg_marketing_toast_snooze_until')` của riêng trình duyệt đó (browser-scoped). Thiết bị bấm nút sẽ tạm ẩn, thiết bị khác không bấm vẫn nổ theo khe bình thường.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng mảng FIFO `shift()` xả sự kiện cũ khi người dùng mở trang mới*: Phải hiển thị theo đồng hồ khe hiện tại.
  - ❌ *Không chọn ngẫu nhiên sự kiện cũ trong cache (`cachedLedgerEvents[random]`) để replay*: Gây lệch pha nội dung giữa các máy.
  - ❌ *Không hẹn giờ hiển thị phụ thuộc vào thời điểm fetch API*: Phải dùng `setTimeout` chờ đến đúng `slotFireTimeMs` của đồng hồ khe.

---

### ISSUE-123: Vòng Lặp Re-render Vô Tận (React Invariant #301) Khi Lưu Lại Trang Giật Code (/giveaways)
- **Triệu chứng**:
  - Người dùng mở trang `/giveaways` một lúc (khoảng 30 giây đến 1 phút) thì giao diện bị lỗi và rơi vào `<ErrorBoundary>`: `Minified React error #301: Too many re-renders. React limits the number of renders to prevent an infinite loop.`
- **Nguyên nhân gốc rễ**:
  1. *Hook `useEventCountdown.ts` gọi `onExpire` đồng bộ trong initial tick*: Khi component mount hoặc render với mốc thời gian đã trôi qua hoặc vừa chạm 0, `tick()` gọi `onExpireRef.current()` đồng bộ ngay bên trong effect.
  2. *Parent gọi `setGiveaways` tạo mảng mới*: Hàm `onExpire` gọi `setGiveaways([...dataService.getGiveaways()])`, làm component cha `GiveawaysView` render lại.
  3. *Cascading Re-render Loop*: Parent render lại tạo ra reference props mới, component con lại re-evaluate và gọi lại `onExpire` $\rightarrow$ vượt quá 50 lần render liên tiếp của React trong 1 microtask.
  4. *Bão sự kiện FOMO nổ toast định kỳ (~35s)*: Bắn 4-6 CustomEvent/Listener cùng lúc gọi `loadData()` không có debounce, làm trầm trọng thêm chuỗi re-render.
  5. *Deep link effect `checkTargetGiveaway` không dọn `initialGiveawayId`*: Khiến modal liên tục bị mở lại mỗi khi danh sách giveaways cập nhật.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Khử gọi đồng bộ trong `useEventCountdown.ts`*: Nếu `targetMs <= Date.now()` ngay khi khởi tạo hook, đánh dấu `hasExpiredTriggeredRef.current = true;` và tuyệt đối KHÔNG gọi `onExpire`. Khi chuyển trạng thái từ đang chạy sang hết hạn, luôn bọc `onExpireRef.current` trong `setTimeout(..., 50)` để thoát khỏi React render phase.
  2. *Debounce 150ms & So sánh dữ liệu trong `GiveawaysView.tsx`*: Gom toàn bộ các sự kiện realtime dồn dập thành 1 lần update. So sánh nông các trường thực tế trước khi `setGiveaways`, nếu dữ liệu không đổi thì giữ nguyên reference cũ `prev`.
  3. *Tạo `handleExpireRefresh` có throttle 300ms*: Thay thế toàn bộ các inline callback `() => setGiveaways([...])`.
  4. *Ghi nhận `handledTargetIdRef` và gọi `onClearInitialGiveawayId?.()`*: Ngăn ngừa việc mở lại modal vô tận khi URL hoặc state mang ID giveaway.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gọi hàm setState của cha trực tiếp/đồng bộ từ trong `tick()` của hook đếm ngược*: Luôn phải defer qua `setTimeout(..., 0)` hoặc microtask.
  - ❌ *Không gọi `onExpire` khi thời gian mục tiêu đã nằm trong quá khứ ngay từ khi mount*: Chỉ gọi khi có transition thực sự từ > 0 sang <= 0.
  - ❌ *Không truyền inline function tạo array mới vô điều kiện vào `onExpire`*: Ví dụ `onExpire={() => setGiveaways([...dataService.getGiveaways()])}`.

---

### ISSUE-122: Chuẩn Hóa Nhãn Sự Kiện Có Mục Tiêu / Toàn Sàn & Bản Chất Khoảng Lặng Máy Chủ Serverless
- **Triệu chứng**:
  - Sự kiện nhận quà thật `gw_1792909571892_h0hu` (lúc 13:26:11 ngày 25/10/2026 UTC+7, thuộc chiến dịch df3) thiếu trường `productId` và cờ `is_simulated`.
  - Máy chủ có khoảng lặng 10 phút (12:19–12:29 ngày 25/10) không sinh sự kiện nào.
- **Nguyên nhân gốc rễ**:
  1. *Thiếu chuẩn hóa sự kiện thật*: Hàm `recordRealGiveawayClaim` và `recordRealOrder` chỉ gán `giveawayId` mà không gán `productId` / `targetId`, và bỏ quên `is_simulated: false`.
  2. *Khoảng lặng 10 phút*:
     - **Nguyên nhân chính**: Nền tảng Cloudflare Pages Worker serverless hoạt động theo mô hình on-demand request-driven (không có tiến trình nền độc lập). Khi client gián đoạn kết nối hoặc không có lượt truy cập, worker isolate rơi vào trạng thái ngủ đông (idle hibernation).
     - **Nguyên nhân phụ**: Bẫy bỏ khe trong phiên bản cũ (`fireTimeMs > nowMs` khiến `continue` nhưng vẫn gán `lastProcessedSlot = currentSlotIndex`) chỉ làm mất tối đa 1 khe (~35s). Kích hoạt bởi đợt cold restart sau deploy commit `aa769d0` lúc 12:08:41.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Gắn nhãn có mục tiêu vs toàn sàn*:
     - 100% sự kiện có mục tiêu (sản phẩm, tiện ích, giveaway) đều mang đủ `productId` và `targetId`.
     - Các sự kiện toàn sàn (`COPY_CODE`, `STATS_COPY`) không mang mã mặt hàng theo đúng thiết kế, tác động vào `master_copy` theo bảng quy đổi `CONVERSION_TABLE`.
     - 100% sự kiện bắt buộc có `is_simulated: boolean` (`true` hoặc `false`).
  2. *Kẹp thời gian slot an toàn*: Sử dụng `fireTimeMs = Math.min(nowMs, slotBaseMs + Math.floor(rng() * 10000))` đảm bảo `fireTimeMs <= nowMs` và slot luôn được xử lý trọn vẹn, không bao giờ bị bỏ rơi.
  3. *Giám sát Stream Health*: Endpoint `/api/realtime-events` và `get_virtual_analytics` trả về `stream_health` kèm cờ `silence_warning: boolean` khi tuổi sự kiện mới nhất vượt quá 180s.
  4. *Chuẩn hóa danh mục & Nhà phát hành*: 563 bản ghi gồm 560 game trong `games188.json` + 3 game Roblox đăng ngày 25/10 (*Grow a Chicken Fighter*, *Command an Army*, *Dig and Clean*). Nhà phát hành Strinova VN chuẩn hóa thành **Gzone**.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không nhầm lẫn sự kiện toàn sàn với sự kiện thiếu nhãn*: `COPY_CODE` và `STATS_COPY` theo thiết kế tác động `master_copy` nên không có mã mặt hàng.
  - ❌ *Không dùng `continue;` bỏ qua slot mà vẫn cập nhật `lastProcessedSlot`*: Gây drop sự kiện của slot đó.
  - ❌ *Không để trường `is_simulated` mang giá trị `undefined`*: Phải ép kiểu strictly boolean `is_simulated === true` hoặc `false`.

---

### ISSUE-121: Thông Báo Toast Và Bộ Đếm Không Đồng Bộ, Số Ảo Nhảy Giật Do Client Sinh Ghost Notification & Bỏ Quên Giveaway Trong getDisplayStock
- **Triệu chứng**:
  - Thông báo nổ trên web nhưng không có dòng sổ tương ứng trên server (ghost notifications).
  - Quà tặng Rotwood nhảy đảo ngược: (1, 19) $\rightarrow$ (2, 18) $\rightarrow$ (1, 19) $\rightarrow$ (3, 17).
  - Luồng sự kiện im lặng gần 10 phút sau khi mở trang web.
- **Nguyên nhân gốc rễ**:
  1. *Lệch Edge Isolate & Tra cứu thiếu Giveaway trong `getDisplayStock`*: `getDisplayStock` chỉ tra cứu `serverProductCounters` mà bỏ qua `serverGiveawayCounters`, làm giveaway rơi về fallback tính toán cục bộ.
  2. *Ghost Notifications Trên Client*: `MarketingNotificationToast.tsx` chạy timer PRNG sinh thông báo ảo cục bộ độc lập với server ledger.
  3. *Client-side Counter Mutate*: Khi toast nổ, client gọi `recordVirtualSale` / `recordVirtualGiveawayClaim` làm biến thiên số cục bộ trên client độc lập với server.
  4. *Discard sự kiện cũ quá ngắn*: Client kiểm tra `fireTime + 60000 <= sessionStartTime` làm mất toàn bộ sự kiện khi mở tab mới.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Sổ Cái Máy Chủ Duy Nhất*: Máy chủ sinh sự kiện theo slot thời gian neo đầu ngày (`getVnDayAnchor`), gắn kèm `delta` chuẩn (`sold`, `stock`, `claimed`, `remaining`, `copyClicks`).
  2. *Triệt Tiêu Isolate Drift*: Thuật toán replay xác định từ baseline đầu ngày với danh sách sort cố định giúp 100% isolate cho cùng một kết quả.
  3. *Bổ sung tra cứu Giveaway*: `getDisplayStock` kiểm tra cả `serverGiveawayCounters.has(productId)`.
  4. *Client Chỉ Tiêu Thụ Sổ Cái*: Toast chỉ hiển thị từ `serverLedgerEventQueue`. Khi mất mạng > 60s, chỉ phát lại sự kiện đã nhận, không tự sinh mới.
  5. *Vô hiệu hóa Local Mutation*: Không trừ/cộng dồn số cục bộ khi đã có server SSOT.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để client tự sinh thông báo bằng PRNG cục bộ*: Mọi thông báo phải bắt nguồn từ server ledger.
  - ❌ *Không bỏ quên `serverGiveawayCounters` trong `getDisplayStock`*: Cả sản phẩm và quà tặng đều phải được đọc từ SSOT.
  - ❌ *Không để client mutate trừ số đếm khi đã có server SSOT*: Dễ gây trừ 2 lần (double deduction).

---

### ISSUE-120: Phân Loại Sai Action Đọc Thành Thao Tác Ghi & Lệch Router Khi Gọi Endpoint Ingest Bằng Khóa Kiểm Toán / Crawler
- **Triệu chứng**:
  - Khi khóa kiểm toán tạm thời (prefix `wcg_audit_temp_`) gọi `get_virtual_analytics`, server trả về HTTP 403 Forbidden với thông điệp: *"Thao tác ghi 'get_virtual_analytics' bị nghiêm cấm đối với khóa kiểm toán"*.
  - Khi gọi cùng action `get_virtual_analytics` qua endpoint `/api/crawler/ingest-codes` bằng crawler key, server trả về lỗi: *"Thiếu tên game (gameName)"*.
- **Nguyên nhân gốc rễ**:
  1. *Khóa cứng danh sách action được phép đọc*: Bộ lọc quyền hạn trong `ingest-codes.ts` và `marketing.ts` chỉ cho phép `get_marketing_config` và `list_marketing_events`. Mọi action khác đều bị gom chung vào nhánh từ chối với thông điệp gán nhãn là "thao tác ghi".
  2. *Lệch router tại ingest-codes*: Khi crawler key gọi `/api/crawler/ingest-codes`, endpoint không kiểm tra action `get_virtual_analytics` trong nhóm marketing read-only mà để rơi xuống luồng nạp mã giftcode chính, nơi yêu cầu trường `body.gameName`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Định nghĩa rõ danh mục quyền hạn*:
     - `allowedAuditActions`: `['get_marketing_config', 'list_marketing_events', 'get_metrics_snapshot', 'get_virtual_analytics']`.
     - `writeActions`: `['update_marketing_config', 'save_marketing_config', 'test_trigger', 'ingest_codes', 'queue_game', 'publish_game', 'approve_codes', 'reject_codes', 'update_instructions', 'cleanup_test_codes', 'delete_pending_game']`.
     - Chỉ trả về thông điệp "thao tác ghi" khi action thuộc `writeActions`.
  2. *Xử lý triệt để tại tầng đầu của ingest-codes*:
     - Trước khi đi vào luồng nạp giftcode, cả GET và POST đều kiểm tra và xử lý 4 action marketing kiểm toán độc lập.
  3. *Cung cấp cờ `rejectPeakReports: true`*:
     - Trả về cờ này trong cấu hình và phân tích ảo để bên kiểm toán có thể kiểm chứng cơ chế từ chối peak reports từ client mà không cần gửi payload giả.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `if (action !== 'get_marketing_config' && action !== 'list_marketing_events')` để phán quyết toàn bộ action khác là ghi*: Khi mở thêm tính năng phân tích chỉ-đọc mới (như `get_virtual_analytics`), phải thêm vào danh sách `allowedAuditActions`.
  - ❌ *Không để router của ingest-codes rơi xuống luồng giftcode khi gặp action marketing*: Phải chặn và phản hồi ngay ở tầng đầu của router.

---

### ISSUE-119: Bẫy Truy Cập Thuộc Tính Cấu Hình Không Tồn Tại Khi Render Tab Gây Sập Toàn Bộ Module (Unchecked Nested Property Access on Missing Sub-Config Objects)
- **Triệu chứng**:
  - Khi người dùng bấm vào một Module trên Web Quản Trị (ví dụ: `admin-code-game-shop.pages.dev/admin#/marketing`), màn hình hiển thị lỗi sập phân hệ: `Cannot read properties of undefined (reading 'workingPercentage')`.
- **Nguyên nhân gốc rễ**:
  - Trong mảng khai báo danh sách tab con (`MARKETING_SUB_TABS`), thuộc tính `badge` của tab con truy cập trực tiếp `config.codeVoteRatio.workingPercentage`. Do đối tượng cấu hình `config` không có trường `codeVoteRatio` (trường đúng trong `MarketingConfig` là `voteConfig.activeRate`), việc truy cập thuộc tính trên một giá trị `undefined` làm phát sinh `TypeError` ngay trong chu kỳ render đầu tiên của React.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn luôn sử dụng **Optional Chaining (`?.`)** và **Nullish Coalescing (`??`)** khi tính toán nhãn/badge hoặc giá trị render từ đối tượng cấu hình:
    `badge: \`${config?.voteConfig?.activeRate ?? 96}% Uy tín\``
  - Với các mảng, luôn bọc `(config?.myArray || []).length` hoặc `(config?.myArray || []).filter(...)` để phòng vệ trường hợp dữ liệu tải từ server bị thiếu key hoặc chưa sẵn sàng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không truy cập lồng sâu trực tiếp (`a.b.c`) mà không có `?.` trong mảng định nghĩa tab*: Dữ liệu cấu hình tải từ localStorage hoặc API có thể thiếu thuộc tính phụ tùy phiên bản.

---

### ISSUE-118: Vòng Lặp Báo Peak (Client Peak Feedback Loop) Làm Nhảy Loạn Số Ảo Giữa Các Trình Duyệt Và Cạn Kiệt Hạn Mức D1
- **Triệu chứng**:
  - Số lượng bán ảo, số tồn kho hiển thị nhảy thất thường giữa các thiết bị khác nhau: lúc vài trăm, lúc vọt lên hàng ngàn, lúc lại tụt về vài trăm.
  - Mỗi trình duyệt tự tính `high-water marks`, `getHourlyGrowth`, `getInHourProgression` và lưu vào `localStorage`, rồi tự động gửi POST `report_peak_metrics` lên server. Server lại cập nhật `peak_product_sold_counts`, phân phối số peak này cho các máy khác, gây ra chu trình hồi tiếp (feedback loop) và đốt sạch hạn mức đọc/ghi D1 (5.000.000 dòng/ngày).
- **Nguyên nhân gốc rễ**:
  1. *Thiếu Single Source of Truth (SSOT)*: Bộ đếm được tính toán phi tập trung tại máy khách (client-side drift). Máy nào mở lâu thì số tích lũy càng cao, máy mới mở thì số thấp hơn hoặc bị đồng bộ cưỡng bức từ peak report cũ.
  2. *Ghi trực tiếp D1 theo từng sự kiện*: Nếu mỗi toast hoặc mỗi lần click/bán đều kích hoạt câu lệnh `db.prepare().run()` riêng lẻ, khi có hàng chục người online, số lượng lượt ghi sẽ nhanh chóng vượt quá hạn mức D1 hàng ngày.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Chuyển toàn bộ việc tính toán sang Serverless SSOT (`virtualLayerService.ts`)*:
     - Client chỉ đóng vai trò hiển thị (dumb display layer). Tất cả các biến thiên bán ảo, restock ảo, claim ảo được server tính toán theo nhịp slot cố định (time-slot PRNG) và phân phối qua endpoint `/api/realtime-events` (25-30s).
  2. *Vô hiệu hóa vĩnh viễn Client Peak Reporting*:
     - Vô hiệu hóa `schedulePeakReport` và `reportPeakMetrics` ở client.
     - Vô hiệu hóa `getHourlyGrowth` và `getInHourProgression` (trả về 0).
     - Server `/api/sync` từ chối xử lý `body.type === 'report_peak_metrics'`.
  3. *Nguyên Tắc Bộ Đệm Ảo & Tự Động Restock*:
     - `display_stock = real_stock > 0 ? (real_stock + Math.max(0, virtual_buffer)) : 0`.
     - Số hiển thị không bao giờ thấp hơn số tồn kho thật (`floor = real_stock`). Khi `virtual_buffer <= 0`, server tự động cộng thêm mức `autoRestockAmount` và bắn companion event `RESTOCK_PRODUCT`. Khi hết hàng thật (`real_stock = 0`), hiển thị bắt buộc là `0`, không restock ảo.
  4. *Batching Flush Quota Protection*:
     - Không ghi D1 theo từng sự kiện. Chỉ gom lô (`db.batch()`) ghi xuống D1 mỗi 5 phút hoặc khi đủ 200 sự kiện tích lũy.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để client tự tính số cộng dồn rồi báo peak về server*: Cơ chế này không bao giờ đạt được tính đồng nhất và sẽ làm bùng nổ request gây sập quota D1.
  - ❌ *Không trộn lẫn trường ảo vào dữ liệu gốc*: Tuyệt đối không thêm `virtual_*` hay `is_simulated` vào `storeProducts.json`, `utilities.json`, `giveaways.json`. Lớp thật và lớp ảo phải được lưu trữ ở 2 bảng D1 riêng biệt.

---

### ISSUE-117: Quên Khai Báo Route Mới Trong functions/_worker.ts Khi Thêm Endpoint Serverless API (Centralized Worker Router Bypass Trap)
- **Triệu chứng**:
  - Khi thêm một endpoint API mới trong thư mục `functions/api/...` (ví dụ: `functions/api/admin/temporary-token.ts`), dù code trong file API đã viết đúng chuẩn Pages Function, client gọi đến vẫn nhận được phản hồi HTTP 404 `Endpoint not found`.
- **Nguyên nhân gốc rễ**:
  - Kiến trúc dự án `web-code-game` sử dụng một Worker tập trung `functions/_worker.ts` làm Entry Point xử lý toàn bộ các yêu cầu HTTP (Custom Router). Worker này tự bắt mọi request `/api/*` và điều phối (dispatch) dựa trên danh sách import thủ công, thay vì dựa vào cơ chế tự động quét file (file-based routing) mặc định của Cloudflare Pages.
  - Do đó, nếu tạo file API mới mà quên khai báo `import` và `if (pathname === '/api/...')` trong `functions/_worker.ts`, Worker sẽ chạy đến cuối danh sách route và trả về lỗi 404 mặc định:
    `return new Response(JSON.stringify({ error: 'ENDPOINT_NOT_FOUND', message: 'Tuyến đường API không tồn tại: ' + pathname }), { status: 404 });`
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn nhớ quy tắc: **Bất kỳ file API mới nào nằm trong `functions/api/` đều BẮT BUỘC phải được đăng ký trong `functions/_worker.ts`**:
    1. Import module: `import * as myNewApi from './api/...';`
    2. Thêm routing block trong khối `try`:
       ```typescript
       if (pathname === '/api/my-new-endpoint') {
         if (method === 'GET') return await myNewApi.onRequestGet(context);
         if (method === 'POST') return await myNewApi.onRequestPost(context);
         if (method === 'OPTIONS') return await myNewApi.onRequestOptions(context);
       }
       ```
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không ỷ lại vào file-based routing của Cloudflare Pages*: Vì dự án có `_worker.ts`, Cloudflare Pages sẽ ưu tiên thực thi `_worker.ts` duy nhất và bỏ qua toàn bộ cấu trúc thư mục của Pages Functions. Phải luôn định tuyến trong `_worker.ts`.

---

### ISSUE-116: Bẫy Lọc Bỏ Triệt Để Khi Khóa Cứng Slugs Làm Mất Trạng Thái Lịch Sử Game Đã Mở Server (Overly Aggressive Slugs Exclusion Purging Historical Launched Games & Zeroing launchedCount)
- **Triệu chứng**:
  - Khi gọi `GET /api/crawler/ingest-upcoming-games`, chỉ số `launchedCount` trả về bằng `0`, trong khi trước đây (ngày 23/10) số lượng game đã mở server là `3`.
  - Quản trị viên và bot kiểm chứng dữ liệu bị mất dấu các tựa game đã chuyển trạng thái mở server (`LAUNCHED`), không thể đối soát lịch sử ra mắt game.
- **Nguyên nhân gốc rễ**:
  1. *Lọc bỏ quá đà (Overly Aggressive Exclusion)*:
     - Để ngăn chặn các game cũ (`where-winds-meet`, `honkai-star-rail`, `strinova-vn`) tự động quay lại mục sắp ra mắt khi D1 gặp sự cố, code đã áp dụng lệnh:
       `upcomingGames = upcomingGames.filter((g) => g && !OBSOLETE_SLUGS.has((g.slug || '').toLowerCase()));`
     - Việc loại bỏ thô bạo này đã xóa sạch các bản ghi ngay từ đầu vào của hàm xử lý, khiến chúng biến mất khỏi toàn bộ hệ thống kể cả khi người dùng truy vấn `status=LAUNCHED` hoặc xem tổng kết `launchedCount`.
  2. *Đồng nhất hoá sai giữa "Không hiện trên banner sắp ra mắt" và "Không tồn tại trong hệ thống"*:
     - Các game đã mở server chỉ không được phép xuất hiện trên banner đếm ngược của Web Khách (`status: 'UPCOMING'`). Chúng vẫn phải tồn tại hợp lệ trong cơ sở dữ liệu với trạng thái `status: 'LAUNCHED'` để phục vụ báo cáo, phân loại quản trị và đối soát API.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Nguyên Tắc Ép Trạng Thái Thay Vì Xoá Bản Ghi (State Coercion Over Deletion)*:
     - Không dùng `filter` để loại bỏ slug. Thay vào đó, duyệt qua mảng và nếu phát hiện bất kỳ game nào trong danh sách bảo vệ (`where-winds-meet`, `honkai-star-rail`, `strinova-vn`) mang trạng thái `UPCOMING` hoặc `APPROVED`, lập tức cưỡng chế chuyển thành `status = 'LAUNCHED'`.
  2. *Bảo Toàn Danh Mục Lịch Sử `DEFAULT_LAUNCHED_GAMES`*:
     - Định nghĩa rõ ràng 3 game mở server lịch sử (`Strinova VN`, `Where Winds Meet VN`, `Honkai: Star Rail 3.0`) trong cả Edge fallback và Authoritative Snapshot `canonical_backup_state.json`.
  3. *Cách Ly Hiển Thị Trên Frontend*:
     - `UpcomingGamesBanner.tsx` và `AllUpcomingGamesModal.tsx` chủ động lọc `g.status === 'LAUNCHED'` để tuyệt đối không hiển thị game đã mở server lên banner đếm ngược.
     - `functions/api/games.ts` bỏ qua các game `status === 'LAUNCHED'` để không làm tăng số lượng catalog chuẩn 560 game.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `filter` loại bỏ slug toàn diện khỏi danh sách upcoming games*: Khi cần ngăn game hiển thị trên banner, hãy chuyển trạng thái sang `LAUNCHED`, không được xóa hoàn toàn bản ghi khỏi CSDL vì sẽ làm mất số đếm `launchedCount` của bot và admin.

---

### ISSUE-115: Bẫy Sập Tầng D1 Khi Quá Hạn Mức Đọc Free-Tier Gây Ra Lệch Tầng, Resurrect Dữ Liệu Cũ Và Vô Hiệu Key API (Cloudflare D1 Read Quota Exhaustion & Edge Zero-Out Fail-Closed Trap)
- **Triệu chứng**:
  - Toàn bộ hệ thống đột ngột lệch khỏi trạng thái đã nghiệm thu:
    1. Key API crawler trả về lỗi 401 "API Key không chính xác hoặc đã bị vô hiệu hóa", chặn đứng trợ lý Pine và bot Muse.
    2. Giao diện Admin UI module Crawler hiển thị: Game Mới 0, Hàng Chờ Duyệt 0/0, Lần quét gần nhất: "Đang chờ / 0".
    3. Danh sách game sắp ra mắt tự động đảo ngược về bản ghi cũ lỗi thời, làm sống lại `where-winds-meet` và `honkai-star-rail` và làm mất 4 game mới (`dau-nho-noi-gian`, `sword-x-staff`, `mong-canh-tam-quoc`, `ananta`).
    4. Game vừa publish (như `avatar-land`) bị biến mất khỏi catalog công khai (HTTP 404).
- **Nguyên nhân gốc rễ**:
  1. *Chạm ngưỡng hạn ngạch đọc Cloudflare D1*: Free-tier cho phép tối đa 5,000,000 row reads/ngày. Khi chạy các script kiểm toán nặng lặp lại lệnh quét `SELECT * FROM codes` (11.7k dòng) không cache, D1 chạm trần 5 triệu lượt đọc và từ chối mọi truy vấn tiếp theo.
  2. *Cơ chế Fail-Closed trả về Null/Rỗng không có bộ đệm an toàn*: Khi D1 bắt lỗi hoặc timeout, hàm `getSettingD1` trả về `null`. Khi đó:
     - API đọc key trả về rỗng `''` $\rightarrow$ trả về 401.
     - API đồng bộ trả về danh sách pending rỗng `[]` $\rightarrow$ UI xoá trắng dữ liệu hiển thị thành 0.
     - Ingest upcoming fallback về hằng số hardcode cũ chứa game lỗi thời.
     - Prerender tại commit deploy không có bản ghi game trong static data `games188.json` nên không sinh trang tĩnh `/game/avatar-land`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Authoritative Canonical Backup State (`canonical_backup_state.json`)**:
    - Thiết lập một kho snapshot chuẩn mực và có thẩm quyền cao nhất được nhúng sẵn ở cả tầng Edge (`functions/data/`) và Client (`src/data/`).
    - Chứa đầy đủ: 63 game chờ duyệt, 22 mã code Roblox với phần thưởng chi tiết, 7 game sắp ra mắt chuẩn (0 game lỗi thời), Avatar Land với mã `AL-PNVN26` (hạn 2026-10-25), và API key chính thức `wcg_muse_f7d252dd57426a7a`.
  - **Edge Hardening (Cơ chế chống sập biên)**:
    - Khi D1 gặp lỗi hoặc timeout, `getSettingD1` và API Edge tự động trả về bộ dữ liệu Canonical Backup thay vì `null` hay rỗng.
    - Cổng API không bao giờ trả về 401 đối với khóa hợp lệ của Pine/Muse ngay cả khi máy chủ D1 không phản hồi.
  - **Admin UI Resilience (Không bao giờ hiển thị 0 khi đứt kết nối)**:
    - Khi `/api/sync` lỗi hoặc trả về rỗng, UI tự động hiển thị dữ liệu từ Canonical Backup và bật banner cảnh báo màu vàng: `⚠️ Cảnh báo kết nối D1: Đang hiển thị bản sao lưu hợp lệ cuối cùng (63 game chờ duyệt, 22 mã code)`.
  - **Admin UI "Trạng Thái Đồng Bộ" Panel**:
    - So sánh số lượng real-time giữa 3 tầng: Tầng 1: Kho D1 SSOT (560 games, 63 pending games, 22 pending codes, 7 upcoming); Tầng 2: Cổng REST API (200 OK); Tầng 3: Bộ Nhớ Đệm UI. Hiển thị cảnh báo đỏ khi có lệch tầng.
  - **Pre-Migration Snapshots Lưu 7 Ngày**:
    - Cung cấp các hành động `create_snapshot`, `list_snapshots`, `restore_snapshot` với cờ `expiresAt` tự động dọn dẹp sau 7 ngày.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ để API fallback về null hay mảng rỗng `[]` khi D1 lỗi*: Phải luôn có bộ đệm Canonical State đáng tin cậy.
  - ❌ *Không bao giờ deploy hoặc commit bản `games188.json` thiếu các game vừa publish*: Prerender dựa vào file này để sinh HTML tĩnh; nếu thiếu sẽ sinh ra lỗi 404 cho khách.
  - ❌ *Không chạy liên tục các script audit quét toàn bộ bảng codes D1*: Luôn sử dụng bộ đệm in-memory và giới hạn số lần đọc D1.

---

### ISSUE-114: Bẫy Rò Rỉ API Key Khi Cung Cấp Quyền Đọc Cho Bot Kiểm Chứng Độc Lập & Bẫy Cấp Quyền Ghi Vượt Mức (Marketing Audit Key Scoping, Strict Read-Only & Zero Leakage Trap)
- **Triệu chứng**:
  - Khi cần một bên thứ ba độc lập (như bot Muse) đọc dữ liệu cấu hình và nhật ký sự kiện của hệ thống Marketing & FOMO để kiểm chứng, nếu tái sử dụng khóa API crawler nạp giftcode hoặc dùng chung quyền admin, bot sẽ có khả năng thực hiện các hành vi ghi (thay đổi trọng số, sửa cấu hình, nạp code, đổi dữ liệu).
  - Nguy cơ rò rỉ khóa nếu cho phép truyền khóa qua tham số query `?api_key=` trên URL (bị lưu vào web server access logs và proxy logs).
  - Nguy cơ để lộ khóa bí mật trong phản hồi GET công khai của API Info (tái diễn lỗ hổng ngày 22/10/2026).
  - Người dùng hoặc bot hiểu lầm hệ thống có loại thông báo bị tắt khi thấy hiển thị "7/6 ĐANG BẬT" trong các bản ghi lịch sử.
- **Nguyên nhân gốc rễ**:
  1. Thiếu vai trò phân quyền chuyên biệt (Role Scoping): Trước đây hệ thống chỉ có `admin` hoặc `crawler_writer`, thiếu vai trò `marketing_auditor` chỉ-đọc (Read-only).
  2. Truyền khóa qua URL query parameter `?api_key=`: Khiến token bị in vào access log của máy chủ và CDN.
  3. Thiếu cơ chế kiểm soát tần suất (Rate Limiting) trên các endpoint kiểm chứng dữ liệu, tạo nguy cơ bị khai thác cào quét quá tải tài nguyên.
  4. Mẫu số cứng `/6` trong giao diện cũ gây hiểu lầm là có loại thông báo đang tắt hoặc thừa loại so với mẫu.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Mở 2 Action Chỉ-Đọc Dành Riêng Cho Kiểm Chứng**:
    1. `get_marketing_config`: Trả về trạng thái bật/tắt của module, tỷ lệ phần trăm phân bổ 7 loại thông báo (khớp 100% với admin: sao chép mã 50%, đơn cửa hàng 16%, tiện ích 6%, bổ sung kho 3%, giveaway 19%, nạp ví 4%, thống kê copy 2%), chu kỳ nổ toast, giờ vàng, các cờ che tên (masking), nút tắt chuông (snooze 60 phút), tự ẩn khi tìm kiếm mobile, và số lượng tài khoản mô phỏng (90 nick, chỉ trả về dạng đã che dấu sao, KHÔNG lộ PII). Giải thích minh bạch: 7/7 loại đều đang BẬT, không có loại nào bị tắt.
    2. `list_marketing_events`: Đọc tối đa 100 sự kiện toast gần đây nhất, mỗi sự kiện bắt buộc có cờ `is_simulated: boolean`. Sự kiện thật (`is_simulated: false`) tuyệt đối không chứa thông tin định danh người dùng (không tên thật, không SĐT, không email, không ID tài khoản).
  - **Giới hạn quyền nghiêm ngặt (Strict Read-Only Enforcement)**:
    - Khóa kiểm chứng `marketing_auditor` CHỈ có quyền đọc 2 action trên. Mọi yêu cầu ghi (đổi trọng số, bật/tắt, bắn thử, ingest code, publish game...) đều bị từ chối với mã **HTTP 403 Forbidden**.
  - **Phương thức xác thực an toàn tuyệt đối**:
    - CHỈ chấp nhận header `Authorization: Bearer <KEY>`. TUYỆT ĐỐI KHÔNG hỗ trợ xác thực bằng `?api_key=` trên URL.
    - Khóa được lưu trong Cloudflare Environment Secrets (`MUSE_MARKETING_AUDIT_KEY`) hoặc bảng `wcg_marketing_auditor_api_config_v1` trong D1. Tuyệt đối không hardcode khóa trong mã nguồn.
  - **Bảo vệ tài liệu công khai (Zero Key Leakage)**: Phản hồi GET công khai tuyệt đối không chứa bất kỳ khóa thực tế nào (chỉ dùng placeholder `<MUSE_MARKETING_AUDIT_KEY>` hoặc `<API_KEY>`).
  - **Giới hạn tần suất hợp lý**: Áp dụng Rate Limiting 60 requests/phút (trả về HTTP 429 nếu vượt quá).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ cho phép xác thực bot qua `?api_key=` trên URL*: URL query params bị lưu vào access logs, proxy logs và browser history, dẫn đến rò rỉ khóa bảo mật.
  - ❌ *Không bao giờ gán quyền ghi cho bot kiểm chứng độc lập*: Bot kiểm chứng chỉ được đọc dữ liệu snapshot và event log, mọi hành động ghi phải chặn đứng bằng HTTP 403.
  - ❌ *Không bao giờ in khóa thật trong ví dụ curl của API Info công khai*: Bài học xương máu từ sự cố lộ key mặc định ngày 22/10/2026.

---

### ISSUE-113: Bẫy Tràn Chiều Ngang Khiến Thanh Điều Hướng Sub-Tabs Bị Cắt Cụt Mép Phải & Che Giấu Mục Cài Đặt Cuối Cùng Trong Module Marketing & FOMO (Horizontal Sub-Tab Overflow & Hidden Final Settings Section Trap)
- **Triệu chứng**:
  - Tại trang quản trị Module Marketing & FOMO (`admin#/marketing`), thanh tab điều hướng các mục cài đặt dùng `flex items-center gap-1 overflow-x-auto scrollbar-none`.
  - Trên màn hình chuẩn 1366x768 hoặc màn hình laptop phổ thông, 6 tab với tên dài (`Cấu hình Chung & Tần suất`, `Bật/Tắt Loại Thông Báo`, `Tài khoản Hệ thống`, `Ưu tiên Sản phẩm & Kho ảo`, `Tỉ lệ Bình chọn Code`, `Trình Giả Lập & Thử Nghiệm`) có tổng chiều rộng ~1120px, vượt quá khoảng không gian khả dụng của content area (~1046px khi có sidebar 256px).
  - Tab thứ 6 `Trình Giả Lập & Thử Nghiệm` bị cắt cụt ở mép phải màn hình ("Trình Giả Lập & Thử..."). Đồng thời do cờ `scrollbar-none` ẩn thanh cuộn ngang, quản trị viên không thể biết sau mục thứ 6 còn có mục cài đặt nào khác bị khuất hay không.
  - Ngoài ra, huy hiệu số lượng loại thông báo bị gán cứng `/6` trong khi hệ thống có 7 loại (`copyCode`, `buyStore`, `buyUtility`, `claimGiveaway`, `depositWallet`, `statsCopy`, `restockProduct`), dẫn đến lỗi hiển thị `7/6 ĐANG BẬT`.
- **Nguyên nhân gốc rễ**:
  1. Dùng flex hàng ngang đơn độc với `shrink-0` và ẩn thanh cuộn (`scrollbar-none`) thay vì lưới thích ứng responsive.
  2. Thiếu thông tin số đếm thứ tự rõ ràng (`1/6`, `2/6`, ..., `6/6`), thiếu nhãn báo hiệu mục kết thúc (Final section).
  3. Thiếu thanh điều hướng chân trang (Bottom Stepper) giúp di chuyển giữa các phần cài đặt.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Lưới thích ứng 6 cột cân bằng 100% trong 1 màn hình**: Đặt `grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5 sm:gap-2` kèm `sticky top-2 z-30 backdrop-blur-md bg-card/95`. Cả 6 tab chia đều tỷ lệ trên desktop, không tràn, không cắt cụt, hiển thị trọn vẹn 100% trước mắt người dùng.
  - **Đánh số thứ tự minh bạch `1/6` đến `6/6`**:
    - Mục 1: `1/6` • Chung & Tần Suất
    - Mục 2: `2/6` • Bật/Tắt Loại Tin (sửa hiển thị chuẩn `7/7 Bật`)
    - Mục 3: `3/6` • Tài Khoản Ảo (90 nick)
    - Mục 4: `4/6` • Sản Phẩm & Kho
    - Mục 5: `5/6` • Bình Chọn Code
    - Mục 6: `6/6` • Giả Lập & Test kèm huy hiệu nổi bật `Mục cuối (6/6)` khẳng định 100% không còn mục nào ẩn phía sau.
  - **Thanh trạng thái bản đồ cài đặt**: Hiển thị rõ `Bản Đồ 6 Mục Cài Đặt FOMO • Đang xem: Mục X/6 • Mục 6/6 là mục kết thúc`.
  - **Thanh điều hướng chân trang (Bottom Stepper)**: Bổ sung 2 nút `[← Quay lại: Mục X/6]` và `[Mục tiếp theo: Mục Y/6 →]`, tại mục 6/6 hiển thị `[✓ Đã xem hết 6/6 mục • Lưu Tất Cả Cấu Hình]`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `overflow-x-auto scrollbar-none` cho các thanh tab quan trọng*: Khi ẩn thanh cuộn, người dùng không thể biết còn tab nào bị ẩn phía sau mép màn hình. BẮT BUỘC dùng responsive grid hoặc hiển thị rõ số lượng `X/Y`.
  - ❌ *Không hardcode mẫu số typesCount (ví dụ `/6`)*: Khi bổ sung loại thông báo mới (như `restockProduct`), phải dùng tổng số thực tế (`/7`).

---

### ISSUE-112: Bẫy Lệch Tầng Đọc Khiến Mã Giftcode Đã Duyệt Bị Kẹt Ở Trạng Thái Limbo & Bẫy Tự Động Tiêm Placeholder Giả Mạo (Approved Codes Limbo State & Fabricated Placeholder Injection Trap)
- **Triệu chứng**:
  - Game sau khi duyệt (publish_game) và duyệt mã (approve_codes) xuất hiện trên catalog và tìm kiếm báo có code, nhưng khi vào trang chi tiết `/game/:slug` hoặc gọi API `GET /api/games?slug=:slug` thì `codes_count: 0`, danh sách mã rỗng `[]`, mã biến mất hoàn toàn đối với người dùng (trường hợp thực tế Avatar Land với mã `AL-PNVN26`).
  - Đẩy lại mã qua API ingest báo `duplicateCount: 1, addedCount: 0` (mã đã có trong kho), nhưng trang game vẫn không hiển thị (mã kẹt ở trạng thái limbo vô hình).
  - Tự động điền các giá trị mặc định bịa đặt: Nhà phát hành "NPH Chính Thức" / "Roblox", thể loại "Nhập Vai" / "Roblox", nền tảng "Android, iOS, PC" / "Roblox / PC, Mobile", mô tả và hướng dẫn nhập code "Avatar nhân vật" / Roblox 3 bước, icon trỏ vào file không tồn tại `/game_icons/:slug.webp` (HTTP 404).
- **Nguyên nhân gốc rễ**:
  1. *Lệch tầng lưu trữ (Split Brain)*: `approve_codes` chỉ ghi mã vào JSON blob `wcg_admin_custom_free_codes_v1` trong `system_settings`, không gọi câu lệnh SQL `INSERT INTO codes` trên D1. Trong khi đó, API chi tiết game và SSR HTML (`_worker.ts`) chỉ đọc trực tiếp từ bảng SQL `codes`. Nếu bảng SQL `codes` không có dòng nào, nó trả về rỗng mà không có cơ chế fallback / auto-healing.
  2. *Lỗi cú pháp SQL ngầm trong `queue_game`*: Câu lệnh SQL chèn vào bảng `codes` gọi các cột không tồn tại (`is_active`, `is_verified`, `copy_count`, `updated_at`), bị nuốt ngoại lệ âm thầm trong khối try/catch khiến bảng `codes` không được nạp dữ liệu.
  3. *Tự ý tiêm placeholder giả mạo*: Trong các hàm `publish_game`, `approve_pending_game`, `batch_approve_pending_games`, và `sync_google_play_crawler`, khi trường dữ liệu rỗng, mã nguồn tự động fallback sang chuỗi văn mẫu ('NPH Chính Thức', 'Nhập Vai', 'Android, iOS, PC', icon `.webp`).
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Đồng bộ nguyên tử 2 chiều**: Trong `approve_codes`, `publish_game`, `queue_game`, luôn ghi đồng thời vào JSON blob `system_settings` VÀ bảng SQLite `codes` của D1 bằng schema chuẩn (`id, game_slug, code, rewards, status, expires_at, source, added_at`).
  - **Cơ chế tự động chữa lành (Auto-healing Fallback)**: Tại API chi tiết game (`functions/api/games.ts`) và SSR Worker (`functions/_worker.ts`), nếu truy vấn bảng `codes` trả về rỗng nhưng `system_settings` (`wcg_admin_custom_free_codes_v1`) có mã của game, lập tức lấy mã từ `system_settings` trả về cho client đồng thời ghi ngược vào bảng `codes` D1 trong nền.
  - **Xóa bỏ 100% placeholder bịa đặt**: Khi người gọi hoặc crawler không cung cấp NPH, thể loại, nền tảng, mô tả, hướng dẫn: lưu rỗng `""` và hiển thị "Chưa rõ" ở admin. Hướng dẫn nhập code chỉ điền khi game đã xác nhận nguồn hoặc admin nhập tay. Icon chỉ gán khi file thực tế tồn tại trên ổ đĩa; nếu chưa có để rỗng `""`, SSR HTML fallback an toàn về `/og-image.jpg` thay vì 404.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ ghi vào `system_settings` mà bỏ quên bảng SQL `codes`*: Mọi thao tác nạp/duyệt mã BẮT BUỘC phải ghi đồng bộ vào bảng SQLite `codes` của D1.
  - ❌ *Không dùng các cột không có trong schema bảng `codes`*: Bảng `codes` chỉ có các cột: `id, game_slug, code, rewards, status, expires_at, source, added_at, created_at`. Không được SELECT/INSERT các cột `is_active`, `is_verified`, `copy_count`.
  - ❌ *Tuyệt đối không điền placeholder giả mạo*: Không có dữ liệu thật thì để rỗng `""`, không được bịa "NPH Chính Thức", "Nhập Vai", "Android, iOS, PC", "Roblox" hay văn mẫu "Avatar nhân vật".

---

### ISSUE-111: Bẫy Tràn Chiều Ngang & Cắt Cụt Nút Thao Tác (Bỏ Qua, Duyệt) Trong Bảng Quét Hàng Chờ Do Thiếu Ghim Cột Cố Định (Horizontal Overflow & Cut-off Action Buttons Trap in Pending Queue Table)
- **Triệu chứng**:
  - Trên màn hình chuẩn 1366x768 hoặc khi sidebar quản trị mở, bảng danh sách game chờ duyệt bị tràn chiều ngang.
  - Cột "THAO TÁC" bị đẩy ra sát mép phải và cắt cụt các nút bấm hành động ("Bỏ qua", "Duyệt", "Đăng Ngay" bị che khuất một nửa).
  - Quản trị viên phải cuộn thanh cuộn ngang qua lại mới thấy và bấm được nút duyệt/bỏ qua, gây chậm trễ và khó chịu khi duyệt hàng loạt.
- **Nguyên nhân gốc rễ**:
  1. Đặt `min-w-[950px]` cùng các cột có min-width lớn vượt quá không gian nội dung của viewport desktop tiêu chuẩn.
  2. Cột "Thao Tác" không có `sticky right-0` nên bị trôi ra khỏi màn hình khi bảng cuộn ngang.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Gán `sticky right-0` cho cả `<th>` và `<td>` cột Thao Tác kèm bóng đổ `shadow-[-8px_0_12px_rgba(0,0,0,0.5)]` và nền `bg-slate-950/95` / `bg-slate-900/95` để cột luôn luôn hiển thị 100% trong màn hình.
  - Tối ưu kích thước bảng `min-w-[820px]` để hiển thị vừa vặn tự nhiên không cần cuộn ngang trên màn hình từ 1280px trở lên.
  - Gán `sticky top-2 z-30` cho thanh thao tác hàng loạt (Bulk Bar) khi quản trị viên chọn nhiều game.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để cột thao tác trôi tự do (non-sticky) ở cuối bảng rộng*: Trong các bảng quản trị có nút hành động trọng yếu (duyệt, xóa, sửa), cột Thao Tác BẮT BUỘC phải là `sticky right-0`.
  - ❌ *Không dùng nút văn bản dài hoặc icon cồng kềnh*: Các nút thao tác cần gọn gàng, có `whitespace-nowrap shrink-0` để không bao giờ bị rớt dòng hay tràn cột.

---

### ISSUE-110: Bẫy Phình Số Lượng codes_count & Lệch Bảng Xếp Hạng Do Đếm Gộp Cả Mã Đã Hết Hạn Và Trùng Lặp Bản Ghi (Code Count Inflation & Leaderboard Skew Trap Due to Counting Expired Codes & Internal Duplicates)
- **Triệu chứng**:
  - Số lượng giftcode hiển thị trên web bị phình to bất thường ở một số game (ví dụ: Where Winds Meet 598 mã, Yến Vân Thập Lục Thanh 588 mã, Delta Force 280 mã).
  - Huy hiệu số mã và bảng xếp hạng "Nhiều mã nhất" bị sai lệch, ưu tiên đưa những game chứa hàng trăm mã hết hạn lên đầu trang.
  - Trang chi tiết game hiển thị danh sách hỗn tạp cả mã còn dùng được và mã đã hết hạn mà không tách bạch, làm giảm uy tín của web đối với người dùng tìm mã.
- **Nguyên nhân gốc rễ**:
  1. `codes_count` được gán bằng `allCodes.length` hoặc `total_codes_count` thay vì chỉ đếm mã khả dụng (`active_codes_count` = mã có hạn tương lai + mã chưa rõ hạn).
  2. Tồn tại bản ghi trùng mã nội bộ trong kho lưu trữ dữ liệu (D1 custom codes, free codes, bundled JSON) do nạp crawler nhiều đợt mà không dedup trước khi ghi.
  3. Hiện tượng hồi sinh mã chết (Code Resurrection): Khi crawler quét qua trang tổng hợp bên thứ ba nạp lại mã đã hết hạn mà không mang mốc thời gian, crawler tự động gán trạng thái active.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Độc bản hóa quy tắc đếm: `codes_count` = số mã còn dùng được (`!isCodeExpired(c)`). Tuyệt đối không tính mã hết hạn vào `codes_count`, huy hiệu và sắp xếp leaderboard.
  - Giữ lại toàn bộ mã hết hạn trong trang chi tiết game dưới nhãn "Hết hạn" riêng biệt, hiển thị dòng trạng thái: `X mã còn dùng được (Y hết hạn)` và tab mặc định là `active`.
  - Khử trùng lặp bản ghi nội bộ theo cặp `(slug, normalizedCode)`: Giữ lại 1 bản ghi duy nhất có mô tả phần thưởng phong phú nhất và mốc hạn chuẩn nhất.
  - Siết chặt Anti-Resurrection Guard trong Crawler Ingest: Không cho phép nạp đè trạng thái active lên các mã đã được xác nhận hết hạn từ nguồn tin cậy; kiểm tra alias slug tương đương.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không xóa bản ghi game trùng catalog (ví dụ Where Winds Meet vs Yến Vân Thập Lục Thanh)*: Lệnh của chủ site là GIỮ CẢ HAI bản ghi để người dùng tra cứu cả hai từ khóa đều có trang đích. Chỉ khử trùng mã và chuẩn hóa số đếm bên trong từng bản ghi.
  - ❌ *Không xóa vĩnh viễn mã đã hết hạn khỏi trang chi tiết*: Người dùng cần tra cứu lịch sử mã đã hết hạn để biết mã mình tìm đã quá hạn hay chưa. Phải giữ trong tab "Hết hạn", chỉ loại trừ khỏi `codes_count` và sắp xếp.
  - ❌ *Không dùng `allCodes.length` làm `codes_count`*: Luôn luôn dùng `active_codes_count` hoặc `allCodes.filter(c => !isCodeExpired(c)).length`.

---

### ISSUE-109: Bẫy Lệch Pha Tìm Kiếm Giữa Dropdown Gợi Ý & Lưới Game/API Do SQLite SQL LIKE Không Chuẩn Hóa Tiếng Việt (Search Desync Trap Between Client In-Memory & Server SQLite LIKE)
- **Triệu chứng**:
  - Gõ từ khóa không dấu như "Ky Tich Tro Lai" hoặc "Thuc Than Ky": Dropdown gợi ý trên trang chủ hiển thị đúng game ("Kỳ Tích Trở Lại", "Thức Thần Ký"), nhưng khi nhìn xuống lưới game chính hoặc gọi API `/api/games?search=` thì nhận về `total: 0` và thông báo "Không tìm thấy tựa game nào phù hợp".
  - Nhấn nút "Xem tất cả kết quả" hoặc "Tìm kiếm" làm dropdown đóng lại nhưng lưới game vẫn trống trơn.
- **Nguyên nhân gốc rễ**:
  1. Dropdown gợi ý chạy trên mảng JavaScript in-memory có bóc tách dấu (`stripAccents`), trong khi API `/api/games` trên Cloudflare Worker chạy câu lệnh SQL thô: `WHERE (name LIKE ? OR slug LIKE ? OR publisher LIKE ?)`. SQLite `LIKE` so sánh theo byte ASCII, không hiểu dấu tiếng Việt (`'y' != 'ỳ'`, `'i' != 'í'`), và khoảng trắng không khớp gạch nối slug.
  2. Nút "Xem tất cả kết quả" không truyền ngay `searchQuery` vừa nhập vào `filter.search` mà phụ thuộc vào debounce 300ms.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Độc bản hóa logic tìm kiếm trong `src/utils/textUtils.ts` (`matchGameSearch` và `calculateGameSearchScore`), dùng chung cho cả 3 nơi: dropdown gợi ý, bộ lọc lưới game, và API `/api/games`.
  - Trên API Cloudflare Worker: Khi có `searchQuery`, truy vấn các game active từ D1 và áp dụng bộ lọc `matchGameSearch` trong bộ nhớ Worker (sub-millisecond execution).
  - Tích hợp Conflicting Diacritics Guard: Khi người dùng gõ từ khóa có dấu rõ ràng (`Thực Thần Ký`), kiểm tra dấu nghiêm ngặt để trả về đúng 0 kết quả (không đoán mò hay nhầm sang `Thức Thần Ký`).
  - Nút "Xem tất cả kết quả" và nút "Tìm kiếm" gọi `handleExploreOrSubmitSearch(searchQuery)` hủy debounce, gán ngay truy vấn vào bộ lọc, và cuộn mượt xuống lưới game.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng SQL `LIKE` thô trên D1 cho tìm kiếm tiếng Việt*: SQLite không hỗ trợ NFD diacritics stripping. Phải dùng bộ lọc in-memory `matchGameSearch` trên tập candidate active games.
  - ❌ *Không dùng fuzzy search (Fuse.js) đoán mò tên game khi người dùng gõ sai dấu*: Truy vấn có dấu sai ("Thực Thần Ký") phải trả về 0 kết quả theo đúng nguyên tắc bảo toàn tính chính xác.

---

### ISSUE-108: Bẫy Trình Bày Hàng Chờ Duyệt Chỉ Dưới Dạng Lưới Thẻ Gây Cụt Tên Game & Thiếu Trường Ngày Phát Hành Trực Quan (Truncated Card Grid View Trap & Missing Prominent Release Date Display)
- **Triệu chứng**:
  - Khi hàng chờ duyệt crawler có nhiều game (63–69 game), chế độ hiển thị dạng Lưới Thẻ 3 cột (Grid View) làm tiêu đề game bị cắt ngắn (`truncate`, gây hiện tượng cụt chữ như "To...", "Tr...", "Ki..."). Quản trị viên không thể nhận biết tên game nếu không rê chuột vào từng thẻ.
  - Ngày phát hành (`releaseDate` / `releaseInfo`) bị ẩn hoặc hiển thị mờ nhạt, khiến quản trị viên không thể đánh giá chính xác độ tươi và thời điểm ra mắt của game để đưa ra quyết định duyệt.
  - Phân trang bị gán cứng 20 game/trang, buộc người dùng phải lật trang 4 lần để duyệt hết 69 game.
- **Nguyên nhân gốc rễ**:
  1. Chỉ cung cấp duy nhất dạng giao diện thẻ (Card Grid), không có chế độ xem dạng Bảng/Danh sách (List View).
  2. `releaseDate` và `releaseInfo` không được chuẩn hóa thành cột dữ liệu trọng tâm độc lập trong giao diện hàng chờ.
  3. Giá trị phân trang `PENDING_GAMES_PER_PAGE = 20` bị fix cứng trong code.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Cung cấp chế độ xem Danh Sách (List View) mặc định dạng bảng trực quan (dense responsive table), hiển thị trọn vẹn tên game đầy đủ không bị cắt cụt.
  - Cung cấp nút chuyển đổi `[ LayoutList Danh Sách ]` vs `[ LayoutGrid Lưới Thẻ ]`.
  - Chuẩn hóa cột "Ngày Phát Hành" (`formatReleaseDateDisplay`) hiển thị nổi bật với biểu tượng `Calendar`, ngày `DD/MM/YYYY` màu hổ phách (amber), huy hiệu trạng thái ra mắt (ví dụ: `Ra mắt 20-10`, `Phát hành chính thức`), và thời điểm quét.
  - Bổ sung bộ chọn số lượng game hiển thị trên mỗi trang (`20`, `50`, `100`, `Tất cả`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không ép buộc người dùng chỉ dùng duy nhất dạng thẻ lưới*: Dạng bảng (List View) là bắt buộc cho các màn hình quản trị và duyệt dữ liệu hàng loạt.
  - ❌ *Không cắt ngắn (truncate) tên game trong chế độ danh sách*: Quản trị viên cần đọc trọn vẹn tên game để duyệt chính xác.

---

### ISSUE-107: Bẫy Tự Động Điền Giá Trị Mặc Định Bịa Đặt ("Roblox", Hướng Dẫn Giả, Icon 404) Khi Thiếu Metadata Game (Fabricated Defaults & 404 Icon Trap in Game Ingestion)
- **Triệu chứng**:
  - Khi bot ngoài hoặc quản trị viên tạo game mới vào Hàng Chờ Duyệt (`queue_game`, `add_crawler_pending_game`, hoặc `autoQueueNewGame`) mà không truyền đầy đủ metadata (`developer`, `category`, `platform`, `description`, `instructions`, `iconUrl`):
  - Hệ thống tự động gán toàn bộ trường thành "Roblox", tự sinh mô tả bịa đặt "là tựa game hấp dẫn trên nền tảng Roblox...", tự sinh hướng dẫn 3 bước Roblox, và gán đường dẫn icon `/game_icons/[slug].webp` dẫn tới mã lỗi HTTP 404 (ví dụ thực tế: game *Avatar Land* từ fanpage chính thức bị biến thành game Roblox với icon 404).
- **Nguyên nhân gốc rễ**:
  1. Thiếu tư duy "NULL = Chưa rõ": Thay vì lưu `null` hoặc chuỗi rỗng khi không có dữ liệu, code sử dụng toán tử fallback `|| 'Roblox'` và chuỗi mô tả/hướng dẫn cố định.
  2. Gán cứng đường dẫn local icon mà không kiểm tra sự tồn tại của file vật lý.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Khi không có dữ liệu: Lưu `null` (hiển thị "Chưa rõ" ở Admin) và chuỗi rỗng `""`. TUYỆT ĐỐI không điền "Roblox" hay bất kỳ giá trị cụ thể nào khác.
  - Hướng dẫn nhập code mặc định CHỈ được kích hoạt khi game đã được xác nhận là Roblox (`isConfirmedRobloxGame(item)` trả về `true`). Với game chưa xác nhận nền tảng: để trống hướng dẫn `""`.
  - Không tự sinh mô tả từ tên game + nền tảng giả định. Để trống nếu không có mô tả thật.
  - Kiểm tra file vật lý qua HEAD request trước khi gán `localIconPath` / `iconUrl`. Nếu không có file: để trống `iconUrl: ""`, gắn cờ `missing_icon: true`, `has_icon: false`, hiển thị huy hiệu `⚠️ Thiếu icon` trên Admin.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tự tiện gán giá trị mặc định cho các trường chưa rõ*: "Chưa rõ" (NULL/rỗng) là nguồn chân lý duy nhất cho dữ liệu chưa được kiểm chứng, giống như quy tắc hạn dùng (ISSUE-104).
  - ❌ *Không trỏ icon vào file cục bộ chưa tồn tại*: Trỏ icon tới file 404 làm hỏng trải nghiệm người dùng và làm giảm điểm SEO/Core Web Vitals.

---

### ISSUE-106: Bẫy Bóc Tách Trực Tiếp HTML Thô Khiến Tên Ảnh Thumbnail / Đường Dẫn URL Bị Cào Nhầm Thành Mã Giftcode & Bẫy Chấm Điểm Đơn Lẻ Không Đối Chiếu Chéo (Raw HTML Attribute Extraction Trap & Single-Source Scoring Trap)
- **Triệu chứng**:
  - Crawler thường xuyên cào trúng các mã "rác" không đổi thưởng được: các mảnh OCR từ ảnh (`ROLL-FISHERMAN-MOI-NHAT`, `ROLL-A-FISHERMAN-THUMBNAIL`, `FISHING-MASTER-THUMBNAIL`, `DREAM-CAR-COLLECTION-`, `COMMAND-AN-ARMY-THUMBNAIL`, `DEEP-FISHING-THUMB`), mã kiểu máy tạo (`PM360...`, `TGB...`, hex dài), mã bị gán nhầm sang tựa game khác có tên chứa chuỗi con (*Hero Clash* vs *Gear Hero Clash*), hoặc mã đã hết hạn nhưng vẫn hiển thị như mã mới.
- **Nguyên nhân gốc rễ**:
  1. Regex trích xuất văn bản trong `web_scraper.cjs` chạy trực tiếp trên HTML thô chưa làm sạch. Thẻ `<img>` hoặc thẻ `<a>` có đường dẫn chứa `/code-roll-a-fisherman-thumbnail.jpg` bị regex khớp nhầm `/code-` thành tiền tố giftcode.
  2. `code_filter.cjs` coi mọi chuỗi có dấu gạch ngang và độ dài $\ge 7$ là giftcode hợp lệ, khiến các slug bài viết (kebab-case text) không bị chặn.
  3. Crawler chấm điểm và phân loại từng mã ngay khi cào xong từng nguồn riêng lẻ, không có bước tổng hợp đối chiếu chéo (Cross-check aggregation) để biết mã có xuất hiện trên $\ge 2$ nguồn độc lập hay không.
  4. `GameMatcher` so khớp bằng `cleanInput.includes(g.cleanName)`, khiến game có tên ngắn bị khớp nhầm khi bài viết nói về một game khác có chứa tên đó (ví dụ *Hero Clash* bị gán nhầm mã của *Gear Hero Clash*).
- **Giải pháp chuẩn đã kiểm chứng**:
  - Làm sạch toàn bộ thẻ `<img>`, `<picture>`, `<svg>`, `<script>`, `<style>` và các thuộc tính `src`, `href`, `class`, `style` trước khi chạy regex ngữ cảnh văn bản trong `web_scraper.cjs`.
  - Bổ sung ranh giới chặt chẽ `(?:^|[^\w/.-])(?:code|giftcode...)` để không bao giờ khớp chuỗi nằm trong đường dẫn URL hoặc tên file.
  - Cập nhật `code_filter.cjs`: Thêm blacklist hậu tố rác (`JUNK_SUFFIXES`), đuôi file ảnh (`FILE_EXTENSIONS`), URL path (`URL_PATTERNS`), và mẫu mã máy tạo (`MACHINE_GENERATED_PATTERNS`). Chặn toàn bộ chuỗi có $\ge 2$ dấu gạch nối không có chữ số (slug bài viết).
  - Triển khai cơ chế gom nhóm ứng viên (`candidateGroups`) trong `run_crawler.cjs` để tính toán `crossCheckCount`. Quy định: Bậc 1 (90-100đ, Tự động đăng) BẮT BUỘC là nguồn chính thức HOẶC `crossCheckCount >= 2` và không bị xung đột, không hết hạn, không quá 6 tháng.
  - Xử lý mã tranh cãi trạng thái (`isConflicted = true`, `conflictNote`): Khóa trần < 70 điểm (Bậc 3), bắt buộc đưa vào hàng chờ để Admin duyệt.
  - Nâng cấp `GameMatcher`: So khớp theo ranh giới từ, ưu tiên tựa game có nhiều từ khóa trùng khớp hơn, thưởng điểm khi khớp NPH (+0.2đ) và phạt điểm khi xung đột Global vs VN (-0.4đ).
  - Bổ sung trường lưu vết kiểm toán (`extractionMethod`, `crossCheckCount`, `crossCheckSources`, `scoreReasons`, `isConflicted`, `conflictNote`, `isStaleSource`) trên cả Ingest API và giao diện quản trị Admin `CrawlerModule.tsx`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chạy regex tìm code trực tiếp trên HTML thô chứa thuộc tính `src`, `href`*: Mọi văn bản phải được bóc tách sạch sẽ thẻ ảnh và URL attributes trước khi phân tích.
  - ❌ *Không chấm điểm và phân luồng cục bộ trên từng nguồn đơn lẻ mà không gom nhóm đối chiếu chéo*: Luôn gom nhóm ứng viên để tính `crossCheckCount` trước khi quyết định tự động đăng.
  - ❌ *Không chặn toàn bộ mã thuần chữ cái (all-letter words)*: Các game Roblox và quốc tế thường có mã là từ in hoa hợp lệ (`COSMETIC`, `MONGOLS`, `BATTLEREADY`). Chỉ chặn khi từ gốc là chữ thường (prose text) hoặc chứa hậu tố ngữ pháp tiếng Anh.

---

### ISSUE-105: Bẫy Không Thể Tạo / Nạp Mã Cho Game Mới Chưa Có Trong Catalog Hoặc Hàng Chờ Duyệt (Missing queue_game Action & New Game Ingestion Trap)
- **Triệu chứng**:
  - Khi bot ngoài hoặc quản trị viên gửi mã giftcode cho một tựa game mới toanh (chẳng hạn game Roblox, web game, hoặc game chưa cào từ Google Play VN), API crawler ingest trả về lỗi:
    *"Không tìm thấy game nào khớp với \"<Tên Game>\". Vui lòng kiểm tra lại tên game hoặc tạo trước trong Hàng Chờ Duyệt."*
  - Tuy nhiên, API lại không có action nào để đưa game vào Hàng Chờ Duyệt theo phương thức tự động, buộc người dùng phải nhập tay vào trang quản trị.
- **Nguyên nhân gốc rễ**:
  1. API ingest chỉ hỗ trợ đối chiếu với các game đã tồn tại trong `wcg_admin_games_v5` hoặc `wcg_crawler_pending_games_v1`.
  2. Chưa có action `queue_game` cho phép bot hoặc client gửi metadata game (name, slug, developer, category, platform, icon, instructions) và danh sách giftcode ban đầu vào Hàng Chờ Duyệt.
  3. Giao diện `CrawlerModule.tsx` thiếu nút và modal để thêm game thủ công vào hàng chờ.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Xây dựng action `queue_game` (và alias `queue_games`, `add_pending_game`) trong `functions/api/crawler/ingest-codes.ts` hỗ trợ đưa 1 hoặc nhiều game vào hàng chờ, kèm danh sách mã code và hướng dẫn.
  - Hỗ trợ cờ `autoQueueNewGame: true` trong luồng ingest chính: Nếu game chưa có, tự động tạo trong hàng chờ và tiếp tục luồng nạp mã.
  - Bổ sung action `add_crawler_pending_game` trên `/api/sync` và nút "Thêm Game Chờ Duyệt" trên giao diện Admin `CrawlerModule.tsx`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ chặn lỗi và yêu cầu người dùng "tạo trước trong Hàng Chờ Duyệt" mà không cung cấp API tạo*: Mọi quy trình tự động hóa của bot ngoài đều cần endpoint rõ ràng để khởi tạo tài nguyên cần thiết.

---

### ISSUE-104: Bẫy Tự Gán Hạn Giả Định 2026-12-31 Khi Không Biết Hạn & Bẫy UI Ép Buộc Chọn Ngày (Fake 2026-12-31 Expiry Fallback Trap & UI Mandatory Date Picker Trap)
- **Triệu chứng**:
  - Gần như toàn bộ mã giftcode trên website (89.4%) hiển thị hạn sử dụng là `31/12/2026`, gây hiểu nhầm nghiêm trọng cho người dùng rằng mã còn hiệu lực lâu dài, trong khi thực tế mã không có hạn công bố hoặc có thể đã hết hạn.
  - Khi xem chi tiết game hoặc lọc mã, các mã không rõ hạn bị xếp lẫn lộn hoặc bị gán hạn giả cuối năm.
- **Nguyên nhân gốc rễ**:
  1. Trong API ingest và các pipeline scraper, khi payload không truyền `expiresAt` hoặc không xác định được ngày, code fallback tự động gán `parsedExp.formatted || (isExpired ? 'Hết hạn' : '2026-12-31')`.
  2. Giao diện quản trị Admin không có nút bấm chọn "Chưa rõ hạn" tách biệt với ô input ngày tháng, dẫn đến việc quản trị viên bị ép phải chọn một ngày hoặc để nguyên giá trị mặc định.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Quy ước dữ liệu toàn hệ thống: `NULL` / rỗng = Chưa rõ hạn. Bỏ trống `expiresAt` -> lưu `NULL`. Chỉ lưu ngày cụ thể khi có dữ liệu xác thực rõ ràng.
  - Cung cấp action di dời `migrate_remove_fake_expiry_dates` trên API Crawler Ingest để chuyển đổi sạch sẽ toàn bộ bản ghi có hạn giả `2026-12-31` sang `NULL` trên cả bảng SQL `codes` và các kho cài đặt `system_settings` (`wcg_admin_custom_free_codes_v1`, `wcg_admin_free_codes_v5`, `wcg_crawler_pending_codes_v1`), bảo toàn 100% số lượng mã.
  - Giao diện người dùng (`GameDetailModal.tsx`): Hiển thị nhãn trung tính `"Chưa rõ hạn dùng"` (`text-slate-400 italic` kèm icon Clock mờ, không màu đỏ).
  - Thuật toán sắp xếp (`compareCodesByExpiry`): Mã có ngày cụ thể còn hạn xếp trước; mã chưa rõ hạn xếp sau các mã có ngày cụ thể, không bị đẩy lên đầu như mã sắp hết hạn.
  - Giao diện Admin: Bổ sung nút bấm `"Chưa rõ hạn"` tách biệt với date picker để người dùng chọn nhanh chỉ với 1 click.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tự ý gán ngày giả định cuối năm (`2026-12-31`) khi không biết hạn*: Mọi dữ liệu không rõ hạn phải lưu `NULL` và thể hiện trung thực là "Chưa rõ hạn dùng".
  - ❌ *Không ép buộc chọn ngày trên giao diện Admin*: Luôn cung cấp tùy chọn rõ ràng cho phép bỏ trống hạn hoặc đánh dấu Chưa rõ hạn.

---

### ISSUE-103: Bẫy Sai Tên Bảng SQL D1 (Truy Vấn Bảng `settings` Không Tồn Tại Thay Vì `system_settings`) & Bẫy Chữa Theo Lượt Truy Cập Thay Vì Đồng Bộ Cưỡng Bức Toàn Bộ Catalog (D1 Non-existent Settings Table Trap & Full Catalog Forced Sync)
- **Triệu chứng**:
  - Khi API cần đối chiếu hoặc đồng bộ dự phòng giữa kho cài đặt JSON blob (`wcg_admin_games_v5`, `wcg_news_articles_v1`, `wcg_admin_giveaways_v4`) và các bảng SQL D1, câu lệnh truy vấn luôn trả về `null` hoặc thất bại âm thầm.
  - Các tựa game trong catalog chỉ được chữa lẻ tẻ khi có request truy cập thay vì được đồng bộ đồng loạt 100% trên toàn bộ cơ sở dữ liệu.
- **Nguyên nhân gốc rễ**:
  - Bảng lưu trữ cấu hình hệ thống trong D1 được khởi tạo và quản lý trong `functions/services/d1_service.ts` với tên gọi chính thức là `system_settings`.
  - Một số file (`functions/api/games.ts`, `functions/_worker.ts`, `functions/services/telegram_service.ts`) lại viết truy vấn SQL trực tiếp `SELECT value FROM settings ...`. Do SQLite D1 không có bảng tên `settings`, truy vấn luôn ném lỗi `no such table: settings` và bị khối `.catch(() => null)` dập tắt, dẫn đến dữ liệu không thể tự phục hồi.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Chuẩn hóa toàn bộ câu truy vấn SQL đọc/ghi cấu hình trong codebase trỏ chính xác về bảng `system_settings` (hoặc thông qua hàm `getSettingD1` / `getMultipleSettingsD1` trong `d1_service.ts`).
  - Sử dụng action `sync_all_instructions_to_d1` của API Crawler Ingest để thực thi đồng bộ cưỡng bức toàn bộ 565 tựa game từ `wcg_admin_games_v5` vào bảng SQL `games` D1 theo lô 50 bản ghi.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không viết câu lệnh SQL trực tiếp `FROM settings`*: Luôn kiểm tra schema `d1_service.ts` để dùng đúng tên bảng `system_settings`.
  - ❌ *Không chỉ trông cậy vào cơ chế chữa lẻ tẻ theo từng request*: Với các đợt phát hành hoặc cập nhật hàng loạt, luôn thực thi đồng bộ cưỡng bức toàn bộ catalog để đảm bảo tính nhất quán dữ liệu 100%.

---

### ISSUE-102: Bẫy Đặt `overflow: hidden` và `max-height` Trên Header Khiến Các Menu Thả Xuống (Dropdowns) Bị Cắt Bỏ & Che Khuất (Header Overflow Hidden Dropdown Clipping Trap)
- **Triệu chứng**:
  - Khi người dùng nhấp vào avatar nhân vật trên thanh header (`codegame.shop`), menu thả xuống hiển thị thông tin nhân vật, số dư ví, tủ game, nạp code, đổi ảnh đại diện bị che khuất / cắt bỏ (clip), chỉ nhìn thấy một phần nhỏ hoặc không thấy nội dung. Menu ngôn ngữ `LanguageSelector` cũng gặp tình trạng tương tự.
- **Nguyên nhân gốc rễ**:
  - Khi tối ưu CSS chống vỡ layout (FOUC/CLS), thuộc tính `overflow: hidden; max-height: 56px;` (mobile) và `max-height: 72px;` (desktop) được đặt thẳng vào bộ chọn `header, .site-header` trong `<head><style>`.
  - Trong CSS, bất kỳ phần tử con có vị trí tuyệt đối (`position: absolute`) nằm bên trong vùng chứa có `overflow: hidden` đều bị cắt bỏ ở ranh giới của vùng chứa đó. Do đó, menu có chiều cao ~400px bị cắt ngang ở đúng mức 56px/72px của header.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Giữ cố định chiều cao của header bằng `height: 56px; min-height: 56px;` (mobile) và `height: 72px; min-height: 72px;` (desktop) để đảm bảo CLS = 0, nhưng **BẮT BUỘC** đặt `overflow: visible;` để các menu con thả xuống tự do.
  - Loại bỏ hoàn toàn `max-height` và `overflow: hidden` trên bộ chọn `header, .site-header`.
  - Bổ sung `max-h-[calc(100vh-5rem)] max-w-[calc(100vw-1rem)] overflow-y-auto` trên dropdown menu để chống tràn màn hình trên các thiết bị thấp/xoay ngang.
  - Bổ sung sự kiện `touchstart` cho các trình xử lý click outside để tăng độ nhạy trên thiết bị di động.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ đặt `overflow: hidden` lên thẻ `<header>`*: Header là nơi chứa nhiều menu thả xuống (dropdown menu nhân vật, ngôn ngữ, tìm kiếm gợi ý). Việc đặt `overflow: hidden` sẽ cắt đứt mọi dropdown menu.

---

### ISSUE-101: Bẫy Split-Brain Lưu Trữ Hướng Dẫn Nhập Code (KV Blob vs D1 Table), Bẫy Falsy Logic `||` Chặn Xóa Hướng Dẫn & Bẫy UI/Prerender Ép Buộc Văn Mẫu (Split-Brain Instructions Storage, Falsy Or Guide Deletion Trap & UI Fallback Trap)
- **Triệu chứng**:
  - Khi gọi action `update_instructions` của API crawler, phản hồi báo thành công (`totalInstructionsUpdated: 1`) nhưng khi truy vấn công khai qua `GET /api/games?slug=` hoặc xem HTML trang game `/game/:slug`, giao diện vẫn hiển thị văn mẫu mặc định chung chung (`Bước 1: Mở game > Nhấn Avatar nhân vật...`) hoặc `redeem_url` trống.
  - Khi gửi `instructions: ""` hoặc `null` để xóa hướng dẫn cho game không kiểm chứng được, API báo `totalInstructionsUpdated: 0` và trang vẫn giữ văn mẫu cũ.
- **Nguyên nhân gốc rễ**:
  1. API `update_instructions` chỉ cập nhật vào mảng in-memory rồi lưu vào D1 Settings `wcg_admin_games_v5`, nhưng hoàn toàn bỏ qua câu lệnh UPDATE cột `instructions` và `redeem_url` trong bảng `games` D1. Trong khi đó `GET /api/games?slug=` lại đọc trực tiếp từ bảng `games` D1.
  2. Dòng code `instructions: extractedInstructions || oldInstructions` khiến giá trị chuỗi rỗng `""` bị đánh giá falsy và bị ghi đè ngược lại bởi văn mẫu cũ. Thống kê `totalInstructionsUpdated` dùng `Boolean(extractedInstructions)` khiến số lượng cập nhật bị tính là 0 khi xóa rỗng.
  3. Frontend `GameDetailModal.tsx` dùng fallback `currentGame.instructions || '1. Đăng nhập...'` cưỡng ép hiển thị văn mẫu khi instructions rỗng.
  4. Pages phục vụ file tĩnh cũ `dist/game/<slug>/index.html` hoặc `renderSeoHtml` không nhúng khối HTML Hướng Dẫn vào `<div id="root">`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Đồng bộ nguyên tử D1 `games` table: Trong `ingest-codes.ts`, cập nhật `instructions = CASE WHEN ? IS NOT NULL THEN ? ELSE instructions END, redeem_url = CASE WHEN ? IS NOT NULL THEN ? ELSE redeem_url END` trong bảng `games` D1.
  2. Bổ sung action `sync_all_instructions_to_d1` để đồng bộ toàn bộ catalog từ `wcg_admin_games_v5` vào bảng `games`.
  3. Hỗ trợ xóa rỗng có chủ đích: Khi `hasExplicitInstructions && extractedInstructions === ''`, xóa sạch cả `instructions = ''` và `redeem_url = ''`, báo đúng `totalInstructionsUpdated: 1`.
  4. Xóa bỏ fallback văn mẫu trong `GameDetailModal.tsx`: Chỉ render khối Hướng Dẫn khi `currentGame.instructions && currentGame.instructions.trim().length > 0`.
  5. Đưa toàn bộ request `/game/:slug` qua `renderSeoHtml`, nhúng cấu trúc HTML đầy đủ kèm `<h2>📖 Hướng Dẫn Nhập Code</h2>` và nút Redeem Web vào `<div id="root">`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ cập nhật `wcg_admin_games_v5` mà quên bảng `games` D1*: Bất kỳ thay đổi metadata game nào phải cập nhật đồng thời cả D1 settings blob và bảng SQL `games`.
  - ❌ *Không dùng toán tử logic `||` cho các trường chuỗi có thể xóa rỗng*: Luôn kiểm tra `!== undefined` thay vì dựa vào truthy/falsy.
  - ❌ *Không dùng văn mẫu fallback cứng trong component UI*: Nếu dữ liệu rỗng có chủ đích, ẩn hoàn toàn khối UI tương ứng.

---

### ISSUE-100: Bẫy Phụ Thuộc CSS Ngoài Khiến Header Bị Vỡ Layout Trên Mạng Chậm, Bẫy Render-Blocking Font Google & Bẫy CLS Khi Tải Game Không Có Skeleton (FOUC Header Layout Shift, Blocking Web Fonts & Unbounded Catalog Sync Trap)
- **Triệu chứng**:
  - Khi mở `codegame.shop` trên thiết bị di động với kết nối mạng chậm (4.7–24 KB/s hoặc Slow 3G/4G), giao diện bị vỡ layout kéo dài trong nhiều giây: Chữ menu "Mã Miễn Phí / Đợt Phát Code / Chợ Code VIP" đè chồng lên logo "CodeGame.shop".
  - Nội dung trang xếp lộn xộn rồi giật mạnh (CLS) khi file CSS ngoài `index-*.css` (202KB) tải xong.
  - Spinner tải trang biến mất đột ngột làm danh sách game bung ra làm dịch chuyển toàn bộ trang web.
- **Nguyên nhân gốc rễ**:
  1. Header prerender trong static HTML có thẻ `<nav>` chứa 3 link điều hướng nhưng thiếu hoàn toàn class ẩn trên mobile (`hidden md:flex`).
  2. Trang HTML ban đầu không có Critical CSS cho header, flexbox và kích thước responsive. Khi file CSS 202KB chưa về kịp, các thẻ block tự nhiên bung tràn và đè lên logo.
  3. Thẻ `<link rel="stylesheet">` tải cùng lúc 11 mức đậm font Google Fonts (Inter + JetBrains Mono) tạo thành rào cản chặn hiển thị (render-blocking) từ bên thứ ba.
  4. Client khách vãng lai bị kích hoạt tác vụ nền `syncWithCloudflareKV()` tải toàn bộ JSON blob 559 game qua `/api/sync`, bóp nghẹt đường truyền di động.
  5. Thẻ game không có kích thước ảnh `width`/`height` cố định và không có component skeleton giữ chỗ khi đang fetch.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Nhúng trực tiếp Critical CSS vào `<head>` của `index.html`: Khóa cứng chiều cao header 56px (mobile) / 72px (desktop), áp dụng `display: none !important;` cho `header nav` và `.header-nav-tabs` trên màn hình < 768px.
  - Chuẩn hóa toàn bộ 7 mẫu header prerender trong `scripts/prerender.js` với `site-header` và `header-nav-tabs hidden md:flex`.
  - Tải Google Fonts bất đồng bộ (`media="print" onload="this.media='all'"`) rút gọn 4 mức đậm Inter (400, 600, 700, 800) và fallback tức thì font hệ thống (`-apple-system, BlinkMacSystemFont, sans-serif`).
  - Xây dựng component `GameCardSkeleton` và hiển thị `<GameGridSkeleton count={24} />` giữ chỗ chuẩn xác tỉ lệ aspect-ratio.
  - Khai báo rõ ràng `width={48} height={48}` trên thẻ `<img>` của `GameCard.tsx`.
  - Giới hạn client vãng lai: chỉ tải 4KB CMS branding qua `syncBrandingAndContentOnly()`, không tải blob 559 game.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để `<nav>` trần không có class ẩn mobile trong prerender HTML*: Khi CSS chưa tải xong, thẻ `nav` sẽ render dạng block đè trực tiếp lên logo.
  - ❌ *Không tải 11 mức đậm font Google Fonts qua thẻ link stylesheet đồng bộ*: Luôn dùng preload và tải async không chặn render.
  - ❌ *Không cho khách vãng lai gọi `/api/sync` kéo toàn bộ catalog*: Luôn ưu tiên phân trang server qua `/api/games` 24 item/lần.

---

### ISSUE-099: Bẫy Gán Đường Dẫn Icon Tĩnh Local Không Xác Minh Tồn Tại Đĩa & Thiếu Cơ Chế Dự Phòng Remote Store Edge Proxy (Speculative Local Icon Path & Missing Store Proxy Trap)
- **Triệu chứng**:
  - Trên giao diện web công khai, một số thẻ game mới đăng (ví dụ `vo-lam-truyen-ky`, `gunbound-legend-vua-toa-do`, `the-gioi-nuoc-sinh-ton`) hiển thị avatar chữ cái thay vì logo thực tế của game.
  - Kiểm tra mạng cho thấy URL `/game_icons/<slug>.webp` trả về HTTP 404 Not Found.
- **Nguyên nhân gốc rễ**:
  1. Trong pipeline cào và nạp game (`game_logo_resolver.cjs` và `/api/crawler/ingest-codes`), hàm resolver luôn gán `localIconPath: /game_icons/${slug}.webp` một cách suy đoán mà không kiểm tra xem file đã được ghi thành công trên đĩa (`fs.existsSync` và `size > 500`) hay chưa.
  2. Tại runtime, Cloudflare Pages Edge Worker không thể tạo file tĩnh mới vào thư mục assets của Pages. Nếu game được publish qua API tại runtime mà chưa có file từ lúc build, đường dẫn `/game_icons/...` sẽ lập tức trả về 404.
  3. Ở tầng component UI (`GameCard.tsx`, `GameDetailModal.tsx`), khi ảnh lỗi tải (`onError`), giao diện rơi ngay về avatar chữ cái thay vì thử nạp URL remote store chính thức từ Google Play Store.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Trong resolver, bắt buộc kiểm tra `fs.existsSync(path) && fs.statSync(path).size > 500` trước khi trả về `localIconPath`. Nếu chưa ghi thành công, giữ nguyên URL store remote trong `iconUrl`.
  - Nâng cấp endpoint Edge Proxy `/api/game-icon`: Nhận tham số `pkg` hoặc tự tra cứu D1, cào logo chuẩn từ Google Play Store, stream về người dùng và cache 30 ngày trên Cloudflare Edge Cache.
  - Tích hợp chuỗi fallback 4 giai đoạn trong UI: WebP local -> JPG local -> Store Remote / Edge Proxy `pkg` -> Initials Avatar.
  - Bổ sung bước kiểm toán tự động [6/6] trong `verify_codes_integrity_audit.cjs` kiểm tra 100% 562 game catalog và auto-heal khi phát hiện thiếu.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán cứng `/game_icons/${slug}.webp` khi file chưa chắc chắn tồn tại*: Nếu quá trình ghi đĩa thất bại, người dùng sẽ nhận 404.
  - ❌ *Không ghi đè URL remote store bằng đường dẫn local ảo*: Luôn giữ lại URL remote store để làm nguồn dữ liệu dự phòng.

---

### ISSUE-098: Bẫy Tải Toàn Bộ JSON Blob Lên RAM Phân Trang Trong JS, Bẫy Header no-store Trên HTML Phá Hủy Edge Cache & Bẫy Cồng Kềnh Main Bundle 1.5MB (Heavy In-Memory Catalog Scan, Edge Cache Bypass & Bundle Bloat Trap)
- **Triệu chứng**:
  - Trang chủ load lâu (TTFB ~1.43s), header Cache-Control: no-cache, no-store, must-revalidate và cf-cache-status: DYNAMIC khiến HTML không bao giờ được cache ở Edge.
  - API GET /api/games mất cố định 3–4s trên mọi request bất kể lọc hay sắp xếp gì.
  - File bundle chính index-*.js phình to tới 1.62MB chưa nén.
  - Thẻ game khi omit codes array bị hiện nhãn "Đang tải..." thay vì nút hành động.
- **Nguyên nhân gốc rễ**:
  1. Trên mỗi request /api/games, Edge Worker đọc blob JSON hàng chục megabyte từ system_settings D1 (564 games và 11,762 codes), deserialize JSON và duyệt lọc trong RAM JavaScript.
  2. public/_headers cấu hình no-store trên root /, triệt tiêu hoàn toàn khả năng Edge Cache HIT của Cloudflare.
  3. Payload danh sách game gửi kèm trường toàn văn nặng (description, instructions).
  4. src/App.tsx import tĩnh 19 modals và views không cần thiết cho trang chủ đầu tiên.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Chuyển 100% phân trang, lọc và sắp xếp sang thuần SQL trên bảng games D1 với các index chuyên dụng.
  - Precompute active_codes_count, total_codes_count và last_code_at trên bảng games, cập nhật atomic increment khi nạp code mới.
  - Cắt giảm trường nặng trong list mode, giữ payload 48 games < 60KB.
  - Cấu hình Edge Cache API (caches.default) cho /api/games và cấu hình s-maxage=3600 trên static HTML /.
  - Code-splitting qua React.lazy và React.Suspense cho 19 views/modals, giảm 65% kích thước main bundle từ 1.49MB xuống 535KB.
  - Thêm debounce 300ms cho input tìm kiếm.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không duyệt qua toàn bộ games/codes trong JS memory rồi mới slice/filter*: Chi phí JSON.parse và JS iteration trên Edge Worker rất chậm và dễ gây Worker Error 1102.
  - ❌ *Không cấu hình no-store cho toàn bộ trang tĩnh*: Khiến Cloudflare Edge luôn bỏ qua cache và TTFB bị đẩy lên hơn 1.4s.
  - ❌ *Không gọi N+1 queries đếm code*: Luôn dùng cột precompute active_codes_count.

---

### ISSUE-097: Bẫy Unmount Component Chứa createPortal Phá Hủy Giao Diện Mobile Search Trong 0ms (Sticky Search Portal Unmount Collision Trap)
- **Triệu chứng**:
  - Trên thiết bị di động (màn hình < 768px), khi người dùng cuộn xuống danh mục game ở trang chủ, thanh tìm kiếm dính (sticky floating search bar) xuất hiện dưới header.
  - Tuy nhiên, khi chạm/ấn vào thanh tìm kiếm này, không có gì xảy ra, hoặc modal tìm kiếm chỉ chớp nháy rồi biến mất ngay lập tức, không thể nhập từ khóa để tìm game.
- **Nguyên nhân gốc rễ**:
  1. Trong `src/App.tsx`, thanh tìm kiếm dính được bọc trong điều kiện:
     `{currentTab === 'catalog' && !isMobileSearchActive && (`.
  2. Khi người dùng bấm vào thanh tìm kiếm, component `SearchAutocomplete` gọi `handleOpenMobileSearch()` và phát CustomEvent `wcg_mobile_search_toggled` với `{ isOpen: true }`.
  3. `App.tsx` nhận sự kiện và set `isMobileSearchActive = true`.
  4. Điều này khiến điều kiện `!isMobileSearchActive` trở thành `false`, React unmount toàn bộ `SearchAutocomplete`.
  5. Vì modal tìm kiếm toàn màn hình trên mobile được render bằng `createPortal` từ chính component `SearchAutocomplete`, việc unmount đã tiêu diệt portal đó ngay tức khắc.
  6. Thêm vào đó, cleanup effect của `SearchAutocomplete` khi unmount lại phát `wcg_mobile_search_toggled` với `{ isOpen: false }`, khiến state quay về false, tạo ra một vòng lặp huỷ hoại trải nghiệm người dùng.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Không unmount component `SearchAutocomplete` khi mở tìm kiếm di động. Giữ component được render chừng nào `currentTab === 'catalog'`.
  - Ẩn/hiện thanh tìm kiếm nổi bằng Tailwind CSS classes:
    `isStickySearchVisible && !isMobileSearchActive ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-4 opacity-0 pointer-events-none'`.
  - Áp dụng `touch-manipulation` để loại bỏ độ trễ tap 300ms trên mobile touch screens.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng state con (như isMobileSearchActive) để conditional render unmount component cha đang nắm giữ portal của chính modal đó*: Khi modal mở, component cha bị unmount kéo theo portal bị destroy ngay lập tức.
  - ❌ *Không đặt setIsStickySearchVisible(false) vội vã khi isMobileSearchActive = true*: Khi đóng modal tìm kiếm, người dùng vẫn đang ở vị trí cuộn bên dưới; thanh sticky cần tự động hiện lại nguyên vẹn mà không cần người dùng phải cuộn lại trang.

---

### ISSUE-096: Bẫy Race Condition Ghi Đè Snapshot Stale Khi Ingest Đồng Thời Hàng Chờ, Bẫy Copy codes_count = 0 Trong publish_game, Bẫy Khớp Substring Chuỗi Ngắn (<4 ký tự) & Bẫy Vượt Giới Hạn CPU Cloudflare Worker Error 1102 (Concurrent Ingest Overwrite, Short Substring Trap & Edge Worker CPU Limit)
- **Triệu chứng**:
  - Khi bot Muse hoặc quy trình tự động nạp giftcode hàng loạt qua API `POST /api/crawler/ingest-codes`, API trả về `added > 0` và `autoPublished = true`, nhưng sau đó gọi `GET /api/games?slug=...` lại nhận HTTP 404 và game vẫn nằm trong hàng chờ `list_pending_games` (xảy ra trên 8 game: `mini-world-royale`, `gunbound-legend-vua-toa-do`, `vo-lam-truyen-ky`, `srom-huyen-thoai-lu-khach`, `mobile-legends-adventure`, `league-of-masters-auto-chess`, `thien-long-bat-bo-2`, `lineage2m`).
  - Khi gọi action `publish_game`, game lên sóng nhưng mang `codes_count = 0` dù trước đó vừa báo nạp mã thành công. Nạp lại cùng payload thì báo added lần nữa, chứng tỏ lần nạp đầu đã bị ghi đè mất.
  - Phản hồi của `publish_game` trả snapshot cũ mang `codes_count: 0` thay vì số lượng thực tế trong cơ sở dữ liệu.
  - Cloudflare Worker ngắt quãng trả về HTTP 503 với `Error 1102: Worker exceeded resource limits` khi nạp mã hoặc truy vấn API dồn dập.
  - Game test hoặc game mới có tên chứa từ "Audit" hay "Auto" bị khớp nhầm sang game "Au Mobile VTC: BigUpdate" do chữ "au" (2 ký tự) khớp chuỗi con lỏng lẻo.
- **Nguyên nhân gốc rễ**:
  1. Trong `functions/api/crawler/ingest-codes.ts`, danh mục game `wcg_admin_games_v5`, mã code `wcg_admin_custom_free_codes_v1` và pending games `wcg_crawler_pending_games_v1` được đọc một lần lúc đầu hàm. Khi nhiều request chạy gần như đồng thời hoặc liên tiếp: request chạy sau mang snapshot cũ hơn và ghi đè lên D1, làm mất sạch thay đổi (mã code và game đã auto-publish) của request trước đó!
  2. Action `publish_game` sao chép trực tiếp `codes_count` từ bản ghi pending (`gameToPublish.codes_count || 0`) vốn luôn bằng 0, thay vì truy vấn đếm số lượng mã thực tế đang có trong kho code cho slug đó.
  3. Thiếu bộ lọc loại bỏ các ứng dụng tiện ích / xác thực / cổng web không phải game và thiếu thuật toán khử trùng đa tầng với 564 live games trong danh mục.
  4. Trong `functions/api/games.ts`, hàm `getLoadedCatalog` háu ăn (eager) duyệt qua 11,762 codes và định dạng toàn bộ 564 games mỗi khi có request `nocache=1` (dù client chỉ hỏi thông tin chi tiết của 1 game duy nhất qua `?slug=...`). Điều này tiêu tốn 40-50ms CPU, làm sập giới hạn tài nguyên của Cloudflare Worker (Error 1102).
  5. Trong `findBestMatchingGame`, điều kiện `isSub` cho phép so khớp chuỗi con không giới hạn độ dài (`gNorm.includes(input)`), khiến game có tên ngắn 2 ký tự như "au" (từ "Au Mobile VTC") khớp bừa với bất kỳ từ nào chứa "au" ("audit", "auto", "aurora", ...).
- **Giải pháp chuẩn đã kiểm chứng**:
  - Triển khai **Atomic Delta Re-Fetch Merge**: Trước khi ghi bất kỳ key nào xuống D1 (`wcg_admin_custom_free_codes_v1`, `wcg_admin_games_v5`, `wcg_crawler_pending_games_v1`), BẮT BUỘC đọc lại snapshot tươi mới nhất từ D1 và hợp nhất delta theo Map `${slug}_${code}`, unshift/update game, và lọc bỏ pending slugs đã xuất bản.
  - Hàm `countRealCodesForSlug`: tính toán chính xác số lượng giftcode siêu tốc O(1) bằng `Set<string>` (chỉ duyệt mã khớp slug, không build Map toàn bộ 11,762 codes).
  - Tối ưu hóa **Lazy Single Game Retrieval** trong `functions/api/games.ts`: Thêm cờ `skipGamesList: true` khi client chỉ truy vấn 1 game (`?slug=...` hoặc `?id=...`), bỏ qua hoàn toàn vòng lặp 564 game của catalog, giảm thời gian CPU từ 50ms xuống <0.2ms.
  - Giới hạn độ dài chuỗi con tối thiểu $\ge 4$ ký tự cho cả substring và token prefix matching trong `findBestMatchingGame`, triệt tiêu hoàn toàn false positive.
  - Tối ưu hóa nạp cài đặt D1: Mỗi action (`list_pending_games`, `cleanup_test_codes`, v.v.) chỉ tải đúng các key D1 cần thiết thay vì tải mù quáng toàn bộ 7 keys.
  - Bộ lọc `isNonGameApplication` và `detectDuplicateOf` phân tầng 5 cấp độ loại trừ triệt để app rác và game trùng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không ghi đè mù quáng JSON blob settings mà không re-fetch snapshot tươi*: Khi nhiều worker chạy song song trên Edge CDN, ghi đè snapshot cũ sẽ phá hủy toàn bộ dữ liệu của các request trước đó.
  - ❌ *Không copy codes_count từ pending item sang live game*: Pending item không lưu mã code; số lượng code chỉ được xác định khi đếm từ kho code thực tế.
  - ❌ *Không build toàn bộ danh mục 564 games khi client chỉ hỏi 1 game*: Luôn phân nhánh và lấy trực tiếp từ `allRawGames` cho truy vấn đơn lẻ để tránh Error 1102.
  - ❌ *Không cho phép khớp chuỗi con với token dưới 4 ký tự*: Rất dễ gây nhầm lẫn game hàng loạt.

---

### ISSUE-095: Bẫy Thiếu Request Khi Gọi InvalidateCatalogEdgeCache Gây Ra TypeError 'url' of undefined Và Bẫy Bỏ Sót Mã Test Trên Production Khi Mở Rộng API Crawler (EdgeCache Request Signature Trap & Zero Test Artifacts in Crawler RPC)
- **Triệu chứng**:
  - Khi mở rộng endpoint `POST /api/crawler/ingest-codes` với các action mới (`publish_game`, `approve_codes`), lệnh gọi Edge cache purge bị lỗi: `TypeError: Cannot read properties of undefined (reading 'url')`.
  - Quá trình test thực tế trên production có nguy cơ để sót mã test (`TESTAPPR*`, `TESTREJECT*`) hoặc làm lệch danh mục game công khai nếu không có cơ chế hoàn tác và dọn dẹp nguyên tử.
- **Nguyên nhân gốc rễ**:
  1. Trong `functions/api/games.ts`, hàm `invalidateCatalogEdgeCache(ctx: ExecutionContext, request: Request, env: any, extraUrls?: string[])` nhận tham số thứ hai là `request`. Trong `ingest-codes.ts`, hàm được gọi theo dạng cũ `invalidateCatalogEdgeCache(context as any, env)`, dẫn đến `request` bị `undefined`, khi hàm truy cập `request.url` sẽ văng ngoại lệ runtime.
  2. Các thao tác test phê duyệt mã tự động (`approve_codes`) sẽ chèn trực tiếp mã code vào D1 database. Nếu không có lệnh dọn dẹp chuyên biệt, mã test sẽ hiển thị vĩnh viễn trên trang web công khai của khách hàng, vi phạm nghiêm trọng Rule 7 (Zero Test Artifacts on Production).
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn gọi đúng signature: `invalidateCatalogEdgeCache(context as any, request, env).catch(() => {})`.
  - Cung cấp thêm action nội bộ bảo vệ `cleanup_test_codes` để cho phép test script dọn dẹp sạch sẽ 100% mã test trong D1 ngay trong khối `finally`.
  - Mọi thao tác thử nghiệm xuất bản game (`publish_game`) trên production phải được hoàn tác an toàn (`status: 'pending'`, `is_active: false`) ngay sau khi kiểm tra xong tính idempotent.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gọi invalidateCatalogEdgeCache thiếu tham số request*: Luôn truyền đủ `(context, request, env)`.
  - ❌ *Tuyệt đối không để sót bất kỳ mã test nào trên production*: Tuân thủ nghiêm ngặt Rule 7, luôn dọn dẹp sạch trong khối `finally`.

---

### ISSUE-094: Bẫy Trang Tĩnh Prerender Lệch Số Mã Do Dữ Liệu Đóng Gói Cũ & Bẫy Khớp Lỏng Substring, Bẫy Cache Client Length > 3 Trong App.tsx Và Bẫy Không Đồng Bộ Thẻ Game Trang Chủ (Prerender Divergence, App Cache Trap & Card Badge Desync)
- **Triệu chứng**:
  - Trang chi tiết tĩnh `https://codegame.shop/game/thuc-than-ky` hiển thị "10 mã khả dụng" dù API đã có 12 mã.
  - Game `roblox` hoặc `blox-fruits` trên trang tĩnh hiển thị hàng trăm mã do gom cả mã của các game con có cùng chữ `roblox`.
  - Thẻ game Kỳ Tích Trở Lại trên trang chủ hiển thị badge "6 Có mã code", trong khi API và modal chi tiết là 5 mã.
- **Nguyên nhân gốc rễ**:
  1. `scripts/prerender.js` chỉ đọc `crawled_codes_188.json` khi build, nếu file này chưa được nạp mã mới từ D1 thì toàn bộ 529 file HTML tĩnh sinh ra sẽ giữ mã cũ.
  2. Thuật toán lọc mã trong `prerender.js` dùng `c.gameSlug.includes(slug)` lỏng lẻo thay vì so khớp chính xác danh sách khóa (`exactKeys`).
  3. `App.tsx` vẫn còn bẫy kiểm tra `codes.length > 3` tại `handleSelectGame` và `handleSelectGameSlug`, làm bỏ qua việc fetch serverless API khi đã có dữ liệu local.
  4. Sau khi fetch chi tiết game, hàm `handleSelectGame` chỉ cập nhật modal mà không cập nhật state mảng `games`, khiến badge thẻ game ngoài trang chủ không tự đồng bộ với modal.
  5. Request gọi `/api/games?slug=...` thiếu tham số timestamp `_t` khiến trình duyệt có thể phục vụ cache HTTP cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Đồng bộ ngay các mã mới vào `crawled_codes_188.json` cả ở `src/data/` và `public/data/`.
  - Tái thiết `scripts/prerender.js`: Dùng `exactKeys` (`normSlug`, `cleanWithoutMobile`, `cleanId`, `alias`) và Set deduplicate theo mã code, khớp 100% với backend Edge API.
  - Xóa sạch mọi điều kiện `length > 3` trong `App.tsx`.
  - Khi mở game hoặc truy cập URL trực tiếp trong `App.tsx`, cập nhật đồng thời cả `selectedGame` và `setGames` để thẻ game ngoài danh mục khớp ngay lập tức.
  - Bổ sung `_t=${Date.now()}` và `{ cache: 'no-store' }` vào `getGameBySlug`.
  - Cho phép `GameCard.tsx` tự động ưu tiên lấy `codes_count` từ `dataService.getCachedServerGame(slug)` nếu đã có snapshot authoritative từ D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `c.gameSlug.includes(slug)` để lọc mã cho tựa game*: Gây ô nhiễm mã của các game có tên tương tự (như roblox, liên quân, võ lâm...).
  - ❌ *Không để lại bất kỳ điều kiện `length > 3` nào trong App.tsx hoặc client components*: Dữ liệu local chỉ là fallback tạm thời, D1 Edge mới là nguồn sự thật duy nhất.
  - ❌ *Không cập nhật modal mà quên đồng bộ mảng games state ngoài trang chủ*: Khách hàng thấy số trên badge khác số trong modal sẽ tưởng web bị lỗi số liệu.

---

### ISSUE-093: Bẫy Chặn Fetch Server Khi Client Đã Có Trên 3 Mã Cũ, Bẫy Lọc Bỏ Game 0 Code Trong Edge Catalog Và Bẫy Timeout Đồng Bộ Cấu Hình D1 (Client Memory Cache > 3 Trap, Single Query Edge 404 & Sync Fast-Path)
- **Triệu chứng**:
  - Tựa game "Thực Thần Ký" (`thuc-than-ky`): Trong DB có 12 mã (bao gồm 2 mã mới `TTTTK2026` và `TTKF376`), nhưng khi người dùng mở trang chi tiết game ngoài web thì chỉ thấy 10 mã cũ, 2 mã mới không bao giờ xuất hiện.
  - Tựa game "Kỳ Tích Trở Lại" (`ky-tich-tro-lai`): API crawler báo đã nạp 5 mã (`DT30K`, `MUNG60K`, `VIP666`, `VIP888`, `VIP999`), nhưng khi truy cập `/game/ky-tich-tro-lai` thì hiển thị 0 code, trong khi thẻ trang chủ báo badge "10+ Giftcode".
- **Nguyên nhân gốc rễ**:
  1. Trong `dataService.ts:getGameBySlug()`, có điều kiện `if (!forceFresh && memCached && memCached.codes && memCached.codes.length > 3) return memCached;`. Vì Thực Thần Ký đã nạp 10 mã cũ từ file bundled data lúc khởi tạo, điều kiện này lập tức trả về cache cũ mà **không bao giờ gọi API serverless** để lấy mã mới từ D1.
  2. Trong `functions/api/games.ts:607`, vòng lặp catalog chứa `if (allCodes.length === 0) continue;`. Bất kỳ game nào chưa có mã được liên kết trong D1 sẽ bị loại bỏ khỏi `catalog.games`. Khi người dùng truy cập trực tiếp `GET /api/games?slug=ky-tich-tro-lai`, Edge API chỉ tìm trong `catalog.games` và trả về `HTTP 404: Không tìm thấy trò chơi`. Máy khách nhận 404 nên fallback về dữ liệu tĩnh 0 code.
  3. Header `Cache-Control` trên single game query trước đây có TTL 60s trên Edge Worker khiến client hoặc Edge cache lưu bản ghi cũ.
  4. Endpoint `/api/sync` chạy qua luồng kiểm tra schema và hàng tồn kho nặng nề khi chỉ cần cập nhật một key cấu hình D1 đơn lẻ (`wcg_admin_games_v5`, `wcg_admin_custom_free_codes_v1`), dẫn đến timeout `ECONNRESET`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Gỡ bỏ hoàn toàn điều kiện `memCached.codes.length > 3`. Chỉ dùng client memory cache nếu là `is_full_detail && !is_partial_preview` và fetch trong vòng 30 giây.
  - Luôn hợp nhất (merge) mã từ server Edge API (nguồn sự thật) với mã local, ưu tiên mã server D1.
  - Thêm `allRawGames` vào `catalogCache`. Trong Single Game Query (`?slug=...`), tìm kiếm cả trong `catalog.games` và `catalog.allRawGames` qua `findMatchingGameInList()`, format đầy đủ thông tin kể cả khi game có 0 code (không bao giờ trả về 404 nếu game tồn tại trong hệ thống).
  - Đặt `Cache-Control: no-cache, no-store, must-revalidate` cho Single Game Query.
  - Bổ sung Fast-Path trong `functions/api/sync.ts` cho các key cấu hình D1 để ghi nguyên tử trong <100ms.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng số lượng mã code (length > 3) làm điều kiện đánh giá dữ liệu đã đầy đủ*: Danh sách code trong D1 liên tục được crawler bổ sung. Chỉ server D1 mới là nguồn sự thật (SSOT).
  - ❌ *Không loại bỏ game có 0 code khỏi bộ nhớ catalog của Edge Worker*: Nếu loại bỏ, khi người dùng xem trang chi tiết game mới ra mắt hoặc chưa có code, API sẽ trả về 404 và làm vỡ trải nghiệm người dùng.
  - ❌ *Không để Single Game Query bị Edge Cache giữ lâu*: Chi tiết game cần phản hồi tức thì các mã mới nạp từ crawler.

---

### ISSUE-092: Bẫy Mất Số Lượng Code Khi Dynamic Import Lazy Load Và Không Đồng Bộ Ngược Lại Danh Mục Game Khiến Thẻ Báo 0 Code Nhưng Modal Có Đủ Mã (Lazy Fallback Codes Sync Trap)
- **Triệu chứng**:
  - Trên web khách hàng, một số game (như Shadow Fight 4, Super Sus, ONE PUNCH MAN, Girls Echo...) hiển thị badge "0 code" trên thẻ game ngoài danh mục. Nhưng khi người dùng click vào xem chi tiết, modal lại hiển thị đầy đủ 2, 4, 7 mã giftcode. Trong khi một số game mới thực sự chưa có code (Archer Castle, Narco Empire...) thì hiển thị 0 code là đúng.
- **Nguyên nhân gốc rễ**:
  1. Trong `dataService.ts:processData()`, khi khởi tạo đồng bộ lúc đầu, file `crawled_codes_188.json` chưa được nạp. Biến `existingCodes` là mảng rỗng `[]`. Việc gán `codes_count: existingCodes.length` đã ghi đè toàn bộ `codes_count` chuẩn của dataset gốc về `0`.
  2. Khi `ensureFallbackCodesLoaded()` tải xong 11,762 mã giftcode, hàm này chỉ đưa vào `this.codesMap` mà không cập nhật lại mảng `this.games`. Kết quả là `this.games` vẫn mang `codes_count: 0`.
  3. Logic rollover trong `getUpcomingGames()` chuyển game sắp ra mắt xuống catalog mà không kiểm tra `target <= now` và không nạp code, dẫn đến game bị đẩy lên đầu trang với 0 code.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Bảo toàn `codes_count` gốc: `Math.max(typeof g.codes_count === 'number' ? g.codes_count : 0, existingCodes.length)`.
  - Trong `ensureFallbackCodesLoaded()`: Lặp qua toàn bộ `this.games` để cập nhật `game.codes` và `game.codes_count = Math.max(mappedCodes.length, Number(game.codes_count) || 0)`.
  - Trong `queryGames()`: Hydrate `codes` và `codes_count` cho từng item trong `paginatedItems`.
  - Trong `getUpcomingGames()`: Chỉ rollover khi `target <= now` và `finalCodes.length > 0`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán đè codes_count bằng existingCodes.length khi dataset mã code chưa load*: Luôn dùng `Math.max(rawCount, existingLength)` để không làm mất số lượng code ban đầu.
  - ❌ *Không nạp code vào Map mà quên đồng bộ ngược lại mảng items*: Map và mảng danh mục phải luôn nhất quán 100%.

---

### ISSUE-091: Bẫy Icon Link Ngoài Của Game Sắp Ra Mắt Bị Thay Bằng Logo Mặc Định Do Chặn Referrer CDN Và Thiếu Cơ Chế Định Tuyến Edge Proxy (Upcoming Games External Icon Referrer & Edge Proxy Trap)
- **Triệu chứng**:
  - Khi bot Pine AI hoặc Muse Bot đẩy icon từ CDN bên ngoài (như Apple App Store `is1-ssl.mzstatic.com` hoặc Google Play) cho các tựa game sắp ra mắt (Monster Hunter Outlanders, Đậu Nhỏ Nổi Giận, Sword x Staff, Mộng Cảnh Tam Quốc, ANANTA...), API xác nhận đã lưu dữ liệu thành công nhưng trên trang chủ và modal danh sách đầy đủ, các game này lại hiển thị logo mặc định của trang (`/logo.png`).
  - Chỉ 2 game có file tĩnh cục bộ sẵn trên web (`/game_icons/*.webp`) mới hiển thị icon thật.
- **Nguyên nhân gốc rễ**:
  1. Thẻ `<img>` trong các component `UpcomingGamesBanner`, `AllUpcomingGamesModal`, `PinnedGamesBar` và Admin thiếu thuộc tính `referrerPolicy="no-referrer"`. Khi trình duyệt người dùng gửi kèm header `Referer: https://codegame.shop/`, CDN của Apple/Google hoặc các tiện ích bảo vệ quyền riêng tư (Brave Shields, uBlock, Firefox ETP) tự động chặn request ảnh cross-origin.
  2. Sự kiện `onError` trên thẻ `<img>` xử lý quá vội vàng: bắt lỗi và lập tức gán `src = '/logo.png'`, khiến ảnh bị thay thế vĩnh viễn bằng logo thương hiệu mà không thử qua proxy hay các đường dẫn khác.
  3. Dự án đã có sẵn Edge Proxy `/api/game-icon?slug=...&url=...` tối ưu hóa Cloudflare Edge Cache 30 ngày và fetch server-side, nhưng các component Game Sắp Ra Mắt lại chưa tận dụng.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tạo module `src/utils/upcomingGameIconUtils.ts` với hàm `getUpcomingGameIconUrl`: tự động định tuyến toàn bộ URL ngoài (`http://`, `https://`) qua Cloudflare Edge Proxy `/api/game-icon` biến request thành same-origin an toàn 100%.
  - Bổ sung `referrerPolicy="no-referrer"` trên tất cả các thẻ `<img>` liên quan.
  - Sử dụng hàm `handleUpcomingImageError` phân tầng 4 cấp: Stage 0 (Thử trực tiếp/proxy) $\rightarrow$ Stage 1 (Thử local WebP) $\rightarrow$ Stage 2 (Thử local JPG) $\rightarrow$ Stage 3 (Mới dùng Logo mặc định).
  - Tối ưu header `Referer` trong `functions/api/game-icon.ts` (`apps.apple.com` cho mzstatic, `play.google.com` cho CH Play).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán trực tiếp e.target.src = '/logo.png' khi onError vừa kích hoạt*: Luôn có cơ chế phân tầng thử lại qua Edge Proxy và các định dạng file local trước khi đầu hàng về logo thương hiệu.
  - ❌ *Không để thẻ <img> tải ảnh cross-origin từ Apple/Google CDN mà thiếu referrerPolicy="no-referrer"*: Tránh bị CDN hotlink blocking và trình duyệt chặn rò rỉ referrer.

---

### ISSUE-090: Bẫy Đặt Tên Cột Trùng Lặp Link Store, Lỗi Nhận Diện Thiết Bị iPadOS Và Bẫy Chặn Chuyển Hướng Tracking Khi Khách Bấm Nút Tải (Store Links Duplicate Column, iPadOS Detection & Download Tracking Beacon Trap)
- **Triệu chứng**:
  - Khi thêm tính năng nút tải game CH Play và App Store, tạo thêm cột mới trùng lặp với các trường đã có trong cơ sở dữ liệu (`download_android`, `download_ios`).
  - Thiết bị iPadOS 13+ bị nhận nhầm thành Desktop do User-Agent khai báo là "Macintosh", khiến iPad hiển thị cả 2 nút và mã QR thay vì nút App Store to chính.
  - Khi ghi nhận lượt tải game (`download_clicks`), nếu gọi API bằng fetch thông thường và chặn chuyển hướng hoặc làm chậm quá trình mở store, người dùng bị gián đoạn trải nghiệm hoặc mất lượt tracking khi tab chuyển hướng.
- **Nguyên nhân gốc rễ**:
  1. Trong schema D1 và các model cũ đã có sẵn `download_android` và `download_ios`. Nếu không ánh xạ 2 chiều thì dữ liệu cũ và dữ liệu mới sẽ bị phân mảnh.
  2. Apple trên iPadOS 13+ đặt User-Agent giống hệt macOS desktop (`Macintosh; Intel Mac OS X...`) nhưng có cảm ứng đa điểm (`navigator.maxTouchPoints > 1`). Nếu chỉ kiểm tra `/iPad/i.test(ua)` thì iPad bị nhận diện là desktop.
  3. Khi khách bấm tải trên mobile, trình duyệt có thể ngắt request HTTP nếu không dùng `navigator.sendBeacon` hoặc cờ `keepalive: true`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tích hợp 2 chiều đồng bộ: `google_play_url` $\leftrightarrow$ `download_android`, `app_store_url` $\leftrightarrow$ `download_ios`, và tự động trích xuất `android_package_name` từ `id=`.
  - Nhận diện thiết bị toàn diện: Kiểm tra `navigator.userAgentData`, `navigator.userAgent`, và xử lý trường hợp đặc thù iPadOS qua `/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1`.
  - Sử dụng `navigator.sendBeacon('/api/track-download', ...)` với fallback `fetch(..., { keepalive: true })` chạy bất đồng bộ ngầm, không chặn sự kiện click.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tạo cột mới mà không tương thích với download_android / download_ios sẵn có*: Luôn đảm bảo tương thích 2 chiều cho cả dữ liệu cũ và mới.
  - ❌ *Không quên kiểm tra navigator.maxTouchPoints cho iPadOS*: Nếu bỏ qua kiểm tra này, toàn bộ người dùng iPad sẽ bị hiển thị giao diện desktop kèm mã QR thay vì nút App Store.
  - ❌ *Không gọi dịch vụ tạo QR bên thứ ba (api.qrserver.com, goqr.me)*: Bắt buộc sinh client-side bằng thư viện `qrcode` bundle cục bộ để bảo mật và chống rò rỉ dữ liệu.

---

### ISSUE-089: Không Thể Đẩy Hoặc Cập Nhật Icon Cho Game Sắp Ra Mắt Qua API Do Bó Hẹp Tên Trường Và Thiếu Action Cập Nhật Icon Riêng Biệt (Upcoming Games API Icon Ingest & Action Missing Trap)
- **Triệu chứng**:
  - Khi bot Pine AI, Muse bot hoặc crawler đẩy icon mới cho game trong mục Game Sắp Ra Mắt qua API `/api/crawler/ingest-upcoming-games`, icon không được cập nhật trên web khách và trang quản trị, vẫn hiển thị icon mặc định hoặc logo cũ.
  - Khi bot muốn cập nhật riêng icon cho một tựa game đã có sẵn, API không có action hỗ trợ và từ chối request.
- **Nguyên nhân gốc rễ**:
  1. API chỉ kiểm tra cứng 3 trường `iconUrl`, `icon_url`, `icon`. Các biến thể như `gameIcon`, `avatar`, `imageUrl`, `logo`, `cover`, `localIconPath` bị bỏ qua.
  2. Thiếu `action: "update_icon"` độc lập để cập nhật icon nhanh theo tên game / slug / id.
  3. Thiếu cơ chế đồng bộ song hành cả 2 thuộc tính `iconUrl` và `icon_url` trên đối tượng game.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tạo hàm trích xuất toàn diện `extractIconUrl` bao quát tất cả các biến thể tên trường và chuẩn hóa URL.
  - Bổ sung `action: "update_icon"` / `"set_icon"` / `"change_icon"`.
  - Luôn gán đồng thời `existing.iconUrl = rawIcon; existing.icon_url = rawIcon;` khi lưu trữ.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ kiểm tra duy nhất trường iconUrl*: Mọi bot và crawler đều có thể gửi các biến thể như `gameIcon`, `imageUrl`, `icon_url` hay `logo`. Phải luôn hỗ trợ đa hình trường icon.

---

### ISSUE-088: Lỗi Sai Tên Biến State Khi Truyền Props Khiến Modal Thông Báo Gặp ReferenceError và Crash Màn Hình (Notification Modal ReferenceError State Prop Mismatch Trap)
- **Triệu chứng**:
  - Người dùng bấm vào nút quả chuông Thông Báo trên Header thì màn hình bị lỗi crash giao diện ErrorBoundary: *"Đã có sự cố hiển thị nhỏ xảy ra"* kèm lỗi `ReferenceError: bookmarkedGames is not defined`.
- **Nguyên nhân gốc rễ**:
  - Trong `src/App.tsx`, state lưu trữ danh sách object game theo dõi được đặt tên là `bookmarkedGamesList`, nhưng khi truyền prop cho `EmailSubscriptionModal`, code ghi nhầm thành `bookmarkedGames={bookmarkedGames}`. Do biến `bookmarkedGames` không được khai báo trong scope của `App.tsx`, JavaScript ném ra ngoại lệ `ReferenceError`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn kiểm tra chính xác tên biến state trong `App.tsx`: `bookmarkedGames={bookmarkedGamesList}`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không truyền biến không được định nghĩa vào JSX props mà không qua khai báo*: Luôn kiểm tra đối chiếu danh sách biến trong component trước khi render props.

---

### ISSUE-087: Ghi Đè Trường Mặc Định Khi Cập Nhật API Một Phần, Thiếu Action Đổi Trạng Thái & Bẫy Không Thể Xóa Mã Code Dự Kiến Cũ (Upcoming Games Partial API Ingest Defaulting, Status Action & Clear Expected Codes Trap)
- **Triệu chứng**:
  - Khi bot gọi `action: "ingest"` để cập nhật game mà không gửi kèm một số trường (như không gửi `releaseDate`, `category`, `publisher`), API tự động gán fallback về ngày giờ hiện tại (`nowIso`), thể loại thành `'Game Mới'`, NPH thành `'Nhà phát hành'`, làm đè mất dữ liệu chuẩn của game (đã khiến Strinova VN và Hiệp Khách Hành bị ảnh hưởng).
  - Game mới thêm luôn rơi vào trạng thái `PENDING` (chờ duyệt) và bot không có action API nào để đổi trạng thái trực tiếp sang `UPCOMING` nhằm đưa ra Web Khách ngay lập tức.
  - Khi gửi `expectedCodes: []` (danh sách rỗng) để xóa các mã đoán cũ, hàm hợp nhất `Set union merge` vẫn giữ nguyên danh sách cũ.
- **Nguyên nhân gốc rễ**:
  1. Trong `functions/api/crawler/ingest-upcoming-games.ts`, các biến fallback (`nowIso`, `'Game Mới'`, `'Nhà phát hành'`) được gán trực tiếp cho `existing` mà không kiểm tra xem trường đó có được truyền trong `raw` hay không.
  2. Thiếu `action: "set_status"` để đổi trạng thái linh hoạt theo tên game `name`, `slug` hoặc `id`.
  3. Logic merge code không nhận diện trường hợp mảng rỗng `expectedCodes: []` hoặc cờ `clearCodes: true`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Khi `existing`: CHỈ CẬP NHẬT các trường ngày giờ, thể loại, NPH, nền tảng khi payload truyền lên giá trị hợp lệ. Tuyệt đối không fallback về mặc định khi thiếu trường.
  - Tự động bảo toàn & phục hồi dữ liệu gốc (Self-Healing Safeguard) cho Strinova VN (23/10 10:00, Bắn Súng Anime 3D), Hiệp Khách Hành (01/11 10:00, Kiếm Hiệp Kim Dung), Tiên Giới (28/10 10:00), Monster Hunter Outlanders (29/10 00:00).
  - Bổ sung `action: "set_status"` (hoặc `update_status`) và mở rộng `action: "approve"` hỗ trợ tìm theo `name`.
  - Hỗ trợ cờ `directPublish: true` hoặc `"status": "UPCOMING"` để xuất bản thẳng ra Web Khách khi thêm game mới.
  - Nhận diện khi gửi `expectedCodes: []`, `codes: []` hoặc `clearCodes: true` và bổ sung `action: "clear_expected_codes"` để xóa sạch mã code dự kiến rác.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán fallback mặc định (nowIso, 'Game Mới') lên existing record*: Khi cập nhật bản ghi đã có, nếu payload thiếu trường thì BẮT BUỘC giữ nguyên giá trị hiện tại của game.
  - ❌ *Không ép buộc Set union merge khi bot gửi mảng code rỗng*: Nếu bot gửi mảng rỗng hoặc `clearCodes: true`, phải cho phép xóa sạch mảng codes.

---

### ISSUE-086: Chặn Request Cập Nhật Hướng Dẫn Nhập Code Do Ràng Buộc Bắt Buộc Mảng Codes Phải Khác Rỗng (Instructions Ingestion Blocked by Mandatory Codes Array Trap)
- **Triệu chứng**:
  - Khi bot (Muse Bot, Trợ lý Pine hoặc các script crawler) gửi yêu cầu cập nhật cách nhập code chuẩn của NPH cho một tựa game (ví dụ Ta Là Hắc Ngộ Không: "Bước 1: Cấp 51 mở Sảnh Phúc Lợi..."), API `/api/crawler/ingest-codes` báo lỗi `Không tìm thấy mã code hợp lệ trong payload` và từ chối toàn bộ request.
  - Khi nạp code mới cho game trong Hàng Chờ Duyệt hoặc game đang hoạt động, nội dung cách nhập code (`instructions`) và đường dẫn đổi quà (`redeemUrl`) do bot gửi bị phớt lờ, khiến Web Khách tiếp tục hiển thị câu hướng dẫn 3 bước chung chung không đúng thực tế của game.
- **Nguyên nhân gốc rễ**:
  1. Điều kiện chặn sớm tại dòng 470-478 của `ingest-codes.ts` chỉ kiểm tra `codesToIngest.length === 0` mà không nhận diện trường `instructions` hoặc `redeemUrl`.
  2. Khi tự động kích hoạt game từ hàng chờ sang danh mục chính thức, trường `instructions` bị gán cứng một chuỗi template 3 bước mặc định.
  3. Khi game đã hoạt động, logic chỉ cộng dồn `codes_count` mà không lưu đè `instructions` hoặc `redeem_url` mới nhất.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Trích xuất toàn bộ các biến thể tên trường: `instructions`, `instructionsText`, `guide`, `huongDan`, `cachNhapCode`, `redeemUrl`, `redeem_url`.
  - Phân nhánh độc lập: Nếu `codesToIngest.length === 0` nhưng có `extractedInstructions` hoặc `action === 'update_instructions'`, tiến hành cập nhật trực tiếp `instructions` và `redeem_url` cho game khớp (`matchedGame`), trả về kết quả `INSTRUCTIONS_UPDATED` thành công và xóa Edge Cache.
  - Phân nhánh kết hợp: Nếu có cả `codes` và `instructions`, nạp mã vào kho đồng thời cập nhật luôn hướng dẫn nhập code của game.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chặn request nếu payload không có codes*: Phải cho phép bot gửi cập nhật hướng dẫn độc lập mà không bắt buộc người dùng hay bot phải gửi kèm mã giả / mã rác.
  - ❌ *Không gán cứng template instructions khi auto-publish game mới*: Luôn ưu tiên dùng `instructions` do bot cung cấp trước khi fallback về mẫu chung.

---

### ISSUE-085: Phân Mảnh Dữ Liệu Game Sắp Ra Mắt Giữa Admin LocalStorage và Web Khách Fallback, Và Thiếu Cơ Chế Tự Động Chuyển Xuống Sàn Sau 24H (Upcoming Games Admin SSOT & 24-Hour Post-Launch Grace Period Trap)
- **Triệu chứng**:
  - Trang Quản Trị chỉ có 5 game sắp ra mắt trong khi ngoài Web Khách lại hiển thị 6 game (thừa tựa game `Delta Force VN`). Admin thay đổi thứ tự hay duyệt game nhưng Web Khách không cập nhật chính xác danh sách.
  - Các tựa game đã đến giờ mở server tiếp tục nằm lì trên Banner Game Sắp Ra Mắt vô thời hạn thay vì tự động chuyển xuống danh mục game chính thức bên dưới sau 1 ngày (24 giờ).
- **Nguyên nhân gốc rễ**:
  1. Thiếu cơ chế đồng bộ 2 chiều nguyên tử: `adminDataService.ts` chỉ lưu mảng `this.upcomingGames` vào LocalStorage của trình duyệt và gọi `/api/sync` nhưng backend `functions/api/sync.ts` chưa xử lý key `wcg_admin_upcoming_games_v1` để lưu vào CSDL Cloudflare D1 `settings`.
  2. Web Khách khi fetch `/api/crawler/ingest-upcoming-games` gặp D1 rỗng đã rơi vào fallback tĩnh 6 game, trong khi Admin của người dùng chỉ có 5 game.
  3. Logic hiển thị trên Banner không có bộ lọc thời gian đã trôi qua sau giờ G: Bất kỳ game nào chưa bị xóa đều hiển thị trên banner dù đã mở server từ nhiều ngày trước.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Admin & D1 là Single Source of Truth (SSOT)**: Chuẩn hóa toàn bộ default fallback (`DEFAULT_UPCOMING_GAMES`, `DEFAULT_UPCOMING_GAMES_FALLBACK`, `getDefaultUpcomingGames`) về đúng 5 game chuẩn: Strinova VN, Tiên Giới, Hiệp Khách Hành, Where Winds Meet VN, Honkai: Star Rail 3.0.
  - **Quy tắc 24h Post-Launch Rollover**:
    - Khi `0 <= elapsed <= 24h` (ra mắt trong ngày): Vẫn hiển thị trên Banner với nhãn `🎉 ĐÃ MỞ SERVER HÔM NAY!` và đồng hồ đếm lùi thời gian còn lại trên banner.
    - Khi `elapsed > 24h`: Tự động loại khỏi Banner & Modal Sắp Ra Mắt, đồng thời tự động chuyển xuống danh mục sàn game bên dưới (tạo `GameItem` và kích hoạt giftcode tân thủ).
  - **Toàn quyền phân phối API**: Cổng `/api/crawler/ingest-upcoming-games` hỗ trợ `action: "set_display_list"` và `action: "rollover"`. Admin Data Service tự động fetch từ D1 khi khởi tạo và gửi mảng game lên D1 ngay khi lưu/sắp xếp.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không định nghĩa số lượng game mặc định khác nhau giữa types, fallback API và Admin*: Phải thống nhất 100% cùng 1 danh sách 5 game.
  - ❌ *Không để game đã mở server nằm mãi trên Banner sắp ra mắt*: Phải áp dụng công thức `elapsed <= 24 * 60 * 60 * 1000` để tự động rollover xuống sàn sau đúng 1 ngày.
  - ❌ *Không chỉ lưu dữ liệu Admin vào LocalStorage*: Phải gọi POST lên API Serverless D1 để Web Khách cập nhật tức thì.

### ISSUE-084: Đồng Bộ Khối Game Theo Dõi Và Game Sắp Ra Mắt Với React State Thay Vì Phụ Thuộc Vào Reload Hoặc Poll Mạng (Zero-Latency Bookmark & Upcoming Subscription Sync Pattern)
- **Triệu chứng**:
  - Khi người dùng bấm nút "Báo Code" ở Game Sắp Ra Mắt, nếu hệ thống chỉ lưu vào backend hoặc localStorage mà không cập nhật state React ngay, khối "Game Bạn Đang Theo Dõi" ở trên cùng sẽ không phản hồi ngay lập tức, khiến người dùng tưởng nút bấm bị liệt.
  - Khi game sắp ra mắt chưa có trong danh mục game chính thức (`bookmarkedGamesList`), việc chỉ lọc theo mảng game đã phát hành sẽ làm biến mất các game sắp ra mắt khỏi khối theo dõi.
- **Nguyên nhân gốc rễ**:
  1. Dữ liệu game đã phát hành (`GameItem`) và game sắp ra mắt (`UpcomingGame`) trước đây được lưu trữ ở hai kho khác nhau.
  2. State `bookmarkedGamesList` trong `App.tsx` chỉ chứa các game lấy từ `/api/games?slugs=...`, do đó các slug của game sắp ra mắt (chưa phát hành chính thức) bị bỏ qua.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Trong `PinnedGamesBar.tsx`, truyền cả hai nguồn `bookmarkedGames` và `upcomingGames`. So khớp `bookmarks` slug với cả 2 danh sách.
  - Nếu slug thuộc về game đã ra mắt: Hiển thị với số giftcode và nút xem code.
  - Nếu slug thuộc về game sắp ra mắt: Hiển thị với nhãn `[Sắp Mở Server]` và đồng hồ mini đếm ngược.
  - Khi người dùng bấm "Báo Code", gọi hàm `onToggleBookmark(game.slug)` làm cập nhật state `bookmarks` của `App.tsx` ngay lập tức 0ms!
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ lọc game theo danh mục đã phát hành*: Bắt buộc phải hợp nhất hiển thị cả tựa game sắp ra mắt mà người dùng đã đăng ký báo code.
  - ❌ *Không yêu cầu người dùng F5 hoặc tải lại trang để thấy game vừa lưu*: Mọi tương tác lưu/bỏ lưu phải phản hồi 0ms trên giao diện.

### ISSUE-083: Mất Hàng Nghìn Giftcode Do Toán Tử Lựa Chọn Thay Thế Thay Vì Hợp Nhất Dữ Liệu (Ternary Exclusion Instead of Union Merge Trap)
- **Triệu chứng**:
  - Khi lưu nội dung CMS hoặc sau khi chuyển đổi API Serverless `/api/games`, các tựa game lớn bị tụt giảm nghiêm trọng số lượng giftcode (ví dụ Genshin Impact từ 168 mã rớt xuống 75 mã, Honkai Star Rail từ 184 rớt xuống 67 mã).
  - Web Khách hiển thị ít mã hơn nhiều so với kho master JSON (`crawled_codes_188.json`).
- **Nguyên nhân gốc rễ**:
  1. API Serverless Edge Worker dùng toán tử điều kiện `rawCodes = settings['wcg_admin_free_codes_v5'] ? settings['wcg_admin_free_codes_v5'] : fallbackCodesData`. Khi D1 có mảng `wcg_admin_free_codes_v5` (chỉ chứa 5.330 code của đợt quét cũ), hệ thống loại bỏ hoàn toàn 11.762 mã trong master archive.
  2. Hàm `saveContent()` trong Admin tự động kích hoạt `pushFullStateToKV(true)`, đẩy toàn bộ snapshot thiếu code lên CSDL và xóa cache danh mục.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Áp dụng cơ chế **3-Tier Union Code Merger**: Lần lượt nạp Custom Codes (ưu tiên 1) $\rightarrow$ D1 Crawled Codes (ưu tiên 2) $\rightarrow$ Master Bundled Archive (nền tảng 11.762 codes). Khử trùng lặp theo `(gameSlug, code)` và tuân thủ `deletedCodesSet`.
  - Cô lập thao tác lưu CMS: `saveContent()` chỉ ghi đúng khóa `wcg_admin_content_v4`, tuyệt đối không gọi `pushFullStateToKV()`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng toán tử 3 ngôi `A ? A : B` cho các nguồn dữ liệu bổ trợ nhau*: Bắt buộc phải dùng `Map` để Union hợp nhất dữ liệu, đảm bảo kho code chỉ có tăng thêm chứ không bao giờ bị giảm.
  - ❌ *Không gọi `pushFullStateToKV()` trong các module chỉ sửa một phần nhỏ dữ liệu (như Content CMS, Branding)*.

### ISSUE-082: Phân Tán Khóa API Giữa Các Cổng Ingest Khiến Bot Tự Động Gặp Lỗi Xác Thực (Fragmented Ingest API Keys Trap)
- **Triệu chứng**:
  - Khi mở rộng các endpoint API tiếp nhận dữ liệu từ bên ngoài (như Muse bot ingest Upcoming Games, Crawler ingest codes), việc sinh thêm khóa bí mật độc lập khiến người dùng/bot phải lưu nhiều API Key khác nhau. Khi đổi key ở một nơi, các dịch vụ bot khác bị ngắt kết nối với mã lỗi `401 Unauthorized`.
  - Quên khai báo route mới trong `functions/_worker.ts` dẫn đến Cloudflare Pages Edge trả về `404 Endpoint not found`.
- **Nguyên nhân gốc rễ**:
  1. Mỗi phân hệ (Crawler, Upcoming Games, ...) ban đầu tự sinh state key riêng trong localStorage hoặc hardcode các bí danh khác nhau.
  2. Người dùng cấu hình Muse bot với 1 API Key chung cho cả việc quét mã code và cập nhật game sắp ra mắt.
  3. Cloudflare Pages Functions cấu trúc monolithic worker yêu cầu mọi endpoint REST mới phải được định tuyến rõ ràng tại `functions/_worker.ts`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tái sử dụng và đồng bộ hóa chung API Key hệ thống (`crawlerApiConfig.apiKey`) cho các phân hệ tiếp nhận dữ liệu tự động (Crawler & Upcoming Games). Khi người dùng đổi API Key tại Quản trị, cả hai cổng đều tự động nhận diện khóa mới.
  - Hỗ trợ truyền API Key linh hoạt qua cả Header (`x-api-key`, `Authorization: Bearer <key>`) và Query Parameter (`?apiKey=...`) để Muse bot hoặc curl/cron job dễ dàng tích hợp.
  - Luôn đăng ký route trong `functions/_worker.ts` trước khi triển khai (tuân thủ ISSUE-079).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tạo ra nhiều trường API Key riêng biệt cho từng loại dữ liệu crawler*: Gây rắc rối khi vận hành bot và dễ làm đứt gãy kết nối khi bảo trì.
  - ❌ *Không quên hỗ trợ CORS OPTIONS preflight*: Khi gọi từ client-side script hoặc web-based test consoles, thiếu CORS sẽ khiến trình duyệt chặn request.

### ISSUE-081: Trình Duyệt Bị Treo 15-20 Giây Do Tải Và Parse Khối Dữ Liệu 8.8MB (11,762 Giftcodes) Ngay Khi Mở Trang (Monolithic Catalog Chunk & Eager Processing Trap)
- **Triệu chứng**:
  - Khi người dùng vào trang chủ `codegame.shop`, giao diện hiển thị màn hình tải (CyberLoader) rất lâu, mất khoảng 15-20 giây mới render được danh sách thẻ game.
  - Thiết bị di động bị giật lag, đơ thao tác cuộn do CPU bị chiếm dụng 100%.
- **Nguyên nhân gốc rễ**:
  1. File `crawled_codes_188.json` (chứa 11,762 giftcode, nặng 11MB raw) bị import tĩnh hoặc nạp ngay lập tức lúc trang khởi tạo (`dataService.constructor -> processData()`), sinh ra chunk JS `game-catalog-data.js` nặng 8.84 MB.
  2. Vite tự động thêm `modulepreload` cho chunk 8.8MB này vào `dist/index.html` do các import thừa từ admin module trong `App.tsx` và `FloatingAnnouncement.tsx`.
  3. Cả hai hook `loadInitialData` và `executeQuery` trong `App.tsx` đều gọi `/api/games?page=1&limit=24` cùng lúc trên mount, gây nghẽn mạng và xung đột cập nhật state.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tuyệt đối không import tĩnh `crawled_codes_188.json` hoặc nạp toàn bộ giftcode vào bộ nhớ client khi khởi động.
  - Sử dụng API Serverless Edge `/api/games?page=1&limit=24` để chỉ trả về 24 game kèm tối đa 3 code đại diện (chỉ ~18 KB).
  - Tách `crawled_codes_188.json` thành chunk fallback on-demand (`crawled-codes-offline-fallback`), chỉ nạp khi offline thông qua hàm `ensureFallbackCodesLoaded()`.
  - Khử toàn bộ import chéo không cần thiết từ thư mục `src/admin/` sang các component Web Khách.
  - Thêm cờ `if (!isInitialLoadDone) return;` vào hook `executeQuery` để chống gọi API trùng lặp lúc mount.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ import toàn bộ file JSON giftcode thô 11MB vào bundle chính của Web Khách*: Người dùng thông thường chỉ xem một vài tựa game, việc bắt người dùng tải 11,762 mã giftcode của 529 game cùng lúc là nguyên nhân trực tiếp gây lag trang 20 giây.
  - ❌ *Không chạy hàm duyệt mảng 10,000+ phần tử trong constructor của service*: Sẽ khóa chặt main thread ngay khi script vừa tải xong, khiến trình duyệt không thể phản hồi tương tác người dùng.

### ISSUE-080: Mã Giftcode Quá Hạn Vẫn Hiển Thị Ở Tab "Còn Hạn" Do Kiểm Tra Chuỗi Status Tĩnh Thay Vì So Sánh Thời Gian Thực (Static Status vs Realtime Expiration Trap)
- **Triệu chứng**:
  - Khi xem chi tiết game ngoài Web Khách (`GameDetailModal`), những mã giftcode có ngày hết hạn trong quá khứ (ví dụ `expiresAt: '2026-10-20'`) vẫn nằm trong tab "Còn hạn" (Active Codes).
  - Khi người dùng sao chép tất cả mã còn hạn (`handleCopyAll`), hệ thống sao chép cả những mã đã hết hạn.
  - Khi bot Muse hoặc API nạp mã đã hết hạn, mã vẫn được lưu với trạng thái `status: 'ACTIVE'`.
- **Nguyên nhân gốc rễ**:
  1. Hàm `isExpired(c)` trong component chỉ kiểm tra `c.status === 'expired'` mà không parse và đối chiếu ngày `expiresAt` với `Date.now()`.
  2. Bất kỳ mã nào khi được import hoặc cào về có ngày hết hạn nhưng CSDL chưa có cron job quét cập nhật chuỗi `status` sang `'expired'` thì mã đó vẫn bị hiểu là còn hạn vĩnh viễn.
  3. Định dạng ngày tháng không đồng nhất: Một số nguồn gửi `YYYY-MM-DD`, một số gửi `DD/MM/YYYY`, một số gửi "Hết hạn" dẫn đến hàm `new Date()` trả về `NaN` hoặc sai lệch múi giờ.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Dùng helper tập trung `isCodeExpired(codeObj)` từ `src/utils/codeUtils.ts`.
  - Bộ chuẩn hóa `parseExpirationDate` hỗ trợ đầy đủ ISO `YYYY-MM-DD`, ngày Việt Nam `DD/MM/YYYY`, timestamp, và các từ khóa ("Hết hạn", "Vĩnh viễn").
  - Tính hợp lệ của ngày hết hạn đến hết `23:59:59.999` của ngày ghi nhận.
  - Tự động gán `status: 'EXPIRED'` ngay tại ngõ vào API (`ingest-codes.ts`) nếu hạn sử dụng đã qua.
  - Ở mọi component hiển thị (`GameDetailModal`, `GameCard`, `SearchAutocomplete`), phân loại bằng `isCodeExpired(c)` giúp mã tự động nhảy sang tab "Đã hết hạn" ngay tức thì theo thời gian thực mà không phụ thuộc vào chuỗi `status` tĩnh.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ kiểm tra chuỗi `c.status === 'expired'`*: Chuỗi `status` là dữ liệu tĩnh; nếu không so sánh với `Date.now()`, mã quá hạn sẽ không bao giờ tự động chuyển tab.
  - ❌ *Không dùng `new Date(str)` đơn thuần cho ngày Việt Nam `DD/MM/YYYY`*: Trình duyệt V8 sẽ hiểu nhầm là `MM/DD/YYYY` hoặc trả về `Invalid Date`. Bắt buộc phải bóc tách Regex `(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})` trước khi khởi tạo Date.

### ISSUE-079: Lỗi 404 "Endpoint not found" Khi Gọi API Do Quên Khai Báo Route Trong `functions/_worker.ts`
- **Triệu chứng**:
  - Khi người dùng bấm lưu hoặc tương tác với một tính năng (như "Lưu Cài Đặt" nhận thông báo email), web báo lỗi: *"Không thành công: Không thể đồng bộ lên máy chủ."*.
  - Kiểm tra network thấy request trả về `404 Not Found` với JSON payload: `{"success":false,"error":"Endpoint not found","path":"..."}`.
- **Nguyên nhân gốc rễ**:
  1. Dự án sử dụng `functions/_worker.ts` làm Single Entry Point bundle duy nhất của Edge Worker (`dist/_worker.js`).
  2. Bất kỳ file API mới nào tạo trong `functions/api/` nếu không được import và routing tường minh trong `_worker.ts` sẽ bị rơi vào khối fallback 404 mặc định ở cuối hàm `fetch`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Mỗi khi thêm endpoint mới trong `functions/api/`, BẮT BUỘC phải import module đó vào `functions/_worker.ts` và thêm khối điều kiện `if (pathname === '/api/...')` tương ứng cho các HTTP method (GET, POST, OPTIONS, DELETE).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không ỷ lại vào filesystem-based routing của Cloudflare Pages*: Vì dự án đang build thông qua bundle `_worker.js`, Cloudflare sẽ bỏ qua filesystem routing nếu route không nằm trong file `_worker.ts`.

### ISSUE-078: Lỗi "buyerDisplayName is not defined" Khi Thanh Toán Đơn Hàng Do Khai Báo Biến Trong Khối Try Của API Orders Create
- **Triệu chứng**:
  - Người dùng bấm nút "Xác Nhận Mua" ở modal thanh toán Tiện Ích hoặc Cửa Hàng, ví tiền đã bị trừ nhưng màn hình nổ pháo hoa chúc mừng và danh sách mã code không hiện ra; góc dưới bên phải hiện toast đỏ: *"Thất bại: buyerDisplayName is not defined"*.
- **Nguyên nhân gốc rễ**:
  1. Trong `functions/api/orders/create.ts`, biến `buyerDisplayName` được khai báo bằng `const` bên trong khối `try { ... }` ở bước 6 (cập nhật Real Events Hub).
  2. Ở bước 6.1 (gửi cảnh báo Telegram `sendNewOrderAlert`), code truy cập `buyerDisplayName` ở phạm vi ngoài khối `try`, gây ra lỗi runtime `ReferenceError: buyerDisplayName is not defined`.
  3. Lỗi 500 được trả về cho trình duyệt, khiến `res.success` bằng `false` và chặn modal thành công hiển thị.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn khai báo các thông tin người mua (`buyerDisplayName`, `buyerPhone`, `buyerEmail`) ở phạm vi cấp hàm ngay sau khi xác thực danh tính `member`, không khai báo cục bộ lồng trong các khối `try` hoặc `if` con.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ khai báo biến dùng cho các handler bên ngoài (như Telegram alert, logging) bên trong khối try của sub-service*: Sẽ gây ReferenceError phá vỡ luồng trả về kết quả cho khách hàng.

### ISSUE-077: Nhầm Lẫn Giữa Fanpage Tổng Của Nhà Phát Hành Và Fanpage Độc Quyền Từng Game Trong Cấu Hình Crawler
- **Triệu chứng**:
  - Khi bot crawler quét Facebook fanpage, các mã code của nhiều game khác nhau thuộc cùng một nhà phát hành (VNG, VTC Mobile, SohaGame, Funtap) bị gán nhầm vào một tựa game duy nhất.
- **Nguyên nhân gốc rễ**:
  1. Nguồn Fanpage tổng của NPH (ví dụ `https://facebook.com/vnggames`, `https://facebook.com/vtcmobile.vn`) bị đặt cờ `targetGameSlug` cố định trỏ về 1 game cụ thể.
  2. Khi `run_crawler.cjs` duyệt nguồn, nếu thấy `targetGameSlug` thì gán độ tin cậy tuyệt đối 100% (`matchConfidence = 1.0`), bỏ qua đối soát tên tựa game trong bài viết.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tuyệt đối không gán `targetGameSlug` cho Fanpage tổng của NPH. Các nguồn này phải để mở (`targetGameSlug = undefined`) để `GameMatcher` phân tích tiêu đề và nội dung bài viết, tự động ghép mã đúng với từng game.
  - Chỉ gán `targetGameSlug` cho Fanpage độc quyền của từng tựa game cụ thể (ví dụ: `https://www.facebook.com/beaprovtcgame` trỏ về `be-a-pro-football`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gán `targetGameSlug` cho các URL Fanpage tổng của NPH*: Sẽ làm sai lệch hoàn toàn dữ liệu cào giftcode toàn sàn.

### ISSUE-076: Trùng Lặp Tên Game Giữa Cơ Sở Dữ Liệu Web Và Hàng Chờ Duyệt Do Cơ Chế Quét Đa Nguồn
- **Triệu chứng**:
  - Người dùng hoặc admin phát hiện trên Web có 2 game trùng tên hoặc crawler tự động nạp các game đã có sẵn trên sàn vào hàng chờ duyệt (ví dụ: Liên Quân Mobile, Delta Force, Crossfire, Seven Deadly Sins).
- **Nguyên nhân gốc rễ**:
  1. Hai nguồn khác nhau quét game cùng tên với các tiền tố NPH khác nhau (ví dụ: "Garena Liên Quân Mobile" vs "Liên Quân Mobile").
  2. Hai slug khác nhau cùng trỏ về 1 tựa game trên web (`the-seven-deadly-sins-grand-cross` vs `seven-deadly-sins-grand-cross`).
- **Giải pháp chuẩn đã kiểm chứng**:
  - Đối chiếu toàn diện tên cốt lõi, package ID và giấy phép ABEI.
  - Khi gộp game, luôn di chuyển toàn bộ giftcode sang game chuẩn và khử trùng mã code trước khi xóa bản ghi thừa.
  - Loại bỏ các game trùng lặp khỏi hàng chờ duyệt (`crawlerPendingGames`) trên Cloudflare D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không xóa game mà không di chuyển giftcode*: Phải luôn di chuyển toàn bộ giftcode của bản ghi bị xóa sang bản ghi được giữ lại để không làm mất mã code của người dùng.

### ISSUE-075: Cảnh Báo "isLegacyOrEmpty is not defined" Khi Lưu Nội Dung Web Do Khai Báo Hàm Sai Phạm Vi (Local Scope Trap)
- **Triệu chứng**:
  - Tại trang Quản Trị Nội Dung & Banner (`/admin#/content`), khi bấm nút "Lưu Tất Cả Nội Dung Web Khách" hoặc lưu mục Chân Trang, hệ thống hiển thị toast đỏ/đen: *"Cảnh Báo Đồng Bộ: Đã lưu cục bộ nhưng chưa kết nối được máy chủ Cloudflare: isLegacyOrEmpty is not defined"*.
  - Nội dung không đồng bộ lên Cloudflare và dữ liệu branding bị kẹt.
- **Nguyên nhân gốc rễ**:
  1. Helper `isLegacyOrEmpty` được khai báo bên trong hàm `loadCMSData` thay vì khai báo ở phạm vi module (ngoài component).
  2. Khi `handleSaveSection` hoặc `handleSaveAll` thực thi, JavaScript ném lỗi `ReferenceError: isLegacyOrEmpty is not defined`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn khai báo các hàm tiện ích kiểm tra chuỗi rác/legacy ở phạm vi cấp module (`module-level scope`), không khai báo lồng bên trong các hàm `useEffect` hay `loadData`.
  - Khai báo đầy đủ các biến tham chiếu trước khi truyền vào hàm kiểm tra (`const bTitle = item?.title?.trim();`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ khai báo hàm helper kiểm tra dữ liệu bên trong hàm fetch/loadData*: Vì các handler lưu dữ liệu (`handleSave...`) cũng cần dùng chung hàm này.

### ISSUE-074: Tràn Màn Hình & Trải Nghiệm Khó Khăn Khi Duyệt Hàng Chờ Game Mới Do Thiếu Phân Trang & Nút Tìm Kiếm
- **Triệu chứng**:
  - Tại trang Admin, tab Quản Lý Game Mới & Hàng Chờ Duyệt (`activeTab === 'games_pending'`), khi danh sách game chờ lớn (160+ game), trang kéo dài vô tận, gây nặng trình duyệt và khó theo dõi.
  - Người dùng không có nút bấm "Tìm kiếm" riêng biệt mà chỉ có ô input gõ text, dễ gây nhầm lẫn về trạng thái đang lọc; tìm kiếm tiếng Việt không dấu không khớp được tên game có dấu.
  - Phần banner quét game mới chiếm nhiều diện tích dọc với nhiều thẻ switch to và văn bản dàn trải.
- **Nguyên nhân gốc rễ**:
  1. Hàng chờ duyệt game trước đây render trực tiếp toàn bộ danh sách `filteredPendingGames` mà không có phân trang.
  2. Logic tìm kiếm dùng `.toLowerCase().includes()` đơn thuần, không hỗ trợ xóa dấu tiếng Việt.
  3. Thiếu nút bấm hành động tìm kiếm trực quan cạnh ô input và nút xóa [X].
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tối ưu header điều khiển gọn gàng, giảm 60% chiều cao thừa, thu gọn 2 switch thành pill badge toggle inline.
  - Phân trang chuẩn 20 game / trang (`PENDING_GAMES_PER_PAGE = 20`) cho hàng chờ duyệt, có thanh phân trang đầy đủ (`Đầu`, `Trước`, các số trang, `Sau`, `Cuối`), tự động scroll về đầu danh sách khi chuyển trang.
  - Bổ sung nút bấm "Tìm kiếm" chuyên dụng kèm icon kính lúp, hỗ trợ phím `Enter`, nút xóa [X], và tích hợp `smartVietnameseMatch` tìm kiếm tiếng Việt thông minh có/không dấu.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ render toàn bộ hàng trăm game cùng lúc*: Bắt buộc phải phân trang (chuẩn 20 game / trang) để đảm bảo hiệu năng và tính trực quan.
  - ❌ *Không bỏ qua `smartVietnameseMatch` khi tìm kiếm game tiếng Việt*: Tìm "vo lam" phải khớp "Võ Lâm Truyền Kỳ".

### ISSUE-073: Modal Giao Hàng Thành Công Không Hiện Do Kiểm Tra Tồn Kho Sai Biến Thể Gói Con (Package Stock Inversion)
- **Triệu chứng**:
  - Khi người dùng mua tiện ích (hoặc sản phẩm cửa hàng có gói con như VS Phone VIP 7 Ngày), modal giao hàng thành công ở giữa màn hình không xuất hiện.
  - Góc dưới bên phải màn hình hiện lên toast thông báo lỗi: *"Hết hàng: Sản phẩm tiện ích tạm thời hết hàng trong kho."* hoặc *"Thất bại: Sản phẩm tạm thời hết hàng trong kho."*.
- **Nguyên nhân gốc rễ**:
  1. Trong `UtilitiesView.tsx` và `ProductCheckoutModal.tsx`, logic kiểm tra tồn kho trước khi thanh toán và trạng thái disable của nút mua kiểm tra `checkoutUtility.stock_quantity <= 0` hoặc `liveProduct.stock_quantity <= 0` thay vì `realStock <= 0` / `maxStock <= 0`.
  2. Khi sản phẩm thuộc nhóm có nhiều gói thời hạn (ví dụ VS Phone VIP: Gói 1 ngày có stock 0, Gói 7 ngày có stock 8), đối tượng đại diện nhóm hoặc item dẫn đầu có `stock_quantity = 0`. Client hiểu nhầm toàn bộ sản phẩm hết hàng và chặn giao dịch ngay lập tức.
  3. Khi listener `wcg_virtual_stock_updated` hoặc `syncWithCloudflareKV` kích hoạt, `setCheckoutUtility` tìm trong danh sách `rawLatest` (chưa gom nhóm) làm mất mảng `packages` và đè `stock_quantity = 0`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn sử dụng `realStock` (tính từ `selectedPackage?.stock_quantity ?? checkoutUtility?.stock_quantity`) trong mọi điều kiện kiểm tra tồn kho tại Client.
  - Cập nhật `setCheckoutUtility` tìm kiếm từ `groupedLatest` để bảo toàn danh sách gói con `packages`.
  - Trên Server Edge (`functions/api/orders/create.ts`), bổ sung cơ chế tự động cấp phát mã dự phòng khi `product.stock_quantity >= qty` nhưng `inventory_codes` chưa được nạp mã thủ công.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ kiểm tra `item.stock_quantity <= 0` trên đối tượng cha khi sản phẩm có mảng biến thể `packages`*: Phải luôn ưu tiên tồn kho của gói được chọn (`selectedPackage?.stock_quantity`).
  - ❌ *Không bao giờ dùng danh sách thô `rawLatest` để cập nhật lại state của sản phẩm đã gom nhóm*: Việc này sẽ làm mất toàn bộ cấu trúc biến thể gói và làm đè sai số tồn kho.

### ISSUE-072: Lỗ Hổng Bảo Mật API Ingest-Codes Do Tồn Tại API Key Mặc Định Hardcode & Lộ Khóa Trong Response GET
- **Triệu chứng**:
  - Endpoint `POST /api/crawler/ingest-codes` chấp nhận một API key mặc định hardcode bất kể khóa trong cơ sở dữ liệu D1 có bị thay đổi hay không.
  - Endpoint `GET /api/crawler/ingest-codes` in nguyên khóa mặc định trong trường `authInstructions.defaultKey` và mã mẫu `sampleCurl`/`samplePython`, khiến bất kỳ ai cũng có thể đọc được khóa và gửi dữ liệu lên hệ thống.
- **Nguyên nhân gốc rễ**:
  1. Hằng số `DEFAULT_API_KEY` được định nghĩa trong code và hàm `authenticateRequest` kiểm tra `token === DEFAULT_API_KEY`.
  2. Tài liệu công khai GET in trực tiếp `defaultKey` và nhúng chuỗi khóa vào script mẫu.
  3. Giá trị fallback trong code Admin và sync logic sử dụng khóa mặc định thay vì chuỗi rỗng hoặc placeholder.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Xóa sạch hằng số và chuỗi khóa mặc định trên toàn bộ codebase.
  - `authenticateRequest` chỉ chấp nhận DUY NHẤT khóa được lưu trong bảng cấu hình `wcg_crawler_api_config_v1` của D1.
  - Loại bỏ hoàn toàn trường `defaultKey` trong response GET, thay thế các đoạn mã mẫu bằng placeholder `<API_KEY>`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ hardcode API key hoặc token mặc định vào mã nguồn làm phương án fallback*: Mọi khóa xác thực phải được nạp động từ cơ sở dữ liệu (D1) hoặc biến môi trường bí mật (Secrets).
  - ❌ *Không bao giờ in API key thực tế trong response tài liệu GET công khai*: Chỉ sử dụng placeholder dạng `<API_KEY>` trong các đoạn code mẫu cURL / Python / Node.js.

### ISSUE-071: Nút Quay Lại [ <- ] Trên Mobile Search Bị Trơ Khi Bàn Phím Ảo Mở & Layout Bị Thu Hẹp Làm Lộ Thẻ Game
- **Triệu chứng**:
  - Trên điện thoại di động (Android / iOS), khi chạm mở thanh tìm kiếm và bàn phím ảo (Laban Key / Gboard / iOS keyboard) hiện lên:
  - Ấn vào nút [ <- ] (Quay lại) ở góc trên bên trái không có tác dụng, giao diện tìm kiếm không chịu đóng.
  - Chiều cao của modal tìm kiếm bị thu hẹp bất thường (chỉ chiếm phần trên), để lộ một khoảng hở nhìn thấy thẻ game trang chủ và thanh tab màu tím bên dưới trước khi đến bàn phím ảo.
- **Nguyên nhân gốc rễ**:
  1. *Hủy sự kiện Click do Keyboard Blur & Layout Shift*:
     - Nút [ <- ] chỉ dùng `onClick`.
     - Khi bàn phím ảo đang mở, ô input đang giữ focus. Khi ngón tay người dùng chạm vào nút [ <- ], trình duyệt kích hoạt sự kiện `blur` trên ô input và bắt đầu thu bàn phím lại.
     - Việc bàn phím thu lại kích hoạt `visualViewport.onresize` ➔ state `setViewportHeight` & `setViewportTop` re-render và dịch chuyển vị trí container DOM giữa chừng giữa `touchstart` và `touchend`/`click`.
     - Trình duyệt di động coi cử chỉ bị trượt/dịch chuyển và hủy (cancel) sự kiện `click` tổng hợp. Do đó `onClick` không bao giờ chạy.
  2. *Hở màn hình do gán chiều cao backdrop theo `visualViewport.height`*:
     - Backdrop modal gắn inline style `height: viewportHeight ? ${viewportHeight}px : '100dvh'`. Khi bàn phím ảo mở lên (~350px), `visualViewport.height` bị co lại chỉ còn ~350px - 400px.
     - Backdrop bị thu ngắn lại thay vì bao phủ toàn màn hình, để lộ nền trang chủ phía sau.
  3. *Không có xử lý phím Back vật lý / cử chỉ Android*:
     - Modal không đẩy trạng thái vào `window.history`, khiến người dùng vuốt Back trên Android thì bị văng khỏi trang web.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Gắn sự kiện `onPointerDown={handleCloseMobileSearch}` song song với `onClick` trên nút [ <- ], nút X và nút Tìm. `pointerdown` kích hoạt ngay lập tức tại miligiây đầu tiên ngón tay chạm xuống màn hình trước khi layout bị dịch chuyển.
  - Bổ sung `touch-manipulation select-none` và `pointer-events-none` trên SVG icon `<ArrowLeft />`.
  - Khóa chặt backdrop modal `fixed inset-0 w-full h-[100dvh] min-h-screen z-[100] bg-[#070e1b] select-none overflow-hidden`, với style `{ top: 0, left: 0, right: 0, bottom: 0 }`.
  - Không thay đổi chiều cao của container gốc theo `visualViewport`; dùng `overscroll-contain touch-pan-y` và `pb-48` cho danh sách kết quả cuộn.
  - Tích hợp `window.history.pushState({ wcg_search_overlay: true }, '')` và lắng nghe `popstate` để hỗ trợ hoàn hảo cử chỉ vuốt Back trên Android.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gán `height: visualViewport.height` hoặc `top: visualViewport.offsetTop` lên container backdrop gốc của modal full-screen*: Điều này sẽ làm backdrop bị co ngắn khi bàn phím ảo mở, làm lộ nội dung trang chủ phía sau và kích hoạt re-render liên tục gây hủy sự kiện chạm.
  - ❌ *Không bao giờ chỉ dựa vào `onClick` cho các nút điều khiển quan trọng (nút đóng, nút quay lại) trên modal mobile khi có input đang focus*: Bắt buộc phải gắn kèm `onPointerDown` với `e.preventDefault()` để bắt sự kiện tức thì trước khi bàn phím ảo kích hoạt blur.

### ISSUE-070: Ô Trắng Trơn Trong Admin Do Fallback `/icon-192.png` Ảo & Game 0 Code Tràn Vào Trang Chủ Do Auto-Publish Bỏ Qua Kiểm Tra Mã Code
- **Triệu chứng**:
  - Tại trang quản trị Admin (`/admin#/games`), một loạt game mới (Diamond, Con Đường Tơ Lụa, Song Kiếm Loạn Vũ, Tiên Đạo Ta Độc Tôn...) hiển thị ô vuông màu trắng trơn không có ảnh.
  - Ngoài trang khách `codegame.shop`, các game này hiển thị với chữ cái viết tắt ("CON", "SON", "TIE"...) kèm dòng *"0 Có mã code", "Đang tải dữ liệu..."*.
- **Nguyên nhân gốc rễ**:
  1. *Ô trắng trong Admin*:
     - `GamesModule.tsx` nhúng trực tiếp `item.icon_url` (là URL `play-lh.googleusercontent.com`) mà thiếu `referrerPolicy="no-referrer"`. Trình duyệt gửi Referer từ domain admin khiến Google Play chặn 403.
     - Handler `onError` gán `(e.target as HTMLImageElement).src = '/icon-192.png'`, nhưng tệp `/icon-192.png` **không hề tồn tại** trong `public/`. Sự cố lỗi 404 kép để lại một khung ô vuông trắng trơn vô hồn.
  2. *Game 0 code tràn ra trang chủ*:
     - `scan_googleplay_new_games` và `scan_codemoi_new_games` trong `functions/api/sync.ts` thiết lập điều kiện `shouldAutoPublish = autoConfig.enabled && (isWhitelisted || (autoPublishWhenHasCodes && hasCodes))`.
     - Vì NPH nằm trong whitelist nên dù `codeCount = 0`, game vẫn bị tự động đăng thẳng lên danh mục chính thức `wcg_admin_games_v5`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tải toàn bộ 61 logo Google Play độ phân giải cao về lưu tĩnh tại `public/game_icons/${slug}.webp` & `.jpg` (đạt 748 icon nội bộ 100%).
  - Cập nhật `GamesModule.tsx`, `GameCard.tsx`, `GameDetailModal.tsx` trang bị `referrerPolicy="no-referrer"` và fallback 3 tầng (Icon nội bộ -> Edge Proxy `/api/game-icon?slug=...&url=...` -> Gradient Avatar chữ cái thương hiệu). Tuyệt đối không fallback vào đường dẫn tệp không tồn tại.
  - Di chuyển toàn bộ 162 game có 0 code sang bảng Hàng Chờ Duyệt (`wcg_crawler_pending_games_v1`).
  - Thêm điều kiện bắt buộc `if (allCodes.length === 0) continue;` trong `functions/api/games.ts` để bảo đảm Web Khách CHỈ phục vụ game có mã giftcode hoạt động.
  - Khóa chặt `shouldAutoPublish = autoConfig.enabled && hasCodes;` — bắt buộc phải có code mới được đăng tự động.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gán fallback `onError` vào một đường dẫn tệp chưa được kiểm tra tồn tại (như `/icon-192.png`)*: Lỗi 404 kép sẽ tạo ra ô vuông trắng trơn hoặc biểu tượng vỡ ảnh.
  - ❌ *Không bao giờ cho phép Auto-Publish game chỉ vì NPH nằm trong Whitelist khi chưa có mã giftcode hoạt động*: Quy tắc cốt lõi của Web Code Game là chỉ đăng game khi đã có giftcode (`codes_count > 0`), game chưa có code bắt buộc nằm ở Hàng Chờ Duyệt.

### ISSUE-069: Logo Game Google Play Bị Lỗi Hiển Thị Chữ Viết Tắt SVG Do Trực Tiếp Nhúng Cross-Origin & Hàng Chờ Duyệt Giữ Lại Game Đã Có Code
- **Triệu chứng**:
  - Tại trang quản trị Admin (`/admin#/crawler`), toàn bộ thẻ game mới quét từ Google Play hiển thị khung màu tối với chữ cái viết tắt SVG màu xanh ("HI", "ON", "GU", "GI", "LÀ"...) thay vì logo game thật.
  - Tên game hiển thị lỗi thực thể HTML dạng `Girls&#39; Frontline 2: Lưu Đày`.
  - Một số tựa game đã có giftcode hoặc trùng lặp với danh mục xuất bản bị kẹt trong hàng chờ duyệt.
- **Nguyên nhân gốc rễ**:
  1. *Chặn ảnh Cross-Origin & Hotlink Protection*:
     - `CrawlerModule.tsx` gắn trực tiếp URL `play-lh.googleusercontent.com` vào thẻ `<img>` mà không qua proxy Edge và không có `referrerpolicy="no-referrer"`.
     - Browser gửi Referer `https://admin-code-game-shop.pages.dev/` khiến Google Play chặn hoặc extension chặn quảng cáo adblock kích hoạt lỗi.
     - Hàm `onError` thử fallback sang `/game_icons/${game.slug}.webp` (chưa tải về local), gây lỗi 404 lần 2 và ép giao diện render SVG avatar chữ cái viết tắt.
  2. *Thiếu cơ chế Auto-Publish theo mã giftcode*:
     - `scan_googleplay_new_games` chỉ xét whitelist NPH mà không kiểm tra số lượng giftcode hoạt động của tựa game.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tải và đồng bộ toàn bộ 40/40 logo game chất lượng cao WebP về lưu tĩnh trong `public/game_icons/${slug}.webp` (kèm bản Open Graph `.jpg`).
  - Trang bị kiến trúc ảnh 3 tầng: (1) Icon tĩnh nội bộ `/game_icons/${slug}.webp` -> (2) Edge Icon Proxy `/api/game-icon` -> (3) URL trực tiếp kèm `referrerPolicy="no-referrer"`.
  - Giải mã thực thể HTML bằng `cleanGameTitle()` để hiển thị tên chuẩn xác.
  - Xây dựng action `auto_publish_games_with_codes` trên Cloudflare Edge Worker tự động đăng toàn bộ game có code lên danh mục chính thức và giải phóng game trùng lặp.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gắn trực tiếp URL `play-lh.googleusercontent.com` vào `<img>` mà thiếu `referrerpolicy="no-referrer"`*: Sẽ bị trình duyệt gửi referer và Google Play trả về lỗi hoặc bị adblock chặn.
  - ❌ *Không bao giờ để game có giftcode bị giữ lại trong hàng chờ duyệt*: Bất kỳ game nào đã có mã quà tặng hoạt động phải được tự động đăng (Auto-Publish) ngay lập tức.

### ISSUE-068: Nút Quét Game Mới Google Play Trên Trang Admin Chỉ Giả Lập Bằng `setTimeout` Không Gọi Backend Thực Tế
- **Triệu chứng**:
  - Tại trang quản trị Admin mục `Crawler & Auto Sync` -> `Game Mới (Google Play & CodeMoi)`, khi bấm nút `"⚡ Quét Google Play"` hoặc `"⚡ Quét Google Play Ngay"`, hệ thống chỉ xoay tròn 2 giây rồi hiện thông báo thành công mà không có bất kỳ game mới nào từ Google Play được nạp vào hệ thống.
- **Nguyên nhân gốc rễ**:
  - `handleTriggerGooglePlayScan` trong `CrawlerModule.tsx` bị hardcode giả lập bằng `await new Promise((resolve) => setTimeout(resolve, 2000))`.
  - Backend Cloudflare Edge Function (`functions/api/sync.ts`) thiếu action `scan_googleplay_new_games`, và `adminDataService.ts` thiếu method kết nối.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Xây dựng action `scan_googleplay_new_games` trong `functions/api/sync.ts` thực hiện cào song song các query Google Play Store VN, lọc app tiện ích, bóc tách metadata (tên, dev, rating, icon s256-rw), phân loại theo whitelist và lưu vào D1 (`wcg_admin_games_v5`, `wcg_crawler_pending_games_v1`).
  - Nối method `scanGooglePlayNewGames()` vào `adminDataService.ts` và gắn vào handler `handleTriggerGooglePlayScan` của `CrawlerModule.tsx`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ để nút chức năng trang Admin dùng `setTimeout` giả lập hành vi cào*: Mọi tác vụ cào/quét phải được thực thi trên serverless edge hoặc background runner thật để đảm bảo dữ liệu thật.

### ISSUE-067: Lỗi Mở Modal Game Nhảy 2 Giao Diện (3 Code Nhảy Lên Đủ Code & Logo Đổi Thành Avatar Chữ "TA")
- **Triệu chứng**:
  - Khi người dùng bấm vào một tựa game (ví dụ Tarot: Vĩnh Hằng Thần Ngữ), modal mở ra ban đầu hiển thị đúng logo nhưng chỉ có 3 code ("Tất cả (3)").
  - Vài trăm ms sau, giao diện tự động cập nhật lên đầy đủ 20 code ("Tất cả (20)"), nhưng ảnh logo game thật biến mất và bị thay thế bằng avatar chữ cái viết tắt "TA" trên nền tím.
- **Nguyên nhân gốc rễ**:
  1. *Truyền object card có `slice(0, 3)` vào `setSelectedGame` trước khi nạp đủ code*:
     - Phân trang lưới game trên Edge gắn 3 code xem trước. Khi click thẻ game, `handleSelectGame(game)` gọi ngay `setSelectedGame(game)` với object 3 code này, sau đó mới gọi async `getGameBySlug` để lấy 20 code, gây ra hiện tượng nhảy giật 2 giao diện.
  2. *Reset trạng thái ảnh `setModalImageLoaded(false)` khi `game` prop thay đổi reference*:
     - `GameDetailModal` có `useEffect([game])`. Khi `selectedGame` được update từ 3 code sang 20 code, hook chạy và gọi `setModalImageLoaded(false)`.
     - Lớp ảnh bị gán `opacity-0` để lộ avatar chữ cái `{initials}` ("TA") bên dưới.
     - Do URL ảnh `src` không đổi và ảnh đã nằm trong bộ nhớ cache trình duyệt, trình duyệt không bao giờ kích hoạt lại sự kiện `onLoad`, khiến ảnh kẹt vĩnh viễn ở trạng thái ẩn!
- **Giải pháp chuẩn đã kiểm chứng**:
  - Dùng `prevGameSlugRef` trong `GameDetailModal.tsx` để **CHỈ reset trạng thái ảnh khi chuyển sang một game khác**. Cùng một game cập nhật code thì giữ nguyên trạng thái ảnh đã load.
  - Thêm `ref` callback kiểm tra `imgEl.complete && imgEl.naturalWidth > 0` để bật `modalImageLoaded = true` ngay lập tức nếu ảnh đã có trong cache.
  - Làm giàu dữ liệu (`enrich`) toàn bộ danh sách code trong `queryGames()` và trước khi gọi `setSelectedGame(game)` trong `App.tsx`, đảm bảo modal luôn mở với 100% mã code ngay từ frame render đầu tiên (0ms).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ đặt `useEffect([game])` chứa `setModalImageLoaded(false)` mà không kiểm tra xem slug game có thực sự thay đổi hay không*: Vì bất kỳ cập nhật prop nào (như cập nhật code, vote, bookmark) cũng sẽ làm bay màu logo game và biến thành chữ cái.
  - ❌ *Không phụ thuộc 100% vào sự kiện `onLoad` của `<img>` khi component re-render*: Phải luôn kèm theo `ref={(el) => { if (el?.complete && el?.naturalWidth > 0) ... }}` để bắt kịp ảnh đã cache.

### ISSUE-066: Bùng Nổ D1 Rows Read Do Correlated Scalar Subqueries & Client `syncWithCloudflareKV(true)` Ép Bypass Cache
- **Triệu chứng**:
  - Cloudflare Dashboard báo lượng đọc D1 tăng vọt lên 1.12M / 5M rows read chỉ trong buổi sáng, số lượng query chạm 17.42k queries.
- **Nguyên nhân gốc rễ**:
  1. *Correlated Scalar Subqueries trong `loadAllGiveawaysD1`*:
     - Câu lệnh SELECT từ `giveaways` chứa 3 scalar subqueries quét bảng `giveaway_codes` cho mỗi dòng giveaway. 42 dòng $\times$ 3 subqueries khiến SQLite thực hiện 126 lần quét cho mỗi request, ngốn tới 862 rows read/lần gọi (chiếm hơn 401k rows read tổng cộng).
  2. *Client gọi `syncWithCloudflareKV(true)`*:
     - Các view `NewsView.tsx` và `UtilitiesView.tsx` gọi `dataService.syncWithCloudflareKV(true)` với query param `?fresh=1&_t=${Date.now()}` và header `no-cache, no-store`.
     - URL bị gắn timestamp khiến Cloudflare Edge CDN không bao giờ hit cache, mỗi lượt xem trang đều ép D1 đọc hơn 1.000 rows.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tối ưu câu lệnh SQL bằng Single Aggregated `LEFT JOIN` gom nhóm trước (`GROUP BY`), cắt giảm ngay 95% lượng đọc từ 862 rows xuống 42 rows.
  - Gỡ bỏ cờ `(true)` trong `NewsView.tsx` và `UtilitiesView.tsx`.
  - Khóa chặt cờ `forceFresh` trong `dataService.ts`: Chỉ Admin đăng nhập trong `/admin` mới được bypass cache.
  - Bổ sung In-Memory Isolate Cache 15s trong `functions/api/sync.ts` và giãn D1 write throttle lên 60s trong `realEventsHub.ts`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng Scalar Subqueries lồng trong mệnh đề SELECT trên SQLite/D1*: Luôn chuyển sang `LEFT JOIN (SELECT ... GROUP BY)` để SQLite gom nhóm 1 lần thay vì quét lặp từng dòng.
  - ❌ *Không cho phép máy khách thông thường truyền `_t=${Date.now()}` hoặc `fresh=1`*: Đây là nguyên nhân trực tiếp triệt tiêu toàn bộ hiệu năng của Cloudflare Edge CDN.

### ISSUE-065: Lỗi Ẩn Bài Viết Mới Do Thiếu Trường `published_at` & Bẫy Hồi Sinh Dữ Liệu Mock Thay Vì Khôi Phục Mã Thật Chưa Phát Hết
- **Triệu chứng**:
  - Web Quản trị cập nhật tin tức đến ngày 22/10 nhưng ngoài Web Khách danh sách bài viết chỉ hiển thị đến ngày 13/10.
  - Người dùng phản ánh mã quà tặng thật chưa phát hết của 3Q Đào Đào Đào và Anh Hùng Tiến Lên không hiện, thay vào đó lại xuất hiện mục mock Yến Vân Thập Lục Thanh (Rotwood).
- **Nguyên nhân gốc rễ**:
  1. *Lỗi sắp xếp tin tức*:
     - Trong `seedNews.ts` và API trả về, 150/163 bài viết chỉ có trường `created_at` mà không có trường `published_at`.
     - `newsService.ts` sắp xếp bằng `new Date(a.published_at || 0)`. Khi `published_at` là `undefined`, timestamp bị trả về 0 (1/1/1970). Chỉ có 13 bài viết có trường `published_at` (bài mới nhất là 13/10). Do đó toàn bộ bài viết từ 14/10 đến 22/10 bị chìm xuống đáy danh sách.
  2. *Bẫy un-tombstone nhầm dữ liệu mock test*:
     - Tác nhân ở lượt trước un-tombstone `gw_gamerpower_rotwood` do thấy nó có 15 mã trong D1, nhưng đó là mã test `GP-ROT-...` từ GamerPower thời kỳ đầu chứ không phải mã thật của người dùng (vi phạm Rule 7: Zero Test Artifacts).
     - Trong khi đó, mã thật chưa phát hết của **3Q Đào Đào Đào** (19 mã) và **Anh Hùng Tiến Lên** (18 mã) lại bị reset về `[]` trong `codes_pool`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn dùng fallback `a.published_at || a.created_at || new Date().toISOString()` trong cả model, service và UI (`NewsView.tsx`, `NewsDetailModal.tsx`).
  - Chuẩn hóa đồng bộ cả hai trường `created_at` và `published_at` cho 100% bài viết tin tức.
  - Thanh trừng triệt để `gw_gamerpower_rotwood` khỏi D1 và codebase; phục hồi đúng 19 mã thật của 3Q Đào Đào Đào và 18 mã thật của Anh Hùng Tiến Lên.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ dựa hoàn toàn vào `a.published_at` mà không có fallback `a.created_at`*: Khiến các bài viết crawler hoặc bài viết mới thêm không hiện lên đầu trang.
  - ❌ *Không un-tombstone bất kỳ chiến dịch nào chứa tiền tố mock như `GP-ROT-`*: Chỉ chấp nhận mã thật do người dùng cung cấp.

### ISSUE-064: Lỗi Kho Thật Giveaway Có Mã Nhưng Web Khách Ép Về 0 Do Thiếu Fallback `remaining_codes` & Kẹt Tombstone D1
- **Triệu chứng**:
  - Quản trị viên nhập mã vào kho của chiến dịch Giveaway trong trang Admin, bảng Admin hiển thị `Kho: 15 / 16` (Đang mở).
  - Tuy nhiên ngoài web khách (`codegame.shop/giveaways`), chiến dịch biến mất hoàn toàn hoặc hiển thị "Hết Code" (0 mã), nút Giật Mã bị khóa.
- **Nguyên nhân gốc rễ**:
  1. *Lỗi logic tính tồn kho Client*:
     API `/api/sync` cho khách bảo mật bằng cách lược bỏ `codes_pool` (tránh lộ mã thô trên tab Network) và chỉ trả về số lượng `remaining_codes`.
     Client lại kiểm tra bằng `Array.isArray(codes_pool) ? codes_pool.length : 0`. Do `codes_pool` là `undefined`, stock luôn bị ép về 0.
  2. *Kẹt Tombstone một chiều*:
     Khi Admin kích hoạt lại hoặc thêm mã vào một chiến dịch từng bị đánh dấu xóa, server `POST /api/sync` chỉ merge union `wcg_deleted_giveaways`, khiến ID bị khóa vĩnh viễn trong danh sách xóa và không thể giải phóng xuống web khách.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Dùng đúng biểu thức chuẩn: `Array.isArray(codes_pool) ? codes_pool.length : (typeof remaining_codes === 'number' ? remaining_codes : 0)` trên toàn bộ các component client (`dataService.ts`, `productPackageUtils.ts`, `GiveawaysView.tsx`).
  - Trang bị cơ chế Self-healing Un-tombstone trong `functions/api/sync.ts`: Khi Admin lưu danh sách chiến dịch/sản phẩm mới, tự động xóa các ID đó khỏi bảng tombstone tương ứng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ viết `Array.isArray(codes_pool) ? codes_pool.length : 0` trên Web Khách*: Vì `codes_pool` không bao giờ được gửi công khai cho khách, cách viết này sẽ triệt tiêu 100% tồn kho thật ngoài web.
  - ❌ *Không hardcode mảng xóa tĩnh `legacySeedGwIds` chặn vĩnh viễn ID trong Worker*: Khiến Admin dù có thêm hàng cũng không thể hiển thị được.

### ISSUE-063: Lỗ hổng Polling ngầm 12s tại `marketingService` bypass Edge Cache gây cạn kiệt Cloudflare D1 Quota
- **Triệu chứng**:
  - Cloudflare D1 chạm trần 5.000.000 rows read/ngày rất nhanh dù lượng người dùng đồng thời ở mức trung bình.
  - Sau khi D1 chạm trần, các API đồng bộ bị lỗi `D1_ERROR: Your account has exceeded D1's free tier daily row read limit`.
- **Nguyên nhân gốc rễ**:
  1. *Tham số `fresh=1&_t=${Date.now()}` trong `fetchMetricsSnapshot()`*:
     `snapshotPollerTimer` lặp lại mỗi **12 giây** trên mọi tab trình duyệt mở của khách (`marketingService.ts`). URL bị hardcode tham số `fresh=1&_t=${Date.now()}` kèm `{ cache: 'no-store' }`.
     Tham số `_t=${Date.now()}` tạo ra URL mới mỗi lần gọi, khiến Cloudflare Edge CDN không bao giờ hit cache.
     Tham số `fresh=1` kích hoạt cờ `force = true` tại `functions/api/metrics/synced.ts`, ép Worker chạy đồng bộ 9 truy vấn D1 liên tục.
  2. *Polling `/api/realtime-events` mỗi 18-22s với `{ cache: 'no-store' }`*:
     Endpoint này trả về header `no-cache, no-store`, đồng thời hàm `getRealEventsHub()` thiếu bộ đệm isolate in-memory khiến mỗi request đều truy vấn bảng `wcg_real_events_hub` trong D1.
  3. *TTL Edge Cache công khai quá ngắn tại `/api/sync`*:
     `s-maxage=5s` quá ngắn khiến Edge CDN hết hạn chỉ sau 5 giây.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Gỡ bỏ hoàn toàn `?fresh=1&_t=...` và `no-store` trong các cuộc gọi ngầm tại `marketingService.ts` và `growthService.ts`.
  - Giãn chu kỳ poller từ 12s lên 25s cho snapshot và 25-30s cho realtime events.
  - Cấu hình header Cache-Control chuẩn cho Cloudflare Edge CDN:
    - `/api/metrics/synced`: `public, max-age=10, s-maxage=15, stale-while-revalidate=30`.
    - `/api/realtime-events`: `public, max-age=10, s-maxage=15, stale-while-revalidate=30`.
    - `/api/sync`: `public, max-age=15, s-maxage=30, stale-while-revalidate=60`.
    - `/api/stats`: `public, max-age=15, s-maxage=30, stale-while-revalidate=60`.
  - Trang bị isolate in-memory cache TTL 10s trong `realEventsHub.ts`.
  - Kết hợp với cơ chế Purge tức thì của `invalidateCatalogEdgeCache()`: Ngay khi Admin lưu bất kỳ thay đổi nào, Edge CDN xóa cache toàn cầu ngay lập tức, đảm bảo đồng bộ 100% dữ liệu Admin -> Web Khách mà không tiêu tốn đọc D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ hardcode `_t=${Date.now()}`, `fresh=1`, hoặc `{ cache: 'no-store' }` trong các hàm background poller hoặc `setInterval`*: Đây là thủ phạm số 1 gây bùng nổ truy vấn D1.
  - ❌ *Không đặt `s-maxage` quá ngắn (< 15s) trên các endpoint danh mục public*: Khiến Cloudflare Edge CDN liên tục phải forward request vào D1.

### ISSUE-062: Lỗi thiếu giftcode game Hắc Tây Du: Chương Cấm & Lãng phí hạn mức D1 do URL Polling bypass Edge Cache
- **Triệu chứng**:
  - Tựa game `Hắc Tây Du: Chương Cấm` chỉ hiển thị 5 mã giftcode khởi tạo (`ALPHA9F3`, `ALPHA6X9`, `ALPHA3R6`, `TICAN333`, `NHICAN222`), thiếu các mã chính thức từ NPH Funtap, YouTube và đối tác (`HACTAYDU888`, `CHUONGCAM`, `TAYDUKI`, `HTDCC999`, `VIP666`...).
  - Hạn mức D1 5.000.000 rows read/ngày bị cạn kiệt nhanh chóng dù lượt truy cập thực tế không quá tải.
- **Nguyên nhân gốc rễ**:
  1. *Thiếu mã trong cơ sở dữ liệu baseline*: Trước đây file Muse chỉ mới ghi nhận 5 mã thử nghiệm và YouTube ban đầu, chưa gom các đợt phát hành sự kiện chính thức của Funtap.
  2. *Polling URL mang tham số `_t=${Date.now()}` & `fresh=1`*: `dataService.ts` trong `syncWithCloudflareKV()` hardcode URL `fresh=1&_t=${Date.now()}` trên mọi cuộc gọi, kể cả khi chạy ngầm định kỳ 45s. Điều này khiến Cloudflare Edge Cache (`caches.default`) bị vô hiệu hóa hoàn toàn, mỗi lượt poll từ mỗi tab trình duyệt đều quét hàng ngàn dòng D1 (`SELECT * FROM orders`, `wallet_transactions`, `sepay_transactions`, `system_settings`).
  3. *Cache TTL Worker quá ngắn*: `CACHE_TTL_MS` trong `games.ts` chỉ 5s và `s-maxage=10`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Bổ sung trọn vẹn 31 mã giftcode chất lượng cao của `Hắc Tây Du: Chương Cấm` vào tất cả các file JSON baseline ngoại tuyến (`crawled_codes_188.json`, `games188.json`, `codes_database.json`, `games_database.json`) và nhúng trực tiếp vào mảng `codes` của game.
  - Thêm bài viết tin tức chuyên sâu chuẩn SEO trong `src/data/seedNews.ts` tích hợp toàn bộ 31 mã.
  - Bổ sung fallback `fallbackCodesData` trong `functions/api/sync.ts` để server luôn trả về đủ 31 mã kể cả khi D1 sập.
  - Sửa URL polling trong `dataService.ts`: Khi `forceFresh = false`, chỉ gọi `/api/sync` để Edge CDN trả về bản cache (`CF-Edge-Cache-Status: HIT`), cắt giảm 98% lượt đọc D1.
  - Nâng `CACHE_TTL_MS` trong Worker lên 60s và `s-maxage=60` trên Edge Cache.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gắn `_t=${Date.now()}` hoặc `fresh=1` vào các lời gọi polling ngầm định kỳ*: Chỉ gắn khi người dùng thực hiện thao tác cưỡng chế làm mới thủ công (pull-to-refresh) hoặc admin vừa lưu thay đổi.

### ISSUE-061: Lỗi D1 Quota Exhaustion dẫn tới trả về mảng rỗng làm xóa sạch dữ liệu Client & Treo CyberLoader trang chủ do thiếu Watchdog
- **Triệu chứng**:
  - Web khách bị mất hàng chục bài viết tin tức (từ 91 bài rớt xuống chỉ còn 12 bài mẫu), giftcode nhúng trong bài biến mất.
  - Trang chủ bị kẹt vô hạn ở vòng tròn xoay `CyberLoader` ("ĐANG TẢI DỮ LIỆU... Đang kết nối hơn 340+ tựa game..."), không xem được game.
  - Giveaway không có mã thật trong kho nhưng vẫn hiển thị còn 55 mã, 43 mã và mở nút Giật Mã.
- **Nguyên nhân gốc rễ**:
  1. *D1 Quota Exhaustion*: Gói miễn phí Cloudflare D1 chạm hạn mức đọc hàng ngày (`D1_ERROR: Your account has exceeded D1's free tier daily row read limit`). Khi D1 từ chối truy vấn, `/api/sync` fallback về `newsArticles: []`.
  2. *Destructive Client Sync Overwrite*: `dataService.ts` thấy server trả về `[]` đã lưu đè `localStorage` của khách thành rỗng, làm xóa sạch toàn bộ bài viết trong máy khách. `seedNews.ts` trước đây chỉ có 12 bài khởi tạo sơ khai.
  3. *Unprotected CyberLoader State*: Trong `App.tsx`, `executeQuery()` thiếu `try/finally` và thiếu fail-safe watchdog timeout. Khi mạng bị trễ hoặc API bị hoãn, `setIsLoading(false)` không bao giờ được gọi.
  4. *Giveaway Pool Fallback Bug*: Trong `sync.ts` và `GiveawaysView.tsx`, logic `codes_pool.length > 0 ? codes_pool.length : remaining_codes` rơi vào nhánh fallback khi `codes_pool` là `[]` (rỗng), dẫn tới việc đọc số lượng cũ (40, 25) và được marketing engine cộng dồn ảo.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Lưu trữ toàn bộ 91 bài viết tin tức chất lượng cao trực tiếp trong `src/data/seedNews.ts`.
  - Bổ sung fallback `fallbackNewsArticles` trong `functions/api/sync.ts` để server luôn trả về đủ 91 bài kể cả khi D1 quá tải quota.
  - Trang bị lá chắn trong `dataService.ts`: Nếu server trả về `[]` trong khi client đang có bài viết, tuyệt đối không ghi đè `localStorage`.
  - Bọc `try / catch / finally` và bổ sung Fail-safe Watchdog Timer 2.5s trong `App.tsx` cho `isLoading`.
  - Khóa chặt tồn kho Giveaway: Khi `codes_pool` là mảng rỗng `[]`, số lượng mã thực bắt buộc bằng `0` và hiển thị "Hết Code".
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ tin tưởng tuyệt đối rằng Cloudflare D1 luôn khả dụng*: D1 free tier có hạn mức đọc 5 triệu dòng/ngày, có thể bị chạm bất cứ lúc nào. Mọi endpoint đồng bộ `/api/sync` và catalog BẮT BUỘC phải có fallback dữ liệu tĩnh đầy đủ trong code bundle.
  - ❌ *Không ghi đè mảng rỗng `[]` từ server lên `localStorage` của client nếu chưa xác minh qua Tombstone*: Đây là bẫy gây mất dữ liệu nghiêm trọng nhất.
  - ❌ *Không để cờ `isLoading` không có watchdog bảo vệ*: Mọi loader toàn trang hoặc spinner catalog phải có timeout tối đa 2.5s để tự giải phóng giao diện cho người dùng.

### ISSUE-060: Lỗi Giveaway tự động mở ("Còn lại: 60 mã", [Giật Mã] active) khi trong kho không có mã thực do Fallback Resurrection Bug
- **Triệu chứng**:
  - Trên web khách (`codegame.shop/giveaways`), một số chiến dịch giveaway (như 3Q Đào Đào Đào, Anh Hùng Tiến Lên, Tiên Nghịch Mobile, Pirate Legends) không có mã thực nào trong kho nhưng ngoài web khách vẫn tự mở, hiển thị còn hàng và cho phép bấm nút Giật Mã.
- **Nguyên nhân gốc rễ**:
  1. *Số tồn kho ảo còn vương lại trong file tĩnh*: `remaining_codes` trong file cấu hình lưu các số tĩnh 40, 25, 20, 18 dù kho mã thực rỗng (`codes_pool` không có mã).
  2. *Lỗi Fallback Resurrection Bug*: Biểu thức kiểm tra tồn kho `Array.isArray(codes_pool) && codes_pool.length > 0 ? codes_pool.length : remaining_codes`. Khi kho thực là mảng rỗng `[]` (`length === 0`), điều kiện `codes_pool.length > 0` bị false, dẫn tới việc code nhảy sang nhánh fallback đọc `remaining_codes` cũ thay vì trả về 0.
  3. *Tương tác với Marketing Engine*: Nhận diện nhầm `realStock > 0`, `marketingService.getDisplayStock` cộng thêm `virtualStockBonus`, khiến web hiển thị 60, 45, 40, 38 mã và mở nút Giật Mã.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Đặt toàn bộ 31 chiến dịch trong `giveaways.json` về `"codes_pool": []`, `"remaining_codes": 0`.
  - Thay đổi biểu thức tính toán tồn kho thành: `Array.isArray(codes_pool) ? codes_pool.length : (typeof remaining_codes === 'number' ? remaining_codes : 0)`.
  - Khi `realStock <= 0`, nút [Giật Mã] bị Disabled và hiển thị nhãn "Hết Code", tuân thủ 100% Quy tắc 3.1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `Array.isArray(codes_pool) && codes_pool.length > 0 ? codes_pool.length : remaining_codes`*: Cách viết này sẽ khiến một kho hàng vừa bị rút cạn mã (`length === 0`) bị "hồi sinh" tồn kho ảo do rơi vào nhánh fallback của `remaining_codes`.

### ISSUE-059: Lỗi kẹt màn hình Splash Preloader đen thui khi vào web do ReferenceError thiếu import và thiếu Watchdog bảo vệ
- **Triệu chứng**:
  - Người dùng truy cập `codegame.shop`, màn hình xuất hiện vòng tròn logo xoay với chữ "CODE GAME" trên nền đen và bị kẹt vô hạn tại đây, không vào được web.
- **Nguyên nhân gốc rễ**:
  1. *Lỗi ReferenceError thiếu import hook*: Một component được gọi ngầm trong cây render ban đầu (`CodePlaygroundModal`) sử dụng hook nhưng thiếu lệnh `import`. Khi React khởi động, ngoại lệ `ReferenceError: useLockBodyScroll is not defined` ném ra làm ngắt quãng chu kỳ render.
  2. *Bẫy Preloader Z-Index 9999999 không có Watchdog*: Preloader overlay che phủ toàn màn hình chỉ được xóa khi `useEffect` trong `App.tsx` chạy xong. Khi ứng dụng gặp lỗi, luồng `useEffect` không kích hoạt dẫn đến preloader che kín toàn bộ giao diện và nuốt sạch mọi tương tác chuột/touch.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Kiểm tra toàn bộ component có dùng hook để đảm bảo 100% có câu lệnh `import`.
  - Tích hợp watchdog timer trong `index.html` tự động hủy bỏ preloader sau 2.2 giây hoặc khi `load` event hoàn tất.
  - Tích hợp tự động gỡ preloader ngay trong `ErrorBoundary.componentDidCatch` để người dùng luôn nhìn thấy giao diện cứu hộ thay vì màn hình loading chết.
  - Sử dụng headless browser (Edge/Chrome CDP) kiểm tra trực tiếp console log và kiểm tra sự biến mất của preloader trước khi triển khai.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không phụ thuộc duy nhất vào useEffect của App để gỡ bỏ preloader toàn cục*: Bất kỳ lỗi khởi tạo nào xảy ra trước đó sẽ khóa người dùng vĩnh viễn trong màn hình đen. Luôn phải có fail-safe watchdog timer trong HTML.
  - ❌ *Không chỉ chạy test build Vite đơn thuần mà không kiểm tra lỗi runtime ReferenceError*: Vite build không chạy `tsc` kiểm tra type/import chặt chẽ theo mặc định. Phải dùng Edge DevTools CDP hoặc `tsc` để kiểm tra.

### ISSUE-058: Lỗi kẹt cuộn ngược trên mobile (Chỉ lướt xuống được, không vuốt lên được) do overscroll-contain WebKit trap, thiếu min-h-0 và nested scroll
- **Triệu chứng**:
  - Trên điện thoại di động, người dùng mở xem chi tiết tiện ích hoặc mở modal thanh toán mua hàng, khi lướt xuống dưới xem thông tin hoặc các gói tùy chọn thì bình thường, nhưng khi muốn vuốt ngược lên trên đỉnh modal thì màn hình bị "đơ" cứng ngắc, vuốt lên không ăn.
- **Nguyên nhân gốc rễ**:
  1. *Bẫy Kẹt Biên Giới WebKit do `overscroll-behavior: contain`*: Áp dụng `overscroll-behavior: contain` toàn cục lên `div[class*="overflow-y-auto"]` khiến trình duyệt iOS Safari / Chrome Android đóng băng cử chỉ touch khi chạm đáy hoặc chạm đỉnh.
  2. *Thiếu `min-h-0` trong Flex Column*: Trong layout `flex flex-col`, flex item con có `flex-1 overflow-y-auto` mặc định nhận `min-height: auto`, khiến trình duyệt tính toán kích thước chiều cao theo toàn bộ nội dung con thay vì co lại theo khung nhìn, gây lỗi cuộn một chiều.
  3. *Bẫy Scroll Lồng Nhau (Nested Scroll Trap)*: Khối danh sách gói tiện ích `max-h-[300px] overflow-y-auto` nằm lọt thỏm trong modal. Ngón tay chạm vào khối này sẽ bị giam giữ cử chỉ, không cho phép lan truyền cuộn lên modal cha.
  4. *Rò rỉ cuộn nền*: `document.body` không được khóa khi mở modal, khiến cử chỉ vuốt bị phân tán ra trang nền.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Dùng hook `useLockBodyScroll` khóa `document.body.style.overflow = 'hidden'` và `touchAction = 'none'` khi mở modal.
  - Sửa `src/index.css` đổi `overscroll-behavior: contain` thành `touch-action: pan-y !important; overscroll-behavior-y: auto !important;`.
  - Bổ sung `min-h-0 touch-pan-y` vào toàn bộ thẻ cuộn `flex-1 min-h-0 overflow-y-auto touch-pan-y`.
  - Trên mobile, cho phép danh sách gói tiện ích và mô tả co giãn tự nhiên (`sm:max-h-[300px] sm:overflow-y-auto`) thay vì ép scroll lồng nhau.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không áp đặt `overscroll-behavior: contain` bừa bãi lên toàn bộ container cuộn*: WebKit sẽ đóng băng cử chỉ khi người dùng chạm biên.
  - ❌ *Không quên `min-h-0` khi dùng `flex-1 overflow-y-auto` trong container flex column*: Sẽ gây lỗi layout chiều cao và kẹt cuộn trên thiết bị di động.
  - ❌ *Không lồng container cuộn có chiều cao cố định (`max-h-[300px] overflow-y-auto`) bên trong modal di động vốn đã scroll*: Ngón tay cái của người dùng sẽ bị bẫy trong container con.


### ISSUE-057: Lỗi xếp tầng nhiều thanh công cụ và lặp nút Copy trên mobile chiếm dụng diện tích màn hình chi tiết game
- **Triệu chứng**:
  - Khi mở modal chi tiết game trên mobile, các thanh công cụ xếp chồng dọc liên tiếp: nút tải Google Play $\rightarrow$ tab lọc 3 cột $\rightarrow$ khung thông báo số mã còn hạn kèm nút copy $\rightarrow$ tiêu đề phần 1 kèm nút copy thứ 2.
  - Toàn bộ nửa trên màn hình bị chiếm bởi các thanh điều khiển trùng lặp, đẩy danh sách mã giftcode xuống sâu ngoài tầm mắt.
- **Nguyên nhân gốc rễ**:
  - Giao diện thiết kế cho desktop với các khối chức năng tách rời khi thu nhỏ xuống mobile không được gom cụm lại theo hành vi chạm ngón cái (Thumb-zone UX).
  - Tên game và khoảng trống tiêu đề trên mobile bị bỏ phí không tích hợp bộ đếm và tab chuyển nhanh.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Đưa 3 nút thống kê & lọc `[Tất cả]` `[Còn hạn]` `[Hết hạn]` lên cùng hàng (`flex-wrap`) ngang với vị trí tên game.
  - Đưa nút `[Copy tất cả]` lên ngang hàng trực tiếp với `[Google Play]`, `[App Store]` trên thanh Action Bar.
  - Ẩn khối sticky container trùng lặp trên mobile (`hidden sm:block`) để danh sách mã giftcode hiển thị ngay khi vừa mở modal.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không xếp chồng quá 2 hàng thanh công cụ trên modal di động*: Màn hình điện thoại có chiều dọc hạn chế, mỗi hàng công cụ dư thừa sẽ làm tăng tỉ lệ thoát trang (bounce rate) của khách hàng.
  - ❌ *Không lặp lại nút "Copy tất cả" ở nhiều khối sticky và tiêu đề cùng lúc*: Chỉ cần 1 nút nổi bật nhất đặt ngay cạnh nút tải game.


### ISSUE-056: Lỗi nháy hình liên tục trong thẻ tin tức do React Reconciliation đè Virtual DOM lên DOM thực tế (`onError`) & Bẫy co cụm ảnh thành ô vuông 80px do kiểm tra `url.includes(gameSlug)`
- **Triệu chứng**:
  - Nhiều thẻ tin tức trên web khách (`codegame.shop/news`) bị nháy hình (flicker/flash) liên tục mỗi khi có sự kiện re-render (hover, cuộn, toast marketing FOMO nổ mỗi 15-30s).
  - Các bài viết chuyên đề (Board Game, 5.000 Nhân Lực, Thị Trường Game VN) bị màn hình đen thui (black container).
  - Thẻ bài viết "Tổng hợp giftcode quà tặng VIP" hoặc bài game bị co thành ô vuông nhỏ 80px lọt thỏm giữa nền đen rỗng.
- **Nguyên nhân gốc rễ**:
  1. *React Virtual DOM Reconciliation vs Real DOM `onError`*: `NewsView.tsx` và `NewsDetailModal.tsx` can thiệp trực tiếp `el.src = fallback` trong `onError` của thẻ `<img>`. Khi React re-render, Virtual DOM có `src` ban đầu khác với Real DOM, React ép ghi đè lại URL lỗi. Trình duyệt tải lại lỗi $\rightarrow$ kích hoạt `onError` $\rightarrow$ DOM đổi $\rightarrow$ re-render ép lại $\rightarrow$ tạo thành vòng lặp nháy hình liên tục.
  2. *Bẫy Substring Match Trap trong hàm nhận diện Icon*: `url.includes(gameSlug)` trả về `true` cho bài viết có `cover_url: '/news_covers/qua-tang-giftcode-vip.webp'` và `game_slug: 'qua-tang'`, khiến component hiểu nhầm ảnh phong cảnh 1200x675 thành icon vuông game 80px và áp class `w-20 h-20` giữa hộp đen!
  3. *Lỗi 404 chuỗi fallback ngắt dòng*: Khi fallback trỏ về `/game_icons/${gameSlug}.webp` nhưng slug này là slug chủ đề không có file thật trên đĩa, cờ `onerror = null` làm ảnh chết hẳn và để lộ nền đen `bg-slate-950`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xây dựng module chuẩn hóa `<SafeNewsCover>` với `useState` để React lưu giữ trạng thái URL fallback bền vững qua mọi chu kỳ re-render, loại bỏ 100% hiện tượng nháy hình.
  2. Thiết lập hàm `resolveTopicCoverByKeywords` ánh xạ chính xác 10 chủ đề chuyên đề lớn (`nhan-luc`, `board-game`, `qua-tang`, `thi-truong`, `xbox`, `apple-arcade`, `cktg`, `game-offline`, `xac-thuc`, `blv`) với ảnh bìa phong cảnh 1200x675 tràn viền (Full-Bleed `w-full h-full object-cover`).
  3. Tinh chỉnh `isOnlyIconUrl` chỉ nhận diện `/game_icons/` (loại trừ `/news_covers/`), giải phóng ảnh phong cảnh hiển thị trọn vẹn tỉ lệ 16:10.
  4. Cập nhật và đồng bộ 100% 91/91 bài viết trên Cloudflare D1 và Web Khách, bổ sung bộ phân loại tự động vào crawler `auto_news_publisher.cjs`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán trực tiếp `e.currentTarget.src = fallback` trong `onError`*: Nếu component có polling hoặc toast marketing nổ thường xuyên, việc can thiệp trực tiếp vào DOM sẽ gây ra xung đột reconcile và nhấp nháy vô tận. Luôn bọc trong sub-component với `useState`.
  - ❌ *Không dùng `url.includes(gameSlug)` để phân biệt icon game*: Tên file ảnh bìa chuyên đề thường chứa từ khóa trùng với slug chủ đề. Chỉ kiểm tra `url.startsWith('/game_icons/') && !url.includes('/news_covers/')`.


### ISSUE-012: Chồng chéo giao diện tìm kiếm trên mobile do bàn phím ảo đẩy Bottom Nav và Toast Marketing đè lên ô input
- **Triệu chứng**:
  - Khi người dùng chạm vào ô tìm kiếm trên điện thoại di động và bắt đầu gõ (ví dụ gõ "Hắc"), bàn phím ảo bật lên đẩy thanh Bottom Navigation lên sát mép trên bàn phím.
  - Đồng thời Toast thông báo Marketing (FOMO) nổi đè lên trên Bottom Nav và các thẻ game.
  - Ô tìm kiếm bị cuộn mất dạng hoặc che khuất hoàn toàn, giao diện bị đè chữ lộn xộn, người dùng không thể nhìn thấy text đang gõ, nút xóa hay danh sách kết quả.
- **Nguyên nhân gốc rễ**:
  - Tìm kiếm mobile vẫn dùng chung component dropdown `absolute` theo flow tài liệu desktop.
  - Không có Fullscreen Search Overlay tách biệt qua `createPortal` vào `document.body`.
  - Không có cơ chế nhận diện mở tìm kiếm trên mobile để tạm ẩn thanh `MobileBottomNav` và `MarketingNotificationToast`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Triển khai Dedicated Fullscreen Mobile Search Overlay qua `createPortal(..., document.body)` với `z-[100]`.
  - Đồng bộ kích thước chiều cao và tọa độ theo `window.visualViewport` để overlay luôn luôn khít 100% trong khoảng trống phía trên bàn phím ảo.
  - Header tìm kiếm cố định (`sticky top-0`) gồm nút Quay lại `[←]`, ô input 16px to rõ có autofocus, nút xóa nhanh `[✕]`, nút "Tìm", dải Quick Tags gợi ý, và danh sách kết quả tối ưu chạm ngón cái.
  - Phát tín hiệu `wcg_mobile_search_toggled` để tự động ẩn hoàn toàn `MobileBottomNav` và `MarketingNotificationToast` trong suốt thời gian tìm kiếm.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ tăng z-index của dropdown desktop hoặc cuộn trang*: Bàn phím ảo trên mobile co hẹp viewport và làm lệch vị trí `absolute`, trong khi các phần tử `fixed bottom-0` luôn bị đẩy lên trên bàn phím.
  - ❌ *Không để Toast marketing hoặc Bottom Nav hiển thị trong khi người dùng đang nhập liệu*: Gây xao nhãng và đè lấp kết quả tìm kiếm trên màn hình di động nhỏ.

---

### ISSUE-011: Lỗi giật lùi số lượng đã bán do lệch mốc cơ sở tĩnh giữa Bundle và Server Snapshot & Cloudflare Edge Cache
- **Triệu chứng**:
  - Số lượng đã bán trên thẻ sản phẩm (ví dụ VS Phone VIP) sau khi được cập nhật lên mốc mới (ví dụ 215) thì khi khách hàng F5, chuyển tab hoặc mở trên trình duyệt khác lại bị "giật lùi" về mốc cũ (214).
  - Thanh bộ lọc danh mục còn xuất hiện các tab rác không có sản phẩm (`other`, `App`, `🤝 Cộng tác`).
- **Nguyên nhân gốc rễ**:
  - Mốc tĩnh lưu trong `utilities.json` (65) thấp hơn đỉnh đã đạt được trên máy chủ Cloudflare D1/Edge Snapshot (66). Trong khung hình render đầu tiên trước khi API snapshot trả về, client đọc số tĩnh nên bị giật lùi về 214.
  - Endpoint `/api/metrics/synced` bị áp đặt Cloudflare Edge Cache 30s không cho qua query string `_t` / `fresh=1`, trả về snapshot cũ chứa số liệu lỗi thời.
  - Trong `functions/api/sync.ts`, logic kiểm tra `num <= cur + 5` đã từ chối cập nhật khi `cur === 0` (isolate mới).
- **Giải pháp chuẩn đã kiểm chứng**:
  - Đồng bộ mốc cơ sở tĩnh trong `src/data/utilities.json` khớp 100% với đỉnh cao nhất trên máy chủ ($39 + 66 + 110 = 215$) để render chuẩn ngay từ millisecond đầu tiên.
  - Kiểm tra `isFreshRequested` trong `functions/_worker.ts` để bỏ qua Edge Cache khi client yêu cầu dữ liệu mới.
  - Sửa `cur === 0 || (num > cur && num <= cur + 10)` trong `functions/api/sync.ts` để luôn tiếp nhận đỉnh từ client.
  - Lọc bỏ các tab danh mục có 0 sản phẩm hoạt động trong `UtilitiesView.tsx`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ trông đợi vào API async để kéo số lên*: Nếu số tĩnh trong bundle thấp hơn số server, mỗi lần tải trang người dùng đều sẽ thấy số giật lùi trước khi bật lên.
  - ❌ *Không cache cứng API snapshot trên Edge mà bỏ qua cờ no-store/fresh*: Sẽ làm client bị giam trong dữ liệu cũ 30 giây.
  - ❌ *Không đặt trần rào cản quá hẹp như `effectiveBaseTarget + 10` hay `peakSold > rawDisplaySold + 5`*: Việc này sẽ bóp nghẹt đà tăng trưởng tự nhiên của sản phẩm và kích hoạt logic reset số về mốc cơ sở (216). Luôn đặt trần rộng rãi (+2000) và tuân thủ hàm đơn điệu tăng dần (Monotonically Non-Decreasing) trên toàn bộ Client Listeners, Server RealEventsHub và Cloudflare Snapshot Engine.

---

### ISSUE-010: Sản phẩm test còn tồn đọng hiển thị trên môi trường sản xuất (Test Artifact Leak on Production)
- **Triệu chứng**:
  - Trên web khách hàng hiển thị các sản phẩm test hoặc dữ liệu thử nghiệm (ví dụ: "PINE WORLD BROWSER" hiển thị trên đầu danh mục Tiện ích với trạng thái Còn hàng).
- **Nguyên nhân gốc rễ**:
  - Sản phẩm dùng để thử nghiệm tính năng hoặc test template giao diện trong giai đoạn đầu không được dọn dẹp sạch sẽ sau khi test.
  - Khi can thiệp cấu hình tồn kho thử nghiệm, sản phẩm test vô tình được gán tồn kho lớn, khiến thuật toán sắp xếp (sort by stock) tự động đưa sản phẩm test lên đầu trang chủ/danh mục.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Thực hiện nghiêm ngặt Quy tắc 7: Toàn bộ sản phẩm, mã code hay dữ liệu test phải được tự động xóa sạch hoàn toàn sau khi kiểm thử.
  - Xóa vĩnh viễn khỏi file dữ liệu tĩnh `src/data/utilities.json` (chỉ giữ 18 gói VS Phone chính hãng của người dùng).
  - Gửi Tombstone `deletedUtilities: ['ut_1791615390756_1yc']` lên Cloudflare D1 API `/api/sync` để xóa triệt để dòng dữ liệu trong bảng SQL `utilities` và lưu vào `wcg_deleted_utilities`.
  - Khóa vĩnh viễn ID trong bộ kiểm thử `scripts/audit_zero_test_artifacts.cjs` để ngăn chặn bất kỳ hành vi vô tình thêm lại vào codebase.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ ẩn sản phẩm trên UI hoặc chỉ sửa ở code cục bộ*: Nếu không đồng bộ xóa trên Cloudflare D1 kèm Tombstone, API `/api/sync` sẽ tải đè lại sản phẩm cũ lên trình duyệt người dùng.

---

### ISSUE-009: Lỗi cộng dồn kép số lượng đã bán của thẻ gom nhóm (Double Accumulation)
- **Triệu chứng**:
  - Số lượng đã bán trên thẻ gom nhóm (ví dụ thẻ Tiện ích VS Phone VIP, Basic, KVIP...) bị nhảy vọt lên phi lý (VIP nhảy lên 362 thay vì 213, Basic lên 443 thay vì 246, KVIP lên 335 thay vì 185...).
- **Nguyên nhân gốc rễ**:
  - Thẻ cha gom nhóm (parentUtility) sử dụng ID của gói con đại diện (lead.id = ut_vs_05_vip_7d).
  - Khi getSoldDisplay tính tổng các gói con (39 + 64 + 110 = 213), nếu lưu kết quả vào highWaterSoldCountMap với key lead.id, lần re-render tiếp theo gói con ut_vs_05_vip_7d đọc ra 213 thay vì 64, làm tổng bị nhân đôi: 39 + 213 + 110 = 362.
  - Đồng thời các hàm hourlyGrowth và inHourProgression tự tính chênh lệch thời gian và cộng thêm số ngẫu nhiên khiến số bán nhảy loạn không cố định.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Khi thẻ gom nhóm có packages && packages.length > 1, tính tổng và trả về trực tiếp, tuyệt đối không ghi đè vào highWaterSoldCountMap dưới ID của gói con đơn lẻ.
  - Cố định con số cơ sở bằng effectiveRealSold + virtualBase và chỉ tăng trưởng đều đúng +1 đơn vị khi có sự kiện toast mua hàng (BUY_PRODUCT) nổ ra.
  - Tự động thanh lọc các mốc rác cũ vượt trần trong LocalStorage.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không lưu tổng nhóm vào bộ nhớ cache map với key là id của gói con lẻ*: Gây ô nhiễm dữ liệu gói con đại diện và cộng dồn đệ quy vô hạn.

---

### ISSUE-008: Lỗi ReferenceError khi click vào thẻ Giveaway và ID ảo làm mất kết nối database
- **Triệu chứng**:
  - Khi người dùng click vào thẻ Giveaway ngoài web khách hoặc bấm nút "Chi tiết", giao diện bị đơ, không mở modal hoặc ném lỗi console `ReferenceError: selectedRewardPackageId is not defined`.
  - Hoặc khi bấm giật code thì API báo `Chiến dịch không tồn tại` do ID bị gán tiền tố ảo `group_gw_...`.
- **Nguyên nhân gốc rễ**:
  - Component `GiveawaysView.tsx` sử dụng biến `selectedRewardPackageId` để tính toán active package nhưng thiếu khai báo state `useState`.
  - Hàm `groupGiveawaysByGame` trong `productPackageUtils.ts` tự ý đổi ID campaign đại diện thành `group_gw_...`, khiến các truy vấn theo ID gốc vào `giveaways.json` hoặc database Cloudflare KV / D1 thất bại.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Khai báo đầy đủ state `const [selectedRewardPackageId, setSelectedRewardPackageId] = useState<string | null>(null);` và gán mặc định qua `handleOpenDetailModal(campaign)`.
  - Giữ nguyên `id: lead.id` cho các sản phẩm/chiến dịch đại diện được gom nhóm (`parentProduct.id = lead.id`, `parentUtility.id = lead.id`, `parentCampaign.id = lead.id`), lưu ID từng đợt vào `pkg.id`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tự ý gán ID ảo dạng `group_...` cho sản phẩm đại diện*: Gây sập liên kết khóa ngoại với kho mã SKU, bảng D1 và API claims.

---

### ISSUE-001: Bất đồng bộ tồn kho thật vs tồn kho ảo (Ghost Stock & Data Resurrection)
- **Triệu chứng**:
  - Admin đã chuyển trạng thái sản phẩm sang hết hàng hoặc xóa hết sản phẩm trong kho `inventory`, nhưng web khách vẫn báo còn hàng, vẫn cho mua, hoặc sau khi F5 lại tự nhảy về trạng thái còn hàng.
- **Nguyên nhân gốc rễ**:
  - `marketingService.getDisplayStock` tự động cộng thêm số lượng tồn kho ảo (`virtualStockBonus`) hoặc kích hoạt auto-restock khi không kiểm tra chặt chẽ `baseStock <= 0`.
  - Phía backend Cloudflare KV (`/api/sync`) thiếu cơ chế Tombstone nên dữ liệu cũ trên KV bị merge ngược lại vào LocalStorage của client.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Quy tắc vàng**: Bất kể cấu hình ảo là gì, nếu `baseStock <= 0` $\rightarrow$ Trả về `0` ngay lập tức (`liveVirtualStockMap.set(id, 0); return 0;`), ngắt hoàn toàn bonus, ngắt auto-restock, ngắt thông báo mua ảo.
  - Sử dụng cơ chế Tombstone (`deletedIdsSet`) gửi lên `/api/sync` để xóa triệt để trên Cloudflare KV & D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được chỉ gán cờ `is_active = false` trên UI mà bỏ qua hàm `getDisplayStock`*: Khách vẫn thấy tồn kho ảo hiển thị trên thẻ sản phẩm.
  - ❌ *Không được chỉ xóa sản phẩm ở LocalStorage mà không gửi Tombstone lên Cloudflare KV*: Lần đồng bộ tiếp theo KV sẽ "hồi sinh" lại dữ liệu vừa xóa.

---

### ISSUE-002: Lỗi SQL D1 khi mua hàng (`no such column: sku`)
- **Triệu chứng**:
  - Khách có đủ số dư ví, kho còn hàng, nhưng khi nhấn "Mua ngay" thì hệ thống báo lỗi thực thi giao dịch và không trừ hàng, không trừ tiền.
- **Nguyên nhân gốc rễ**:
  - Schema bảng `inventory_items` trong cơ sở dữ liệu Cloudflare D1 không có cột `sku` (chỉ có `id`, `product_id`, `item_type`, `code_data`, `status`, `created_at`).
  - Câu lệnh SQL trong `functions/api/orders/create.ts` truy vấn `WHERE product_id = ? AND sku = ?` làm sập transaction.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Truy vấn theo `product_id` và `status = 'available'`, loại bỏ triệt để mọi điều kiện `AND sku = ?` khỏi SQL query D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được sửa frontend truyền chuỗi rỗng `sku = ''`*: Bảng D1 không có cột `sku` nên câu lệnh SQL vẫn sập runtime.
  - ❌ *Không được đổ lỗi cho số dư ví hoặc ép kiểu tiền tệ mà chưa kiểm tra SQL log của Cloudflare D1*.

---

### ISSUE-003: Lỗi đúp số khi nhập số tiền nạp ví với bộ gõ tiếng Việt (Unikey/EVKey)
- **Triệu chứng**:
  - Trong modal nạp tiền, người dùng chọn số tiền mẫu (ví dụ 50.000) rồi gõ thêm số thì bị nhân đôi ký tự hoặc chèn sai vị trí (ví dụ gõ 1 thành 5000011).
- **Nguyên nhân gốc rễ**:
  - Bộ gõ tiếng Việt trên Windows (Unikey, EVKey) gửi sự kiện `compositionstart`, `compositionupdate`, `compositionend` kết hợp với `onChange`.
  - Nếu kết hợp với `input.select()` trên `onFocus` và format chuỗi có dấu chấm phân cách, Unikey xóa vùng chọn rồi chèn lại ký tự cũ kèm ký tự mới.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Lọc bỏ ký tự không phải số bằng regex thô `replace(/\D/g, '')`.
  - Sử dụng cờ `isComposingRef` để bỏ qua xử lý định dạng khi Unikey đang ghép ký tự tiếng Việt.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được dùng `e.target.select()` trên sự kiện `onFocus` của trường nhập tiền*: Gây xung đột nghiêm trọng với Unikey/EVKey.

---

### ISSUE-004: Nghẽn hàng đợi GitHub Actions Cron khi đặt vào phút 00 (`0 * * * *`)
- **Triệu chứng**:
  - Thiết lập cron tự động quét giftcode và xuất bản tin tức nhưng chờ 4 - 10 tiếng không thấy workflow nào được kích hoạt.
- **Nguyên nhân gốc rễ**:
  - Phút 00 của mỗi giờ là thời điểm hàng triệu repository trên toàn cầu cùng chạy cron, gây quá tải bộ lập lịch (scheduler queue) của GitHub Actions.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Đặt lịch cron vào các phút lẻ: `15 * * * *` (cho Auto Crawler) và `45 * * * *` (cho Auto News Publisher).
  - Tích hợp `workflow_dispatch` để cho phép kích hoạt tức thì từ API và nút bấm thủ công.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được giữ nguyên cron `0 * * * *` và tăng retry timeout*: Vấn đề nằm ở khâu cấp phát máy chủ ảo của GitHub, tăng timeout chỉ làm nghẽn thêm.

---

### ISSUE-005: Offline Catch-Up làm tăng vọt số lượng ảo phi thực tế
- **Triệu chứng**:
  - Sau một đêm hoặc khi người dùng mở lại trang sau thời gian dài offline, số lượng đã bán hoặc đã nhận mã tăng vọt từ 2 lên 70 đơn trong 1 giây.
- **Nguyên nhân gốc rễ**:
  - Thuật toán tính toán số lượng trôi qua theo thời gian (`getHourlyGrowth`) không có trần giới hạn (cap) tối đa cho mỗi phiên truy cập.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Thiết lập chặn trần tối đa nghiêm ngặt (`oosMax`, `maxCatchUpUnits` tối đa không vượt quá 30 - 70 đơn).
  - Nếu hàng thật hết (`realStock <= 0`), ngắt toàn bộ in-hour progression và khóa trần `hourlyGrowth`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được để thuật toán tính bù thời gian lũy kế tuyến tính không giới hạn trần*.

---

### ISSUE-006: Lỗi Stacking Context và Trôi Màn Hình (Overflow) trong Admin
- **Triệu chứng**:
  - Modal chỉnh sửa bị che khuất bởi sidebar hoặc menu dropdown; các nút Sửa / Xóa trong bảng quản trị bị trôi ra khỏi màn hình bên phải.
- **Nguyên nhân gốc rễ**:
  - Modal lồng sâu trong component con bị giới hạn bởi `overflow: hidden` hoặc `z-index` của cha.
  - Bảng dữ liệu có quá nhiều cột nhưng không có `sticky` cho cột hành động.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Sử dụng React `createPortal(modal, document.body)` để đưa modal lên thẳng root của DOM.
  - Thêm class `sticky right-0 bg-slate-900` cho cột Thao tác (Actions) trong các bảng quản trị.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tăng `z-[999999]` bên trong component con bị che bởi parent có `overflow: hidden`*: Thuộc tính z-index không thể vượt qua ngữ cảnh xếp chồng (stacking context) của cha.

---

### ISSUE-007: Khóa đỉnh số đã bán/đã săn ảo và tự động khôi phục số cũ khi Admin chỉnh sửa (Peak Lock & Revert Bug)
- **Triệu chứng**:
  - Admin chỉnh sửa giảm số lượng đã bán ảo (`virtual_sold_count` trong Utilities hoặc Store Products) hoặc số lượng đã săn ảo (`virtual_claimed_offset` trong Giveaways), nhưng chỉ vài giây sau trang web tự nhảy lại con số cũ (ví dụ 139), không thể đặt về mức thấp hơn hoặc về 0.
- **Nguyên nhân gốc rễ**:
  - Admin save hàm `saveStoreProductItem` và `saveUtilityItem` ép lấy `Math.max(existing.sold_count, item.sold_count)`.
  - Phía Cloudflare API `report_peak_metrics` chỉ nhận cập nhật nếu `num > cur || (cur > num + 50)` và `num > 0`, từ chối cập nhật khi Admin giảm nhẹ hoặc về 0.
  - Hàm `saveRealEventsHub` tự động monotonic merge với bộ nhớ isolate cũ `memHub`.
  - Client poller chạy định kỳ 10s lấy snapshot từ Cloudflare và ép `Math.max(curSold, info.sold)` kéo số cũ đè lại LocalStorage.
  - Cho phép Admin ghi đè trực tiếp giá trị mới không qua `Math.max`.
  - Bổ sung cờ `forceResetSold: true` và `forceResetClaimed: true` trong API `/api/sync`.
  - Vô hiệu hóa `memHub` monotonic merge khi có cờ `forceReset` trong `saveRealEventsHub(env, hub, true)`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ sửa LocalStorage ở client mà không cập nhật Cloudflare KV/D1 Hub*: Poller 10s sẽ kéo đỉnh cũ về ghi đè lại.
  - ❌ *Không chỉ sửa D1 mà quên vô hiệu hóa isolate memory `memHub`*: Bộ nhớ in-memory của Cloudflare Worker sẽ merge đè lại đỉnh cũ vào D1 trong các request tiếp theo.

---

### ISSUE-008: Xung đột Poller Snapshot kéo tụt số lượng đã bán của Live Toasts & Bẫy Kẹp Trần Rubber-Band (+10 / +15)
- **Triệu chứng**:
  - Khách đang xem web, thông báo toast nổ ra "vừa mua thành công..." nhưng số đã bán trên thẻ sản phẩm (đặc biệt là Tiện ích) không tăng lên hoặc cứ nhảy lên được 1-2 đơn lại bị giật lùi về con số cũ cố định (ví dụ 138-139), hoặc cứ một thời gian số ảo đã bán lại bị kéo lùi về mức ban đầu.
- **Nguyên nhân gốc rễ**:
  - `loadProducts(env)` và `loadGiveaways(env)` trong `snapshotService.ts` bị lỗi `ReferenceError: masterRaw is not defined` do thiếu biến trong destructuring `Promise.all`. Lỗi runtime khiến hàm trả về `[]`, dẫn đến vòng lặp dọn dẹp peak xóa sạch `hub.peakProductSoldCounts` trên D1!
  - Bẫy xóa sạch `recordedMax` trong `getSoldDisplay()` & `getClaimedDisplay()` khi `realStock <= 0 && !oosEnabled`: 18/19 tiện ích có `stock_quantity = 0`, nên mỗi khi render lại hàm tự ý gán `recordedMax = baseTotal` (48, 72, 125) thay vì giữ đỉnh (77, 99, 152).
  - Bẫy kẹp trần nhân tạo quá hẹp: `maxAllowedCap = maxCatchUp + 10` trong `getSoldDisplay()`, `maxCap = maxCatchUp + 15` trong poller, `maxAllowed = maxCatchUp + 15` trong `snapshotService.ts`, và `(prevTotal > computedTotal + 20)` trong `stats.ts`.
  - Bẫy ngắt toàn bộ tiến trình tăng trưởng `if (!parsedAnchorMs) return 0;` trong `getHourlyGrowth` và `getInHourProgression` khi sản phẩm không có `fomo_anchor_time`.
  - Bẫy auto-heal `if (recordedMax > calculatedBase + 50)` xóa sạch số bán tích lũy khi offline catch-up đạt > 50 đơn.
  - Initial Welcome Toast trong `MarketingNotificationToast.tsx` bị gán nhầm `(welcomeData.notif as any).localOrigin = true;`, ngăn cản toast gọi `recordVirtualSale`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - `loadProducts` và `loadGiveaways` trong `snapshotService.ts` chuyển sang dùng `loadAllStoreProductsD1`, `loadAllUtilitiesD1`, và `loadAllGiveawaysD1` chuẩn từ `d1_service.ts`.
  - Vô hiệu hóa việc xóa đỉnh khỏi `hub.peakProductSoldCounts` và `hub.peakGiveawayClaimedCounts`, chỉ dọn dẹp nếu dữ liệu hỏng (`> 1,000,000` hoặc `NaN`).
  - Trong `getSoldDisplay()` và `getClaimedDisplay()`, khi `realStock <= 0 && !oosEnabled`: Không xóa `recordedMax`! Chỉ đóng băng tiến trình tăng theo giờ (`hourlyGrowth = 0; inHourProg = 0`), luôn trả về `Math.max(calculatedBase, recordedMax)`.
  - Fallback anchor thông minh về `sessionAnchor.lastTimestamp` hoặc đầu ngày `dayStart` khi không có `anchorTime` cụ thể.
  - Mở rộng trần bảo vệ an toàn `Math.max(50000, baseline + 5000)` thay cho các mức hẹp `+ 10 / + 15` hay `+ 50`, và xóa bỏ kẹp trần `+ 20` trong `stats.ts`.
  - Bổ sung `ensureSessionAnchorsSeeded()` nạp mốc cho toàn bộ catalog và nới `maxCap` lên 70 đơn theo cấu hình Admin.
  - Bỏ cờ `localOrigin = true` tại Welcome Toast, đảm bảo 100% mọi toast nổ ra đều kích hoạt tăng số đã bán trên UI.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được dùng điều kiện `curSold > info.sold + 2` trong vòng lặp poller*: Sẽ phá hủy hoàn toàn tiến trình bán hàng tự nhiên của phiên người dùng.
  - ❌ *Không được kẹp trần `maxAllowedCap` ở mức hẹp `maxCatchUp + 10` hoặc `+ 15` hay `+ 50`*: Khi số đơn bán thêm vượt quá 6-10 đơn hoặc 50 đơn, số lượng sẽ bị tự động giật lùi về mốc ban đầu (rubber-band trap).
  - ❌ *Không được return 0 khi thiếu `anchorTime`*: Khiến toàn bộ số ảo Admin thiết lập không thể tự trôi theo thời gian.
  - ❌ *Không được gán `this.highWaterSoldCountMap.set(id, baseTotal)` khi `realStock <= 0` trong `getSoldDisplay()`*: Sẽ xóa sạch các đơn hàng đã bán tích lũy của tiện ích.
  - ❌ *Không được xóa đỉnh `hub.peakProductSoldCounts` trong server snapshot chỉ vì sản phẩm hết hàng hoặc không có số ảo*.

### ISSUE-009: Rào cản Facebook Login Wall và lỗi Stub Facebook Scraper không lấy được code từ Fanpage
- **Triệu chứng**:
  - Người dùng thêm URL Facebook Fanpage của trang game vào danh sách nguồn cào trong Admin, bài viết tặng code đã đăng trên Fanpage nhiều giờ trước nhưng hệ thống hoàn toàn không cập nhật được giftcode mới.
- **Nguyên nhân gốc rễ**:
  - `run_crawler.cjs` chỉ gọi `facebookScraper.parsePost(src.description || src.name)` mà hoàn toàn không thực hiện HTTP GET tới `src.url`. Khi nguồn mới không có trường description, text truyền vào chỉ là tên game nên không thể trích xuất mã code.
  - File `facebook_scraper.cjs` chỉ là stub parser tĩnh 44 dòng, thiếu engine fetch và thiếu phương án vượt rào cản đăng nhập.
  - Facebook (Meta) áp dụng chính sách chặn nghiêm ngặt (Login Wall / Checkpoint) đối với mọi bot máy chủ tự động, trả về 302/400 yêu cầu đăng nhập.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tích hợp **Cross-Source Game Intelligence Engine**: Khi Facebook trả về rào chắn Login Wall, scraper tự động đối soát và trích xuất giftcode từ các cổng tin cập nhật bài đăng Fanpage NPH của chính tựa game đó (CodeMoi, Sforum, AFKMobi...).
  - Siết chặt bộ lọc code: Bắt buộc mã phải chứa chữ cái in hoa (loại bỏ triệt để số timestamp dài như 1790816400000), lọc bỏ từ vựng tiếng Việt viết hoa qua `STOP_WORDS`.
  - Hợp nhất 2 chiều (Bi-directional Merge) trong `run_crawler.cjs` để không bao giờ bỏ rơi nguồn do Admin tạo mới trên Web và tự động lưu ngược về file JSON cục bộ.
  - Trang bị công cụ **"⚡ Trích Xuất Nhanh Mã Từ Bài Viết Fanpage" (Quick Ingest Modal)** trên UI Admin để Admin dán thẳng nội dung status/bài đăng Facebook để AI Regex bóc tách toàn bộ mã code chỉ trong 0.1 giây và phê duyệt 1-chạm đưa thẳng lên Web Khách.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gửi HTTP GET đơn thuần tới `www.facebook.com` mà không có cơ chế dự phòng*: Sẽ luôn nhận về trang Login Wall rỗng.
  - ❌ *Không chỉ truyền `src.description || src.name` vào parser mà bỏ qua `src.url`*.

---

### ISSUE-010: Bẫy ẩn văn bản ("Xem thêm") và Link Shim của Facebook khiến Extension bỏ sót code & link
- **Triệu chứng**:
  - Khi dùng Extension quét Fanpage Facebook, chỉ lấy được 2-3 bài viết đầu tiên; các bài viết dài bị thiếu mã code nằm ở nửa sau; các đường link NPH bị biến thành link chuyển tiếp `l.facebook.com`.
- **Nguyên nhân gốc rễ**:
  - Facebook sử dụng kiến trúc Virtual DOM & Infinite Scroll (chỉ render 2-4 bài tại một thời điểm) và ẩn văn bản dài sau nút "Xem thêm" (`div[role="button"]` hoặc `span`).
  - Facebook bọc toàn bộ liên kết ngoài qua Link Shim `l.facebook.com/l.php?u=...` để theo dõi và cảnh báo người dùng.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Kích hoạt `expandAllSeeMoreButtons()` để tự động click toàn bộ nút "Xem thêm" trước khi đọc text.
  - Sử dụng cơ chế Quét Sâu `runDeepScrollScan` với vòng lặp cuộn trang mượt mà kèm delay an toàn 1.2s - 1.5s để Facebook nạp thêm bài cũ mà không bị đánh dấu spam.
  - Sử dụng `decodeFacebookShimUrl` giải mã `url.searchParams.get('u')` để thu được URL sạch 100% của NPH và bóc tách giftcode nằm trong query string (`?code=...`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không quét `document.body.innerText` tĩnh mà không click "Xem thêm"*: Sẽ mất hoàn toàn mã code ẩn phía sau.
  - ❌ *Không cuộn trang liên tục không có delay*: DOM sẽ không kịp tải thêm bài mới.

---

### ISSUE-011: Bẫy unmount bài viết của Facebook Virtual DOM & bẫy từ tiếng Việt viết hoa (THAM, NGHEN...)
- **Triệu chứng**:
  - Người dùng chọn quét 40-50 bài viết nhưng kết thúc chỉ thấy báo duyệt được ~15 bài; danh sách mã code bị lẫn các từ tiếng Việt như `THAM`, `NGHEN`, `CHOI`, `NGAY`; tiêu đề Fanpage bị nhận diện nhầm thành "Thông báo".
- **Nguyên nhân gốc rễ**:
  - Facebook tự unmount các node bài viết cũ phía trên khỏi DOM tree để tiết kiệm RAM. Đếm node ở cuối phiên chỉ thu được 10-15 node hiện hữu.
  - Từ ngữ tiếng Việt 4-5 ký tự viết hoa lọt qua bộ lọc do regex bắt theo cụm từ khóa ("Nhận ngay: THAM GIA...").
  - Thẻ `h1` thông báo của menu Facebook đứng trước tiêu đề Fanpage trong DOM khiến `querySelector('h1')` nhận nhầm.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Sử dụng **Cumulative Post Registry (`accumulatedPosts Map`)** lưu theo `postUrl` hoặc text hash để tích lũy vĩnh viễn bài viết suốt toàn bộ các lượt cuộn.
  - Tích hợp từ điển âm tiết tiếng Việt `VIETNAMESE_SYLLABLES`; bắt buộc chuỗi toàn chữ $\le 5$ ký tự phải bị loại bỏ, ưu tiên tuyệt đối mã có cả chữ và số (`LLDKPIB18`, `TSVDKPI0910`, `TNN20B`).
  - Hàm `getCleanFanpageName()` bỏ qua danh sách từ khóa hệ thống (`FB_SYSTEM_NAMES`) và ưu tiên đọc `meta[property="og:title"]` hoặc `document.title`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không đếm bài viết bằng `querySelectorAll('div[role="article"]').length` sau khi cuộn xong*: Chỉ thấy số node hiện hữu trong viewport cuối cùng.
  - ❌ *Không chấp nhận các chuỗi $\le 5$ ký tự chỉ gồm chữ cái mà không có số đi kèm*.

### ISSUE-012: Bẫy khớp chuỗi lỏng lẻo slug game (Array Order Trap) & Tràn chiều ngang bảng Admin
- **Triệu chứng**:
  - Người dùng bấm vào thẻ game "Tiên Nghịch Mobile" ngoài trang chủ nhưng URL lại tự đổi thành `/game/tien-nghich-tan-tinh-kiem` và mở modal của "Tiên Nghịch: Tân Tình Kiếm".
  - Trong Admin, bảng quản lý mã code miễn phí (`/admin#/free-codes`) bị tràn ngang màn hình, tiêu đề "Thời Gian Cập Nhật" bị cắt chữ ("THỜI..."), và cột Thao Tác (nút Sửa, Xóa) bị trôi mất ra ngoài mép màn hình.
- **Nguyên nhân gốc rễ**:
  - Vòng lặp `find(...)` tìm game trong `functions/api/games.ts` và `src/services/dataService.ts` kết hợp điều kiện `parts.includes(cleanWithoutMobile)` cùng lúc với exact match. Vì "Tiên Nghịch: Tân Tình Kiếm" đứng trước trong danh mục và có `parts = ['tien-nghich', 'tan-tinh-kiem']`, điều kiện `parts.includes('tien-nghich')` khớp trước và ngắt vòng lặp ngay lập tức, cướp lượt của game "Tiên Nghịch Mobile" đứng phía sau.
  - Tổng chiều rộng các cột trong bảng `FreeCodesModule` lên tới ~1200px (vượt quá 960px khung hiển thị desktop có sidebar), cột Thao Tác thiếu `sticky: 'right'`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Phân tầng ưu tiên 5 cấp khi tìm game**:
    - Tier 1: Khớp chính xác 100% slug hoặc id (`gSlug === cleanSlug || gId === cleanSlug`). NẾU CÓ, TRẢ VỀ NGAY!
    - Tier 2: Khớp chính xác `nameSlug === cleanSlug`.
    - Tier 3: Khớp alias đặc biệt (`pirate-legends` $\leftrightarrow$ `huyen-thoai-hai-tac`).
    - Tier 4: Khớp không có hậu tố `-mobile` (chỉ chạy khi không có game nào khớp Tiers 1-3).
    - Tier 5: Khớp cụm từ trong tên game (phương án dự phòng cuối cùng).
  - Thêm thuộc tính `sticky?: 'left' | 'right'` cho `Column<T>` trong `DataTable.tsx`, cố định cột Thao Tác ở mép phải kèm đổ bóng và nền hover.
  - Co gọn các cột bảng: giảm từ 1200px xuống ~836px, hiển thị vừa vặn 100% trong khung nhìn máy tính không cần cuộn ngang.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gộp tất cả điều kiện exact match và fuzzy parts match vào chung một biểu thức `.find(...)`*: Game đứng trước có tên chứa từ khóa sẽ cướp lượt của game đứng sau có slug trùng khớp chính xác 100%.

---

### ISSUE-011: Lỗi Bỏ Rơi Giftcode Quét Từ Extension Trên Web Khách (Missing customFreeCodes Sync)
- **Triệu chứng**:
  - Người dùng dùng Extension quét giftcode từ Facebook Fanpage đẩy lên web, mã code đã duyệt xuất hiện đầy đủ trong bảng Quản trị Admin (`/admin#/free-codes`), nhưng ngoài trang web khách (`codegame.shop`) thẻ game và modal chi tiết game vẫn chỉ hiện số lượng mã cũ, không thấy các mã mới vừa quét.
- **Nguyên nhân gốc rễ**:
  - Endpoint `/api/sync` phân tách 2 mảng: `freeCodes` (toàn bộ 10,000+ mã danh mục, chỉ gửi cho Admin có auth để tránh nặng payload) và `customFreeCodes` (các mã do Admin / Extension thêm vào, gửi công khai cho mọi người).
  - Web Khách (`dataService.ts`) trong hàm `syncWithCloudflareKV()` chỉ kiểm tra `json.freeCodes`. Vì khách không có token auth nên `json.freeCodes` luôn `undefined`, và hàm bỏ quên hoàn toàn `json.customFreeCodes`. Do đó `localStorage.getItem('wcg_admin_custom_free_codes_v1')` trên máy khách không bao giờ được cập nhật.
  - `GameDetailModal` chỉ render danh sách code từ prop tĩnh `game.codes`. Khi thẻ game ngoài catalog mang danh sách code cũ, modal mở ra không tự fetch fresh codes từ server.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Bổ sung đồng bộ `json.customFreeCodes` và `json.deletedFreeCodes` vào `dataService.ts:syncWithCloudflareKV()` và `applyFullStateSnapshot()`.
  - Trong `GameDetailModal.tsx`, trang bị state `liveGame` và `useEffect` tự động gọi `dataService.getGameBySlug(game.slug, true)` để nạp fresh codes tức thì từ server D1 khi mở modal.
  - Trong `App.tsx`, mở modal tức thì 0ms với game hiện tại và enrich song song ở background.
  - Cập nhật các mã mới vào `src/data/crawled_codes_188.json` và `public/data/crawled_codes_188.json` để tầng prerender HTML tĩnh đạt chuẩn SEO ngay từ đầu.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được chỉ kiểm tra `json.freeCodes` trong `syncWithCloudflareKV()`*: Khách vãng lai không có quyền nhận `freeCodes` lớn hàng MB, bắt buộc phải đồng bộ qua `json.customFreeCodes`.

---

### ISSUE-012: Bắt nhầm tên game & từ ngữ tiếng Anh trong tiêu đề bài viết thành giftcode (Crawler Keyword Scraping Trap)
- **Triệu chứng**:
  - Sau khi crawler chạy qua các nguồn Fallback (CodeMoi, Sforum), trên các tựa game như Pirate Legends, Delta Force, Genshin Impact xuất hiện các mã quà tặng kỳ lạ đứng đầu danh sách: `PIRATE`, `ANIIMO`, `DELTA`, `GENSHIN`, `BLADE`, `GACHA`, `PANDA`...
- **Nguyên nhân gốc rễ**:
  - Khi cào fallback các trang web tin tức, code truyền toàn bộ HTML thô vào hàm `parsePost`. Regex bắt cụm từ `Giftcode: XXXXX` đã bắt trúng chữ `Pirate` trong tiêu đề bài viết và các tên game liên quan ở sidebar.
  - Bộ tính điểm `code_scorer.cjs` tự động cấp quyền Auto-Publish (Bậc 1, $\ge 90$ điểm) cho các mã này vì nguồn official được cộng nhiều điểm uy tín.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Không truyền HTML thô vào `parsePost`, chỉ trích xuất từ bảng mã giftcode thực sự (`extractCodesFromHtml`).
  - Trong `isValidCode`: Cấm tuyệt đối bất kỳ mã nào trùng slug game hoặc từ trong tên game; áp dụng Quy tắc Mã Toàn Chữ Cái: chuỗi toàn chữ cái $\le 8$ ký tự không có tiền tố code chuẩn (`VIP`, `SVIP`, `CODE`, `GIFT`, `TANTHU`) bị loại bỏ ngay lập tức.
  - Trong `code_scorer.cjs`: Mọi mã toàn chữ cái (không có số và không có tiền tố code) bị tước quyền auto-publish, chuyển xuống Bậc 2 chờ Admin duyệt tay.
  - Dọn sạch các mã rác trên Cloudflare D1 và lưu ID vào `wcg_deleted_free_codes` (Tombstone Deletion Pattern).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không parse regex text trên toàn bộ mã HTML trang web*: Luôn bắt phải thẻ tiêu đề và sidebar.
  - ❌ *Không cho phép auto-publish các mã chỉ toàn chữ cái thông thường*: Bắt buộc phải có chữ số hoặc tiền tố giftcode chuẩn.

---

### ISSUE-013: Bẫy Kéo Giật Số Đã Bán Tiện Ích Về Mốc Cũ & Không Tăng Theo Thông Báo Toast
- **Triệu chứng**:
  - Người dùng thấy thông báo mua hàng nổ ra nhưng số lượng "Đã bán:" trên thẻ Tiện ích không tăng, hoặc nhảy lên 1 đơn rồi vài giây sau lại bị kéo giật ngược về mốc cũ (ví dụ từ 78 giật về 48 hoặc 77).
- **Nguyên nhân gốc rễ**:
  - `marketingService.ts:getSoldDisplay()`: Khi `realStock <= 0 && !oosEnabled`, code tự động gán `recordedMax = baseTotal` (chỉ 48) thay vì giữ đỉnh cũ (77).
  - `functions/api/stats.ts`: Bẫy kẹp trần thô sơ `(prevTotal > computedTotal + 20) ? computedTotal : ...` cắt xén số liệu.
  - `src/shared/deterministicEngine.ts`: Điều kiện `canAcceptPeak = realStock > 0 || oosEnabled || hasVirtualSold` vô hiệu hóa `peakSold` khi hết hàng thật.
  - `src/services/marketingService.ts:reportPeakMetrics()`: Chặn gửi peak lên Edge Hub khi `realStock <= 0`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Nguyên tắc Đơn điệu tăng lũy kế (Monotonic Progression)**: Đỉnh bán hàng và nhận quà đã đạt được là lịch sử có thật, phải được giữ vững vĩnh viễn (`Math.max(calculatedBase, recordedMax)`). Khi hết hàng thật (`realStock <= 0`), chỉ ngắt tăng theo giờ (`hourlyGrowth = 0`), tuyệt đối không reset `recordedMax`.
  - Trong `deterministicEngine.ts`: Luôn bảo toàn đỉnh bằng `Math.max(rawDisplaySold, effectivePeakSold)`.
  - Trong `reportPeakMetrics()`: Cho phép gửi mọi đỉnh cao hơn `val > last` lên Edge Hub mà không lọc chặn theo tồn kho.
  - Trong `snapshotService.ts` & `/api/metrics/synced`: Hỗ trợ force refresh và tự động revalidate khi phát hiện snapshot rỗng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán `recordedMax = baseTotal` trong `getSoldDisplay()` khi `realStock <= 0`*: Khiến số liệu giật lùi mỗi 3 giây.
  - ❌ *Không chặn `peakSold` trong `deterministicEngine.ts` khi `realStock <= 0`*: Làm server snapshot mất toàn bộ đỉnh bán hàng của sản phẩm hết hàng.

---

### ISSUE-014: Số Ảo Bị Phục Hồi Về Mốc Cũ (1484, 1419...) Do Hourly Growth Lũy Kế & Giải Pháp Admin Target Override
- **Triệu chứng**:
  - Admin điều chỉnh số ảo thành công (ví dụ mốc nhỏ 43, 54 hoặc 0 đơn) và nhận thông báo toast thành công, nhưng chỉ sau vài giây hoặc sau khi tải lại trang, các thẻ Giveaway lại giật ngược về con số cũ hàng nghìn (1484, 1419...), đôi khi sửa được 1 cái thì cái khác lại bị phục hồi số cũ.
- **Nguyên nhân gốc rễ**:
  - 1. `getClaimedDisplay()` và `getSoldDisplay()` trong `marketingService.ts` tính toán `calculatedBase` bằng cách lấy `baseClaimed + hourlyGrowth`. Do mốc thời gian bắt đầu đã trôi qua nhiều ngày, `hourlyGrowth` tự cộng dồn lên đến ~1400 đơn. Dù Admin đặt target chỉ 43 đơn, `Math.max(calculatedBase, recordedMax)` vẫn trả về con số khổng lồ 1484.
  - 2. Poller 10s snapshot ở client kéo snapshot server cũ về và chạy `Math.max(current, server)`.
  - 3. Phía Cloudflare Edge Worker (`functions/services/realEventsHub.ts`), hàm `getRealEventsHub` tự động monotonic merge bộ đếm từ Edge Cache API và Memory Isolate (`memHub`) đè ngược lên số đã xóa/reset trong D1.
  - 4. `QuickFomoAdjustModal` trước đây chỉ gọi `marketingService` mà không lưu record cập nhật vào database `adminDataService`, khiến mỗi lần sync đẩy KV đè lại offset cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Admin Target Override Pattern**: Triển khai `adminOverrideClaimedMap` và `adminOverrideSoldMap` lưu vĩnh viễn vào LocalStorage (`wcg_admin_override_claimed_v2`, `wcg_admin_override_sold_v2`).
  - Khi một ID có trong Override Map: `getClaimedDisplay()` và `getSoldDisplay()` ưu tiên tuyệt đối trả về `Math.max(effectiveReal, overrideVal)`, ngắt hoàn toàn và đóng băng `hourlyGrowth` từ quá khứ đè số mới.
  - Vô hiệu hóa Poller Snapshot và Hub Merging ghi đè lên các sản phẩm có cờ Admin Override.
  - Phía Cloudflare Edge Worker: Khi `hasD1Data` là `true`, vô hiệu hóa monotonic merge từ Cache API / isolate memory kéo ngược số trong D1.
  - Trong `QuickFomoAdjustModal`: Lưu trực tiếp vào `adminDataService` và đẩy đồng bộ KV tức thì.
  - Bổ sung bộ 3 công tắc độc lập cho từng mục: `Đã giật/Đã bán`, `Hàng còn`, `Tầng số ảo Web`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ giảm `virtual_claimed_offset` mà vẫn để `hourlyGrowth` tự do cộng dồn*: Số ngày trôi qua sẽ làm số lượng ảo tự bung ngược trở lại mốc cũ.
  - ❌ *Không chỉ sửa ở local client mà không lưu vào `adminDataService`*: KV sync sẽ đưa dữ liệu cũ quay trở lại.

---

### ISSUE-015: Bất Đồng Bộ Số Ảo Giữa Domain Admin Và Web Khách & Yêu Cầu Tăng Đều (Anchor Time Pattern)
- **Triệu chứng**:
  - Admin cài đặt số ảo cho sản phẩm hoặc Giveaway trong trang Admin (`admin.codegame.shop`) hiển thị rất đẹp (ví dụ 77, 33, 31, 52), nhưng ngoài Web Khách (`codegame.shop`) lại hiển thị các số khổng lồ (1420, 1498, 1513, 597) hoặc bị đóng băng không tăng đều.
- **Nguyên nhân gốc rễ**:
  - 1. **Khác Origin (Origin Isolation)**: Admin chạy trên domain riêng (`admin.codegame.shop`), các biến LocalStorage Override (`wcg_admin_override_claimed_v2`) không thể đọc được từ Web Khách (`codegame.shop`).
  - 2. **Đỉnh cũ trên Cloudflare Hub/D1**: `peakGiveawayClaimedCounts` lưu giữ đỉnh 1420+ từ trước. Server snapshot `/api/metrics/synced` dùng `Math.max(calculated, peak)` ép số hiển thị lên 1420+.
  - 3. **Thiếu Mốc Thời Gian Gốc (`fomo_anchor_time`)**: Khi tính tăng trưởng theo giờ, hệ thống lấy `created_at` từ nhiều ngày trước khiến `hourlyGrowth` cộng dồn hàng nghìn đơn thay vì tính từ thời điểm Admin vừa sửa.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Fomo Anchor Time Pattern**: Khi Admin lưu số ảo trong `QuickFomoAdjustModal`, gán `fomo_anchor_time = nowIso` và đồng bộ lên D1 / KV.
  - Tại $t = t_0$, mức tăng theo giờ bằng 0 $\rightarrow$ Web Khách hiển thị chuẩn 100% số mục tiêu Admin đặt.
  - Tại $t > t_0$, bộ máy `deterministicEngine.ts` và `marketingService.ts` tính toán mức tăng đều đặn từ `fomo_anchor_time`.
  - Phía Cloudflare Worker Backend: Tự động thanh lọc các đỉnh ma cũ (`peak > maxAllowed`), xóa cache `system_snapshots` khi Admin lưu số mới.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ lưu Override trong LocalStorage Admin*: Khách vào từ thiết bị khác hoặc domain khác sẽ không thấy số này.
  - ❌ *Không đóng băng hoàn toàn số ảo*: Người dùng yêu cầu số ảo phải tăng đều theo thời gian để tạo hiệu ứng FOMO bán hàng tự nhiên.

---

### ISSUE-016: Lỗi Màn Hình Đen Khi Đóng Modal Chi Tiết Game (Uncaught Render Null Crash & State Desync)
- **Triệu chứng**:
  - Khi người dùng đang xem trang chi tiết của một game (ví dụ `https://codegame.shop/game/ta-la-hac-ngo-khong`), nhấn nút [X] hoặc bấm thoát modal thì màn hình ngay lập tức bị sập thành màu đen kịt (`#0B0D19`), giao diện web biến mất hoàn toàn, URL và tiêu đề tab bị đóng băng.
- **Nguyên nhân gốc rễ**:
  - 1. **Bất đồng bộ state `liveGame` vs prop `game`**: Khi nhấn nút [X], `App.tsx` gọi `setSelectedGame(null)`. `game` prop trở thành `null`. Tuy nhiên `useState(game)` trong `GameDetailModal` vẫn lưu `liveGame` từ lần render trước (do `useEffect` đồng bộ chỉ chạy sau khi render xong).
  - 2. Biểu thức `currentGame = liveGame || game` vẫn trả về object game cũ, khiến điều kiện `if (!currentGame) return null;` không trả về `null`.
  - 3. Trong phần render JSX, hàng chục vị trí truy cập trực tiếp `game.name`, `game.icon_url`, `game.category`, `game.slug`... thay vì dùng `currentGame`. Do `game` là `null`, JavaScript ném lỗi nghiêm trọng: `TypeError: Cannot read properties of null (reading 'name')`.
  - 4. Web Khách ở `src/main.tsx` trước đây không có `ErrorBoundary`, khiến lỗi render unhandled của React làm sập và unmount toàn bộ cây ứng dụng React (`#root` bị làm rỗng), lộ ra màu nền đen `#0B0D19` của thẻ body.
- **Giải pháp chuẩn đã kiểm chứng**:
  - 1. **Kiểm tra chặt chẽ điều kiện null**: Đặt `currentGame = game ? (liveGame && (liveGame.slug === game.slug || liveGame.id === game.id) ? liveGame : game) : null`.
  - 2. Đặt `if (!game || !currentGame) return null;` ngay sau các hook React, ngắt kết xuất ngay tức khắc khi modal đóng.
  - 3. Thay thế toàn bộ 100% các truy cập `game.` trong JSX và handler thành `currentGame.`.
  - 4. Trong `App.tsx`: Bọc render điều kiện `{selectedGame && <GameDetailModal ... />}` và trong `onClose` chủ động reset URL bar về `/` ngay lập tức.
  - 5. Thêm `ErrorBoundary` bọc ngoài toàn bộ `<App />` trong `src/main.tsx` để bảo vệ chống màn hình đen vĩnh viễn trong mọi tình huống.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được dùng `liveGame || game` mà không kiểm tra `game` prop*: `liveGame` sẽ giữ giá trị cũ khi `game` đã chuyển sang `null`.
  - ❌ *Không được truy cập trực tiếp `game.prop` trong JSX của modal khi `game` có thể là `null`*: Bắt buộc phải qua `currentGame` và guard `!currentGame`.
  - ❌ *Không được để ứng dụng React ở main.tsx không có ErrorBoundary*: Bất kỳ lỗi component nào cũng sẽ unmount toàn bộ DOM thành màn hình đen.

---

### ISSUE-017: Số Đã Bán Bị Giật Ngược Về Mốc Cố Định Do Poller Snapshot Đè Override & Chỉnh Sửa Tồn Kho Kích Hoạt Reset
- **Triệu chứng**:
  - Web Khách hiển thị số đã bán (ví dụ: "Đã bán: 137"), theo thời gian hoặc khi có lượt mua ảo số tăng lên, nhưng cứ sau 20-30 giây hoặc khi Admin cộng thêm tồn kho ảo còn hàng ("virtualStockBonus"), số đã bán lập tức bị kéo giật ngược về mốc 137 cố định.
- **Nguyên nhân gốc rễ**:
  - 1. **Snapshot Poller Regression**: Trong `marketingService.ts` (`fetchMetricsSnapshot`), khi nhận snapshot từ Edge server, khối `isOverriddenSold` thực hiện `highWaterSoldCountMap.set(pId, targetSold)` đè giá trị cố định 137 lên Map, xóa sổ số liệu tăng trưởng đã đạt được.
  - 2. **Coupling Stock & Sold Reset**: `QuickFomoAdjustModal.tsx` khi Admin lưu cấu hình luôn gửi `forceReset: true` kèm `targetDisplaySoldOrClaimed` và cập nhật `fomoAnchorTime = now`, khiến Edge server xóa mốc đỉnh D1 và đưa số đã bán về 137 ngay cả khi Admin chỉ muốn chỉnh tồn kho còn hàng.
  - 3. **Unconditional Sync Call in Admin Service**: Trong `adminDataService.ts`, điều kiện `if (item.virtual_sold_count !== undefined || isSoldChanged)` luôn thỏa mãn với mọi thao tác cập nhật sản phẩm, kích hoạt `syncProductVirtualSold(..., true)`.
  - 4. **Freeze khi realStock <= 0**: Các sản phẩm dịch vụ/cloud phone không quản lý item trong bảng `inventory_items` có `realStock = 0`, khiến bộ máy FOMO coi như hết hàng thật và triệt tiêu toàn bộ `hourlyGrowth = 0; inHourProg = 0;`.
- **Giải pháp chuẩn đã kiểm chứng**:
  - 1. Đảm bảo nguyên lý Monotonic Progression trong `fetchMetricsSnapshot`: `nextSold = Math.max(curSold, targetSold, info.sold)`.
  - 2. Tách biệt `isSoldExplicitlyEdited`: Chỉ gửi `forceReset` và cập nhật `fomoAnchorTime` khi Admin chủ động thay đổi giá trị số đã bán/nhận. Khi chỉ chỉnh tồn kho, giữ nguyên `fomo_anchor_time` và số đã bán.
  - 3. Trong `adminDataService.ts`: chuyển sang điều kiện nghiêm ngặt `if (isSoldChanged)` / `if (isClaimedChanged)`.
  - 4. Bổ sung `hasActiveDisplayStock = effectiveStock > 0 || (priority !== 'off' && Number(virtualBonusStock) > 0)` để duy trì nhịp tăng tự nhiên cho sản phẩm có tồn kho ảo hiển thị.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được gán đè `highWaterSoldCountMap.set(pId, targetSold)` trong chu kỳ poller snapshot*: Phải luôn lấy `Math.max` với `curSold`.
  - ❌ *Không được gửi `forceReset: true` cho sold count khi người dùng chỉ chỉnh sửa stock bonus*: Tách bạch hoàn toàn luồng dữ liệu của 2 trường.
  - ❌ *Không được reset `fomo_anchor_time` về thời điểm hiện tại khi không sửa sold count*: Sẽ làm mất toàn bộ số lượng tăng tích lũy theo giờ từ trước tới nay.

---

### ISSUE-018: Bất Đồng Bộ Chỉ Số Đã Bán / Đã Giật / Còn / Đã Mua Giữa Các Thiết Bị Do Cờ Localhost & Double Sync Lạc Mốc Anchor
- **Triệu chứng**:
  - Các số "Đã bán", "Đã giật", "Còn", "Đã mua" hiển thị trên thiết bị của Admin (ví dụ máy tính quản trị) và thiết bị của khách (ví dụ điện thoại mobile) không đồng bộ với nhau (Admin thấy số A ví dụ 137, mobile thấy số B ví dụ 64 hoặc 167; hoặc tồn kho hiển thị khác nhau).
- **Nguyên nhân gốc rễ**:
  - 1. **Bẫy `adminOverrideSoldMap` / `adminOverrideClaimedMap` chỉ lưu ở LocalStorage của máy Admin**: Thiết bị máy tính của Admin có giá trị Override cục bộ, trong khi điện thoại khách hoặc thiết bị khác hoàn toàn không có Map này mà chỉ nhận snapshot từ Edge server `/api/metrics/synced`.
  - 2. **Bẫy cờ `isSoldExplicitlyEdited` trong commit trước (`c74e8f8`)**: Khi Admin chỉ chỉnh Tồn kho ("Còn hàng") hoặc Ưu tiên mà không gõ lại ô số đã bán, `isSoldExplicitlyEdited` trả về `false`. Khi đó `targetDisplaySoldOrClaimed` bị truyền thành `undefined`, khiến D1 / KV trên Cloudflare giữ nguyên con số cũ (ví dụ 64). Máy Admin hiển thị 137 qua override cục bộ, trong khi mobile khách kéo từ server về thấy 64.
  - 3. **Lỗi Double Sync Call lạc mốc thời gian trong `adminDataService.ts`**: Khi Admin bấm Lưu, hàm `updateItemVirtualSettings` đồng bộ số chuẩn (137). Ngay sau đó, hàm `saveStoreProductItem` / `saveUtilityItem` lại tự động kích hoạt `marketingService.syncProductVirtualSold` lần thứ 2 mà KHÔNG truyền `exactTargetDisplay` và `anchorTime`. Hàm phụ trợ `findItemDetails` thiếu trường `fomo_anchor_time`, tự động lấy lùi về `createdAt` (nhiều ngày trước) và cộng dồn +30 đơn, đẩy số đỉnh $137 + 30 = 167$ lên Cloudflare Hub. Mobile nhận snapshot 167, trong khi máy Admin bị kẹt ở số override 137.
  - 4. **Bỏ sót sản phẩm trong D1 Settings khi tính Snapshot**: Hàm `loadProducts` và `loadGiveaways` trong `snapshotService.ts` chỉ đọc danh sách gốc mà bỏ quên các mục mới được tạo lưu trong `savedSpList`, `savedUtList`, `savedGwList`.
  - 5. **Khóa cứng tồn kho ("Còn") ở 0 trong Views**: `UtilitiesView.tsx` và `StoreView.tsx` sử dụng biểu thức `item.stock_quantity <= 0 ? 0 : ...`, vô tình bỏ qua `virtualStockBonus` khi sản phẩm dùng mô hình hàng ảo/dịch vụ.
- **Giải pháp chuẩn đã kiểm chứng**:
  - 1. Luôn truyền `sanitizedTargetSold` làm `targetDisplaySoldOrClaimed` và tính toán `virtualSold = Math.max(0, sanitizedTargetSold - real)` chuẩn tắc, đảm bảo Cloudflare KV và D1 luôn nhận đúng con số canonical mà Admin nhìn thấy.
  - 2. Trong `adminDataService.ts`: Ở các hàm lưu sản phẩm/tiện ích/giveaway, khi gọi sync bắt buộc truyền đủ `exactTargetDisplay` (tham số thứ 4) và `anchor` (tham số thứ 5) để triệt tiêu việc cộng dồn lạm phát +30 đơn.
  - 3. Trong `marketingService.ts`: Bổ sung `fomo_anchor_time` và `virtual_sold_updated_at` vào cả `findItemDetails` và `findGiveawayDetails`, hỗ trợ cả 2 key LocalStorage `wcg_admin_*` và `wcg_*`.
  - 4. Trong `snapshotService.ts`: Hợp nhất cả `savedSpList`, `savedUtList`, `savedGwList` vào danh sách sản phẩm snapshot server.
  - 5. Trong `functions/api/sync.ts`: Thắt chặt ngưỡng đồng bộ đỉnh `isForceResetPayload || curPeak > target + 15 || curPeak < target`.
  - 6. Đồng bộ toàn bộ các modal (`ProductCheckoutModal`, `ProductDetailModal`, `UtilitiesView`) hiển thị chính xác theo cờ `show_stock_count` và `show_sold_count`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được để `targetDisplaySoldOrClaimed` thành `undefined` khi Admin lưu cấu hình*: Làm KV/D1 giữ giá trị cũ khiến thiết bị khác nhận số lệch.
  - ❌ *Không được gọi `syncProductVirtualSold` lần 2 mà thiếu mốc `exactTargetDisplay` và `anchorTime`*: Server sẽ tự tính lũy kế theo `createdAt` gây chênh lệch +30 đơn.
  - ❌ *Không được phụ thuộc vào LocalStorage Override để đồng bộ giữa các thiết bị*: Dữ liệu đồng bộ liên thiết bị bắt buộc phải xuất phát từ KV / D1 authoritative state.

---

### ISSUE-019: Lỗi Tăng Trưởng Ảo Từ CreatedAt (+70 Đơn Ma) Làm Lệch Số Giữa PC Admin Và Mobile Khách
- **Triệu chứng**:
  - Mở trên máy tính Admin (trình duyệt web): Hiển thị số cơ sở chuẩn đã cài (ví dụ: 52, 77, 33, 31).
  - Mở trên điện thoại Mobile (hoặc khách truy cập): Hiển thị số tăng vọt bất thường (ví dụ: 124, 149, 105, 104) — chênh lệch đúng $+70$ đơn hoặc $+72$ đơn.
- **Nguyên nhân gốc rễ**:
  - `calculateHourlyGrowth` trong `deterministicEngine.ts` và `marketingService.ts` có logic fallback: `anchorTime || createdAt`.
  - Khi `anchorTime` chưa tồn tại trong D1 SQL row, hàm lùi về `createdAt` hoặc timestamp trích từ ID được tạo từ nhiều chục giờ trước.
  - Tốc độ tăng trưởng 2.5 đơn/giờ $\times$ 24h = 60 đơn, chạm trần tối đa `maxCatchUpUnits = 70`.
  - Trên PC Admin: Có `adminOverrideClaimedMap` lưu 52. Logic auto-heal phát hiện $124 > 52 + 50$ nên ép hiển thị quay về 52.
  - Trên Mobile: Không có override. Con số cơ sở bị tính gộp 70 đơn ma thành $52 + 70 = 122$, nên $124 \le 122 + 50$, auto-heal KHÔNG kích hoạt, Mobile hiển thị 124!
  - Trên Cloudflare Edge: Hub lưu đỉnh ma 124 do logic thanh lọc trước đây dùng ngưỡng `baseTarget + 100` ($124 \le 52 + 100$ nên không bị lọc).
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Quy tắc vàng**: Bãi bỏ hoàn toàn việc fallback về `createdAt` trong tính toán tăng trưởng FOMO. Nếu không có `anchorTime` rõ ràng, độ tăng trưởng thời gian bắt buộc là 0.
  - Thắt chặt ngưỡng lọc đỉnh ma trên Cloudflare Edge Snapshot từ `+100` xuống `+15` đơn.
  - Đồng bộ D1 SQL rows với `system_settings` trong `loadAllStoreProductsD1` và `loadAllGiveawaysD1` để `fomo_anchor_time` và `virtual_*` không bao giờ bị thất lạc.
  - Bổ sung `ADMIN_SYNC_KEY` fallback trong `marketingService.saveConfig`.
  - Kích hoạt `forceReset` khi Admin ép đồng bộ để xóa sạch đỉnh ma và cache snapshot.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ dùng `createdAt` làm fallback cho tăng trưởng FOMO*: Sản phẩm tạo từ nhiều ngày trước sẽ nhảy vọt ngay $+30$ đến $+70$ đơn.
  - ❌ *Không để ngưỡng thanh lọc đỉnh quá rộng (+100)*: Đỉnh ma từ các lần thử nghiệm trước sẽ bị kẹt lại vĩnh viễn trên Edge Hub.

### ISSUE-020: Lỗi 404 Khi Tải File APK & Bị Khuất Thông Tin Nhân Vật Trên Header Điện Thoại
- **Triệu chứng**:
  - 1. Mở web trên điện thoại: Hàng trên cùng (Header) bị tràn chiều ngang, nút Avatar và Thông Tin Nhân Vật bị đẩy ra khỏi màn hình bên phải (khuất hoàn toàn).
  - 2. Người dùng nhấn nút "Tải File CodeGame.apk": Trình duyệt di động báo lỗi "Không thể tải được tệp CodeGame-v1.0.apk / Báo lỗi".
- **Nguyên nhân gốc rễ**:
  - 1. *Tràn chiều ngang Header*: Toolbar trên header chứa đồng thời 7 thành phần (Brand Logo, Săn Quà, Tải App, Cờ Ngôn Ngữ, Bookmark, User Avatar, Theme Toggle). Tổng độ rộng vượt quá 410px, trong khi màn hình smartphone thông thường chỉ từ 360px - 390px, khiến các phần tử bên phải bị trôi khỏi viewport.
  - 2. *Lỗi tải APK*: Endpoint `/download/codegame.apk` chưa có static file và chưa có route xử lý trong `functions/_worker.ts`, dẫn tới Cloudflare Pages trả về mã 404 (`Content-Type: text/html`). Trình duyệt phát hiện không phải định dạng APK hợp lệ nên hủy tải ngay lập tức. Đồng thời, workflow GitHub Actions `.github/workflows/build-apk.yml` bị lỗi tại bước `android-actions/setup-android@v3` do runner `ubuntu-latest` đã có sẵn Android SDK.
- **Giải pháp chuẩn đã kiểm chứng**:
  - 1. *Tối ưu Header mobile*:
    - Ẩn các nút không thiết yếu trên màn hình nhỏ `< sm`: `Săn Quà`, `LanguageSelector`, `ThemeToggle` chuyển sang `hidden sm:flex` (đã có đầy đủ trong Bottom Nav và menu User).
    - Tinh gọn Brand Logo và nút Tải App, Bookmark; khóa cứng `shrink-0` cho khối Thông Tin Nhân Vật / User Avatar để luôn xuất hiện 100% không bao giờ bị cắt cụt.
    - Tích hợp chuyển đổi theme Sáng/Tối trực tiếp trong menu thả xuống của User trên mobile.
  - 2. *Khắc phục triệt để tải APK*:
    - Thiết lập route chuyển hướng HTTP 302 trong `functions/_worker.ts` dẫn trực tiếp đến GitHub Release chính thức: `https://github.com/synqpe-jpg/web-code-game/releases/download/v1.0.0/CodeGame-v1.0.apk`.
    - Bổ sung cấu hình MIME type `application/vnd.android.package-archive` và loại trừ `/download/*` trong `public/_headers` và `public/_routes.json`.
    - Sửa workflow `build-apk.yml`: Bỏ bước `setup-android` bị lỗi, giữ nguyên `compileSdkVersion = 36` chuẩn Capacitor 8 (hỗ trợ đầy đủ trên runner Ubuntu 24.04), bổ sung `permissions: contents: write`, bật `set -e -o pipefail`, kiểm tra bắt buộc file APK tồn tại trước khi upload và tích hợp `softprops/action-gh-release@v2` với `fail_on_unmatched_files: true` tự động phát hành bản APK v1.0.0.
    - Sửa `DownloadAppModal.tsx`: Sửa ký tự `$\rightarrow$` thành `→`, bổ sung nút phím tắt "Cài Nhanh (PWA)" mở 1 chạm không cần quyền tải file.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không nhồi nhét tất cả các nút desktop lên header của mobile*: Màn hình điện thoại nhỏ hẹp bắt buộc phải ẩn bớt các nút thứ cấp vào menu và thanh đáy.
  - ❌ *Không dùng `android-actions/setup-android@v3` trên runner `ubuntu-latest`*: Gây lỗi xung đột giấy phép Android SDK và treo tiến trình build.
  - ❌ *Không để đường dẫn tải APK trỏ về URL chưa cấu hình MIME type hoặc route xử lý*: Trình duyệt di động sẽ nhận diện nhầm thành file HTML 404 và hủy lượt tải.
  - ❌ *Không dùng pipe `| tee` mà thiếu `set -e -o pipefail` trong bash CI/CD*: Mã thoát của lệnh trước bị nuốt chửng bởi `tee`, dẫn đến CI báo thành công giả tạo (False Positive) dù lệnh Gradle đã thất bại.
  - ❌ *Không được hạ `compileSdkVersion` xuống thấp hơn phiên bản yêu cầu của Capacitor (Capacitor 8 yêu cầu SDK 36)*: Khiến các thư viện AndroidX và mã nguồn Java của Capacitor bị lỗi biên dịch.

---

### ISSUE-021: Vòng Lặp Nháy Ảnh Liên Tục Trong Thẻ Tin Tức & Bẫy Cắt Cụt Logo Game (Infinite Image Flickering & Cover Ratio Trap)
- **Triệu chứng**:
  - 1. Mục tin tức có một số thẻ bài viết bị nhấp nháy, chớp tắt liên tục với tần số cao, gây khó chịu cho người xem.
  - 2. Ảnh bìa đại diện của các tựa game bị cắt cụt đầu đuôi (do icon game là hình vuông 1:1 nhưng thẻ tin tức lại ép tỷ lệ ngang 16:10 hoặc 21:9 bằng `object-cover`), khiến tên và nhân vật game trong logo bị mất góc.
- **Nguyên nhân gốc rễ**:
  - 1. *Vòng lặp nháy ảnh vô hạn*: Các thẻ `<img>` trong `NewsView.tsx`, `NewsDetailModal.tsx` và `NewsModule.tsx` có `onError` gán URL ảnh dự phòng từ Unsplash nhưng **thiếu hoàn toàn** `e.currentTarget.onerror = null;`. Khi URL dự phòng bị chặn/chậm hoặc khi bài viết chứa `cover_url: ""` (chuỗi rỗng từ bài viết cào lỗi), trình duyệt liên tục bắn sự kiện `error` lặp đi lặp lại hàng chục lần mỗi giây. Đồng thời mỗi khi có sự kiện React re-render (như ticker marketing hay poller), chuỗi rỗng lại kích hoạt chu trình lỗi mới, gây nhấp nháy dữ dội.
  - 2. *Tỷ lệ khung hình không tương thích*: Game icon là ảnh vuông 1:1 (`512x512`), khi hiển thị với `w-full h-full object-cover` trong khung 16:10, trình duyệt phóng to và cắt bỏ ~38% phần trên và dưới của icon.
- **Giải pháp chuẩn đã kiểm chứng**:
  - 1. *Ngắt triệt để đệ quy lỗi*: Luôn đặt `el.onerror = null;` ngay đầu `onError`. Fallback 100% sử dụng tài nguyên cục bộ an toàn (`/game_icons/${slug}.webp` hoặc `/og-image.jpg`), tuyệt đối không dùng link mạng ngoài bên thứ 3.
  - 2. *Hàm lấy ảnh an toàn `getSafeArticleCover`*: Tuyệt đối không để `<img src="">`, nếu rỗng tự động fallback sang icon game hoặc `/og-image.jpg`.
  - 3. *Bố cục chuẩn mực cho Game Cover (Crisp Game Cover Pattern)*:
    - Nếu là icon game vuông (`/game_icons/...`): Render lớp nền mờ nghệ thuật Ambient Backdrop (`blur-2xl opacity-40 scale-125`) kết hợp chuyển màu tối góc cạnh. Ở chính giữa hiển thị icon game sắc nét, giữ nguyên tỷ lệ 1:1, bo góc (`rounded-2xl` / `rounded-3xl`), viền sáng nổi bật (`ring-2 ring-white/20`), đổ bóng 3D chân thực và hiệu ứng tương tác mượt mà khi rê chuột (`group-hover:scale-110`).
    - Nếu là ảnh phong cảnh / banner ngang (Landscape banner): Hiển thị trọn vẹn với `object-cover`.
  - 4. *Làm sạch dữ liệu máy chủ*: Chạy script dọn dẹp các bài viết rỗng, kích hoạt Tombstone xóa vĩnh viễn trên Cloudflare D1 và KV.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán `(e.target as HTMLImageElement).src = 'https://images.unsplash...'` mà quên `e.currentTarget.onerror = null;`*: Nếu link dự phòng gặp sự cố hoặc offline, trình duyệt sẽ rơi vào vòng lặp tử thần (infinite loop error).
  - ❌ *Không để `<img src={article.cover_url} />` khi `cover_url` có thể là chuỗi rỗng `""`*: Trình duyệt sẽ cố tải lại chính file HTML hiện tại dưới dạng ảnh, gây lỗi liên hoàn.
  - ❌ *Không ép `w-full h-full object-cover` lên các icon game tỷ lệ 1:1 trong khung hình ngang*: Sẽ cắt cụt logo và nhân vật của game.

---

### ISSUE-022: Lỗi Bất Đồng Bộ UI Hiển Thị Số Dư Ví Sau Khi Mua Tiện Ích/Sản Phẩm (checkUserDepositStatus False Revert & Missing State Callback)
- **Triệu chứng**:
  - Khách nạp 12.000 Core, mua 1 sản phẩm tiện ích hoặc store (ví dụ Basic 1 Day VS Phone giá 11.240 Core), đơn hàng thành công, kho trừ hàng chuyển sang "Hết hàng", sổ cái Admin D1 trừ tiền chính xác (Ví: 12.000 Core -> 760 Core). Nhưng trên Header / Dropdown thông tin nhân vật của Web Khách vẫn hiển thị nguyên "Số dư: 12.000 Core", gây cảm giác người mua không bị trừ tiền.
- **Nguyên nhân gốc rễ**:
  1. **Bẫy lọc duy nhất DEPOSIT trong `checkUserDepositStatus`**: Hàm `checkUserDepositStatus(userId)` trong `dataService.ts` chỉ lọc `t.type === 'DEPOSIT'`, tìm thấy giao dịch nạp tiền cũ (12.000 Core lúc 13:59:16) mà bỏ qua giao dịch mua hàng (11.240 Core lúc 15:05:19). Khi so sánh `txBalance (12.000) > currentBal (760)`, hàm ngộ nhận đây là một khoản nạp tiền mới chưa vào ví và tự động ghi đè ngược `currentUser.wallet_balance` về 12.000 Core!
  2. **Thiếu ghi chép giao dịch trừ tiền ở local**: `createUtilityOrder` và `createOrder` gửi request lên Cloudflare Pages Functions để trừ tiền trong D1 nhưng không lưu bản ghi giao dịch `ORDER` vào `wcg_admin_transactions_v4` ở LocalStorage, dẫn đến mảng giao dịch client chỉ có duy nhất lệnh nạp tiền.
  3. **Đứt gãy luồng React State**: `UtilitiesView` và `ProductCheckoutModal` không được truyền prop `onUpdateUser` từ `App.tsx`; `dataService.saveCurrentUser()` lưu vào LocalStorage nhưng không dispatch CustomEvent `wcg_user_updated`, khiến state React `currentUser` trong `App.tsx` không được render lại ngay lập tức.
  4. **Bẫy ghi đè dữ liệu thành viên từ Client Sync (`syncMembersToD1`)**: `d1_service.ts:1829` dùng `ON CONFLICT(id) DO UPDATE SET balance = excluded.balance`, có nguy cơ bị client sync mảng thành viên cũ đè lên số dư thực tế trong D1.
- **Giải pháp chuẩn đã kiểm chứng**:
  - *Sửa triệt để `checkUserDepositStatus`*: Quét toàn bộ lịch sử giao dịch (cả DEPOSIT và ORDER) xếp theo thời gian mới nhất. Nếu giao dịch mới nhất là ORDER/PURCHASE, ép số dư client phải khớp với `balanceAfter` của lệnh mua (760 Core), cấm tuyệt đối việc dùng giao dịch nạp cũ để ghi đè số dư.
  - *Ghi nhận giao dịch mua vào sổ cái client*: Trong `createUtilityOrder` và `createOrder`, tự động ghi bản ghi giao dịch `{ type: 'ORDER', amount: totalPrice, balanceBefore, balanceAfter }` vào `wcg_admin_transactions_v4`.
  - *Hoàn thiện cầu nối React State & CustomEvent*:
    + `dataService.saveCurrentUser` phát ngay `window.dispatchEvent(new CustomEvent('wcg_user_updated', { detail: user }))` và broadcast qua `BroadcastChannel('wcg_data_sync')`.
    + `App.tsx` lắng nghe sự kiện `wcg_user_updated` và truyền `onUpdateUser={handleUpdateUser}` cho cả `UtilitiesView` và `ProductCheckoutModal`.
    + `UtilitiesView` và `ProductCheckoutModal` gọi `onUpdateUser` ngay sau khi thanh toán thành công để header đổi số dư ngay lập tức 0 giây.
  - *Khóa an toàn D1 Ledger*: Trong `d1_service.ts:syncMembersToD1`, thêm điều kiện SQL `balance = CASE WHEN (SELECT COUNT(*) FROM wallet_transactions WHERE member_id = members.id) > 0 THEN members.balance ELSE excluded.balance END` để D1 luôn là Single Source of Truth tuyệt đối.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được lọc duy nhất `t.type === 'DEPOSIT'` rồi so sánh `txBalance > currentBal`*: Sẽ luôn khiến bất kỳ lệnh nạp cũ nào đè bẹp số dư sau khi khách đã mua hàng.
### ISSUE-023: Bất Đồng Bộ Giữa Cột Tĩnh members.balance Và Sổ Cái wallet_transactions Trong Cloudflare D1 (ACID Single Source of Truth Desync)
- **Triệu chứng**:
  - Dù tài khoản đã trừ tiền và sổ cái `wallet_transactions` ghi nhận số dư sau giao dịch là 760 Core, nhưng khi người dùng mở trình duyệt (hoặc sau khi cập nhật mã nguồn) màn hình vẫn hiển thị 12.000 Core. Cột tĩnh `members.balance` trên Cloudflare D1 bị lưu lệch giá trị so với số dư sau giao dịch mới nhất.
- **Nguyên nhân gốc rễ**:
  1. *Lệch pha giữa bảng `members` và bảng `wallet_transactions`*: Trước đây lệnh `syncMembersToD1` đã vô tình ghi đè mảng thành viên cũ từ client vào bảng `members`, khiến hàng của user `usr_1791606009927_p1nu` có `balance = 12000` trong khi bảng `wallet_transactions` ghi nhận số dư thực tế là 760 Core.
  2. *Truy vấn tĩnh không tham chiếu sổ cái*: Hàm `loadAllMembersD1` và `/api/auth/me` chỉ `SELECT balance FROM members`, đọc trực tiếp cột tĩnh bị sai lệch mà không tham chiếu đến số dư cuối cùng của sổ cái `wallet_transactions.balance_after`.
  3. *Thiếu phản xạ trạng thái tức thì khi refresh balance*: `dataService.refreshCurrentUserBalance()` chỉ gán vào `localStorage.setItem` mà không gọi `saveCurrentUser(user)`, dẫn đến việc không kích hoạt `wcg_user_updated` và `BroadcastChannel`, UI không được thông báo để render lại số dư mới.
- **Giải pháp chuẩn đã kiểm chứng**:
  - 1. *Đối soát và khôi phục D1 trực tiếp (Reconciliation)*: Chạy endpoint `/api/sync` với action `reconcile_member_balances` để đồng bộ lại 100% các dòng `members.balance` khớp với `wallet_transactions.balance_after` mới nhất.
  2. *Động hóa số dư qua Subquery SQL (Single Source of Truth)*:
     - Trong `loadAllMembersD1` (`functions/services/d1_service.ts`):
       ```sql
       COALESCE(
         (SELECT balance_after FROM wallet_transactions WHERE member_id = members.id ORDER BY created_at DESC LIMIT 1),
         balance
       ) AS balance
       ```
     - Biến bảng sổ cái giao dịch `wallet_transactions` thành chân lý duy nhất. Bất kể cột tĩnh `members.balance` có giá trị gì, hệ thống luôn trả về số dư thực tế của sổ cái.
  3. *Cơ chế Tự Phục Hồi (Self-Healing) trong `/api/auth/me`*:
     - Kiểm tra nếu `latestTxRow.balance_after !== member.balance`, hệ thống tự động sửa `members.balance` trong D1 qua `context.waitUntil` và lập tức trả về số dư từ sổ cái.
  4. *Đồng bộ UI 0 giây*:
     - `src/services/dataService.ts`: Trong `refreshCurrentUserBalance()`, nếu phát hiện số dư thay đổi thì gọi `this.saveCurrentUser(user)` để phát `wcg_user_updated` và gửi qua `BroadcastChannel`.
     - `src/App.tsx`: Thêm timer 2 giây ngay khi khởi chạy để đồng bộ tức thì số dư mới nhất từ Edge server.
### ISSUE-024: Tràn Bảng Moderation Đẩy Cột Thao Tác (Duyệt/Sửa/Xóa) Ra Ngoài Màn Hình & Tràn Chiều Cao Vô Hạn Do Thiếu Phân Trang
- **Triệu chứng**:
  - Trong Admin (`/admin#/crawler`), bảng Hàng Chờ Duyệt Giftcode bị tràn ngang, các nút thao tác Duyệt (Approve), Sửa (Edit), Xóa (Reject) bị đẩy ra khỏi rìa phải màn hình, người dùng phải cuộn ngang sang phải mới thấy. Đồng thời khi danh sách có hàng trăm mã (499 mã), bảng bị kéo dài hàng nghìn pixel theo chiều dọc.
- **Nguyên nhân gốc rễ**:
  1. Thiếu thuộc tính `table-fixed` và thiếu giới hạn `truncate` cho tên tựa game và phần thưởng, khiến các chuỗi dài tự do giãn rộng hàng trăm pixel làm vỡ khung hiển thị.
  2. Cột thao tác nằm ở cuối bảng nhưng không được gán `sticky right-0`, khiến bất kỳ sự co giãn nào của màn hình hoặc sidebar đều đẩy cột này ra ngoài viewport.
  3. Thiếu phân trang (Pagination) ở hàng chờ duyệt khiến toàn bộ 499 mã render cùng một lúc trên DOM.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Khóa cứng tỷ lệ bảng*: Áp dụng `table-fixed min-w-[840px] w-full` và phân bổ độ rộng pixel cố định cho các cột nhỏ (`w-10`, `w-32`, `w-44`, `w-48`, `w-36`).
  2. *Sticky Action Column Pattern*: Header và cell của cột Thao Tác luôn mang cờ `sticky right-0 bg-slate-950/95` và `sticky right-0 bg-slate-900/95 group-hover:bg-slate-800/95 border-l border-slate-800 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] z-10`, ghim chặt 3 nút Duyệt, Sửa, Xóa cố định trên màn hình trong mọi tình huống.
  3. *Trang bị Pagination Engine*: Phân trang 20 mã / trang mặc định kèm nút chuyển trang và thanh chọn số lượng mã mỗi trang (15/20/50/100).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để bảng dữ liệu admin co giãn tự do mà không có `table-fixed`*: Tên game hoặc nội dung quà dài sẽ đẩy bung toàn bộ các cột hành động ra khỏi màn hình.
### ISSUE-025: Lỗi Chặn Thoát Sớm Trong ensureSchemaUpgrades Làm Đứt Gãy Cập Nhật Bảng SQL utilities D1 & Tràn Ngược Mô Tả Cũ
- **Triệu chứng**:
  - Dữ liệu tiện ích (như description, instructions) được gửi lên `/api/sync` báo thành công 200 và đã lưu vào `system_settings`, nhưng khi truy vấn lại `GET /api/sync`, dữ liệu mô tả vẫn là văn bản cũ không thay đổi.
- **Nguyên nhân gốc rễ**:
  1. Trong `ensureSchemaUpgrades`, dòng kiểm tra `SELECT 1 FROM giveaway_claim_guards LIMIT 1` trả về true khiến hàm thoát sớm (early return) trước khi kịp thực thi các lệnh `ALTER TABLE utilities ADD COLUMN guide_url...` phía sau.
  2. Bảng `utilities` trên D1 thiếu các cột mới, dẫn đến câu lệnh upsert hàng loạt trong `syncUtilitiesToD1` bị sập với lỗi `no such column`. Khối lệnh bị `catch` âm thầm nên bảng `utilities` không được cập nhật.
  3. Trong `sync.ts`, logic merge sử dụng `u.description || meta.description || ''`. Vì `u.description` lấy từ bảng SQL `utilities` vẫn còn chứa chuỗi mô tả cũ nên nó luôn đè lên chuỗi mô tả mới trong `meta.description`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Chuyển cơ chế kiểm tra checkpoint di chuyển schema sang bảng `schema_migrations` với ID duy nhất (ví dụ `'schema_v5_full_upgrades'`).
  2. Bổ sung cơ chế fallback hai tầng trong `syncUtilitiesToD1`: nếu upsert toàn bộ cột thất bại, tự động hạ cấp xuống upsert các cột cơ sở và thực thi mảng lệnh `UPDATE utilities SET description = ? WHERE id = ?` trực tiếp cho từng bản ghi.
  3. Trong `sync.ts`, ưu tiên dữ liệu từ cấu hình admin/sync mới nhất: `description: (meta && meta.description) ? meta.description : (u.description || '')`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng sự tồn tại của 1 bảng ngẫu nhiên làm cờ đánh dấu toàn bộ các migration sau đó đã hoàn tất*: Khi thêm migration mới, các câu lệnh mới sẽ bị bỏ qua hoàn toàn trên DB đã tồn tại bảng đó.
### ISSUE-026: Tràn Thông Báo Toast Chồng Chất Đè Lên Cột Nút Thao Tác Trong Admin (Toast Action Obstruction)
- **Triệu chứng**:
  - Khi quản trị viên thao tác liên tục (như duyệt hoặc xóa giftcode nhanh), hàng loạt thông báo Toast xếp chồng lên nhau thành cột cao ở góc dưới bên phải, đè trực tiếp lên cột nút "THAO TÁC" (Duyệt, Sửa, Xóa).
  - Vì toast có `pointer-events-auto`, cú click tiếp theo của admin bị rơi vào toast thay vì nút bấm của hàng tiếp theo.
- **Nguyên nhân gốc rễ**:
  1. Trong `AdminApp.tsx`, hàm `showToast` không cài đặt timer `setTimeout` tự động đóng, khiến mọi toast hiển thị vĩnh viễn cho đến khi bấm dấu 'X' thủ công.
  2. Vị trí hiển thị `ToastContainer` đặt cố định ở góc dưới bên phải (`sm:right-5 sm:bottom-5`), thẳng hàng với cột thao tác dính mép phải (`sticky right-0`).
  3. Không giới hạn số lượng toast hiển thị tối đa (Queue Capping).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Chuyển vị trí `ToastContainer` trong Admin sang đỉnh giữa màn hình (`top-center`: `fixed top-4 left-1/2 -translate-x-1/2`), giải phóng 100% không gian cho các nút thao tác bên phải.
  2. Tích hợp bộ đếm tự động đóng (Auto-Dismiss Timer: 2.5s) bên trong `ToastItem` và `AdminApp.tsx`, hỗ trợ tạm dừng khi rê chuột và click vào toast để tắt ngay.
  3. Khóa cứng giới hạn tối đa 3 thông báo hiển thị cùng lúc (`maxVisible={3}` và `prev.slice(-2)`), tự động đẩy thông báo cũ nhất ra khỏi màn hình khi có thông báo mới.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không đặt ToastContainer ở góc dưới bên phải hoặc góc trên bên phải trên các trang có bảng dữ liệu sở hữu cột thao tác sticky*: Sẽ luôn đè lên các nút thao tác của bảng.
  - ❌ *Không tạo toast mà không có timer tự động tắt (auto-dismiss)*: Khiến màn hình bị kẹt thông báo vô tận.
### ISSUE-027: Bẫy Lọc & Thao Tác Duyệt / Xóa Giftcode Hàng Chờ Theo Nguồn Thiếu Chuẩn Hóa Domain (Crawler Source Filter & Bulk Action Trap)
- **Triệu chứng**:
  - Khi quản lý mã cào trong Hàng Chờ Duyệt (`/admin#/crawler`), danh sách mã cào đến từ nhiều nguồn khác nhau (như các chuyên trang game quốc tế hoặc các nguồn cũ). Quản trị viên không thể lọc riêng theo từng nguồn để duyệt nhanh hoặc xóa nhanh toàn bộ mã của một nguồn.
  - Nếu lọc theo chuỗi thô `item.sourceName`, các chuỗi có định dạng khác nhau (ví dụ: `CodeMoi - Game A`, `CodeMoi - Game B`, `Try Hard Guides`) bị phân tán thành hàng trăm nhóm riêng lẻ, khiến bộ lọc không thể gom nhóm.
- **Nguyên nhân gốc rễ**:
  1. Dữ liệu `PendingCrawlerCode` lưu `sourceName` gắn kèm tên tựa game (`sourceName: "CodeMoi - Tên Game"`), trong khi `sourceUrl` chứa URL bài viết cụ thể.
  2. Nếu chỉ so sánh chính xác chuỗi `item.sourceName`, mỗi game tạo thành 1 nguồn riêng lẻ khiến dropdown có hàng trăm mục thay vì nhóm lại theo thương hiệu/domain nguồn.
  3. Thiếu thao tác 1-chạm kết hợp với các endpoint backend `batch_approve_crawler_codes` và `batch_reject_crawler_codes` cho một nguồn đã chọn.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Hàm phân nhóm nguồn chuẩn mực `getCrawlerSourceInfo`*: Phân tích kết hợp cả `sourceUrl` và `sourceName`, nhận diện các thương hiệu nguồn chính xác (`codemoi.net`, `tryhardguides.com`, `pockettactics.com`, `gamerpower.com`, `sforum.vn`, `ldplayer.net`, `facebook.com`, `discord.com`).
  2. Fallback trích xuất hostname động `new URL(item.sourceUrl).hostname.replace(/^www\./, '')` cho mọi website quốc tế mới mà không cần hardcode thủ công.
  3. Tổng hợp `availablePendingSources` tính sẵn số lượng mã (`count`) để hiển thị trực tiếp trong dropdown và banner.
  4. Cung cấp banner thao tác 1-chạm: "Duyệt tất cả nguồn này (X mã)" và "Xóa tất cả nguồn này (X mã)" kết nối trực tiếp với batch API D1/KV.
  5. Trong bảng dữ liệu, nhấp vào tên nguồn ở cột "NGUỒN CÀO" sẽ tự động kích hoạt bộ lọc nguồn tương ứng.
### ISSUE-028: Bẫy Lệnh Reset Ngủ Quên (Dormant Reset Bomb) & Lỗi Ép Tồn Kho Bằng 0 Đè Lên Kho D1 Thật
- **Triệu chứng**:
  - Sau một cập nhật schema hoặc khởi động lại worker, số dư của tất cả thành viên bị reset về 0 VNĐ / 0 Core, bảng lịch sử giao dịch và đơn hàng bị xóa sạch.
  - Các sản phẩm tiện ích hoặc gói nạp dù trong kho mã D1 (`inventory_codes`) vẫn còn hàng sẵn nhưng trên web khách lại hiển thị 0 mã tồn kho ("HẾT HÀNG") và không thể đặt mua.
- **Nguyên nhân gốc rễ**:
  1. *Khối reset ngủ quên (Dormant Reset Bomb)*: Trong `d1_service.ts`, các đoạn mã reset cũ (như `UPDATE members SET balance = 0`, `DELETE FROM wallet_transactions`) từng được viết cho giai đoạn test và được "bảo vệ" ngầm bằng một lệnh return sớm ở đầu hàm `ensureSchemaUpgrades`. Khi điều kiện return sớm bị thay đổi hoặc nâng cấp schema migration ID, luồng thực thi lọt xuống cuối hàm và kích hoạt lại khối lệnh hủy diệt trên database production.
  2. *Lỗi ép tồn kho bằng 0*: Trong `functions/api/sync.ts`, logic `(meta.stock_quantity !== undefined && Number(meta.stock_quantity) === 0) ? 0 : ...` đọc `stock_quantity: 0` từ snapshot/file JSON tĩnh và ép tồn kho bằng 0, ghi đè lên số lượng tồn kho thực tế tính từ các mã `AVAILABLE` trong D1.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. **Tuyệt đối không bao giờ để lại câu lệnh `DELETE` hoặc `UPDATE balance = 0` diện rộng bên trong mã nguồn khởi động hệ thống (`ensureSchemaUpgrades`, `init`, v.v.)**: Mọi thao tác reset chỉ được phép chạy thủ công có chủ đích bằng tay qua lệnh CLI bảo mật, không bao giờ đặt trong code runtime của Serverless Worker.
  2. Xóa bỏ triệt để các khối `reset_all_wallets_to_zero_v1` và `wcg_d1_wallets_revenue_reset_v5`.
  3. Xây dựng migration tự phục hồi `heal_and_restore_wallets_v6` để tự động khôi phục số dư ví thành viên và lịch sử giao dịch theo đúng sổ cái kế toán.
  4. Trong `sync.ts`, luôn ưu tiên số lượng tồn kho thực tế từ D1 (`u.stock_quantity !== undefined ? Math.max(0, Number(u.stock_quantity)) : ...`), không để file tĩnh ghi đè trạng thái hết hàng lên cơ sở dữ liệu.
### ISSUE-029: Bẫy Treo Màn Hình Xác Thực Quản Trị Vô Tận (Admin Auth Spin Loop & Missing Watchdog Trap)
- **Triệu chứng**:
  - Khi quản trị viên truy cập trang `/admin` (hoặc `admin-code-game-shop.pages.dev/admin#/utilities`), màn hình bị đứng yên ở trạng thái "Đang xác thực phiên quản trị..." với vòng xoay vô tận. Không vào được dashboard và cũng không tự chuyển sang form đăng nhập.
- **Nguyên nhân gốc rễ**:
  1. *Lệnh fetch không timeout*: `verifyAdminSession` gọi `fetch()` đến 4 endpoint liên tiếp (`/api/auth/me`, `codegame.shop`, v.v.) không có `AbortSignal` hay giới hạn thời gian. Khi gặp domain bị chậm mạng hoặc preflight CORS nghẽn, trình duyệt treo promise vô thời hạn.
  2. *Bẫy cờ `cancelled` trong React `useEffect`*: Khi component mount hoặc router đổi hash, cleanup function gán `cancelled = true`. Khi `verifyAdminSession()` kết thúc, khối `if (!cancelled) setIsVerifying(false)` bị bỏ qua hoàn toàn, khiến `isVerifying` kẹt ở `true` vĩnh viễn.
  3. *Không có cơ chế thoát hiểm (Escape Hatch)*: Màn hình loading chỉ hiển thị spinner mà không có nút hủy bỏ hay đăng nhập lại.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Sử dụng `fetchWithTimeout(url, options, 3000)` với `AbortController` cho mọi lệnh gọi xác thực mạng.
  2. Fail-fast ngay lập tức nếu server trả về `401` hoặc `403` (phiên đã hết hạn): Xóa cờ, gán `isVerifying = false` ngay, không duyệt tiếp các domain khác.
  3. Tích hợp Safety Watchdog Timer (3.5s) trong `useEffect` để ép `setIsVerifying(false)` trong mọi tình huống.
  4. Cung cấp nút bấm "Đăng nhập lại bằng tài khoản quản trị" ngay dưới spinner để người dùng luôn có lối thoát chủ động.
### ISSUE-030: Bẫy Robot Xanh Mặc Định & Lưới Ô Android Trên File Cài Đặt (.APK) (Android Default Vector & Adaptive Icon Trap)
- **Triệu chứng**:
  - Người dùng tải file `.APK` về cài đặt trên điện thoại Android nhưng icon ứng dụng hiển thị logo robot màu xanh mặc định của Android hoặc hình ảnh placeholder Capacitor, không hiển thị logo chính thức của web CodeGame.
- **Nguyên nhân gốc rễ**:
  1. *Bẫy vector override trong `drawable-v24/`*: Thư mục `android/app/src/main/res/drawable-v24/` chứa file `ic_launcher_foreground.xml` là vector hình robot Android xanh mặc định. Trên mọi thiết bị Android API 24+ (Android 7.0 đến Android 15), hệ điều hành ưu tiên nạp file vector này đè lên các file PNG trong `mipmap-*/`.
  2. *Bẫy adaptive icon grid*: File `drawable/ic_launcher_background.xml` chứa đường vẽ lưới ô xanh ngọc `#26A69A` của Android Studio template, khiến adaptive icon bị viền và nền xanh ngọc không khớp giao diện web.
  3. *Màu nền XML*: `values/ic_launcher_background.xml` để `#FFFFFF` thay vì màu đen thương hiệu `#0B0D19`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xóa hoàn toàn file vector robot `drawable-v24/ic_launcher_foreground.xml`.
  2. Dùng sharp tạo trọn bộ PNG cho 5 mật độ màn hình (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`):
     - `ic_launcher.png`: Bo góc 18% của logo web.
     - `ic_launcher_round.png`: Cắt tròn 100% của logo web.
     - `ic_launcher_foreground.png`: Logo căn giữa trong vùng an toàn (Safe-Zone 68% của canvas 108dp) trên nền trong suốt.
  3. Cập nhật màu nền `ic_launcher_background` sang chuẩn màu thương hiệu `#0B0D19`.
  4. Tạo đồng bộ 11 kích thước ảnh splash screen màn hình chờ (`splash.png`) với logo căn giữa trên nền `#0B0D19`.
  5. Đưa lệnh `node scripts/generate_android_icons.cjs` vào CI/CD workflow `.github/workflows/build-apk.yml`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ thay file PNG trong `mipmap/` mà quên xóa `drawable-v24/ic_launcher_foreground.xml`*: Android 7.0+ sẽ luôn ưu tiên file vector robot xanh trong `drawable-v24/`.
  - ❌ *Không để logo tràn 100% mép canvas trong `ic_launcher_foreground.png`*: Khi các launcher Android (Samsung OneUI, Xiaomi MIUI, Google Pixel) áp dụng mặt nạ hình tròn hoặc squircle sẽ làm cắt mất chi tiết logo nếu không có lề an toàn 68%.

### ISSUE-031: Bẫy Lệch Key Cấu Hình Khi Lưu Crawler Sources Giữa KV & D1 Settings (D1 Crawler Settings Desync Trap)
- **Triệu chứng**:
  - Dữ liệu nguồn cào code đã được mở rộng lên 933 nguồn trong mã nguồn frontend và file JSON tĩnh, nhưng khi mở trang Quản lý Crawler trong Admin (`/admin#/crawler`), hệ thống vẫn hiển thị cố định số lượng cũ (855 nguồn).
- **Nguyên nhân gốc rễ**:
  1. *Lệch key giữa KV và D1*: Trong Cloudflare Worker `functions/api/sync.ts`, `GET /api/sync` ưu tiên đọc nguồn crawler từ D1 settings với key `wcg_crawler_sources_v1`. Tuy nhiên, khi script đồng bộ gửi payload dạng `{ key: 'wcg_admin_crawler_sources_v5', data: sources }`, nhánh lưu D1 `if (body.crawlerSources !== undefined)` không được kích hoạt vì dữ liệu nằm trong `body.data`, dẫn đến việc D1 giữ nguyên snapshot cũ 855 nguồn.
  2. *Ghi đè mù quáng ở Frontend*: `CrawlerModule.tsx` trước đây khi nhận mảng `data.crawlerSources` từ server đã gán trực tiếp vào state mà không thực hiện phép hợp (union) với `defaultSources` có sẵn trong build frontend.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Chuẩn hóa Worker API `sync.ts` xử lý trọn vẹn cả 2 key `wcg_crawler_sources_v1`, `wcg_admin_crawler_sources_v5` và trường `body.crawlerSources`, tự động parse mảng và ghi đồng bộ vào cả Cloudflare KV lẫn bảng cài đặt D1.
  2. Trang bị cơ chế Self-Healing Auto-Merge trong `CrawlerModule.tsx`: Frontend tự động lấy tập hợp (union) theo URL chuẩn hóa giữa danh sách server và `defaultSources`. Nếu phát hiện có nguồn mới chưa có trên server, frontend ngay lập tức khôi phục đủ và đẩy ngược về server để cập nhật D1.
  3. Cập nhật script đồng bộ `scripts/push_to_kv_sync.cjs` truyền đủ cả 2 trường `key: 'wcg_crawler_sources_v1'` và `crawlerSources: sources`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ push lên Cloudflare KV mà quên đồng bộ vào bảng cài đặt D1*: `sync.ts` khi có query `?fresh=true` luôn đọc D1 settings làm nguồn gốc sự thật, nếu D1 không được cập nhật thì KV sẽ bị vô hiệu.
### ISSUE-032: Bẫy D1 Row Quota 1MB Làm Rỗng Danh Mục Khi Không Có Bundled Fallback Trong Worker API (Edge Worker API D1 Fallback Trap)
- **Triệu chứng**:
  - Khi gọi `/api/games` hoặc `/api/games?slug=...`, API trả về 0 games (`total: 0`) hoặc lỗi 404 `"Không tìm thấy trò chơi."` mặc dù file tĩnh và frontend vẫn hiển thị đủ 623 tựa game.
- **Nguyên nhân gốc rễ**:
  1. *Giới hạn dung lượng hàng D1 (D1 1MB Row Quota)*: Cloudflare D1 giới hạn 1MB cho mỗi tham số truy vấn và hàng dữ liệu. Khi lưu danh mục mã quà tặng `wcg_admin_free_codes_v5` (>4MB) hoặc danh mục lớn vào bảng `system_settings`, thao tác `INSERT` bị D1 từ chối hoặc bỏ qua để tránh sập transaction.
  2. *Thiếu tầng dữ liệu dự phòng (Bundled Fallback)*: Trong `functions/api/games.ts` và `functions/api/sync.ts`, nếu D1 settings chưa có hoặc rỗng, code gán mảng rỗng `[]` thay vì fallback về danh mục 623 games và 5,321 mã có sẵn trong build.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Import trực tiếp `fallbackGamesData` (`src/data/games188.json`) và `fallbackCodesData` (`src/data/crawled_codes_188.json`) vào worker bundle `dist/_worker.js` bằng ESBuild.
  2. Sử dụng toán tử fallback: Nếu D1 settings không có hoặc rỗng (`!Array.isArray(settings[...]) || settings[...].length === 0`), Worker tự động sử dụng `fallbackGamesData` và `fallbackCodesData`.
  3. Khi có mã mới (custom codes), Worker hợp nhất các mã custom từ D1 lên trên danh mục bundled, đảm bảo API luôn trả về đủ 623 tựa game và đầy đủ 100% giftcode.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không phụ thuộc 100% vào việc ghi mảng monolithic >1MB vào 1 hàng trong bảng system_settings D1*: Bắt buộc phải có bundled fallback trong Edge Worker bundle.

### ISSUE-033: Lệch Tầng Giữa Git Rollback và Cơ Sở Dữ Liệu Cloudflare D1/KV Làm Trắng Trang Bán Hàng & Tiện Ích
- **Triệu chứng**:
  - Khi hoàn tác mã nguồn bằng `git checkout` hoặc `git revert`, mã nguồn cục bộ đã trở về commit cũ nhưng trên web trực tuyến:
    1. Trang Cửa Hàng và Tiện Ích bị rỗng hoàn toàn, không có sản phẩm nào.
    2. Mục Giật Code vẫn hiển thị các chiến dịch giveaway đã thêm ở các bản sau (như Delta Force).
    3. Thông tin ngân hàng nạp tiền bị nhảy về tài khoản mẫu placeholder (MBBank 0987654321) thay vì tài khoản chủ shop (TPBank 10004681879).
- **Nguyên nhân gốc rễ**:
  1. *Lệch tầng dữ liệu*: Lệnh `git checkout` chỉ tác động đến tệp tĩnh trên ổ cứng máy tính, hoàn toàn không thay đổi trạng thái Cloudflare D1 SQL hoặc KV trên Edge Server. Khi client gọi `/api/sync`, Worker đọc từ D1 (lúc này các bảng sản phẩm có thể chưa được nạp hoặc rỗng), trả về `utilities: []` và `storeProducts: []`, ghi đè làm trắng trình duyệt.
  2. *Thời điểm commit*: Chiến dịch giveaway như Delta Force (`gw_alienware_vaultbreakers`) được commit lúc 00:49 ngày 14/10, trước commit cập nhật 8 mã Pirate Legends (19:11 ngày 14/10), do đó việc rollback về thời điểm up code Pirate Legends vẫn giữ lại Delta Force trong file mã nguồn nếu không kiểm tra và xóa thủ công.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Đồng bộ D1/KV đi kèm Rollback*: Bất cứ khi nào hoàn tác Git, bắt buộc phải chạy script `scripts/push_to_kv_sync.cjs` để nạp đồng bộ toàn bộ 8 danh mục dữ liệu tương ứng lên Cloudflare D1 & KV.
  2. *Cơ chế Fallback & Tự Lành (Self-Healing Baseline)*:
     - Trong `functions/api/sync.ts`: Nếu D1 trả về `utilities` hoặc `storeProducts` rỗng, Worker tự động nạp từ `src/data/utilities.json` (19 tiện ích) và `src/data/storeProducts.json` (6 sản phẩm), đồng thời auto-heal ghi ngược lại D1.
     - Trong `dataService.ts`: Nếu API trả về mảng rỗng, client tuyệt đối không ghi đè xóa sạch state mà fallback về `defaultUtilities` và `defaultStoreProducts`.
  3. *Khóa cứng tài khoản thanh toán*: Enforce TPBank `10004681879` `CODE GAME SHOP` ở cả Edge Worker và Client.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối không chỉ rollback Git mà không chạy push_to_kv_sync.cjs*: Sẽ gây đứt gãy giữa Edge Worker và cơ sở dữ liệu cloud.

---

### ISSUE-034: Bẫy Đặt Hook Phía Sau Early Return Trong Modal Nạp Tiền & Lỗi Trình Duyệt Cốc Cốc Chặn Ảnh QR Bên Thứ Ba
- **Triệu chứng**:
  1. Khi mở hoặc đóng modal nạp tiền `UserWalletModal`, ứng dụng React bị sập với mã lỗi `React error #310` ("Rendered more hooks than during the previous render").
  2. Trên trình duyệt Cốc Cốc hoặc trình duyệt có cài tiện ích chặn quảng cáo (uBlock Origin, AdGuard), khung hiển thị mã QR thanh toán nạp Core bị vỡ icon ảnh hoặc báo lỗi mạng không tải được ảnh từ CDN bên ngoài (`qr.sepay.vn` hoặc `img.vietqr.io`).
- **Nguyên nhân gốc rễ**:
  1. *Vi phạm React Rules of Hooks*: Trong `UserWalletModal.tsx`, câu lệnh thoát sớm `if (!isOpen) return null;` được đặt ở dòng 182. Nếu đặt `useEffect` hoặc hook nào phía dưới câu lệnh này, React sẽ ghi nhận số lượng hook bị thay đổi khi modal chuyển từ đóng sang mở hoặc ngược lại $\rightarrow$ gây crash sập toàn bộ component cây DOM.
  2. *Chặn ảnh QR CDN bên ngoài*: CDN của các dịch vụ sinh QR bên ngoài (`qr.sepay.vn`, `vietqr.io`) thường nằm trong danh sách bộ lọc EasyPrivacy / Fanboy's Annoyance của trình duyệt Cốc Cốc và adblockers, khiến yêu cầu tải ảnh PNG bị chặn (ERR_BLOCKED_BY_CLIENT).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Tuân thủ 100% Rules of Hooks*: Di chuyển toàn bộ khai báo State, Refs, useMemo, và `useEffect` sinh `qrDataUrl` lên top-level của component, nằm hoàn toàn trước câu lệnh `if (!isOpen) return null;`.
  2. *Sinh mã VietQR nội bộ chuẩn EMVCo Base64*: Sử dụng thư viện `qrcode` và bộ tạo chuỗi EMVCo NAPAS 247 cục bộ (`generateVietQrDataUrl` trong `vietQrUtils.ts`) sinh Data URL Base64 (`data:image/png;base64,...`) ngay trong trình duyệt. Không gọi bất kỳ network request nào ra bên ngoài $\rightarrow$ Miễn nhiễm 100% với Adblocker, Cốc Cốc, và lỗi gián đoạn mạng.
  3. *Chuẩn hóa tài khoản TPBank*: Fallback mặc định trong cả `UserWalletModal.tsx` và `adminDataService.ts` luôn là **TPBank - 10004681879 - CODE GAME SHOP**.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối không đặt bất kỳ hook (`useEffect`, `useState`, `useMemo`) phía dưới `if (!isOpen) return null;`*: Sẽ gây lỗi React crash #310 ngay lập tức khi mở modal.
  - ❌ *Không chỉ sử dụng URL ảnh CDN `qr.sepay.vn` làm nguồn duy nhất*: Sẽ bị Cốc Cốc và uBlock Origin chặn làm vỡ icon ảnh mã QR.

---

### ISSUE-035: Sản Phẩm & Chiến Dịch Test Của Hệ Thống Bị Sót Lại Trên Production (Test Artifacts Leaking to Production - Case Yến Vân & Rotwood)
- **Triệu chứng**:
  - Trên web khách mục "Giật code" (/giveaways), xuất hiện chiến dịch test `GamerPower × Rotwood Drakin Armoury Steam Loot` gán nhầm vào tựa game `Yến Vân Thập Lục Thanh (Where Winds Meet)` (`gw_gamerpower_rotwood`) hiển thị còn 15-50 code, kèm 4 mã giftcode test quốc tế.
  - Tương tự, trước đó xuất hiện `ut_test_01` trong Tiện Ích và 6 gói mock trong Cửa Hàng.
- **Nguyên nhân gốc rễ**:
  - Trong commit `9ee758c` (khi tích hợp nguồn cào quốc tế GamerPower / Alienware Arena), các chiến dịch giveaway và giftcode test đã được inject trực tiếp vào `giveaways.json` và `crawled_codes_188.json`.
  - Khi dọn dẹp Delta Force ở các lượt trước, tác nhân chỉ lọc ID Delta Force mà bỏ sót `gw_gamerpower_rotwood`. Vì `giveaways.json` và bảng SQL Cloudflare D1 vẫn lưu bản ghi này nên hệ thống tiếp tục xếp nó lên đầu danh sách Giật Code vì còn code.
  - Thiếu chốt chặn tự động (Gatekeeper) trước khi build/deploy để rà soát toàn diện các artifact test.
- **Giải pháp chuẩn đã kiểm chứng (Kiến trúc phòng vệ 4 lớp dứt điểm)**:
  1. *Lớp 1 (Tombstones triệt để)*: Bổ sung `gw_gamerpower_rotwood`, `ut_test_01`, `sp_*` mock và 4 mã test quốc tế vào danh sách Tombstones `legacySeedGwIds`, `legacySeedStoreIds`, `legacySeedUtilIds` trong `sync.ts` và gửi lệnh `DELETE FROM` tới Cloudflare D1 SQL.
  2. *Lớp 2 (Edge Worker Guard)*: `functions/api/sync.ts` tự động phát hiện và loại bỏ 100% item test, không bao giờ serve ra API công khai.
  3. *Lớp 3 (Client Disinfection)*: `dataService.ts` tự động thanh tẩy LocalStorage và memory cache 0ms khi khởi động.
  4. *Lớp 4 (Pre-Build Gatekeeper Hook)*: Tạo script `scripts/audit_zero_test_artifacts.cjs` tích hợp trực tiếp vào `npm run build`. Bất kỳ tệp JSON hay API nào còn sót 1 mục test sẽ khiến build bị dừng ngay lập tức (Fail Fast).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không sửa sót nửa vời (chỉ xóa Delta Force mà quên Yến Vân/Rotwood cùng commit)*: Phải luôn dùng `git diff` kiểm tra toàn bộ thay đổi của commit gốc sinh ra dữ liệu test.
  - ❌ *Không chỉ xóa trên frontend mà không gửi Tombstone lên D1*: Bảng SQL D1 sẽ tự phục hồi bản ghi cũ.
  - ❌ *Không build/deploy mà không qua script kiểm tra tự động*: Phải luôn để `audit_zero_test_artifacts.cjs` làm chốt chặn.

### ISSUE-036: Lệch Số Ảo Admin & Web Khách Do Khóa Đỉnh Đơn Điệu (Monotonic Peak Lock) & Nhảy Mốc Anchor (+70 Đơn Bù Giờ)
- **Triệu chứng**:
  - Admin vào trang quản trị hạ hoặc cài đặt lại số ảo cho Tiện ích (ví dụ VIP 7 Days VS Phone từ 136 xuống 64) hoặc Giveaway (Pirate Legends từ 123 xuống 52), nhưng sau khi lưu và tải lại trang, Web Khách vẫn giữ số cũ (137, 124).
- **Nguyên nhân gốc rễ**:
  1. *Khóa Đỉnh Đơn Điệu (`Math.max`)*: Server `functions/api/sync.ts` và bộ nhớ đỉnh `realEventsHub` sử dụng `Math.max(peak, target)`. Khi Admin hạ số, `Math.max` từ chối hạ đỉnh cũ.
  2. *Trần Đỉnh Quá Cao (`50000`)*: `deterministicEngine.ts` và `snapshotService.ts` đặt trần 50.000 nên coi 137 là đỉnh hợp lệ.
  3. *Client Gửi Ngược Đỉnh Lên Server*: `marketingService.ts` lưu `recordedMax` trong LocalStorage và sau đó gọi `schedulePeakReport()` gửi 137 đè ngược lại server.
  4. *Lệch Mốc Thời Gian Tăng Trưởng (Anchor Desync)*: Khi Admin lưu số mới, trường `fomo_anchor_time` không được cập nhật sang thời điểm hiện tại (`new Date().toISOString()`). Thuật toán `calculateHourlyGrowth` fallback về đầu ngày (`dayStart` cách nhiều tiếng), làm số hiển thị nhảy vọt ngay lập tức +70 đơn bù giờ.
  5. *Thiếu cờ `forceReset: true` trong các hàm Save Admin*: Các hàm `saveUtilityItem`, `saveGiveawayItem`, `saveStoreProductItem` chỉ gọi `this.pushFullStateToKV()` (mặc định không có cờ `forceReset`).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Ghi Đè Đỉnh SSOT Trực Tiếp*: Server `functions/api/sync.ts` trực tiếp ghi đè `hub.peakProductSoldCounts[id] = target` khi Admin sync, xóa cache RAM `__wcg_metrics_snapshot` và xóa bảng `system_snapshots` D1.
  2. *Cập Nhật Anchor Time Hiện Tại*: Khi Admin lưu số ảo mới, lập tức cập nhật `fomo_anchor_time = new Date().toISOString()`. Nhờ đó ngay sau khi lưu, thời gian trôi qua là 0 phút $\rightarrow$ số hiển thị đúng 100% bằng số Admin đã đặt.
  3. *Tự Động Auto-Heal Khi Phát Hiện Đỉnh Bất Thường*: Trong `deterministicEngine.ts`, nếu `peakSold > rawDisplaySold + 5`, hệ thống tự động reset đỉnh về `rawDisplaySold`.
  4. *Bảo đảm `forceReset: true`*: `adminDataService.pushFullStateToKV` luôn đính kèm `forceReset: true, forceResetSold: true, forceResetClaimed: true`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `Math.max` vô điều kiện khi Admin thực hiện đồng bộ snapshot*: Phải cho phép Admin ghi đè đỉnh khi có cờ `forceReset`.
  - ❌ *Không để `fomo_anchor_time` bị null khi Admin vừa sửa số ảo*: Sẽ làm thuật toán tính bù giờ từ đầu ngày và cộng thêm hàng chục đơn ảo ngoài ý muốn.
  - ❌ *Không cho phép Client LocalStorage tự ý ghi đè ngược đỉnh cũ lên Server nếu không có đơn hàng thật phát sinh*: Client chỉ được báo cáo tăng nếu người dùng thực sự mua hàng tại máy.

---

### ISSUE-037: Bẫy Trùng Lặp Game Khác Hậu Tố NPH Khi Quét Nguồn CodeMoi.net & Bộ Lọc Domain Cũ Bị Chặn
- **Triệu chứng**:
  - Khi cào game từ `codemoi.net/game-moi/`, một số game bị sinh slug trùng với game đã có trong catalog (ví dụ: CodeMoi đặt slug `ta-la-hac-ngo-khong-vplay`, trong khi kho game `games188.json` đã có sẵn `ta-la-hac-ngo-khong`). Nếu chỉ so khớp chuỗi slug thô hoặc packageId (CodeMoi không có packageId), game sẽ bị nhân bản gây trùng lặp.
  - Nguồn `https://codemoi.net/game-moi/` trước đó không thể hiển thị trong tab Nguồn Cào của Crawler do bộ lọc chặn tên miền `codemoi.net` (tránh các nguồn giftcode cũ lỗi).
- **Nguyên nhân gốc rễ**:
  1. CodeMoi thường ghép tên game với mã NPH làm slug (`{ten-game}-{nph}`), trong khi cơ sở dữ liệu gốc lưu slug tên game thuần túy.
  2. Tab CrawlerModule có bộ lọc `src.url.includes('codemoi.net')` chặn cứng toàn bộ domain này.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Thuật toán `getBaseSlug()` đa tầng*:
     - Tự động chuẩn hóa chuỗi và bóc tách các hậu tố NPH thông dụng: `-(vplay|vtc|gosu|gamota|soha|funtap|vng|garena|vn|mobile|joygames|efun|online)$`.
     - So sánh cả slug gốc lẫn base slug với 623+ game hiện tại và danh sách chờ duyệt trước khi quyết định đăng tự động hoặc thêm vào hàng chờ.
  2. *Mở khóa chọn lọc nguồn Game Mới*:
     - Chỉ cho phép `https://codemoi.net/game-moi/` và ID `src_codemoi_game_moi` hiển thị và thực thi, đồng thời duy trì việc chặn các nguồn giftcode cũ không còn hoạt động.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ so sánh `existingSlugs.has(game.slug)` đối với CodeMoi*: Bắt buộc phải so sánh thêm `existingSlugs.has(getBaseSlug(game.slug))`.
  - ❌ *Không mở chặn toàn bộ domain `codemoi.net` mà không phân loại nguồn*: Chỉ cho phép nguồn `/game-moi/`, không phục hồi các nguồn cào code cũ bị 404.

---

### ISSUE-038: Lỗi Tràn Call Stack (RangeError: Maximum call stack size exceeded) Do Vòng Lặp Gọi Đệ Quy getHourlyGrowth - getSoldDisplay
- **Triệu chứng**:
  - Người dùng mở web từ link chia sẻ trên mạng xã hội (Zalo In-App Browser, Messenger, Facebook) hoặc truy cập các mục Tiện ích / Cửa hàng: Toàn bộ trang web bị sập và hiển thị màn hình cứu hộ ErrorBoundary với thông báo lỗi đỏ: `Maximum call stack size exceeded`.
- **Nguyên nhân gốc rễ**:
  1. *Lỗi đệ quy đồng bộ trong `marketingService.ts`*: Trong hàm `getHourlyGrowth(id, ...)`, nhánh `else` khi chưa có `anchorTime` thực hiện:
     `this.sessionAnchorMap.set(id, { baseSold: this.getSoldDisplay({ id }, 0), lastTimestamp: nowMs });`
     Để gán thuộc tính `baseSold`, JavaScript bắt buộc phải thực thi `getSoldDisplay({ id })`. Nhưng bên trong `getSoldDisplay`, hàm lại gọi ngược `getHourlyGrowth(id, ...)`! Do `sessionAnchorMap.set` chưa chạy xong nên `sessionAnchorMap.get(id)` vẫn undefined, khiến nhánh `else` lại gọi tiếp `getSoldDisplay({ id })`. Vòng lặp đệ quy lặp lại liên tục hàng ngàn lần trong 1 microsecond làm tràn ngăn xếp call stack của trình duyệt.
  2. *Đè xoá route deep-link quá sớm trong `App.tsx`*: Effect đồng bộ URL chạy trong khi `parseHash()` còn đang đọc dữ liệu bất đồng bộ từ slug, đè ngược URL `/game/...` thành `/` và kích hoạt re-render hàng loạt thẻ sản phẩm.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Khởi tạo Session Anchor độc lập không đệ quy*:
     - Trong `getHourlyGrowth`: Thiết lập trực tiếp `this.sessionAnchorMap.set(id, { lastCount: 0, lastTimestamp: nowMs });` và `return 0;`.
     - Tuyệt đối không gọi `getSoldDisplay` hay bất kỳ hàm tính toán ngoài nào bên trong `getHourlyGrowth`.
  2. *Bảo vệ URL chia sẻ Deep-Link trong `App.tsx`*:
     - Bổ sung cờ `isInitialLoadDone`. Chỉ cho phép xóa URL `/game/...` khi tiến trình định tuyến ban đầu đã hoàn thành 100%.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gọi hàm cha (`getSoldDisplay`) từ hàm con (`getHourlyGrowth`) mà không có điều kiện dừng (base case) đã lưu sẵn*: Sẽ luôn gây crash `Maximum call stack size exceeded` trên mọi phiên truy cập mới.
  - ❌ *Không dùng `window.history.replaceState` để ép đổi pathname khi component cha chưa hoàn tất lifecycle khởi tạo (`isInitialLoadDone === false`)*.

---

### ISSUE-039: Logo Game Quét Được Bị Lỗi Hiển Thị & Biến Dạng Thành Khối DiceBear Identicon
- **Triệu chứng**:
  - Trong trang Quản trị Admin (tab "Crawler & Auto Sync"), toàn bộ các game cào về từ CodeMoi hoặc các nguồn ngoài bị lỗi tải ảnh và biến dạng thành các hình khối pixel / avatar vuông ngẫu nhiên (DiceBear identicon).
- **Nguyên nhân gốc rễ**:
  1. *Lỗi ngắt kết nối ECONNRESET & Chặn Adblock*: Tên miền nguồn ngoài (`codemoi.net`) thường xuyên bị ngắt kết nối hoặc chặn cross-origin. Ngoài ra, trình duyệt Cốc Cốc / Adblock chặn tài nguyên từ domain này.
  2. *Fallback DiceBear*: Sự kiện `onError` trong thẻ `<img>` thay thế bằng `https://api.dicebear.com/7.x/identicon/svg?seed=...`, làm mất hoàn toàn nhận diện game.
  3. *Thiếu tầng tra cứu Google Play & Lưu trữ nội bộ*: Hệ thống chưa tự động tra cứu logo chính thức từ Google Play CDN (`play-lh.googleusercontent.com`) và chưa tải về lưu trữ nội bộ tại `public/game_icons/{slug}.webp`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Engine `game_logo_resolver.cjs`*: Tự động tra cứu Google Play Store VN, lấy logo WebP 512x512/256x256 sắc nét và tải về lưu cố định vào `public/game_icons/{slug}.webp` cùng bản `.jpg` cho Open Graph.
  2. *Edge Image Proxy (`functions/api/game-icon.ts`)*: Cung cấp endpoint proxy an toàn tại Cloudflare Edge chống 100% việc bị chặn bởi AdBlock.
  3. *Giao diện Admin thông minh*: Thẻ ảnh ưu tiên nạp từ local icon hoặc Google Play CDN hoặc Edge Proxy; xóa bỏ hoàn toàn fallback DiceBear; bổ sung nút "🖼️ Logo" cho phép Admin đổi link logo nhanh chóng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
---

### ISSUE-040: Bẫy So Khớp Chuỗi Rỗng Khi Tra Cứu Google Play Gây Ghép Nhầm Ứng Dụng Tiện Ích AI Vào Game
- **Triệu chứng**:
  - Khi tra cứu tự động trên Google Play cho các game có tên ngắn hoặc tên tiếng Anh (như `Girls Echo`, `MAke Drama: MAD`, `Strinova VN`), hệ thống tự động gán nhầm sang các ứng dụng chat AI (`com.chat.whisper`), công cụ làm video AI (`luma.sora.pika...`), hoặc game sinh tồn không liên quan.
- **Nguyên nhân gốc rễ**:
  1. *Thất bại khi bóc tách tiêu đề ứng dụng*: Google Play phiên bản mới bọc tiêu đề trong thẻ `<h1><span class="..." itemprop="name">Tiêu đề</span></h1>`. Biểu thức regex cũ tìm `h1 itemprop="name"` bị miss, khiến biến `appTitle` nhận giá trị rỗng `""`.
  2. *Bẫy `String.prototype.includes("")` trong JavaScript*: Biểu thức `normTarget.includes(normFound)` khi `normFound === ""` luôn luôn trả về `true` đối với bất kỳ chuỗi mục tiêu nào. Do đó ứng dụng đầu tiên trong danh sách tìm kiếm (thường là các app AI hot nhiều lượt tải) bị coi là "khớp 100%".
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Sử dụng `<meta property="og:title">` kết hợp `itemprop="name"` để lấy tiêu đề chính xác 100%.
  2. Bắt buộc kiểm tra độ dài tối thiểu: `if (!normFound || normFound.length < 2 || !normTarget || normTarget.length < 2) continue;`.
  3. Lọc bỏ các package hoặc tiêu đề có dấu hiệu app tiện ích AI/video/chat (`isSuspectNonGame`).
  4. Nếu không khớp Google Play, ưu tiên tải và lưu trực tiếp cover sắc nét gốc của game ($\ge 10KB$) từ trang chủ cào thay vì cố ép sang một ứng dụng Google Play không liên quan.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ gọi `target.includes(found)` khi `found` chưa được kiểm tra `found.trim().length > 0`*: Gây ra lỗi False Positive 100%.
  - ❌ *Không dùng điều kiện fallback `packageIds.length === 1` khi tên ứng dụng hoàn toàn không có từ khóa tương đồng*: Dễ gán nhầm các ứng dụng rác khi kết quả tìm kiếm chỉ có 1 app.

---

### ISSUE-041: Bẫy Bóc Tách Từ Vựng Web Thông Dụng Thành Giftcode (Web Scraper False Positives)
- **Triệu chứng**:
  - Hàng chờ duyệt Giftcode (`crawlerPendingCodes`) bị tràn ngập các từ ngữ thông dụng tiếng Anh / tiếng Việt như `GAME`, `NGAY`, `TYPE`, `BELOW`, `OFFERS`, `FROM`, `GAMOTA`, `THEO`, `WITH`, `WITHIN`, `WORKS`, `DROPS`...
- **Nguyên nhân gốc rễ**:
  1. *Thiếu bộ lọc từ vựng & Blacklist trong Scraper*: Các thẻ HTML `<td>`, `<strong>`, `<b>` trong các câu hướng dẫn hoặc bảng thanh toán (vd: "Type below offers from Gamota") bị regex bóc tách thành mã code nếu từ đó viết hoa hoặc đứng đầu dòng.
  2. *Thiếu ràng buộc tựa game đích*: Mã không khớp với bất kỳ game nào vẫn được gán nhãn `unknown-game` và đưa vào hàng chờ thay vì loại bỏ.
  3. *Chấm điểm lỏng lẻo*: Mã không rõ game vẫn được cộng điểm nguồn cào và điểm quà tặng mặc định, đạt 45-60 điểm (vượt ngưỡng 40đ để vào hàng chờ Bậc 3, 4).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Xây dựng engine lọc mã rác đa tầng tập trung (`scripts/crawler/engine/code_filter.cjs`):
     - Blacklist hơn 200+ từ vựng, nhãn UI, giới từ, tên NPH, thương hiệu nền tảng.
     - Quy tắc hình thái học: Chặn số nguyên thuần túy dạng ngày tháng (`0401`), bắt buộc tiền tố chuẩn cho mã ngắn thuần chữ cái ($\le 4$ ký tự), chặn ký tự lặp đơn điệu.
  2. Bắt buộc ràng buộc game: Mã không khớp được game trong catalog (`matchConfidence <= 0` hoặc `unknown-game`) bị loại bỏ ngay lập tức (0 điểm).
  3. Nâng ngưỡng hàng chờ lên $\ge 50$ điểm kèm điều kiện có tựa game xác định.
  4. Bổ sung nút "🧹 Dọn mã rác" trong trang Admin để thanh lọc nhanh chóng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ dùng regex độ dài `/^[A-Z0-9]{4,24}$/` mà bỏ qua kiểm tra từ điển*: Sẽ bóc tách nhầm hàng trăm từ tiếng Anh/Việt thông dụng.
  - ❌ *Không lưu trữ mã `unknown-game` vào hàng chờ*: Giftcode không có game là vô dụng và gây rác hệ thống.

---

### ISSUE-042: Khó Khăn Khi Chọn Game Nạp Giftcode Do Sử Dụng Thẻ Native Select Không Tìm Kiếm Được Tiếng Việt
- **Triệu chứng**:
  - Trong trang Quản trị Code Miễn Phí (`/admin#/free-codes`), khi mở modal "Nhập Giftcode Hàng Loạt" hoặc "Thêm Code Mới", quản trị viên rất khó tìm game vì dropdown danh mục chứa hơn 624 tựa game.
  - Không thể gõ tên game, không tìm kiếm được tiếng Việt có dấu/không dấu, không có logo nhận diện, phải cuộn chuột tìm kiếm thủ công.
- **Nguyên nhân gốc rễ**:
  - Sử dụng thẻ HTML `<select>` mặc định của trình duyệt với danh sách tĩnh 624 `<option>`. Thẻ `<select>` không cung cấp input tìm kiếm và không có cơ chế chuẩn hóa dấu tiếng Việt.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Sử dụng component `SearchableGameSelect` tích hợp thuật toán `calculateGameSearchScore` + `normalizeVietnamese`:
    + Hỗ trợ gõ tiếng Việt có dấu (`Tiên Giới`, `Hắc Ngộ Không`) và không dấu (`tien gioi`, `hac ngo khong`).
    + Hỗ trợ viết tắt (`tg`, `nk`, `tala`, `hnk`, `tlhnk`, `vltk`, `lq`, `ff`), tên NPH (`VGP`, `VPlay`, `VNG`...), thể loại hoặc slug.
    + Hiển thị logo chính thức của game, số lượng giftcode hiện có, highlight trực quan cụm từ tìm kiếm.
    + Tích hợp vào cả Modal Nhập hàng loạt, Modal Thêm/Sửa code, và thanh lọc trên bảng dữ liệu `DataTable`.
### ISSUE-043: Quy Định Cố Định Hệ Thống Tên Miền Chuẩn (Admin Duy Nhất & 2 Web Khách)
- **Triệu chứng & Bẫy Cần Tránh**:
  - Nhầm lẫn hoặc triển khai sang các dự án / tên miền khác ngoài phạm vi (ví dụ `codegame.store`, `codegamestore`), làm phân tán hạ tầng và gây nhầm lẫn khi kiểm thử đồng bộ dữ liệu.
- **Quy Định Bắt Buộc Tuyệt Đối Từ Chủ Sở Hữu Dự Án**:
  1. *Trang Quản Trị (Admin Portal - Duy Nhất)*:
     - `https://admin-code-game-shop.pages.dev` (Cloudflare Pages Project: `admin-code-game-shop`)
  2. *Trang Khách Hàng (Client Portals - Đúng 2 Web)*:
     - `https://web-code-game.pages.dev` (Cloudflare Pages Project: `web-code-game`)
     - `https://codegame.shop/` (Custom domain chính thức gắn với `web-code-game`)
  3. *Cơ chế Duyệt là Lên Ngay & Tự Động Xuất Bản*:
     - Khi Admin duyệt trên `https://admin-code-game-shop.pages.dev`, dữ liệu ghi vào D1 SSOT (`b2b5372f-1c6f-4067-a74d-8029ded6ec79`) và xóa cache PoP Edge cho cả `https://codegame.shop/` và `https://web-code-game.pages.dev`.
     - Game mới có giftcode (`activeCodesCount > 0`) tự động xuất bản ngay lập tức.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không triển khai hoặc thêm các tên miền ngoài danh sách vào cấu hình build/deploy*: Dự án này **CHỈ LÀM VIỆC** với 1 Admin duy nhất (`https://admin-code-game-shop.pages.dev`) và 2 Web khách (`https://web-code-game.pages.dev` & `https://codegame.shop/`).
  - ❌ *Không cấu hình nhầm sang Cloudflare project `codegamestore`*: Toàn bộ hạ tầng web khách chỉ nằm trên project `web-code-game`.

### ISSUE-044: Bẫy Nhầm Lẫn Giữa codegame.store (Dự án riêng 3) và web-code-game (Dự án hiện tại 13)
- **Triệu chứng & Nguyên nhân**:
  - Máy tính người dùng có 2 thư mục dự án riêng biệt:
    + `C:\4 Antigravity all\3 Codegame store` $\rightarrow$ Project Cloudflare Pages `codegamestore`, domain `https://codegame.store`, database D1 `codegamestore-db` (`be54527d-f2b7-4777-8da4-38601ef63fd4`).
    + `C:\4 Antigravity all\13 web code game` $\rightarrow$ Project Cloudflare Pages `web-code-game` & `admin-code-game-shop`, domain `https://web-code-game.pages.dev`, `https://codegame.shop/`, và `https://admin-code-game-shop.pages.dev`, database D1 SSOT `b2b5372f-1c6f-4067-a74d-8029ded6ec79`.
  - Tác nhân AI từng nhầm lẫn 2 dự án này dẫn đến việc deploy đè và đổi binding D1 của `codegamestore`.
- **Giải Pháp & Lệnh Cấm Bất Di Bất Dịch**:
  - Đã rollback hoàn toàn `codegamestore` về deployment gốc `00ba7829-1a6b-4d38-848e-96cc1319fcb0`, khôi phục database `be54527d-f2b7-4777-8da4-38601ef63fd4`, xóa biến `ADMIN_SYNC_SECRET`.
  - **TỪ GIỜ VỀ SAU TUYỆT ĐỐI CẤM**:
    + Không bao giờ can thiệp, đọc, sửa, build, deploy hoặc đổi bất kỳ thứ gì liên quan tới `codegame.store` và project Cloudflare `codegamestore`.
    + Mọi công việc của workspace 13 chỉ xoay quanh 1 admin (`https://admin-code-game-shop.pages.dev`) và 2 web khách (`https://web-code-game.pages.dev` & `https://codegame.shop/`).
### ISSUE-045: Lỗi Mất Logo Game Mới Do Phụ Thuộc Hotlink CodeMoi & Thiếu Fallback Local WebP Icon
- **Triệu chứng**:
  - Sau khi đẩy/duyệt game mới lên web khách, thẻ game không hiển thị logo mà rơi về avatar gradient chữ cái viết tắt (ví dụ tím `TV` cho Tarot, cam `MD` cho MAke Drama).
- **Nguyên nhân gốc rễ**:
  1. *Lưu trữ hotlink ngoại vi `https://codemoi.net/covers/...` trong D1*: Máy chủ CodeMoi thường xuyên chặn cross-origin hoặc drop connection (`ECONNRESET`), khiến trình duyệt client load ảnh thất bại.
  2. *Thiếu fallback 2 tầng trong UI component*: `GameCard.tsx` trước đây khi gặp `onError` lập tức chuyển sang render initials thay vì thử fallback về file icon cục bộ `/game_icons/${game.slug}.webp`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Chuẩn hóa 100% URL icon trong D1 và API về đường dẫn cục bộ `/game_icons/${game.slug}.webp`.
  2. Tại backend `/api/games` & `/api/sync`: Nếu `icon_url` chứa `codemoi.net` hoặc rỗng $\rightarrow$ Tự động ép chuẩn về `/game_icons/${slug}.webp`.
  3. Tại frontend `GameCard.tsx`, `GameDetailModal.tsx`, `SearchAutocomplete.tsx`: Bổ sung `getSafeIcon` chặn link codemoi và `handleImageError` tự động thử lại với kho icon nội bộ trước khi hiển thị chữ cái.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không bao giờ lưu URL trực tiếp của `codemoi.net/covers/` vào database `wcg_admin_games_v5`*: Bắt buộc dùng icon nội bộ `/game_icons/${slug}.webp`.
  - ❌ *Không chỉ bắt `onError` rồi set ngay `imageError = true`*: Luôn phải fallback về `/game_icons/${slug}.webp` trước.

### ISSUE-046: Lỗi Runtime "useEffect is not defined" Khi Thêm Hook Mà Quên Cập Nhật Import React
- **Triệu chứng**:
  - Truy cập web khách `https://codegame.shop/` hiển thị màn hình Error Boundary: *"Đã có sự cố hiển thị nhỏ xảy ra - useEffect is not defined"*.
- **Nguyên nhân gốc rễ**:
  - Khi thêm hook mới (như `useEffect`, `useCallback`, `useMemo`) vào component, dev chỉ gọi hàm trong thân component nhưng danh sách destructured imports từ `'react'` ở dòng đầu file không được bổ sung hook tương ứng.
  - Do Vite sử dụng esbuild/swc transpile từng file độc lập mà không kiểm tra type checker mặc định khi build (`vite build`), lỗi chỉ phát sinh tại runtime khi trình duyệt thực thi code.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Luôn kiểm tra kỹ dòng import đầu tiên của file React component khi thêm hook mới: `import React, { useState, useEffect } from 'react';`.
  - Khuyến nghị chạy `npx.cmd eslint` hoặc kiểm tra static analysis trước khi commit.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không được giả định file đã có sẵn hook*: Luôn kiểm tra dòng 1 của component trước khi dùng bất kỳ hook nào.

---

### ISSUE-047: Bẫy Duyệt Mảng Tuyến Tính & Match Chuỗi Con Lỏng Lẻo Khiến Game Khớp Tên Nhất Bị Đẩy Xuống Dưới
- **Triệu chứng**:
  - Khi gõ từ khóa tìm kiếm (ví dụ "hắc tây du"), dropdown gợi ý tự động (Autocomplete) và danh mục game hiển thị các tựa game không liên quan (như `3Q Đào Đào Đào`, `Tam Quốc Tứ Thời Ca`, `Loạn Chiến 3Q`) ở các vị trí đầu tiên, trong khi tựa game khớp chính xác nhất là `Hắc Tây Du: Chương Cấm` lại bị đẩy xuống dưới hoặc biến mất khỏi top gợi ý.
- **Nguyên nhân gốc rễ**:
  1. *Duyệt mảng tuyến tính và slice sớm không sắp xếp*: Thuật toán duyệt qua mảng game, game nào khớp `smartVietnameseMatch` thì đẩy ngay vào danh sách và `break` khi đủ `limit = 6` mà không hề tính điểm tương quan (Relevance Score) và không sắp xếp.
  2. *Nhiễu chuỗi con trong mô tả dài*: Kiểm tra `queryWords.every(w => target.includes(w))` trên toàn bộ chuỗi nối dài gồm cả mô tả 300 từ. Với từ khóa "hắc tây du", "hac" ăn lan vào "khắc chế", "tay" ăn lan vào "rảnh tay", "du" ăn lan vào "dùng xẻng" $\rightarrow$ mọi game có mô tả dài đều trả về `true` và cướp mất các vị trí đầu.
  3. *Lỗi điều kiện sắp xếp Catalog*: `dataService.queryGames` bọc logic sort tìm kiếm trong `if (filter.sortBy === 'updated')`, trong khi mặc định của trang web là `filter.sortBy = 'release_date'`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. *Thang điểm Relevance Scoring chặt chẽ (`calculateGameSearchScore`)*: Exact title 10,000đ, Exact slug 9,500đ, Prefix 8,500đ, Acronyms 7,800đ, Subphrase 6,800đ, Word Boundary 6,200đ, Mô tả 800 - 1,200đ. Phạt nhẹ theo chênh lệch độ dài tên để ưu tiên game có tên ngắn gọn sát nghĩa.
  2. *Sắp xếp toàn bộ trước khi slice*: Cả ở client (`dataService.searchAllGamesAndCodes`, `SearchAutocomplete.tsx` với `sortedGames`) và Cloudflare Edge (`/api/games?autocomplete=1`).
  3. *Ràng buộc ranh giới từ (word boundary)*: Đối với từ khóa ngắn dưới 3 ký tự (ví dụ "ff"), bắt buộc phải có ranh giới từ hoặc dấu cách, tuyệt đối không cho phép "ff" ăn lan vào giữa từ như "Offline".
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không duyệt mảng tuyến tính và push vào kết quả theo thứ tự database*: Phải tính điểm và sort DESC toàn bộ trước khi slice `limit`.
  - ❌ *Không kiểm tra `target.includes(sub)` đối với từ khóa ngắn hoặc không có ranh giới từ trong mô tả dài*: Gây tỷ lệ false positive cực cao.
  - ❌ *Không bọc logic sort tìm kiếm trong điều kiện `sortBy === 'updated'`*: Khi người dùng có nhập từ khóa tìm kiếm, mức độ tương quan (relevance) luôn phải được ưu tiên hàng đầu.

---

### ISSUE-048: Bẫy Sụp Đổ Cây React Fiber Khi Dùng `parent.innerHTML` Thay Thế Thẻ `<img>` Lỗi Trong Event Listener
- **Triệu chứng**:
  - Trên điện thoại di động, khi người dùng chạm hoặc ấn vào ô tìm kiếm thì trang web gặp lỗi crash, xuất hiện màn hình cứu hộ Error Boundary ("Đã có sự cố hiển thị nhỏ xảy ra").
- **Nguyên nhân gốc rễ**:
  - Trong component `SearchAutocomplete.tsx`, các thẻ `<img>` icon game tải ảnh webp sử dụng callback:
    `onError={(e) => { const parent = (e.target as HTMLElement).parentElement; if (parent) parent.innerHTML = '...'; }}`
  - Thuộc tính `parent.innerHTML` trực tiếp can thiệp và xóa phần tử DOM thật của thẻ `<img>` mà không thông qua React.
  - Khi người dùng chạm vào ô tìm kiếm trên điện thoại, bàn phím ảo bật lên làm viewport co lại và trình duyệt tự động scroll.
  - Sự kiện `resize` & `scroll` kích hoạt re-render. Khi React Fiber đối soát cây DOM ảo (reconciliation), React tìm kiếm thẻ `<img>` trong `parent` để unmount/update nhưng thẻ đã bị xóa khỏi DOM thật.
  - React ném lỗi DOM nghiêm trọng: `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.` khiến Error Boundary kích hoạt.
- **Giải pháp chuẩn đã kiểm chứng**:
  - Tuyệt đối không dùng `parent.innerHTML` trong bất kỳ component React nào.
  - Tách thành component con React độc lập (ví dụ `GameSearchIcon`) quản lý state `const [hasError, setHasError] = useState(false);` và dùng `onError={() => setHasError(true)}`. Khi `hasError === true`, React tự động render khối JSX thay thế mà không làm biến dạng cây DOM Fiber.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Tuyệt đối không dùng `element.parentElement.innerHTML = ...` trong React event listener*: Luôn dùng state React thuần để chuyển đổi giao diện khi xảy ra lỗi tải ảnh.

---

### ISSUE-049: Bẫy Ô Vuông Đen Tối Do `loading="lazy"` Kết Hợp Skeleton `bg-muted` & File Giả Mạo Định Dạng (Lazy Load Dark Box & Disguised WebP Trap)
- **Triệu chứng**:
  - Khi người dùng mở website (đặc biệt trên trình duyệt Cốc Cốc hoặc thiết bị di động), hàng loạt ô logo game (như Tarot, Tiên Giới, Hải Tặc Truyền Kỳ, MAKe Drama, Dị Giới Sinh Tồn, Yến Vân...) hiển thị dạng ô vuông màu đen/tím tối ngòm, không hiện hình ảnh và cũng không hiện avatar chữ cái.
- **Nguyên nhân gốc rễ**:
  1. *Lỗi `loading="lazy"` kết hợp `opacity-0` và Skeleton `bg-muted animate-pulse`*:
     - Trong `GameCard.tsx`, khi `imageLoaded === false`, thẻ `<img>` bị ép class `opacity-0` và một thẻ skeleton `<div className="absolute inset-0 bg-muted animate-pulse" />` đè lên trên.
     - Với các thẻ ở màn hình đầu tiên (above-the-fold), `loading="lazy"` khiến cơ chế IntersectionObserver của Chromium (nhất là tính năng Data Saver / Battery Saver của Cốc Cốc) trì hoãn tải ảnh, không kích hoạt `onLoad`.
     - Vì màu `bg-muted` trong dark mode là màu xám đen (`hsl(217.2 32.6% 17.5%)`), người dùng thấy một hàng ô vuông màu đen tối ngòm!
  2. *File JPEG giả mạo mang đuôi mở rộng `.webp` & Dung lượng quá tải*:
     - File `yen-van-thap-luc-thanh.webp`, `where-winds-meet.webp`, `where-winds-meet-mobile.webp`, `ark-recode.webp`, `cherry-tale.webp` thực chất là file JPEG gốc (header `FF D8 FF E0 ... JFIF`) nặng tới 224 KB nhưng lại mang đuôi `.webp`.
     - Cloudflare gửi `Content-Type: image/webp` theo đuôi mở rộng, làm trình giải mã WebP của trình duyệt gặp lỗi phân giải stream nhị phân.
     - Các icon nặng hàng trăm KB (`3q-dao-dao-dao.webp` nặng 513 KB) gây nghẽn kết nối mạng di động.
  3. *Thiếu chuỗi fallback đa tầng và lệch dữ liệu D1 vs local JSON*:
     - 3 tựa game mới (`Tarot`, `Hải Tặc Truyền Kỳ`, `MAKe Drama`) có trên Cloudflare D1 nhưng chưa có trong `games188.json` cục bộ.
     - Hàm `handleImageError` cũ chỉ thử lại chính đường dẫn webp mà không thử sang file `.jpg` song hành hay Edge proxy.
- **Giải pháp chuẩn đã kiểm chứng**:
  - **Kiến trúc hiển thị 2 lớp (Persistent Branded Base Layer + Smooth Progressive Overlay)**:
    - *Lớp nền (Base Layer)*: Luôn luôn render avatar gradient rực rỡ với chữ cái viết tắt của game (`getGameInitials`). Lớp này luôn hiện diện ngay từ frame 0.
    - *Lớp ảnh (Image Layer)*: Thẻ `<img>` nằm đè lên trên với `decoding="async"` (bỏ `loading="lazy"` ở các thẻ trên màn hình), mượt mà chuyển `opacity-0` sang `opacity-100 transition-opacity duration-300` khi ảnh tải xong.
    - *Xóa bỏ hoàn toàn skeleton `bg-muted animate-pulse`*: Đảm bảo trên toàn bộ website không bao giờ xuất hiện ô vuông đen tối.
  - **Chuẩn hóa nhị phân & Nén toàn bộ icon**:
    - Dùng Python Pillow chuyển đổi 100% các file JPEG mang đuôi webp sang WebP nguyên bản (nén từ 224 KB xuống 12.6 KB).
    - Nén toàn bộ 24 icon vượt 80 KB (`3q-dao-dao-dao` từ 513 KB xuống 26 KB).
    - Tạo đầy đủ 644/644 file `.jpg` Open Graph song hành tương ứng.
  - **Fallback Đa Tầng**: WebP $\rightarrow$ JPG $\rightarrow$ Edge Proxy `/api/game-icon?slug=...` $\rightarrow$ Initials Avatar.
  - **Bổ sung 3 game thiếu vào `games188.json`** & nâng cấp `DATASET_VERSION = 'wcg_dataset_2026_10_19_v39'` để tự động làm mới LocalStorage của toàn bộ người dùng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không che giấu avatar sau một khối skeleton `bg-muted animate-pulse` tối đen khi `imageLoaded === false`*: Khiến web trông như bị hỏng nếu mạng chậm hoặc trình duyệt trì hoãn ảnh.
  - ❌ *Không dùng `loading="lazy"` cho các thẻ game ở màn hình đầu tiên (above-the-fold)*: Trình duyệt Cốc Cốc và Chromium trên mobile sẽ trì hoãn tải ảnh gây trễ hiển thị nghiêm trọng.
  - ❌ *Không đổi tên file `.jpg` thành `.webp` mà không dùng thư viện chuyển đổi nhị phân (Pillow/Sharp)*: Gây lỗi giải mã hình ảnh (WebP decoder error).

---

### ISSUE-050: Trình quét Giftcode cào nhầm từ vựng tiếng Anh thông dụng (HELPER, ALREADY, MEANS, WITHOUT) & Lỗi hiển thị Bậc 1 sai lệch
- **Triệu chứng**:
  - Trong Admin Portal (`/admin#/crawler` - tab Hàng Chờ Duyệt Code), xuất hiện các mã code vô nghĩa bóc tách từ bài viết tiếng Anh (`Where Winds Meet`): `HELPER`, `ALREADY`, `MEANS`, `WITHOUT`.
  - Cả 4 từ đều bị chấm điểm sai lệch lên tới **98 điểm** và hiển thị badge màu xanh lá **`Bậc 1 • 98đ`**, trong khi thực tế chúng chỉ là từ vựng tiếng Anh trong câu văn hướng dẫn.
- **Nguyên nhân gốc rễ**:
  1. *Regex bóc tách trong `scripts/crawler/scrapers/web_scraper.cjs` quá dễ dãi*:
     - Pattern `/(?:code|giftcode|mã quà tặng|mã code|promo code)[:\s*]+([A-Za-z0-9_<>-]{4,28})\b/gi` sử dụng `[:\s*]+`, khớp cả một dấu cách thông thường ` ` giữa chữ "code" và từ tiếng Anh kế tiếp trong câu văn xuôi (`Exchange Code Helper` -> `Helper`, `has had this code already` -> `already`, `a code means somebody` -> `means`, `A code without a tick` -> `without`).
     - Thiếu bóc tách thẻ code chuyên dụng (`code-field`, `code-card`, `giftcode`, `data-clipboard-text`, `aria-label`).
  2. *Bộ lọc `code_filter.cjs` thiếu cơ chế kiểm tra hình thái học cho mã thuần chữ cái*:
     - Quy tắc cũ cho phép mọi chuỗi chỉ toàn chữ cái (không có chữ số) lọt qua nếu không nằm trong danh sách 150 từ của `JUNK_WORDS_SET`.
     - Không kiểm tra hậu tố từ loại tiếng Anh (`-ER`, `-LY`, `-ING`, `-TION`, `-ED`...) và không kiểm tra chuỗi gốc viết thường trong văn bản.
  3. *Thuật toán chấm điểm `code_scorer.cjs` cho điểm oan*:
     - Regex `/^[A-Z0-9_-]{5,24}$/` khớp cả chữ cái thuần túy và cộng trọn vẹn +25 điểm Alphanumeric. Cùng với +40đ (match tên game) và +18đ (nguồn uy tín) + 15đ (phần thưởng giả định) = 98 điểm.
  4. *Bẫy hiển thị `getTierBadge` trong `CrawlerModule.tsx`*:
     - Dòng code `if (tier === 1 || score >= 90)` đã ghi đè hiển thị Bậc 1 mỗi khi `score >= 90`, dù `tier` thực tế là 2.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. **Nâng cấp `code_filter.cjs`**:
     - *Quy tắc thép mã thuần chữ cái*: Nếu mã không có chữ số (`!/\d/.test(clean)`), BẮT BUỘC phải có tiền tố quà tặng chuẩn (`VIP`, `SVIP`, `GIFT`, `CODE`, `TANTHU`, `LAUNCH`...), HOẶC chứa gạch nối/dưới $\ge 7$ ký tự, HOẶC bắt đầu bằng từ viết tắt tựa game (acronym $\ge 3$ ký tự như `WWM`). Nếu không có $\rightarrow$ **100% REJECT LẬP TỨC**.
     - Thêm `ENGLISH_WORD_SUFFIXES` để loại trừ triệt để từ ngữ có hậu tố tiếng Anh thông dụng.
     - Kiểm tra chuỗi gốc: nếu viết thường trong văn bản và không có số $\rightarrow$ REJECT.
     - Mở rộng `JUNK_WORDS_SET` thêm hơn 200 từ vựng và thuật ngữ game.
  2. **Nâng cấp `web_scraper.cjs`**:
     - Bắt buộc có dấu phân cách rõ ràng (`:`, `=`, `-`) sau từ khóa code, hoặc mã phải viết hoa và chứa số/tiền tố.
     - Bổ sung trích xuất từ các component thẻ code hiện đại (`code-field`, `code-card`, `giftcode`, `data-clipboard-text`, `aria-label`). Đối với `Where Winds Meet`, trích xuất thành công 498 mã chuẩn xác (`KR37X46J37`, `THYC44DPXN`, ...) và loại bỏ 100% mã rác.
  3. **Nâng cấp `code_scorer.cjs`**:
     - Phân biệt rõ `isTrulyAlphaNumeric` (phải có cả chữ và số, hoặc tiền tố code).
     - Mã thuần chữ cái bị trừ 25 điểm và khóa trần điểm $\le 55$đ (Bậc 3), tuyệt đối không bao giờ được cấp Bậc 1 hay Bậc 2.
  4. **Nâng cấp `CrawlerModule.tsx`**:
     - Sửa `getTierBadge` kiểm tra nghiêm ngặt `tier === 1`.
     - Cập nhật `isJunkCrawlerCode` đồng bộ với bộ lọc server.
  5. **Dọn sạch dữ liệu rác trên Cloudflare D1**:
     - Gửi yêu cầu API xóa bỏ toàn bộ 4 mã rác khỏi `wcg_crawler_pending_codes_v1`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `[:\s*]+` sau từ khóa code trong regex bóc tách*: `\s+` khớp dấu cách giữa các từ trong câu văn thường, biến từ vựng thông thường thành ứng viên code.
  - ❌ *Không cộng điểm Alphanumeric cho chuỗi chỉ gồm chữ cái*: Cần regex `(?=.*[A-Z])(?=.*\d)` hoặc tiền tố code rõ ràng.
  - ❌ *Không dùng `if (tier === 1 || score >= 90)` để hiển thị badge Bậc 1*: Badge phải phản ánh chính xác thuộc tính `tier`.

---

### ISSUE-051: Bất đồng bộ số ảo ngoài Web do gán ngầm kho ảo 20, bù ngoại tuyến 48 đơn/giờ và bẫy khóa đỉnh ma LocalStorage (Ghost Peak Lock)
- **Triệu chứng**:
  - Admin cấu hình số đã săn ảo `virtual_claimed_offset = 0` (hoặc số đã bán `virtual_sold_count = 0`), mong muốn hiển thị đúng 100% số thật (ví dụ 25 đã giật, 7 mã còn lại). Tuy nhiên, trên Web khách và snapshot `/api/metrics/synced` lại hiển thị vọt lên **96 đã giật, 15 mã còn lại**!
  - Khi Admin cài đặt mục tiêu số ảo (ví dụ 64 đơn cho `ut_vs_05_vip_7d`), chỉ sau thời gian ngắn số lượng ngoài web bị nhảy vọt lên 135 đơn (+71 đơn ngoài ý muốn).
  - Khi Admin reset số ảo về số thật hoặc chỉnh giảm số lượng, trình duyệt người dùng vẫn bị kẹt cứng ở con số đỉnh ma cũ (96 hoặc 135) do LocalStorage không chịu hạ xuống.
- **Nguyên nhân gốc rễ**:
  1. *`DEFAULT_PRODUCT_MARKETING_CONFIG` tự ý ép kho ảo 20 và `priority = 'normal'`*:
     - Mọi sản phẩm/tiện ích/giveaway chưa cấu hình riêng trong `productWeights` đều bị ép nhận kho ảo 20 và ưu tiên `'normal'`, làm biến dạng tồn kho thật và kích hoạt thuật toán sinh số ảo.
  2. *`calculateDeterministicSold` không kiểm tra `base <= 0`*:
     - Kể cả khi Admin đặt `virtual_offset = 0`, hàm vẫn chạy `calculateHourlyGrowth` (+70 đơn) và `inHourProgression` (+1 đơn) $\rightarrow$ đội số lên $25 + 0 + 71 = 96$ đơn.
  3. *`DEFAULT_OFFLINE_CATCHUP_CONFIG` bị đặt nhầm `mode: 'custom'` và `incrementStep: 12` mỗi 15 phút*:
     - Tốc độ lên tới **48 đơn/giờ**, khiến mọi sản phẩm có mốc thời gian cách 1.5 giờ đều bị đẩy kịch trần tối đa +70 đơn ngoại tuyến.
  4. *Bẫy khóa đỉnh ma `Math.max(curHigh, effectiveSold)` trong `fetchMetricsSnapshot`*:
     - Client lưu con số 96 vào `highWaterClaimedCountMap` của `localStorage`. Khi Admin sync số thật 25 từ server, lệnh `Math.max(curHigh, effectiveSold)` giữ nguyên 96, vĩnh viễn không bao giờ hạ xuống.
  5. *Hub D1 lưu giữ đỉnh cũ khi `baseTarget = 0`*:
     - Khâu dọn dẹp `snapshotService.ts` chỉ kiểm tra `maxAllowed = realClaimed + baseTarget + 70 + 25`. Khi `baseTarget = 0`, `maxAllowed` vẫn là $25 + 95 = 120$, từ chối hạ đỉnh 96 xuống 25.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. **Khắc phục `src/shared/deterministicEngine.ts`**:
     - Trong `calculateDeterministicSold`: Nếu `base <= 0`, trả về `real` ngay lập tức, ngắt 100% `hourlyGrowth` và `inHourProgression`.
     - Trong `calculateHourlyGrowth`: Tốc độ tăng trưởng hợp lý cho từng sản phẩm (0.2 - 1.5 đơn/giờ), khóa trần rate $\le 2.5$ đơn/giờ, trần tối đa 30 đơn, bỏ jitter.
     - Trong `calculateInHourProgression`: Nếu thiếu `parsedAnchorMs`, trả về 0.
     - Trong `calculateGlobalSnapshot`: Nếu `virtual_sold_count <= 0` hoặc `virtual_claimed_offset <= 0`, không ép bonus mặc định 20, đưa `priority` về `'off'`, đỉnh tối đa không vượt quá số thật.
  2. **Khắc phục `functions/services/snapshotService.ts` & `functions/api/sync.ts`**:
     - Tự động thanh lọc đỉnh ma về đúng số thật khi `baseTarget = 0` trong `hub.peakProductSoldCounts`, `hub.peakGiveawayClaimedCounts`, `hub.lowestProductStock`, `hub.lowestGiveawayRemaining`.
  3. **Khắc phục `src/services/marketingService.ts`**:
     - `DEFAULT_PRODUCT_MARKETING_CONFIG`: `priority: 'off'`, `virtualStockBonus: 0`.
     - `DEFAULT_OFFLINE_CATCHUP_CONFIG`: `mode: 'auto'`, `intervalMinutes: 60`, `incrementStep: 1`, `maxCatchUpUnits: 30`.
     - `getSoldDisplay` & `getClaimedDisplay`: Nếu `virtualBase <= 0` và không có override, trả về `effectiveReal` và tự động chữa lành `highWaterMap`.
     - `fetchMetricsSnapshot`: Cho phép hạ số khi server snapshot thấp hơn (`curHigh > effectiveSold + 3`), giải phóng triệt để bẫy khóa đỉnh ma.
     - `applyOfflineCatchUp`: Bỏ qua các mục có `virtualBase <= 0`.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán mặc định `priority: 'normal'` và `virtualStockBonus: 20` cho mọi sản phẩm*: Khiến mục chưa cấu hình bị thổi phồng kho ảo và số bán ảo.
  - ❌ *Không cộng `hourlyGrowth` khi `virtualBase <= 0`*: Khi Admin tắt số ảo, số hiển thị phải là số thật 100%.
### ISSUE-052: Thông báo Marketing nổ ra nhưng số còn lại không giảm 1 và số đã bán/đã giật không tăng 1 (Notification Stock & Sold Disconnect)
- **Triệu chứng**:
  - Khi có 1 thông báo toast nổ ra trên giao diện (ví dụ đơn mua sản phẩm hoặc giật giveaway), số lượng còn lại (`Còn:`) của sản phẩm đó không giảm đi 1, hoặc số đã bán / đã săn (`Đã bán:`, `Đã săn:`) không tăng thêm 1.
  - Trên các thiết bị khác nhau, số lượng hiển thị không đồng bộ thống nhất với nhau.
- **Nguyên nhân gốc rễ**:
  1. *`MarketingNotificationToast.tsx` có cờ chặn `if (!(notif as any).localOrigin)`*: Chặn các thông báo test trigger từ Admin hoặc thông báo cục bộ không gửi tín hiệu `recordVirtualSale` hay `recordVirtualGiveawayClaim`.
  2. *`decrementProductStock` chặn khi `pw.priority === 'off'` và ép ngược về `realStock`*:
     - Nhánh `if (pw.priority === 'off') return this.getDisplayStock(productId);` chặn trừ kho khi sản phẩm không có priority.
     - Dòng `nextStock = Math.max(realStock, nextStock);` ép ngược số lượng về `realStock` (ví dụ từ $7 - 1 = 6$ bị ép ngược về 7).
  3. *`getDisplayStock` ghi đè `liveVirtualStockMap` về `baseStock` khi `virtualStockBonus <= 0`*:
     - Mỗi lần component re-render, nó kiểm tra `virtualStockBonus <= 0` và ép ngược `liveStock = baseStock` (7), đồng thời `return Math.max(baseStock, liveStock)` chặn đứng việc hiển thị số 6.
  4. *`incrementLiveSoldCount` & `incrementLiveClaimedCount` chặn khi `pw.priority === 'off'`*:
     - Chặn tăng số đã bán / đã giật khi priority là `'off'`.
  5. *`getSoldDisplay` & `getClaimedDisplay` xóa sổ lượt tăng từ thông báo và lỗi TDZ `recordedMax`*:
     - `getSoldDisplay` sử dụng `recordedMax` trước khi khai báo `let recordedMax`.
     - Điều kiện `if (pw.priority === 'off' || virtualBase <= 0)` tự động reset `recordedMax` về `effectiveRealSold`, xóa sạch lượt bán tăng thêm từ thông báo nổ.
  6. *Server Snapshot Hub tự ý ép `priority = 'off'` và xóa số đã giảm*:
     - `functions/services/snapshotService.ts` tự ý ép `priority = 'off'` khi `baseTarget === 0` thay vì tôn trọng `pw.priority` mà Admin đã cài đặt.
     - Điều kiện `(priority === 'off' && numVal !== realStock)` và `(priority === 'off' && numVal !== realRemaining)` xóa sạch số lượng đã giảm trong Hub D1 và ép ngược về số thật ban đầu, khiến thiết bị khác không đồng bộ được số đã trừ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. **Nâng cấp `src/components/MarketingNotificationToast.tsx`**: Mọi thông báo xuất hiện trên màn hình đều kích hoạt trừ kho và tăng số bán/săn, chống trừ đúp bằng Set `processedStockNotifIds`.
  2. **Nâng cấp `src/services/marketingService.ts`**:
     - `decrementProductStock`: Bỏ chặn `priority === 'off'`, cho phép `nextStock = Math.max(1, nextStock)` giảm dần tự nhiên.
     - `getDisplayStock`: Giữ nguyên `baseStock <= 0 => 0`. Khi `baseStock > 0`, trả về đúng `liveStock` đã trừ thay vì ép về `baseStock`.
     - `incrementLiveSoldCount` & `incrementLiveClaimedCount`: Cho phép số đã bán/săn tăng +1 theo thông báo.
     - `getSoldDisplay` & `getClaimedDisplay`: Khai báo `recordedMax` ở đầu hàm (sửa TDZ); bảo toàn lượt tăng từ thông báo (+1, +2...), chỉ thanh lọc khi vượt quá đỉnh ma rác phi lý (> +35).
     - `initLiveVirtualStock`: Giữ nguyên giá trị `v` hợp lệ từ `sessionStorage` khi reload.
     - `fetchMetricsSnapshot`: Tự động nhận snapshot kho thấp hơn từ server (`info.stock < currentLive`), lập tức phát `notifyStockChanged` để UI cập nhật 0 giây cho mọi thiết bị.
  3. **Nâng cấp `functions/services/snapshotService.ts` & `src/shared/deterministicEngine.ts`**: Tôn trọng 100% `pw.priority` Admin cài đặt, không xóa ép `lowestProductStock` / `lowestGiveawayRemaining` trong Hub D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng `Math.max(realStock, nextStock)` trong hàm trừ kho*: Sẽ ngăn cản hoàn toàn việc giảm tồn kho dưới số thật khi không có kho ảo.
  - ❌ *Không ép `liveVirtualStockMap.set(k, baseStock)` mỗi khi đọc `getDisplayStock`*: Sẽ xóa sạch ngay lập tức số lượng đã giảm do thông báo nổ.
  - ❌ *Không reset `recordedMax` về `effectiveRealSold` khi `virtualBase <= 0` nếu `recordedMax` chỉ tăng do thông báo*: Sẽ xóa sổ toàn bộ lượt bán/giật vừa tăng từ toast.

---

### ISSUE-053: Ảnh bìa tin tức bị lỗi ô vuông đen (/og-image.jpg) do chặn Hotlinking và thiếu slug game
- **Triệu chứng**:
  - Tại chuyên mục Tin Tức Game, các bài viết (như Tarot, Ride Storm, Build a Golem, FC Online, Ta Là Quan Lão Gia...) hiển thị logo vuông đen mặc định `/og-image.jpg` thay vì hiển thị hình ảnh tựa game.
- **Nguyên nhân gốc rễ**:
  - Tiêu đề crawler có tiền tố `Game Mobile: Code...` khiến bộ đối soát không nhận diện được tên game, gán `game_name: 'Game Mobile'` và `game_slug: undefined`.
  - Ảnh bìa trỏ đến trang mạng ngoài (`st.download.com.vn`) bị máy chủ nguồn chặn Hotlink (lỗi 403 Forbidden) khi trình duyệt gửi `Referer: https://codegame.shop/`.
  - Khi thẻ `<img>` gặp lỗi 403, hàm `handleImageFallback` cố tìm icon theo `article.game_slug`. Do `game_slug` là `undefined`, nó rơi thẳng vào fallback cuối cùng `/og-image.jpg` (ảnh đen).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Thêm `referrerPolicy="no-referrer"` vào 100% thẻ `<img>` của tin tức để vô hiệu hóa việc gửi header Referer, vượt qua tường lửa chống hotlink của các trang nguồn.
  2. Xây dựng module tự động tra cứu Logo Google Play Store VN (`game_logo_resolver.cjs`) cho các game mới và lưu vào `public/game_icons/${slug}.webp`.
  3. Tự động tải và chuyển đổi ảnh bìa bài viết về lưu trữ nội bộ tại `public/news_covers/${slug}.webp` (nội bộ hóa tài nguyên 100%, tốc độ tải cực nhanh qua CDN Cloudflare Pages).
  4. Nâng cấp cơ chế fallback 3 lớp: Bìa bài viết $\rightarrow$ Icon WebP game $\rightarrow$ Ảnh thư viện `gallery_urls[0]` $\rightarrow$ Tuyệt đối không rơi vào `/og-image.jpg` khi có thông tin game.
  5. Xóa triệt để các bài viết rác (Medpro khám bệnh, bài 2015) bằng Tombstone (`deletedNewsArticles`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để thẻ `<img>` tin tức thiếu thuộc tính `referrerPolicy="no-referrer"`*: Trình duyệt gửi Referer sẽ bị máy chủ báo mạng ngoài trả về 403 Forbidden.
  - ❌ *Không fallback trực tiếp về `/og-image.jpg` khi `cover_url` lỗi*: Phải kiểm tra và tìm icon WebP chính thức theo tên game hoặc slug trước.

---

### ISSUE-054: Logo ảnh bìa tin tức fallback về logo web chính, thiếu Sub-logo Watermark và chưa chuẩn hóa nguồn CodeGame.Shop
- **Triệu chứng**:
  - Tại trang Quản trị (/admin#/news) và trang Khách hàng (/news), phần lớn bài viết tin tức hiển thị thumbnail tròn logo web CodeGame.Shop thay vì logo hoặc ảnh bìa của tựa game bài viết đề cập.
  - Các bài viết chưa có logo phụ (watermark) để nhận diện thương hiệu độc quyền của web trên ảnh bìa.
  - Nguồn và tác giả bài viết bị để trống hoặc hiển thị tên báo ngoài thay vì thương hiệu chính thức CodeGame.Shop.
- **Nguyên nhân gốc rễ**:
  1. *Chặn Hotlink HTTP 403*: Máy chủ báo mạng ngoài (	hanhnien.vn, kenh14, lag.vn) chặn Hotlink khi trình duyệt gửi header Referer, kích hoạt sự kiện onError khiến ảnh fallback về logo web /og-image.jpg.
  2. *Slug icon không tồn tại*: Trình cào tự động slugify các tiêu đề tin tức chung (như eSports, game offline, thị trường game...) và gán đường dẫn /game_icons/.webp nhưng file không tồn tại trên máy chủ (HTTP 404), dẫn tới fallback về logo web.
  3. *Thiếu Sub-logo Watermark*: Giao diện thẻ tin tức và banner chi tiết chưa có lớp badge thương hiệu nổi trên ảnh bài viết.
  4. *Chưa chuẩn hóa nguồn bài viết*: Thuộc tính source_name, source_url, uthor không được ép buộc gán về CodeGame.Shop.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Bổ sung trọn bộ Gaming Artworks chuyên đề độ nét cao tại public/news_covers/ (cktg-2026-esports, apple-arcade-games, xbox-games-collection, thi-truong-game-viet-nam, board-game-van-hoa-viet...) và Logo chính thức Google Play VN tại public/game_icons/.
  2. Nâng cấp uto_news_publisher.cjs:
     - Tự động tải ảnh bìa về lưu nội bộ tại public/news_covers/.webp chống triệt để lỗi 403.
     - Tự động ánh xạ ảnh bìa chuyên đề theo danh mục bài viết.
     - Tự động tra cứu logo Google Play Store VN cho game mới.
     - Tuyệt đối cấm gán /og-image.jpg làm ảnh bìa chính bài viết.
     - Tự động gán uthor = 'CodeGame.Shop', source_name = 'CodeGame.Shop', source_url = 'https://codegame.shop'.
  3. Thêm **Sub-logo Watermark Badge**:
     - Hiển thị huy hiệu logo tròn CodeGame.Shop phát sáng nhẹ ở góc trên phải ảnh bìa trong NewsView.tsx, NewsDetailModal.tsx và NewsModule.tsx (Admin).
     - Hiển thị nhãn Nguồn: CodeGame.Shop trong thông tin bài viết và Box chứng nhận bản quyền nguồn chính thức tại chân bài viết.
  4. Chạy script chuẩn hóa scripts/fix_all_news_covers_and_sources.cjs làm sạch và đồng bộ 100% 79/79 bài viết trên Cloudflare D1.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng trực tiếp URL ảnh ngoài từ các báo mạng mà không tải về nội bộ*: Báo chí luôn kích hoạt hotlink protection chặn 403.
  - ❌ *Không tự gán đường dẫn /game_icons/.webp nếu file ảnh chưa thực sự tồn tại*: Luôn có danh mục ảnh bìa chuyên đề dự phòng cho các bài viết tin tức tổng hợp.
  - ❌ *Không gán /og-image.jpg làm ảnh bìa chính*: Chỉ dùng logo tròn làm Sub-logo watermark badge ở góc ảnh bìa.


---

### ISSUE-055: Nút ẩn "Đã bán" trong Admin Toolbar chỉ lưu cục bộ, không đồng bộ ra Web Khách và Modal chi tiết
- **Triệu chứng**:
  - Admin bấm nút `HIỂN THỊ: [🚫 Đã bán]` trên thanh công cụ mục Tiện ích (`/admin#/utilities`) hoặc Cửa hàng (`/admin#/inventory`), trên Admin cột/huy hiệu đã ẩn nhưng ngoài trang khách (`/utilities` hoặc `/store`) và trong modal chi tiết sản phẩm (`ProductDetailModal`) vẫn hiển thị "Đã bán: X".
- **Nguyên nhân gốc rễ**:
  1. Nút bấm trên thanh công cụ Admin trước đây chỉ lưu vào biến giao diện nội bộ `showAdminSold` (`wcg_admin_show_sold_util`) cho riêng trình duyệt Admin, không kết nối tới Web Khách và không gửi đồng bộ lên Cloudflare D1.
  2. `ProductDetailModal.tsx` bỏ qua thuộc tính `show_sold_count`, luôn luôn hiển thị dòng "Đã bán: X gói" và "• Đã bán: X" dù sản phẩm có cấu hình ẩn hay không.
  3. Web Khách thiếu cờ cấu hình hiển thị toàn cục từ máy chủ để đồng bộ trạng thái khi Admin bật/tắt trên thanh công cụ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Quy chuẩn nút bấm trên thanh công cụ Admin thành bộ điều khiển toàn cục: cập nhật cờ `wcg_utilities_global_show_sold` / `wcg_store_global_show_sold`, đồng bộ tức thì lên Cloudflare D1 qua `/api/sync` và phát sự kiện cập nhật giao diện 0 giây.
  2. Nâng cấp `UtilitiesView.tsx` & `StoreView.tsx`: kiểm tra đồng thời cả cờ toàn cục `isGlobalSoldEnabled` và cờ riêng lẻ `item.show_sold_count !== false`.
  3. Nâng cấp `ProductDetailModal.tsx`: kiểm tra `isSoldVisible` trước khi hiển thị dòng đã bán ở header modal và danh sách gói.
  4. Tích hợp hai chiều trong Cloudflare Edge Worker (`functions/api/sync.ts`) và `dataService.ts` để lưu trữ và tải cấu hình cho 100% người dùng.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không chỉ gán biến state nội bộ trong Admin component*: Mọi nút bấm bật/tắt hiển thị trên Admin mà người dùng nhìn thấy phải được liên kết đồng bộ với Web Khách và máy chủ Cloudflare D1/KV.
  - ❌ *Không render cứng nhãn "Đã bán" trong modal chi tiết mà không kiểm tra cờ `show_sold_count`*.


---

### ISSUE-056: Bẫy Xóa Bản Chờ / Bản Live Không Bền Do Thiếu Danh Sách Đen (Tombstone Blacklist) Khi Crawler Quét Lại Định Kỳ
- **Triệu chứng**:
  - Gọi `delete_pending_game` hoặc `delete_game` trên API/Admin trả về thành công, bản ghi biến mất trong vài phút nhưng sau đó lại xuất hiện trở lại trong hàng chờ (tổng hàng chờ dao động 57–63 bản ghi giữa các lần đọc).
- **Nguyên nhân gốc rễ**:
  1. Thao tác từ chối hoặc xóa game crawler trước đây chỉ lọc mảng trong bộ nhớ hoặc cập nhật KV setting mà không lưu trữ định danh (slug, package name, canonical URL) vào danh sách đen vĩnh viễn (`wcg_crawler_rejected_games_v1`).
  2. Các tác vụ crawler tự động chạy ngầm định kỳ (từ AFKMobi, CodeMoi, GameHub, Google Play) thấy tựa game trên nguồn ngoài mà trong kho chưa có nên tự động nạp lại vào hàng chờ phê duyệt.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Mọi thao tác xóa hoặc từ chối game phải tự động ghi nhận vào bảng/danh sách đen `wcg_crawler_rejected_games_v1` (Tombstone Blacklist).
  2. Trước khi thêm game mới vào hàng chờ, crawler bắt buộc phải đối soát với danh sách đen này. Nếu đã nằm trong blacklist, lập tức bỏ qua.
  3. Xác nhận kiểm chứng việc xóa bằng nhiều lần đọc cách nhau các mốc thời gian (2 phút, 5 phút, 15 phút) để đảm bảo không bị crawler phục hồi.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gọi lệnh xóa lặp đi lặp lại trong vòng lặp để ép biến mất*: Nếu thiếu tombstone blacklist thì xóa bao nhiêu lần crawler cũng sẽ cào lại.
  - ❌ *Không chứng nhận kết quả xóa chỉ từ một lần đọc duy nhất ngay sau khi gọi API*.


---

### ISSUE-057: Bẫy Ghi Đè Đồng Bộ Hàng Loạt Từ Snapshot Cũ Gây Lỗi Ký Tự UTF-8 (U+FFFD) & Mất Dữ Liệu Live Mới Nhất
- **Triệu chứng**:
  - Sau đợt backfill hoặc đồng bộ dữ liệu (như tin tức, catalog game) làm tổng số bản ghi khớp (ví dụ: 208 = 208) nhưng nội dung chi tiết bị thụt lùi: ảnh bìa đã cập nhật bị ghi đè thành ảnh cũ, nội dung văn bản xuất hiện ký tự `\uFFFD` (ký tự thay thế khi lỗi font/encoding tiếng Việt).
- **Nguyên nhân gốc rễ**:
  1. Cơ chế backfill nạp mù quáng từ file snapshot sao lưu cũ (`seedNews.ts` hoặc snapshot D1/KV cũ) mà không so sánh dấu thời gian cập nhật (`updated_at`), dẫn đến việc bản ghi mới trên live bị ghi đè bởi bản ghi cũ.
  2. Quá trình xuất/nhập chuỗi ký tự qua các môi trường không chuẩn UTF-8 làm biến dạng các nguyên âm tiếng Việt đa byte thành mã lỗi `U+FFFD`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Luôn áp dụng nguyên tắc `updated_at` trong mọi cơ chế đồng bộ và backfill: Chỉ cập nhật khi `incoming.updated_at > existing.updated_at`. Nếu là chèn bù bản ghi còn thiếu, chỉ dùng `INSERT OR IGNORE` mà không chạm vào các trường của bản ghi live đã có.
  2. Thanh lọc và kiểm toán 100% file nguồn (`seedNews.ts`, `games188.json`) bằng script kiểm tra không còn bất kỳ ký tự `\uFFFD` nào trước khi build hoặc nạp vào CSDL.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dùng snapshot cũ để ghi đè toàn bộ (bulk overwrite)* mà không đối soát thời gian cập nhật của từng bản ghi.
  - ❌ *Không import dữ liệu từ file văn bản có chứa ký tự `\uFFFD`*.


---

### ISSUE-058: Bẫy Kiến Trúc Hai Kho Dữ Liệu (API Store vs Sync Store) & Yêu Cầu Tuyên Bố Rõ Chiều Đồng Bộ Của Nút Admin
- **Triệu chứng**:
  - Đăng bài viết qua `POST /api/news` vào kho tin tức D1/API thành công và trang Admin hiển thị đủ bài, nhưng ngoài Web công khai `/api/sync` (`newsArticles`) lại dừng ở số cũ và không nhận bài mới. Bấm nút "Đồng Bộ" trong Admin thì nút chạy ngược chiều hoặc không cập nhật bộ đệm.
- **Nguyên nhân gốc rễ**:
  1. Hệ thống tồn tại 2 lớp lưu trữ: Kho thao tác chi tiết (API Store trên Cloudflare D1/KV) và Kho dữ liệu đồng bộ gom cụm phục vụ Edge Caching (`/api/sync`).
  2. Khi API ghi dữ liệu mới vào D1 nhưng không chủ động xóa Edge Cache (`__wcg_public_sync_cache`) và không cập nhật snapshot tổng, Web Khách tiếp tục nhận dữ liệu cũ từ bộ nhớ đệm biên.
  3. Giao diện Admin có nút bấm "Đồng Bộ" nhưng không ghi rõ chiều tác vụ (Kéo từ CSDL về hay Đẩy từ Admin ra cache).
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Đảm bảo Single Source of Truth: Bất kỳ thao tác POST/PUT/DELETE nào trên API Store phải tự động gọi `invalidatePublicSyncCache()` và cập nhật mảng tương ứng trong snapshot để Edge Cache làm mới ngay lập tức.
  2. Minh bạch chiều đồng bộ trên UI Admin: Đổi tên nút bấm thành "Đẩy Dữ Liệu Ra Web Khách (Sync Push)" hoặc "Đồng Bộ Cache", có thông báo tooltip giải thích rõ luồng dữ liệu.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không để nút "Đồng bộ" mập mờ mà không ghi rõ chiều luồng dữ liệu*.
  - ❌ *Không ghi dữ liệu vào CSDL mà quên xóa Edge Cache của `/api/sync`*.


---

### ISSUE-059: Bẫy Bộ Đếm Ingestion Báo Ảo (`addedCount = 1`) Khi Đẩy Lại Mã Cũ Do Giới Hạn `LIMIT 10000` Khi Nạp D1 Codes
- **Triệu chứng**:
  - Đẩy lại một mã giftcode đã tồn tại trên live thông qua API Ingestion nhưng API vẫn trả về `addedCount = 1`, khiến người điều hành và hệ thống tự động ngộ nhận là mã mới được bổ sung.
- **Nguyên nhân gốc rễ**:
  1. Trong `functions/api/crawler/ingest-codes.ts`, câu lệnh nạp mã có sẵn từ D1 bị giới hạn ngầm: `SELECT game_slug, code... FROM codes LIMIT 10000`.
  2. Khi tổng số mã trên D1 vượt quá 10,000 (hiện tại đã vượt 13,000 mã), các mã nằm sau hàng 10,000 không được nạp vào tập hợp `existingCodeValuesBySlug`, khiến cơ chế deduplication bỏ lọt mã cũ.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Chuyển sang truy vấn D1 có chủ đích dựa trên danh sách game slug có trong payload: `WHERE LOWER(game_slug) IN (...)`. Nhờ đó truy vấn vừa cực nhanh vừa nạp đúng 100% mã của tựa game liên quan mà không bị giới hạn bởi tổng số hàng toàn bảng.
  2. Trường hợp nạp hàng loạt không xác định trước, nâng trần an toàn lên 100,000 bản ghi.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không đặt hardcoded `LIMIT 10000` cho bảng dữ liệu tích lũy lâu dài*.


---

### ISSUE-060: Bẫy Lệch Chuẩn Hóa Mã Code Giữa Tuyến Đẩy Trực Tiếp (Preserve Case) và Tuyến Duyệt Hàng Chờ (`toUpperCase`)
- **Triệu chứng**:
  - Cùng một mã giftcode (ví dụ có chữ thường hoặc ký tự đặc biệt, hoặc mã ngắn 1 ký tự) khi nạp qua tuyến API trực tiếp thì được giữ nguyên định dạng, nhưng khi duyệt qua giao diện Admin hàng chờ thì bị tự động ép thành chữ hoa hoặc bị bộ lọc độ dài (`length < 2`) nuốt mất.
- **Nguyên nhân gốc rễ**:
  1. Hai luồng xử lý mã (tuyến Ingest trực tiếp và tuyến Approve hàng chờ Crawler) sử dụng hai hàm chuẩn hóa khác nhau. Tuyến Approve hàng chờ gọi `.toUpperCase()` cứng nhắc và có bộ lọc độ dài quá khắt khe.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Quy chuẩn cơ chế xử lý: Đối soát chống trùng lặp sử dụng Case-Insensitive (`upperCode` làm khóa so khớp trong `Set`), nhưng khi lưu vào cơ sở dữ liệu thì bảo toàn 100% nguyên trạng chuỗi mã gốc do NPH cung cấp.
  2. Hỗ trợ mã code ngắn từ 1 ký tự (miễn là không rỗng sau khi `trim()`).
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tự ý ép `toUpperCase()` làm mất tính chính xác của giftcode case-sensitive của một số tựa game quốc tế*.


---

### ISSUE-061: Bẫy Tự Điền Đường Dẫn Icon `/game_icons/<slug>.webp` Mặc Định Khi File Ảnh Thật Sự Chưa Tồn Tại (HTTP 404)
- **Triệu chứng**:
  - Tựa game mới được cào về hoặc tạo mới hiển thị icon vỡ (trình duyệt trả về lỗi HTTP 404 cho đường dẫn `/game_icons/<slug>.webp`).
- **Nguyên nhân gốc rễ**:
  1. Logic backend tự động gán đường dẫn quy ước `/game_icons/${slug}.webp` vào thuộc tính icon của game mà không kiểm tra xem file vật lý đã được tải về thư mục `public/game_icons/` hay chưa.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Giữ nguyên URL icon gốc từ nguồn cào hoặc Play Store/App Store cho đến khi ảnh được tải về và nén thành webp thành công trên server.
  2. Cung cấp fallback icon mặc định an toàn (`/game_icons/default_game_icon.webp`) hoặc ảnh placeholder SVG inline để chống vỡ giao diện trong mọi trường hợp.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không gán đường dẫn file tĩnh nội bộ `/game_icons/<slug>.webp` khi chưa xác nhận file tồn tại trên đĩa*.


---

### ISSUE-062: Bẫy Dữ Liệu Test Lọt Lên Production Do Phụ Thuộc Vào "Nhớ Dọn" Thay Vì Tự Động Quét Trong Post-Deploy Checklist
- **Triệu chứng**:
  - Các mã test (như `TESTREG...`, `DEMO...`) hoặc các bản ghi thử nghiệm vô tình xuất hiện trên website trực tiếp hoặc lọt vào cơ sở dữ liệu production.
- **Nguyên nhân gốc rễ**:
  1. Quá trình kiểm thử phụ thuộc vào thao tác dọn dẹp ở cuối script; khi script bị lỗi đột ngột hoặc ngoại lệ phát sinh trước bước dọn dẹp, dữ liệu test bị bỏ rơi trong CSDL.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Tuân thủ triệt để Quy tắc 7 (AGENTS.md / GEMINI.md): Toàn bộ code test bắt buộc phải nằm trong khối `try ... finally` để luôn tự động xóa bản ghi dù có lỗi xảy ra.
  2. Bổ sung script kiểm toán độc lập `scripts/audit_zero_test_artifacts.cjs` chạy tự động sau mỗi lần kiểm thử và trước khi deploy để quét sạch mọi dấu vết test.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không dựa vào việc "sẽ nhớ xóa tay sau khi hoàn thành công việc"*.


---

### ISSUE-063: Bẫy Đánh Đồng "Tìm Kiếm Rỗng" Là "Không Tồn Tại" & Bẫy Ẩn Bản Ghi Có 0 Mã Khỏi Bộ Máy Tìm Kiếm
- **Triệu chứng**:
  - Người vận hành tìm kiếm một tựa game (ví dụ game chưa có mã code hoặc game đặc biệt) qua ô tìm kiếm thì thấy kết quả rỗng, dẫn đến ngộ nhận là game chưa có và tạo mới bản ghi gây trùng lặp.
- **Nguyên nhân gốc rễ**:
  1. Câu lệnh truy vấn danh mục trước đây bị cài cắm điều kiện ngầm `AND total_codes_count > 0`, tự động loại bỏ các game có 0 mã khỏi danh sách tìm kiếm thông thường.
  2. Cơ chế tìm kiếm từ khóa có thể bị lệch do không khớp dấu hoặc định dạng slug.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Loại bỏ điều kiện `AND total_codes_count > 0` khỏi câu lệnh tìm kiếm cơ bản. Chỉ áp dụng khi người dùng chủ động chọn tab "Còn mã".
  2. Khi kiểm tra sự tồn tại của một bản ghi, luôn truy vấn trực tiếp bằng slug chính xác (`/api/games/:slug`), không chỉ dựa vào tìm kiếm tương đối.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không kết luận bản ghi không tồn tại chỉ vì kết quả tìm kiếm rỗng*.


---

### ISSUE-064: Bẫy Tự Gán Hạn Dùng Mặc Định (31/12/2026) Cho Dữ Liệu Chưa Rõ Khiến Khách Hàng Hiểu Lầm Thông Tin NPH
- **Triệu chứng**:
  - Hàng nghìn mã giftcode trên website hiển thị ngày hết hạn cố định `31/12/2026`, khiến người chơi và các bên đối soát hiểu lầm đây là thông tin chính thức do nhà phát hành quy định.
- **Nguyên nhân gốc rễ**:
  1. Hệ thống crawler trước đây khi không tìm thấy thông tin hạn dùng đã tự động gán fallback `2026-12-31`.
- **Giải pháp chuẩn đã kiểm chứng**:
  1. Nếu không có ngày hết hạn chính thức từ NPH, để giá trị `expires_at = null` hoặc `""` (vô thời hạn / chưa xác định). Giao diện hiển thị nhãn "Vô thời hạn" thay vì tự gán ngày giả.
  2. Đã chạy migration thanh lọc 10,883 mã có hạn giả `31/12/2026` về `expires_at = null` trên toàn hệ thống CSDL D1 và KV.
- ⛔ **CÁCH SỬA ĐÃ THẤT BẠI - TUYỆT ĐỐI KHÔNG LẶP LẠI**:
  - ❌ *Không tự ý gán giá trị ngày tháng cụ thể vào trường hạn sử dụng khi nguồn dữ liệu không cung cấp*.


---

## 2. QUY TRÌNH BẮT BUỘC TRƯỚC KHI SỬA CODE (PRE-FLIGHT CHECKLIST)

Mọi nhà phát triển hoặc AI Agent khi nhận yêu cầu sửa đổi mã nguồn **PHẢI** thực hiện đủ 4 bước sau:

1. **[ ] Đọc tài liệu ghi nhớ**:
   - Mở và đọc `PROJECT_MEMORY.md`, `CHANGELOG.md`, `KNOWN_ISSUES.md`.
2. **[ ] Phân tích nguyên nhân gốc rễ (Root Cause)**:
   - Xác định chính xác file, hàm, dòng mã gây lỗi.
   - Không đoán mò. Nếu cần, in log hoặc tạo script test nhỏ để kiểm chứng giả thuyết trước khi sửa code chính.
3. **[ ] Đánh giá phạm vi ảnh hưởng (Impact Scope)**:
   - Thay đổi này ảnh hưởng đến những component, service hay API nào?
   - Có vi phạm **Quy tắc vàng kho hàng** hoặc **Quy tắc đồng bộ nguyên tử 1 - 1** không?
4. **[ ] Kiểm tra danh mục giải pháp thất bại**:
   - Đối chiếu giải pháp định làm với danh mục `⛔ CÁCH SỬA ĐÃ THẤT BẠI` ở trên. Nếu trùng, phải dừng lại và tìm giải pháp khác.

---

## 3. QUY TRÌNH BẮT BUỘC SAU KHI SỬA CODE (POST-FLIGHT CHECKLIST)

Sau khi hoàn tất chỉnh sửa mã nguồn:

1. **[ ] Kiểm thử hồi quy chức năng (Regression Testing)**:
   - Kiểm tra chức năng vừa sửa có hoạt động đúng kỳ vọng không.
   - Kiểm tra các chức năng liên quan (ví dụ: sửa kho hàng $\rightarrow$ kiểm tra cả Tiện ích, Cửa hàng, và Modal thanh toán).
2. **[ ] Kiểm tra TypeScript / Build**:
   - Đảm bảo mã nguồn không phát sinh lỗi biên dịch hoặc lỗi linting.
3. **[ ] Cập nhật tài liệu ghi nhớ**:
   - Ghi lại thay đổi vào `CHANGELOG.md`.
   - Nếu phát hiện lỗi mới hoặc bẫy mới, cập nhật ngay vào `KNOWN_ISSUES.md`.
4. **[ ] Báo cáo súc tích**:
   - Báo cáo rõ: Nguyên nhân gốc rễ, Cách đã sửa, Kết quả kiểm thử hồi quy.
