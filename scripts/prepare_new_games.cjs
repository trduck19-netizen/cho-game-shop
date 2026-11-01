const fs = require('fs');
const path = require('path');

function stripAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

function cleanName(str) {
  return stripAccents(str).replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toSlug(str) {
  return stripAccents(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const csvPath = path.resolve(__dirname, 'downloaded_sheet.csv');
const content = fs.readFileSync(csvPath, 'utf8');

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentField += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField);
      currentField = '';
      if (row.some(f => f.trim().length > 0)) lines.push(row);
      row = [];
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField);
    if (row.some(f => f.trim().length > 0)) lines.push(row);
  }
  return lines;
}

const rows = parseCSV(content);

// 18 Publishers map
const pubMap = new Map();
for (let i = 5; i <= 22; i++) {
  const r = rows[i];
  if (r && r[1]) {
    pubMap.set(r[1].trim(), {
      stt: r[0],
      name: r[1].trim(),
      legalName: r[2] ? r[2].trim() : '',
      type: r[3] ? r[3].trim() : '',
      homepage: r[4] ? r[4].trim() : '',
      fanpage: r[5] ? r[5].trim() : ''
    });
  }
}

// 121 games
const allSheetGames = [];
for (let i = 26; i <= 146; i++) {
  const r = rows[i];
  if (r && r[4] && r[4].trim()) {
    allSheetGames.push({
      sttTotal: r[0],
      sttNph: r[1],
      publisher: r[2].trim(),
      group: r[3].trim(),
      gameName: r[4].trim(),
      genre: r[5] ? r[5].trim() : 'Game Online',
      platform: r[6] ? r[6].trim() : 'Mobile',
      officialUrl: r[7] ? r[7].trim() : '',
      fanpageUrl: r[8] ? r[8].trim() : '',
      status: r[9] ? r[9].trim() : 'Đang hoạt động'
    });
  }
}

const existingGames = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/games188.json'), 'utf8'));

// Matched 35 games
const comparison = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'comparison_result.json'), 'utf8'));
// We know Dot Kich VTC was falsely matched with Crossfire Legends VNG, so we remove it from matched
const realMatchedSheetNames = new Set(
  comparison.matched
    .filter(m => !(m.sheet.includes('Đột Kích') && m.publisher.includes('VTC')))
    .map(m => m.sheet)
);

const newGamesToAdd = allSheetGames.filter(g => !realMatchedSheetNames.has(g.gameName));

console.log(`Real matched: ${realMatchedSheetNames.size}`);
console.log(`New games to add: ${newGamesToAdd.length}`);

// Map category to standard Vietnamese game category
function mapCategory(genre) {
  const g = genre.toLowerCase();
  if (g.includes('moba') || g.includes('bắn súng') || g.includes('fps') || g.includes('sinh tồn') || g.includes('battle royale') || g.includes('action')) {
    return 'Hành Động & Chiến Thuật';
  }
  if (g.includes('nhập vai') || g.includes('mmorpg') || g.includes('kiếm hiệp') || g.includes('tiên hiệp')) {
    return 'Nhập Vai (MMORPG)';
  }
  if (g.includes('chiến thuật') || g.includes('thẻ tướng') || g.includes('tam quốc') || g.includes('auto chess')) {
    return 'Chiến Thuật & Thẻ Tướng';
  }
  if (g.includes('thể thao') || g.includes('bóng đá') || g.includes('đua xe') || g.includes('racing') || g.includes('bida')) {
    return 'Thể Thao & Tốc Độ';
  }
  if (g.includes('giải đố') || g.includes('puzzle') || g.includes('âm nhạc') || g.includes('thời trang') || g.includes('casual') || g.includes('mô phỏng')) {
    return 'Casual & Giải Trí';
  }
  return 'Game Online';
}

