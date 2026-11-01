/**
 * SYNC SOURCE CODES ENGINE
 * Tự động đồng bộ giftcode chuẩn xác từ các nguồn uy tín (JSON API direct fetch),
 * loại bỏ việc cào HTML thô, tự động kiểm tra chéo (Cross-check) hạn sử dụng,
 * lọc trùng mã và chuẩn hóa slug alias cho toàn bộ hệ thống.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');

// Destination File Paths
const PATHS = {
  srcGames: path.join(ROOT_DIR, 'src/data/games188.json'),
  srcCodes: path.join(ROOT_DIR, 'src/data/crawled_codes_188.json'),
  publicGamesDb: path.join(ROOT_DIR, 'public/data/games_database.json'),
  publicCodesDb: path.join(ROOT_DIR, 'public/data/codes_database.json'),
  publicGames188: path.join(ROOT_DIR, 'public/data/games188.json'),
  publicCodes188: path.join(ROOT_DIR, 'public/data/crawled_codes_188.json'),
  dataService: path.join(ROOT_DIR, 'src/services/dataService.ts'),
  adminDataService: path.join(ROOT_DIR, 'src/admin/services/adminDataService.ts'),
};

// 1. Known Slug Aliases (Đồng bộ đa chiều cho các game có nhiều định danh)
const SLUG_ALIASES = {
  'pirate-legends': ['huyen-thoai-hai-tac'],
  'huyen-thoai-hai-tac': ['pirate-legends'],
};

// 2. Danh sách các mã quà tặng đã xác định hết hạn (Blacklist / Expired List)
const EXPLICIT_EXPIRED_CODES = new Set([
  'ATNGAY1',
  'ATNGAY2',
]);

// 3. Helper tải JSON an toàn
function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json, text/plain, */*',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// 4. Kiểm tra mã có hết hạn hay không (Cross-check logic)
function checkIsExpired(codeValue, expiresAtStr, rawStatus) {
  const normCode = (codeValue || '').trim().toUpperCase();
  if (EXPLICIT_EXPIRED_CODES.has(normCode)) {
    return true;
  }

  const s = (rawStatus || '').toString().toLowerCase();
  if (s === 'expired' || s === 'hethan' || s === 'closed') {
    return true;
  }

  if (expiresAtStr) {
    try {
      const expDate = new Date(expiresAtStr);
      const now = new Date();
      // Nếu ngày hết hạn < ngày hiện tại -> Hết hạn
      if (!isNaN(expDate.getTime()) && expDate < now) {
        return true;
      }
    } catch {}
  }

  return false;
}

