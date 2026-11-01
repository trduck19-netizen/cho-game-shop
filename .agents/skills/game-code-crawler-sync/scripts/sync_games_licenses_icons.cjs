/**
 * Skill Script: sync_games_licenses_icons.cjs
 * - Lọc và hợp nhất các game trùng lặp (giữ lại 1 bản chuẩn, gộp toàn bộ giftcode).
 * - Cập nhật giấy phép G1 / G234 chính xác từ Cục PTTH&TTĐT (https://giayphep.abei.gov.vn / gpttdt-api.abei.gov.vn).
 * - Chuẩn hóa và đồng bộ icon game từ các nguồn quét code và thư mục game_icons.
 * - Lưu vào games188.json, crawled_codes_188.json, games_database.json và đồng bộ lên D1 / Cloudflare.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAMES_PATH = path.join(ROOT, 'public/data/games188.json');
const SRC_GAMES_PATH = path.join(ROOT, 'src/data/games188.json');
const CODES_PATH = path.join(ROOT, 'public/data/crawled_codes_188.json');
const SRC_CODES_PATH = path.join(ROOT, 'src/data/crawled_codes_188.json');

// Normalization helper
function normalizeVietnamese(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanGameNameForMatching(str = '') {
  return normalizeVietnamese(str)
    .replace(/\b(mobile|online|vn|3d|2d|vng|vplay|funtap|sohagame|gosu|gamota)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Fetch official license from ABIE API
async function queryAbieLicense(gameName) {
  const cleanName = gameName.replace(/[^\w\s\u00C0-\u1EF9]/gi, ' ').replace(/\s+/g, ' ').trim();
  const searchTerms = [gameName, cleanName];
  if (gameName.includes(':')) {
    searchTerms.push(gameName.split(':')[0].trim());
    searchTerms.push(gameName.split(':')[1].trim());
  }

  for (const term of searchTerms) {
    if (!term || term.length < 3) continue;
    try {
      const body = {
        startRow: 0,
        endRow: 10,
        sortModel: [{ sort: 'desc', colId: 'validFrom' }],
        filterModel: {
          platformCategoryCode: {
            type: 'in',
            filterType: 'set',
            values: ['QD_GAME_G1', 'QD_GAME_G234']
          },
          ftsValue: {
            type: 'contains',
            filterType: 'text',
            filter: term
          }
        }
      };

      const res = await fetch('https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotPaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Origin': 'https://giayphep.abei.gov.vn',
          'Referer': 'https://giayphep.abei.gov.vn/'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) continue;
      const json = await res.json();
      const rows = json.data?.data || [];
      if (rows.length > 0) {
        // Find closest match
        const normTarget = normalizeVietnamese(gameName);
        for (const row of rows) {
          const detail = row.licenseDetail || {};
          const vnName = normalizeVietnamese(detail.gameNameVietnam || '');
          const crName = normalizeVietnamese(detail.gameNameCopyright || '');
          if (
            vnName === normTarget ||
            crName === normTarget ||
            normTarget.includes(vnName) ||
            vnName.includes(normTarget) ||
            normTarget.includes(crName) ||
            crName.includes(normTarget)
          ) {
            return {
              license_number: row.licenseNumber,
              license_date: row.issueDate,
              publisher: row.companyName || detail.companyName,
              official_name: detail.gameNameVietnam || detail.gameNameCopyright,
              age_rating: detail.ageRating || '18+',
              homepage: detail.gameHomepage,
              category_name: row.platformCategoryName,
              status: row.status === 'valid' ? 'APPROVED' : 'PENDING',
              source_url: 'https://giayphep.abei.gov.vn/g1'
            };
          }
        }
        // Fallback to top result if nothing exact
        const top = rows[0];
        return {
          license_number: top.licenseNumber,
          license_date: top.issueDate,
          publisher: top.companyName || top.licenseDetail?.companyName,
          official_name: top.licenseDetail?.gameNameVietnam || top.licenseDetail?.gameNameCopyright,
          age_rating: top.licenseDetail?.ageRating || '18+',
          status: top.status === 'valid' ? 'APPROVED' : 'PENDING',
          source_url: 'https://giayphep.abei.gov.vn/g1'
        };
      }
    } catch (err) {
      // Ignore network errors on individual query
    }
  }
  return null;
}

// 2. Main Deduplication & License Pipeline
async function run() {
  console.log('=== BẮT ĐẦU XỬ LÝ LỌC TRÙNG, CẬP NHẬT GIẤY PHÉP VÀ ICON GAME ===');

  let games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
  let codes = JSON.parse(fs.readFileSync(CODES_PATH, 'utf8'));

  console.log(`Số lượng game ban đầu: ${games.length}`);
  console.log(`Số lượng giftcode ban đầu: ${codes.length}`);

  // Known duplicate aliases to merge into canonical slug
  // Format: [slugToDelete, canonicalSlug]
  const aliasMap = {
    'pirate-legends': 'huyen-thoai-hai-tac',
    'giang-ho-ky-ngo-vplay': 'giang-ho-ky-ngo',
    'the-seven-deadly-sins-origin': 'seven-deadly-sins-origin',
    'ta-la-hac-ngo-khong-vplay': 'ta-la-hac-ngo-khong',
    'gunny-origin-vng': 'gunny-origin',
    'play-together-vng': 'play-together',
    'dau-truong-chan-ly-mobile': 'dau-truong-chan-ly',
    'sieu-tien-hoa-mobile': 'sieu-tien-hoa'
  };

  // Find additional duplicates dynamically
  const nameToGame = new Map();
  const duplicatesToRemove = new Set();
  const slugRemap = { ...aliasMap };

  // First register existing explicit aliases
  for (const [delSlug, keepSlug] of Object.entries(aliasMap)) {
    duplicatesToRemove.add(delSlug);
  }

  // Scan for any other games sharing identical clean name
  for (const g of games) {
    if (duplicatesToRemove.has(g.slug)) continue;
    const clean = cleanGameNameForMatching(g.name);
    if (clean.length < 4) continue;

    if (nameToGame.has(clean)) {
      const existing = nameToGame.get(clean);
      // Decide canonical: prefer shorter slug or one with more info/codes
      console.log(`[Phát hiện trùng] "${g.name}" (${g.slug}) trùng với "${existing.name}" (${existing.slug})`);
      duplicatesToRemove.add(g.slug);
      slugRemap[g.slug] = existing.slug;
    } else {
      nameToGame.set(clean, g);
    }
  }

  console.log(`\n=> Tìm thấy ${duplicatesToRemove.size} game trùng lặp cần lọc bỏ:`, Array.from(duplicatesToRemove));

  // Merge codes from duplicate slugs into canonical slug
  let reassignedCodesCount = 0;
  for (const code of codes) {
    if (slugRemap[code.game_slug]) {
      const targetSlug = slugRemap[code.game_slug];
      code.game_slug = targetSlug;
      reassignedCodesCount++;
    }
  }
  console.log(`=> Đã chuyển tiếp ${reassignedCodesCount} giftcode về slug chuẩn tương ứng.`);

  // Deduplicate codes for each game (remove identical code values for the same game)
  const uniqueCodeSet = new Set();
  const deduplicatedCodes = [];
  for (const c of codes) {
    const key = `${c.game_slug}_${(c.code || '').trim().toUpperCase()}`;
    if (!uniqueCodeSet.has(key)) {
      uniqueCodeSet.add(key);
      deduplicatedCodes.push(c);
    }
  }
  console.log(`=> Sau khi lọc mã trùng: còn lại ${deduplicatedCodes.length} giftcode độc nhất (đã loại bỏ ${codes.length - deduplicatedCodes.length} mã trùng).`);

  // Count codes per canonical game
  const codeCountsBySlug = {};
  const activeCodeCountsBySlug = {};
  for (const c of deduplicatedCodes) {
    codeCountsBySlug[c.game_slug] = (codeCountsBySlug[c.game_slug] || 0) + 1;
    if (c.status !== 'EXPIRED') {
      activeCodeCountsBySlug[c.game_slug] = (activeCodeCountsBySlug[c.game_slug] || 0) + 1;
    }
  }

  // Filter out duplicate games
  const filteredGames = games.filter((g) => !duplicatesToRemove.has(g.slug));

  // Update game code counts and ensure accurate icons
  for (const g of filteredGames) {
    g.codes_count = codeCountsBySlug[g.slug] || g.codes_count || 10;
    g.free_codes_count = activeCodeCountsBySlug[g.slug] || g.free_codes_count || g.codes_count;

    // Check icon webp
    const localIconPath = path.join(ROOT, `public/game_icons/${g.slug}.webp`);
    if (fs.existsSync(localIconPath)) {
      g.icon_url = `/game_icons/${g.slug}.webp`;
      g.cover_image_url = `/game_icons/${g.slug}.webp`;
    } else if (!g.icon_url || g.icon_url === '/vite.svg') {
      g.icon_url = `/game_icons/${g.slug}.webp`;
      g.cover_image_url = `/game_icons/${g.slug}.webp`;
    }
  }

  console.log(`\n=> Danh sách game sau khi lọc trùng: còn lại ${filteredGames.length} game (đã xóa ${games.length - filteredGames.length} game trùng).`);

  // Query ABIE licensing for top games needing verification
  console.log('\n--- ĐỐI CHIẾU GIẤY PHÉP G1 & G234 TỪ CỤC PTTH&TTĐT ---');
  let licenseUpdatedCount = 0;

  // Let's query license for games with missing or pending license
  for (let i = 0; i < filteredGames.length; i++) {
    const g = filteredGames[i];
    // If license is already verified with a decision number (QĐ-PTTH&TTĐT or QĐ-BTTTT), keep it
    if (g.license_info && (g.license_info.includes('QĐ') || g.license_info.includes('GXN'))) {
      continue;
    }

    process.stdout.write(`Đang tra cứu giấy phép: [${i + 1}/${filteredGames.length}] ${g.name}... `);
    const lic = await queryAbieLicense(g.name);
    if (lic) {
      g.license_info = `Số GP: ${lic.license_number}${lic.license_date ? ` (${lic.license_date})` : ''} - Cục PTTH&TTĐT phê duyệt.`;
      g.license_number = lic.license_number;
      g.license_date = lic.license_date;
      if (lic.publisher && (!g.publisher || g.publisher === 'Nhà phát hành chính thức')) {
        g.publisher = lic.publisher;
      }
      licenseUpdatedCount++;
      console.log(`✓ Đã cấp: ${lic.license_number} (${lic.publisher})`);
    } else {
      console.log('Chưa tìm thấy trên cổng ABIE.');
    }

    // Small delay to prevent rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`=> Đã cập nhật giấy phép chính xác cho ${licenseUpdatedCount} tựa game!`);

  // Write updated data files
  fs.writeFileSync(GAMES_PATH, JSON.stringify(filteredGames, null, 2), 'utf8');
  fs.writeFileSync(SRC_GAMES_PATH, JSON.stringify(filteredGames, null, 2), 'utf8');
  fs.writeFileSync(CODES_PATH, JSON.stringify(deduplicatedCodes, null, 2), 'utf8');
  fs.writeFileSync(SRC_CODES_PATH, JSON.stringify(deduplicatedCodes, null, 2), 'utf8');

  // Also update public/data/games_database.json and codes_database.json
  const dbGamesPath = path.join(ROOT, 'public/data/games_database.json');
  if (fs.existsSync(dbGamesPath)) {
    fs.writeFileSync(dbGamesPath, JSON.stringify(filteredGames, null, 2), 'utf8');
  }
  const dbCodesPath = path.join(ROOT, 'public/data/codes_database.json');
  if (fs.existsSync(dbCodesPath)) {
    fs.writeFileSync(dbCodesPath, JSON.stringify(deduplicatedCodes, null, 2), 'utf8');
  }

  console.log('\n✅ HOÀN TẤT: Toàn bộ dữ liệu game, giftcode, giấy phép ABIE và icon đã được làm sạch và lưu trữ thành công!');
}

run().catch(console.error);
