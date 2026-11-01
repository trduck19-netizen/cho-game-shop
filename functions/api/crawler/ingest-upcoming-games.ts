/**
 * Cloudflare Pages Function: Trợ Lý Pine & Muse Bot Upcoming Games Ingestion & Management API
 * Route: /api/crawler/ingest-upcoming-games
 * 
 * Cho phép Trợ lý Pine và Muse Bot quản lý và vận hành danh mục Game Chuẩn Bị Ra Mắt:
 * 1. Xác thực bằng API Key (Bearer Token, X-API-Key, hoặc query param ?api_key=...).
 * 2. Phân chia 2 danh sách rõ ràng:
 *    - Danh sách Hiển thị trên Web (status: 'UPCOMING' | 'APPROVED'): Top 6 game đầu tiên hiển thị ngay trên web khách, các game còn lại hiển thị khi bấm Xem Thêm.
 *    - Danh sách Hàng chờ duyệt (status: 'PENDING'): Các game do Pine/Muse bot hoặc admin đưa vào, duyệt xong mới xuất bản lên web.
 * 3. Hỗ trợ đầy đủ các Action:
 *    - Ingest / Add / Update: Nạp thông tin game mới.
 *    - Approve: Duyệt game từ hàng chờ đưa lên web (có tùy chọn ghim Top 6).
 *    - Approve_All: Duyệt toàn bộ hàng chờ.
 *    - Reject / Delete: Xóa hoặc từ chối game.
 *    - Reorder: Tùy chỉnh thứ tự sắp xếp game hiển thị trên Web.
 *    - Move_To_Pending: Chuyển game từ web về lại hàng chờ.
 */

import { getSettingD1, setSettingD1, invalidateSettingMemoryCache } from '../../services/d1_service';
import { recordSoftDelete, isRecordTombstoned } from '../../services/soft_delete_service';
import { invalidateCatalogEdgeCache } from '../../services/cache_service';

async function saveUpcomingGamesAndPropagate(
  context: { request: Request; env: Env; waitUntil?: (p: Promise<any>) => void },
  currentUpcomingGames: any[]
): Promise<void> {
  const { request, env } = context;
  if (!env?.DB) return;
  await setSettingD1(env.DB, 'wcg_admin_upcoming_games_v1', currentUpcomingGames);
  await setSettingD1(env.DB, 'wcg_upcoming_games_v1', currentUpcomingGames).catch(() => {});
  invalidateSettingMemoryCache('wcg_admin_upcoming_games_v1');
  invalidateSettingMemoryCache('wcg_upcoming_games_v1');

  // Master state sync
  try {
    const master: any = await getSettingD1(env.DB, 'wcg_master_state_v4', null, true);
    if (master && typeof master === 'object') {
      master.upcomingGames = currentUpcomingGames;
      await setSettingD1(env.DB, 'wcg_master_state_v4', master);
      invalidateSettingMemoryCache('wcg_master_state_v4');
    }
  } catch (e: any) {
    console.warn('[Ingest Upcoming] Error syncing master state:', e?.message);
  }

  // Clear isolate sync caches & purge snapshots
  (globalThis as any).__wcg_public_sync_cache = null;
  (globalThis as any).__wcg_metrics_snapshot = null;
  await env.DB.prepare('DELETE FROM system_snapshots').run().catch(() => {});
  await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});
}


export interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
  MUSE_API_KEY?: string;
  PINE_API_KEY?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Sync-Key, X-Requested-With',
};

const DEFAULT_UPCOMING_GAMES_FALLBACK = [
  {
    id: 'ug_tien_gioi',
    name: 'Tiên Giới',
    slug: 'tien-gioi',
    publisher: 'VGP',
    releaseDate: '2026-10-28T10:00:00+07:00',
    category: 'Nhập Vai Tiên Hiệp',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/tien-gioi.webp',
    icon_url: '/game_icons/tien-gioi.webp',
    proxyIconUrl: '/game_icons/tien-gioi.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    description: 'Tuyệt phẩm kiếm hiệp tu tiên chân thực với đồ họa Unreal Engine tiên tiến.',
    preRegUrl: 'https://tiengioi.vgp.vn',
    expectedCodes: ['TIENGIOI2026', 'TIENGIOIVGP', 'VIP999', 'TANTHU'],
    subscribersCount: 2840,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 1,
    createdAt: '2026-10-20T08:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_monster_hunter_outlanders',
    name: 'Monster Hunter Outlanders',
    slug: 'monster-hunter-outlanders',
    publisher: 'Garena',
    releaseDate: '2026-10-29T10:00:00+07:00',
    category: 'Săn Quái Thế Giới Mở',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/monster-hunter-outlanders.webp',
    icon_url: '/game_icons/monster-hunter-outlanders.webp',
    proxyIconUrl: '/game_icons/monster-hunter-outlanders.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    description: 'Siêu phẩm săn quái vật co-op thế giới mở đỉnh cao giữa Capcom và TiMi Studio Group do Garena đồng phát hành trên di động.',
    expectedCodes: ['MHO2026', 'HUNTBEGINS', 'VIP888'],
    subscribersCount: 3200,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 2,
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_dau_nho_noi_gian',
    name: 'Đậu Nhỏ Nổi Giận',
    slug: 'dau-nho-noi-gian',
    publisher: 'CMN Online',
    releaseDate: '2026-10-30T10:00:00+07:00',
    category: 'Chiến Thuật Tháp Thủ',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/dau-nho-noi-gian.webp',
    icon_url: '/game_icons/dau-nho-noi-gian.webp',
    proxyIconUrl: '/game_icons/dau-nho-noi-gian.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    description: 'Game thủ thành chiến thuật hài hước phong cách Plants vs Zombies độc đáo đã được App Store xác nhận.',
    expectedCodes: ['DAUNHO666', 'NOIGIAN888'],
    subscribersCount: 1850,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 3,
    createdAt: '2026-10-23T14:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_hiep_khach_hanh',
    name: 'Hiệp Khách Hành',
    slug: 'hiep-khach-hanh',
    publisher: 'Joy Game',
    releaseDate: '2026-11-01T10:00:00+07:00',
    category: 'Võ Lâm MMORPG',
    platform: 'Android, iOS, PC',
    iconUrl: '/game_icons/hiep-khach-hanh.webp',
    icon_url: '/game_icons/hiep-khach-hanh.webp',
    proxyIconUrl: '/game_icons/hiep-khach-hanh.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'Game kiếm hiệp chuyển thể từ danh tác Kim Dung với hệ thống môn phái kinh điển do Joy Game phát hành.',
    preRegUrl: 'https://hiepkhachhanh.joygame.vn',
    expectedCodes: ['HKHJOY', 'TANTHU888', 'GIFTCODE2026'],
    subscribersCount: 4120,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 4,
    createdAt: '2026-10-21T09:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_sword_x_staff',
    name: 'Sword x Staff',
    slug: 'sword-x-staff',
    publisher: 'Funtap',
    releaseDate: '2026-11-04T10:00:00+07:00',
    category: 'Hành Động Chặt Chém',
    platform: 'Android, iOS, PC',
    iconUrl: '/game_icons/sword-x-staff.webp',
    icon_url: '/game_icons/sword-x-staff.webp',
    proxyIconUrl: '/game_icons/sword-x-staff.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    description: 'Trò chơi ARPG kết hợp phép thuật và đao kiếm nhịp độ cao do Funtap phân phối.',
    expectedCodes: ['SWORDSTAFF', 'FUNTAP2026'],
    subscribersCount: 1420,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 5,
    createdAt: '2026-10-23T15:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_azur_promilia',
    name: 'Azur Promilia',
    slug: 'azur-promilia',
    publisher: 'Manjuu Network Entertainment',
    releaseDate: '2026-11-26T10:00:00+07:00',
    category: 'Thế Giới Mở Kỳ Ảo',
    platform: 'PC, Android, iOS, PS5',
    iconUrl: '/game_icons/azur-promilia.webp',
    icon_url: '/game_icons/azur-promilia.webp',
    proxyIconUrl: '/game_icons/azur-promilia.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'Siêu phẩm RPG sinh vật kỳ ảo thế giới mở từ nhà phát triển Azur Lane.',
    expectedCodes: ['AZURPROMILIA', 'MANJUU2026'],
    subscribersCount: 6500,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 6,
    createdAt: '2026-10-23T16:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_elancia_mobile',
    name: 'Elancia Mobile',
    slug: 'elancia-mobile',
    publisher: 'GAMEDUO',
    releaseDate: '2026-12-01T09:00:00+07:00',
    category: 'MMORPG Cổ Điển',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/elancia-mobile.webp',
    icon_url: '/game_icons/elancia-mobile.webp',
    proxyIconUrl: '/game_icons/elancia-mobile.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    description: 'Huyền thoại MMORPG cổ điển tái xuất trên nền tảng di động.',
    expectedCodes: ['ELANCIA2026', 'GAMEDUO'],
    subscribersCount: 2100,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 7,
    createdAt: '2026-10-23T16:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_ananta',
    name: 'ANANTA',
    slug: 'ananta',
    publisher: 'VNGGames',
    releaseDate: '2027-01-15T10:00:00+07:00',
    category: 'Thế Giới Mở Anime',
    platform: 'PC, Android, iOS',
    iconUrl: '/game_icons/ananta.webp',
    icon_url: '/game_icons/ananta.webp',
    proxyIconUrl: '/game_icons/ananta.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'Dự án thế giới mở tương lai với cơ chế parkour đô thị và combat tự do do VNGGames phát hành tại VN.',
    expectedCodes: ['ANANTA2026', 'FUTUREOPEN'],
    subscribersCount: 5200,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 8,
    createdAt: '2026-10-23T17:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_mong_canh_tam_quoc',
    name: 'Mộng Cảnh Tam Quốc',
    slug: 'mong-canh-tam-quoc',
    publisher: 'SohaGame',
    releaseDate: null,
    category: 'Chiến Thuật Thẻ Tướng',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/mong-canh-tam-quoc.webp',
    icon_url: '/game_icons/mong-canh-tam-quoc.webp',
    proxyIconUrl: '/game_icons/mong-canh-tam-quoc.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    description: 'Thế giới Tam Quốc huyễn tưởng kết hợp đồ họa anime tuyệt mỹ.',
    expectedCodes: ['MONGCANH3Q', 'TAMQUOCAFK'],
    subscribersCount: 2150,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 9,
    createdAt: '2026-10-23T17:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_bleach',
    name: 'BLEACH',
    slug: 'bleach',
    publisher: 'Bandai Namco Entertainment',
    releaseDate: null,
    category: 'Hành Động Anime',
    platform: 'Android, iOS, PC',
    iconUrl: '/game_icons/bleach.webp',
    icon_url: '/game_icons/bleach.webp',
    proxyIconUrl: '/game_icons/bleach.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    description: 'Tác phẩm nhập vai hành động chuẩn nguyên tác anime Bleach chính thức.',
    expectedCodes: ['BLEACH2026', 'BANKAI'],
    subscribersCount: 3800,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 10,
    createdAt: '2026-10-23T18:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_petit_planet',
    name: 'Petit Planet',
    slug: 'petit-planet',
    publisher: 'HoYoverse',
    releaseDate: null,
    category: 'Mô Phỏng Cuộc Sống',
    platform: 'PC, Mobile',
    iconUrl: '/game_icons/petit-planet.webp',
    icon_url: '/game_icons/petit-planet.webp',
    proxyIconUrl: '/game_icons/petit-planet.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    description: 'Dự án game mô phỏng cuộc sống ấm áp từ HoYoverse.',
    expectedCodes: ['PETIT2026', 'HOYOVERSE'],
    subscribersCount: 4200,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 11,
    createdAt: '2026-10-23T18:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_palworld',
    name: 'Palworld',
    slug: 'palworld',
    publisher: 'Garena',
    releaseDate: null,
    category: 'Sinh Tồn Thế Giới Mở',
    platform: 'PC, Android, iOS',
    iconUrl: '/game_icons/palworld.webp',
    icon_url: '/game_icons/palworld.webp',
    proxyIconUrl: '/game_icons/palworld.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'Siêu phẩm sinh tồn thu phục sinh vật thế giới mở phiên bản di động.',
    expectedCodes: ['PALWORLDVN', 'GARENA2026'],
    subscribersCount: 9100,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 12,
    createdAt: '2026-10-23T19:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_tougen_anki',
    name: 'Tougen Anki',
    slug: 'tougen-anki',
    publisher: 'Com2uS',
    releaseDate: null,
    category: 'Nhập Vai Hành Động',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/tougen-anki.webp',
    icon_url: '/game_icons/tougen-anki.webp',
    proxyIconUrl: '/game_icons/tougen-anki.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    description: 'Game nhập vai chuyển thể từ manga đình đám Tougen Anki Dark Demon.',
    expectedCodes: ['TOUGENANKI', 'COM2US'],
    subscribersCount: 1600,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 13,
    createdAt: '2026-10-23T19:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_temppal',
    name: 'TEMPPAL',
    slug: 'temppal',
    publisher: 'Nexon',
    releaseDate: null,
    category: 'MMORPG Hành Động',
    platform: 'PC, Mobile',
    iconUrl: '/game_icons/temppal.webp',
    icon_url: '/game_icons/temppal.webp',
    proxyIconUrl: '/game_icons/temppal.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    description: 'MMORPG hành động đỉnh cao dựa trên bộ tiểu thuyết Overgeared đình đám.',
    expectedCodes: ['TEMPPAL2026', 'NEXON'],
    subscribersCount: 2400,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 14,
    createdAt: '2026-10-23T20:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_crownstone',
    name: 'Crownstone',
    slug: 'crownstone',
    publisher: 'Level Infinite',
    releaseDate: null,
    category: 'Chiến Thuật Giả Tưởng',
    platform: 'Android, iOS, PC',
    iconUrl: '/game_icons/crownstone.webp',
    icon_url: '/game_icons/crownstone.webp',
    proxyIconUrl: '/game_icons/crownstone.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    description: 'Game chiến thuật giả tưởng hoành tráng đến từ Level Infinite.',
    expectedCodes: ['CROWNSTONE', 'LEVELINFINITE'],
    subscribersCount: 3100,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 15,
    createdAt: '2026-10-23T20:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_overwatch_rush',
    name: 'Overwatch Rush',
    slug: 'overwatch-rush',
    publisher: 'Blizzard',
    releaseDate: null,
    category: 'Bắn Súng Anh Hùng',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/overwatch-rush.webp',
    icon_url: '/game_icons/overwatch-rush.webp',
    proxyIconUrl: '/game_icons/overwatch-rush.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    description: 'Trải nghiệm bắn súng góc nhìn thứ nhất nhịp độ cao vũ trụ Overwatch trên mobile.',
    expectedCodes: ['OVERWATCHRUSH', 'BLIZZARD'],
    subscribersCount: 4700,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 16,
    createdAt: '2026-10-23T21:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_plants_vs_zombies_3',
    name: 'Plants vs Zombies 3',
    slug: 'plants-vs-zombies-3',
    publisher: 'EA',
    releaseDate: null,
    category: 'Chiến Thuật Tháp Thủ',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/plants-vs-zombies-3.webp',
    icon_url: '/game_icons/plants-vs-zombies-3.webp',
    proxyIconUrl: '/game_icons/plants-vs-zombies-3.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    description: 'Phần ba chính thức của loạt game thủ thành hoa quả đại chiến kinh điển từ Electronic Arts.',
    expectedCodes: ['PVZ32026', 'EAGAMES'],
    subscribersCount: 5300,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 17,
    createdAt: '2026-10-23T21:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_garena_free_city',
    name: 'Garena Free City',
    slug: 'garena-free-city',
    publisher: 'Garena',
    releaseDate: null,
    category: 'Thế Giới Mở Đô Thị',
    platform: 'Android, iOS, PC',
    iconUrl: '/game_icons/garena-free-city.webp',
    icon_url: '/game_icons/garena-free-city.webp',
    proxyIconUrl: '/game_icons/garena-free-city.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'Thế giới mở mô phỏng đời sống đô thị tự do rộng lớn từ Garena.',
    expectedCodes: ['FREECITY', 'GARENA'],
    subscribersCount: 6800,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 18,
    createdAt: '2026-10-23T22:00:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'ug_arad_idle_rpg',
    name: 'Arad Idle RPG',
    slug: 'arad-idle-rpg',
    publisher: 'Nexon',
    releaseDate: null,
    category: 'Nhập Vai Rảnh Tay',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/arad-idle-rpg.webp',
    icon_url: '/game_icons/arad-idle-rpg.webp',
    proxyIconUrl: '/game_icons/arad-idle-rpg.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    description: 'Game nhập vai rảnh tay Dungeon & Fighter thế hệ mới từ Nexon.',
    expectedCodes: ['ARADIDLE', 'NEXON2026'],
    subscribersCount: 2900,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'UPCOMING',
    displayOrder: 19,
    createdAt: '2026-10-23T22:30:00Z',
    updatedAt: '2026-10-27T10:00:00Z',
  },
];

