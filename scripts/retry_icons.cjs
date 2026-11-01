const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

const missing = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'missing_icons.json'), 'utf8'));
const iconsDir = path.resolve(__dirname, '../public/game_icons');

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

async function searchItunesIcon(term, country = 'US') {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=5`;
  const res = await getJson(url);
  if (res && res.results && res.results.length > 0) {
    for (const item of res.results) {
      if (item.artworkUrl512) return item.artworkUrl512;
      if (item.artworkUrl100) return item.artworkUrl100;
    }
  }
  return null;
}

// Refined search terms for missing games
const refinedTerms = {
  'lien-minh-huyen-thoai': 'League of Legends Wild Rift',
  'valorant': 'Valorant Mobile',
  'satisdom': 'Satisdom: Perfect Tidy',
  'thetan-rivals': 'Thetan Rivals',
  'heroes-strike': 'Heroes Strike Offline',
  'hair-salon-barber-shop': 'Barber Shop Hair Salon',
  'merge-defense-shadow-action-series': 'Merge Defense 3D',
  'sky-dancer-escapingfromeden': 'Sky Dancer Run',
  'pocket-army-ark-of-war-series': 'Pocket Army',
  'wood-screw-puzzle': 'Wood Screw Puzzle',
  'farm-city-farming-building': 'Farm City: Farming & Building',
  'car-race-3d': 'Car Race 3D: Car Racing',
  'hotpot-frenzy': 'Hotpot Frenzy',
  'unscrew-master-color-nut-bolt': 'Screw Master: Nuts and Bolts',
  'tangled-line-3d': 'Tangled Line 3D: Knot Puzzle',
  'numberland': 'Numberland',
  'toy-factory': 'Toy Factory 3D',
  'meow-vs-zombie': 'Meow vs Zombie'
};

async function main() {
  console.log(`Retrying search for ${missing.length} missing icons with refined terms...`);
  let foundCount = 0;
  const stillMissing = [];

  for (const game of missing) {
    const webpPath = path.join(iconsDir, `${game.slug}.webp`);
    const jpgPath = path.join(iconsDir, `${game.slug}.jpg`);

    const term = refinedTerms[game.slug];
    let iconUrl = null;
    if (term) {
      iconUrl = await searchItunesIcon(term, 'US');
      if (!iconUrl) iconUrl = await searchItunesIcon(term, 'VN');
    }

    if (iconUrl) {
      try {
        console.log(`Downloading for ${game.slug} (${term}) from ${iconUrl.slice(0, 50)}...`);
        const buf = await downloadBuffer(iconUrl);
        await sharp(buf).resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toFile(webpPath);
        await sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(jpgPath);
        console.log(`✓ Saved ${game.slug}.webp and .jpg`);
        foundCount++;
      } catch (err) {
        console.warn(`Failed: ${err.message}`);
        stillMissing.push(game);
      }
    } else {
      console.log(`[STILL MISSING] ${game.name} (${game.slug})`);
      stillMissing.push(game);
    }
  }

  console.log(`Found: ${foundCount}, Still missing: ${stillMissing.length}`);
  fs.writeFileSync(path.resolve(__dirname, 'still_missing.json'), JSON.stringify(stillMissing, null, 2));
}

main().catch(console.error);
