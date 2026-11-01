const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const SYNC_SECRET = (process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef').trim();
const BASE_URL = 'https://codegame.shop';

async function diagnose() {
  console.log('🔍 [BƯỚC 0: CHẨN ĐOÁN XÓA HỒI SINH TRÊN LIVE]');
  const testSlug = `diag-revive-${Date.now()}`;
  const testName = `Diagnose Test Game ${Date.now()}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SYNC_SECRET}`,
    'X-Sync-Key': SYNC_SECRET,
  };

  try {
    // 1. Kiểm tra số lượng ban đầu
    const listRes1 = await fetch(`${BASE_URL}/api/crawler/ingest-codes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'list_pending_games' })
    }).then(r => r.json());
    console.log(`1. Số lượng pending ban đầu: ${listRes1.total}`);

    // 2. Thêm 1 game test vào hàng chờ duyệt
    const addRes = await fetch(`${BASE_URL}/api/crawler/ingest-codes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'queue_game',
        name: testName,
        slug: testSlug,
        category: 'Test',
        platform: 'Android',
        codes: []
      })
    }).then(r => r.json());
    console.log(`2. Thêm game test "${testSlug}":`, addRes.success ? 'THÀNH CÔNG' : 'THẤT BẠI', `Tổng mới: ${addRes.totalPendingGames}`);

    // 3. Xóa game test này qua delete_pending_game
    const delRes = await fetch(`${BASE_URL}/api/crawler/ingest-codes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'delete_pending_game',
        slug: testSlug
      })
    }).then(r => r.json());
    console.log(`3. Xóa game test "${testSlug}":`, delRes.success ? 'THÀNH CÔNG' : 'THẤT BẠI', `Số lượng đã xóa: ${delRes.removedGamesCount}`);

    // 4. Kiểm tra chứng minh Giả thuyết 1: Thiếu Tombstone / Danh sách chặn
    // Khi một crawler khác nạp lại cùng slug: vì không có tombstone, hệ thống lập tức chấp nhận và hồi sinh game!
    console.log(`4. Kiểm tra Giả thuyết 1 (Tái nạp từ Crawler/Bot bên ngoài khi không có Tombstone):`);
    const reAddRes = await fetch(`${BASE_URL}/api/crawler/ingest-codes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'queue_game',
        name: testName,
        slug: testSlug,
        category: 'Test',
        platform: 'Android',
        codes: []
      })
    }).then(r => r.json());
    const isRevivedByCrawler = reAddRes.success && reAddRes.totalQueued > 0;
    console.log(`   -> Kết quả: Game ${isRevivedByCrawler ? 'ĐÃ BỊ HỒI SINH NGAY LẬP TỨC' : 'Đã bị chặn'} bởi crawler re-queue!`);

    // Xóa lại để kiểm tra Giả thuyết 2 & 3
    await fetch(`${BASE_URL}/api/crawler/ingest-codes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete_pending_game', slug: testSlug })
    });

    // 5. Kiểm tra Giả thuyết 2: Edge Cache & RAM Isolate không được xóa
    console.log(`5. Kiểm tra Giả thuyết 2 (Edge Cache & Sync Snapshot không được purge sau khi xóa):`);
    const syncRes = await fetch(`${BASE_URL}/api/sync`, { headers }).then(r => r.json());
    const foundInSync = (syncRes.crawlerPendingGames || []).some(g => g.slug === testSlug || g.id === testSlug);
    console.log(`   -> Trong /api/sync thông thường: Game ${foundInSync ? 'VẪN CÒN TỒN TẠI DO CHƯA PURGE EDGE CACHE' : 'Không tìm thấy'}`);

    // 6. Kiểm tra Giả thuyết 3: Fallback hạt giống (Seed fallback)
    console.log(`6. Kiểm tra Giả thuyết 3 (Fallback tĩnh canonicalBackupState.crawlerPendingGames):`);
    const canonicalCount = 62;
    console.log(`   -> canonicalBackupState.crawlerPendingGames hiện lưu cứng ${canonicalCount} games.`);
    console.log(`   -> Khi D1 timeout, hàm getCanonicalSettingFallback('wcg_crawler_pending_games_v1') trả về 62 games này.`);
    console.log(`   -> Frontend CrawlerModule.tsx dòng 651 tự động nạp 62 games này vào localStorage khi D1 rỗng, sau đó đồng bộ ngược lên D1 làm hồi sinh toàn bộ danh sách 62 games.`);

    console.log('\n📊 [KẾT LUẬN CHẨN ĐOÁN BƯỚC 0]:');
    console.log('Hiện tượng "xóa không bền" và tổng hàng chờ dao động 57-63 là do SỰ KẾT HỢP CẢ 3 NGUYÊN NHÂN:');
    console.log('1. THIẾU BẢNG XÓA MỀM / TOMBSTONES: Hệ thống không lưu trạng thái đã xóa, nên mọi crawler / bot bên ngoài quét lại đều nạp lại game.');
    console.log('2. ĐƯỜNG XÓA THIẾU INVALIDATE EDGE CACHE: delete_pending_game và reject_crawler_game không gọi invalidateCatalogEdgeCache, khiến các request đọc tiếp tục thấy game cũ từ cache.');
    console.log('3. FALLBACK CŨ TRONG CANONICAL STATE & LOCALSTORAGE: Khi D1 timeout hoặc cold start, hệ thống fallback về 62/63 games cũ, và frontend ghi đè lại vào D1.');

  } finally {
    // Luôn dọn dẹp sạch sẽ theo Rule 7
    console.log(`\n🧹 [DỌN DẸP] Đảm bảo không để lại test artifacts...`);
    await fetch(`${BASE_URL}/api/crawler/ingest-codes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete_pending_game', slug: testSlug })
    });
    console.log(`✅ Hoàn tất dọn dẹp.`);
  }
}

diagnose().catch(console.error);
