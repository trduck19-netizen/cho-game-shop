# PROJECT_MEMORY.md — Hệ Thống Kiến Trúc & Tri Thức Dự Án Web Code Game

> **QUY TẮC BẮT BUỘC DÀNH CHO AI AGENT & DEVELOPER**:
> Trước khi thực hiện bất kỳ chỉnh sửa nào trong codebase, **BẮT BUỘC** phải đọc file này cùng với `CHANGELOG.md` và `KNOWN_ISSUES.md`.
> Phân tích nguyên nhân gốc rễ (Root Cause), phạm vi ảnh hưởng (Impact Scope), tuyệt đối không lặp lại giải pháp đã ghi nhận thất bại trong `KNOWN_ISSUES.md`.

---

## 1. TỔNG QUAN DỰ ÁN & VẬN HÀNH

- **Tên dự án**: Web Code Game & Tiện Ích Game Số 1 Việt Nam
- **Hệ Thống Tên Miền Chuẩn Mực Duy Nhất (SSOT Domains - Bắt Buộc Tuân Thủ Tuyệt Đối)**:
  - **Trang Quản Trị (Admin Portal - Duy Nhất)**:
    - `https://admin-code-game-shop.pages.dev` (Cloudflare Pages Project: `admin-code-game-shop`)
  - **Trang Khách Hàng (Client Portals - Đúng 2 Web)**:
    1. `https://web-code-game.pages.dev` (Cloudflare Pages Project: `web-code-game`)
    2. `https://codegame.shop/` (Custom Domain chính thức trỏ về `web-code-game`)
  - ⚠️ **MỆNH LỆNH BẮT BUỘC TỪ CHỦ SỞ HỮU DỰ ÁN**:
    - Dự án này **CHỈ LÀM VIỆC** với 1 tên miền admin duy nhất (`https://admin-code-game-shop.pages.dev`) và đúng 2 web khách (`https://web-code-game.pages.dev` & `https://codegame.shop/`).
  - 🛑 **TUYỆT ĐỐI CẤM ĐỘNG VÀO CODEGAME.STORE (STRICT PROHIBITION)**:
    - Trang web `https://codegame.store` (thuộc thư mục riêng `C:\4 Antigravity all\3 Codegame store`, Cloudflare Pages project `codegamestore`, Database D1 `codegamestore-db` `be54527d-f2b7-4777-8da4-38601ef63fd4`) là dự án hoàn toàn độc lập khác của người dùng.
    - **TỪ GIỜ VỀ SAU TUYỆT ĐỐI KHÔNG ĐƯỢC CHẠM VÀO**: Không sửa đổi file, không build, không deploy, không thay đổi cấu hình Cloudflare/D1, không purge cache và không liên kết sang `codegame.store` dưới bất kỳ hình thức nào!
- **Mục tiêu cốt lõi**:
  1. Cung cấp và tự động cập nhật Giftcode của hơn 623+ tựa game có giấy phép ABEI (G1/G234) và Studio game Việt Nam tại thị trường trong nước & quốc tế.
  2. Nền tảng thương mại điện tử chuyên biệt: Mua bán Tiện ích game (VIP, buff, tool, dịch vụ), Cửa hàng tài khoản, Thẻ game, Giveaway mã quà tặng miễn phí.
  3. Hệ thống Marketing & FOMO thông minh với cơ chế đồng bộ nguyên tử 1 - 1 giữa thông báo và số liệu hiển thị thực tế.
  4. Hệ thống Tự động hóa 24/7: GitHub Actions quét giftcode và tự động xuất bản bài viết tin tức chuẩn SEO kèm ảnh và code game.

---

## 2. KIẾN TRÚC CÔNG NGHỆ (TECH STACK)

### 2.1. Frontend
- **Framework & Runtime**: React 18.3.1, TypeScript 5.6.3, Vite 5.4.10.
- **Styling**: Tailwind CSS 3.4.14, PostCSS, Autoprefixer.
- **Iconography**: Lucide React (`lucide-react`) — Sử dụng 100% SVG Vector tinh xảo, không dùng emoji trôi nổi.
- **Hiệu ứng & UI**: Canvas Confetti, CSS Micro-interactions, Modal Portals (`createPortal`), Sticky Viewports.
- **Bộ máy tìm kiếm cục bộ**: Fuse.js + thuật toán chuẩn hóa dấu tiếng Việt (`textUtils.ts`).

### 2.2. Backend & Serverless Edge (Cloudflare Ecosystem)
- **Cloudflare Pages Functions**: Serverless APIs đặt tại thư mục `functions/api/`:
  - `functions/api/sync.ts`: Endpoint đồng bộ 2 chiều dữ liệu Admin $\leftrightarrow$ KV $\leftrightarrow$ Khách.
  - `functions/api/metrics/synced.ts`: Lưu trữ snapshot các chỉ số đỉnh (High-water marks: số đã bán, số quà đã nhận, lượt copy).
  - `functions/api/orders/create.ts`: Khởi tạo và thực thi giao dịch thanh toán đơn hàng bằng số dư ví.
  - `functions/api/webhooks/sepay.ts`: Webhook nhận biến động số dư ngân hàng tự động qua SePay.
  - `functions/api/auth/*`: Đăng ký, đăng nhập JWT, đổi mật khẩu, xác thực phiên người dùng.
  - `functions/api/giveaways/claim.ts`: Thực thi nhận mã quà tặng giveaway an toàn.
- **Cloudflare KV**:
  - `GAME_DATA_KV`: Lưu trữ games, giftcodes, tin tức (articles), nguồn cào (crawler sources), banner, cấu hình marketing.
  - `INVENTORY_KV`: Lưu trữ danh mục sản phẩm tiện ích, store products, và kho mã số.
