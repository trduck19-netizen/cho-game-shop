const fs = require('fs');
const path = require('path');

const GAMES_PATH = path.join(__dirname, '../src/client/data/games188.json');
const ABEI_PATH = path.join(__dirname, '../src/client/data/abei_all_licenses_crawled.json');
const CACHE_PATH = path.join(__dirname, 'gp_cache.json');

// Helper: Normalize Vietnamese accents
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

// Helper: Parse Vietnamese date string like "15 thg 9, 2026" or "15/09/2026" to "YYYY-MM-DD"
function parseToIsoDate(str) {
  if (!str) return null;
  const s = String(str).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY
  const mDmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mDmy) {
    const day = mDmy[1].padStart(2, '0');
    const month = mDmy[2].padStart(2, '0');
    const year = mDmy[3];
    return `${year}-${month}-${day}`;
  }

  // Google Play format: "15 thg 9, 2026" or "7 thg 9, 2026"
  const mGp = s.match(/(\d{1,2})\s+thg\s+(\d{1,2}),\s+(\d{4})/i);
  if (mGp) {
    const day = mGp[1].padStart(2, '0');
    const month = mGp[2].padStart(2, '0');
    const year = mGp[3];
    return `${year}-${month}-${day}`;
  }

  // ISO timestamp format: "2026-09-09T17:00:00.000+00:00"
  const mIso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (mIso) return mIso[1];

  return null;
}

// Clean game name for Google Play search
function cleanSearchName(name) {
  return name
    .replace(/\(.*?\)/g, '') // remove parentheses
    .replace(/\[.*?\]/g, '')
    .replace(/[-–—]\s*(?:VNG|SohaGame|Funtap|Garena|VTC|Gamota|Zing).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
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

// Fetch Google Play details for a game
async function fetchGooglePlayDetails(gameName) {
  const query = cleanSearchName(gameName);
  const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=vi&gl=VN`;

  const res = await fetchWithTimeout(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
    }
  });

  if (!res.ok) return null;
  const searchHtml = await res.text();

  const matches = [...searchHtml.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g)];
  const packageIds = [...new Set(matches.map(m => m[1]))];
  if (packageIds.length === 0) return null;

  // Check top 2 packages
  for (const pkg of packageIds.slice(0, 2)) {
    try {
      const appUrl = `https://play.google.com/store/apps/details?id=${pkg}&hl=vi&gl=VN`;
      const appRes = await fetchWithTimeout(appUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
        }
      });

      if (!appRes.ok) continue;
      const appHtml = await appRes.text();

      // Extract app title
      const titleMatch = appHtml.match(/<h1[^>]*itemprop="name"[^>]*><span[^>]*>([^<]+)<\/span><\/h1>/i) ||
                         appHtml.match(/<title>([^<-]+)/i);
      const appTitle = titleMatch ? titleMatch[1].trim() : '';

      // Verify relevance: Check if key words match
      const normQuery = stripAccents(query);
      const normTitle = stripAccents(appTitle);
      const queryWords = normQuery.split(/\s+/).filter(w => w.length > 2);
      const matchedWords = queryWords.filter(w => normTitle.includes(w));

      // If at least 50% words match or title includes query
      const isMatch = normTitle.includes(normQuery) ||
                      normQuery.includes(normTitle) ||
                      (queryWords.length > 0 && matchedWords.length / queryWords.length >= 0.5);

      if (!isMatch && packageIds.length > 1) {
        continue; // Try next package
      }

      // Extract updated date
      const mUpdate = appHtml.match(/<div class="lXlx5">Lần cập nhật gần đây nhất<\/div>\s*<div class="xg1aie">([^<]+)<\/div>/i);
      const updatedDate = mUpdate ? parseToIsoDate(mUpdate[1]) : null;

      // Extract release date pattern
      const mRelease = appHtml.match(/\]\s*,\s*\["(\d{1,2}\s+thg\s+\d{1,2},\s+\d{4})"\s*,\s*\[\d+\s*,\s*\d+\]\s*\]\s*,\s*null\s*,\s*null\s*,\s*\["[^"]*"/);
      const releaseDate = mRelease ? parseToIsoDate(mRelease[1]) : null;

      return {
        pkg,
        appTitle,
        releaseDate,
        updatedDate
      };
    } catch (e) {
      // Continue to next package or return null
    }
  }

  return null;
}

