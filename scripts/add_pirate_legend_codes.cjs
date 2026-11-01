const fs = require('fs');
const path = require('path');

const gameId = 'pirate-legends';
const gameSlug = 'pirate-legends';
const gameName = 'Pirate Legends: Huyền Thoại Hải Tặc';
const sourceUrl = 'https://www.facebook.com/haitacdaichiengosu';
const source = 'GIFTCODE VINH DANH';
const now = new Date().toISOString();

const newCodesDefs = [
  {
    code: 'ROBBERVIP11',
    vipLevel: 'VIP 11',
    rewards: '🎁 Quà Vinh Danh VIP 11: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'MICKEYVIP10',
    vipLevel: 'VIP 10',
    rewards: '🎁 Quà Vinh Danh VIP 10: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'MICKEYVIP9',
    vipLevel: 'VIP 9',
    rewards: '🎁 Quà Vinh Danh VIP 9: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'CONVOICONVIP8',
    vipLevel: 'VIP 8',
    rewards: '🎁 Quà Vinh Danh VIP 8: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'NNBXKHOCASOCVIP8',
    vipLevel: 'VIP 8',
    rewards: '🎁 Quà Vinh Danh VIP 8: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'SACHUVIP8',
    vipLevel: 'VIP 8',
    rewards: '🎁 Quà Vinh Danh VIP 8: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'TAMTAIVIP8',
    vipLevel: 'VIP 8',
    rewards: '🎁 Quà Vinh Danh VIP 8: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  },
  {
    code: 'MICKEYVIP8',
    vipLevel: 'VIP 8',
    rewards: '🎁 Quà Vinh Danh VIP 8: Thẻ Chiêu Mộ - Cao Cấp x5 + Đá Đột Phá x50 + Sách Kinh Nghiệm - Vàng x10 + Kim Cương x100'
  }
];

const newCodeObjects = newCodesDefs.map(item => ({
  id: `code_${gameSlug}_${item.code}`,
  gameId,
  gameSlug,
  game_slug: gameSlug,
  slug: gameSlug,
  gameName,
  code: item.code,
  codeValue: item.code,
  code_value: item.code,
  gift_code: item.code,
  rewards: item.rewards,
  description: item.rewards,
  status: 'ACTIVE',
  is_active: true,
  is_verified: true,
  isVerified: true,
  expires_at: '2026-12-31',
  expiresAt: '2026-12-31',
  expiry: '2026-12-31',
  sourceUrl,
  source,
  copyCount: Math.floor(Math.random() * 80) + 120,
  createdAt: now,
  created_at: now,
  added_at: now
}));

console.log(`Đã tạo ${newCodeObjects.length} mã giftcode mới cho ${gameName}`);

// 1. Cập nhật crawled_codes_188.json
const codesFiles = ['src/data/crawled_codes_188.json', 'public/data/crawled_codes_188.json'];
for (const cPath of codesFiles) {
  if (fs.existsSync(cPath)) {
    const raw = JSON.parse(fs.readFileSync(cPath, 'utf8'));
    // Lọc bỏ nếu đã có mã trùng (đảm bảo idempotency)
    const newCodeKeys = new Set(newCodeObjects.map(o => o.code));
    const cleanList = raw.filter(c => !newCodeKeys.has(c.code));
    // Đặt các mã mới lên đầu
    const updated = [...newCodeObjects, ...cleanList];
    fs.writeFileSync(cPath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`[${cPath}] Đã cập nhật tổng số mã: ${updated.length} (trước đó: ${raw.length})`);
  }
}

// 2. Cập nhật games188.json
const gamesFiles = ['src/data/games188.json', 'public/data/games188.json'];
for (const gPath of gamesFiles) {
  if (fs.existsSync(gPath)) {
    const games = JSON.parse(fs.readFileSync(gPath, 'utf8'));
    const targetGame = games.find(g => g.id === gameId || g.slug === gameSlug);
    if (targetGame) {
      const oldCount = targetGame.codes_count || 0;
      targetGame.codes_count = oldCount + newCodeObjects.length;
      targetGame.free_codes_count = targetGame.codes_count;
      targetGame.updated_at = now;
      console.log(`[${gPath}] Cập nhật game ${targetGame.name}: codes_count từ ${oldCount} -> ${targetGame.codes_count}`);
      fs.writeFileSync(gPath, JSON.stringify(games, null, 2), 'utf8');
    }
  }
}

console.log('Hoàn thành cập nhật file tĩnh!');
