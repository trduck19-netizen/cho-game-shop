const fs = require('fs');
const path = require('path');

const abeiDb = JSON.parse(fs.readFileSync(path.join(__dirname, 'abei_database.json'), 'utf8'));

// Combine G1 and G234
const allLicenses = [...abeiDb.g1, ...abeiDb.g234];

function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/[^a-z0-9]/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
}

function normalizeGameName(name) {
  let clean = removeVietnameseTones(name);
  const suffixes = [
    'vng games', 'vng', 'funtap', 'sohagame', 'soha', 'vtc game', 'vtc mobile', 'vtc',
    'garena', 'gamota', 'gosu', 'gosupark', 'gzone', 'oeg', 'tth', 'migame', 'dzogame',
    'mobile', 'online', '3d', '2d', 'hd', 'viet nam', 'vn', 'global'
  ];
  for (const s of suffixes) {
    const reg = new RegExp(`\\b${s}\\b`, 'gi');
    clean = clean.replace(reg, ' ');
  }
  return clean.replace(/\s+/g, ' ').trim();
}

// Pre-index licenses
const indexedLicenses = allLicenses.map(lic => ({
  ...lic,
  normVn: normalizeGameName(lic.gameNameVietnam),
  normEn: normalizeGameName(lic.gameNameCopyright),
  rawNormVn: removeVietnameseTones(lic.gameNameVietnam),
  rawNormEn: removeVietnameseTones(lic.gameNameCopyright),
}));

function findLicense(gameName, gameSlug = '') {
  const norm = normalizeGameName(gameName);
  const rawNorm = removeVietnameseTones(gameName);
  const slugNorm = normalizeGameName(gameSlug.replace(/-/g, ' '));

  if (!norm && !slugNorm) return null;

  // 1. Exact match raw name
  let found = indexedLicenses.find(l => 
    (l.rawNormVn && (l.rawNormVn === rawNorm || l.rawNormVn === norm)) ||
    (l.rawNormEn && (l.rawNormEn === rawNorm || l.rawNormEn === norm))
  );
  if (found) return found;

  // 2. Exact match normalized name
  found = indexedLicenses.find(l => 
    (l.normVn && (l.normVn === norm || l.normVn === slugNorm)) ||
    (l.normEn && (l.normEn === norm || l.normEn === slugNorm))
  );
  if (found) return found;

  // 3. Substring inclusion if string is sufficiently long (>= 5 chars)
  if (norm.length >= 5) {
    found = indexedLicenses.find(l => 
      (l.normVn && (l.normVn.includes(norm) || norm.includes(l.normVn))) ||
      (l.normEn && (l.normEn.includes(norm) || norm.includes(l.normEn)))
    );
    if (found) return found;
  }

  // 4. Match against slug
  if (slugNorm.length >= 5) {
    found = indexedLicenses.find(l => 
      (l.normVn && (l.normVn.includes(slugNorm) || slugNorm.includes(l.normVn))) ||
      (l.normEn && (l.normEn.includes(slugNorm) || slugNorm.includes(l.normEn)))
    );
    if (found) return found;
  }

  return null;
}

// Test sample names
const testGames = [
  'Huyền Thoại Hải Tặc',
  'Free Fire',
  'Liên Quân Mobile',
  'Ngọa Long VNG',
  'Tân OMG3Q VNG',
  '3Q Danh Tướng Truyện',
  'Võ Lâm Truyền Kỳ 1 Mobile',
  'Kiếm Thế Origin',
  'Audition Mobile',
  'Gunny Origin',
  'Genshin Impact',
  'Honkai Star Rail',
  'Tam Quốc Chí Chiến Lược TTH',
  'Hắc Tây Du: Chương Cấm'
];

console.log('=== TEST MATCHING RESULTS ===');
testGames.forEach(g => {
  const match = findLicense(g);
  if (match) {
    console.log(`[MATCH] ${g} => Số GP: ${match.licenseNumber} (${match.type}) | NPH: ${match.companyName} | Tên gốc: ${match.gameNameVietnam}`);
  } else {
    console.log(`[NO MATCH] ${g} => Bản Quốc Tế / Chưa tìm thấy`);
  }
});