async function main() {
  console.log('🚀 Bắt đầu quét ngày phát hành từ Google Play & ABEI...');

  const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
  console.log(`Đã tải ${games.length} game từ games188.json.`);

  let abeiLicenses = [];
  if (fs.existsSync(ABEI_PATH)) {
    try {
      abeiLicenses = JSON.parse(fs.readFileSync(ABEI_PATH, 'utf8'));
      console.log(`Đã tải ${abeiLicenses.length} giấy phép từ ABEI.`);
    } catch (e) {
      console.warn('Không đọc được ABEI licenses:', e.message);
    }
  }

  // Build ABEI map by normalized name and license number
  const abeiMapByName = new Map();
  const abeiMapByLicense = new Map();
  for (const lic of abeiLicenses) {
    const gameName = lic.licenseDetail?.gameNameVietnam || lic.gameNameVietnam || '';
    const licNum = lic.licenseNumber || lic.licenseRef || '';
    const issueDate = parseToIsoDate(lic.issueDate || lic.validFrom || '');

    if (gameName && issueDate) {
      abeiMapByName.set(stripAccents(gameName), issueDate);
    }
    if (licNum && issueDate) {
      abeiMapByLicense.set(licNum.trim(), issueDate);
    }
  }

  // Load cache if exists
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      console.log(`Đã nạp ${Object.keys(cache).length} bản ghi từ cache Google Play.`);
    } catch (e) {
      cache = {};
    }
  }

  let gpFoundCount = 0;
  let abeiFoundCount = 0;
  let fallbackCount = 0;

  // Process in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (game) => {
        const cacheKey = game.slug || game.id;
        let gpData = cache[cacheKey];

        if (!gpData) {
          try {
            gpData = await fetchGooglePlayDetails(game.name);
            cache[cacheKey] = gpData || { notFound: true };
          } catch (err) {
            gpData = { error: err.message };
          }
          // Small jitter
          await new Promise(r => setTimeout(r, 100));
        }

        // Determine best release date
        let finalReleaseDate = null;
        let gpRelease = gpData && !gpData.notFound ? gpData.releaseDate : null;
        let gpUpdate = gpData && !gpData.notFound ? gpData.updatedDate : null;

        if (gpData && !gpData.notFound && gpData.pkg) {
          game.gp_package_id = gpData.pkg;
          if (gpUpdate) game.gp_updated_date = gpUpdate;
        }

        if (gpRelease) {
          finalReleaseDate = gpRelease;
          gpFoundCount++;
        } else {
          // Check ABEI
          const licNum = (game.so_giay_phep || '').trim();
          const normName = stripAccents(game.name);
          const abeiDate = abeiMapByLicense.get(licNum) || abeiMapByName.get(normName);

          if (abeiDate) {
            finalReleaseDate = abeiDate;
            abeiFoundCount++;
          } else {
            // Check existing ngay_cap_phep
            const parsedCapPhep = parseToIsoDate(game.ngay_cap_phep);
            if (parsedCapPhep && parsedCapPhep !== '2026-01-01') {
              finalReleaseDate = parsedCapPhep;
              fallbackCount++;
            } else {
              // Existing release_date or default
              const parsedExisting = parseToIsoDate(game.release_date);
              finalReleaseDate = parsedExisting || '2026-07-01';
              fallbackCount++;
            }
          }
        }

        // Normalize ngay_cap_phep if present
        if (game.ngay_cap_phep) {
          const parsed = parseToIsoDate(game.ngay_cap_phep);
          if (parsed) {
            // keep standard DD/MM/YYYY for ngay_cap_phep display if desired, or ISO
            const parts = parsed.split('-');
            game.ngay_cap_phep = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        game.release_date = finalReleaseDate;

        // Mark isNew if released in recent months (from 2026-07-01 onwards)
        if (game.release_date >= '2026-07-01') {
          game.isNew = true;
        }
      })
    );

    // Save cache incrementally every 20 games
    if (i % 20 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      console.log(`Tiến trình: Đã xử lý ${Math.min(i + BATCH_SIZE, games.length)}/${games.length} games...`);
    }
  }

  // Save final cache
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  // Pre-sort games descending by release_date (newest first)
  games.sort((a, b) => {
    const dateA = a.release_date || '1970-01-01';
    const dateB = b.release_date || '1970-01-01';
    const comp = dateB.localeCompare(dateA);
    if (comp !== 0) return comp;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Save updated games188.json
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');

  console.log('\n=== KẾT QUẢ THU THẬP & SẮP XẾP ===');
  console.log(`- Tổng số game: ${games.length}`);
  console.log(`- Số game lấy được ngày từ Google Play: ${gpFoundCount}`);
  console.log(`- Số game lấy ngày cấp phép từ ABEI: ${abeiFoundCount}`);
  console.log(`- Số game fallback khác: ${fallbackCount}`);
  console.log('\nTop 15 game mới nhất được đưa lên đầu trang:');
  games.slice(0, 15).forEach((g, idx) => {
    console.log(`${idx + 1}. [${g.release_date}] ${g.name} (${g.publisher || 'NPH'}) - GP: ${g.gp_package_id || 'N/A'}`);
  });
}

main().catch(err => {
  console.error('Lỗi khi chạy script:', err);
  process.exit(1);
});
