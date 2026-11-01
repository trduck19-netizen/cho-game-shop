const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAMES188 = path.join(ROOT, 'src/client/data/games188.json');
const CATALOG_LIGHT = path.join(ROOT, 'src/client/data/games_catalog_light.json');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
const PUBLIC_GAMES = path.join(ROOT, 'public/data/games188.json');
const PUBLIC_CODES = path.join(ROOT, 'public/data/crawled_codes_188.json');

function run() {
  const games = JSON.parse(fs.readFileSync(GAMES188, 'utf8'));
  const codes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));

  // Ensure Yen Van has all alias tags
  const yenVanGame = games.find(g => g.slug === 'yen-van-thap-luc-thanh' || g.id === 'yen-van-thap-luc-thanh');
  if (yenVanGame) {
    yenVanGame.name = 'Yến Vân Thập Lục Thanh (Where Winds Meet)';
    yenVanGame.publisher = 'Funtap Games';
    yenVanGame.so_giay_phep = '526/QĐ-PTTH&TTĐT';
    yenVanGame.ngay_cap_phep = '17/08/2026';
    yenVanGame.website_g1 = 'https://wwm.funtap.games/';
    yenVanGame.category = 'Hành Động Nhập Vai & Thế Giới Mở';
    yenVanGame.platform = 'PC, Android, iOS';
    yenVanGame.do_tuoi = '18+';
    yenVanGame.trang_thai_gp = 'Đang hoạt động';
    yenVanGame.icon_url = '/game_icons/yen-van-thap-luc-thanh.webp';
    yenVanGame.cover_image_url = '/game_icons/yen-van-thap-luc-thanh.webp';
  }

  // Update codes to ensure they match both yen-van-thap-luc-thanh and where-winds-meet
  for (const c of codes) {
    if (c.gameSlug === 'yen-van-thap-luc-thanh' || c.gameId === 'yen-van-thap-luc-thanh' || c.gameSlug === 'where-winds-meet') {
      c.gameId = 'yen-van-thap-luc-thanh';
      c.gameSlug = 'yen-van-thap-luc-thanh';
      c.gameName = 'Yến Vân Thập Lục Thanh (Where Winds Meet)';
      c.status = 'approved';
      c.isVerified = true;
    }
  }

  // Write games188.json
  fs.writeFileSync(GAMES188, JSON.stringify(games, null, 2), 'utf8');
  // Write games_catalog_light.json
  fs.writeFileSync(CATALOG_LIGHT, JSON.stringify(games, null, 2), 'utf8');
  // Write crawled_codes_188.json
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');

  // Copy to public/data if existing
  if (fs.existsSync(PUBLIC_GAMES)) {
    fs.writeFileSync(PUBLIC_GAMES, JSON.stringify(games, null, 2), 'utf8');
  }
  if (fs.existsSync(PUBLIC_CODES)) {
    fs.writeFileSync(PUBLIC_CODES, JSON.stringify(codes, null, 2), 'utf8');
  }

  console.log(`✓ Đã đồng bộ hoàn tất ${games.length} games và ${codes.length} codes vào tất cả catalogs.`);
}

run();