- **Cloudflare D1 SQL Database**:
  - Quản lý giao dịch mua hàng (`orders`), kho mã chi tiết (`inventory_items`), tài khoản người dùng (`users`), giao dịch nạp tiền (`transactions`).

### 2.3. Tự Động Hóa 24/7 (Automation & Crawlers)
- **GitHub Actions Workflows**:
  - `.github/workflows/auto-crawler-sync.yml`: Quét giftcode tự động mỗi giờ vào phút 15 (`15 * * * *`).
  - `.github/workflows/auto-news-publisher.yml`: Tự động viết và xuất bản bài viết SEO tin tức game mỗi giờ vào phút 45 (`45 * * * *`).
- **Engine Scripts**:
  - `scripts/crawler/run_crawler.cjs`: Bộ máy cào mã quà tặng đa nguồn kèm thuật toán chấm điểm 4 tầng (4-tier scoring).
  - `scripts/crawler/engine/game_logo_resolver.cjs`: Bộ máy tự động tra cứu, tải và chuẩn hóa Logo Google Play chính thức (WebP/JPG) cho toàn bộ game quét mới.
  - `scripts/sync_crawler_game_icons.cjs`: Đồng bộ và chuyển đổi tự động logo cho game trong hàng chờ duyệt lên Cloudflare D1/KV.
  - `scripts/crawler/auto_news_publisher.cjs`: Tự động tìm kiếm nguồn tin game mới, tạo bài viết kèm giftcode game và sync lên Cloudflare.
  - `scripts/sync_games_licenses_icons.cjs`: Đồng bộ danh mục 486 game G1/G234, chuẩn hóa icon và thông tin pháp lý ABEI.

