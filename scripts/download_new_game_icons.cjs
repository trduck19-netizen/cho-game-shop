const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public/game_icons');
const GAMES_PATH = path.join(ROOT, 'src/client/data/games188.json');

// Check missing icons
const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
const newSlugs = [
  'phong-than',
  'vuong-quoc-kien',
  'mong-canh-tam-quoc',
  'ngao-the-vo-lam',
  'than-ma-ao-hoa',
  'thap-tuyet-tran',
  'gun-x-mobile',
  'x-wukong-dai-chien-tam-gioi',
  'kiem-hiep-auto-chess',
  'de-quoc-quat-khoi-tan-the-ky',
  'titan-rush-chien-than-thuc-tinh',
  'skyblock-ba-chu-luc-dia',
  'co-lau-loan-the',
  'ta-la-hac-ngo-khong',
  'vo-hon'
];

async function downloadIconForGame(game) {
  const iconPath = path.join(ICONS_DIR, `${game.slug}.webp`);
  if (fs.existsSync(iconPath)) {
    console.log(`Icon đã tồn tại: ${game.slug}.webp`);
    return;
  }

  // If package ID exists, try to get icon from Google Play
  let iconUrl = null;
  if (game.gp_package_id) {
    try {
      const appUrl = `https://play.google.com/store/apps/details?id=${game.gp_package_id}&hl=vi&gl=VN`;
      const res = await fetch(appUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
        }
      });
      if (res.ok) {
        const html = await res.text();
        // Google play icon pattern: <img src="https://play-lh.googleusercontent.com/..." itemprop="image" alt="Biểu tượng ảnh"
        const m = html.match(/<img[^>]+src="(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)"[^>]+(?:itemprop="image"|alt="Biểu tượng ảnh"|alt="Icon image")/i) ||
                  html.match(/"(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)=s/i);
        if (m) {
          iconUrl = `${m[1]}=s256-rw`;
        }
      }
    } catch (e) {
      console.warn(`Lỗi tìm icon cho ${game.name}:`, e.message);
    }
  }

  if (iconUrl) {
    try {
      console.log(`Đang tải icon từ GP cho ${game.name}: ${iconUrl}`);
      const imgRes = await fetch(iconUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(iconPath, buf);
        console.log(`✓ Đã lưu icon ${game.slug}.webp (${buf.length} bytes)`);
        return;
      }
    } catch (e) {
      console.warn(`Lỗi tải ảnh GP:`, e.message);
    }
  }

  // Fallback: Copy a nice placeholder icon or use existing high-quality template
  const templatePath = path.join(ICONS_DIR, 'anh-hung-tien-len.webp');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, iconPath);
    console.log(`✓ Tạo icon dự phòng cho ${game.slug}.webp`);
  }
}

async function run() {
  for (const slug of newSlugs) {
    const game = games.find(g => g.slug === slug);
    if (game) {
      await downloadIconForGame(game);
    }
  }
}

run();
