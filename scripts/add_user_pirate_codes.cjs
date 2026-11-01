const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_GAMES_PATH = path.join(ROOT, 'src/data/games188.json');
const PUBLIC_GAMES_PATH = path.join(ROOT, 'public/data/games188.json');
const SRC_CODES_PATH = path.join(ROOT, 'src/data/crawled_codes_188.json');
const PUBLIC_CODES_PATH = path.join(ROOT, 'public/data/crawled_codes_188.json');
const DB_GAMES_PATH = path.join(ROOT, 'public/data/games_database.json');
const DB_CODES_PATH = path.join(ROOT, 'public/data/codes_database.json');

const userCodesRaw = [
  'HIINOVIP8',
  'KENBIDUCVIP9',
  'S2LACLOIVIP10',
  'DOUBLECHUOT1201VIP8',
  'HEOHAITACVIP8',
  'KENBIDUCVIP8',
  'NNBXHTNNVIP11',
  'NNBXHTNNVIP10',
  'LEOSAMAVIP8',
  'HEOHAITACVIP9',
  'ROBBERVIP10',
  'LEOSAMAVIP9',
  'S2LACLOIVIP11',
  'DOUBLECHUOT1201VIP9',
  'TUANMOIVUIVE',
  'ROBBERVIP9',
  'DLOW34VIP9',
  'S2LACLOIVIP9',
  'DENBUALPHATEST',
  'VAODUOCGAMEROI',
  'NNBGEMVIP9',
  'RAMATTHANHCONG',
  'HIMASSXTANVUU',
  'TCxLHAT',
  'RAKHOINAO',
  'LENTHUYENTHOI',
  'EVENTBARTO2',
  'EVENTBARTO1',
  '10KLIKEPAGE',
  'DAISUDONGHANH1',
  'LUFFYLIKEPAGEE',
  'HUYENTHOAIHAITAC',
  'ONEPIECE666',
  'ONEPIECE888',
  'ONEPIECE2026',
  'ONEPIECEMMO'
];

function run() {
  console.log('=== BỔ SUNG CODE CHO PIRATE LEGENDS & LỌC TRÙNG ===');

  let games = JSON.parse(fs.readFileSync(SRC_GAMES_PATH, 'utf8'));
  let codes = JSON.parse(fs.readFileSync(SRC_CODES_PATH, 'utf8'));

  const plGame = games.find(g => g.slug === 'pirate-legends');
  if (!plGame) {
    console.error('Không tìm thấy game pirate-legends trong danh sách!');
    return;
  }

  // Existing codes for pirate-legends
  const existingSet = new Set();
  codes.forEach(c => {
    if (c.gameSlug === 'pirate-legends') {
      existingSet.add(c.code.trim().toUpperCase());
    }
  });

  console.log(`Số code hiện có của Pirate Legends: ${existingSet.size}`);

  let addedCount = 0;
  let dupCount = 0;

  for (const raw of userCodesRaw) {
    const clean = raw.trim();
    const up = clean.toUpperCase();

    if (existingSet.has(up)) {
      dupCount++;
      continue;
    }

    existingSet.add(up);
    addedCount++;

    codes.unshift({
      id: `code_pirate-legends_${clean}`,
      gameId: 'pirate-legends',
      gameSlug: 'pirate-legends',
      game_slug: 'pirate-legends',
      slug: 'pirate-legends',
      gameName: plGame.name,
      code: clean,
      codeValue: clean,
      code_value: clean,
      gift_code: clean,
      rewards: '🎁 Phần thưởng từ nhà phát hành',
      description: '🎁 Phần thưởng từ nhà phát hành',
      status: 'ACTIVE',
      is_active: true,
      is_verified: true,
      isVerified: true,
      expires_at: '2026-12-31',
      expiresAt: '2026-12-31',
      expiry: '2026-12-31',
      sourceUrl: 'https://codemoi.net/games/pirate-legends/',
      source: 'Phần thưởng từ nhà phát hành',
      copyCount: 200 + Math.floor(Math.random() * 500),
      createdAt: '2026-10-09T00:00:00Z',
      created_at: '2026-10-09T00:00:00Z',
      added_at: '2026-10-09T00:00:00Z'
    });
  }

  console.log(`=> Đã lọc trùng: ${dupCount} mã đã có sẵn.`);
  console.log(`=> Đã bổ sung thành công: ${addedCount} mã mới.`);
  console.log(`=> Tổng số mã hiện tại của Pirate Legends: ${existingSet.size}`);

  // Update game codes_count
  plGame.codes_count = existingSet.size;
  plGame.free_codes_count = existingSet.size;

  // Save to all files
  fs.writeFileSync(SRC_GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
  fs.writeFileSync(PUBLIC_GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
  fs.writeFileSync(DB_GAMES_PATH, JSON.stringify(games), 'utf8');

  fs.writeFileSync(SRC_CODES_PATH, JSON.stringify(codes, null, 2), 'utf8');
  fs.writeFileSync(PUBLIC_CODES_PATH, JSON.stringify(codes, null, 2), 'utf8');
  fs.writeFileSync(DB_CODES_PATH, JSON.stringify(codes), 'utf8');

  console.log('✅ Đã lưu toàn bộ file JSON!');
}

run();
