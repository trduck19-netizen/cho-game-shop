const https = require('https');
const fs = require('fs');
require('dotenv').config();

const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'codegame.shop',
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': ADMIN_SYNC_SECRET,
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

function stripAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== TOÀN DIỆN KIỂM TOÁN VÀ TÁI CÂN BẰNG GIFTCODE TOÀN BỘ HỆ THỐNG ===');

  console.log('1. Tải danh mục games_v5 từ D1...');
  const gamesRes = await fetchJson('https://codegame.shop/api/sync?key=wcg_admin_games_v5');
  await sleep(600);

  console.log('2. Tải custom codes từ D1...');
  const customRes = await fetchJson('https://codegame.shop/api/sync?key=wcg_admin_custom_free_codes_v1');
  await sleep(600);

  console.log('3. Tải catalog codes từ D1...');
  const d1CodesRes = await fetchJson('https://codegame.shop/api/sync?key=wcg_admin_free_codes_v5');

  const gamesList = gamesRes.data || [];
  const customCodes = customRes.data || [];
  const d1Codes = d1CodesRes.data || [];
  const bundledCodes = JSON.parse(fs.readFileSync('src/data/crawled_codes_188.json', 'utf8'));

  console.log(`- Games trong D1: ${gamesList.length}`);
  console.log(`- Custom codes: ${customCodes.length}`);
  console.log(`- D1 catalog codes: ${d1Codes.length}`);
  console.log(`- Master bundled codes: ${bundledCodes.length}`);

  // Build authoritative 3-tier codes map
  const codesBySlug = new Map();
  function registerCode(item) {
    if (!item) return;
    const slug = (item.gameSlug || item.game_slug || item.slug || item.gameId || '').toLowerCase().trim();
    const codeVal = String(item.code || item.codeValue || item.gift_code || '').trim().toUpperCase();
    if (!slug || !codeVal) return;

    if (!codesBySlug.has(slug)) codesBySlug.set(slug, new Map());
    const gameMap = codesBySlug.get(slug);
    if (!gameMap.has(codeVal)) {
      gameMap.set(codeVal, item);
    }
  }

  // 1. Custom codes (highest priority)
  customCodes.forEach(registerCode);
  // 2. D1 catalog codes
  d1Codes.forEach(registerCode);
  // 3. Bundled codes
  bundledCodes.forEach(registerCode);

  console.log(`- Số lượng tựa game có mã trong kho tổng hợp: ${codesBySlug.size}`);

  // Resolve codes count for every game in gamesList
  let updatedCount = 0;
  const rebalancedGames = gamesList.map((g) => {
    if (!g) return g;
    const slug = (g.slug || g.id || '').toLowerCase().trim();
    const rawId = (g.id || slug).toLowerCase().trim();
    const withoutMobile = slug.replace(/-mobile$/i, '');
    const withMobile = `${slug}-mobile`;

    // Multi-key lookup
    const possibleKeys = [
      slug,
      rawId,
      withoutMobile,
      withMobile,
      slug.replace(/_/g, '-'),
    ];
    if (slug === 'pirate-legends' || slug === 'huyen-thoai-hai-tac' || rawId === 'pirate-legends' || rawId === 'huyen-thoai-hai-tac') {
      possibleKeys.push('pirate-legends', 'huyen-thoai-hai-tac');
    }
    if (g.name) {
      const nameSlug = stripAccents(g.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      possibleKeys.push(nameSlug);
    }

    const uniqueCodes = new Set();
    for (const k of possibleKeys) {
      const m = codesBySlug.get(k);
      if (m) {
        for (const codeStr of m.keys()) {
          uniqueCodes.add(codeStr);
        }
      }
    }

    const trueCount = uniqueCodes.size;
    const oldCount = typeof g.codes_count === 'number' ? g.codes_count : 0;

    if (trueCount !== oldCount) {
      updatedCount++;
    }

    return {
      ...g,
      codes_count: trueCount,
      free_codes_count: trueCount,
      updated_at: trueCount !== oldCount ? new Date().toISOString() : (g.updated_at || g.created_at || new Date().toISOString())
    };
  });

  console.log(`- Số lượng game được tái cân bằng codes_count: ${updatedCount} / ${gamesList.length}`);

  // Specifically check Ky Tich Tro Lai and Thuc Than Ky
  const kt = rebalancedGames.find(g => (g.slug || '').includes('ky-tich-tro-lai'));
  console.log('Kỳ Tích Trở Lại sau rebalance:', kt ? { name: kt.name, slug: kt.slug, codes_count: kt.codes_count } : 'NOT FOUND');

  const tt = rebalancedGames.find(g => (g.slug || '').includes('thuc-than-ky'));
  console.log('Thức Thần Ký sau rebalance:', tt ? { name: tt.name, slug: tt.slug, codes_count: tt.codes_count } : 'NOT FOUND');

  console.log('4. Lưu danh mục games_v5 đã tái cân bằng vào D1...');
  const saveRes = await apiRequest('/api/sync', 'POST', {
    key: 'wcg_admin_games_v5',
    data: rebalancedGames
  });
  console.log('Kết quả lưu D1 games_v5:', saveRes.status, saveRes.data?.message || saveRes.data?.success);

  console.log('=== HOÀN TẤT TÁI CÂN BẰNG TOÀN DIỆN ===');
}

main().catch(console.error);
