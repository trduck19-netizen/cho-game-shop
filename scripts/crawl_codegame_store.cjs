const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/data');
const GAMES_FILE = path.join(DATA_DIR, 'games188.json');
const CODES_FILE = path.join(DATA_DIR, 'crawled_codes_188.json');

function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', (err) => {
      resolve('');
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve('');
    });
  });
}

function cleanText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function run() {
  console.log('===============================================================');
  console.log('🔄 BẮT ĐẦU QUÉT & CẬP NHẬT GAME VÀ GIFTCODE TỪ HTTPS://CODEGAME.STORE/');
  console.log('===============================================================');

  if (!fs.existsSync(GAMES_FILE) || !fs.existsSync(CODES_FILE)) {
    console.error('Không tìm thấy file dữ liệu games188.json hoặc crawled_codes_188.json');
    process.exit(1);
  }

  const existingGames = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  const existingCodes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));

  console.log(`- Hiện có trong hệ thống: ${existingGames.length} tựa game, ${existingCodes.length} giftcode.`);

  // 1. Fetch Sitemap from codegame.store
  console.log('\n[1/3] Đang tải sitemap từ https://codegame.store/sitemap.xml...');
  const sitemapXml = await fetchUrl('https://codegame.store/sitemap.xml');
  if (!sitemapXml) {
    console.error('Không thể kết nối đến https://codegame.store/sitemap.xml');
    process.exit(1);
  }

  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const gameUrls = urls.filter((u) => u.includes('/game/'));
  console.log(`- Tìm thấy tổng cộng ${urls.length} liên kết, trong đó có ${gameUrls.length} trang game.`);

  const existingGameSlugs = new Set(existingGames.map((g) => (g.slug || '').toLowerCase()));
  const existingGameNames = new Map(existingGames.map((g) => [cleanText(g.name), g]));

  const existingCodeKeys = new Set(
    existingCodes.map((c) => `${(c.gameSlug || c.gameId || '').toLowerCase()}_${(c.codeValue || c.code_value || c.code || '').toUpperCase().trim()}`)
  );

  let newGamesCount = 0;
  let newCodesCount = 0;
  let processed = 0;

  console.log('\n[2/3] Đang cào và trích xuất dữ liệu chi tiết từng game (batch concurrency = 10)...');

  // Process in batches of 10 concurrent requests
  const BATCH_SIZE = 10;
  for (let i = 0; i < gameUrls.length; i += BATCH_SIZE) {
    const batch = gameUrls.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const html = await fetchUrl(url);
          if (!html) return;

          const slug = url.split('/game/')[1]?.replace(/\/$/, '')?.toLowerCase()?.trim();
          if (!slug) return;

          // Parse JSON-LD metadata
          const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
          let gameLd = null;
          for (const m of jsonLdMatches) {
            try {
              const parsed = JSON.parse(m[1]);
              if (parsed['@type'] === 'VideoGame') {
                gameLd = parsed;
                break;
              }
            } catch {}
          }

          const gameName =
            gameLd?.name ||
            [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)][0]?.[1]?.replace(/<[^>]+>/g, '').replace(/Giftcode|Mã Code|2026/gi, '').trim() ||
            slug.replace(/-/g, ' ');

          const category = gameLd?.genre || 'Game Hot';
          const publisher = gameLd?.author?.name || 'Nhà phát hành chính thức';
          const description = gameLd?.description || `Tổng hợp giftcode mới nhất của game ${gameName} từ codegame.store.`;
          const platform = gameLd?.gamePlatform || 'Android, iOS, PC';
          let iconUrl = gameLd?.image || `/game_icons/${slug}.webp`;

          // Check if Game is already in system
          let matchedGame = existingGames.find((g) => g.slug === slug) || existingGameNames.get(cleanText(gameName));

          if (!matchedGame) {
            // Add as new game
            const newGameRecord = {
              id: slug,
              name: gameName,
              slug: slug,
              publisher: publisher,
              category: category,
              rating: 4.8,
              icon_url: iconUrl,
              cover_image_url: iconUrl,
              description: description,
              platform: platform,
              instructions: 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
              release_date: '2026-09-01',
              is_featured: false,
              is_hot: true,
              is_new: false,
              status: 'APPROVED',
              codes_count: 0,
              updated_at: new Date().toISOString(),
              source: 'https://codegame.store/',
            };
            existingGames.push(newGameRecord);
            existingGameSlugs.add(slug);
            existingGameNames.set(cleanText(gameName), newGameRecord);
            matchedGame = newGameRecord;
            newGamesCount++;
          }

          // Trích xuất Giftcodes chính xác từ thẻ <code>
          const codeTags = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map((m) =>
            m[1].replace(/<[^>]+>/g, '').trim()
          );

          const blacklist = [
            'HTTPS', 'HTTP', 'GIFTCODE', 'VIPCODE', 'SERVER', 'GOOGLE', 'ANDROID', 'IPHONE',
            'DISCORD', 'FACEBOOK', 'UPDATE', 'REDEEM', 'BUTTON', 'WINDOW', 'SCRIPT', 'ONLINE',
            'APPLICATION', 'ORGANIZATION', 'HEADER', 'FOOTER', 'CONTAINER', 'CARD', 'BANNER'
          ];

          const allExtractedCodes = [...new Set(codeTags)].filter((c) => {
            const up = c.toUpperCase().trim();
            if (c.length < 3 || c.length > 30) return false;
            if (blacklist.includes(up)) return false;
            return true;
          });

          for (const rawCode of allExtractedCodes) {
            const codeVal = rawCode.trim();
            const key = `${matchedGame.slug.toLowerCase()}_${codeVal.toUpperCase()}`;
            if (!existingCodeKeys.has(key)) {
              existingCodeKeys.add(key);
              const newCodeRecord = {
                id: `cgs_${matchedGame.slug}_${codeVal}`,
                gameId: matchedGame.id || matchedGame.slug,
                gameSlug: matchedGame.slug,
                gameName: matchedGame.name,
                codeValue: codeVal,
                code_value: codeVal,
                code: codeVal,
                rewards: 'Giftcode độc quyền cập nhật từ https://codegame.store/',
                status: 'verified',
                is_active: true,
                is_verified: true,
                expires_at: '2026-12-31',
                sourceUrl: url,
                added_at: new Date().toISOString(),
              };
              existingCodes.unshift(newCodeRecord);
              newCodesCount++;
              matchedGame.codes_count = (matchedGame.codes_count || 0) + 1;
            }
          }
        } catch (e) {
          // ignore error on individual page
        }
      })
    );

    processed += batch.length;
    if (processed % 50 === 0 || processed >= gameUrls.length) {
      console.log(`  -> Đã quét ${processed}/${gameUrls.length} tựa game...`);
    }
  }

  // Đồng bộ lại codes_count chính xác cho toàn bộ game
  const codeCountMap = new Map();
  existingCodes.forEach((c) => {
    const slug = (c.gameSlug || c.gameId || '').toLowerCase();
    codeCountMap.set(slug, (codeCountMap.get(slug) || 0) + 1);
  });
  existingGames.forEach((g) => {
    g.codes_count = codeCountMap.get(g.slug.toLowerCase()) || 0;
  });

  console.log('\n[3/3] Đang lưu dữ liệu đã đồng bộ vào hệ thống...');
  fs.writeFileSync(GAMES_FILE, JSON.stringify(existingGames, null, 2), 'utf8');
  fs.writeFileSync(CODES_FILE, JSON.stringify(existingCodes, null, 2), 'utf8');

  const PUBLIC_GAMES = path.join(ROOT, 'public/data/games_database.json');
  const PUBLIC_CODES = path.join(ROOT, 'public/data/codes_database.json');
  fs.writeFileSync(PUBLIC_GAMES, JSON.stringify(existingGames, null, 2), 'utf8');
  fs.writeFileSync(PUBLIC_CODES, JSON.stringify(existingCodes, null, 2), 'utf8');

  console.log('===============================================================');
  console.log('🎉 KẾT QUẢ ĐỒNG BỘ TỪ HTTPS://CODEGAME.STORE/:');
  console.log(`  ✓ Số tựa game mới đã thêm: +${newGamesCount} game`);
  console.log(`  ✓ Số giftcode mới đã thêm: +${newCodesCount} mã code`);
  console.log(`  ✓ Tổng game sau cập nhật: ${existingGames.length} game`);
  console.log(`  ✓ Tổng giftcode sau cập nhật: ${existingCodes.length} mã code`);
  console.log('===============================================================');
}

run().catch(console.error);
