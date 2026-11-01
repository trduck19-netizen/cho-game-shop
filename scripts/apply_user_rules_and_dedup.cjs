const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_GAMES_PATH = path.join(ROOT, 'src/data/games188.json');
const PUBLIC_GAMES_PATH = path.join(ROOT, 'public/data/games188.json');
const SRC_CODES_PATH = path.join(ROOT, 'src/data/crawled_codes_188.json');
const PUBLIC_CODES_PATH = path.join(ROOT, 'public/data/crawled_codes_188.json');
const DB_GAMES_PATH = path.join(ROOT, 'public/data/games_database.json');
const DB_CODES_PATH = path.join(ROOT, 'public/data/codes_database.json');

function run() {
  console.log('=== BẮT ĐẦU ÁP DỤNG QUY TẮC CỦA NGƯỜI DÙNG ===');
  console.log('1. Lọc bỏ toàn bộ code có từ 5 chữ cái trở xuống (chỉ giữ code > 5 ký tự)');
  console.log('2. Đổi phần thưởng / nguồn thành "Phần thưởng từ nhà phát hành"');
  console.log('3. Lọc trùng triệt để các game, chỉ để lại đúng 1 bản duy nhất cho mỗi game\n');

  let games = JSON.parse(fs.readFileSync(SRC_GAMES_PATH, 'utf8'));
  let codes = JSON.parse(fs.readFileSync(SRC_CODES_PATH, 'utf8'));

  console.log(`Số game ban đầu: ${games.length}`);
  console.log(`Số code ban đầu: ${codes.length}`);

  // Mapping duplicate slugs to canonical slug
  // [duplicateSlugToDelete]: canonicalSlugToKeep
  const aliasMap = {
    'giang-ho-ky-ngo-vplay': 'giang-ho-ky-ngo',
    'play-together-vng': 'play-together',
    'the-seven-deadly-sins-origin': 'seven-deadly-sins-origin',
    'gunny-origin-vng': 'gunny-origin',
    'sieu-tien-hoa-mobile': 'sieu-tien-hoa',
    'huyen-thoai-hai-tac': 'pirate-legends',
    'dau-truong-chan-ly-mobile': 'dau-truong-chan-ly',
    'ta-la-hac-ngo-khong-vplay': 'ta-la-hac-ngo-khong'
  };

  const toDelete = new Set(Object.keys(aliasMap));

  // Also check any games with identical normalized names
  function clean(name = '') {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\b(vng|gosu|vplay|sohagame|gamota|funtap|mobile|3d|2d|online)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  const seenNames = new Map();
  for (const g of games) {
    if (toDelete.has(g.slug)) continue;
    const cName = clean(g.name);
    if (!cName) continue;
    if (seenNames.has(cName)) {
      const existing = seenNames.get(cName);
      console.log(`[Phát hiện trùng] "${g.name}" (${g.slug}) trùng với "${existing.name}" (${existing.slug}) -> Gộp vào ${existing.slug}`);
      toDelete.add(g.slug);
      aliasMap[g.slug] = existing.slug;
    } else {
      seenNames.set(cName, g);
    }
  }

  console.log(`\n=> Tổng số game trùng bị loại bỏ: ${toDelete.size}`);

  // 1. Filter out duplicate games
  const filteredGames = games.filter(g => !toDelete.has(g.slug));

  // 2. Process codes
  const validCodes = [];
  const seenCodeKey = new Set();
  let skippedShortCount = 0;
  let remappedCount = 0;

  for (const c of codes) {
    let slug = c.gameSlug || c.game_slug || c.slug || c.gameId;
    if (aliasMap[slug]) {
      slug = aliasMap[slug];
      remappedCount++;
    }

    const codeVal = (c.code || c.codeValue || c.code_value || c.gift_code || '').trim();

    // RULE 1: Những code có từ 5 chữ cái trở xuống không nhập (chỉ giữ code có độ dài > 5)
    if (codeVal.length <= 5) {
      skippedShortCount++;
      continue;
    }

    // RULE 2: Lọc trùng code trong cùng 1 game
    const dedupeKey = `${slug}___${codeVal.toUpperCase()}`;
    if (seenCodeKey.has(dedupeKey)) {
      continue;
    }
    seenCodeKey.add(dedupeKey);

    // RULE 3: Nguồn hoặc phần thưởng ghi là "Phần thưởng từ nhà phát hành"
    const rewardText = '🎁 Phần thưởng từ nhà phát hành';
    validCodes.push({
      id: `code_${slug}_${codeVal}`,
      gameId: slug,
      gameSlug: slug,
      game_slug: slug,
      slug: slug,
      gameName: c.gameName || slug,
      code: codeVal,
      codeValue: codeVal,
      code_value: codeVal,
      gift_code: codeVal,
      rewards: rewardText,
      description: rewardText,
      status: c.status || 'ACTIVE',
      is_active: c.is_active !== undefined ? c.is_active : true,
      is_verified: true,
      isVerified: true,
      expires_at: c.expires_at || c.expiresAt || '2026-12-31',
      expiresAt: c.expiresAt || c.expires_at || '2026-12-31',
      expiry: c.expiry || c.expires_at || '2026-12-31',
      sourceUrl: c.sourceUrl || `https://codemoi.net/games/${slug}/`,
      source: 'Phần thưởng từ nhà phát hành',
      copyCount: c.copyCount || 250,
      createdAt: c.createdAt || '2026-10-09T00:00:00Z',
      created_at: c.created_at || '2026-10-09T00:00:00Z',
      added_at: c.added_at || '2026-10-09T00:00:00Z',
    });
  }

  console.log(`=> Đã loại bỏ ${skippedShortCount} mã có từ 5 ký tự trở xuống.`);
  console.log(`=> Đã chuyển tiếp ${remappedCount} mã từ game trùng về game chuẩn.`);
  console.log(`=> Số giftcode sạch còn lại: ${validCodes.length}`);

  // Recalculate codes_count for each canonical game
  const countsBySlug = {};
  for (const c of validCodes) {
    countsBySlug[c.gameSlug] = (countsBySlug[c.gameSlug] || 0) + 1;
  }

  for (const g of filteredGames) {
    g.codes_count = countsBySlug[g.slug] || 0;
    g.free_codes_count = countsBySlug[g.slug] || 0;
  }

  console.log(`=> Danh sách game chuẩn sau lọc trùng: ${filteredGames.length} game.`);

  // Write files
  fs.writeFileSync(SRC_GAMES_PATH, JSON.stringify(filteredGames, null, 2), 'utf8');
  fs.writeFileSync(PUBLIC_GAMES_PATH, JSON.stringify(filteredGames, null, 2), 'utf8');
  fs.writeFileSync(DB_GAMES_PATH, JSON.stringify(filteredGames), 'utf8');

  fs.writeFileSync(SRC_CODES_PATH, JSON.stringify(validCodes, null, 2), 'utf8');
  fs.writeFileSync(PUBLIC_CODES_PATH, JSON.stringify(validCodes, null, 2), 'utf8');
  fs.writeFileSync(DB_CODES_PATH, JSON.stringify(validCodes), 'utf8');

  console.log('\n✅ Đã lưu dữ liệu sạch vào tất cả các tệp JSON.');
}

run();
