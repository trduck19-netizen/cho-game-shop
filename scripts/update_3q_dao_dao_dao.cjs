#!/usr/bin/env node
/**
 * update_3q_dao_dao_dao.cjs
 * Cập nhật thông tin giấy phép G1 ABEI, icon và 8 giftcode mới cho 3Q Đào Đào Đào
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'c:/4 Antigravity all/3 Codegame store';
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
const CATALOG_LIGHT = path.join(ROOT, 'src/client/data/games_catalog_light.json');
const PUBLIC_GAMES = path.join(ROOT, 'public/data/games188.json');
const PUBLIC_CODES = path.join(ROOT, 'public/data/crawled_codes_188.json');

const NEW_CODES = [
  { code: '3QDAODAO', reward: '1000 KNB, 50 Xẻng Vàng, Rương Tướng Cam' },
  { code: '3QVIP666', reward: '666 KNB, 66 Vé Quay Tướng, 6666 Bạc' },
  { code: 'DAOBAO2026', reward: '888 KNB, 20 Lệnh Chiêu Mộ Cao Cấp' },
  { code: 'DAODAODAO999', reward: '999 KNB, Rương Bảo Vật Hoàng Kim' },
  { code: 'GACHA1024', reward: '1024 Lượt Quay Gacha Tân Thủ' },
  { code: 'TIEUKIEUVIP', reward: 'Tướng SSR Tiểu Kiều, 500 KNB, Rương Trang Bị VIP' },
  { code: '3QDAODAODTN', reward: 'Quà Độc Quyền Hợp Tác Diêm Thống Nhất (500 KNB, Hộp Quà DTN)' },
  { code: 'HUYNHPHUONGFAPTV', reward: 'Quà Độc Quyền Huỳnh Phương FAPtv (888 KNB, 30 Xẻng Vàng)' },
];

function run() {
  console.log('=== CẬP NHẬT 3Q ĐÀO ĐÀO ĐÀO ===');

  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  const codes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));

  // 1. Tìm hoặc tạo game 3q-dao-dao-dao
  let game = games.find(g => g.slug === '3q-dao-dao-dao' || g.id === '3q-dao-dao-dao' || g.name.toLowerCase().includes('dao dao dao'));
  if (!game) {
    game = {
      id: '3q-dao-dao-dao',
      slug: '3q-dao-dao-dao',
      name: '3Q Đào Đào Đào',
      rating: 5,
      paid_codes_count: 0
    };
    games.push(game);
  }

  game.name = '3Q Đào Đào Đào';
  game.slug = '3q-dao-dao-dao';
  game.id = '3q-dao-dao-dao';
  game.publisher = 'CÔNG TY TNHH JOYGAMES (JoyGames)';
  game.so_giay_phep = '569/QĐ-PTTH&TTĐT';
  game.ngay_cap_phep = '26/08/2026';
  game.release_date = '2026-08-26';
  game.do_tuoi = '18+';
  game.category = 'Chiến Thuật & Thẻ Tướng';
  game.website_g1 = 'https://joyplay.vn';
  game.redeem_url = 'https://joyplay.vn';
  game.icon_url = '/game_icons/3q-dao-dao-dao.webp';
  game.cover_image_url = '/game_icons/3q-dao-dao-dao.webp';
  game.trang_thai_gp = 'Đang hoạt động';
  game.nguon_doi_chieu = 'Cục PTTH&TTĐT (giayphep.abei.gov.vn - QĐ 569/QĐ-PTTH&TTĐT)';
  game.description = '3Q Đào Đào Đào — Tựa game chiến thuật thẻ tướng idle độc lạ phong cách đạo mộ cương thi Tam Quốc từ NPH JoyGames. Sử dụng xẻng vàng đào mộ chiêu mộ Quan Vũ, Lữ Bố, Tiểu Kiều và nhận hàng ngàn lượt quay gacha miễn phí.';
  game.instructions = '1. Đăng nhập vào game 3Q Đào Đào Đào.\n2. Bấm vào Avatar nhân vật ở góc trên bên trái màn hình chính.\n3. Chọn mục "Đổi Quà" (hoặc "Giftcode").\n4. Nhập chính xác mã quà tặng và nhấn "Xác Nhận".\n5. Nhận thưởng ngay qua Hộp Thư trong game.';

  // 2. Thêm hoặc cập nhật 8 mã code
  let addedCount = 0;
  let updatedCount = 0;

  for (const item of NEW_CODES) {
    const existing = codes.find(c => 
      (c.gameSlug === '3q-dao-dao-dao' || c.gameId === '3q-dao-dao-dao') &&
      (c.codeValue || c.code_value || '').toUpperCase() === item.code.toUpperCase()
    );

    if (existing) {
      existing.codeValue = item.code;
      existing.code_value = item.code;
      existing.rewards = item.reward;
      existing.status = 'approved';
      existing.expiresAt = null;
      existing.isVerified = true;
      updatedCount++;
    } else {
      codes.unshift({
        id: `code-3q-dao-dao-dao-${item.code}`,
        gameId: '3q-dao-dao-dao',
        gameSlug: '3q-dao-dao-dao',
        gameName: '3Q Đào Đào Đào',
        codeValue: item.code,
        code_value: item.code,
        rewards: item.reward,
        status: 'approved',
        isVerified: true,
        expiresAt: null,
        sourceUrl: 'https://joyplay.vn',
        createdAt: new Date().toISOString()
      });
      addedCount++;
    }
  }

  // 3. Tính lại free_codes_count
  const activeCodesCount = codes.filter(c => 
    (c.gameSlug === '3q-dao-dao-dao' || c.gameId === '3q-dao-dao-dao') &&
    (c.status || 'approved') === 'approved'
  ).length;
  game.free_codes_count = activeCodesCount;

  console.log(`✓ Đã cập nhật thông tin game: ${game.name}`);
  console.log(`  - NPH: ${game.publisher}`);
  console.log(`  - Số GP: ${game.so_giay_phep} (Ngày cấp: ${game.ngay_cap_phep})`);
  console.log(`  - Thêm mới ${addedCount} mã, cập nhật ${updatedCount} mã.`);
  console.log(`  - Tổng số mã còn hạn của 3Q Đào Đào Đào: ${activeCodesCount} mã.`);

  // 4. Ghi file
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
  fs.writeFileSync(CATALOG_LIGHT, JSON.stringify(games, null, 2), 'utf8');

  if (fs.existsSync(PUBLIC_GAMES)) {
    fs.writeFileSync(PUBLIC_GAMES, JSON.stringify(games, null, 2), 'utf8');
  }
  if (fs.existsSync(PUBLIC_CODES)) {
    fs.writeFileSync(PUBLIC_CODES, JSON.stringify(codes, null, 2), 'utf8');
  }

  // Copy icon to dist if dist exists
  const distIcon = path.join(ROOT, 'dist/game_icons/3q-dao-dao-dao.webp');
  const publicIcon = path.join(ROOT, 'public/game_icons/3q-dao-dao-dao.webp');
  if (fs.existsSync(path.join(ROOT, 'dist/game_icons')) && fs.existsSync(publicIcon)) {
    fs.copyFileSync(publicIcon, distIcon);
    console.log('✓ Đã đồng bộ icon sang dist/game_icons/3q-dao-dao-dao.webp');
  }

  console.log('✓ Ghi dữ liệu đồng bộ thành công!');
}

run();