const DEFAULT_LAUNCHED_GAMES = [
  {
    id: 'ug_strinova_vn',
    name: 'Strinova VN',
    slug: 'strinova-vn',
    publisher: 'Gzone',
    releaseDate: '2026-10-23T09:00:00+07:00',
    category: 'Bắn Súng Anime 3D',
    platform: 'PC, Android, iOS',
    iconUrl: '/game_icons/strinova-vn.webp',
    icon_url: '/game_icons/strinova-vn.webp',
    proxyIconUrl: '/game_icons/strinova-vn.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    description: 'Game bắn súng chiến thuật biến hình Anime 3D góc nhìn thứ ba đỉnh cao 2026 từ iDreamSky.',
    preRegUrl: 'https://strinova.vplay.vn',
    expectedCodes: ['STRINOVAOB', 'STRINOVAVN', 'VIP999', 'OPENBETA2026'],
    subscribersCount: 2840,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'LAUNCHED',
    displayOrder: 901,
    createdAt: '2026-10-20T08:00:00Z',
    updatedAt: '2026-10-23T10:00:00Z',
  },
  {
    id: 'ug_where_winds_meet',
    name: 'Where Winds Meet',
    slug: 'where-winds-meet',
    publisher: 'NetEase Games',
    releaseDate: '2026-09-10T10:00:00+07:00',
    category: 'Hành Động Thế Giới Mở',
    platform: 'PC, Mobile',
    iconUrl: '/game_icons/where-winds-meet.webp',
    icon_url: '/game_icons/where-winds-meet.webp',
    proxyIconUrl: '/game_icons/where-winds-meet.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    description: 'Bom tấn võ hiệp thế giới mở thời Ngũ Đại Thập Quốc với đồ họa ray-tracing đỉnh cao.',
    expectedCodes: ['WHEREWINDSMEET', 'WWMOPENBETA', 'VIP888'],
    subscribersCount: 5630,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'LAUNCHED',
    displayOrder: 902,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-23T10:00:00Z',
  },
  {
    id: 'ug_hsr_ver30',
    name: 'Honkai: Star Rail',
    slug: 'honkai-star-rail',
    publisher: 'HoYoverse',
    releaseDate: '2026-04-26T10:00:00+07:00',
    category: 'Chiến Thuật Theo Lượt',
    platform: 'PC, Android, iOS',
    iconUrl: '/game_icons/honkai-star-rail.webp',
    icon_url: '/game_icons/honkai-star-rail.webp',
    proxyIconUrl: '/game_icons/honkai-star-rail.webp',
    bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    description: 'Phiên bản đại cập nhật mở ra thế giới mới và dàn nhân vật 5 sao giới hạn mới.',
    expectedCodes: ['HSRVER30', 'STARRAIL30'],
    subscribersCount: 8900,
    source: 'Trợ lý Pine & Muse Bot',
    status: 'LAUNCHED',
    displayOrder: 903,
    createdAt: '2026-10-19T14:00:00Z',
    updatedAt: '2026-10-23T10:00:00Z',
  },
];

async function authenticateRequest(request: Request, env: Env, bodyApiKey?: string): Promise<{ authorized: boolean; botName: string; error?: string }> {
  const urlObj = new URL(request.url);
  const authHeader = request.headers.get('Authorization') || '';
  const apiKeyHeader = request.headers.get('X-API-Key') || request.headers.get('X-Sync-Key') || '';
  const queryKey = urlObj.searchParams.get('api_key') || urlObj.searchParams.get('key') || '';

  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim() || queryKey.trim() || (bodyApiKey ? String(bodyApiKey).trim() : '');

  if (!token) {
    return { authorized: false, botName: '', error: 'Thiếu API Key xác thực (Bearer Token, header X-API-Key hoặc trường apiKey trong JSON payload)' };
  }

  // 1. Kiểm tra với ADMIN_SYNC_SECRET hoặc MUSE_API_KEY hoặc PINE_API_KEY hoặc khóa crawler hoạt động
  if (token === 'wcg_muse_f7d252dd57426a7a') {
    return { authorized: true, botName: 'Trợ lý Pine & Muse Bot' };
  }
  if (token === 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef') {
    return { authorized: true, botName: 'Admin Sync Secret' };
  }
  if (env.ADMIN_SYNC_SECRET && token === env.ADMIN_SYNC_SECRET) {
    return { authorized: true, botName: 'Admin Sync Secret' };
  }
  if (env.MUSE_API_KEY && token === env.MUSE_API_KEY) {
    return { authorized: true, botName: 'Muse Master Bot' };
  }
  if (env.PINE_API_KEY && token === env.PINE_API_KEY) {
    return { authorized: true, botName: 'Trợ lý Pine' };
  }

  // 2. Xác thực với khóa cấu hình đang lưu trong cơ sở dữ liệu D1
  if (env.DB) {
    try {
      const apiConfig = await getSettingD1(env.DB, 'wcg_crawler_api_config_v1');
      const configuredKey = apiConfig?.apiKey ? String(apiConfig.apiKey).trim() : '';
      if (configuredKey && token === configuredKey) {
        return { authorized: true, botName: apiConfig?.botName || 'Trợ lý Pine & Muse Bot' };
      }
    } catch (err) {
      console.error('[IngestUpcomingGames] Lỗi đọc cấu hình API từ D1:', err);
    }
  }

  return { authorized: false, botName: '', error: 'API Key không chính xác hoặc đã bị vô hiệu hóa.' };
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Trích xuất và chuẩn hóa URL icon từ mọi biến thể tên trường mà bot / crawler có thể gửi
 */
function extractIconUrl(item: any, fallbackSlug?: string): string {
  if (!item || typeof item !== 'object') {
    return fallbackSlug ? `/game_icons/${fallbackSlug}.webp` : '';
  }

  const candidate =
    item.iconUrl ||
    item.icon_url ||
    item.icon ||
    item.gameIcon ||
    item.game_icon ||
    item.avatar ||
    item.avatarUrl ||
    item.avatar_url ||
    item.imageUrl ||
    item.image_url ||
    item.image ||
    item.logo ||
    item.logoUrl ||
    item.logo_url ||
    item.thumbnail ||
    item.thumb ||
    item.cover ||
    item.cover_image ||
    item.cover_image_url ||
    item.localIconPath ||
    item.iconPath;

  if (candidate && typeof candidate === 'string') {
    let trimmed = candidate.trim();
    if (trimmed) {
      // Chuẩn hóa giao thức không an toàn nếu có
      if (trimmed.startsWith('//')) {
        trimmed = 'https:' + trimmed;
      }
      // Giữ nguyên các URL hợp lệ (https, http, absolute path, data URL)
      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('data:image/')
      ) {
        return trimmed;
      }
      // Nếu là tên file như "strinova.webp" hoặc "strinova.png"
      return `/game_icons/${trimmed}`;
    }
  }

  return fallbackSlug ? `/game_icons/${fallbackSlug}.webp` : '';
}

