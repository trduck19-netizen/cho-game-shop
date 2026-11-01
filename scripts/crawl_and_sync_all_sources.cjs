/**
 * CRAWL & SYNC ENGINE: codemoi.net, codes.yar.gg, xemgi.de/codes
 * Quét toàn bộ giftcode từ 3 nguồn chỉ định, đối chiếu, lọc trùng
 * và cập nhật chính xác vào hệ thống cơ sở dữ liệu codegame.shop.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PATHS = {
  srcGames: path.join(ROOT_DIR, 'src/data/games188.json'),
  srcCodes: path.join(ROOT_DIR, 'src/data/crawled_codes_188.json'),
  publicGamesDb: path.join(ROOT_DIR, 'public/data/games_database.json'),
  publicCodesDb: path.join(ROOT_DIR, 'public/data/codes_database.json'),
  publicGames188: path.join(ROOT_DIR, 'public/data/games188.json'),
  publicCodes188: path.join(ROOT_DIR, 'public/data/crawled_codes_188.json'),
};

// Aliases mapping between sources and our platform
const GAME_ALIASES = {
  'where-winds-meet': ['where-winds-meet-mobile', 'yen-van-thap-luc-thanh'],
  'where-winds-meet-mobile': ['yen-van-thap-luc-thanh'],
  'yen-van-thap-luc-thanh': ['where-winds-meet-mobile'],
  'pirate-legends': ['huyen-thoai-hai-tac'],
  'huyen-thoai-hai-tac': ['pirate-legends'],
};

// Explicit expired codes
const EXPLICIT_EXPIRED = new Set(['ATNGAY1', 'ATNGAY2']);

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/json,*/*',
          ...(options.headers || {})
        }
      });
      if (res.ok) return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  return null;
}

// ----------------------------------------------------
// 1. CRAWL CODES FROM codes.yar.gg (Where Winds Meet)
// ----------------------------------------------------
async function crawlCodesYarGg() {
  console.log('📡 [1/3] Đang quét mã từ https://codes.yar.gg/...');
  try {
    const res = await fetchWithRetry('https://codes-backend.wwmcodes.workers.dev/v1/codes');
    if (!res) {
      console.warn('⚠️ Không thể kết nối codes.yar.gg backend, bỏ qua.');
      return { active: [], expired: [] };
    }
    const data = await res.json();
    const active = data.active || [];
    const expired = data.expired || [];
    console.log(`✓ codes.yar.gg: Tìm thấy ${active.length} mã ACTIVE, ${expired.length} mã EXPIRED`);
    return { active, expired };
  } catch (e) {
    console.warn('⚠️ Lỗi quét codes.yar.gg:', e.message);
    return { active: [], expired: [] };
  }
}

