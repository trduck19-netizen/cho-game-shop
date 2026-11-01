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

const TARGET_GAMES = [
  {
    id: 'gw_free_fire_max',
    name: 'Free Fire MAX',
    slug: 'free-fire',
    icon: '/game_icons/free-fire.webp'
  },
  {
    id: 'gw_fc_mobile_vn',
    name: 'FC Mobile VN',
    slug: 'fc-mobile-vn',
    icon: '/game_icons/fc-mobile-vn.webp'
  },
  {
    id: 'gw_lien_quan_mobile',
    name: 'Liên Quân Mobile',
    slug: 'lien-quan-mobile',
    icon: '/game_icons/lien-quan-mobile.webp'
  },
  {
    id: 'gw_roblox',
    name: 'Roblox',
    slug: 'roblox-blox-fruits',
    icon: '/game_icons/roblox-blox-fruits.webp'
  },
  {
    id: 'gw_pubg_mobile_vn',
    name: 'PUBG Mobile VN',
    slug: 'pubg-mobile',
    icon: '/game_icons/pubg-mobile.webp'
  },
  {
    id: 'gw_play_together_vng',
    name: 'Play Together VNG',
    slug: 'play-together',
    icon: '/game_icons/play-together.webp'
  },
  {
    id: 'gw_garena_delta_force',
    name: 'Garena Delta Force',
    slug: 'delta-force',
    icon: '/game_icons/delta-force.webp'
  },
  {
    id: 'gw_mobile_legends_mlbb',
    name: 'Mobile Legends: Bang Bang (MLBB)',
    slug: 'mobile-legends-bang-bang',
    icon: '/game_icons/mobile-legends-bang-bang.webp'
  },
  {
    id: 'gw_genshin_impact',
    name: 'Genshin Impact',
    slug: 'genshin-impact',
    icon: '/game_icons/genshin-impact.webp'
  },
  {
    id: 'gw_honkai_star_rail',
    name: 'Honkai: Star Rail',
    slug: 'honkai-star-rail',
    icon: '/game_icons/honkai-star-rail.webp'
  }
];

function generate10GiveawayCampaigns() {
  const campaigns = [];

  for (const g of TARGET_GAMES) {
    const virtualClaimed = getRandomInt(20, 70);

    // QUY TẮC NGHIÊM NGẶT: Chưa nạp mã thật vào kho thì codes_pool = [] và remaining_codes = 0 (báo hết code).
    // Tuyệt đối không phát code ảo cho khách!
    campaigns.push({
      id: g.id,
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
      virtual_claimed_offset: virtualClaimed, // Số ảo ngẫu nhiên đã phát từ 20-70
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
    });
  }

  return campaigns;
}

async function main() {
  console.log('--- ĐỒNG BỘ CHÍNH XÁC KHO MÃ GIVEAWAY ---');

  // 1. Đọc 3 game có mã thật từ tệp khôi phục
  let realGiveaways = [];
  try {
    if (fs.existsSync('scripts/real_giveaways_restored.json')) {
      realGiveaways = JSON.parse(fs.readFileSync('scripts/real_giveaways_restored.json', 'utf8'));
      console.log(`Đã nạp ${realGiveaways.length} game có mã thật:`);
      realGiveaways.forEach(rg => {
        rg.remaining_codes = rg.codes_pool.length;
        rg.total_codes = rg.codes_pool.length + (rg.claimed_codes || 0);
        console.log(`  - ${rg.game_name}: ${rg.codes_pool.length} mã thật trong kho (BÁO CÒN HÀNG)`);
      });
    }
  } catch (err) {
    console.error('Lỗi đọc real_giveaways_restored.json:', err.message);
  }

  // 2. Tạo 10 game mới với kho rỗng (báo hết code, không phát code ảo)
  const new10Campaigns = generate10GiveawayCampaigns();
  console.log(`Đã tạo 10 game mới: Kho mã = 0 (BÁO HẾT CODE, số ảo 20-70)`);

  // 3. Kết hợp toàn bộ (3 game có mã thật + 10 game mới)
  const allGiveaways = [...realGiveaways, ...new10Campaigns];
  console.log(`Tổng cộng ${allGiveaways.length} chiến dịch giveaway.`);

  // 4. Lưu sao lưu cục bộ
  fs.writeFileSync('scripts/all_giveaways_backup.json', JSON.stringify(allGiveaways, null, 2), 'utf8');
  fs.writeFileSync('src/data/giveaways.json', JSON.stringify(allGiveaways, null, 2), 'utf8');
  console.log('Đã lưu file dự phòng src/data/giveaways.json và scripts/all_giveaways_backup.json');

  // 5. Đồng bộ lên các Cloudflare Pages
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

  console.log('--- HOÀN THÀNH ĐỒNG BỘ CHÍNH XÁC KHO MÃ ---');
}

main();