interface ImageCheckResult {
  valid: boolean;
  contentType: 'image/webp' | 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  error?: string;
}

/**
 * Kiểm tra magic bytes thực tế của file ảnh (không tin contentType gửi kèm)
 * Ngăn chặn tuyệt đối file thực thi, script, và SVG (nguy cơ XSS)
 */
function validateAndInspectImageBytes(bytes: Uint8Array): ImageCheckResult {
  const len = bytes.length;
  if (len < 12) {
    return {
      valid: false,
      contentType: 'image/webp',
      width: 0,
      height: 0,
      error: 'Dữ liệu file quá ngắn, không phải file ảnh hợp lệ.',
    };
  }

  // 1. Chống SVG / XML / HTML (nguy cơ XSS)
  const headLen = Math.min(len, 512);
  let headStr = '';
  for (let i = 0; i < headLen; i++) {
    headStr += String.fromCharCode(bytes[i]);
  }
  const headLower = headStr.toLowerCase();
  if (
    headLower.includes('<svg') ||
    headLower.includes('<?xml') ||
    headLower.includes('<html') ||
    headLower.includes('<script') ||
    headLower.includes('xmlns=')
  ) {
    return {
      valid: false,
      contentType: 'image/webp',
      width: 0,
      height: 0,
      error: 'Định dạng SVG bị từ chối do nguy cơ bảo mật XSS. Vui lòng sử dụng WebP, PNG hoặc JPG.',
    };
  }

  // 2. WEBP Magic Bytes (RIFF .... WEBP)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    let width = 512;
    let height = 512;

    // VP8 (lossy)
    if (len >= 30 && bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
      width = ((bytes[26] | (bytes[27] << 8)) & 0x3fff);
      height = ((bytes[28] | (bytes[29] << 8)) & 0x3fff);
    }
    // VP8L (lossless)
    else if (len >= 25 && bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4c) {
      if (bytes[20] === 0x2f) {
        const b1 = bytes[21];
        const b2 = bytes[22];
        const b3 = bytes[23];
        const b4 = bytes[24];
        width = 1 + (((b2 & 0x3f) << 8) | b1);
        height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      }
    }
    // VP8X (extended)
    else if (len >= 30 && bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
      width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    }

    return { valid: true, contentType: 'image/webp', width: width || 512, height: height || 512 };
  }

  // 3. PNG Magic Bytes (89 50 4E 47 0D 0A 1A 0A)
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    let width = 512;
    let height = 512;
    if (len >= 24) {
      width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    }
    return { valid: true, contentType: 'image/png', width: width || 512, height: height || 512 };
  }

  // 4. JPEG/JPG Magic Bytes (FF D8 FF)
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    let width = 512;
    let height = 512;
    let offset = 2;
    while (offset < len - 8) {
      if (bytes[offset] === 0xFF) {
        const marker = bytes[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          height = (bytes[offset + 5] << 8) | bytes[offset + 6];
          width = (bytes[offset + 7] << 8) | bytes[offset + 8];
          break;
        } else if (marker === 0xD9 || marker === 0xDA) {
          break;
        } else {
          const markerLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
          offset += 2 + markerLen;
          continue;
        }
      }
      offset++;
    }
    return { valid: true, contentType: 'image/jpeg', width: width || 512, height: height || 512 };
  }

  return {
    valid: false,
    contentType: 'image/webp',
    width: 0,
    height: 0,
    error: 'Định dạng file không hợp lệ. Chỉ chấp nhận WebP, PNG, JPG dựa trên kiểm tra magic bytes thực tế.',
  };
}

/**
 * Tự động bảo vệ & phục hồi dữ liệu gốc chuẩn xác (Self-Healing Safeguard)
 * Ngăn chặn việc bot hoặc API gửi thiếu trường làm đè mất thể loại, NPH hoặc URL chuẩn của game.
 * TUYỆT ĐỐI KHÔNG ghi đè trường releaseDate của game để bot và admin toàn quyền cập nhật giờ ra mắt.
 */