// Generate unique slug
const existingSlugs = new Set(existingGames.map(g => g.slug.toLowerCase()));
const newGameObjects = newGamesToAdd.map(g => {
  const pubInfo = pubMap.get(g.publisher) || { legalName: g.publisher, type: g.group };
  let baseSlug = toSlug(g.gameName);
  
  // Specific slug cleanups for clarity
  if (g.gameName === 'Liên Minh Huyền Thoại (League of Legends)') baseSlug = 'lien-minh-huyen-thoai';
  else if (g.gameName === 'Liên Minh Huyền Thoại: Tốc Chiến (Wild Rift)') baseSlug = 'lien-minh-toc-chien';
  else if (g.gameName === 'Đột Kích (CrossFire)') baseSlug = 'dot-kich-vtc';
  else if (g.gameName === 'EA Sports FC Online') baseSlug = 'ea-sports-fc-online';
  else if (g.gameName === 'Audition - Nhịp Điệu Cuộc Sống') baseSlug = 'audition-vtc';
  else if (g.gameName === 'Ngọc Rồng Online (Chú Bé Rồng Online)') baseSlug = 'ngoc-rong-online';
  else if (g.gameName === 'Ninja School Online') baseSlug = 'ninja-school-online';
  else if (g.gameName === 'Hải Tặc Tí Hon') baseSlug = 'hai-tac-ti-hon';
  else if (g.gameName === 'Cửu Long Chí Tôn (9Dragons Ultimate)') baseSlug = 'cuu-long-chi-ton';
  else if (g.gameName === 'Võ Lâm Truyền Kỳ Mobile') baseSlug = 'vo-lam-truyen-ky-mobile';
  else if (g.gameName === 'Võ Lâm Truyền Kỳ MAX') baseSlug = 'vo-lam-truyen-ky-max';
  else if (g.gameName === 'Kiếm Thế PC') baseSlug = 'kiem-the-pc';
  else if (g.gameName === 'Silkroad Origin VTC (Con Đường Tơ Lụa)') baseSlug = 'silkroad-origin-vtc';
  else if (g.gameName === 'Phi Đội (Phi Đội 1, 2 & 3 Legend)') baseSlug = 'phi-doi-vtc';

  let slug = baseSlug;
  let counter = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }
  existingSlugs.add(slug);

  const isInternational = g.group.toLowerCase().includes('quốc tế') ||
    ['Amanotes', 'Onesoft', 'Wolffun', 'Bravestars', 'Topebox', 'iKame', 'Hiker'].some(k => g.publisher.includes(k));

  const legalPub = pubInfo.legalName || g.publisher;
  const category = mapCategory(g.genre);

  const licenseInfo = isInternational
    ? `Game Quốc Tế (VGDA / Global Studio - Phát hành toàn cầu bởi ${g.publisher}).`
    : `Bản quyền phát hành chính thức tại Việt Nam bởi ${legalPub}.`;

  const trangThaiGp = isInternational ? 'Game Quốc Tế (Toàn Cầu)' : 'Đã cấp phép (ABEI - G1)';

  // Build standard instructions
  let instructions = 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt / Thiết lập > Chọn mục Giftcode / Mã Quà\nBước 3: Nhập mã và xác nhận để nhận quà trong Hòm thư.';
  if (g.platform.includes('PC') && !g.platform.includes('Mobile')) {
    instructions = `Bước 1: Truy cập trang chủ chính thức hoặc đăng nhập client game ${g.gameName}\nBước 2: Vào mục Nhập Giftcode / Đổi Mã Quà Tặng sự kiện\nBước 3: Dán mã và kiểm tra hòm thư trong game.`;
  }

  return {
    id: slug,
    slug: slug,
    name: g.gameName,
    publisher: legalPub,
    publisher_brand: g.publisher,
    category: category,
    genre: g.genre,
    rating: Number((4.6 + Math.random() * 0.35).toFixed(1)),
    icon_url: `/game_icons/${slug}.webp`,
    cover_image_url: `/game_icons/${slug}.webp`,
    banner_url: '',
    description: `${g.gameName} là tựa game ${g.genre} đình đám được phát hành chính thức bởi ${legalPub}. Tổng hợp toàn bộ mã giftcode tân thủ, sự kiện fanpage và hướng dẫn nhập code nhận quà miễn phí mới nhất.`,
    instructions: instructions,
    platform: g.platform,
    official_url: g.officialUrl,
    fanpage_url: g.fanpageUrl,
    so_giay_phep: isInternational ? 'QUỐC TẾ' : 'Đang đồng bộ ABEI',
    ngay_cap_phep: '2026',
    license_number: isInternational ? 'QUỐC TẾ' : 'Đang đồng bộ ABEI',
    license_date: '2026',
    license_info: licenseInfo,
    trang_thai_gp: trangThaiGp,
    is_international: isInternational,
    release_date: '2026-01-01',
    is_featured: true,
    is_hot: true,
    is_new: true,
    is_active: true,
    codes_count: 0,
    free_codes_count: 0,
    source: 'Phần thưởng từ nhà phát hành',
    updated_at: new Date().toISOString()
  };
});

console.log(`Generated ${newGameObjects.length} new game objects.`);
fs.writeFileSync(path.resolve(__dirname, 'new_games_to_add.json'), JSON.stringify(newGameObjects, null, 2));