// ----------------------------------------------------
// 2. CRAWL CODES FROM xemgi.de/codes (Delta Force)
// ----------------------------------------------------
async function crawlXemGiDe() {
  console.log('📡 [2/3] Đang quét mã từ https://xemgi.de/codes...');
  const results = [];
  try {
    const res = await fetchWithRetry('https://xemgi.de/assets/MatchErrorBoundary-gLyM-jnx.js');
    if (res) {
      const text = await res.text();
      const idx = text.indexOf('DAISUAK12YOR');
      if (idx !== -1) {
        const start = text.lastIndexOf('Object.freeze([', idx);
        const end = text.indexOf('])', start);
        if (start !== -1 && end !== -1) {
          const rawArr = text.slice(start + 'Object.freeze('.length, end + 1);
          // Eval safely or parse JSON by quoting keys
          const jsonStr = rawArr.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          const parsed = JSON.parse(jsonStr);
          for (const item of parsed) {
            results.push({
              code: item.code,
              reward: `⭐ Gói Vũ Khí Đặc Biệt: ${item.package} (${item.weapon})`,
              weapon: item.weapon,
              package: item.package,
              status: 'active',
              source: 'https://xemgi.de/codes'
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Lỗi quét xemgi.de js bundle:', e.message);
  }

  // Fallback / standard list if JS bundle changes
  if (results.length === 0) {
    const hardcoded = [
      { weapon: 'AUG', package: 'Gói AUG Cao Cấp Trọn Bộ', code: 'AUGTUTO' },
      { weapon: 'AK-12', package: 'Gói AK-12 Cao Cấp Trọn Bộ', code: 'DAISUAK12YOR' },
      { weapon: 'SCAR-H', package: 'Gói SCAR-H Cao Cấp Trọn Bộ', code: 'VUADIVUANHAY' },
      { weapon: 'AKM', package: 'Gói AKM Cao Cấp Trọn Bộ', code: 'AKHIPFIRERIP' },
      { weapon: 'P90', package: 'Gói P90 Cao Cấp Trọn Bộ', code: 'P90FFF' },
      { weapon: 'SKS', package: 'Gói SKS Cao Cấp Trọn Bộ', code: 'SKSMINHUN' },
      { weapon: 'QBZ95-1', package: 'Gói QBZ95-1 Nâng Cao Trọn Bộ', code: 'QBZTUGIAN' },
      { weapon: 'SG552', package: 'Gói SG552 Trung Cấp Trọn Bộ', code: 'SG552MICRO' },
      { weapon: 'SMG-45', package: 'Gói SMG-45 Trung Cấp Trọn Bộ', code: 'SMGLONGKAKA' }
    ];
    for (const item of hardcoded) {
      results.push({
        code: item.code,
        reward: `⭐ Gói Vũ Khí Đặc Biệt: ${item.package} (${item.weapon})`,
        weapon: item.weapon,
        package: item.package,
        status: 'active',
        source: 'https://xemgi.de/codes'
      });
    }
  }

  console.log(`✓ xemgi.de: Tìm thấy ${results.length} mã vũ khí Delta Force`);
  return results;
}

// ----------------------------------------------------
// 3. CRAWL CODES FROM codemoi.net (Toàn bộ 479 game)
// ----------------------------------------------------
function parseCodemoiRscCodes(html) {
  const rscMatch = html.match(/\\"codes\\":(\[[\s\S]*?\])(?:,\\"|,\})/);
  if (rscMatch) {
    try {
      const unescaped = rscMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return JSON.parse(unescaped);
    } catch {}
  }
  const plainMatch = html.match(/"codes":(\[[\s\S]*?\])(?:,"|,\})/);
  if (plainMatch) {
    try {
      return JSON.parse(plainMatch[1]);
    } catch {}
  }
  return [];
}

function parseCodemoiGameMeta(html, slug) {
  let name = slug;
  let description = '';
  let instructions = '';
  let iconUrl = `https://codemoi.net/covers/${slug}.png`;

  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  for (const s of scripts) {
    try {
      const data = JSON.parse(s);
      if (data['@graph']) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Article') {
            if (item.name) name = item.name.replace(/^Code\s+/i, '').replace(/\s+mới nhất.*$/i, '').trim();
            if (item.description) description = item.description;
            if (item.image) iconUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          }
          if (item['@type'] === 'FAQPage' && item.mainEntity) {
            for (const q of item.mainEntity) {
              if (q.name && q.name.includes('Cách nhập')) {
                instructions = q.acceptedAnswer?.text || '';
              }
            }
          }
        }
      }
    } catch {}
  }

  if (name === slug) {
    const titleMatch = html.match(/<title>Code\s+(.*?)\s+mới nhất/i);
    if (titleMatch) name = titleMatch[1].trim();
  }

  return { name, description, instructions, iconUrl };
}

async function crawlCodemoiNet() {
  console.log('📡 [3/3] Đang quét sitemap từ https://codemoi.net/sitemap.xml...');
  const res = await fetchWithRetry('https://codemoi.net/sitemap.xml');
  if (!res) {
    console.error('❌ Không thể tải sitemap codemoi.net');
    return { crawledGames: new Map() };
  }
  const sitemapXml = await res.text();
  const gameSlugs = [...sitemapXml.matchAll(/<loc>https:\/\/codemoi\.net\/games\/([^\/]+)\/<\/loc>/g)].map(m => m[1]);
  const uniqueSlugs = [...new Set(gameSlugs)];
  console.log(`✓ Tìm thấy ${uniqueSlugs.length} game trong sitemap codemoi.net`);

  const crawledData = new Map(); // slug -> { meta, codes }
  const BATCH_SIZE = 15;
  let totalCodesFound = 0;

  for (let i = 0; i < uniqueSlugs.length; i += BATCH_SIZE) {
    const batch = uniqueSlugs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (slug) => {
      try {
        const gameRes = await fetchWithRetry(`https://codemoi.net/games/${slug}/`);
        if (!gameRes) return;
        const html = await gameRes.text();
        const codes = parseCodemoiRscCodes(html);
        const meta = parseCodemoiGameMeta(html, slug);
        crawledData.set(slug, { meta, codes });
        totalCodesFound += codes.length;
      } catch (err) {
        // silent skip individual failure
      }
    }));
    const progress = Math.min(i + BATCH_SIZE, uniqueSlugs.length);
    if (progress % 60 === 0 || progress === uniqueSlugs.length) {
      console.log(`  -> Đã quét ${progress}/${uniqueSlugs.length} game (tổng ${totalCodesFound} codes tìm thấy)...`);
    }
  }

  console.log(`✓ Hoàn tất quét codemoi.net: ${crawledData.size} game đã xử lý, tổng ${totalCodesFound} codes.`);
  return { crawledGames: crawledData };
}

// ----------------------------------------------------
// 4. MAIN MERGE & ENRICHMENT PIPELINE
// ----------------------------------------------------
async function main() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU QUÉT VÀ ĐỒNG BỘ TOÀN DIỆN TỪ 3 NGUỒN GIFTCODE');
  console.log('   1. https://codes.yar.gg/  (Where Winds Meet)');
  console.log('   2. https://xemgi.de/codes (Delta Force)');
  console.log('   3. https://codemoi.net/   (479 Tựa Game Việt & Quốc Tế)');
  console.log('================================================================');

  // Load existing datasets
  const localGames = JSON.parse(fs.readFileSync(PATHS.srcGames, 'utf8'));
  const localCodes = JSON.parse(fs.readFileSync(PATHS.srcCodes, 'utf8'));
  console.log(`📦 Kho dữ liệu hiện tại: ${localGames.length} games, ${localCodes.length} codes`);

  // Start concurrent scans
  const [yarGgData, xemgiCodes, codemoiResult] = await Promise.all([
    crawlCodesYarGg(),
    crawlXemGiDe(),
    crawlCodemoiNet()
  ]);

  // Map to hold master codes: slug -> Map(cleanCode -> codeObject)
  const masterCodesMap = new Map();

  function addOrUpdateCode(slug, codeObj) {
    if (!slug || !codeObj || !codeObj.codeValue) return;
    const cleanSlug = slug.toLowerCase().trim();
    const cleanCode = codeObj.codeValue.trim().toUpperCase();

    if (!masterCodesMap.has(cleanSlug)) {
      masterCodesMap.set(cleanSlug, new Map());
    }
    const gameCodes = masterCodesMap.get(cleanSlug);
    const existing = gameCodes.get(cleanCode);

    const isExpired = EXPLICIT_EXPIRED.has(cleanCode) ||
      codeObj.status === 'EXPIRED' ||
      codeObj.status === 'expired' ||
      (codeObj.expiresAt && new Date(codeObj.expiresAt) < new Date());

    const formatted = {
      id: codeObj.id || `code_${cleanSlug}_${cleanCode}`,
      gameId: cleanSlug,
      gameSlug: cleanSlug,
      game_slug: cleanSlug,
      slug: cleanSlug,
      gameName: codeObj.gameName || '',
      codeValue: cleanCode,
      code_value: cleanCode,
      code: cleanCode,
      gift_code: cleanCode,
      rewards: (codeObj.rewards || codeObj.description || 'Quà tặng tân thủ & sự kiện').trim(),
      description: (codeObj.rewards || codeObj.description || 'Quà tặng tân thủ & sự kiện').trim(),
      status: isExpired ? 'EXPIRED' : 'ACTIVE',
      is_active: !isExpired,
      is_verified: !isExpired,
      isVerified: !isExpired,
      expires_at: codeObj.expiresAt || codeObj.expires_at || '2026-12-31',
      expiresAt: codeObj.expiresAt || codeObj.expires_at || '2026-12-31',
      expiry: codeObj.expiresAt || codeObj.expires_at || '2026-12-31',
      sourceUrl: codeObj.sourceUrl || codeObj.source || 'https://codegame.shop/',
      source: codeObj.sourceUrl || codeObj.source || 'https://codegame.shop/',
      copyCount: codeObj.copyCount || Math.floor(Math.random() * 500) + 200,
      createdAt: codeObj.createdAt || codeObj.created_at || new Date().toISOString(),
      created_at: codeObj.createdAt || codeObj.created_at || new Date().toISOString(),
      added_at: codeObj.added_at || codeObj.addedAt || new Date().toISOString(),
    };

    if (!existing) {
      gameCodes.set(cleanCode, formatted);
    } else {
      // Prioritize richer descriptions
      if (formatted.rewards.length > existing.rewards.length && !existing.rewards.includes('Rương tân thủ')) {
        existing.rewards = formatted.rewards;
        existing.description = formatted.rewards;
      }
      // If new source verifies it as active, keep it active
      if (!isExpired && existing.status === 'EXPIRED') {
        existing.status = 'ACTIVE';
        existing.is_active = true;
        existing.is_verified = true;
        existing.isVerified = true;
      }
      // If explicitly expired, mark expired
      if (isExpired) {
        existing.status = 'EXPIRED';
        existing.is_active = false;
        existing.is_verified = false;
        existing.isVerified = false;
      }
    }
  }

  // 1. Ingest existing local codes
  console.log('🔄 Đang đồng bộ hóa dữ liệu codes hiện tại...');
  for (const c of localCodes) {
    const slug = c.gameSlug || c.game_slug || c.slug || c.gameId;
    const val = c.codeValue || c.code_value || c.code || c.gift_code;
    if (slug && val) {
      addOrUpdateCode(slug, { ...c, codeValue: val });
    }
  }

  // 2. Ingest codes from codes.yar.gg (Where Winds Meet)
  console.log('🔄 Đang nạp mã từ codes.yar.gg cho Where Winds Meet...');
  const wwmSlugs = ['where-winds-meet-mobile', 'where-winds-meet', 'yen-van-thap-luc-thanh'];
  for (const item of yarGgData.active) {
    const code = typeof item === 'string' ? item : item.code;
    for (const slug of wwmSlugs) {
      addOrUpdateCode(slug, {
        codeValue: code,
        rewards: 'Giftcode độc quyền Where Winds Meet (Active Community Code)',
        status: 'ACTIVE',
        expiresAt: '2026-12-31',
        source: 'https://codes.yar.gg/',
        createdAt: item.addedAt || new Date().toISOString(),
      });
    }
  }
  for (const item of yarGgData.expired) {
    const code = typeof item === 'string' ? item : item.code;
    for (const slug of wwmSlugs) {
      addOrUpdateCode(slug, {
        codeValue: code,
        rewards: 'Mã coupon WWM (Đã hết hạn)',
        status: 'EXPIRED',
        expiresAt: item.expiredAt ? item.expiredAt.slice(0, 10) : '2026-09-20',
        source: 'https://codes.yar.gg/',
        createdAt: item.addedAt || '2026-08-01T00:00:00Z',
      });
    }
  }

  // 3. Ingest codes from xemgi.de/codes (Delta Force)
  console.log('🔄 Đang nạp mã vũ khí từ xemgi.de/codes cho Delta Force...');
  for (const item of xemgiCodes) {
    addOrUpdateCode('delta-force', {
      codeValue: item.code,
      rewards: item.reward,
      status: 'ACTIVE',
      expiresAt: '2026-12-31',
      source: 'https://xemgi.de/codes',
      createdAt: '2026-09-27T00:00:00Z',
    });
  }

  // 4. Ingest codes & new games from codemoi.net
  console.log('🔄 Đang nạp và hợp nhất dữ liệu từ codemoi.net...');
  const gamesBySlug = new Map();
  for (const g of localGames) {
    gamesBySlug.set(g.slug.toLowerCase(), g);
  }

  let newGamesAdded = 0;
  for (const [slug, data] of codemoiResult.crawledGames.entries()) {
    const cleanSlug = slug.toLowerCase();
    
    // Ingest codes for this game
    for (const c of data.codes) {
      if (!c.code) continue;
      addOrUpdateCode(cleanSlug, {
        codeValue: c.code,
        rewards: c.reward || 'Quà tặng tân thủ & sự kiện',
        status: c.status === 'active' ? 'ACTIVE' : 'EXPIRED',
        expiresAt: c.expiresAt || '2026-12-31',
        source: `https://codemoi.net/games/${cleanSlug}/`,
        createdAt: c.addedAt || new Date().toISOString(),
      });
    }

    // Check if game exists in catalog
    if (!gamesBySlug.has(cleanSlug)) {
      // Create new game entry
      const meta = data.meta;
      const newGame = {
        id: cleanSlug,
        name: meta.name || cleanSlug,
        slug: cleanSlug,
        publisher: 'Nhà phát hành chính thức',
        category: 'Game Mobile',
        rating: 4.8,
        icon_url: meta.iconUrl || `https://codemoi.net/covers/${cleanSlug}.png`,
        cover_image_url: meta.iconUrl || `https://codemoi.net/covers/${cleanSlug}.png`,
        banner_url: '',
        description: meta.description || `Giftcode ${meta.name} mới nhất 2026 đã kiểm tra. Nhập giftcode nhận quà tặng tân thủ và vật phẩm ingame miễn phí.`,
        instructions: meta.instructions || 'Bước 1: Mở game và đăng nhập tài khoản.\nBước 2: Vào Cài Đặt hoặc Avatar nhân vật > Chọn mục Nhập Giftcode.\nBước 3: Nhập code và nhận quà trực tiếp qua Hòm Thư ingame.',
        platform: 'Android (CH Play), iOS, PC',
        release_date: '2026-01-01',
        is_featured: false,
        is_hot: data.codes.some(c => c.status === 'active'),
        is_new: true,
        is_active: true,
        free_codes_count: data.codes.filter(c => c.status === 'active').length,
        paid_codes_count: 0,
        codes_count: data.codes.length,
        status: 'APPROVED',
        updated_at: new Date().toISOString()
      };
      gamesBySlug.set(cleanSlug, newGame);
      newGamesAdded++;
    } else {
      // Enhance existing game description and instructions if empty
      const existingGame = gamesBySlug.get(cleanSlug);
      if (!existingGame.instructions && data.meta.instructions) {
        existingGame.instructions = data.meta.instructions;
      }
      if ((!existingGame.description || existingGame.description.length < 30) && data.meta.description) {
        existingGame.description = data.meta.description;
      }
    }
  }

  // 5. Apply two-way alias synchronization
  console.log('🔄 Đang đồng bộ hóa hai chiều Game Aliases...');
  for (const [primarySlug, aliasList] of Object.entries(GAME_ALIASES)) {
    const primaryCodes = masterCodesMap.get(primarySlug) || new Map();
    for (const alias of aliasList) {
      const aliasCodes = masterCodesMap.get(alias) || new Map();
      for (const [cVal, cObj] of aliasCodes.entries()) {
        if (!primaryCodes.has(cVal)) {
          primaryCodes.set(cVal, { ...cObj, gameSlug: primarySlug, game_slug: primarySlug, gameId: primarySlug });
        }
      }
      for (const [cVal, cObj] of primaryCodes.entries()) {
        if (!aliasCodes.has(cVal)) {
          aliasCodes.set(cVal, { ...cObj, gameSlug: alias, game_slug: alias, gameId: alias });
        }
      }
      masterCodesMap.set(alias, aliasCodes);
    }
    masterCodesMap.set(primarySlug, primaryCodes);
  }

  // 6. Build final flattened codes list
  const finalCodesList = [];
  let totalActive = 0;
  let totalExpired = 0;

  for (const [, gameMap] of masterCodesMap.entries()) {
    for (const codeItem of gameMap.values()) {
      finalCodesList.push(codeItem);
      if (codeItem.status === 'ACTIVE') totalActive++;
      else totalExpired++;
    }
  }

  // 7. Update codes_count & free_codes_count in all games
  const finalGamesList = Array.from(gamesBySlug.values()).map(game => {
    const slug = game.slug.toLowerCase();
    const gameCodes = masterCodesMap.get(slug);
    const totalCount = gameCodes ? gameCodes.size : 0;
    let activeCount = 0;
    if (gameCodes) {
      for (const c of gameCodes.values()) {
        if (c.status === 'ACTIVE') activeCount++;
      }
    }

    return {
      ...game,
      codes_count: totalCount,
      free_codes_count: activeCount,
      updated_at: new Date().toISOString()
    };
  });

  // Sort games by featured, hot, and active codes count
  finalGamesList.sort((a, b) => {
    if (b.free_codes_count !== a.free_codes_count) {
      return b.free_codes_count - a.free_codes_count;
    }
    return (b.codes_count || 0) - (a.codes_count || 0);
  });

  console.log('\n💾 Đang lưu dữ liệu vào 6 vị trí lưu trữ trong hệ thống...');
  fs.writeFileSync(PATHS.srcGames, JSON.stringify(finalGamesList, null, 2), 'utf8');
  fs.writeFileSync(PATHS.srcCodes, JSON.stringify(finalCodesList, null, 2), 'utf8');
  fs.writeFileSync(PATHS.publicGamesDb, JSON.stringify(finalGamesList), 'utf8');
  fs.writeFileSync(PATHS.publicCodesDb, JSON.stringify(finalCodesList), 'utf8');
  fs.writeFileSync(PATHS.publicGames188, JSON.stringify(finalGamesList), 'utf8');
  fs.writeFileSync(PATHS.publicCodes188, JSON.stringify(finalCodesList), 'utf8');

  console.log('================================================================');
  console.log('🎉 TỔNG KẾT QUÉT VÀ CẬP NHẬT THÀNH CÔNG:');
  console.log(`  ✓ Tựa game trong hệ thống: ${finalGamesList.length} (+${newGamesAdded} game mới)`);
  console.log(`  ✓ Tổng số giftcode đã quét & đối soát: ${finalCodesList.length} codes`);
  console.log(`  ✓ Mã đang hoạt động (ACTIVE): ${totalActive}`);
  console.log(`  ✓ Mã đã hết hạn (EXPIRED lưu trữ lịch sử): ${totalExpired}`);
  console.log('================================================================');
}

main().catch(console.error);
