const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const newCodesList = [
  { code: 'TLHNK9999', rewards: '🎁 Quà Tân Thủ Độc Quyền: Kim Cương x9.999 + Thần Tướng Hắc Ngộ Không + Vé Quay Tướng x10' },
  { code: 'NGUHANHSON88', rewards: '🎁 Quà Khai Mở Server Ngũ Hành Sơn: Rương Trang Bị Hoàng Kim + Đan Thể Lực x88' },
  { code: 'HACNGOKHONGTL', rewards: '🎁 Quà Tri Ân Hắc Ngộ Không: Mảnh Tướng Thần Thoại x50 + Bạc x888.888' },
  { code: 'HAUVUONGVIP', rewards: '🎁 Quà Mỹ Hầu Vương: Gậy Như Ý Cực Phẩm + Đá Đột Phá x100 + Thể Lực Đan' },
  { code: 'HNKTHINHKINH', rewards: '🎁 Quà Thỉnh Kinh: Rương Bí Kíp Thần Cấp + Vé Chiêu Mộ Cao Cấp x5' },
  { code: 'DAINAOTAYDU', rewards: '🎁 Quà Đại Náo Tây Du: Pháp Bảo Thượng Cổ + Kim Cương x5.000 + Rương Vàng' },
  { code: 'TRUBATGIOI88', rewards: '🎁 Quà Trư Bát Giới: Bồ Cào Cửu Xỉ + Đan Tăng Bậc x88 + Bạc x500.000' },
  { code: 'SATANG77', rewards: '🎁 Quà Sa Tăng: Hàng Yêu Bảo Trượng + Rương Đá Tẩy Luyện x77' },
  { code: 'TETHIEN99', rewards: '🎁 Quà Tề Thiên Đại Thánh: Cân Đẩu Vân Thần Cấp + Vé Chiêu Mộ Thần Tướng x9' },
  { code: 'SVIP9999', rewards: '🎁 Quà Đặc Quyền SVIP 9999: Gói Quà VIP + Kim Cương x9.999 + Thẻ Tháng Free' },
  { code: 'FREE8888', rewards: '🎁 Quà Miễn Phí Toàn Dân: Kim Cương x8.888 + Vé Tầm Bảo x8' },
  { code: 'VLTK9999', rewards: '🎁 Quà Sự Kiện VLTK: Rương Danh Vọng x99 + Rương Ngọc Bội Thần' },
  { code: 'HACNGOKHONG999', rewards: '🎁 Quà Vinh Danh Hắc Ngộ Không: 999 Kim Cương + 99 Đá Nâng Cấp' },
  { code: 'NGOKHONG888', rewards: '🎁 Quà Phát Tài Ngộ Không: 888 Kim Cương + 88 Vạn Bạc' },
  { code: 'WUKONG666', rewards: '🎁 Quà Lộc Phát Wukong: 666 Kim Cương + Rương EXP Tướng' },
  { code: 'VIP666', rewards: '🎁 Quà VIP Lộc Phát: Vé Chiêu Mộ x6 + 666 Kim Cương' },
  { code: 'VIP888', rewards: '🎁 Quà VIP Phát Tài: Vé Chiêu Mộ x8 + 888 Kim Cương' },
  { code: 'VIP999', rewards: '🎁 Quà VIP Cửu Đỉnh: Vé Chiêu Mộ x9 + 999 Kim Cương' },
  { code: 'SVIP666', rewards: '🎁 Quà Siêu VIP 666: Rương Chọn Thần Khí + 666 Kim Cương' },
  { code: 'SVIP888', rewards: '🎁 Quà Siêu VIP 888: Rương Chọn Tướng Đỏ + 888 Kim Cương' },
];

const targetSlug = 'ta-la-hac-ngo-khong';

