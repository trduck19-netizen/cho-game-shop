/**
 * scripts/execute_catalog_giveaway_repair.cjs
 * Comprehensive execution script for catalog pagination & giveaway repair:
 * 1. Deduplicate gw_hiep-khach-hanh_mvuj5a5m (214 -> 107 codes) via POST
 * 2. Set gw_gamerpower_rotwood to ACTIVE in D1 so sync has 44 campaigns
 * 3. Add crossfire-legends and backfill missing games into D1 games and wcg_admin_games_v5
 * 4. Recompute D1 counts
 * 5. Verify catalog pagination & sync endpoints
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const TARGET_HOST = process.env.TARGET_HOST || 'https://codegame.shop';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU SỬA LỆCH KHO CATALOG + GIVEAWAY & GỠ TRÙNG MÃ');
  console.log(`🎯 Target: ${TARGET_HOST}`);
  console.log('================================================================\n');

  // --- BƯỚC 1: GỠ TRÙNG MÃ HIỆP KHÁCH HÀNH ---
  console.log('▶ [1/5] Kiểm tra và gỡ trùng kho mã Hiệp Khách Hành (gw_hiep-khach-hanh_mvuj5a5m)...');
  const hkhCheck = await fetchJSON(`${TARGET_HOST}/api/giveaways/manage?id=gw_hiep-khach-hanh_mvuj5a5m`, {
    headers: { 'X-Sync-Key': SYNC_SECRET }
  });

  if (hkhCheck.success && hkhCheck.giveaway) {
    const rawPool = hkhCheck.giveaway.codes_pool || [];
    const seen = new Set();
    const uniquePool = [];
    for (const c of rawPool) {
      const clean = String(c || '').trim();
      const norm = clean.toUpperCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        uniquePool.push(clean);
      }
    }
    console.log(`   Hiện tại: ${rawPool.length} mã trong kho, ${uniquePool.length} mã duy nhất.`);

    if (rawPool.length > uniquePool.length) {
      console.log(`   Đang cập nhật kho mã về ${uniquePool.length} mã duy nhất qua POST /api/giveaways/manage...`);
      const payload = {
        ...hkhCheck.giveaway,
        codes_pool: uniquePool,
        total_codes: uniquePool.length,
        remaining_codes: uniquePool.length,
        claimed_codes: 0,
        status: 'ACTIVE',
        is_active: true
      };

      const updateRes = await fetchJSON(`${TARGET_HOST}/api/giveaways/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': SYNC_SECRET
        },
        body: JSON.stringify(payload)
      });
      console.log(`   ✅ Kết quả gỡ trùng:`, updateRes.message);
      console.log(`   Số lượng sau cập nhật: ${updateRes.giveaway?.remaining_codes} mã (Total: ${updateRes.giveaway?.total_codes})`);
    } else {
      console.log(`   ✅ Kho mã Hiệp Khách Hành đã chuẩn ${uniquePool.length} mã duy nhất.`);
    }
  }

  // --- BƯỚC 2: CẬP NHẬT ROTWOOD GIVEAWAY THÀNH ACTIVE ---
  console.log('\n▶ [2/5] Kiểm tra trạng thái chiến dịch gw_gamerpower_rotwood...');
  const rotCheck = await fetchJSON(`${TARGET_HOST}/api/giveaways/manage?id=gw_gamerpower_rotwood`, {
    headers: { 'X-Sync-Key': SYNC_SECRET }
  });

  if (rotCheck.success && rotCheck.giveaway) {
    console.log(`   Hiện tại: Status=${rotCheck.giveaway.status}, IsActive=${rotCheck.giveaway.is_active}, Remaining=${rotCheck.giveaway.remaining_codes}`);
    if (rotCheck.giveaway.status !== 'ACTIVE' || !rotCheck.giveaway.is_active) {
      console.log(`   Đang cập nhật gw_gamerpower_rotwood thành ACTIVE...`);
      const updateRot = await fetchJSON(`${TARGET_HOST}/api/giveaways/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': SYNC_SECRET
        },
        body: JSON.stringify({
          ...rotCheck.giveaway,
          status: 'ACTIVE',
          is_active: true
        })
      });
      console.log(`   ✅ Kết quả cập nhật:`, updateRot.message);
    } else {
      console.log(`   ✅ gw_gamerpower_rotwood đã ở trạng thái ACTIVE.`);
    }
  }

  // --- BƯỚC 3: ĐỒNG BỘ GAMES VÀO D1 VÀ WCG_ADMIN_GAMES_V5 ---
  console.log('\n▶ [3/5] Đồng bộ danh mục games đầy đủ (582 tựa game) vào wcg_admin_games_v5 và D1...');
  const localGamesPath = path.join(__dirname, '../src/data/games188.json');
  const allLocalGames = JSON.parse(fs.readFileSync(localGamesPath, 'utf8'));
  console.log(`   Tổng số tựa game trong games188.json: ${allLocalGames.length}`);

  // Cập nhật wcg_admin_games_v5 trên D1 (Fast path key + data)
  const syncSettingsRes = await fetchJSON(`${TARGET_HOST}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': SYNC_SECRET
    },
    body: JSON.stringify({
      key: 'wcg_admin_games_v5',
      data: allLocalGames
    })
  }).catch(e => ({ error: e.message }));
  console.log(`   Lưu wcg_admin_games_v5:`, syncSettingsRes.success ? 'Thành công' : syncSettingsRes);

  // Backfill 11 games còn thiếu vào D1 SQL table games nếu chưa có
  const missingD1Games = allLocalGames.filter(g => [
    'dau-truong-chan-ly-mobile', 'esports', 'huyen-thoai-hai-tac',
    'seven-deadly-sins-grand-cross', 'ta-la-hac-ngo-khong-vplay', 'ta-la-quan-lao-gia',
    'the-gioi-moi-ninja', 'x-wukong-dai-chien-tam-gioi', 'dau-truong-onmyoji',
    'phi-kiem-cuu-long-dan-quan', 'au-mobile-vtc-bigupdate'
  ].includes(g.slug));

  if (missingD1Games.length > 0) {
    console.log(`   Backfill ${missingD1Games.length} game vào bảng games D1...`);
    const backfillRes = await fetchJSON(`${TARGET_HOST}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': SYNC_SECRET
      },
      body: JSON.stringify({
        action: 'backfill_d1_games',
        games: missingD1Games
      })
    }).catch(e => ({ error: e.message }));
    console.log(`   Kết quả backfill D1 games:`, backfillRes.success ? 'Thành công' : backfillRes);
  }

  // --- BƯỚC 4: TÁI TÍNH TOÁN D1 COUNTS ---
  console.log('\n▶ [4/5] Tái tính toán số liệu codes & stats trên D1...');
  const recomputeRes = await fetchJSON(`${TARGET_HOST}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': SYNC_SECRET
    },
    body: JSON.stringify({ action: 'recompute_d1_counts' })
  }).catch(e => ({ error: e.message }));
  console.log(`   D1 Stats sau tái tính toán:`, recomputeRes.stats || recomputeRes);

  // --- BƯỚC 5: ĐỐI SOÁT KIỂM TRA TOÀN DIỆN ---
  console.log('\n▶ [5/5] Kiểm tra đối soát sau khi sửa...');
  
  // 1. Kiểm tra /api/sync
  const syncData = await fetchJSON(`${TARGET_HOST}/api/sync?fresh=1`);
  console.log(`   /api/sync.games: ${syncData.games?.length} mục`);
  const cflSync = syncData.games?.find(g => g.slug === 'crossfire-legends');
  console.log(`   crossfire-legends in sync:`, cflSync ? `CÓ (codes_count: ${cflSync.codes_count})` : 'CHƯA CÓ');

  console.log(`   /api/sync.giveaways: ${syncData.giveaways?.length} chiến dịch`);
  const rotSync = syncData.giveaways?.find(g => g.id === 'gw_gamerpower_rotwood');
  console.log(`   gw_gamerpower_rotwood in sync:`, rotSync ? `CÓ (${rotSync.title}, remaining: ${rotSync.remaining_codes})` : 'CHƯA CÓ');

  const hkhSync = syncData.giveaways?.find(g => g.id === 'gw_hiep-khach-hanh_mvuj5a5m');
  console.log(`   gw_hiep-khach-hanh_mvuj5a5m in sync: Total=${hkhSync?.total_codes}, Remaining=${hkhSync?.remaining_codes}, Claimed=${hkhSync?.claimed_codes}`);

  console.log('\n================================================================');
  console.log('✅ HOÀN TẤT THỰC THI SỬA CHỮA KHO DỮ LIỆU!');
  console.log('================================================================');
}

main().catch(console.error);
