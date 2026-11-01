const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const officialCodes = [
  { code: 'MONGTHIENKIEM', rewards: 'Quà mừng game ra mắt độc quyền DigiGames (Kim Cương + Vé Chiêu Mộ Tướng)' },
  { code: 'TIEULONGNU', rewards: 'Rương tướng Tiểu Long Nữ & Đan thăng cấp võ học' },
  { code: 'HUTRUC', rewards: 'Hiệp khách Hư Trúc & Trang bị Hoàng Kim cực phẩm' },
  { code: 'LIKEPAGE', rewards: 'Quà fan cứng fanpage Mộng Thiên Kiếm (Vé Tầm Bảo + Bạc)' },
  { code: 'KHAIMO2210', rewards: 'Quà mừng khai mở máy chủ 22/10 (Kim Phiếu + Vé Chiêu Mộ Cao Cấp)' },
  { code: 'VIP666', rewards: 'Gói quà VIP 666 tân thủ (Kim Cương, Bạc, Rương Đá Đột Phá)' },
  { code: 'VIP777', rewards: 'Gói quà VIP 777 tân thủ (Vé Tầm Bảo, Đan Bồi Dưỡng)' },
  { code: 'VIP888', rewards: 'Gói quà VIP 888 phát tài (Kim Cương, Thẻ Thể Lực)' },
  { code: 'VIP999', rewards: 'Gói quà VIP 999 đại cát (Rương Pháp Bảo, Tinh Hoa Võ Công)' },
  { code: 'HOITUANHHUNG', rewards: 'Quà sự kiện Hội Tụ Anh Hùng võ lâm (Thời Trang Giới Hạn)' },
  { code: 'NGOCXINHGAI', rewards: 'Quà tặng đồng hành mỹ nhân Ngọc Xinh Gái (Bình Thể Lực + Rương Ngọc)' }
];

function generateCodeRecord(item, idx) {
  const codeVal = item.code.trim().toUpperCase();
  const dateBase = new Date(Date.now() - (idx * 60000)).toISOString();
  return {
    id: `code_mong-thien-kiem_${codeVal}`,
    gameId: 'mong-thien-kiem',
    gameSlug: 'mong-thien-kiem',
    game_slug: 'mong-thien-kiem',
    slug: 'mong-thien-kiem',
    gameName: 'Mộng Thiên Kiếm',
    code: codeVal,
    codeValue: codeVal,
    code_value: codeVal,
    gift_code: codeVal,
    rewards: item.rewards,
    description: item.rewards,
    status: 'ACTIVE',
    is_active: true,
    is_verified: true,
    isVerified: true,
    expires_at: null,
    expiresAt: null,
    expiry: null,
    sourceUrl: 'https://mongthienkiem.vn',
    source: 'Nhà phát hành DigiGames',
    copyCount: 260 + Math.floor(Math.random() * 200),
    createdAt: dateBase,
    created_at: dateBase,
    added_at: dateBase
  };
}

const formattedCodes = officialCodes.map((item, idx) => generateCodeRecord(item, idx));

