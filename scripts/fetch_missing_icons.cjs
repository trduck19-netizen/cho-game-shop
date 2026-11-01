const https = require('https');
const fs = require('fs');
const path = require('path');
let sharp = null;
try {
  sharp = require('sharp');
} catch {}

const ICONS_DIR = path.resolve(__dirname, '../public/game_icons');

function getPlayIcon(pkg) {
  return new Promise((resolve) => {
    const url = `https://play.google.com/store/apps/details?id=${pkg}&hl=vi&gl=VN`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const iconMatch = body.match(/<img[^>]+src="([^">]+googleusercontent\.com\/[^"=]+)"[^>]+(?:itemprop="image"|alt="Biểu tượng ảnh"|alt="Icon image")/i) ||
                          body.match(/"(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)=s/i);
        resolve({ pkg, status: res.statusCode, icon: iconMatch ? iconMatch[1] : null });
      });
    }).on('error', e => resolve({ pkg, error: e.message }));
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function saveIcon(slug, buffer) {
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
  const webpPath = path.join(ICONS_DIR, `${slug}.webp`);
  const jpgPath = path.join(ICONS_DIR, `${slug}.jpg`);

  if (sharp) {
    await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 90 })
      .toFile(webpPath);
    await sharp(buffer)
      .resize(512, 512, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(jpgPath);
  } else {
    fs.writeFileSync(webpPath, buffer);
    fs.writeFileSync(jpgPath, buffer);
  }

  const stat = fs.statSync(webpPath);
  console.log(`Saved ${slug}: ${stat.size} bytes at ${webpPath}`);
}

async function main() {
  const missing = [
    { slug: 'vo-lam-truyen-ky', pkg: 'com.vng.vltkm', name: 'Võ Lâm Truyền Kỳ Mobile' },
    { slug: 'gunbound-legend-vua-toa-do', pkg: 'com.vtc.gunbound', name: 'Gunbound Legend: Vua Toạ Độ' },
    { slug: 'the-gioi-nuoc-sinh-ton', pkg: 'com.thegioinuoc.vn', name: 'Thế Giới Nước Sinh Tồn' },
  ];

  for (const item of missing) {
    console.log(`\nFetching icon for ${item.name} (${item.slug}) - ${item.pkg}...`);
    const res = await getPlayIcon(item.pkg);
    console.log('Result:', res.status, res.icon);
    if (res.icon) {
      const highResUrl = `${res.icon}=s256-rw`;
      console.log('Downloading from:', highResUrl);
      const buf = await downloadImage(highResUrl);
      await saveIcon(item.slug, buf);
    } else {
      console.warn(`Could not find icon on Google Play for ${item.pkg}`);
      // Fallback check if existing sibling icon exists
      if (item.slug === 'vo-lam-truyen-ky') {
        const siblingPath = path.join(ICONS_DIR, 'vo-lam-truyen-ky-mobile.webp');
        if (fs.existsSync(siblingPath)) {
          console.log('Using sibling vo-lam-truyen-ky-mobile.webp for vo-lam-truyen-ky');
          fs.copyFileSync(siblingPath, path.join(ICONS_DIR, 'vo-lam-truyen-ky.webp'));
          const siblingJpg = path.join(ICONS_DIR, 'vo-lam-truyen-ky-mobile.jpg');
          if (fs.existsSync(siblingJpg)) {
            fs.copyFileSync(siblingJpg, path.join(ICONS_DIR, 'vo-lam-truyen-ky.jpg'));
          }
        }
      }
    }
  }
}

main().catch(console.error);
