const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

const newGames = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'new_games_to_add.json'), 'utf8'));
const iconsDir = path.resolve(__dirname, '../public/game_icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function getJson(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function searchItunesIcon(term, country = 'VN') {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=3`;
  const res = await getJson(url);
  if (res && res.results && res.results.length > 0) {
    for (const item of res.results) {
      if (item.artworkUrl512) return item.artworkUrl512;
      if (item.artworkUrl100) return item.artworkUrl100;
    }
  }
  return null;
}

// Specific well-known icon URLs for PC games & classics
const customIconUrls = {
  'lien-minh-huyen-thoai': 'https://raw.githubusercontent.com/HextechDocs/lol-resources/main/league_of_legends_icon.png',
  'valorant': 'https://images.contentstack.io/v3/assets/blt0eb2a2986b796d29/blt3f51ffc8e5e7bb63/649d28c3065d3a5a7d7fa1bb/VAL_V_Logomark_Red.png',
  'dot-kich-vtc': 'https://dotkich.goplay.vn/Content/Images/logo.png',
  'audition-vtc': 'https://au.vtc.vn/Content/Images/logo.png',
  'silkroad-origin-vtc': 'https://sro.vtcgame.vn/Content/Images/logo.png',
  'phi-doi-vtc': 'https://phidoi.vtcgame.vn/Content/Images/logo.png',
  'ea-sports-fc-online': 'https://fconline.garena.vn/wp-content/themes/fconline/assets/images/app-icon.png',
  'ngoc-rong-online': 'http://ngocrongonline.com/icon.png',
  'ninja-school-online': 'http://ninjaschool.vn/icon.png',
  'hai-tac-ti-hon': 'http://haitactihon.com/icon.png',
  'hiep-si-online': 'http://hiepsionline.com/icon.png',
  'cuu-am-chan-kinh-2': 'https://cuuam.gosu.vn/templates/desktop/images/logo.png',
  'cuu-long-chi-ton': 'https://dzogame.vn/images/games/logo-9d.png',
  'bangbang-online': 'https://bangbang.cmn.vn/favicon.ico'
};

async function main() {
  console.log(`Checking icons for ${newGames.length} new games...`);
  let successCount = 0;
  let missing = [];

  for (let i = 0; i < newGames.length; i++) {
    const game = newGames[i];
    const webpPath = path.join(iconsDir, `${game.slug}.webp`);
    const jpgPath = path.join(iconsDir, `${game.slug}.jpg`);

    if (fs.existsSync(webpPath) && fs.existsSync(jpgPath)) {
      console.log(`[${i+1}/${newGames.length}] [EXISTS] ${game.slug}`);
      successCount++;
      continue;
    }

    let iconUrl = customIconUrls[game.slug] || null;

    if (!iconUrl) {
      // Try search iTunes VN
      iconUrl = await searchItunesIcon(game.name, 'VN');
    }
    if (!iconUrl) {
      // Try search iTunes US
      iconUrl = await searchItunesIcon(game.name, 'US');
    }
    if (!iconUrl && game.name.includes('(')) {
      const parenMatch = game.name.match(/\((.*?)\)/);
      if (parenMatch) {
        iconUrl = await searchItunesIcon(parenMatch[1], 'US');
      }
    }

    if (iconUrl) {
      try {
        console.log(`[${i+1}/${newGames.length}] Downloading for ${game.slug} from ${iconUrl.slice(0, 50)}...`);
        const buf = await downloadBuffer(iconUrl);
        await sharp(buf).resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toFile(webpPath);
        await sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(jpgPath);
        console.log(`  -> Saved ${game.slug}.webp and .jpg`);
        successCount++;
      } catch (err) {
        console.warn(`  -> Failed to download/convert: ${err.message}`);
        missing.push(game);
      }
    } else {
      console.log(`[${i+1}/${newGames.length}] [NO ITUNES] ${game.name} (${game.slug})`);
      missing.push(game);
    }
  }

  console.log(`\nSuccess: ${successCount}/${newGames.length}`);
  console.log(`Missing icons count: ${missing.length}`);
  fs.writeFileSync(path.resolve(__dirname, 'missing_icons.json'), JSON.stringify(missing, null, 2));
}

main().catch(console.error);
