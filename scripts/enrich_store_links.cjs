/**
 * scripts/enrich_store_links.cjs
 * Bulk enrichment of official store links (Google Play, Apple App Store, PC official website)
 * and database cleanup (Gun X Mobile junk codes, Thức Thần Ký).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const GP_CACHE_FILE = path.join(ROOT, 'scripts/gp_cache.json');
const ITUNES_CACHE_FILE = path.join(ROOT, 'scripts/itunes_cache.json');

const SRC_GAMES_FILE = path.join(ROOT, 'src/data/games188.json');
const PUB_GAMES_FILE = path.join(ROOT, 'public/data/games188.json');
const DATA_GAMES_FILE = path.join(ROOT, 'data/games188.json');

const PUB_CODES_FILE = path.join(ROOT, 'public/data/codes_database.json');
const CRAWLED_CODES_FILE = path.join(ROOT, 'src/data/crawled_codes_188.json');

const JUNK_CODES = new Set([
  'GUN-X-MOBILE-1',
  'GUN-X-MOBILE-2',
  'GUN-X-MOBILE-3',
  'GUN-X-MOBILE-4',
  'GUN-X-MOBILE-5',
  'SLAYERS-2-ROBLOX',
  'SLAYERS-2-THUMB',
]);

function searchItunes(name) {
  return new Promise((resolve) => {
    const clean = name.replace(/\([^)]*\)/g, '').replace(/[-:]/g, ' ').trim();
    const url = 'https://itunes.apple.com/search?term=' + encodeURIComponent(clean) + '&country=vn&media=software&limit=3';
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const gameRes = json.results.find(r => r.primaryGenreName === 'Games' || (r.genres && r.genres.includes('Games')));
            if (!gameRes) return resolve(null);
            
            const words = clean.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
            const trackLower = (gameRes.trackName || '').toLowerCase();
            const hasMatch = words.some(w => trackLower.includes(w));
            if (hasMatch) {
              resolve({
                trackName: gameRes.trackName,
                trackViewUrl: gameRes.trackViewUrl,
                bundleId: gameRes.bundleId
              });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3500, () => { req.destroy(); resolve(null); });
  });
}

async function main() {
  console.log('=== 1. DỌN DẸP MÃ RÁC GUN X MOBILE & THỨC THẦN KÝ ===');
  
  // Clean public/data/codes_database.json
  if (fs.existsSync(PUB_CODES_FILE)) {
    const rawCodes = JSON.parse(fs.readFileSync(PUB_CODES_FILE, 'utf8'));
    const beforeCount = rawCodes.length;
    const cleanedCodes = rawCodes
      .filter(item => {
        const codeVal = (item.code || item.codeValue || '').trim();
        return !JUNK_CODES.has(codeVal);
      })
      .map(item => {
        if (item.gameName === 'Thực Thần Ký') {
          return { ...item, gameName: 'Thức Thần Ký' };
        }
        return item;
      });
    fs.writeFileSync(PUB_CODES_FILE, JSON.stringify(cleanedCodes, null, 2), 'utf8');
    console.log(`[codes_database.json] Purged ${beforeCount - cleanedCodes.length} junk codes. Remaining: ${cleanedCodes.length}`);
  }

  // Clean data/games188.json embedded codes
  if (fs.existsSync(DATA_GAMES_FILE)) {
    const dataGames = JSON.parse(fs.readFileSync(DATA_GAMES_FILE, 'utf8'));
    let removedFromDataGames = 0;
    dataGames.forEach(g => {
      if (g.codes && Array.isArray(g.codes)) {
        const origLen = g.codes.length;
        g.codes = g.codes.filter(c => {
          const val = typeof c === 'string' ? c : (c.code || c.codeValue || '');
          return !JUNK_CODES.has(val.trim());
        });
        removedFromDataGames += (origLen - g.codes.length);
      }
    });
    fs.writeFileSync(DATA_GAMES_FILE, JSON.stringify(dataGames, null, 2), 'utf8');
    console.log(`[data/games188.json] Purged ${removedFromDataGames} junk codes from embedded codes arrays.`);
  }

  console.log('\n=== 2. NẠP GP_CACHE & TÌM KIẾM ITUNES STORE LINKS ===');
  const gpCache = fs.existsSync(GP_CACHE_FILE) ? JSON.parse(fs.readFileSync(GP_CACHE_FILE, 'utf8')) : {};
  console.log(`Loaded ${Object.keys(gpCache).length} Google Play entries from gp_cache.json.`);

  let itunesCache = {};
  if (fs.existsSync(ITUNES_CACHE_FILE)) {
    itunesCache = JSON.parse(fs.readFileSync(ITUNES_CACHE_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(itunesCache).length} cached iTunes entries.`);
  }

  const srcGames = JSON.parse(fs.readFileSync(SRC_GAMES_FILE, 'utf8'));
  console.log(`Total games in catalog: ${srcGames.length}`);

  // Query iTunes for games without iTunes cache (up to 150 top games or games in gpCache)
  let itunesLookups = 0;
  for (const g of srcGames) {
    if (itunesCache[g.slug]) continue;
    // Prioritize if in gpCache or is in first 200 games
    if (gpCache[g.slug] || srcGames.indexOf(g) < 200) {
      if (itunesLookups < 100) {
        process.stdout.write(`Looking up iTunes for "${g.name}"... `);
        const res = await searchItunes(g.name);
        if (res) {
          console.log(`✓ ${res.trackName}`);
          itunesCache[g.slug] = res;
        } else {
          console.log(`✗ Not found`);
          itunesCache[g.slug] = null;
        }
        itunesLookups++;
        await new Promise(r => setTimeout(r, 120));
      }
    }
  }

  // Save updated iTunes cache
  fs.writeFileSync(ITUNES_CACHE_FILE, JSON.stringify(itunesCache, null, 2), 'utf8');
  console.log(`Saved iTunes cache with ${Object.keys(itunesCache).length} entries.`);

  console.log('\n=== 3. HỢP NHẤT LINK STORE VÀO CATALOG GAME ===');
  let enrichedPlayCount = 0;
  let enrichedIosCount = 0;

  const enrichGame = (g) => {
    // 1. Google Play
    let pkg = null;
    if (g.slug === 'where-winds-meet-mobile' || g.slug === 'yen-van-thap-luc-thanh') {
      pkg = 'com.netease.yyvn';
    } else if (g.slug === 'gun-x-mobile') {
      pkg = 'com.sohagame.sg381';
    } else if (g.slug === 'genshin-impact') {
      pkg = 'com.miHoYo.GenshinImpact';
    } else if (g.slug === 'free-fire') {
      pkg = 'com.dts.freefireth';
    } else if (gpCache[g.slug] && gpCache[g.slug].pkg) {
      pkg = gpCache[g.slug].pkg;
    }

    if (pkg) {
      const playUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
      g.google_play_url = playUrl;
      g.download_android = playUrl;
      g.android_package_name = pkg;
      enrichedPlayCount++;
    }

    // 2. Apple App Store
    let itunes = itunesCache[g.slug];
    if (g.slug === 'where-winds-meet-mobile' || g.slug === 'yen-van-thap-luc-thanh') {
      itunes = {
        trackViewUrl: 'https://apps.apple.com/vn/app/y%E1%BA%BFn-v%C3%A2n-th%E1%BA%ADp-l%E1%BB%A5c-thanh/id6762607072',
        bundleId: 'com.netease.yyslsvn'
      };
    } else if (g.slug === 'gun-x-mobile') {
      itunes = {
        trackViewUrl: 'https://apps.apple.com/vn/app/gun-x-mobile/id6444932771',
        bundleId: 'com.sohagame.sg381'
      };
    }

    if (itunes && itunes.trackViewUrl) {
      g.app_store_url = itunes.trackViewUrl;
      g.download_ios = itunes.trackViewUrl;
      if (itunes.bundleId) g.ios_bundle_id = itunes.bundleId;
      enrichedIosCount++;
    }

    // 3. Official PC Website
    if (g.slug === 'where-winds-meet-mobile' || g.slug === 'yen-van-thap-luc-thanh') {
      g.download_pc = 'https://www.wherewindsmeetgame.com/';
    } else if (g.slug === 'genshin-impact') {
      g.download_pc = 'https://genshin.hoyoverse.com/';
    } else if (g.slug === 'honkai-star-rail') {
      g.download_pc = 'https://hsr.hoyoverse.com/';
    }

    return g;
  };

  const enrichedSrcGames = srcGames.map(enrichGame);
  fs.writeFileSync(SRC_GAMES_FILE, JSON.stringify(enrichedSrcGames, null, 2), 'utf8');
  console.log(`Updated ${SRC_GAMES_FILE} (GP: ${enrichedPlayCount}, iOS: ${enrichedIosCount})`);

  if (fs.existsSync(PUB_GAMES_FILE)) {
    const pubGames = JSON.parse(fs.readFileSync(PUB_GAMES_FILE, 'utf8'));
    const enrichedPubGames = pubGames.map(enrichGame);
    fs.writeFileSync(PUB_GAMES_FILE, JSON.stringify(enrichedPubGames, null, 2), 'utf8');
    console.log(`Updated ${PUB_GAMES_FILE}`);
  }

  if (fs.existsSync(DATA_GAMES_FILE)) {
    const dataGames = JSON.parse(fs.readFileSync(DATA_GAMES_FILE, 'utf8'));
    const enrichedDataGames = dataGames.map(enrichGame);
    fs.writeFileSync(DATA_GAMES_FILE, JSON.stringify(enrichedDataGames, null, 2), 'utf8');
    console.log(`Updated ${DATA_GAMES_FILE}`);
  }

  console.log('\n=== HOÀN TẤT ĐIỀN STORE LINKS HÀNG LOẠT ===');
}

main().catch(err => {
  console.error('Lỗi enrich store links:', err);
  process.exit(1);
});
