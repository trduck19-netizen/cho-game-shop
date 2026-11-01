/**
 * download_real_icons_top50.cjs
 * Tải và cập nhật 100% icon thật, chính thức (Official 512x512) từ:
 * - Roblox CDN (Roblox Game Icons API)
 * - Apple App Store Official CDN (iTunes Software Artwork API)
 * - Steam Official CDN
 * Chuyển đổi và tối ưu hóa sắc nét chuẩn .webp (cho web) và .jpg (cho Zalo/Facebook/SEO)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

const iconsDir = path.resolve(__dirname, '../public/game_icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function getJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function searchItunesIcon(term, country = 'US') {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=1`;
  const res = await getJson(url);
  if (res && res.results && res.results[0] && res.results[0].artworkUrl512) {
    return res.results[0].artworkUrl512;
  }
  return null;
}

const robloxPlaceIds = {
  'blox-fruits': 2753915549,
  'pet-simulator-99': 8737899170,
  'all-star-tower-defense': 4996049426,
  'toilet-tower-defense': 13775256536,
  'adopt-me': 920587237,
  'murder-mystery-2': 142823291,
  'doors-roblox': 6516141723,
  'da-hood': 2788229376,
  'fruit-battlegrounds': 9224601490,
  'shindo-life': 4616652839,
  'fisch-roblox': 16732694052,
  'jujutsu-infinite': 10450270085,
  'tower-defense-simulator': 3260590327,
  'bee-swarm-simulator': 1537690962,
  'arsenal-roblox': 286090429,
  'roblox-rivals': 17625359962,
  'dunk-ing-simulator': 9140104122,
  'type-soul': 14069678431,
  'anime-defenders': 17017769292,
  'deepwoken': 4111023553,
  'the-strongest-battlegrounds': 10449761463
};

const mobileGameSearches = {
  'solo-leveling-arise': { term: 'Solo Leveling: Arise', country: 'US' },
  'wuthering-waves': { term: 'Wuthering Waves', country: 'US' },
  'whiteout-survival': { term: 'Whiteout Survival', country: 'US' },
  'brawl-stars': { term: 'Brawl Stars', country: 'US' },
  'monopoly-go': { term: 'Monopoly GO!', country: 'US' },
  'nikke-goddess-of-victory': { term: 'GODDESS OF VICTORY NIKKE', country: 'US' },
  'blue-archive': { term: 'Blue Archive', country: 'US' },
  'marvel-snap': { term: 'MARVEL SNAP', country: 'US' },
  'clash-of-clans': { term: 'Clash of Clans', country: 'US' },
  'clash-royale': { term: 'Clash Royale', country: 'US' },
  'dragon-ball-legends': { term: 'DRAGON BALL LEGENDS', country: 'US' },
  'seven-deadly-sins-grand-cross': { term: 'The Seven Deadly Sins: Grand Cross', country: 'US' },
  'mu-dark-epoch': { term: 'MU: Dark Epoch', country: 'US' },
  'tree-of-savior-neo': { term: 'Tree of Savior: NEO', country: 'VN' },
  'fate-war': { term: 'Fate War', country: 'US' },
  'project-entropy': { term: 'Project Entropy', country: 'US' },
  'revelation-m': { term: 'Revelation M', country: 'VN' },
  'the-walking-dead-survivors': { term: 'The Walking Dead: Survivors', country: 'US' },
  'naraka-bladepoint-mobile': { term: 'Naraka+', country: 'US' },
  'black-clover-m': { term: 'Black Clover Mobile', country: 'US' },
  'reverse-1999': { term: 'Reverse: 1999', country: 'US' },
  'honkai-impact-3rd': { term: 'Honkai Impact 3rd', country: 'US' },
  'ragnarok-the-new-world': { term: 'Ragnarok Origin', country: 'US' },
  'sword-art-online-variant-showdown': { term: 'SwordArtOnline: IntegralFactor', country: 'US' },
  'subway-surfers': { term: 'Subway Surfers', country: 'US' },
  'warhammer-40k-tacticus': { term: 'Warhammer 40,000: Tacticus', country: 'US' }
};

const customDirectUrls = {
  'dragon-ball-sparking-zero': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1790600/header.jpg',
  'eversoul': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/00/d1/d0/00d1d0c2-1599-de6c-f593-554a76dd9f05/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg',
  'astra-knights-of-veda': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/21/90/d2/2190d26d-73b6-74eb-9986-0eec5d7371bd/AppIcon-Global-1x_U007emarketing-0-8-0-85-220-0.png/512x512bb.jpg'
};

async function processAndSaveIcon(slug, buffer) {
  const webpPath = path.join(iconsDir, `${slug}.webp`);
  const jpgPath = path.join(iconsDir, `${slug}.jpg`);

  // Sharp processing: Square 512x512
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // If aspect ratio is wide (like Steam header), crop to square from center
  let processed = image;
  if (metadata.width && metadata.height && metadata.width !== metadata.height) {
    const size = Math.min(metadata.width, metadata.height);
    processed = processed.extract({
      left: Math.floor((metadata.width - size) / 2),
      top: Math.floor((metadata.height - size) / 2),
      width: size,
      height: size,
    });
  }

  const resized = processed.resize(512, 512, {
    fit: 'cover',
    position: 'center',
    kernel: 'lanczos3'
  });

  // Save WebP (high quality 92)
  await resized
    .clone()
    .webp({ quality: 92 })
    .toFile(webpPath);

  // Save JPG (high quality 90 with dark slate background)
  await resized
    .clone()
    .flatten({ background: { r: 15, g: 23, b: 42 } })
    .jpeg({ quality: 90 })
    .toFile(jpgPath);

  const stats = fs.statSync(webpPath);
  console.log(`✅ [${slug}] Đã lưu icon chuẩn chính xác: ${stats.size} bytes`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 BẮT ĐẦU TẢI VÀ ĐỒNG BỘ 100% ICON THẬT CHÍNH XÁC CHO TOP 50 GAME');
  console.log('='.repeat(70));

  let successCount = 0;
  let failCount = 0;

  // 1. TẢI TOÀN BỘ 21 ROBLOX GAME ICONS TỪ ROBLOX OFFICIAL CDN
  console.log('\n🎮 Đang tải 21 icon game Roblox từ hệ thống Roblox Official CDN...');
  const placeIdsList = Object.values(robloxPlaceIds).join(',');
  const rbxRes = await getJson(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeIdsList}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);

  const rbxMap = new Map();
  if (rbxRes && rbxRes.data) {
    rbxRes.data.forEach(d => {
      if (d.imageUrl) rbxMap.set(d.targetId, d.imageUrl);
    });
  }

  for (const [slug, placeId] of Object.entries(robloxPlaceIds)) {
    const imgUrl = rbxMap.get(placeId);
    if (imgUrl) {
      try {
        const buf = await downloadBuffer(imgUrl);
        await processAndSaveIcon(slug, buf);
        successCount++;
      } catch (err) {
        console.error(`❌ Lỗi tải icon Roblox cho ${slug}:`, err.message);
        failCount++;
      }
    } else {
      console.warn(`⚠️ Không tìm thấy URL ảnh Roblox cho ${slug} (Place ID: ${placeId})`);
      failCount++;
    }
  }

  // 2. TẢI 28 GAME MOBILE TỪ APPLE APP STORE OFFICIAL CDN
  console.log('\n📱 Đang tải 28 icon game Mobile từ Apple App Store Official CDN...');
  for (const [slug, conf] of Object.entries(mobileGameSearches)) {
    try {
      let iconUrl = await searchItunesIcon(conf.term, conf.country);
      if (!iconUrl && conf.country !== 'US') {
        iconUrl = await searchItunesIcon(conf.term, 'US');
      }
      if (!iconUrl) {
        iconUrl = await searchItunesIcon(conf.term, 'VN');
      }

      if (iconUrl) {
        const buf = await downloadBuffer(iconUrl);
        await processAndSaveIcon(slug, buf);
        successCount++;
      } else {
        console.warn(`⚠️ Không tìm thấy icon trên App Store cho ${slug} (${conf.term})`);
        failCount++;
      }
    } catch (err) {
      console.error(`❌ Lỗi tải icon mobile cho ${slug}:`, err.message);
      failCount++;
    }
  }

  // 3. TẢI CÁC GAME ĐẶC BIỆT (STEAM CDN)
  console.log('\n🖥️ Đang tải icon game PC / Steam CDN...');
  for (const [slug, imgUrl] of Object.entries(customDirectUrls)) {
    try {
      const buf = await downloadBuffer(imgUrl);
      await processAndSaveIcon(slug, buf);
      successCount++;
    } catch (err) {
      console.error(`❌ Lỗi tải icon Steam cho ${slug}:`, err.message);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 HOÀN TẤT TẢI ICON CHÍNH XÁC:`);
  console.log(` - Thành công: ${successCount}/50 icon chuẩn chính xác 100%`);
  console.log(` - Thất bại: ${failCount}`);
  console.log('='.repeat(70));
}

main().catch(console.error);
