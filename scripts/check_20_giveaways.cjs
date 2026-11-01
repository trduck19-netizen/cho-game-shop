const fs = require('fs');

const games = JSON.parse(fs.readFileSync('src/data/games188.json', 'utf8'));
const currentGws = JSON.parse(fs.readFileSync('src/data/giveaways.json', 'utf8'));

const targets = [
  'Tam Quốc Tứ Thời Ca',
  'Giang Hồ Kỳ Ngộ',
  'Samkok Tam Quốc',
  'Bộ Lạc 3Q',
  '3Q Đào Đào Đào',
  'Thú Cưng Bão Đạn',
  'Anh Hùng Tiến Lên',
  'Khế Ước Rồng',
  'Chiến Thú Hỗn Chiến',
  'Tam Quốc Thú Hóa',
  'Chinh Phục Cửu Châu',
  'Clash of Critters',
  'Long Tướng Tam Quốc',
  'Tiểu Cường 3Q',
  'Tam Quốc: Tranh Bá Thiên Hạ',
  'Đội Tướng Nhí Nhố',
  'Quan Nhị Ca',
  'Tam Quốc Quần Anh',
  '3Q: Thành Chủ Tiêu Dao',
  'Dynasty Warriors: Overlords'
];

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

console.log('--- PHÂN TÍCH 20 GAME ---');
const eligible = [];
const skippedAlreadyGw = [];
const skippedNotFound = [];

targets.forEach((t, idx) => {
  const normT = normalize(t);

  // 1. Kiểm tra đã có giveaway chưa
  const existingGw = currentGws.find(g => {
    return normalize(g.game_name) === normT || normalize(g.title) === normT || normalize(g.game_slug) === normT;
  });

  if (existingGw) {
    skippedAlreadyGw.push({ target: t, existingGw: existingGw.game_name, id: existingGw.id });
    console.log(`${idx + 1}. [ĐÃ CÓ GIVEAWAY] ${t} -> Bỏ qua (Đã có: ${existingGw.game_name})`);
    return;
  }

  // 2. Tìm trong danh sách game trên web
  const matchedGames = games.filter(g => {
    const normName = normalize(g.name);
    const normSlug = normalize(g.slug);
    return normName === normT || normSlug === normT;
  });

  if (matchedGames.length === 0) {
    // Thử tìm partial / contains
    const partialGames = games.filter(g => {
      const normName = normalize(g.name);
      const normSlug = normalize(g.slug);
      return normName.includes(normT) || normT.includes(normName);
    });

    if (partialGames.length === 0) {
      skippedNotFound.push(t);
      console.log(`${idx + 1}. [KHÔNG CÓ TRÊN WEB] ${t} -> Bỏ qua`);
      return;
    } else {
      const best = partialGames[0];
      console.log(`${idx + 1}. [TÌM THẤY TƯƠNG ĐƯƠNG] ${t} -> ${best.name} (slug: ${best.slug})`);
      eligible.push({ target: t, game: best });
    }
  } else {
    const exact = matchedGames[0];
    console.log(`${idx + 1}. [HỢP LỆ TRÊN WEB] ${t} -> ${exact.name} (slug: ${exact.slug})`);
    eligible.push({ target: t, game: exact });
  }
});

console.log('\n--- TỔNG KẾT ---');
console.log(`Đủ điều kiện triển khai: ${eligible.length} game`);
console.log(`Bỏ qua vì đã có Giveaway: ${skippedAlreadyGw.length} game`);
console.log(`Bỏ qua vì không có trên web: ${skippedNotFound.length} game`);