async function main() {
  console.log('=== CẬP NHẬT GAME MỘNG THIÊN KIẾM (NPH DIGIGAMES) & 11 GIFTCODE CHÍNH THỨC ===\n');

  // 1. Cập nhật các file games database nội bộ
  const gamesFiles = [
    path.join(ROOT, 'src/data/games188.json'),
    path.join(ROOT, 'public/data/games188.json'),
    path.join(ROOT, 'public/data/games_database.json'),
  ];

  for (const fp of gamesFiles) {
    if (!fs.existsSync(fp)) continue;
    const games = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let found = false;
    for (const g of games) {
      if (g.slug === 'mong-thien-kiem' || g.id === 'mong-thien-kiem') {
        g.name = 'Mộng Thiên Kiếm';
        g.publisher = 'DigiGames';
        g.category = 'Kiếm Hiệp / Tiên Hiệp';
        g.rating = 4.9;
        g.description = 'Mộng Thiên Kiếm - Tuyệt tác game đấu tướng võ hiệp Kim Dung AFK phát hành chính thức bởi DigiGames. Khai mở máy chủ mới 22/10/2026 với 11 giftcode độc quyền.';
        g.instructions = 'Bước 1: Mở game Mộng Thiên Kiếm và đăng nhập tài khoản.\nBước 2: Bấm vào Avatar nhân vật góc trên bên trái.\nBước 3: Chọn mục "Cài đặt" hoặc "Đổi Giftcode".\nBước 4: Nhập mã code và bấm "Đổi / Xác nhận".\nBước 5: Kiểm tra phần thưởng trong Hộp Thư ingame.';
        g.release_date = '2026-10-22';
        g.is_featured = true;
        g.is_hot = true;
        g.is_new = true;
        g.is_active = true;
        g.codes_count = formattedCodes.length;
        g.free_codes_count = formattedCodes.length;
        g.source = 'Nhà phát hành DigiGames';
        g.updated_at = new Date().toISOString();
        g.codes = formattedCodes;
        found = true;
        break;
      }
    }
    if (found) {
      fs.writeFileSync(fp, JSON.stringify(games, null, 2), 'utf8');
      console.log(`✓ Đã cập nhật ${fp} (publisher: DigiGames, codes_count: ${formattedCodes.length})`);
    }
  }

  // 2. Cập nhật các file crawled_codes database nội bộ
  const codesFiles = [
    path.join(ROOT, 'src/data/crawled_codes_188.json'),
    path.join(ROOT, 'public/data/crawled_codes_188.json'),
    path.join(ROOT, 'public/data/codes_database.json'),
  ];

  for (const fp of codesFiles) {
    if (!fs.existsSync(fp)) continue;
    const existing = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const filtered = existing.filter(c => {
      const s = c.gameSlug || c.game_slug || c.slug || c.gameId;
      return s !== 'mong-thien-kiem';
    });
    const merged = [...formattedCodes, ...filtered];
    fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`✓ Đã cập nhật ${fp} (Tổng: ${merged.length} codes, thêm 11 code Mộng Thiên Kiếm)`);
  }

  // 3. Đồng bộ trực tiếp lên Cloudflare D1
  const endpoints = [
    'https://web-code-game.pages.dev/api/sync',
    'https://admin-code-game-shop.pages.dev/api/sync'
  ];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer wcg_tok_usr_admin_master'
  };

  console.log('\n--- Đồng bộ lên Cloudflare D1 qua Edge Sync API ---');

  for (const ep of endpoints) {
    try {
      console.log(`\nĐang đồng bộ đến: ${ep}`);

      // 3.1. Gửi Custom Free Codes
      const resCustom = await fetch(ep, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_admin_custom_free_codes_v1',
          customFreeCodes: formattedCodes,
          data: formattedCodes
        }),
        signal: AbortSignal.timeout(10000)
      });
      const dataCustom = await resCustom.json().catch(() => ({}));
      console.log(`-> Push wcg_admin_custom_free_codes_v1: ${resCustom.status}`, dataCustom.message || '');

      // 3.2. Lấy games list từ D1, cập nhật mong-thien-kiem và gửi lại
      const resGetGames = await fetch(`${ep}?key=wcg_admin_games_v5`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
      const getGamesJson = await resGetGames.json().catch(() => ({}));
      const d1Games = getGamesJson.data || getGamesJson.games || [];
      if (Array.isArray(d1Games) && d1Games.length > 0) {
        let gameIdx = d1Games.findIndex(g => g && (g.slug === 'mong-thien-kiem' || g.id === 'mong-thien-kiem'));
        const gameUpdate = {
          id: 'mong-thien-kiem',
          slug: 'mong-thien-kiem',
          name: 'Mộng Thiên Kiếm',
          publisher: 'DigiGames',
          category: 'Kiếm Hiệp / Tiên Hiệp',
          rating: 4.9,
          icon_url: '/game_icons/mong-thien-kiem.webp',
          cover_image_url: '/game_icons/mong-thien-kiem.webp',
          banner_url: '',
          description: 'Mộng Thiên Kiếm - Tuyệt tác game đấu tướng võ hiệp Kim Dung AFK phát hành chính thức bởi DigiGames. Khai mở máy chủ mới 22/10/2026 với 11 giftcode độc quyền.',
          instructions: 'Bước 1: Mở game Mộng Thiên Kiếm và đăng nhập tài khoản.\nBước 2: Bấm vào Avatar nhân vật góc trên bên trái.\nBước 3: Chọn mục "Cài đặt" hoặc "Đổi Giftcode".\nBước 4: Nhập mã code và bấm "Đổi / Xác nhận".\nBước 5: Kiểm tra phần thưởng trong Hộp Thư ingame.',
          platform: 'Android, iOS, PC',
          so_giay_phep: '955/QĐ-BTTTT',
          ngay_cap_phep: '2019-06-25',
          license_number: '955/QĐ-BTTTT',
          license_date: '2019-06-25',
          license_info: 'Số GP: 955/QĐ-BTTTT (2019-06-25) - Cục PTTH&TTĐT phê duyệt.',
          trang_thai_gp: 'Đã cấp phép (ABEI - G1)',
          release_date: '2026-10-22',
          is_featured: true,
          is_hot: true,
          is_new: true,
          is_active: true,
          codes_count: formattedCodes.length,
          free_codes_count: formattedCodes.length,
          source: 'Nhà phát hành DigiGames',
          updated_at: new Date().toISOString()
        };

        if (gameIdx !== -1) {
          d1Games[gameIdx] = { ...d1Games[gameIdx], ...gameUpdate };
        } else {
          d1Games.unshift(gameUpdate);
        }

        const resPushGames = await fetch(ep, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            key: 'wcg_admin_games_v5',
            games: d1Games,
            data: d1Games
          }),
          signal: AbortSignal.timeout(15000)
        });
        const pushGamesJson = await resPushGames.json().catch(() => ({}));
        console.log(`-> Push wcg_admin_games_v5: ${resPushGames.status}`, pushGamesJson.message || '');
      }
    } catch (err) {
      console.error(`! Lỗi đồng bộ đến ${ep}:`, err.message);
    }
  }

  console.log('\n✅ CẬP NHẬT HOÀN TẤT!');
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