async function runSync() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ GIFTCODE TỪ NGUỒN UY TÍN (DIRECT JSON FETCH)');
  console.log('================================================================');

  // Đọc dữ liệu local hiện tại
  if (!fs.existsSync(PATHS.srcGames) || !fs.existsSync(PATHS.srcCodes)) {
    console.error('❌ Lỗi: Không tìm thấy file dữ liệu nguồn trong src/data');
    process.exit(1);
  }

  const localGames = JSON.parse(fs.readFileSync(PATHS.srcGames, 'utf8'));
  const localCodes = JSON.parse(fs.readFileSync(PATHS.srcCodes, 'utf8'));
  console.log(`📦 Dữ liệu hiện tại: ${localGames.length} game | ${localCodes.length} codes`);

  // Tải trực tiếp Database JSON từ nguồn uy tín (codegame.store)
  console.log('\n[1/4] Đang nạp dữ liệu chuẩn từ https://codegame.store/data/...');
  const [remoteCodes, remoteGames] = await Promise.all([
    fetchJson('https://codegame.store/data/crawled_codes_188.json'),
    fetchJson('https://codegame.store/data/games188.json'),
  ]);

  if (!remoteCodes || !Array.isArray(remoteCodes)) {
    console.warn('⚠️ Cảnh báo: Không thể tải remote codes từ codegame.store, tiếp tục với dữ liệu local...');
  } else {
    console.log(`✓ Đã nạp thành công ${remoteCodes.length} codes từ codegame.store JSON API`);
  }

  // Tạo Map gom code theo game slug
  const codesByGame = new Map();

  function addCodeRecord(gameSlug, codeItem) {
    if (!gameSlug || !codeItem || !codeItem.codeValue) return;
    const cleanSlug = gameSlug.toLowerCase().trim();
    const cleanCode = codeItem.codeValue.trim().toUpperCase();

    if (!codesByGame.has(cleanSlug)) {
      codesByGame.set(cleanSlug, new Map());
    }

    const gameMap = codesByGame.get(cleanSlug);
    const existing = gameMap.get(cleanCode);

    const isExpired = checkIsExpired(cleanCode, codeItem.expiresAt || codeItem.expires_at, codeItem.status);

    const formatted = {
      id: codeItem.id || `code_${cleanSlug}_${cleanCode}`,
      gameId: cleanSlug,
      gameSlug: cleanSlug,
      game_slug: cleanSlug,
      slug: cleanSlug,
      gameName: codeItem.gameName || '',
      codeValue: cleanCode,
      code_value: cleanCode,
      code: cleanCode,
      gift_code: cleanCode,
      rewards: (codeItem.rewards || codeItem.description || 'Quà tặng tân thủ & sự kiện').trim(),
      description: (codeItem.rewards || codeItem.description || 'Quà tặng tân thủ & sự kiện').trim(),
      status: isExpired ? 'EXPIRED' : 'ACTIVE',
      is_active: !isExpired,
      is_verified: !isExpired,
      isVerified: !isExpired,
      expires_at: codeItem.expiresAt || codeItem.expires_at || null,
      expiresAt: codeItem.expiresAt || codeItem.expires_at || null,
      expiry: codeItem.expiresAt || codeItem.expires_at || null,
      sourceUrl: codeItem.sourceUrl || codeItem.source || 'https://codegame.store/',
      source: codeItem.sourceUrl || codeItem.source || 'https://codegame.store/',
      copyCount: codeItem.copyCount || 500,
      createdAt: codeItem.createdAt || codeItem.created_at || '2026-10-03T00:00:00Z',
      created_at: codeItem.createdAt || codeItem.created_at || '2026-10-03T00:00:00Z',
      added_at: codeItem.added_at || '2026-10-03T00:00:00Z',
    };

    if (!existing) {
      gameMap.set(cleanCode, formatted);
    } else {
      // Ưu tiên mô tả phần thưởng chi tiết hơn
      if (formatted.rewards.length > existing.rewards.length && !existing.rewards.includes('Rương')) {
        existing.rewards = formatted.rewards;
        existing.description = formatted.rewards;
      }
      // Trạng thái hết hạn luôn được tôn trọng nếu 1 trong 2 nguồn đánh dấu hết hạn
      if (isExpired) {
        existing.status = 'EXPIRED';
        existing.is_active = false;
        existing.is_verified = false;
        existing.isVerified = false;
      }
    }
  }

  // 1. Nạp local codes vào map
  console.log('\n[2/4] Đang tổng hợp và phân loại mã quà tặng...');
  for (const c of localCodes) {
    const slug = c.gameSlug || c.game_slug || c.slug || c.gameId;
    const val = c.codeValue || c.code_value || c.code || c.gift_code;
    if (slug && val) {
      addCodeRecord(slug, { ...c, codeValue: val });
    }
  }

  // 2. Nạp remote codes vào map
  if (remoteCodes && Array.isArray(remoteCodes)) {
    for (const c of remoteCodes) {
      const slug = c.gameSlug || c.game_slug || c.slug || c.gameId;
      const val = c.codeValue || c.code_value || c.code || c.gift_code;
      if (slug && val) {
        addCodeRecord(slug, { ...c, codeValue: val });
      }
    }
  }

  // 3. Đồng bộ hai chiều cho các Game Aliases (ví dụ pirate-legends <-> huyen-thoai-hai-tac)
  console.log('\n[3/4] Đồng bộ hai chiều các Game Aliases...');
  for (const [primarySlug, aliasList] of Object.entries(SLUG_ALIASES)) {
    const primaryMap = codesByGame.get(primarySlug) || new Map();
    for (const alias of aliasList) {
      const aliasMap = codesByGame.get(alias) || new Map();
      // Gộp alias vào primary
      for (const [code, item] of aliasMap.entries()) {
        if (!primaryMap.has(code)) {
          primaryMap.set(code, { ...item, gameSlug: primarySlug, game_slug: primarySlug, gameId: primarySlug });
        }
      }
      // Gộp primary vào alias
      for (const [code, item] of primaryMap.entries()) {
        if (!aliasMap.has(code)) {
          aliasMap.set(code, { ...item, gameSlug: alias, game_slug: alias, gameId: alias });
        }
      }
      codesByGame.set(alias, aliasMap);
    }
    codesByGame.set(primarySlug, primaryMap);
  }

  // Tạo danh sách code hoàn chỉnh đã deduplicate và cross-check
  const finalCodesList = [];
  let totalActive = 0;
  let totalExpired = 0;

  for (const [, gameMap] of codesByGame.entries()) {
    for (const codeItem of gameMap.values()) {
      finalCodesList.push(codeItem);
      if (codeItem.status === 'ACTIVE') totalActive++;
      else totalExpired++;
    }
  }

  // Cập nhật lại games list với codes_count và free_codes_count chính xác
  const updatedGames = localGames.map((g) => {
    const slug = (g.slug || g.id || '').toLowerCase();
    const gameMap = codesByGame.get(slug);
    const totalCount = gameMap ? gameMap.size : 0;
    let activeCount = 0;
    if (gameMap) {
      for (const c of gameMap.values()) {
        if (c.status === 'ACTIVE') activeCount++;
      }
    }

    return {
      ...g,
      codes_count: totalCount,
      free_codes_count: activeCount,
      updated_at: new Date().toISOString(),
    };
  });

  // Nếu có game mới từ remoteGames mà local chưa có -> bổ sung
  if (remoteGames && Array.isArray(remoteGames)) {
    const localSlugs = new Set(updatedGames.map((g) => (g.slug || '').toLowerCase()));
    for (const rg of remoteGames) {
      const rSlug = (rg.slug || rg.id || '').toLowerCase();
      if (rSlug && !localSlugs.has(rSlug)) {
        const gameMap = codesByGame.get(rSlug);
        const totalCount = gameMap ? gameMap.size : 0;
        let activeCount = 0;
        if (gameMap) {
          for (const c of gameMap.values()) {
            if (c.status === 'ACTIVE') activeCount++;
          }
        }
        updatedGames.push({
          ...rg,
          codes_count: totalCount,
          free_codes_count: activeCount,
          status: 'APPROVED',
          is_active: true,
          updated_at: new Date().toISOString(),
        });
        localSlugs.add(rSlug);
      }
    }
  }

  console.log('\n[4/4] Đang ghi dữ liệu đồng bộ vào 6 vị trí lưu trữ...');
  fs.writeFileSync(PATHS.srcGames, JSON.stringify(updatedGames, null, 2), 'utf8');
  fs.writeFileSync(PATHS.srcCodes, JSON.stringify(finalCodesList, null, 2), 'utf8');
  fs.writeFileSync(PATHS.publicGamesDb, JSON.stringify(updatedGames, null, 2), 'utf8');
  fs.writeFileSync(PATHS.publicCodesDb, JSON.stringify(finalCodesList, null, 2), 'utf8');
  fs.writeFileSync(PATHS.publicGames188, JSON.stringify(updatedGames, null, 2), 'utf8');
  fs.writeFileSync(PATHS.publicCodes188, JSON.stringify(finalCodesList, null, 2), 'utf8');

  console.log('================================================================');
  console.log('🎉 ĐỒNG BỘ THÀNH CÔNG:');
  console.log(`  ✓ Tổng số tựa game: ${updatedGames.length}`);
  console.log(`  ✓ Tổng số giftcode: ${finalCodesList.length}`);
  console.log(`  ✓ Mã còn hạn (ACTIVE): ${totalActive}`);
  console.log(`  ✓ Mã hết hạn (EXPIRED): ${totalExpired}`);
  console.log('================================================================');
}

runSync().catch(console.error);