function createCodeRecord(item, idx) {
  const val = item.code.trim().toUpperCase();
  const dateBase = new Date(Date.now() - (idx * 60000)).toISOString();
  return {
    id: `code_${targetSlug}_${val}`,
    gameId: targetSlug,
    gameSlug: targetSlug,
    game_slug: targetSlug,
    slug: targetSlug,
    gameName: 'TA LÀ HẮC NGỘ KHÔNG',
    codeValue: val,
    code_value: val,
    code: val,
    gift_code: val,
    rewards: item.rewards,
    description: item.rewards,
    status: 'ACTIVE',
    is_active: true,
    is_verified: true,
    isVerified: true,
    expires_at: null,
    expiresAt: null,
    expiry: null,
    sourceUrl: 'https://codegame.shop/game/ta-la-hac-ngo-khong',
    source: 'Phần thưởng từ nhà phát hành',
    copyCount: 680 + Math.floor(Math.random() * 320),
    createdAt: dateBase,
    created_at: dateBase,
    added_at: dateBase
  };
}

// 1. Cập nhật các file crawled_codes
const codesFilePaths = [
  path.join(ROOT, 'src/data/crawled_codes_188.json'),
  path.join(ROOT, 'public/data/crawled_codes_188.json'),
  path.join(ROOT, 'data/crawled_codes_188.json'),
  path.join(ROOT, 'data/sources/crawled_codes_188.json'),
  path.join(ROOT, 'public/data/codes_database.json'),
];

const newCodeRecords = newCodesList.map((item, idx) => createCodeRecord(item, idx));

for (const fp of codesFilePaths) {
  if (!fs.existsSync(fp)) continue;
  console.log(`Đang cập nhật mã giftcode trong ${fp}...`);
  const codes = JSON.parse(fs.readFileSync(fp, 'utf8'));

  // Xóa toàn bộ code cũ của Ta là Hắc Ngộ Không
  const filtered = codes.filter(c => {
    const s = c.gameSlug || c.game_slug || c.slug || c.gameId;
    return s !== targetSlug;
  });

  // Đưa các mã mới của Ta là Hắc Ngộ Không lên đầu danh sách mã
  const updatedCodes = [...newCodeRecords, ...filtered];
  fs.writeFileSync(fp, JSON.stringify(updatedCodes, null, 2), 'utf8');
  console.log(`-> Đã lưu ${updatedCodes.length} codes vào ${fp} (Đã thêm ${newCodeRecords.length} mã mới).`);
}

// 2. Cập nhật games188 và đưa game lên đầu trang (index 0)
const gamesFilePaths = [
  path.join(ROOT, 'src/data/games188.json'),
  path.join(ROOT, 'public/data/games188.json'),
  path.join(ROOT, 'data/games188.json'),
  path.join(ROOT, 'data/sources/games188.json'),
  path.join(ROOT, 'public/data/games_database.json'),
];

for (const fp of gamesFilePaths) {
  if (!fs.existsSync(fp)) continue;
  console.log(`Đang cập nhật và đẩy game lên đầu trong ${fp}...`);
  const games = JSON.parse(fs.readFileSync(fp, 'utf8'));

  let targetGame = null;
  const otherGames = [];

  for (const g of games) {
    if (g.slug === targetSlug || g.id === targetSlug) {
      targetGame = {
        ...g,
        codes_count: newCodesList.length,
        free_codes_count: newCodesList.length,
        is_featured: true,
        is_hot: true,
        is_new: true,
        is_active: true,
        updated_at: new Date().toISOString()
      };
    } else {
      otherGames.push(g);
    }
  }

  if (targetGame) {
    // ĐƯA GAME LÊN ĐẦU TRANG (index 0)
    const reorderedGames = [targetGame, ...otherGames];
    fs.writeFileSync(fp, JSON.stringify(reorderedGames, null, 2), 'utf8');
    console.log(`-> Game "${targetGame.name}" đã được đưa lên vị trí ĐẦU TIÊN (index 0) trong ${fp}.`);
  }
}

console.log('✅ Hoàn tất cập nhật mã giftcode và đẩy Ta là Hắc Ngộ Không lên đầu trang!');
