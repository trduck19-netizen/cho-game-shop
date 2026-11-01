const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET } }, (res) => {
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

function isCodeExpired(c) {
  if (!c) return false;
  const status = String(c.status || '').toLowerCase();
  if (status === 'expired') return true;

  const exp = c.expiresAt || c.expires_at || c.expiry || '';
  if (!exp) return false;
  if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026') return false;

  const now = new Date();
  const d = new Date(exp);
  if (isNaN(d.getTime())) return false;
  return d < now;
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

/**
 * Deduplicate an array of giftcode records for a list of games.
 * Preserves the single best record for each (slug, code) pair:
 * - Best reward text (more descriptive)
 * - Expiration date if known (stripping fake 2026-12-31)
 * - Status EXPIRED if either source says expired
 */
function deduplicateCodeList(list, label = 'Code List') {
  const map = new Map();
  let duplicatesCount = 0;

  for (const item of list) {
    if (!item) continue;
    const slug = String(item.gameSlug || item.game_slug || item.slug || item.gameId || '').toLowerCase().trim();
    const code = String(item.code || item.codeValue || item.gift_code || '').trim().toUpperCase();
    if (!slug || !code) continue;

    const key = `${slug}:::${code}`;
    const expVal = item.expiresAt || item.expires_at || item.expiry || null;
    const cleanExp = (expVal === '2026-12-31' || expVal === '2026-12-31T23:59:59Z' || expVal === '31/12/2026') ? null : expVal;
    const isExp = isCodeExpired(item);

    if (map.has(key)) {
      duplicatesCount++;
      const prev = map.get(key);
      const prevExp = prev.expiresAt || prev.expires_at || prev.expiry || null;
      const prevIsExp = isCodeExpired(prev);

      // Best reward description
      const rewardA = String(prev.rewards || prev.description || '');
      const rewardB = String(item.rewards || item.description || '');
      const bestReward = (rewardB.length > rewardA.length && !rewardB.includes('nhà phát hành'))
        ? rewardB
        : (rewardA || rewardB);

      map.set(key, {
        ...prev,
        ...item,
        id: prev.id || item.id,
        rewards: bestReward,
        description: bestReward,
        expiresAt: cleanExp || prevExp,
        expires_at: cleanExp || prevExp,
        expiry: cleanExp || prevExp,
        status: (prevIsExp || isExp) ? 'EXPIRED' : 'ACTIVE',
        is_active: !(prevIsExp || isExp),
      });
    } else {
      map.set(key, {
        ...item,
        expiresAt: cleanExp,
        expires_at: cleanExp,
        expiry: cleanExp,
        status: isExp ? 'EXPIRED' : 'ACTIVE',
        is_active: !isExp,
      });
    }
  }

  const result = Array.from(map.values());
  console.log(`[Deduplicate ${label}] Ban đầu: ${list.length} | Trùng lặp đã gộp: ${duplicatesCount} | Còn lại: ${result.length}`);
  return { result, duplicatesCount };
}

async function main() {
  console.log('========================================================================');
  console.log('🧹 VIỆC 3: DỌN TRÙNG LẶP CODE & TÁI CÂN BẰNG CODES_COUNT TOÀN SÀN');
  console.log('========================================================================\n');

  // 1. Tải dữ liệu từ D1
  console.log('1. Đang tải dữ liệu từ Cloudflare D1...');
  const [gamesRes, customRes, freeRes] = await Promise.all([
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_games_v5'),
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_custom_free_codes_v1'),
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_free_codes_v5')
  ]);

  const gamesList = gamesRes.data || [];
  const customCodes = customRes.data || [];
  const d1FreeCodes = freeRes.data || [];
  const bundledFile = 'src/data/crawled_codes_188.json';
  const bundledCodes = JSON.parse(fs.readFileSync(bundledFile, 'utf8'));

  console.log(`  - Games trong D1: ${gamesList.length}`);
  console.log(`  - Custom codes trong D1: ${customCodes.length}`);
  console.log(`  - D1 free codes: ${d1FreeCodes.length}`);
  console.log(`  - Bundled codes local: ${bundledCodes.length}`);

  // 2. Dọn trùng lặp từng tập dữ liệu
  console.log('\n2. Thực hiện dọn trùng lặp nội bộ trong từng kho lưu trữ:');
  const dedupCustom = deduplicateCodeList(customCodes, 'Custom Codes (D1)');
  const dedupFree = deduplicateCodeList(d1FreeCodes, 'Free Codes (D1)');
  const dedupBundled = deduplicateCodeList(bundledCodes, 'Bundled Codes (Local JSON)');

  // 3. Xây dựng authoritative 3-tier codes map
  console.log('\n3. Hợp nhất authoritative codes map theo thứ tự ưu tiên (Custom > D1 > Bundled)...');
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
  dedupCustom.result.forEach(registerCode);
  // 2. D1 catalog codes
  dedupFree.result.forEach(registerCode);
  // 3. Bundled codes
  dedupBundled.result.forEach(registerCode);

  console.log(`  - Số tựa game có mã trong kho tổng hợp: ${codesBySlug.size}`);

  // 4. Tái tính toán codes_count cho từng game (CHỈ TÍNH MÃ CÒN DÙNG ĐƯỢC)
  console.log('\n4. Tái tính toán codes_count (CHỈ TÍNH MÃ CÒN DÙNG ĐƯỢC - KHÔNG TÍNH MÃ HẾT HẠN):');
  let updatedGamesCount = 0;
  const rebalancedGames = gamesList.map((g) => {
    if (!g) return g;
    const slug = (g.slug || g.id || '').toLowerCase().trim();
    const rawId = (g.id || slug).toLowerCase().trim();
    const withoutMobile = slug.replace(/-mobile$/i, '');
    const withMobile = `${slug}-mobile`;

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

    const uniqueCodesMap = new Map();
    for (const k of possibleKeys) {
      const m = codesBySlug.get(k);
      if (m) {
        for (const [codeStr, item] of m.entries()) {
          if (!uniqueCodesMap.has(codeStr)) {
            uniqueCodesMap.set(codeStr, item);
          }
        }
      }
    }

    const allResolvedCodes = Array.from(uniqueCodesMap.values());
    const usableCodes = allResolvedCodes.filter(c => !isCodeExpired(c));
    const expiredCodes = allResolvedCodes.filter(c => isCodeExpired(c));

    const newCodesCount = usableCodes.length;
    const oldCodesCount = typeof g.codes_count === 'number' ? g.codes_count : 0;

    if (newCodesCount !== oldCodesCount) {
      updatedGamesCount++;
    }

    return {
      ...g,
      codes_count: newCodesCount,
      active_codes_count: newCodesCount,
      expired_codes_count: expiredCodes.length,
      total_codes_count: allResolvedCodes.length,
      free_codes_count: newCodesCount,
      updated_at: newCodesCount !== oldCodesCount ? new Date().toISOString() : (g.updated_at || g.created_at || new Date().toISOString())
    };
  });

  console.log(`  - Số lượng game được cập nhật codes_count: ${updatedGamesCount} / ${gamesList.length}`);

  // Kiểm tra riêng 3 game trọng điểm
  const wwm = rebalancedGames.find(g => g.slug === 'where-winds-meet-mobile' || g.slug === 'where-winds-meet');
  const yen = rebalancedGames.find(g => g.slug === 'yen-van-thap-luc-thanh');
  const df = rebalancedGames.find(g => g.slug === 'delta-force');
  const kt = rebalancedGames.find(g => g.slug === 'ky-tich-tro-lai');
  const tt = rebalancedGames.find(g => g.slug === 'thuc-than-ky');

  console.log('\n--- KIỂM TRA SỐ LIỆU TRỌNG ĐIỂM SAU TÁI CÂN BẰNG ---');
  console.log('Where Winds Meet:', wwm ? { name: wwm.name, slug: wwm.slug, codes_count: wwm.codes_count, total_codes_count: wwm.total_codes_count, expired_codes_count: wwm.expired_codes_count } : 'NOT FOUND');
  console.log('Yến Vân Thập Lục Thanh:', yen ? { name: yen.name, slug: yen.slug, codes_count: yen.codes_count, total_codes_count: yen.total_codes_count, expired_codes_count: yen.expired_codes_count } : 'NOT FOUND');
  console.log('Delta Force:', df ? { name: df.name, slug: df.slug, codes_count: df.codes_count, total_codes_count: df.total_codes_count, expired_codes_count: df.expired_codes_count } : 'NOT FOUND');
  console.log('Kỳ Tích Trở Lại (Kiểm tra bảo toàn):', kt ? { name: kt.name, slug: kt.slug, codes_count: kt.codes_count } : 'NOT FOUND');
  console.log('Thức Thần Ký (Kiểm tra bảo toàn):', tt ? { name: tt.name, slug: tt.slug, codes_count: tt.codes_count } : 'NOT FOUND');

  // 5. Lưu kết quả vào file local và D1
  console.log('\n5. Đang lưu file crawled_codes_188.json local...');
  fs.writeFileSync(bundledFile, JSON.stringify(dedupBundled.result, null, 2), 'utf8');
  if (fs.existsSync('public/data/codes_database.json')) {
    fs.writeFileSync('public/data/codes_database.json', JSON.stringify(dedupBundled.result), 'utf8');
  }

  console.log('6. Đang đồng bộ wcg_admin_custom_free_codes_v1 lên D1...');
  const saveCustomRes = await apiRequest('/api/sync', 'POST', {
    key: 'wcg_admin_custom_free_codes_v1',
    data: dedupCustom.result
  });
  console.log('  -> Kết quả wcg_admin_custom_free_codes_v1:', saveCustomRes.status, saveCustomRes.data?.success);

  console.log('7. Đang đồng bộ wcg_admin_free_codes_v5 lên D1...');
  const saveFreeRes = await apiRequest('/api/sync', 'POST', {
    key: 'wcg_admin_free_codes_v5',
    data: dedupFree.result
  });
  console.log('  -> Kết quả wcg_admin_free_codes_v5:', saveFreeRes.status, saveFreeRes.data?.success);

  console.log('8. Đang đồng bộ wcg_admin_games_v5 lên D1...');
  const saveGamesRes = await apiRequest('/api/sync', 'POST', {
    key: 'wcg_admin_games_v5',
    data: rebalancedGames
  });
  console.log('  -> Kết quả wcg_admin_games_v5:', saveGamesRes.status, saveGamesRes.data?.success);

  console.log('\n🎉 HOÀN TẤT DỌN DẸP & TÁI CÂN BẰNG THÀNH CÔNG 100%!');
}

main().catch(console.error);
