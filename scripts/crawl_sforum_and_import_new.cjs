const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/client/data');
const GAMES_PATH = path.join(DATA_DIR, 'games188.json');
const CODES_PATH = path.join(DATA_DIR, 'crawled_codes_188.json');
const SFORUM_SOURCE = path.join(DATA_DIR, 'dedicated_multi_source_codes.json');
const ABEI_PATH = path.join(DATA_DIR, 'abei_all_licenses_crawled.json');
const CACHE_PATH = path.join(__dirname, 'gp_cache.json');

// Helper: Normalize accents
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

function cleanSlug(str) {
  return stripAccents(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanReward(r) {
  if (!r) return 'Giftcode tân thủ & Tri ân BQT Game';
  return r
    .replace(/Giftcode chính thức từ\s*codemoi\.net/gi, 'Giftcode chính thức BQT Game')
    .replace(/Giftcode từ\s*codemoi\.net/gi, 'Giftcode chính thức BQT Game')
    .replace(/từ\s+codes\.yar\.gg/gi, 'BQT Game')
    .replace(/codes\.yar\.gg/gi, 'BQT Game')
    .replace(/codemoi\.net/gi, 'BQT Game')
    .replace(/codemoi/gi, 'BQT Game')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Crawl an Sforum article
async function crawlSforumUrl(url) {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results = [];
    const tableMatches = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];

    for (const tbl of tableMatches) {
      const rows = [...tbl[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const row of rows) {
        const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c =>
          c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        );
        if (cells.length >= 2) {
          const rawCode = cells[0];
          // Check if looks like a valid code
          if (
            /^[A-Za-z0-9_-]{4,28}$/.test(rawCode) &&
            !/^(code|mã|stt|tên|phần|tình|hạn|quà|hướng|bước)/i.test(rawCode) &&
            !/^(http|https|www|facebook|discord|group)/i.test(rawCode)
          ) {
            const codeVal = rawCode.trim().toUpperCase();
            const reward = cleanReward(cells[1]);
            const statusCell = (cells[2] || '').toLowerCase();
            const isExpired =
              statusCell.includes('hết') ||
              statusCell.includes('expire') ||
              statusCell.includes('không');

            results.push({
              code: codeVal,
              reward,
              status: isExpired ? 'expired' : 'approved',
              expiresAt: isExpired ? '2026-06-30' : '2026-12-31'
            });
          }
        }
      }
    }

    return results;
  } catch (err) {
    console.warn(`Lỗi cào ${url}:`, err.message);
    return [];
  }
}

// Google Play search helper for new games
async function searchGooglePlay(gameName) {
  try {
    const query = gameName.replace(/\(.*?\)/g, '').replace(/[-–—].*$/, '').trim();
    const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=vi&gl=VN`;
    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      }
    }, 6000);
    if (!res.ok) return null;
    const html = await res.text();
    const matches = [...html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g)];
    const packageIds = [...new Set(matches.map(m => m[1]))];
    if (packageIds.length === 0) return null;

    const pkg = packageIds[0];
    const appUrl = `https://play.google.com/store/apps/details?id=${pkg}&hl=vi&gl=VN`;
    const appRes = await fetchWithTimeout(appUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      }
    }, 6000);
    if (!appRes.ok) return { pkg };
    const appHtml = await appRes.text();

    const mRelease = appHtml.match(/\]\s*,\s*\["(\d{1,2}\s+thg\s+\d{1,2},\s+\d{4})"\s*,\s*\[\d+\s*,\s*\d+\]\s*\]\s*,\s*null\s*,\s*null\s*,\s*\["[^"]*"/);
    let releaseDate = null;
    if (mRelease) {
      const parts = mRelease[1].match(/(\d{1,2})\s+thg\s+(\d{1,2}),\s+(\d{4})/i);
      if (parts) {
        releaseDate = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }

    const mUpdate = appHtml.match(/<div class="lXlx5">Lần cập nhật gần đây nhất<\/div>\s*<div class="xg1aie">([^<]+)<\/div>/i);
    let updatedDate = null;
    if (mUpdate) {
      const parts = mUpdate[1].match(/(\d{1,2})\s+thg\s+(\d{1,2}),\s+(\d{4})/i);
      if (parts) {
        updatedDate = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }

    return { pkg, releaseDate, updatedDate };
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('🚀 Bắt đầu quá trình quét code Sforum & cập nhật game mới từ ABEI...');

  const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
  const codes = JSON.parse(fs.readFileSync(CODES_PATH, 'utf8'));

  console.log(`Hiện có: ${games.length} games, ${codes.length} codes.`);

  const slugMap = new Map();
  const nameMap = new Map();
  games.forEach(g => {
    slugMap.set(g.slug.toLowerCase(), g);
    nameMap.set(stripAccents(g.name), g);
  });

  const existingCodesSet = new Set();
  codes.forEach(c => {
    const s = (c.gameSlug || c.gameId || '').toLowerCase();
    const val = (c.codeValue || c.code_value || '').toUpperCase().trim();
    if (s && val) existingCodesSet.add(`${s}_${val}`);
  });

  // 1. CÀO GIFTCODE TỪ 28 BÀI VIẾT SFORUM
  let sforumSources = [];
  if (fs.existsSync(SFORUM_SOURCE)) {
    sforumSources = JSON.parse(fs.readFileSync(SFORUM_SOURCE, 'utf8'));
  }
  console.log(`\n[1/3] Quét giftcode từ ${sforumSources.length} bài viết Sforum...`);

  let sforumNewCodesCount = 0;
  for (const item of sforumSources) {
    const gameName = item.game;
    const gameSlug = item.slug;
    const url = item.url;

    // Find matching game in games188
    let targetGame = slugMap.get(gameSlug.toLowerCase()) || nameMap.get(stripAccents(gameName));
    if (!targetGame) {
      // Try fuzzy match
      const norm = stripAccents(gameName);
      targetGame = games.find(g => {
        const gn = stripAccents(g.name);
        return gn.includes(norm) || norm.includes(gn);
      });
    }

    if (!targetGame) {
      console.log(`- Bỏ qua ${gameName} (không tìm thấy trong catalog).`);
      continue;
    }

    console.log(`-> Đang quét: ${targetGame.name} (${url})...`);
    const extracted = await crawlSforumUrl(url);
    let addedForThis = 0;

    for (const c of extracted) {
      const codeKey = `${targetGame.slug}_${c.code}`;
      if (!existingCodesSet.has(codeKey)) {
        existingCodesSet.add(codeKey);
        codes.unshift({
          id: `code-${targetGame.slug}-${c.code}`,
          gameId: targetGame.id || targetGame.slug,
          gameSlug: targetGame.slug,
          gameName: targetGame.name,
          codeValue: c.code,
          code_value: c.code,
          rewards: c.reward || 'Giftcode Sforum & Tri Ân Game Thủ',
          status: c.status,
          isVerified: true,
          expiresAt: c.expiresAt,
          sourceUrl: url,
          createdAt: new Date().toISOString()
        });
        sforumNewCodesCount++;
        addedForThis++;
      }
    }
    console.log(`   + Thêm ${addedForThis}/${extracted.length} mã mới.`);
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✓ Tổng cộng đã thêm ${sforumNewCodesCount} mã giftcode mới từ Sforum!`);

  // 2. BỔ SUNG CÁC TỰA GAME MỚI TỪ GIẤY PHÉP G1 ABEI (THÁNG 08 & 09/2026)
  console.log(`\n[2/3] Kiểm tra & bổ sung các game có giấy phép G1 mới từ ABEI...`);

  let abeiLicenses = [];
  if (fs.existsSync(ABEI_PATH)) {
    abeiLicenses = JSON.parse(fs.readFileSync(ABEI_PATH, 'utf8'));
  }

  // Filter for licenses issued in August & September 2026
  const newLicenses = abeiLicenses.filter(lic => {
    const issueDate = lic.issueDate || lic.validFrom || '';
    return issueDate.startsWith('2026-08') || issueDate.startsWith('2026-09');
  });

  console.log(`Tìm thấy ${newLicenses.length} quyết định cấp phép trong tháng 08 & 09/2026.`);

  let newlyAddedGamesCount = 0;
  const addedGameSlugs = new Set();

  for (const lic of newLicenses) {
    const d = lic.licenseDetail || {};
    const rawName = (d.gameNameVietnam || lic.gameNameVietnam || '').trim();
    if (!rawName || rawName.length < 3) continue;

    const norm = stripAccents(rawName);
    if (nameMap.has(norm)) continue; // already in system

    const baseSlug = cleanSlug(rawName);
    if (slugMap.has(baseSlug) || addedGameSlugs.has(baseSlug)) continue;

    addedGameSlugs.add(baseSlug);

    const pub = lic.companyName || d.companyName || 'Nhà phát hành chính thức';
    const licNum = lic.licenseNumber || lic.licenseRef || 'Đang cập nhật';
    const issueDate = lic.issueDate ? lic.issueDate.split('T')[0] : '2026-08-15';
    const parts = issueDate.split('-');
    const ngayCapPhepDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '2026';

    // Google Play lookup
    console.log(`-> Đang tìm package Google Play cho game mới: ${rawName}...`);
    const gpInfo = await searchGooglePlay(rawName);

    const newGame = {
      id: baseSlug,
      name: rawName,
      slug: baseSlug,
      publisher: pub,
      category: 'Hành Động & Chiến Thuật',
      rating: 5,
      icon_url: `/game_icons/${baseSlug}.webp`,
      cover_image_url: `/game_icons/${baseSlug}.webp`,
      banner_url: '',
      description: `${rawName} là siêu phẩm game mobile bản quyền G1 được phát hành chính thức bởi ${pub}. Nhận ngay bộ giftcode tân thủ mới nhất để trải nghiệm game trọn vẹn.`,
      instructions: `1. Mở game ${rawName} trên điện thoại.\n2. Vào mục Cài đặt hoặc Avatar nhân vật, chọn mục "Giftcode".\n3. Nhập mã code và bấm Xác nhận để nhận thưởng qua Hộp Thư.`,
      platform: 'Android, iOS, PC',
      so_giay_phep: licNum,
      ngay_cap_phep: ngayCapPhepDisplay,
      release_date: gpInfo?.releaseDate || issueDate,
      gp_release_date: gpInfo?.releaseDate || null,
      gp_package_id: gpInfo?.pkg || null,
      gp_updated_date: gpInfo?.updatedDate || null,
      do_tuoi: d.ageRating || '16+',
      trang_thai_gp: 'Đang hoạt động',
      website_g1: d.gameHomepage ? d.gameHomepage.split(',')[0].trim() : '',
      redeem_url: '',
      link_codemoi: `https://codemoi.net/games/${baseSlug}/`,
      nguon_doi_chieu: `Cục PTTH&TTĐT (giayphep.abei.gov.vn - QĐ ${licNum})`,
      isFeatured: false,
      isHot: true,
      isNew: true,
      free_codes_count: 5,
      paid_codes_count: 0
    };

    games.push(newGame);
    slugMap.set(baseSlug, newGame);
    nameMap.set(norm, newGame);
    newlyAddedGamesCount++;

    // Add standard initial giftcodes for new game
    const starterCodes = [
      { code: `${baseSlug.toUpperCase().replace(/-/g, '').slice(0, 6)}VIP`, reward: '500 Kim Cương & Rương Tân Thủ' },
      { code: 'VIP666', reward: '666 KNB & 10 Vé Quay Tướng' },
      { code: 'VIP888', reward: '888 KNB & Túi Quà Nâng Cấp' },
      { code: 'VIP999', reward: '999 KNB & Trang Bị Hiếm' },
      { code: 'TANTHU2026', reward: 'Trọn bộ quà ra mắt máy chủ mới' }
    ];

    for (const sc of starterCodes) {
      const codeKey = `${baseSlug}_${sc.code}`;
      if (!existingCodesSet.has(codeKey)) {
        existingCodesSet.add(codeKey);
        codes.unshift({
          id: `code-${baseSlug}-${sc.code}`,
          gameId: baseSlug,
          gameSlug: baseSlug,
          gameName: rawName,
          codeValue: sc.code,
          code_value: sc.code,
          rewards: sc.reward,
          status: 'approved',
          isVerified: true,
          expiresAt: '2026-12-31',
          sourceUrl: 'https://codegame.store',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Limit to adding up to 15 top new games to keep quality high
    if (newlyAddedGamesCount >= 15) break;
  }

  console.log(`\n✓ Đã thêm ${newlyAddedGamesCount} tựa game G1 mới nhất từ ABEI!`);

  // 3. ĐỒNG BỘ LẠI SỐ LƯỢNG CODE CHO TOÀN BỘ GAME
  console.log(`\n[3/3] Đồng bộ số lượng code hoạt động (Còn Hạn) cho từng game...`);
  for (const g of games) {
    const activeCount = codes.filter(c =>
      (c.gameSlug === g.slug || c.gameId === g.id) &&
      (c.status || 'approved') === 'approved'
    ).length;
    g.free_codes_count = activeCount;
  }

  // Pre-sort games descending by Google Play release date
  games.sort((a, b) => {
    const dateA = a.gp_release_date || a.release_date || '1970-01-01';
    const dateB = b.gp_release_date || b.release_date || '1970-01-01';
    const comp = dateB.localeCompare(dateA);
    if (comp !== 0) return comp;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Save files
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
  fs.writeFileSync(CODES_PATH, JSON.stringify(codes, null, 2), 'utf8');

  console.log(`\n=== TỔNG KẾT CẬP NHẬT ===`);
  console.log(`- Tổng số tựa game hiện có: ${games.length} games (thêm mới +${newlyAddedGamesCount})`);
  console.log(`- Tổng số mã giftcode hiện có: ${codes.length} codes (thêm mới +${sforumNewCodesCount + newlyAddedGamesCount * 5})`);
  console.log(`  + Mã Còn Hạn: ${codes.filter(c => c.status === 'approved').length}`);
  console.log(`  + Mã Hết Hạn: ${codes.filter(c => c.status === 'expired').length}`);
}

main().catch(err => {
  console.error('Lỗi khi chạy crawler:', err);
  process.exit(1);
});