### 2.4. Quản Lý Phiên Bản & Quy Trình Git Chuyên Nghiệp
- **Hệ thống Git**: Repository chính nhánh `main`, liên kết GitHub `origin` (`https://github.com/synqpe-jpg/web-code-game.git`).
- **Quy chuẩn vận hành**: Tuân thủ tuyệt đối [**`GIT_WORKFLOW.md`**](file:///c:/4%20Antigravity%20all/13%20web%20code%20game/GIT_WORKFLOW.md) với 6 quy tắc (Pre-modification, In-flight, Post-modification, Rollback an toàn, Báo cáo 6 thành phần, và Zero destructive commands).
- **Quy tắc khôi phục**: Ưu tiên `git revert`, không bao giờ dùng `git reset --hard` hay `git clean -fd` khi chưa được người dùng cho phép.

---

## 3. CÁC QUY TẮC KINH DOANH & NGUYÊN TẮC BẤT DI BẤT DỊCH (CORE BUSINESS RULES)

### 3.1. Quy Tắc Kho Hàng & Tồn Kho Thật (Strict Real Inventory Rule)
- **Quy tắc vàng**: **HÀNG THẬT TRONG KHO = 0 $\rightarrow$ HIỂN THỊ TỒN KHO = 0 ("HẾT HÀNG")**.
- Khi một sản phẩm tiện ích, store product, hoặc giveaway có số lượng thực tế trong kho bằng 0:
  1. Hàm `getDisplayStock()` trả về đúng `0`.
  2. Tuyệt đối **KHÔNG** cộng tồn kho ảo (`virtualStockBonus`).
  3. Tuyệt đối **KHÔNG** kích hoạt cơ chế tự động bù kho (`autoRestock`).
  4. Hệ thống marketing tự động **NGẮT HOÀN TOÀN** việc sinh thông báo ảo (`BUY_PRODUCT`) cho sản phẩm đó.
  5. Nút mua ngoài web khách chuyển sang trạng thái Disabled ("Tạm hết hàng").

### 3.2. Quy Tắc Đồng Bộ Nguyên Tử 1 - 1 Của Thông Báo Marketing
- Mọi thông báo xuất hiện trên màn hình (thật hoặc ảo) **PHẢI TÁC ĐỘNG NGAY LẬP TỨC** lên số liệu hiển thị của Web Khách:
  - Thông báo mua (`BUY_PRODUCT`): Tồn kho hiển thị (`Còn:`) **-1**, Số lượng đã bán (`Đã bán:`) **+1**.
  - Thông báo nhận quà (`CLAIM_GIVEAWAY`): Mã còn lại **-1**, Mã đã săn **+1**.
  - Thông báo copy (`COPY_CODE`): Bộ đếm tổng lượt sao chép toàn web **+1** (Mốc khởi điểm 93.545, đơn điệu không giảm; trường hợp khách tự bấm thì cặp "bấm + thông báo tự sinh" tính là 1; thông báo ảo/người khác nổ tính +1).
  - Thông báo bổ sung kho (`RESTOCK_PRODUCT`): Tồn kho hiển thị (`Còn:`) **+{restockAmount}**.
- Cơ chế `BroadcastChannel` và Custom Event (`wcg_virtual_stock_updated`, `wcg_sold_count_updated`) phát tín hiệu để toàn bộ các thẻ sản phẩm cập nhật tức thì trong 0 giây mà không cần F5.
- Bộ nhớ `processedStockNotifIds` lưu ID thông báo để đảm bảo **chống trừ đúp** khi mở nhiều tab.

### 3.3. Quy Tắc Tự Động Bù Kho (Auto-Restock)
- Khi sản phẩm còn hàng thật (`baseStock > 0`) và có cấu hình tồn kho ảo:
- Nếu tồn kho ảo tụt dần về $\le$ Ngưỡng bù kho (`effectiveThreshold`, mặc định $\le 1$ hoặc $\le baseStock$), hệ thống tự động bù thêm `restockAmount` (mặc định +20) ngay lập tức.
- Giúp sàn luôn duy trì trạng thái khan hiếm nhưng không bao giờ bị âm hoặc kẹt số cũ.

### 3.4. Quy Tắc Chống Hồi Sinh Dữ Liệu (Tombstone Deletion Pattern)
- Khi Admin xóa vĩnh viễn một mục (game, code, sản phẩm, bài viết tin tức):
- Không được chỉ xóa ở LocalStorage frontend vì khi sync với Cloudflare KV / D1 dữ liệu cũ sẽ bị merge ngược lại (resurrection bug).
- Bắt buộc tạo bản ghi Tombstone (`deleted_at`, `deletedIdsSet`) gửi lên `/api/sync` để xóa triệt để trên Cloudflare KV và D1.

### 3.5. Quy Tắc Bảo Mật & Phân Quyền Duy Nhất Chủ Sở Hữu (Owner-Only Guard)
- Chỉ duy nhất tài khoản Telegram của Chủ sở hữu (`ID: 7791142901`) có quyền tương tác, nhận báo cáo và kích hoạt bot tự động.
- Mọi API admin được bảo vệ bằng Secret Token `ADMIN_SYNC_SECRET`.

### 3.6. Quy Tắc Tự Động Xóa Dữ Liệu Test (Zero Test Artifacts On Production)
- Mọi dữ liệu test (sản phẩm tiện ích `ut_test_*`, cửa hàng `sp_test_*`, giveaway `gw_test_*` / mock, mã giftcode test) được sinh ra để kiểm thử hệ thống phải được dọn dẹp sạch sẽ 100% ngay sau khi hoàn thành bài test (khối `finally`).
- **Kiến trúc phòng vệ 4 lớp dứt điểm (4-Layer Defense Architecture)**:
  1. *Lớp 1 (Quy ước định danh)*: Mọi ID test bắt buộc mang tiền tố `test_`, `ut_test_`, `sp_test_`, `gw_test_`, hoặc cờ `is_test: true`.
  2. *Lớp 2 (Edge Worker Auto-Purge)*: `functions/api/sync.ts` kiểm tra và tự động lọc bỏ 100% test ID, đồng thời kích hoạt truy vấn `DELETE FROM` trên Cloudflare D1 để xóa vĩnh viễn dòng dữ liệu test.
  3. *Lớp 3 (Client Immediate Disinfection)*: `dataService.ts` tự động thanh tẩy LocalStorage và danh sách hiển thị với `isTestArtifactId` ngay lập tức 0ms mà không phụ thuộc mạng.
  4. *Lớp 4 (Pre-Build Gatekeeper Hook)*: Script `scripts/audit_zero_test_artifacts.cjs` chạy tự động trước mỗi lệnh `npm run build`. Nếu phát hiện bất kỳ sản phẩm test nào còn tồn dư trong JSON hoặc database, quá trình build sẽ lập tức hủy bỏ (Fail Fast).

### 3.7. Quy Tắc Phiên Đăng Nhập Bền Vững Đa Tầng (Multi-Tier Session Persistence Rule)
- Tài khoản người dùng khi đã đăng ký hoặc đăng nhập thành công **BẮT BUỘC ĐƯỢC BẢO LƯU BỀN VỮNG** trên mọi thiết bị (máy tính, điện thoại, Android App APK, In-App WebView Zalo/Facebook).
- **Kiến trúc 4 tầng lưu trữ đồng thời**:
  1. `localStorage` (`wcg_user` và `wcg_persistent_account`).
  2. `document.cookie` (`wcg_auth_user` và `wcg_auth_token`) có thời hạn 365 ngày (`max-age=31536000; SameSite=Lax; path=/`).
  3. `sessionStorage` để đồng bộ giữa các tab.
  4. Cơ chế tự phục hồi (`Smart Session Self-Healing`): Khi mở lại app/web, nếu một tầng bị xóa (do trình duyệt dọn RAM), hệ thống tự động đọc từ tầng còn lại và auto-heal phục hồi đầy đủ 100% các tầng lưu trữ.
- **Serverless Edge Multi-Device Tolerance**:
  - `/api/auth/me`, `/api/orders/create`, `/api/giveaways/claim` tự động nhận diện thành viên qua `session_token`, HMAC signed token hoặc trích xuất `userId` từ token (`wcg_edge_tok_` và `wcg_tok_`).
  - Phiên chỉ bị thu hồi và bắt đăng nhập lại khi:
    1. Người dùng chủ động nhấn nút "Đăng xuất" (`logout()`).
    2. Tài khoản bị Quản trị viên khóa (`status: 'BANNED'`).
    3. Mật khẩu tài khoản bị thay đổi / đặt lại (`session_token = NULL`). Khi mật khẩu không đổi, người dùng mở app/web luôn ở trạng thái đã đăng nhập.

### 3.8. Quy Tắc Tự Động Cập Nhật Game Mới (Phương Án B — Dual Source: Google Play & CodeMoi.net)
- **Kiến trúc 2 tầng (2-Tier Auto-Publish Architecture)**:
  1. *Tự động đăng 100% (Auto-Publish)*: Các tựa game mới phát hiện từ Nhà Phát Hành uy tín (`VNG`, `Garena`, `SohaGame`, `Funtap`, `Gamota`, `Gosu`, `VTC`, `Dzogame`, `VGP`, `VPlay`, `JoyGames`, `Capcom`, `TiMi`...) hoặc có số lượng tải lớn ($\ge 50.000$ tải, rating $\ge 4.0\star$) được tự động tải icon WebP, tạo slug SEO, tạo crawler source cào giftcode và đăng ngay lên sàn mà không cần bấm duyệt.
  2. *Hàng chờ duyệt tay riêng (Manual Moderation Queue)*: Game từ các nhà phát hành mới hoặc cần xác minh bản quyền được đưa vào `crawlerPendingGames` (`wcg_crawler_pending_games_v1`) trên Cloudflare D1/KV để Admin duyệt 1-chạm hoặc từ chối.
- **Bộ lọc chống trùng lặp đa tầng (`getBaseSlug`)**: Bóc tách các hậu tố NPH (`-vplay`, `-vtc`, `-gosu`, `-gamota`, `-soha`, `-funtap`, `-vng`, `-garena`, `-vn`, `-mobile`, v.v.) đối soát trực tiếp với 623+ game hiện tại và danh sách chờ duyệt, bảo toàn tuyệt đối không sinh trùng lặp game.
- **Chạy tự động 24/7**: Định kỳ hằng ngày qua GitHub Actions `.github/workflows/auto-google-play-sync.yml` và kích hoạt tức thì từ Cloudflare Edge API (`/api/sync` action `scan_codemoi_new_games`).

### 3.9. Quy Tắc Phát Code Giãn Cách Toàn Sàn & Phòng Chờ Trực Tuyến (Global Release Interval & Waiting Room)
- **Cơ chế Khóa Hồi Chiêu Toàn Sàn (Global Release Interval)**:
  - Khi một người chơi giật mã thành công, hệ thống nguyên tử ghi nhận `last_global_claim_at = nowIso` vào CSDL Cloudflare D1.
  - Toàn bộ website (tất cả người chơi khác) rơi vào trạng thái chờ đợt mã kế tiếp trong khoảng thời gian `global_cooldown_seconds` (ví dụ: 30s, 1p, 2p, 3p, 5p...).
  - Mọi request gửi tới `/api/giveaways/claim` trong thời gian này đều bị chặn ở cấp Server Edge với mã `GLOBAL_COOLDOWN_ACTIVE` và trả về `remainingSeconds`, `nextReleaseAt`, kèm thông báo tùy biến `custom_cooldown_msg` tự động thay thế placeholder `{time_left}`.
- **Tùy biến Thông Báo Đa Kịch Bản (Custom Notification Messages)**:
  - `custom_success_msg`: Thông báo chúc mừng khi giật thành công (hỗ trợ `{code}`, `{game_name}`, `{rewards}`).
  - `custom_cooldown_msg`: Thông báo khi toàn web đang chờ hồi chiêu (hỗ trợ `{time_left}`).
  - `custom_out_of_stock_msg`: Thông báo khi toàn bộ mã trong sự kiện đã được phát hết.
- **Phòng Chờ Trực Tuyến (Live Waiting Room)**:
  - Hiển thị badge số người chơi thực tế và đang cùng canh mã tiếp theo ngoài web khách (`LiveWaitingRoomBadge`) dựa trên cấu hình `waiting_users_min` và `waiting_users_max` kèm dao động Jitter tự nhiên.
  - Admin có nút mở ngay "⏳ Đang chờ (Mở ngay)" trong quản trị để xả hàng tức thì khi cần.

---

### 3.10. Quản Lý Game Chuẩn Bị Ra Mắt (Upcoming Games): Sinh Random, Khoảng Dao Động & Động Cơ Tăng Trưởng Realtime
- **Thứ Tự Hiển Thị (Display Order)**:
  - Cho phép Admin cài đặt giá trị hiển thị cụ thể (1..6 là Top Banner Web Khách; 7+ xem trong Modal).
  - Cài đặt khoảng dao động tùy biến [orderMinRange, orderMaxRange] và nút "🎲 Sinh Random" để tạo số ngẫu nhiên tức thì.
  - Hỗ trợ "Tự Động Tăng Trưởng Thứ Tự Theo Ngày": Toggle orderGrowthEnabled và tốc độ orderGrowthRate (+X/ngày), tự động tính toán thứ tự hiệu dụng realtime qua calculateEffectiveOrder(game, now) trên cả Web Khách và Admin.
  - Tự động sinh nextOrder tự nhiên (bỏ qua các giá trị placeholder >= 900) để tránh tình trạng mặc định nhảy lên 1000.
- **Số Người Canh / Quan Tâm (Subscribers Count)**:
  - Hiển thị trên thẻ Web Khách (AllUpcomingGamesModal và UpcomingGamesBanner): 1.200 người canh, 1.950 người canh...
  - Cho phép Admin nhập giá trị trực tiếp hoặc cài đặt khoảng dao động [subscribersMinRange, subscribersMaxRange], bấm "🎲 Sinh Random" (làm tròn đẹp đến hàng chục).
  - Hỗ trợ "Tự Động Tăng Người Canh Theo Giờ": Toggle subscribersGrowthEnabled và tốc độ subscribersGrowthRatePerHour (+X người/giờ), tính toán realtime qua calculateEffectiveSubscribers(game, now).
- **Công cụ Sinh Random Hàng Loạt (Bulk Randomize)**:
  - Nút "🎲 Sinh Random Hàng Loạt" trên thanh điều khiển Live của Admin giúp cập nhật nhanh toàn bộ game theo đúng khoảng cài đặt riêng của từng game.
- **Đồng bộ API Crawler/Ingest**:
  - Endpoint Cloudflare Pages /api/crawler/ingest-upcoming-games lưu giữ trọn vẹn toàn bộ các trường cấu hình dao động và tăng trưởng vào D1.

### 3.11. Cơ Chế Chống Rò Rỉ Dữ Liệu Test (Zero Test Artifacts) & Quản Lý Xóa D1 Từ Xa
- **Nguyên tắc cốt lõi (Rule 7)**:
  - Mọi game test, giftcode test phát sinh từ các script kiểm thử hoặc audit bắt buộc phải được dọn sạch 100% trong khối `finally`.
  - Nghiêm cấm auto-publish các thực thể mang tiền tố test (`slug.startsWith('test-')`, `name.startsWith('Test ')`, `developer.startsWith('Test Studio')`).
- **Endpoint Quản Trị Xóa SQL Từ Xa (Remote D1 Deletion)**:
  - `/api/crawler/ingest-codes` và `/api/sync` hỗ trợ các action:
    + `delete_game` / `delete_game_d1`: Thực thi SQL xóa nguyên tử khỏi D1 `games`, D1 `codes`, xóa KV và purge cache Edge Worker.
    + `cleanup_test_codes` / `cleanup_test_artifacts`: Quét và xóa sạch toàn bộ thực thể mang dấu hiệu test trong D1.
- **Cơ Chế Bảo Vệ Nhiều Tầng (Multi-tier Gatekeeper)**:
  1. *Backend Guard*: API `publish_game` và luồng `autoPublished` từ chối xử lý nếu phát hiện đối tượng test.
  2. *Pre-build Audit (`audit_zero_test_artifacts.cjs`)*: Quét 5 kho dữ liệu (`giveaways.json`, `storeProducts.json`, `utilities.json`, `crawled_codes_188.json`, `games188.json`), hủy build nếu phát hiện test artifact.
  3. *Audit Harness Gatekeeper (`verify_codes_integrity_audit.cjs`)*: Bước 7 quét trực tiếp Live Catalog, tự động tiêu diệt bất kỳ test game nào lọt lên production.

### 3.12. Quy Tắc Ingest Giftcode & Bảo Tồn Case Sensitivity (Bảo Toàn Ký Tự & Đối Chiếu Dedup D1/KV)
- **Bảo tồn Exact Case (Case Sensitivity)**:
  - Tuyệt đối **KHÔNG** tự ý chuyển đổi `.toUpperCase()` mã quà tặng khi nhận từ API ingest hoặc cào dữ liệu. Nhiều tựa game lớn (HoYoverse, Zenless Zone Zero `Sunbringer`, Genshin Impact `HourOfRuin`, Honkai) phân biệt nghiêm ngặt chữ hoa và chữ thường.
- **Hỗ trợ Ký Tự Đặc Biệt & Khoảng Trắng**:
  - Mã quà tặng hợp lệ được phép chứa khoảng trắng (`ACCESS GRANTED`), dấu chấm than `!`, dấu hỏi `?`, dấu chấm `.`, dấu gạch ngang `-`, gạch dưới `_`, dấu thăng `#`, độ dài từ 1 đến 80 ký tự.
  - Phân tách chuỗi danh sách mã bằng regex `[\r\n,;]+`, tuyệt đối không dùng `\s+` để không chém vỡ mã có dấu cách.
- **Dedup Đa Tầng (D1 SQL + KV) Triệt Tiêu Trùng Ảo**:
  - Mọi thao tác đối soát trùng lặp mã bắt buộc nạp và kiểm tra đồng thời cả bảng `codes` trên Cloudflare D1 và KV `wcg_admin_custom_free_codes_v1`.
  - Phản hồi API khi phát hiện trùng phải trả về `duplicateDetails: [{ code, gameSlug, status, existingLocation, reason }]` minh bạch.
- **Tự Động Cập Nhật Metadata Khi Đẩy Trùng**:
  - Khi mã đã tồn tại nhưng đối tác/crawler gửi thông tin hạn dùng mới, phần thưởng mới hoặc trạng thái mới, hệ thống tự động cập nhật bản ghi trong CSDL và KV, trả về `updatedMetadataCodes`.

### 3.13. Quy Tắc Đồng Bộ Song Sinh 1 - 1 & Migration Hồi Tố (Twin Games 1-1 Sync & Retroactive Case Migration)
- **Đồng Bộ Song Sinh Tuyệt Đối 1 - 1**:
  - Đối với các tựa game có 2 bản ghi song sinh (như Where Winds Meet: `where-winds-meet-mobile` và `yen-van-thap-luc-thanh`):
    1. Tập mã phải giống nhau 100%.
    2. Trạng thái (`active`/`expired`) của từng mã phải khớp nhau 100%.
    3. Phần thưởng (`rewards` / `description`) phải đồng nhất và lấy theo bản chi tiết nhất (vật phẩm, Echo Jade, Coin, v.v.).
    4. Tuyệt đối không để xảy ra mâu thuẫn nội tại: Mã có trạng thái `active` không bao giờ được chứa chuỗi mô tả `"Đã hết hạn"` hay `"Mã coupon WWM (Đã hết hạn)"`.
- **Migration Hồi Tố Khi Thay Đổi Quy Tắc (Retroactive Rule Enforcement)**:
  - Khi áp dụng quy tắc mới (ví dụ bảo tồn case-sensitivity, chuẩn hóa phần thưởng, xóa mã rác scraping): Bắt buộc phải chạy script migration cập nhật lại toàn bộ dữ liệu đã lưu trong quá khứ ở tất cả các tầng: D1 SQL database, D1 system settings (KV), và các file baseline static database (`crawled_codes_188.json`, `codes_database.json`).

### 3.14. Quy Tắc Tối Ưu Hóa D1 Miễn Phí 100% & Fallback Bền Vững (Zero D1 Quota Burn & Edge Resilience Rule)
- **Autocomplete 100% In-Memory (Zero Full Table Scan)**:
  - Tuyệt đối **KHÔNG** chạy câu lệnh SQL dạng `LIKE %...%` trên bảng `codes` D1. Tìm kiếm Autocomplete thực hiện 100% trong bộ nhớ Worker dựa trên `fallbackGamesData` (560 game) và `fallbackCodesData` (11.883 mã quà), phản hồi tức thì < 2ms và tiêu tốn đúng 0 dòng đọc D1.
- **Sự Kiện Mô Phỏng & Bộ Đếm Ảo 100% In-Memory / KV**:
  - Tuyệt đối **KHÔNG** ghi dồn dập các sự kiện popup ảo (`is_simulated = 1`) hoặc các dòng tổng hợp ảo vào CSDL Cloudflare D1 (`wcg_virtual_events`, `wcg_virtual_aggregates`).
  - D1 chỉ lưu trữ dữ liệu thực tế (thành viên, đơn hàng, giftcode thật, giao dịch thật).
  - Toàn bộ bộ đếm ảo được tính toán dựa trên mốc neo thời gian 15:33 25/10/2026 và công thức tăng trưởng cố định: VIP ~26/giờ, giveaway ~0.1292/phút, master copy 1.0/phút.
- **Edge Cache 10s Cho Realtime Events**:
  - `/api/realtime-events` sử dụng header `Cache-Control: public, max-age=5, s-maxage=10, stale-while-revalidate=15`, đồng bộ hoàn hảo với nhịp khe thời gian 10 giây phía client, triệt tiêu 90% tải Worker và 100% tải DB.
- **Phòng Thủ Timeout & Cầu Dao Toàn Diện (`withD1Timeout`)**:
  - Mọi câu lệnh đọc D1 trên các endpoint công khai bắt buộc bọc qua hàm `withD1Timeout(promise, 1000 - 1200ms, fallbackVal)`.
  - Nếu D1 chạm trần hạn mức hoặc phản hồi chậm quá 1.2s, hệ thống tự động trả về tập dữ liệu tĩnh baseline mà không làm treo request của người dùng.
- **Bảng Tra Cứu Fallback O(1) Bằng Map**:
  - Tệp `crawled_codes_188.json` khi nạp vào Worker phải được băm sẵn sang `Map<string, GiftCode[]>` theo slug game (`fallbackCodesBySlug`) để tra cứu tức thì O(1), không truy cập mảng bằng khóa chuỗi `array[slug]`.

---

### 3.15. Quy Tắc Quản Trị Giveaway & Bảo Tồn Kho Mã Thật (Giveaway Management & Stock Masking Rule)
- **Đóng / Mở Sự Kiện Riêng Lẻ & Hàng Loạt (Granular & Bulk Event Control)**:
  - Quản trị viên có toàn quyền đóng hoặc mở lại từng sự kiện riêng lẻ qua nút "Đóng" (PowerOff) / "Mở lại" (Play) hoặc thao tác hàng loạt qua thanh tác vụ với `BATCH_TOGGLE_ACTIVE`.
  - Bộ lọc Chọn Nhanh Tựa Game (Game Quick Chips) cho phép tra cứu và thao tác nhanh chóng theo từng tựa game cụ thể.
- **Bảo Tồn 100% Kho Mã Thật Khi Đóng (Zero Real Code Loss)**:
  - Khi một sự kiện bị đóng (`is_active: false`, `status: 'PAUSED'`), toàn bộ mã thật trong bảng D1 `giveaway_codes`, trường `codes_pool` và `remaining_codes` **BẢO TỒN NGUYÊN VẸN 100%**, không bị xóa hay giảm trừ.
  - Phía Web Khách:
    - Sự kiện vẫn hiển thị trong danh sách (không bị ẩn mất khỏi tầm mắt của người dùng).
    - Số lượng còn lại hiển thị bị ép về 0 (`remaining = 0`).
    - Thẻ sự kiện dán nhãn "Hết Mã" và nút nhận mã báo "Chờ Đợt Mới" / "Tạm Hết".
    - Modal chi tiết hiển thị nút bị vô hiệu hóa với thông báo "Sự Kiện Tạm Đóng — Chờ Đợt Mã Mới".
    - Cổng nhận mã `/api/giveaways/claim` và `dataService.ts` chặn toàn bộ yêu cầu nhận mã từ sự kiện đã đóng.
  - Phía Admin: Hiển thị đầy đủ số lượng mã thật trong kho kèm nhãn `Đã đóng (Báo hết mã) - (Kho còn X mã thật)`.

---

## 4. BẢN ĐỒ DỮ LIỆU & STATE MANAGEMENT

### 4.1. LocalStorage Keys Chính
| Key | Ý nghĩa & Dữ liệu chứa |
| :--- | :--- |
| `wcg_admin_games_v4` | Danh sách 486+ tựa game, ảnh bìa, logo, nhà phát hành, trạng thái |
| `wcg_admin_custom_codes_v4` | Danh sách giftcode do admin quản trị hoặc crawler nhập vào |
| `wcg_admin_utilities_v4` | Danh mục gói tiện ích (VIP, cày thuê, buff code, tool) |
| `wcg_admin_store_products_v4` | Danh mục tài khoản game / vật phẩm trong Cửa Hàng |
| `wcg_admin_giveaways_v4` | Các chiến dịch tặng quà giveaway miễn phí |
| `wcg_admin_inventory_v4` | Kho mã chi tiết (mỗi mã là 1 dòng SKU/code) |
| `wcg_marketing_config_v4` | Cấu hình thông báo ảo, tần suất, khung giờ vàng, tài khoản ảo |
| `wcg_admin_news_v4` | Danh sách bài viết tin tức game, hướng dẫn nhập code |
| `wcg_admin_deleted_*_v4` | Danh sách Tombstone lưu ID các mục đã bị xóa vĩnh viễn |

### 4.2. Các Service Nòng Cốt
- `src/services/dataService.ts`: Trung tâm cung cấp dữ liệu đọc/ghi, quản lý games, codes, utilities, store products, giveaways.
- `src/services/marketingService.ts`: Bộ máy tính toán hiển thị tồn kho, lượt bán, lượt copy, tạo thông báo nổ ảo, điều phối auto-restock và offline catch-up.
- `src/services/adminService.ts`: Xử lý phân quyền quản trị, đồng bộ dữ liệu lên Cloudflare KV/D1.
- `src/services/authService.ts`: Xử lý đăng ký, đăng nhập, nạp tiền ví, lịch sử giao dịch.


### 4.3. Universal Template System Keys
| Key | Ý nghĩa & Dữ liệu chứa |
| :--- | :--- |
| `wcg_universal_templates_v1` | Cấu hình Mẫu Chung toàn sàn (Giveaway, Tra cứu, Tiện ích, Cửa hàng) |
| `wcg_template_snapshots_v1` | Danh sách bản sao lưu Snapshot trước các lần áp đặt hoặc thay đổi lớn |
| `wcg_template_audit_logs_v1` | Nhật ký kiểm toán thao tác mẫu chung (thời gian, người thực hiện, hành động, phạm vi) |

---

## 5. HỆ THỐNG MẪU CHUNG TOÀN SÀN (UNIVERSAL TEMPLATE SYSTEM)

### 5.1. Triết Lý Thiết Kế: 1-Write D1 SSOT & Runtime Inheritance
- **Không Ghi Đè Hàng Loạt (Zero Bulk Writes)**: Khi quản trị viên thay đổi Mẫu Chung (chính sách nhận giftcode, link Zalo, giãn cách phát code, tiêu đề mẫu...), hệ thống chỉ thực hiện đúng **1 lượt ghi (1 D1 write)** vào bảng `system_settings` với key `wcg_universal_templates_v1`.
- **Hợp Nhất Lúc Chạy (Runtime Inheritance)**: Web Khách (`GiveawaysView`, `UtilitiesView`, `StoreView`, `GameDetailModal`) đọc cấu hình Mẫu Chung và tự động áp dụng vào các đợt phát / sản phẩm có `use_template !== false`.
- **Tùy Chỉnh Riêng Biệt (`use_template: false`)**: Các đợt phát hoặc sản phẩm có nội dung đặc thù được gắn cờ `use_template: false`, giữ nguyên 100% giá trị tùy chỉnh và không bị ghi đè bởi Mẫu Chung.

### 5.2. Các Khu Vực & Quy Tắc Kế Thừa
1. **Khung Giveaway**:
   - *Nhóm 1 (Chính sách & hiển thị)*: 3 điều kiện nhận giftcode (tuổi nick, max/user, max/IP, cooldown), Link Zalo/Cộng đồng, 3 thông báo giật mã (`{code}`, `{game_name}`, `{last_user}`, `{time_left}`), Waiting Room (Min, Max), Nút hiển thị số lượt đã giật.
   - *Phát code giãn cách toàn sàn*: Cài đặt duy nhất toàn web (0s, 30s, 1m, 2m, 3m, 5m, 10m, 15m, 30m, 45m, 1h), đồng bộ cả ở Frontend và D1 Serverless Claim.
   - *Nhóm 2 (Nội dung có chỗ trống)*: Tiêu đề `Code riêng + {game_name}`, phần thưởng `Code ngẫu nhiên`, quy định nhận `Code dùng cho 1 tài khoản, 1 loại dùng 1 lần.`.
   - *Bảo tồn riêng từng đợt*: Tựa game (`game_slug`, `game_name`), icon/cover URL, con số lượt ảo bổ sung (`virtual_claimed_offset`), trạng thái đang mở (`is_active`), kho mã (`codes_pool`, `claim_history`).
2. **Tra Cứu Code**: Hướng dẫn SEO chuẩn tự điền `{game_name}`, nhãn nút sao chép, nhãn còn hoạt động / hết hạn, huy hiệu.
3. **Tiện Ích**: Tiêu đề mẫu `{title}`, mô tả bảo hành 1 đổi 1 tức thì, nút "Nhận Tiện Ích", huy hiệu "Chính Hãng".
4. **Cửa Hàng Code**: Tiêu đề mẫu `{title}`, mô tả bản quyền giao ngay từ D1, nút "Mua Code Ngay", nhãn còn hàng / hết hàng, huy hiệu "Bản Quyền".

### 5.3. Cơ Chế An Toàn: Snapshot & Rollback
- Trước mỗi thao tác "Áp Đặt Toàn Bộ", hệ thống bắt buộc mở Modal Xem Trước (Preview Diff) và tự động tạo Snapshot lưu lại toàn bộ dữ liệu trước đó.
- Nút "Khôi phục từ bản sao lưu này" cho phép người dùng rollback về trạng thái trước đó chỉ bằng 1 cú nhấp chuột.
- Mọi thao tác đều được lưu vết trong Nhật ký kiểm toán `TemplateAuditLog`.

---

## 6. HỆ THỐNG KHÓA API & ĐỘNG CƠ PHÂN QUYỀN ĐA CHIỀU (API MANAGEMENT & PERMISSIONS ENGINE)

### 6.1. Kiến Trúc Khóa API Đa Năng (Universal Versatile API)
- **Bảng CSDL D1**: `mission_ai_api_keys` lưu trữ `id`, `key_name`, `api_key_hash` (SHA-256), `key_prefix`, `scope`, `description`, `expires_at`, `raw_key`, `is_active`, `last_used_at`, `created_at`.
- **Cơ chế Phân quyền Đa Quyền (Multi-Scope Engine)**:
  - Cột `scope` lưu trữ chuỗi danh sách các quyền phân tách bằng dấu phẩy (hoặc mảng JSON), ví dụ: `NEWS_FULL,MISSIONS_FULL,GAMES_FULL,GIVEAWAYS_FULL,SYNC_FULL`.
  - Bộ hàm chuẩn tại `functions/services/mission_service.ts`:
    - `hasScope(scopeStr, requiredScope)`: Kiểm tra xem khóa có quyền `requiredScope` hay không. Tự động thừa hưởng toàn quyền nếu khóa có `ADMIN_FULL`, `FULL`, hoặc `*`.
    - `parseScopes(scopeStr)`: Chuyển chuỗi hoặc JSON scope thành mảng `string[]`.
    - `formatScopes(scopes)`: Chuẩn hóa mảng hoặc chuỗi thành danh sách phân tách bằng dấu phẩy chuẩn mực.
- **Khóa Mẫu Đa Năng (`ak_preset_multi_versatile`)**:
  - Mã: `wcg_multi_5a82ef419b027c4d18e3902f6a7d1b82c9e5041a`
  - Đóng vai trò là khóa mẫu đa năng cho phép Admin hoặc AI sử dụng 1 mã duy nhất để gọi nhiều nhóm API khác nhau.
- **Endpoint Set Quyền Từ Xa (`POST /api/api-keys/set-permissions`)**:
  - Nhận `key_id` và mảng `scopes: string[]` để cập nhật quyền cho bất kỳ khóa API nào trong D1.
  - Xác thực bằng Master Key hoặc bất kỳ khóa nào có quyền `API_KEYS_FULL` / `ADMIN_FULL`.

### 6.2. Mệnh Lệnh Bắt Buộc: Tự Động Bổ Sung Quyền Mới Vào Mục Quản Lý API (MANDATORY RULE)
- **MỆNH LỆNH TỪ CHỦ SỞ HỮU DỰ ÁN**:
  - Bất cứ khi nào trong tương lai tác nhân phát triển, mở thêm hoặc cấu hình bất kỳ quyền/endpoint API mới nào trên website:
  1. **BẮT BUỘC TỰ ĐỘNG** bổ sung định danh quyền đó vào mảng `ALL_API_SCOPES` trong `src/admin/modules/ApiKeysModule.tsx`.
  2. Bổ sung quyền đó vào hàm kiểm tra trung tâm `hasScope` trong `functions/services/mission_service.ts` và các endpoint API tương ứng.
  3. Cập nhật giao diện Modal "Set Quyền Cho Khóa API" và Modal "Tạo Khóa API Mới" để Quản trị viên có thể dùng 1 mã API chọn và gán quyền mới đó ngay lập tức.
  4. Cập nhật Bảng tra cứu cấp quyền và tab Tài liệu API mẫu (cURL / JavaScript).

---

## 7. KIẾN TRÚC ĐỒNG BỘ TIN TỨC & NỐI LIỀN KHO BÀI VIẾT /api/news VÀ /api/sync

### 7.1. Nguyên Lý Nối Kho Bài Viết (Two-Way Unified News Repositories)
- **Kho bài viết D1 duy nhất (Single Source of Truth - SSOT)**:
  - Cả bộ API RESTful (`/api/news`, `/api/news/:id`) và endpoint đồng bộ toàn diện (`/api/sync`) đều đọc và ghi thống nhất vào bảng `system_settings` của Cloudflare D1 tại 2 khóa chính:
    1. `wcg_news_articles_v1`: Mảng toàn bộ bài viết tin tức thực tế.
    2. `wcg_deleted_news_articles_v1`: Mảng Tombstone các ID và slug bài viết đã xóa để ngăn chặn hồi sinh vĩnh viễn (Zero Resurrection).
    3. Đồng bộ tương hỗ vào `wcg_master_state_v4.newsArticles`.
- **Cơ chế Xóa Cache Nguyên Tử (Immediate Memory Cache Invalidation)**:
  - Mọi thao tác `POST /api/news`, `PUT /api/news/:id`, `DELETE /api/news/:id` hoặc `POST /api/sync` đều gọi `setSettingD1` kèm `invalidateSettingMemoryCache('wcg_news_articles_v1')` và `invalidateSettingMemoryCache('wcg_master_state_v4')`, lập tức giải phóng cache trong Worker RAM.
- **Xử Lý Bài Viết Hẹn Giờ (Scheduled Publishing Gatekeeper)**:
  - Bài viết có `status === 'SCHEDULED'` kèm `scheduled_publish_at`:
    - Với khách công khai (`!authorized`): Bị chặn ẩn hoàn toàn khỏi `/api/sync` và `/api/news` cho tới khi `nowMs >= schedTime`.
    - Với quản trị viên (`authorized === true`): Hiển thị đầy đủ trong danh sách Admin để theo dõi và chỉnh sửa.
    - Khi thời gian thực tế vượt qua mốc hẹn, server và client tự động kích hoạt trạng thái thành `PUBLISHED`.

### 7.2. Luồng Đồng Bộ Phía Web Khách & Admin (Client-Side Realtime Bridge)
- **Tự động kéo dữ liệu nền không gây giật lag (Zero-Stall Background Auto-Sync)**:
  - Phương thức `newsService.syncFromServer()` truy vấn `/api/sync?key=wcg_news_articles_v1&fresh=1` (fallback `/api/news?limit=all`).
  - Được kích hoạt tự động:
    1. Khi người dùng mở trang `/news` (`NewsView.tsx` mount).
    2. Khi người dùng vãng lai vào web (`dataService.syncWithCloudflareKV` khối `!isAdmin`).
    3. Khi Quản trị viên mở Module Tin Tức (`NewsModule.tsx` mount) hoặc bấm "🔄 Làm mới".
    4. Khi người dùng truy cập trực tiếp qua đường dẫn slug bài viết (`/news/:slug`), hệ thống tự động kiểm tra bài viết sau khi sync và mở modal xem bài ngay lập tức.