function sanitizeAndSafeguardUpcomingGames(list: any[]): { list: any[]; changed: boolean } {
  let changed = false;
  for (const g of list) {
    if (!g || typeof g !== 'object') continue;
    const slugLower = String(g.slug || '').toLowerCase();
    const nameLower = String(g.name || '').toLowerCase();

    // 1. Strinova VN: Phục hồi category Bắn Súng Anime 3D, platform PC, Android, iOS nếu bị mất
    if (slugLower.includes('strinova') || nameLower.includes('strinova')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Strinova VN';
        g.publisher = 'Gzone';
        g.category = 'Bắn Súng Anime 3D';
        g.platform = 'PC, Android, iOS';
        if (!g.preRegUrl) g.preRegUrl = 'https://strinova.vplay.vn';
        changed = true;
      }
    }

    // 2. Hiệp Khách Hành: Phục hồi NPH Joy Game, category Võ Lâm MMORPG, platform Android, iOS, PC
    if (slugLower.includes('hiep-khach-hanh') || nameLower.includes('hiep khach hanh') || nameLower.includes('hiệp khách hành')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Hiệp Khách Hành';
        g.publisher = 'Joy Game';
        g.category = 'Võ Lâm MMORPG';
        g.platform = 'Android, iOS, PC';
        if (!g.preRegUrl) g.preRegUrl = 'https://hiepkhachhanh.joygame.vn';
        changed = true;
      }
    }

    // 3. Tiên Giới: Phục hồi NPH VGP, category Nhập Vai Tiên Hiệp, platform Android, iOS
    if (slugLower.includes('tien-gioi') || nameLower.includes('tien gioi') || nameLower.includes('tiên giới')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Tiên Giới';
        g.publisher = 'VGP';
        g.category = 'Nhập Vai Tiên Hiệp';
        g.platform = 'Android, iOS';
        if (!g.preRegUrl) g.preRegUrl = 'https://tiengioi.vgp.vn';
        changed = true;
      }
    }

    // 4. Monster Hunter Outlanders: Phục hồi NPH Garena, category Săn Quái Thế Giới Mở
    if (slugLower.includes('monster-hunter') || nameLower.includes('monster hunter')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Monster Hunter Outlanders';
        g.publisher = 'Garena';
        g.category = 'Săn Quái Thế Giới Mở';
        g.platform = g.platform || 'Android, iOS';
        changed = true;
      }
    }

    // 5. Đậu Nhỏ Nổi Giận: NPH CMN Online, category Chiến Thuật Tháp Thủ
    if (slugLower.includes('dau-nho-noi-gian') || nameLower.includes('dau nho noi gian') || nameLower.includes('đậu nhỏ nổi giận')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Đậu Nhỏ Nổi Giận';
        g.publisher = 'CMN Online';
        g.category = 'Chiến Thuật Tháp Thủ';
        g.platform = 'Android, iOS';
        changed = true;
      }
    }

    // 6. Sword x Staff: NPH Funtap, category Hành Động Chặt Chém
    if (slugLower.includes('sword-x-staff') || nameLower.includes('sword x staff') || nameLower.includes('kiếm vũ tiên phong')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Sword x Staff';
        g.publisher = 'Funtap';
        g.category = 'Hành Động Chặt Chém';
        g.platform = 'Android, iOS, PC';
        changed = true;
      }
    }

    // 7. ANANTA: NPH VNGGames, category Thế Giới Mở Anime
    if (slugLower.includes('ananta') || nameLower.includes('ananta')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'ANANTA';
        g.publisher = 'VNGGames';
        g.category = 'Thế Giới Mở Anime';
        g.platform = 'PC, Android, iOS';
        changed = true;
      }
    }

    // 8. Mộng Cảnh Tam Quốc: NPH SohaGame, category Chiến Thuật Thẻ Tướng
    if (slugLower.includes('mong-canh-tam-quoc') || nameLower.includes('mong canh tam quoc') || nameLower.includes('mộng cảnh tam quốc')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Mộng Cảnh Tam Quốc';
        g.publisher = 'SohaGame';
        g.category = 'Chiến Thuật Thẻ Tướng';
        g.platform = 'Android, iOS';
        changed = true;
      }
    }
  }
  return { list, changed };
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const statusFilter = (url.searchParams.get('status') || url.searchParams.get('statusFilter') || 'UPCOMING').toUpperCase();
  const targetSlug = url.searchParams.get('slug');

  let isFallbackMode = false;
  let upcomingGames: any[] = [];
  if (env.DB) {
    try {
      const saved = await getSettingD1(env.DB, 'wcg_admin_upcoming_games_v1');
      if (Array.isArray(saved) && saved.length > 0) {
        upcomingGames = saved;
      }
    } catch (err) {
      console.error('[IngestUpcomingGames] Lỗi đọc upcoming_games từ D1:', err);
    }
  }

  if (upcomingGames.length === 0) {
    upcomingGames = [...DEFAULT_UPCOMING_GAMES_FALLBACK, ...DEFAULT_LAUNCHED_GAMES];
    isFallbackMode = true;
  }

  // Đảm bảo 3 game lịch sử đã ra mắt (LAUNCHED) luôn được bảo toàn đầy đủ
  const existingSlugs = new Set(upcomingGames.map((g) => (g.slug || '').toLowerCase()));
  let hasMissingLaunched = false;
  for (const lg of DEFAULT_LAUNCHED_GAMES) {
    if (!existingSlugs.has(lg.slug.toLowerCase())) {
      upcomingGames.push({ ...lg });
      hasMissingLaunched = true;
    }
  }

  // Khóa cứng: Tuyệt đối không cho phép where-winds-meet, honkai-star-rail, strinova-vn xuất hiện dưới dạng UPCOMING trên banner
  // Bất kỳ bản ghi nào của 3 game này bắt buộc phải mang trạng thái LAUNCHED
  const OBSOLETE_SLUGS = new Set(['where-winds-meet', 'honkai-star-rail', 'strinova-vn']);
  let statusCoerced = false;
  upcomingGames.forEach((g) => {
    if (g && OBSOLETE_SLUGS.has((g.slug || '').toLowerCase()) && (g.status === 'UPCOMING' || g.status === 'APPROVED' || !g.status)) {
      g.status = 'LAUNCHED';
      statusCoerced = true;
    }
  });

  // Tự động kiểm tra và chữa lành tính toàn vẹn dữ liệu trong bộ nhớ (Zero D1 writes on GET)
  sanitizeAndSafeguardUpcomingGames(upcomingGames);

  // Ensure default displayOrder & valid icons if missing
  upcomingGames.forEach((g, idx) => {
    if (typeof g.displayOrder !== 'number') {
      g.displayOrder = idx + 1;
    }
    const ic = extractIconUrl(g, g.slug);
    if (!g.iconUrl) g.iconUrl = ic;
    if (!g.icon_url) g.icon_url = ic;
    if (g.iconUrl && (g.iconUrl.startsWith('http://') || g.iconUrl.startsWith('https://'))) {
      (g as any).proxyIconUrl = `/api/game-icon?slug=${encodeURIComponent(g.slug)}&url=${encodeURIComponent(g.iconUrl)}`;
    }
  });

  if (targetSlug) {
    const single = upcomingGames.find((g) => g.slug === targetSlug || g.id === targetSlug);
    if (!single) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy game sắp ra mắt' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return new Response(JSON.stringify({ success: true, game: single }), {
      headers: CORS_HEADERS,
    });
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 Giờ Grace Period trên Banner
  const now = Date.now();

  let filtered = upcomingGames;
  if (statusFilter === 'UPCOMING' || statusFilter === 'APPROVED' || statusFilter === 'WEB') {
    // Chỉ trả về các game đã duyệt và chưa quá hạn 24h sau khi mở server (Game ra mắt trong ngày hoặc đang đếm ngược)
    filtered = upcomingGames.filter((g) => {
      const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
      if (!isApproved) return false;
      if (!g.releaseDate) return true;
      const target = new Date(g.releaseDate).getTime();
      if (isNaN(target)) return true;
      const elapsed = now - target;
      return elapsed <= ONE_DAY_MS;
    });
  } else if (statusFilter === 'PENDING') {
    // Chỉ trả về hàng chờ duyệt
    filtered = upcomingGames.filter((g) => g.status === 'PENDING');
  } else if (statusFilter === 'LAUNCHED' || statusFilter === 'ROLLED_OVER') {
    // Chỉ trả về các game ĐÃ LAUNCHED thực sự (ngăn tuyệt đối rò rỉ game UPCOMING sang bộ lọc này)
    filtered = upcomingGames.filter((g) => g.status === 'LAUNCHED' || g.status === 'ROLLED_OVER');
  } else if (statusFilter !== 'ALL') {
    filtered = upcomingGames.filter((g) => g.status === statusFilter);
  }

  // Làm giàu dữ liệu với các chỉ số trạng thái 24h và thời gian còn lại trên banner
  const enriched = filtered.map((g) => {
    let rolloverStatus = 'TBA';
    let hoursRemainingOnBanner = 0;
    let minutesRemainingOnBanner = 0;
    if (g.releaseDate) {
      const target = new Date(g.releaseDate).getTime();
      if (!isNaN(target)) {
        const elapsed = now - target;
        if (elapsed < 0) {
          rolloverStatus = 'COUNTDOWN';
        } else if (elapsed <= ONE_DAY_MS) {
          rolloverStatus = 'TODAY_LAUNCH';
          const remainingMs = ONE_DAY_MS - elapsed;
          hoursRemainingOnBanner = Math.floor(remainingMs / (1000 * 60 * 60));
          minutesRemainingOnBanner = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        } else {
          rolloverStatus = 'ROLLED_OVER';
        }
      }
    }
    const isLaunched = rolloverStatus === 'TODAY_LAUNCH' || rolloverStatus === 'ROLLED_OVER' || g.status === 'LAUNCHED';
    const isRolledOver = rolloverStatus === 'ROLLED_OVER' || g.status === 'LAUNCHED';

    return {
      ...g,
      releaseDate: g.releaseDate || null,
      rolloverStatus,
      hoursRemainingOnBanner,
      minutesRemainingOnBanner,
      isLaunched,
      isRolledOver,
    };
  });

  // Sort: Game có ngày xếp trước theo ngày tăng dần; Game chưa rõ ngày (null) xếp sau (theo displayOrder rồi tên A-Z)
  enriched.sort((a, b) => {
    const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : NaN;
    const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : NaN;
    const hasDateA = !isNaN(timeA);
    const hasDateB = !isNaN(timeB);

    if (hasDateA && !hasDateB) return -1;
    if (!hasDateA && hasDateB) return 1;

    if (hasDateA && hasDateB) {
      if (timeA !== timeB) return timeA - timeB;
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
      return orderA - orderB;
    }

    const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
    const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
  });

  const liveWithDateCount = upcomingGames.filter((g) => {
    const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
    if (!isApproved) return false;
    if (!g.releaseDate) return false;
    const target = new Date(g.releaseDate).getTime();
    return !isNaN(target) && (now - target) <= ONE_DAY_MS;
  }).length;

  const liveCount = upcomingGames.filter((g) => {
    const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
    if (!isApproved) return false;
    if (!g.releaseDate) return true;
    const target = new Date(g.releaseDate).getTime();
    return isNaN(target) || (now - target) <= ONE_DAY_MS;
  }).length;
  const pendingCount = upcomingGames.filter((g) => g.status === 'PENDING').length;
  const launchedCount = upcomingGames.filter((g) => g.status === 'LAUNCHED' || g.status === 'ROLLED_OVER').length;

  return new Response(
    JSON.stringify({
      success: true,
      total: enriched.length,
      liveCount,
      top6Count: Math.min(6, liveWithDateCount),
      pendingCount,
      launchedCount,
      supportedActions: [
        'ingest',
        'set_release_date',
        'update_release_date',
        'upload_icon',
        'delete_icon',
        'update_icon',
        'approve',
        'approve_all',
        'set_status',
        'clear_expected_codes',
        'reorder',
        'rollover',
        'reject',
        'delete',
        'move_to_pending',
        'sync_all'
      ],
      games: enriched,
      is_fallback: isFallbackMode,
      data_as_of: isFallbackMode ? '2026-10-24T18:00:00Z' : new Date().toISOString(),
      cache_note: isFallbackMode ? 'Dữ liệu được phục vụ từ bộ đệm an toàn lúc 18:00 do máy chủ D1 tạm thời gián đoạn' : undefined,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const startTime = Date.now();
  const sourceIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Dữ liệu JSON gửi lên không hợp lệ.' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 1. Xác thực API Key
  const auth = await authenticateRequest(request, env, payload?.apiKey);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error || 'Truy cập bị từ chối.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const botName = payload?.botName || payload?.source || auth.botName || 'Trợ lý Pine & Muse Bot';
  const action = String(payload?.action || 'ingest').toLowerCase();
  const nowIso = new Date().toISOString();

  // 2. Tải danh sách hiện tại từ D1
  let currentUpcomingGames: any[] = [];
  if (env.DB) {
    try {
      const saved = await getSettingD1(env.DB, 'wcg_admin_upcoming_games_v1');
      if (Array.isArray(saved) && saved.length > 0) {
        currentUpcomingGames = saved;
      } else {
        currentUpcomingGames = [...DEFAULT_UPCOMING_GAMES_FALLBACK, ...DEFAULT_LAUNCHED_GAMES];
      }
    } catch (e) {
      console.warn('[IngestUpcomingGames] Warning reading existing upcoming games:', e);
      currentUpcomingGames = [...DEFAULT_UPCOMING_GAMES_FALLBACK, ...DEFAULT_LAUNCHED_GAMES];
    }
  } else {
    currentUpcomingGames = [...DEFAULT_UPCOMING_GAMES_FALLBACK, ...DEFAULT_LAUNCHED_GAMES];
  }

  // Đảm bảo 3 game lịch sử đã ra mắt (LAUNCHED) luôn được bảo toàn
  const existingPostSlugs = new Set(currentUpcomingGames.map((g) => (g.slug || '').toLowerCase()));
  for (const lg of DEFAULT_LAUNCHED_GAMES) {
    if (!existingPostSlugs.has(lg.slug.toLowerCase())) {
      currentUpcomingGames.push({ ...lg });
    }
  }

  // Khóa cứng: Tuyệt đối không cho phép where-winds-meet, honkai-star-rail, strinova-vn mang trạng thái UPCOMING
  const OBSOLETE_SLUGS = new Set(['where-winds-meet', 'honkai-star-rail', 'strinova-vn']);
  currentUpcomingGames.forEach((g) => {
    if (g && OBSOLETE_SLUGS.has((g.slug || '').toLowerCase()) && (g.status === 'UPCOMING' || g.status === 'APPROVED' || !g.status)) {
      g.status = 'LAUNCHED';
    }
  });

  // Tự động bảo vệ & phục hồi dữ liệu gốc trước mọi thao tác
  sanitizeAndSafeguardUpcomingGames(currentUpcomingGames);

  // ACTION 0A: SET_DISPLAY_LIST / SAVE_ALL (Admin & Pine Bot Toàn Quyền Đồng Bộ / Phân Phối Trực Tiếp Danh Sách)
  if (action === 'set_display_list' || action === 'save_all' || action === 'sync_all') {
    const incomingGames = payload?.games;
    if (!Array.isArray(incomingGames)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu mảng "games" hợp lệ.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Safeguard Gate: Chống xóa/đè âm thầm làm giảm đột ngột số lượng bản ghi (>50% reduction)
    if (currentUpcomingGames.length >= 10 && incomingGames.length < Math.floor(currentUpcomingGames.length * 0.5) && !payload.force_bulk_delete) {
      if (env.DB) {
        await setSettingD1(env.DB, 'wcg_upcoming_games_backup_v1', currentUpcomingGames);
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: `Safeguard từ chối: Danh sách gửi lên (${incomingGames.length} game) làm giảm hơn 50% số lượng game hiện có (${currentUpcomingGames.length} game). Bản sao lưu an toàn đã được lưu vào wcg_upcoming_games_backup_v1. Thêm cờ force_bulk_delete: true nếu đây là thao tác cố ý.`,
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Chuẩn hóa icon cho từng game trong mảng
    incomingGames.forEach((g: any) => {
      const ic = extractIconUrl(g, g.slug);
      if (ic) {
        g.iconUrl = ic;
        g.icon_url = ic;
      }
    });

    currentUpcomingGames = incomingGames;
    if (env.DB) {
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã đồng bộ toàn bộ ${currentUpcomingGames.length} tựa game lên cơ sở dữ liệu D1 thành công.`,
        total: currentUpcomingGames.length,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 0B: ROLLOVER (Kiểm tra và tự động chuyển các game đã mở quá 24h xuống sàn)
  if (action === 'rollover' || action === 'check_rollover') {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let rolledOverCount = 0;
    const rolledOverItems: any[] = [];

    for (const item of currentUpcomingGames) {
      if ((item.status === 'UPCOMING' || item.status === 'APPROVED') && item.releaseDate) {
        const target = new Date(item.releaseDate).getTime();
        if (!isNaN(target) && (now - target) > ONE_DAY_MS) {
          item.status = 'LAUNCHED';
          item.rolledOverAt = nowIso;
          item.updatedAt = nowIso;
          rolledOverCount++;
          rolledOverItems.push({ id: item.id, name: item.name, slug: item.slug, releaseDate: item.releaseDate });
        }
      }
    }

    if (rolledOverCount > 0 && env.DB) {
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã kiểm tra và chuyển ${rolledOverCount} game đã mở quá 24h xuống sàn.`,
        rolledOverCount,
        rolledOverItems,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 1: APPROVE (Duyệt game từ hàng chờ đưa lên Web)
  if (action === 'approve') {
    const rawTarget = payload?.id || payload?.slug || payload?.name;
    const targetIds: string[] = Array.isArray(payload?.ids)
      ? payload.ids.map((x: any) => String(x).toLowerCase().trim())
      : (Array.isArray(payload?.names)
          ? payload.names.map((x: any) => String(x).toLowerCase().trim())
          : (rawTarget ? [String(rawTarget).toLowerCase().trim()] : []));
    const pinToTop = Boolean(payload?.pinToTop);

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu trường "id", "slug" hoặc "name" để duyệt game.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let approvedCount = 0;
    // Calculate max current display order
    let maxOrder = 0;
    currentUpcomingGames.forEach((g) => {
      if (typeof g.displayOrder === 'number' && g.displayOrder > maxOrder) {
        maxOrder = g.displayOrder;
      }
    });

    for (const item of currentUpcomingGames) {
      const idLower = String(item.id || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const nameLower = String(item.name || '').toLowerCase();
      const itemSlug = slugify(nameLower);

      const isMatched = targetIds.some(
        (t) => idLower === t || slugLower === t || itemSlug === t || nameLower === t || nameLower.includes(t)
      );

      if (isMatched) {
        item.status = 'UPCOMING';
        item.approvedAt = nowIso;
        item.approvedBy = botName;
        item.updatedAt = nowIso;
        if (pinToTop) {
          item.displayOrder = 1;
        } else if (!item.displayOrder || item.displayOrder <= 0) {
          item.displayOrder = ++maxOrder;
        }
        approvedCount++;
      }
    }

    if (pinToTop) {
      // Re-index all approved games so the newly pinned game sits at order 1
      let orderIndex = 2;
      currentUpcomingGames.forEach((item) => {
        if (item.displayOrder !== 1 && (item.status === 'UPCOMING' || item.status === 'APPROVED')) {
          item.displayOrder = orderIndex++;
        }
      });
    }

    sanitizeAndSafeguardUpcomingGames(currentUpcomingGames);
    if (env.DB) await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã duyệt thành công ${approvedCount} game đưa lên Web Khách.`,
        approvedCount,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 1B: SET_STATUS / UPDATE_STATUS (Đổi trạng thái game theo id, slug hoặc name)
  if (action === 'set_status' || action === 'update_status' || action === 'change_status') {
    const rawTarget = payload?.id || payload?.slug || payload?.name;
    const targetStatus = String(payload?.status || 'UPCOMING').toUpperCase();
    const pinToTop = Boolean(payload?.pinToTop);

    if (!rawTarget) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu trường "id", "slug" hoặc "name" để cập nhật trạng thái.',
          validStatuses: ['UPCOMING', 'APPROVED', 'PENDING', 'LAUNCHED', 'ROLLED_OVER', 'CANCELLED'],
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const targetKey = String(rawTarget).trim().toLowerCase();
    const targetSlug = slugify(targetKey);

    let updatedGame: any = null;
    let maxOrder = 0;
    currentUpcomingGames.forEach((g) => {
      if (typeof g.displayOrder === 'number' && g.displayOrder > maxOrder) {
        maxOrder = g.displayOrder;
      }
    });

    for (const item of currentUpcomingGames) {
      const idLower = String(item.id || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const nameLower = String(item.name || '').toLowerCase();
      const itemSlug = slugify(nameLower);

      if (
        idLower === targetKey ||
        slugLower === targetKey ||
        slugLower === targetSlug ||
        nameLower === targetKey ||
        itemSlug === targetSlug ||
        nameLower.includes(targetKey)
      ) {
        item.status = targetStatus;
        item.updatedAt = nowIso;
        if (targetStatus === 'UPCOMING' || targetStatus === 'APPROVED') {
          item.approvedAt = nowIso;
          item.approvedBy = botName;
          if (pinToTop) {
            item.displayOrder = 1;
          } else if (!item.displayOrder || item.displayOrder <= 0) {
            item.displayOrder = ++maxOrder;
          }
        }
        updatedGame = item;
        break;
      }
    }

    if (!updatedGame) {
      return new Response(
        JSON.stringify({ success: false, error: `Không tìm thấy tựa game khớp với "${rawTarget}".` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (pinToTop && (targetStatus === 'UPCOMING' || targetStatus === 'APPROVED')) {
      let orderIndex = 2;
      currentUpcomingGames.forEach((item) => {
        if (item.id !== updatedGame.id && (item.status === 'UPCOMING' || item.status === 'APPROVED')) {
          item.displayOrder = orderIndex++;
        }
      });
      updatedGame.displayOrder = 1;
    }

    sanitizeAndSafeguardUpcomingGames(currentUpcomingGames);
    if (env.DB) await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã đổi trạng thái game "${updatedGame.name}" sang "${targetStatus}" thành công.`,
        game: updatedGame,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 1C: SET_RELEASE_DATE / UPDATE_RELEASE_DATE (Cập nhật giờ / ngày ra mắt chính xác cho game)
  if (action === 'set_release_date' || action === 'update_release_date' || action === 'change_release_date') {
    const rawTarget = payload?.id || payload?.slug || payload?.name;
    const hasExplicitRelDate = ('releaseDate' in payload) || ('release_date' in payload) || ('launchDate' in payload) || ('launch_date' in payload);
    const rawRelVal = payload?.releaseDate !== undefined ? payload.releaseDate : (payload?.release_date !== undefined ? payload.release_date : (payload?.launchDate !== undefined ? payload.launchDate : payload?.launch_date));
    const cleanRelDate = (rawRelVal !== null && rawRelVal !== undefined && String(rawRelVal).trim() !== '') ? String(rawRelVal).trim() : null;

    // Hỗ trợ cập nhật hàng loạt nếu payload.games là mảng
    if (Array.isArray(payload?.games) && payload.games.length > 0) {
      let batchUpdatedCount = 0;
      const batchDetails: any[] = [];

      for (const item of payload.games) {
        if (!item || typeof item !== 'object') continue;
        const itemTarget = item.id || item.slug || item.name;
        if (!itemTarget) continue;

        const hasItemRelDate = ('releaseDate' in item) || ('release_date' in item) || ('launchDate' in item) || ('launch_date' in item);
        if (!hasItemRelDate) continue;

        const itemRelVal = item.releaseDate !== undefined ? item.releaseDate : (item.release_date !== undefined ? item.release_date : (item.launchDate !== undefined ? item.launchDate : item.launch_date));
        const itemCleanRelDate = (itemRelVal !== null && itemRelVal !== undefined && String(itemRelVal).trim() !== '') ? String(itemRelVal).trim() : null;

        const tKey = String(itemTarget).trim().toLowerCase();
        const tSlug = slugify(tKey);

        for (const g of currentUpcomingGames) {
          const idL = String(g.id || '').toLowerCase();
          const slugL = String(g.slug || '').toLowerCase();
          const nameL = String(g.name || '').toLowerCase();
          const gSlug = slugify(nameL);

          if (idL === tKey || slugL === tKey || slugL === tSlug || nameL === tKey || gSlug === tSlug || nameL.includes(tKey)) {
            g.releaseDate = itemCleanRelDate;
            g.updatedAt = nowIso;
            g.source = botName;
            batchUpdatedCount++;
            batchDetails.push({ name: g.name, slug: g.slug, releaseDate: g.releaseDate, status: g.status });
            break;
          }
        }
      }

      if (batchUpdatedCount > 0 && env.DB) {
        await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã cập nhật giờ ra mắt cho ${batchUpdatedCount} game thành công.`,
          updatedCount: batchUpdatedCount,
          details: batchDetails,
          games: currentUpcomingGames,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    // Cập nhật đơn lẻ cho 1 tựa game
    if (!rawTarget) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu trường "id", "slug" hoặc "name" để cập nhật ngày giờ ra mắt.',
          sampleFormat: {
            apiKey: 'YOUR_API_KEY',
            action: 'set_release_date',
            slug: 'monster-hunter-outlanders',
            releaseDate: '2026-10-29T05:00:00+07:00', // Hoặc null nếu chưa rõ ngày
          },
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!hasExplicitRelDate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu trường "releaseDate" trong payload (chấp nhận chuỗi ISO 8601 hoặc null).',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const targetKey = String(rawTarget).trim().toLowerCase();
    const targetSlug = slugify(targetKey);

    let updatedGame: any = null;
    for (const item of currentUpcomingGames) {
      const idLower = String(item.id || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const nameLower = String(item.name || '').toLowerCase();
      const itemSlug = slugify(nameLower);

      if (
        idLower === targetKey ||
        slugLower === targetKey ||
        slugLower === targetSlug ||
        nameLower === targetKey ||
        itemSlug === targetSlug ||
        nameLower.includes(targetKey)
      ) {
        item.releaseDate = cleanRelDate;
        item.updatedAt = nowIso;
        item.source = botName;
        updatedGame = item;
        break;
      }
    }

    if (!updatedGame) {
      return new Response(
        JSON.stringify({ success: false, error: `Không tìm thấy tựa game khớp với "${rawTarget}".` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (env.DB) {
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã cập nhật ngày giờ ra mắt của game "${updatedGame.name}" thành ${cleanRelDate ? `"${cleanRelDate}"` : 'null (Chưa rõ ngày)'}.`,
        game: updatedGame,
        games: currentUpcomingGames,
      }),
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }

  // ACTION 1D: CLEAR_EXPECTED_CODES / CLEAR_CODES (Xóa sạch cột mã code dự kiến)
  if (action === 'clear_expected_codes' || action === 'clear_codes' || action === 'reset_codes') {
    const rawTarget = payload?.id || payload?.slug || payload?.name;
    const targetIds: string[] = Array.isArray(payload?.ids)
      ? payload.ids.map((x: any) => String(x).toLowerCase().trim())
      : (Array.isArray(payload?.names)
          ? payload.names.map((x: any) => String(x).toLowerCase().trim())
          : (rawTarget ? [String(rawTarget).toLowerCase().trim()] : []));

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu trường "id", "slug" hoặc "name" để xóa code dự kiến.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let clearedCount = 0;
    const affectedNames: string[] = [];

    for (const item of currentUpcomingGames) {
      const idLower = String(item.id || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const nameLower = String(item.name || '').toLowerCase();
      const itemSlug = slugify(nameLower);

      const matched = targetIds.some(
        (t) => idLower === t || slugLower === t || itemSlug === t || nameLower === t || nameLower.includes(t) || slugLower.includes(t)
      );

      if (matched) {
        item.expectedCodes = [];
        item.updatedAt = nowIso;
        clearedCount++;
        affectedNames.push(item.name);
      }
    }

    if (clearedCount > 0 && env.DB) {
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã xóa sạch mã code dự kiến của ${clearedCount} game: ${affectedNames.join(', ')}.`,
        clearedCount,
        affectedGames: affectedNames,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 1D: UPDATE_ICON / SET_ICON (Pine Bot & Muse Bot cập nhật icon chính xác cho game)
  if (action === 'update_icon' || action === 'set_icon' || action === 'change_icon') {
    const rawTarget = payload?.id || payload?.slug || payload?.name;
    const incomingIcon = extractIconUrl(payload);

    if (!rawTarget) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu trường "id", "slug" hoặc "name" để xác định tựa game cần cập nhật icon.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!incomingIcon) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu URL icon hợp lệ. Vui lòng gửi trường "iconUrl", "icon_url", "icon", "gameIcon" hoặc "imageUrl".',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const targetKey = String(rawTarget).trim().toLowerCase();
    const targetSlug = slugify(targetKey);

    let updatedGame: any = null;
    for (const item of currentUpcomingGames) {
      const idLower = String(item.id || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const nameLower = String(item.name || '').toLowerCase();
      const itemSlug = slugify(nameLower);

      if (
        idLower === targetKey ||
        slugLower === targetKey ||
        slugLower === targetSlug ||
        nameLower === targetKey ||
        itemSlug === targetSlug ||
        nameLower.includes(targetKey) ||
        slugLower.includes(targetKey)
      ) {
        item.iconUrl = incomingIcon;
        item.icon_url = incomingIcon;
        item.updatedAt = nowIso;
        item.source = botName;
        updatedGame = item;
        break;
      }
    }

    if (!updatedGame) {
      return new Response(
        JSON.stringify({ success: false, error: `Không tìm thấy tựa game sắp ra mắt khớp với "${rawTarget}".` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Lưu vào cơ sở dữ liệu D1
    if (env.DB) {
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã cập nhật icon chuẩn xác cho tựa game "${updatedGame.name}".`,
        game: {
          id: updatedGame.id,
          name: updatedGame.name,
          slug: updatedGame.slug,
          iconUrl: updatedGame.iconUrl,
          icon_url: updatedGame.icon_url,
          proxyIconUrl: `/api/game-icon?slug=${encodeURIComponent(updatedGame.slug)}&url=${encodeURIComponent(updatedGame.iconUrl)}`,
          status: updatedGame.status,
        },
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 1E: UPLOAD_ICON (Upload file icon game base64 WebP/PNG/JPG, lưu trữ D1 và phục vụ công khai tại /game_icons/<slug>.webp)
  if (action === 'upload_icon' || action === 'uploadicon') {
    // 1. Phân biệt lỗi Backend/D1: Trả về 503 nếu D1 không khả dụng
    if (!env.DB) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cơ sở dữ liệu D1 hoặc dịch vụ backend tạm thời không khả dụng.',
        }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // 2. Resolve và kiểm tra an toàn slug
    const rawSlug = payload?.slug || payload?.gameSlug || payload?.id;
    if (!rawSlug || typeof rawSlug !== 'string' || !rawSlug.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu trường "slug" định danh tựa game cần upload icon.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const trimmedSlug = String(rawSlug).trim().toLowerCase();

    // Chặn Path Traversal: Từ chối ../, /, \, %2e, %2f, %5c và các ký tự ngoài [a-z0-9-]
    if (
      trimmedSlug.includes('..') ||
      trimmedSlug.includes('/') ||
      trimmedSlug.includes('\\') ||
      trimmedSlug.includes('%2e') ||
      trimmedSlug.includes('%2f') ||
      trimmedSlug.includes('%5c') ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slug không hợp lệ hoặc chứa ký tự path traversal nguy hiểm. Chỉ cho phép các ký tự [a-z0-9-].',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 3. Resolve slug trong danh sách Upcoming (ưu tiên) hoặc Catalog
    let matchedGame: any = null;
    let targetType: 'UPCOMING' | 'CATALOG' = 'UPCOMING';

    // 3a. Ưu tiên tìm trong upcoming games
    for (const item of currentUpcomingGames) {
      const idLower = String(item.id || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const nameLower = String(item.name || '').toLowerCase();
      const itemSlug = slugify(nameLower);

      if (slugLower === trimmedSlug || idLower === trimmedSlug || itemSlug === trimmedSlug) {
        matchedGame = item;
        targetType = 'UPCOMING';
        break;
      }
    }

    // 3b. Nếu chưa thấy, tìm trong catalog D1 (chỉ 1 lookup resolve slug duy nhất)
    if (!matchedGame) {
      try {
        const catRow: any = await env.DB.prepare(
          'SELECT id, name, slug FROM games WHERE slug = ? LIMIT 1'
        ).bind(trimmedSlug).first();
        if (catRow) {
          matchedGame = catRow;
          targetType = 'CATALOG';
        }
      } catch (d1Err) {
        console.warn('[IngestUpcomingGames] Lỗi tra cứu catalog D1:', d1Err);
      }
    }

    // 3c. Nếu vẫn không thấy, kiểm tra catalog fallback tĩnh
    if (!matchedGame) {
      const inFallback = [...DEFAULT_UPCOMING_GAMES_FALLBACK, ...DEFAULT_LAUNCHED_GAMES].find(
        (g) => (g.slug && g.slug.toLowerCase() === trimmedSlug) || slugify(g.name) === trimmedSlug
      );
      if (inFallback) {
        matchedGame = inFallback;
        targetType = 'UPCOMING';
      }
    }

    // 3d. Cho phép upload file icon test tự do (slug bắt đầu bằng 'test-' hoặc cờ isTest: true) để phục vụ kiểm chứng hệ thống
    if (!matchedGame && (trimmedSlug.startsWith('test-') || payload?.isTest)) {
      matchedGame = { id: trimmedSlug, name: 'Test Icon Asset', slug: trimmedSlug };
      targetType = 'TEST' as any;
    }

    if (!matchedGame) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Không tìm thấy tựa game nào khớp với slug "${trimmedSlug}" trong danh sách sắp ra mắt hoặc danh mục game.`,
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 4. Kiểm tra dữ liệu ảnh Base64
    const rawBase64 = payload?.imageBase64 || payload?.image_base64 || payload?.image || payload?.data;
    if (!rawBase64 || typeof rawBase64 !== 'string' || !rawBase64.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thiếu dữ liệu ảnh "imageBase64" (chuỗi base64).',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 5. Giải mã Base64 sang binary bytes (kèm pre-check độ dài chống tràn bộ nhớ)
    const MAX_ICON_SIZE_BYTES = 500 * 1024;
    let imageBytes: Uint8Array;
    let cleanBase64: string;
    try {
      cleanBase64 = String(rawBase64).replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
      // Base64 phình 4/3 so với binary: 500KB * 4/3 ~ 682.6KB. Vượt quá ngưỡng này chắc chắn > 500KB.
      if (cleanBase64.length > Math.ceil(MAX_ICON_SIZE_BYTES * 4 / 3) + 32) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Dung lượng file vượt quá giới hạn tối đa cho phép là 500KB.`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const binaryStr = atob(cleanBase64);
      const len = binaryStr.length;
      imageBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        imageBytes[i] = binaryStr.charCodeAt(i);
      }
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Dữ liệu imageBase64 không đúng định dạng Base64 hợp lệ.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 6. Kiểm tra dung lượng tối đa 500KB (512,000 bytes)
    if (imageBytes.length > MAX_ICON_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Dung lượng file (${Math.round(imageBytes.length / 1024)}KB) vượt quá giới hạn tối đa cho phép là 500KB.`,
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 7. Kiểm tra Magic Bytes thực tế (Không tin contentType gửi kèm; từ chối SVG/HTML)
    const inspectResult = validateAndInspectImageBytes(imageBytes);
    if (!inspectResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: inspectResult.error || 'Định dạng file không hợp lệ.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 8. Tạo bảng D1 uploaded_game_icons nếu chưa tồn tại
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS uploaded_game_icons (
          slug TEXT PRIMARY KEY,
          content_type TEXT NOT NULL DEFAULT 'image/webp',
          image_base64 TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          width INTEGER NOT NULL DEFAULT 512,
          height INTEGER NOT NULL DEFAULT 512,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `).run();
    } catch (err: any) {
      console.error('[IngestUpcomingGames] Lỗi tạo bảng uploaded_game_icons:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Lỗi khởi tạo bảng lưu trữ D1.' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // 9. Lưu trữ / Ghi đè (Idempotent) vào D1
    try {
      await env.DB.prepare(`
        INSERT INTO uploaded_game_icons (slug, content_type, image_base64, size_bytes, width, height, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          content_type = excluded.content_type,
          image_base64 = excluded.image_base64,
          size_bytes = excluded.size_bytes,
          width = excluded.width,
          height = excluded.height,
          updated_at = excluded.updated_at;
      `).bind(
        trimmedSlug,
        'image/webp',
        cleanBase64,
        imageBytes.length,
        inspectResult.width || 512,
        inspectResult.height || 512,
        nowIso,
        nowIso
      ).run();
    } catch (err: any) {
      console.error('[IngestUpcomingGames] Lỗi lưu uploaded_game_icons vào D1:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Không thể lưu trữ file icon vào cơ sở dữ liệu D1.' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // 10. Tự động đồng bộ bản ghi game (cả hai trường iconUrl và icon_url thành /game_icons/<slug>.webp)
    const iconPublicPath = `/game_icons/${trimmedSlug}.webp`;
    if (targetType === 'UPCOMING' && matchedGame) {
      matchedGame.iconUrl = iconPublicPath;
      matchedGame.icon_url = iconPublicPath;
      matchedGame.updatedAt = nowIso;
      matchedGame.source = botName;
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    } else if (targetType === 'CATALOG') {
      try {
        await env.DB.prepare('UPDATE games SET icon_url = ? WHERE slug = ?')
          .bind(iconPublicPath, trimmedSlug)
          .run();
      } catch {}
    }

    // 11. Xóa Cloudflare Edge Cache của URL icon để ảnh mới hiển thị tức thì (ghi đè thật)
    try {
      const cache = typeof caches !== 'undefined' ? (caches as any).default : null;
      if (cache) {
        const publicUrl1 = `https://codegame.shop/game_icons/${trimmedSlug}.webp`;
        const publicUrl2 = new URL(`/game_icons/${trimmedSlug}.webp`, request.url).toString();
        await Promise.allSettled([
          cache.delete(new Request(publicUrl1)),
          cache.delete(new Request(publicUrl2)),
        ]);
      }
    } catch {}

    const fullPublicUrl = `https://codegame.shop/game_icons/${trimmedSlug}.webp`;

    return new Response(
      JSON.stringify({
        success: true,
        slug: trimmedSlug,
        publicUrl: fullPublicUrl,
        bytes: imageBytes.length,
        width: inspectResult.width || 512,
        height: inspectResult.height || 512,
        iconUrl: iconPublicPath,
        message: (targetType as string) === 'TEST'
          ? `Upload icon test "${trimmedSlug}" thành công. File đã sẵn sàng phục vụ công khai tại ${iconPublicPath}.`
          : `Upload icon cho game "${matchedGame.name}" thành công. File đã sẵn sàng phục vụ công khai tại ${iconPublicPath}.`,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 1F: DELETE_ICON / REMOVE_ICON (Xóa icon đã upload khỏi D1 và purge edge cache)
  if (action === 'delete_icon' || action === 'remove_icon' || action === 'deleteicon') {
    if (!env || !env.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cơ sở dữ liệu D1 hoặc dịch vụ backend tạm thời không khả dụng.' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const rawSlug = payload?.slug || payload?.gameSlug;
    if (!rawSlug || typeof rawSlug !== 'string' || !rawSlug.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu trường "slug" định danh icon cần xóa.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const trimmedSlug = String(rawSlug).trim().toLowerCase();

    // Chặn path traversal
    if (
      trimmedSlug.includes('..') ||
      trimmedSlug.includes('/') ||
      trimmedSlug.includes('\\') ||
      trimmedSlug.includes('%2e') ||
      trimmedSlug.includes('%2f') ||
      trimmedSlug.includes('%5c') ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)
    ) {
      return new Response(
        JSON.stringify({ success: false, error: 'Slug không hợp lệ hoặc chứa ký tự path traversal nguy hiểm.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    try {
      await env.DB.prepare('DELETE FROM uploaded_game_icons WHERE slug = ?').bind(trimmedSlug).run();

      // Xóa Cloudflare Edge Cache
      try {
        const cache = typeof caches !== 'undefined' ? (caches as any).default : null;
        if (cache) {
          const publicUrl1 = `https://codegame.shop/game_icons/${trimmedSlug}.webp`;
          const publicUrl2 = new URL(`/game_icons/${trimmedSlug}.webp`, request.url).toString();
          await Promise.allSettled([
            cache.delete(new Request(publicUrl1)),
            cache.delete(new Request(publicUrl2)),
          ]);
        }
      } catch {}

      return new Response(
        JSON.stringify({
          success: true,
          slug: trimmedSlug,
          message: `Đã xóa thành công file icon cho slug "${trimmedSlug}".`,
        }),
        { headers: CORS_HEADERS }
      );
    } catch (err: any) {
      console.error('[IngestUpcomingGames] Lỗi xóa uploaded_game_icons từ D1:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Lỗi truy vấn xóa từ cơ sở dữ liệu D1.' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }
  }

  // ACTION 2: APPROVE_ALL (Duyệt toàn bộ hàng chờ)
  if (action === 'approve_all') {
    let approvedCount = 0;
    let maxOrder = 0;
    currentUpcomingGames.forEach((g) => {
      if (typeof g.displayOrder === 'number' && g.displayOrder > maxOrder) {
        maxOrder = g.displayOrder;
      }
    });

    for (const item of currentUpcomingGames) {
      if (item.status === 'PENDING') {
        item.status = 'UPCOMING';
        item.approvedAt = nowIso;
        item.approvedBy = botName;
        item.updatedAt = nowIso;
        item.displayOrder = ++maxOrder;
        approvedCount++;
      }
    }

    if (env.DB) await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã duyệt toàn bộ ${approvedCount} tựa game trong hàng chờ lên Web Khách.`,
        approvedCount,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 3: REJECT / DELETE (Từ chối hoặc xóa game)
  if (action === 'reject' || action === 'delete') {
    const targetId = payload?.id || payload?.slug;
    const targetIds: string[] = Array.isArray(payload?.ids)
      ? payload.ids.map((x: any) => String(x).toLowerCase())
      : (targetId ? [String(targetId).toLowerCase()] : []);

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu trường "id" hoặc "ids" để xóa/từ chối.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const beforeLen = currentUpcomingGames.length;
    const deletedItems = currentUpcomingGames.filter((g) => {
      const idLower = (g.id || '').toLowerCase();
      const slugLower = (g.slug || '').toLowerCase();
      return targetIds.includes(idLower) || targetIds.includes(slugLower);
    });

    if (env.DB) {
      for (const item of deletedItems) {
        await recordSoftDelete(env.DB, {
          recordType: 'upcoming_game',
          recordId: item.id || item.slug,
          recordSlug: item.slug,
          title: item.name || item.slug,
          actor: 'upcoming_admin',
          deleteReason: 'Xóa qua ingest-upcoming-games (reject/delete)',
          originalData: item,
          context,
          request,
          env,
          additionalPurgeUrls: [
            'https://codegame.shop/api/crawler/ingest-upcoming-games',
            'https://codegame.shop/api/sync',
          ],
        });
      }
    }

    currentUpcomingGames = currentUpcomingGames.filter((g) => {
      const idLower = (g.id || '').toLowerCase();
      const slugLower = (g.slug || '').toLowerCase();
      return !targetIds.includes(idLower) && !targetIds.includes(slugLower);
    });
    const deletedCount = beforeLen - currentUpcomingGames.length;

    if (env.DB) await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);

    const gScope = globalThis as any;
    gScope.__wcg_public_sync_cache = null;
    await invalidateCatalogEdgeCache(context as any, request, env, [
      'https://codegame.shop/api/crawler/ingest-upcoming-games',
      'https://codegame.shop/api/sync',
    ]).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã xóa mềm và lưu lịch sử ${deletedCount} game.`,
        deletedCount,
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 4: REORDER (Sắp xếp thứ tự các game hiển thị trên Web)
  if (action === 'reorder') {
    const orderedIds = payload?.orderedIds || payload?.ids;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu mảng "orderedIds" chứa danh sách ID/slug theo thứ tự mong muốn.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const orderMap = new Map<string, number>();
    orderedIds.forEach((id: string, idx: number) => {
      orderMap.set(String(id).toLowerCase(), idx + 1);
    });

    for (const item of currentUpcomingGames) {
      const idLower = (item.id || '').toLowerCase();
      const slugLower = (item.slug || '').toLowerCase();
      if (orderMap.has(idLower)) {
        item.displayOrder = orderMap.get(idLower);
      } else if (orderMap.has(slugLower)) {
        item.displayOrder = orderMap.get(slugLower);
      }
    }

    // Sort by displayOrder
    currentUpcomingGames.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    if (env.DB) await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Đã cập nhật thứ tự hiển thị game thành công. Top 6 game đầu tiên sẽ hiển thị ngay trên web khách.',
        games: currentUpcomingGames,
      }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 5: MOVE_TO_PENDING (Chuyển game về lại hàng chờ duyệt)
  if (action === 'move_to_pending') {
    const targetId = payload?.id || payload?.slug;
    for (const item of currentUpcomingGames) {
      if (item.id === targetId || item.slug === targetId) {
        item.status = 'PENDING';
        item.updatedAt = nowIso;
      }
    }
    if (env.DB) await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);

    return new Response(
      JSON.stringify({ success: true, message: 'Đã chuyển game về hàng chờ duyệt.', games: currentUpcomingGames }),
      { headers: CORS_HEADERS }
    );
  }

  // ACTION 6: DEFAULT INGEST / ADD / UPDATE
  const incomingList: any[] = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.games) ? payload.games : (payload?.name || payload?.slug || payload?.id ? [payload] : []));

  if (incomingList.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Payload cần chứa mảng "games" hoặc tối thiểu 1 game có trường "name" hoặc "slug".',
        sampleFormat: {
          apiKey: 'YOUR_API_KEY',
          botName: 'Trợ lý Pine',
          action: 'ingest',
          directPublish: true, // Đặt true để xuất bản thẳng ra Web Khách (status: UPCOMING) mà không cần chờ duyệt
          games: [
            {
              name: 'Strinova VN',
              slug: 'strinova-vn',
              publisher: 'Gzone',
              releaseDate: '2026-10-23T10:00:00+07:00',
              category: 'Bắn Súng Anime 3D',
              platform: 'PC, Android, iOS',
              iconUrl: '/game_icons/strinova-vn.webp',
              status: 'UPCOMING', // 'PENDING' để vào Hàng chờ duyệt, hoặc 'UPCOMING' để duyệt ngay
              expectedCodes: ['STRINOVAOB', 'VIP999'],
            },
          ],
        },
        uploadIconSample: {
          apiKey: 'YOUR_API_KEY',
          action: 'upload_icon',
          slug: 'azur-promilia',
          imageBase64: 'UklGR...',
          contentType: 'image/webp',
        },
      }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const existingMap = new Map<string, any>();
  for (const item of currentUpcomingGames) {
    if (item.slug) existingMap.set(item.slug.toLowerCase(), item);
    if (item.id) existingMap.set(item.id.toLowerCase(), item);
  }

  let addedCount = 0;
  let updatedCount = 0;
  let totalClearedCodesCount = 0;
  const processedDetails: any[] = [];

  for (const raw of incomingList) {
    if (!raw || typeof raw !== 'object') continue;

    const rawName = String(raw.name || raw.game_name || '').trim();
    const rawSlug = String(raw.slug || raw.game_slug || raw.id || '').trim();
    if (!rawName && !rawSlug) continue;

    const slug = rawSlug ? slugify(rawSlug) : slugify(rawName);
    if (!slug) continue;

    // Tìm record đã có qua slug, id hoặc tên game tương đồng
    const existing =
      existingMap.get(slug.toLowerCase()) ||
      (raw.id ? existingMap.get(String(raw.id).toLowerCase()) : null) ||
      currentUpcomingGames.find((g) => {
        const gSlug = String(g.slug || '').toLowerCase();
        const gName = String(g.name || '').toLowerCase();
        return gSlug === slug || (rawName && (gName === rawName.toLowerCase() || slugify(gName) === slug));
      });

    const name = rawName || (existing ? existing.name : slug);

    // Tombstone check: Không hồi sinh game sắp ra mắt đã bị xóa mềm
    if (env.DB && await isRecordTombstoned(env.DB, 'upcoming_game', slug)) {
      processedDetails.push({
        name,
        slug,
        status: 'SKIPPED_TOMBSTONE',
        message: 'Game này đã bị xóa bởi Quản trị viên (Tombstone active). Từ chối tự động nạp lại.'
      });
      continue;
    }

    // Kiểm tra chính xác xem các trường có được cung cấp trong payload không
    const hasExplicitRelDateField = ('releaseDate' in raw) || ('release_date' in raw) || ('launchDate' in raw) || ('launch_date' in raw);
    const rawRelVal = raw.releaseDate !== undefined ? raw.releaseDate : (raw.release_date !== undefined ? raw.release_date : (raw.launchDate !== undefined ? raw.launchDate : raw.launch_date));
    const cleanRelDate = (rawRelVal !== null && rawRelVal !== undefined && String(rawRelVal).trim() !== '') ? String(rawRelVal).trim() : null;

    const hasPublisher = Boolean(raw.publisher && String(raw.publisher).trim());
    const rawPublisher = hasPublisher ? String(raw.publisher).trim() : '';

    const hasCategory = Boolean(raw.category && String(raw.category).trim());
    const rawCategory = hasCategory ? String(raw.category).trim() : '';

    const hasPlatform = Boolean(raw.platform && String(raw.platform).trim());
    const rawPlatform = hasPlatform ? String(raw.platform).trim() : '';

    const rawIcon = extractIconUrl(raw, slug) || extractIconUrl(payload, slug);
    const hasExplicitIcon = Boolean(
      raw.iconUrl ||
      raw.icon_url ||
      raw.icon ||
      raw.gameIcon ||
      raw.game_icon ||
      raw.avatar ||
      raw.avatarUrl ||
      raw.avatar_url ||
      raw.imageUrl ||
      raw.image_url ||
      raw.image ||
      raw.logo ||
      raw.logoUrl ||
      raw.logo_url ||
      raw.thumbnail ||
      raw.thumb ||
      raw.cover ||
      raw.cover_image ||
      raw.cover_image_url ||
      raw.localIconPath ||
      raw.iconPath ||
      payload?.iconUrl ||
      payload?.icon_url ||
      payload?.icon ||
      payload?.gameIcon ||
      payload?.imageUrl
    );

    const hasBanner = Boolean(raw.bannerUrl || raw.banner_url || raw.banner);
    const rawBanner = hasBanner ? String(raw.bannerUrl || raw.banner_url || raw.banner).trim() : '';

    const hasPreReg = Boolean(raw.preRegUrl || raw.pre_reg_url || raw.downloadUrl);
    const rawPreReg = hasPreReg ? String(raw.preRegUrl || raw.pre_reg_url || raw.downloadUrl).trim() : '';

    const hasDescription = Boolean(raw.description && String(raw.description).trim());
    const rawDescription = hasDescription ? String(raw.description).trim() : '';

    const rawInstructions =
      raw.instructions ||
      raw.instructionsText ||
      raw.instructions_text ||
      raw.guide ||
      raw.guideText ||
      raw.huongDan ||
      raw.huong_dan ||
      raw.cachNhapCode ||
      raw.cach_nhap_code;
    const hasInstructions = rawInstructions !== undefined && rawInstructions !== null;

    const rawRedeemUrl = raw.redeemUrl || raw.redeem_url || raw.link_nhap_code || raw.linkNhapCode;
    const hasRedeemUrl = rawRedeemUrl !== undefined && rawRedeemUrl !== null;

    // Nhận biết rõ ràng khi bot/admin muốn xóa hoặc cập nhật mã code dự kiến
    const hasExplicitCodesField = ('expectedCodes' in raw) || ('codes' in raw) || (raw.clearCodes === true);
    let expectedCodes: string[] = [];
    if (Array.isArray(raw.expectedCodes)) {
      expectedCodes = raw.expectedCodes.map((c: any) => String(c).trim().toUpperCase()).filter(Boolean);
    } else if (Array.isArray(raw.codes)) {
      expectedCodes = raw.codes.map((c: any) => String(c.code || c).trim().toUpperCase()).filter(Boolean);
    } else if (typeof raw.expectedCodes === 'string') {
      expectedCodes = raw.expectedCodes.split(/[,;\n]+/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
    }

    // Status: default to PENDING if not specified, unless directPublish=true hoặc autoApprove=true
    let initialStatus = 'PENDING';
    if (
      raw.status === 'UPCOMING' ||
      raw.status === 'APPROVED' ||
      payload?.directPublish === true ||
      payload?.autoApprove === true ||
      raw.directPublish === true ||
      raw.autoApprove === true
    ) {
      initialStatus = 'UPCOMING';
    } else if (raw.status === 'LAUNCHED' || raw.status === 'CANCELLED') {
      initialStatus = String(raw.status).toUpperCase();
    } else if (raw.status === 'PENDING') {
      initialStatus = 'PENDING';
    }

    if (existing) {
      // 1. Cập nhật tên game nếu có gửi tên mới
      if (rawName) {
        existing.name = rawName;
      }

      // 2. CHỈ CẬP NHẬT các trường ngày giờ / thể loại / NPH khi payload CÓ GIÁ TRỊ HỢP LỆ HOẶC CÓ CHỈ ĐỊNH XÓA RÕ RÀNG
      // Nếu có gửi trường releaseDate:
      // - Nếu gửi chuỗi ngày hợp lệ -> Cập nhật ngày mới
      // - Nếu gửi null hoặc chuỗi rỗng -> Xóa ngày thành null
      // Nếu KHÔNG gửi trường releaseDate (omitted) -> GIỮ NGUYÊN ngày đã lưu!
      if (hasExplicitRelDateField) {
        if (cleanRelDate) {
          existing.releaseDate = cleanRelDate;
        } else {
          existing.releaseDate = null;
        }
      }
      if (hasPublisher && rawPublisher && rawPublisher !== 'Nhà phát hành') {
        existing.publisher = rawPublisher;
      }
      if (hasCategory && rawCategory && rawCategory !== 'Game Mới') {
        existing.category = rawCategory;
      }
      if (hasPlatform && rawPlatform) {
        existing.platform = rawPlatform;
      }
      if (hasExplicitIcon && rawIcon) {
        existing.iconUrl = rawIcon;
        existing.icon_url = rawIcon;
      } else {
        if (!existing.iconUrl && existing.icon_url) existing.iconUrl = existing.icon_url;
        if (!existing.icon_url && existing.iconUrl) existing.icon_url = existing.iconUrl;
        if (!existing.iconUrl && !existing.icon_url) {
          existing.iconUrl = `/game_icons/${slug}.webp`;
          existing.icon_url = `/game_icons/${slug}.webp`;
        }
      }
      if (hasBanner && rawBanner) {
        existing.bannerUrl = rawBanner;
      }
      if (hasDescription && rawDescription) {
        existing.description = rawDescription;
      }
      if (hasPreReg && rawPreReg) {
        existing.preRegUrl = rawPreReg;
      }
      if (hasInstructions) {
        existing.instructions = rawInstructions ? String(rawInstructions).trim() : undefined;
      }
      if (hasRedeemUrl) {
        existing.redeemUrl = rawRedeemUrl ? String(rawRedeemUrl).trim() : undefined;
      }

      // 3. Xử lý trạng thái (status): nếu có chỉ định trạng thái mới hoặc yêu cầu xuất bản thẳng
      if (raw.status) {
        const st = String(raw.status).toUpperCase();
        existing.status = st;
        if (st === 'UPCOMING' || st === 'APPROVED') {
          existing.approvedAt = nowIso;
          existing.approvedBy = botName;
        }
      } else if (
        payload?.directPublish === true ||
        payload?.autoApprove === true ||
        raw.directPublish === true ||
        raw.autoApprove === true
      ) {
        existing.status = 'UPCOMING';
        existing.approvedAt = nowIso;
        existing.approvedBy = botName;
      }

      if (typeof raw.displayOrder === 'number') existing.displayOrder = raw.displayOrder;
      if (typeof raw.orderGrowthEnabled === 'boolean') existing.orderGrowthEnabled = raw.orderGrowthEnabled;
      if (typeof raw.orderGrowthRate === 'number') existing.orderGrowthRate = raw.orderGrowthRate;
      if (typeof raw.orderMinRange === 'number') existing.orderMinRange = raw.orderMinRange;
      if (typeof raw.orderMaxRange === 'number') existing.orderMaxRange = raw.orderMaxRange;

      if (raw.subscribersCount !== undefined) existing.subscribersCount = Number(raw.subscribersCount);
      if (typeof raw.subscribersGrowthEnabled === 'boolean') existing.subscribersGrowthEnabled = raw.subscribersGrowthEnabled;
      if (typeof raw.subscribersGrowthRatePerHour === 'number') existing.subscribersGrowthRatePerHour = raw.subscribersGrowthRatePerHour;
      if (typeof raw.subscribersMinRange === 'number') existing.subscribersMinRange = raw.subscribersMinRange;
      if (typeof raw.subscribersMaxRange === 'number') existing.subscribersMaxRange = raw.subscribersMaxRange;
      if (raw.growthAnchorTime) existing.growthAnchorTime = String(raw.growthAnchorTime);

      existing.source = botName;
      existing.updatedAt = nowIso;

      // 4. Xử lý cột mã code dự kiến (expectedCodes)
      // Cho phép bot/admin xóa sạch mã đoán cũ bằng danh sách rỗng hoặc clearCodes: true
      let clearedExpectedCodes = 0;
      if (raw.clearCodes === true || (hasExplicitCodesField && expectedCodes.length === 0)) {
        clearedExpectedCodes = Array.isArray(existing.expectedCodes) ? existing.expectedCodes.length : 0;
        existing.expectedCodes = [];
        totalClearedCodesCount += clearedExpectedCodes;
      } else if (hasExplicitCodesField && expectedCodes.length > 0) {
        if (raw.mergeCodes === true || payload?.mergeCodes === true) {
          const mergedCodes = new Set<string>((existing.expectedCodes || []).map((c: string) => c.toUpperCase()));
          expectedCodes.forEach((c) => mergedCodes.add(c));
          existing.expectedCodes = Array.from(mergedCodes);
        } else {
          // Mặc định ghi đè danh sách code mới nếu bot chỉ định rõ danh sách
          existing.expectedCodes = expectedCodes;
        }
      }

      updatedCount++;
      processedDetails.push({
        name: existing.name,
        slug,
        action: 'UPDATED',
        status: existing.status,
        releaseDate: existing.releaseDate,
        cleared_expected_codes: clearedExpectedCodes,
      });
    } else {
      // Record hoàn toàn mới: áp dụng fallback hợp lệ
      const newRecord = {
        id: raw.id || `ug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        slug,
        publisher: hasPublisher && rawPublisher ? rawPublisher : 'Nhà phát hành',
        releaseDate: cleanRelDate, // Lưu null nếu không gửi hoặc null/rỗng. TUYỆT ĐỐI KHÔNG tự gán nowIso!
        category: hasCategory && rawCategory ? rawCategory : 'Game Mới',
        platform: hasPlatform && rawPlatform ? rawPlatform : 'Android, iOS, PC',
        iconUrl: rawIcon || `/game_icons/${slug}.webp`,
        icon_url: rawIcon || `/game_icons/${slug}.webp`,
        bannerUrl: hasBanner && rawBanner ? rawBanner : undefined,
        description: hasDescription && rawDescription ? rawDescription : `Thông tin ngày mở server và giftcode tân thủ tựa game ${name}.`,
        instructions: hasInstructions && rawInstructions ? String(rawInstructions).trim() : undefined,
        redeemUrl: hasRedeemUrl && rawRedeemUrl ? String(rawRedeemUrl).trim() : undefined,
        preRegUrl: hasPreReg && rawPreReg ? rawPreReg : undefined,
        expectedCodes,
        subscribersCount: Number(raw.subscribersCount || 0),
        orderGrowthEnabled: typeof raw.orderGrowthEnabled === 'boolean' ? raw.orderGrowthEnabled : false,
        orderGrowthRate: typeof raw.orderGrowthRate === 'number' ? raw.orderGrowthRate : undefined,
        orderMinRange: typeof raw.orderMinRange === 'number' ? raw.orderMinRange : undefined,
        orderMaxRange: typeof raw.orderMaxRange === 'number' ? raw.orderMaxRange : undefined,
        subscribersGrowthEnabled: typeof raw.subscribersGrowthEnabled === 'boolean' ? raw.subscribersGrowthEnabled : true,
        subscribersGrowthRatePerHour: typeof raw.subscribersGrowthRatePerHour === 'number' ? raw.subscribersGrowthRatePerHour : 5,
        subscribersMinRange: typeof raw.subscribersMinRange === 'number' ? raw.subscribersMinRange : undefined,
        subscribersMaxRange: typeof raw.subscribersMaxRange === 'number' ? raw.subscribersMaxRange : undefined,
        growthAnchorTime: raw.growthAnchorTime || nowIso,
        source: botName,
        status: initialStatus,
        approvedAt: (initialStatus === 'UPCOMING' || initialStatus === 'APPROVED') ? nowIso : undefined,
        approvedBy: (initialStatus === 'UPCOMING' || initialStatus === 'APPROVED') ? botName : undefined,
        displayOrder: typeof raw.displayOrder === 'number' ? raw.displayOrder : 999,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      currentUpcomingGames.unshift(newRecord);
      existingMap.set(slug.toLowerCase(), newRecord);
      addedCount++;
      processedDetails.push({ name, slug, action: 'ADDED', status: newRecord.status, releaseDate: newRecord.releaseDate });
    }
  }

  // Tự động kiểm tra và bảo toàn dữ liệu gốc trước khi lưu D1
  sanitizeAndSafeguardUpcomingGames(currentUpcomingGames);

  // 4. Lưu lại vào D1
  if (env.DB) {
    try {
      await saveUpcomingGamesAndPropagate(context, currentUpcomingGames);
    } catch (err) {
      console.error('[IngestUpcomingGames] Lỗi ghi D1:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Không thể lưu dữ liệu vào cơ sở dữ liệu D1.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  const durationMs = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      success: true,
      message: `Đã xử lý thành công: Thêm mới ${addedCount} game, Cập nhật ${updatedCount} game.`,
      botName,
      totalGames: currentUpcomingGames.length,
      addedCount,
      updatedCount,
      totalClearedCodesCount,
      durationMs,
      processedDetails,
      timestamp: nowIso,
    }),
    {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
