const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const topVipCodes = [
  { code: 'S2LACLOIVIP11', rewards: 'Quà vinh danh VIP 11 - S2 Lạc Lối (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'NNBXHTNNVIP11', rewards: 'Quà vinh danh VIP 11 - NNBXHTNN (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'S2LACLOIVIP10', rewards: 'Quà vinh danh VIP 10 - S2 Lạc Lối (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'NNBXHTNNVIP10', rewards: 'Quà vinh danh VIP 10 - NNBXHTNN (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'ROBBERVIP10', rewards: 'Quà vinh danh VIP 10 - Robber (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'LEOSAMAVIP9', rewards: 'Quà vinh danh VIP 9 - Leo Sama (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'KENBIDUCVIP9', rewards: 'Quà vinh danh VIP 9 - Ken Bi Duc (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'DOUBLECHUOT1201VIP9', rewards: 'Quà vinh danh VIP 9 - Double Chuột (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'HEOHAITACVIP9', rewards: 'Quà vinh danh VIP 9 - Heo Hải Tặc (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'HIINOVIP8', rewards: 'Quà vinh danh VIP 8 - Hiino (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'LEOSAMAVIP8', rewards: 'Quà vinh danh VIP 8 - Leo Sama (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'KENBIDUCVIP8', rewards: 'Quà vinh danh VIP 8 - Ken Bi Duc (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'DOUBLECHUOT1201VIP8', rewards: 'Quà vinh danh VIP 8 - Double Chuột (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' },
  { code: 'HEOHAITACVIP8', rewards: 'Quà vinh danh VIP 8 - Heo Hải Tặc (Thẻ Chiêu Mộ - Cao Cấp x5, Đá Đột Phá x50, Sách Kinh Nghiệm - Vàng x10, Kim Cương x100)' }
];

const generalNewCodes = [
  { code: 'TUANMOIVUIVE', rewards: 'Quà sự kiện Tuần Mới Vui Vẻ (Kim Cương + Vé Chiêu Mộ)' },
  { code: 'ROBBERVIP9', rewards: 'Quà vinh danh VIP 9 - Robber (Thẻ Chiêu Mộ Cao Cấp + Đá Đột Phá)' },
  { code: 'DLOW34VIP9', rewards: 'Quà vinh danh VIP 9 - Dlow34 (Thẻ Chiêu Mộ Cao Cấp + Đá Đột Phá)' },
  { code: 'NNBGEMVIP9', rewards: 'Quà vinh danh Server 1 - NNBGem đạt VIP 9 (Kim Cương + Đá Đột Phá)' },
  { code: 'RAMATTHANHCONG', rewards: 'Quà chúc mừng Game Ra Mắt Thành Công (Rương Tướng + Vé Chiêu Mộ)' }
];

const existingActiveCodes = [
  { code: 'S2LACLOIVIP9', rewards: 'Quà Máy Chủ Mới S2 Lạc Lối VIP 9 (Kim Cương + Vé Chiêu Mộ Cao Cấp)' },
  { code: 'DENBUALPHATEST', rewards: 'Quà Đền Bù Sự Cố Alpha Test (Rương Tướng Đỏ + Bình Thể Lực)' },
  { code: 'VAODUOCGAMEROI', rewards: 'Quà Mừng Khắc Phục Lỗi Đăng Nhập (Vé Tầm Bảo Vàng + 5.000 KC)' },
  { code: 'HIMASSXTANVUU', rewards: 'Quà sự kiện Đồng hành Himass x TanVuu' },
  { code: 'TCxLHAT', rewards: 'Quà sự kiện Code Cầu Thủ: TCxLHAT (Thành Chung x LHAT)' },
  { code: 'RAKHOINAO', rewards: 'Quà sự kiện MV 2 - Ra Khơi Nào' },
  { code: 'LENTHUYENTHOI', rewards: 'Quà sự kiện MV Share - Lên Thuyền Thôi' },
  { code: 'EVENTBARTO2', rewards: 'Quà sự kiện Nhận Barto đợt 2' },
  { code: 'EVENTBARTO1', rewards: 'Quà sự kiện Nhận Barto đợt 1' },
  { code: '10KLIKEPAGE', rewards: 'Quà sự kiện Cán mốc 10K Like Page' },
  { code: 'DAISUDONGHANH1', rewards: 'Quà sự kiện Đại sứ đồng hành 1' },
  { code: 'LUFFYLIKEPAGEE', rewards: 'Quà sự kiện Like Fanpage chính thức' },
  { code: 'HUYENTHOAIHAITAC', rewards: 'Giftcode Tân thủ Huyền Thoại Hải Tặc' },
  { code: 'ONEPIECE666', rewards: 'Giftcode Tân thủ Lộc Phát 666' },
  { code: 'ONEPIECE888', rewards: 'Giftcode Tân thủ Phát Tài 888' },
  { code: 'ONEPIECE2026', rewards: 'Giftcode Tân thủ Khai Mở 2026' },
  { code: 'ONEPIECEMMO', rewards: 'Giftcode Tân thủ One Piece MMO' }
];

const expiredCodes = [
  { code: 'ATNGAY1', rewards: 'Quà giftcode sự kiện 21/9 (Đã hết hạn)', status: 'EXPIRED' },
  { code: 'ATNGAY2', rewards: 'Quà giftcode sự kiện 22/9 (Đã hết hạn)', status: 'EXPIRED' }
];

const fullOrderedCodes = [
  ...topVipCodes,
  ...generalNewCodes,
  ...existingActiveCodes,
  ...expiredCodes
];

function createCodeRecord(slug, item, idx) {
  const isExp = item.status === 'EXPIRED';
  const val = item.code.trim();
  const dateBase = new Date(Date.now() - (idx * 60000)).toISOString();
  return {
    id: `code_${slug}_${val}`,
    gameId: slug,
    gameSlug: slug,
    game_slug: slug,
    slug: slug,
    gameName: 'Pirate Legends: Huyền Thoại Hải Tặc',
    codeValue: val,
    code_value: val,
    code: val,
    gift_code: val,
    rewards: item.rewards,
    description: item.rewards,
    status: isExp ? 'EXPIRED' : 'ACTIVE',
    is_active: !isExp,
    is_verified: true,
    isVerified: true,
    expires_at: isExp ? '2026-09-22' : '2026-12-31',
    expiresAt: isExp ? '2026-09-22' : '2026-12-31',
    expiry: isExp ? '2026-09-22' : '2026-12-31',
    sourceUrl: 'https://codegame.store/game/huyen-thoai-hai-tac',
    source: 'https://codegame.store/game/huyen-thoai-hai-tac',
    copyCount: 500 + Math.floor(Math.random() * 500),
    createdAt: dateBase,
    created_at: dateBase,
    added_at: dateBase
  };
}

const targetSlugs = ['huyen-thoai-hai-tac', 'pirate-legends'];

// 1. Update crawled_codes files
const codesFiles = [
  path.join(ROOT, 'src/data/crawled_codes_188.json'),
  path.join(ROOT, 'public/data/crawled_codes_188.json'),
  path.join(ROOT, 'public/data/codes_database.json'),
];

for (const filePath of codesFiles) {
  if (!fs.existsSync(filePath)) continue;
  console.log(`Đang cập nhật ${filePath}...`);
  const codes = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Filter out existing pirate codes
  const filtered = codes.filter(c => {
    const s = c.gameSlug || c.game_slug || c.slug || c.gameId;
    return !targetSlugs.includes(s);
  });

  // Generate new ordered code records for each slug
  const newPirateRecords = [];
  for (const slug of targetSlugs) {
    fullOrderedCodes.forEach((item, idx) => {
      newPirateRecords.push(createCodeRecord(slug, item, idx));
    });
  }

  // Prepend pirate records so they are fresh
  const updatedCodes = [...newPirateRecords, ...filtered];
  fs.writeFileSync(filePath, JSON.stringify(updatedCodes, null, 2), 'utf8');
  console.log(`-> Đã lưu ${updatedCodes.length} codes vào ${filePath} (Có ${fullOrderedCodes.length} mã Pirate Legends mỗi slug).`);
}

// 2. Update games database files
const gamesFiles = [
  path.join(ROOT, 'src/data/games188.json'),
  path.join(ROOT, 'public/data/games188.json'),
  path.join(ROOT, 'public/data/games_database.json'),
];

for (const filePath of gamesFiles) {
  if (!fs.existsSync(filePath)) continue;
  console.log(`Đang cập nhật ${filePath}...`);
  const games = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updatedCount = 0;
  for (const g of games) {
    if (targetSlugs.includes(g.slug) || targetSlugs.includes(g.id)) {
      g.codes_count = fullOrderedCodes.length;
      g.free_codes_count = fullOrderedCodes.filter(c => c.status !== 'EXPIRED').length;
      g.updated_at = new Date().toISOString();
      updatedCount++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(games, null, 2), 'utf8');
  console.log(`-> Đã cập nhật ${updatedCount} bản ghi game trong ${filePath}.`);
}

console.log('✅ Hoàn tất cập nhật mã giftcode Pirate Legend!');
