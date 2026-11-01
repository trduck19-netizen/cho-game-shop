const fs = require('fs');

const SYNC_KEY = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const ENDPOINTS = [
  'https://admin-code-game-shop.pages.dev/api/sync',
  'https://web-code-game.pages.dev/api/sync',
  'https://codegame.shop/api/sync'
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 18 game hợp lệ trên web (bỏ qua 3Q Đào Đào Đào và Anh Hùng Tiến Lên vì đã có giveaway từ trước)
const NEW_18_GAMES = [
  {
    name: 'Tam Quốc Tứ Thời Ca',
    slug: 'tam-quoc-tu-thoi-ca',
    icon: '/game_icons/tam-quoc-tu-thoi-ca.webp'
  },
  {
    name: 'Giang Hồ Kỳ Ngộ',
    slug: 'giang-ho-ky-ngo',
    icon: '/game_icons/giang-ho-ky-ngo.webp'
  },
  {
    name: 'Samkok Tam Quốc',
    slug: 'samkok-tam-quoc',
    icon: '/game_icons/samkok-tam-quoc.webp'
  },
  {
    name: 'Bộ Lạc 3Q',
    slug: 'bo-lac-3q',
    icon: '/game_icons/bo-lac-3q.webp'
  },
  {
    name: 'Thú Cưng Bão Đạn',
    slug: 'thu-cung-bao-dan',
    icon: '/game_icons/thu-cung-bao-dan.webp'
  },
  {
    name: 'Khế Ước Rồng',
    slug: 'khe-uoc-rong',
    icon: '/game_icons/khe-uoc-rong.webp'
  },
  {
    name: 'Chiến Thú Hỗn Chiến',
    slug: 'chien-thu-hon-chien',
    icon: '/game_icons/chien-thu-hon-chien.webp'
  },
  {
    name: 'Tam Quốc Thú Hóa',
    slug: 'tam-quoc-thu-hoa',
    icon: '/game_icons/tam-quoc-thu-hoa.webp'
  },
  {
    name: 'Chinh Phục Cửu Châu',
    slug: 'chinh-phuc-cuu-chau',
    icon: '/game_icons/chinh-phuc-cuu-chau.webp'
  },
  {
    name: 'Clash of Critters',
    slug: 'clash-of-critters',
    icon: '/game_icons/clash-of-critters.webp'
  },
  {
    name: 'Long Tướng Tam Quốc',
    slug: 'long-tuong-tam-quoc',
    icon: '/game_icons/long-tuong-tam-quoc.webp'
  },
  {
    name: 'Tiểu Cường 3Q',
    slug: 'tieu-cuong-3q',
    icon: '/game_icons/tieu-cuong-3q.webp'
  },
  {
    name: 'Tam Quốc: Tranh Bá Thiên Hạ',
    slug: 'tam-quoc-tranh-ba-thien-ha',
    icon: '/game_icons/tam-quoc-tranh-ba-thien-ha.webp'
  },
  {
    name: 'Đội Tướng Nhí Nhố',
    slug: 'doi-tuong-nhi-nho',
    icon: '/game_icons/doi-tuong-nhi-nho.webp'
  },
  {
    name: 'Quan Nhị Ca',
    slug: 'quan-nhi-ca',
    icon: '/game_icons/quan-nhi-ca.webp'
  },
  {
    name: 'Tam Quốc Quần Anh',
    slug: 'quan-anh-phong-hoa-luc',
    icon: '/game_icons/quan-anh-phong-hoa-luc.webp'
  },
  {
    name: '3Q: Thành Chủ Tiêu Dao',
    slug: '3q-thanh-chu-tieu-dao',
    icon: '/game_icons/3q-thanh-chu-tieu-dao.webp'
  },
  {
    name: 'Dynasty Warriors: Overlords',
    slug: 'dynasty-warriors-overlords',
    icon: '/game_icons/dynasty-warriors-overlords.webp'
  }
];

async function main() {
  console.log('--- TRIỂN KHAI THÊM CÁC GAME VÀO SỰ KIỆN GIVEAWAY ---');

  // 1. Đọc danh sách hiện có
  let currentList = [];
  if (fs.existsSync('src/data/giveaways.json')) {
    currentList = JSON.parse(fs.readFileSync('src/data/giveaways.json', 'utf8'));
  }
  console.log(`Hiện có ${currentList.length} giveaway trong hệ thống.`);

  const existingIds = new Set(currentList.map(g => g.id));
  const existingSlugs = new Set(currentList.map(g => g.game_slug));

  const newCampaigns = [];

  for (const g of NEW_18_GAMES) {
    const id = `gw_${g.slug.replace(/[^a-z0-9_]/gi, '_')}`;
    if (existingIds.has(id) || existingSlugs.has(g.slug)) {
      console.log(`[BỎ QUA] Game ${g.name} (${g.slug}) đã tồn tại trong danh sách giveaway.`);
      continue;
    }

    const virtualClaimed = getRandomInt(20, 155);

    // QUY TẮC NGHIÊM NGẶT: Chưa nạp mã thật vào kho thì codes_pool = [] và remaining_codes = 0 (báo hết code).
    // Tuyệt đối không phát code ảo cho khách!
    const camp = {
      id,
      game_slug: g.slug,
      game_name: g.name,
      game_icon_url: g.icon,
      cover_image_url: g.icon,
      title: '1 code riêng ngẫu nhiên',
      description: '1 code riêng ngẫu nhiên',
      rewards: 'code riêng ngẫu nhiên',
      total_codes: 0,
      remaining_codes: 0, // Báo hết code vì chưa có mã thật trong kho
      claimed_codes: 0,
      codes_pool: [], // Kho rỗng, không có mã ảo
      virtual_claimed_offset: virtualClaimed, // Số ảo ngẫu nhiên đã phát từ 20-155
      show_claimed_count: true,
      min_account_age_days: 0,
      max_per_user: 1,
      max_per_ip: 2,
      cooldown_hours: 1,
      start_time: '2026-10-10',
      end_time: '2026-12-31',
      is_active: true,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    newCampaigns.push(camp);
    console.log(`[THÊM MỚI] ${g.name} | id: ${id} | Kho: 0 (Hết code) | Đã phát ảo: ${virtualClaimed}`);
  }

  const allGiveaways = [...currentList, ...newCampaigns];
  console.log(`Tổng số chiến dịch sau khi bổ sung: ${allGiveaways.length}`);

  // Lưu file cục bộ
  fs.writeFileSync('src/data/giveaways.json', JSON.stringify(allGiveaways, null, 2), 'utf8');
  fs.writeFileSync('scripts/all_giveaways_backup.json', JSON.stringify(allGiveaways, null, 2), 'utf8');
  console.log('Đã cập nhật src/data/giveaways.json');

  // Đồng bộ lên các môi trường Cloudflare Pages (D1 Database)
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Đang đồng bộ tới ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': SYNC_KEY
        },
        body: JSON.stringify({
          key: 'wcg_admin_giveaways_v4',
          data: allGiveaways,
          giveaways: allGiveaways
        })
      });

      const resText = await res.text();
      console.log(`[${endpoint}] Trạng thái: ${res.status} - Kết quả: ${resText.slice(0, 100)}`);
    } catch (err) {
      console.error(`[${endpoint}] Lỗi:`, err.message);
    }
  }

  console.log('--- HOÀN THÀNH ĐỒNG BỘ 18 GAME MỚI LÊN D1 ---');
}

main();
