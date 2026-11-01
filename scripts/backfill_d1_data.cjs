/**
 * scripts/backfill_d1_data.cjs
 * One-shot & Idempotent Backfill script to populate D1 SQL tables `games` and `codes`
 * and recompute `active_codes_count`, `total_codes_count`, `last_code_at`.
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
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function postAction(action, payload) {
  const url = `${TARGET_HOST}/api/sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': SYNC_SECRET,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Action ${action} failed: HTTP ${res.status} - ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU BACKFILL DỮ LIỆU D1 SQL CHO GAMES & CODES');
  console.log(`🎯 Target: ${TARGET_HOST}`);
  console.log('================================================================\n');

  // 1. Thu thập danh mục games
  console.log('▶ [1/4] Thu thập danh mục games...');
  const localGamesPath = path.join(__dirname, '../src/data/games188.json');
  let localGames = [];
  if (fs.existsSync(localGamesPath)) {
    try {
      localGames = JSON.parse(fs.readFileSync(localGamesPath, 'utf8'));
      console.log(`   * Đã đọc ${localGames.length} games từ games188.json`);
    } catch (e) {
      console.warn('   ! Lỗi đọc games188.json:', e.message);
    }
  }

  let remoteGames = [];
  try {
    const remoteGamesRes = await fetchJSON(`${TARGET_HOST}/api/sync?key=wcg_admin_games_v5&fresh=1&_t=${Date.now()}`);
    if (remoteGamesRes && Array.isArray(remoteGamesRes.data)) {
      remoteGames = remoteGamesRes.data;
      console.log(`   * Đã tải ${remoteGames.length} games từ D1 wcg_admin_games_v5`);
    }
  } catch (e) {
    console.warn('   ! Không tải được remote wcg_admin_games_v5:', e.message);
  }

  const gamesMap = new Map();
  localGames.forEach((g) => {
    if (g && g.slug) gamesMap.set(g.slug.toLowerCase(), g);
  });
  remoteGames.forEach((g) => {
    if (g && g.slug) {
      const existing = gamesMap.get(g.slug.toLowerCase()) || {};
      gamesMap.set(g.slug.toLowerCase(), { ...existing, ...g });
    }
  });

  const allGames = Array.from(gamesMap.values());
  console.log(`   ✅ Tổng cộng hợp nhất: ${allGames.length} games`);

  // Gửi batch 50 games
  console.log(`\n▶ [2/4] Đẩy games vào D1 table games (batch 50)...`);
  const gameChunkSize = 50;
  let insertedGames = 0;
  for (let i = 0; i < allGames.length; i += gameChunkSize) {
    const chunk = allGames.slice(i, i + gameChunkSize);
    const res = await postAction('backfill_d1_games', { games: chunk });
    insertedGames += res.count || chunk.length;
    process.stdout.write(`   * Tiến độ: ${insertedGames}/${allGames.length} games...\r`);
  }
  console.log(`\n   ✅ Đã nạp thành công ${insertedGames} games vào bảng games.`);

  // 2. Thu thập giftcodes
  console.log('\n▶ [3/4] Thu thập giftcodes...');
  const localCodesPath = path.join(__dirname, '../src/data/crawled_codes_188.json');
  let localCodes = [];
  if (fs.existsSync(localCodesPath)) {
    try {
      localCodes = JSON.parse(fs.readFileSync(localCodesPath, 'utf8'));
      console.log(`   * Đã đọc ${localCodes.length} codes từ crawled_codes_188.json`);
    } catch (e) {
      console.warn('   ! Lỗi đọc crawled_codes_188.json:', e.message);
    }
  }

  let customCodes = [];
  try {
    const customCodesRes = await fetchJSON(`${TARGET_HOST}/api/sync?key=wcg_admin_custom_free_codes_v1&fresh=1&_t=${Date.now()}`);
    if (customCodesRes && Array.isArray(customCodesRes.data)) {
      customCodes = customCodesRes.data;
      console.log(`   * Đã tải ${customCodes.length} codes từ wcg_admin_custom_free_codes_v1`);
    }
  } catch (e) {
    console.warn('   ! Không tải được custom codes:', e.message);
  }

  let adminCodes = [];
  try {
    const adminCodesRes = await fetchJSON(`${TARGET_HOST}/api/sync?key=wcg_admin_free_codes_v5&fresh=1&_t=${Date.now()}`);
    if (adminCodesRes && Array.isArray(adminCodesRes.data)) {
      adminCodes = adminCodesRes.data;
      console.log(`   * Đã tải ${adminCodes.length} codes từ wcg_admin_free_codes_v5`);
    }
  } catch (e) {
    console.warn('   ! Không tải được admin codes:', e.message);
  }

  const codesMap = new Map();
  const registerCode = (c) => {
    if (!c) return;
    const slug = String(c.game_slug || c.gameSlug || c.slug || c.gameId || '').trim().toLowerCase();
    const codeVal = String(c.code || c.codeValue || c.code_value || c.gift_code || '').trim().toUpperCase();
    if (!slug || !codeVal) return;
    const key = `${slug}_${codeVal}`;
    if (!codesMap.has(key)) {
      codesMap.set(key, { ...c, game_slug: slug, code: codeVal });
    }
  };

  localCodes.forEach(registerCode);
  adminCodes.forEach(registerCode);
  customCodes.forEach(registerCode);

  const allCodes = Array.from(codesMap.values());
  console.log(`   ✅ Tổng cộng hợp nhất: ${allCodes.length} unique giftcodes`);

  // Gửi batch 50 codes
  console.log(`\n▶ [4/4] Đẩy codes vào D1 table codes (batch 50)...`);
  const codeChunkSize = 50;
  let insertedCodes = 0;
  for (let i = 0; i < allCodes.length; i += codeChunkSize) {
    const chunk = allCodes.slice(i, i + codeChunkSize);
    const res = await postAction('backfill_d1_codes', { codes: chunk });
    insertedCodes += res.count || chunk.length;
    if (insertedCodes % 500 === 0 || insertedCodes >= allCodes.length) {
      process.stdout.write(`   * Tiến độ: ${insertedCodes}/${allCodes.length} codes...\r`);
    }
  }
  console.log(`\n   ✅ Đã nạp thành công ${insertedCodes} codes vào bảng codes.`);

  // 3. Recompute counts
  console.log('\n▶ [5/5] Tính toán lại (recompute) active_codes_count & total_codes_count...');
  const recomputeRes = await postAction('recompute_d1_counts', {});
  console.log('   ✅ Kết quả recompute:', JSON.stringify(recomputeRes.stats || recomputeRes));

  console.log('\n================================================================');
  console.log('🎉 HOÀN THÀNH TOÀN BỘ QUÁ TRÌNH BACKFILL DỮ LIỆU D1 SQL THÀNH CÔNG!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ LỖI TRONG QUÁ TRÌNH BACKFILL:', err);
  process.exit(1);
});
