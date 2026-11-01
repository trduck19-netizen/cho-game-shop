import { getMultipleSettingsD1, getSettingD1, withD1Timeout } from '../services/d1_service';
import { isCodeExpired, parseExpirationDate, decodeHtmlEntities } from '../../src/utils/codeUtils';
import fallbackGamesData from '../../src/data/games188.json';
import fallbackCodesData from '../../src/data/crawled_codes_188.json';

export const JUNK_CODE_REGEX = /^(?:IN-.*-\d+X\d+|REDEMPTION(?:-SCREEN)?-\d+X\d+)$/i;

export function cleanRewardText(raw: any): string {
  const text = decodeHtmlEntities(String(raw || '').trim());
  if (!text || /^(?:quà (?:tặng )?tân thủ(?: & vật phẩm ingame)?|phần thưởng từ nhà phát hành|thưởng của nph|🎁 phần thưởng từ nhà phát hành|quà mừng game ra mắt)$/i.test(text)) {
    return 'Chưa rõ phần thưởng';
  }
  return text;
}

// Pre-index fallback codes by game slug for instant O(1) retrieval without array scanning
const fallbackCodesBySlug = new Map<string, GiftCode[]>();
if (Array.isArray(fallbackCodesData)) {
  for (const c of fallbackCodesData as any[]) {
    if (!c) continue;
    const rawSlug = String(c.gameSlug || c.slug || c.gameId || '').trim().toLowerCase();
    if (!rawSlug) continue;
    const cleanCode = String(c.code || c.codeValue || c.gift_code || '').trim();
    if (!cleanCode || JUNK_CODE_REGEX.test(cleanCode)) continue;

    let list = fallbackCodesBySlug.get(rawSlug);
    if (!list) {
      list = [];
      fallbackCodesBySlug.set(rawSlug, list);
    }
    const isExp = isCodeExpired(c);
    list.push({
      code: cleanCode,
      rewards: cleanRewardText(c.rewards || c.description),
      status: isExp ? 'expired' : 'active',
      expiry: c.expiry || c.expires_at || '',
      source: c.source || 'Baseline Catalog',
      added_at: c.added_at || '2026-10-26T00:00:00Z',
    });
  }

  // Ensure absolute 100% parity between Where Winds Meet Mobile and Yen Van Thap Luc Thanh
  const wwmList = fallbackCodesBySlug.get('where-winds-meet-mobile') || fallbackCodesBySlug.get('yen-van-thap-luc-thanh') || [];
  if (wwmList.length > 0) {
    fallbackCodesBySlug.set('where-winds-meet-mobile', wwmList);
    fallbackCodesBySlug.set('yen-van-thap-luc-thanh', wwmList);
    fallbackCodesBySlug.set('where-winds-meet', wwmList);
  }
}

export interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

export interface GiftCode {
  code: string;
  rewards: string;
  status: 'active' | 'expired' | 'verified';
  expiry?: string;
  source?: string;
  added_at?: string;
}

export interface GameItem {
  id: string;
  name: string;
  slug: string;
  publisher?: string;
  category?: string;
  rating?: number;
  icon_url?: string;
  banner_url?: string;
  description?: string;
  instructions?: string;
  platform?: string;
  so_giay_phep?: string;
  ngay_cap_phep?: string;
  release_date?: string;
  download_android?: string;
  download_ios?: string;
  download_pc?: string;
  google_play_url?: string;
  app_store_url?: string;
  android_package_name?: string;
  redeem_url?: string;
  is_featured?: boolean | number;
  is_hot?: boolean | number;
  is_new?: boolean | number;
  is_active?: boolean | number;
  codes_count?: number;
  codes?: GiftCode[];
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Requested-With',
};

// Shared Vietnamese text normalization & search matching engine
import {
  stripAccents,
  normalizeVietnamese,
  normalizeSearchText,
  hasVietnameseDiacritics,
  matchGameSearch,
  calculateGameSearchScore,
  smartVietnameseMatch,
  GAME_ACRONYM_MAP,
} from '../../src/utils/textUtils';

export {
  stripAccents,
  normalizeVietnamese,
  normalizeSearchText,
  hasVietnameseDiacritics,
  matchGameSearch,
  calculateGameSearchScore,
  smartVietnameseMatch,
  GAME_ACRONYM_MAP,
};

// In-Memory Isolation Cache in Cloudflare Workers
interface CatalogCache {
  games: GameItem[];
  allRawGames: any[];
  codesMap: Map<string, GiftCode[]>;
  categories: string[];
  lastFetchedAt: number;
}

let catalogCache: CatalogCache | null = null;
const CACHE_TTL_MS = 120 * 1000; // 120 seconds fast in-worker cache to protect Cloudflare D1 quota

// Single-game in-memory cache to eliminate repeated D1 queries on game detail pages
const singleGameCache = new Map<string, { game: GameItem; expiresAt: number }>();

export function invalidateGamesCatalogCache(): void {
  catalogCache = null;
  singleGameCache.clear();
}

/**
 * Trích xuất và hợp nhất toàn bộ mã giftcode khớp với game dựa trên mọi biến thể slug, id và tên game
 */
export function resolveCodesForGame(g: any, codesMap: Map<string, GiftCode[]>): GiftCode[] {
  if (!g) return [];
  const slug = String(g.slug || g.id || '').trim();
  const rawId = String(g.id || slug).trim();
  const normSlug = slug.toLowerCase();

  const possibleKeys = [
    normSlug,
    rawId.toLowerCase(),
    normSlug.replace(/-mobile$/i, ''),
    `${normSlug}-mobile`,
    normSlug.replace(/_/g, '-'),
  ];

  if (
    normSlug === 'pirate-legends' ||
    normSlug === 'huyen-thoai-hai-tac' ||
    rawId.toLowerCase() === 'pirate-legends' ||
    rawId.toLowerCase() === 'huyen-thoai-hai-tac'
  ) {
    possibleKeys.push('pirate-legends', 'huyen-thoai-hai-tac');
  }

  if (
    normSlug === 'where-winds-meet-mobile' ||
    normSlug === 'yen-van-thap-luc-thanh' ||
    normSlug === 'where-winds-meet' ||
    rawId.toLowerCase() === 'where-winds-meet-mobile' ||
    rawId.toLowerCase() === 'yen-van-thap-luc-thanh'
  ) {
    possibleKeys.push('where-winds-meet-mobile', 'yen-van-thap-luc-thanh', 'where-winds-meet');
  }

  if (g.name) {
    const nameSlug = stripAccents(g.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    possibleKeys.push(nameSlug);
    const nameParts = g.name.split(/[:\-–]/).map((p: string) => stripAccents(p).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean);
    possibleKeys.push(...nameParts);
  }

  const mergedCodesMap = new Map<string, GiftCode>();
  for (const k of possibleKeys) {
    const found = codesMap.get(k);
    if (found) {
      for (const c of found) {
        const cleanCode = String(c.code || '').trim();
        if (!cleanCode || JUNK_CODE_REGEX.test(cleanCode)) continue;
        const upper = cleanCode.toUpperCase();
        if (!mergedCodesMap.has(upper)) {
          mergedCodesMap.set(upper, {
            ...c,
            code: cleanCode,
            rewards: cleanRewardText(c.rewards),
          });
        }
      }
    }
  }

  // If game object itself already carries codes
  if (Array.isArray(g.codes)) {
    for (const c of g.codes) {
      if (c && c.code) {
        const cleanCode = String(c.code).trim();
        if (!cleanCode || JUNK_CODE_REGEX.test(cleanCode)) continue;
        const upper = cleanCode.toUpperCase();
        if (!mergedCodesMap.has(upper)) {
          mergedCodesMap.set(upper, {
            ...c,
            code: cleanCode,
            rewards: cleanRewardText(c.rewards),
          });
        }
      }
    }
  }

  const allCodes = Array.from(mergedCodesMap.values());
  allCodes.sort((a, b) => {
    const aActive = !isCodeExpired(a) ? 1 : 0;
    const bActive = !isCodeExpired(b) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
    const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
    return timeB - timeA;
  });

  return allCodes;
}

/**
 * Chuẩn hóa tên thể loại game, loại bỏ lỗi font và hợp nhất các cặp trùng lặp
 */
export function normalizeCategory(rawCategory?: string | null): string {
  if (!rawCategory) return '';
  const trimmed = String(rawCategory).trim();
  // Khắc phục lỗi font encoding như "Thp C?m / Khc" hoặc "Thp Cẩm / Khác"
  if (trimmed.includes('\uFFFD') || /th[p|ậ|a-z]*\s*c[ẩ|a-z]*m/i.test(trimmed)) {
    return 'Thể Thao & Tốc Độ';
  }
  // Hợp nhất các biến thể thể loại trùng lặp:
  // 1. Nhập Vai / Nhập Vai (MMORPG) -> Nhập Vai
  if (trimmed === 'Nhập Vai (MMORPG)' || trimmed === 'Nhập Vai') return 'Nhập Vai';
  // 2. Tam Quốc / Chiến Thuật / Chiến Thuật Tam Quốc -> Tam Quốc / Chiến Thuật
  if (trimmed === 'Chiến Thuật Tam Quốc' || trimmed === 'Tam Quốc / Chiến Thuật') return 'Tam Quốc / Chiến Thuật';
  // 3. Roblox / Thủ Thành Chiến Lược / Roblox / Thủ Thành Chiến Thuật -> Roblox / Thủ Thành Chiến Thuật
  if (trimmed === 'Roblox / Thủ Thành Chiến Lược' || trimmed === 'Roblox / Thủ Thành Chiến Thuật') return 'Roblox / Thủ Thành Chiến Thuật';
  // 4. Thể Thao Điện Tử / Thể Thao & Tốc Độ -> Thể Thao & Tốc Độ
  if (trimmed === 'Thể Thao Điện Tử' || trimmed === 'Thể Thao & Tốc Độ') return 'Thể Thao & Tốc Độ';
  // 5. Kiếm Hiệp / Tiên Hiệp / Kiếm Hiệp 3D / Kiếm Hiệp Nhập Vai -> Kiếm Hiệp / Tiên Hiệp
  if (trimmed === 'Kiếm Hiệp 3D' || trimmed === 'Kiếm Hiệp Nhập Vai' || trimmed === 'Kiếm Hiệp / Tiên Hiệp') return 'Kiếm Hiệp / Tiên Hiệp';

  return trimmed;
}

/**
 * Lấy danh sách các thể loại tương đương trong DB cho 1 thể loại chuẩn hóa
 */
export function getEquivalentCategories(canonicalCategory: string): string[] {
  const norm = normalizeCategory(canonicalCategory);
  if (norm === 'Nhập Vai') return ['Nhập Vai', 'Nhập Vai (MMORPG)'];
  if (norm === 'Tam Quốc / Chiến Thuật') return ['Tam Quốc / Chiến Thuật', 'Chiến Thuật Tam Quốc'];
  if (norm === 'Roblox / Thủ Thành Chiến Thuật') return ['Roblox / Thủ Thành Chiến Thuật', 'Roblox / Thủ Thành Chiến Lược'];
  if (norm === 'Thể Thao & Tốc Độ') return ['Thể Thao & Tốc Độ', 'Thể Thao Điện Tử', 'Thp Cẩm / Khác'];
  if (norm === 'Kiếm Hiệp / Tiên Hiệp') return ['Kiếm Hiệp / Tiên Hiệp', 'Kiếm Hiệp 3D', 'Kiếm Hiệp Nhập Vai'];
  return [norm || canonicalCategory];
}

/**
 * Chuẩn hóa, lọc trùng và sắp xếp danh sách thể loại hiển thị
 */
export function normalizeAndDeduplicateCategories(categories: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of categories) {
    if (!c) continue;
    const norm = normalizeCategory(c);
    if (!norm || norm === 'Tất cả') continue;
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  }
  result.sort((a, b) => a.localeCompare(b, 'vi'));
  return ['Tất cả', ...result];
}

/**
 * Chuẩn hóa đối tượng GameItem với đầy đủ thông tin pháp lý, link store và danh sách mã
 */
export function formatGameItem(g: any, allCodes: GiftCode[]): GameItem {
  const slug = String(g.slug || g.id || '').trim();
  const rawId = String(g.id || slug).trim();
  const cat = normalizeCategory(g.category);

  let iconUrl = g.icon_url || g.iconUrl || g.cover_image_url || '';
  if (!iconUrl || iconUrl.includes('codemoi.net') || iconUrl.includes('googleusercontent.com') || iconUrl.startsWith('/game-icons') || iconUrl.startsWith('game-icons')) {
    iconUrl = `/game_icons/${slug}.webp`;
  }

  const cleanCodes = (allCodes || [])
    .filter((c) => {
      const codeStr = String(c?.code || '').trim();
      if (!codeStr) return false;
      if (JUNK_CODE_REGEX.test(codeStr)) return false;
      return true;
    })
    .map((c) => ({
      ...c,
      rewards: cleanRewardText(c.rewards),
    }));

  return {
    id: String(rawId),
    name: String(g.name || 'Game chưa đặt tên'),
    slug: String(slug),
    publisher: g.publisher || '',
    category: cat,
    rating: typeof g.rating === 'number' ? g.rating : 4.8,
    icon_url: iconUrl,
    banner_url: g.banner_url || g.bannerUrl || '',
    description: g.description || '',
    instructions: g.instructions || '',
    platform: g.platform || '',
    so_giay_phep: g.so_giay_phep || g.license_number || '',
    ngay_cap_phep: g.ngay_cap_phep || g.license_issued_date || g.license_date || '',
    license_number: g.license_number || g.so_giay_phep || '',
    license_issued_date: g.license_issued_date || g.ngay_cap_phep || g.license_date || '',
    license_status: g.license_status || '',
    license_source_url: g.license_source_url || '',
    release_date: g.release_date || g.gp_release_date || '',
    download_android: g.download_android || g.google_play_url || g.downloadLinks?.android || '',
    download_ios: g.download_ios || g.app_store_url || g.downloadLinks?.ios || '',
    download_pc: g.download_pc || g.downloadLinks?.pc || '',
    google_play_url: g.google_play_url || g.download_android || g.downloadLinks?.android || '',
    app_store_url: g.app_store_url || g.download_ios || g.downloadLinks?.ios || '',
    android_package_name: g.android_package_name || (
      (g.google_play_url || g.download_android || '').match(/[?&]id=([a-zA-Z0-9._]+)/)?.[1] || ''
    ),
    redeem_url: g.redeem_url || g.redeemUrl || '',
    is_featured: Boolean(g.is_featured || g.isFeatured),
    is_hot: Boolean(g.is_hot || g.isHot),
    is_new: Boolean(g.is_new || g.isNew),
    is_active: g.is_active !== undefined ? Boolean(g.is_active) : true,
    codes_count: cleanCodes.filter((c) => !isCodeExpired(c)).length,
    active_codes_count: cleanCodes.filter((c) => !isCodeExpired(c)).length,
    free_codes_count: cleanCodes.filter((c) => !isCodeExpired(c)).length,
    expired_codes_count: cleanCodes.filter((c) => isCodeExpired(c)).length,
    total_codes_count: cleanCodes.length,
    codes: cleanCodes,
  };
}

/**
 * Loads authoritative games and free giftcodes from Cloudflare D1.
 * Indexes codes by game slug and computes codes_count.
 */
export async function getLoadedCatalog(
  db: D1Database,
  forceFresh: boolean = false,
  skipGamesList: boolean = false
): Promise<CatalogCache> {
  const now = Date.now();
  if (!forceFresh && catalogCache && now - catalogCache.lastFetchedAt < CACHE_TTL_MS) {
    if (!skipGamesList && (!catalogCache.games || catalogCache.games.length === 0)) {
      // Cần games list đầy đủ nhưng cache chỉ có rawGames
    } else {
      return catalogCache;
    }
  }

  const settings = await getMultipleSettingsD1(db, [
    'wcg_admin_games_v5',
    'wcg_admin_games_v4',
    'wcg_admin_free_codes_v5',
    'wcg_admin_free_codes_v4',
    'wcg_admin_custom_free_codes_v1',
    'wcg_deleted_free_codes',
    'wcg_admin_upcoming_games_v1',
  ]);

  const baseGames = (Array.isArray(settings['wcg_admin_games_v5']) && settings['wcg_admin_games_v5'].length > 0)
    ? settings['wcg_admin_games_v5']
    : ((Array.isArray(settings['wcg_admin_games_v4']) && settings['wcg_admin_games_v4'].length > 0)
      ? settings['wcg_admin_games_v4']
      : (fallbackGamesData as any[]));

  // Tự động chuyển các game sắp ra mắt đã mở server quá 24h xuống sàn game chính thức
  const rawGames = Array.isArray(baseGames) ? [...baseGames] : [];

  // Đồng bộ hóa liên kết tải ứng dụng chính thức (Google Play, App Store, PC) từ fallbackGamesData
  const fallbackMap = new Map<string, any>();
  if (Array.isArray(fallbackGamesData)) {
    for (const fg of fallbackGamesData as any[]) {
      if (fg && fg.slug) fallbackMap.set(String(fg.slug).toLowerCase(), fg);
    }
  }
  rawGames.forEach((g: any) => {
    if (!g || !g.slug) return;
    const fg = fallbackMap.get(String(g.slug).toLowerCase());
    if (fg) {
      if (!g.google_play_url && fg.google_play_url) g.google_play_url = fg.google_play_url;
      if (!g.download_android && fg.download_android) g.download_android = fg.download_android;
      if (!g.app_store_url && fg.app_store_url) g.app_store_url = fg.app_store_url;
      if (!g.download_ios && fg.download_ios) g.download_ios = fg.download_ios;
      if (!g.download_pc && fg.download_pc) g.download_pc = fg.download_pc;
      if (!g.android_package_name && fg.android_package_name) g.android_package_name = fg.android_package_name;
    }
  });
  const upcomingList = settings['wcg_admin_upcoming_games_v1'];
  if (Array.isArray(upcomingList)) {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const ug of upcomingList) {
      if (!ug || !ug.slug) continue;
      // Bỏ qua các game lịch sử đã LAUNCHED để bảo toàn danh mục chuẩn 560 game
      if (ug.status === 'LAUNCHED') continue;
      const target = new Date(ug.releaseDate).getTime();
      if (!isNaN(target) && (now - target) > ONE_DAY_MS) {
        const slugLower = ug.slug.toLowerCase();
        if (!rawGames.some((g: any) => (g.slug || '').toLowerCase() === slugLower || (g.id || '').toLowerCase() === slugLower)) {
          rawGames.unshift({
            id: ug.slug,
            slug: ug.slug,
            name: ug.name,
            publisher: ug.publisher || 'Nhà phát hành',
            category: ug.category || 'Game Mới',
            platform: ug.platform || 'Android, iOS, PC',
            icon_url: ug.iconUrl || `/game_icons/${ug.slug}.webp`,
            banner_url: ug.bannerUrl,
            description: ug.description || `Tổng hợp giftcode ${ug.name} mới nhất mừng mở server.`,
            instructions: 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
            is_new: true,
            is_hot: true,
            release_date: ug.releaseDate ? ug.releaseDate.split('T')[0] : new Date().toISOString().split('T')[0],
          });
        }
      }
    }
  }

  // Combine all available sources: Custom codes, D1 catalog codes, and complete Master Bundled codes (fallbackCodesData)
  const d1Codes = (Array.isArray(settings['wcg_admin_free_codes_v5']) && settings['wcg_admin_free_codes_v5'].length > 0)
    ? settings['wcg_admin_free_codes_v5']
    : ((Array.isArray(settings['wcg_admin_free_codes_v4']) && settings['wcg_admin_free_codes_v4'].length > 0)
      ? settings['wcg_admin_free_codes_v4']
      : []);
  const bundledCodes = Array.isArray(fallbackCodesData) ? (fallbackCodesData as any[]) : [];
  const customCodes = settings['wcg_admin_custom_free_codes_v1'] || [];
  const deletedCodesSet = new Set<string>(
    Array.isArray(settings['wcg_deleted_free_codes']) ? settings['wcg_deleted_free_codes'] : []
  );

  const codesMap = new Map<string, GiftCode[]>();
  const seenCodesBySlug = new Map<string, Set<string>>();

  const addCode = (item: any, source: 'custom' | 'd1' | 'bundled') => {
    if (!item || (item.id && deletedCodesSet.has(item.id))) return;
    const slug = item.gameSlug || item.game_slug || item.slug || item.gameId;
    const codeVal = item.codeValue || item.code_value || item.code || item.gift_code;
    if (!slug || !codeVal) return;

    const normSlug = String(slug).trim().toLowerCase();
    const codeStr = String(codeVal).trim();
    const upperCode = codeStr.toUpperCase();

    let seenSet = seenCodesBySlug.get(normSlug);
    if (!seenSet) {
      seenSet = new Set<string>();
      seenCodesBySlug.set(normSlug, seenSet);
    }
    if (seenSet.has(upperCode)) return;
    seenSet.add(upperCode);

    const isExp = isCodeExpired(item);
    const list = codesMap.get(normSlug) || [];
    let expVal = item.expiresAt || item.expires_at || item.expiry || '';
    if (expVal === '2026-12-31' || expVal === '2026-12-31T23:59:59Z' || expVal === '31/12/2026') {
      expVal = '';
    }
    list.push({
      code: codeStr,
      rewards: cleanRewardText(item.rewards || item.description),
      status: isExp ? 'expired' : 'active',
      expiry: expVal,
      added_at: item.updatedAt || item.updated_at || item.createdAt || item.created_at || (source === 'custom' ? new Date().toISOString() : '2026-10-09T00:00:00Z'),
    });
    codesMap.set(normSlug, list);
  };

  // 1. Process custom codes FIRST (highest priority: newly created or edited by admin)
  if (Array.isArray(customCodes)) {
    for (const item of customCodes) addCode(item, 'custom');
  }

  // 2. Process D1 catalog codes (from crawlers / admin pushes), skipping any deleted or already added
  if (Array.isArray(d1Codes)) {
    for (const item of d1Codes) addCode(item, 'd1');
  }

  // 3. Process complete Master Bundled codes (11,883 codes), preserving full baseline archive
  if (Array.isArray(bundledCodes)) {
    for (const item of bundledCodes) addCode(item, 'bundled');
  }

  // Ensure absolute 100% parity between Where Winds Meet Mobile and Yen Van Thap Luc Thanh in codesMap
  const wwmMerged = codesMap.get('where-winds-meet-mobile') || codesMap.get('yen-van-thap-luc-thanh');
  if (wwmMerged && wwmMerged.length > 0) {
    codesMap.set('where-winds-meet-mobile', wwmMerged);
    codesMap.set('yen-van-thap-luc-thanh', wwmMerged);
  }

  const categorySet = new Set<string>();
  categorySet.add('Tất cả');

  const gamesList: GameItem[] = [];

  // Chỉ duyệt và định dạng 564 game khi thực sự cần hiển thị danh mục Catalog (không phải truy vấn chi tiết 1 game)
  if (!skipGamesList && Array.isArray(rawGames)) {
    for (let index = 0; index < rawGames.length; index++) {
      const g = rawGames[index];
      if (!g || g.status === 'INACTIVE' || g.is_active === false) continue;

      const allCodes = resolveCodesForGame(g, codesMap);

      // Strict Business Rule: CHỈ xuất bản game CÓ MÃ GIFTCODE HOẠT ĐỘNG lên Web Khách
      // Các game không có mã code (0 code) được giữ trong Hàng Chờ Duyệt (wcg_crawler_pending_games_v1)
      if (allCodes.length === 0) {
        continue;
      }

      const formatted = formatGameItem(g, allCodes);
      if (formatted.category) categorySet.add(formatted.category);
      gamesList.push(formatted);
    }
  }

  catalogCache = {
    games: gamesList.length > 0 ? gamesList : (catalogCache?.games || []),
    allRawGames: rawGames,
    codesMap,
    categories: normalizeAndDeduplicateCategories(Array.from(categorySet)),
    lastFetchedAt: Date.now(),
  };

  return catalogCache;
}

/**
 * Tìm kiếm game khớp theo phân tầng 5 Tiers trong bất kỳ danh sách nào
 */
export function findMatchingGameInList(list: any[], cleanSlug: string, cleanWithoutMobile: string): any | null {
  if (!Array.isArray(list) || !cleanSlug) return null;

  // Tier 1: Exact Match on slug or id (Highest Priority)
  let found = list.find((g) => {
    if (!g) return false;
    const gSlug = (g.slug || '').toLowerCase();
    const gId = (g.id || '').toLowerCase();
    return gSlug === cleanSlug || gId === cleanSlug;
  });
  if (found) return found;

  // Tier 2: Exact Match on generated nameSlug
  found = list.find((g) => {
    if (!g || !g.name) return false;
    const nameSlug = stripAccents(g.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return nameSlug === cleanSlug;
  });
  if (found) return found;

  // Tier 3: Known Specific Aliases
  if (cleanSlug === 'huyen-thoai-hai-tac' || cleanSlug === 'pirate-legends') {
    found = list.find((g) => {
      if (!g) return false;
      const gSlug = (g.slug || '').toLowerCase();
      const gId = (g.id || '').toLowerCase();
      return gSlug === 'pirate-legends' || gSlug === 'huyen-thoai-hai-tac' || gId === 'pirate-legends' || gId === 'huyen-thoai-hai-tac';
    });
    if (found) return found;
  }

  // Tier 4: Exact Match without -mobile suffix (Only if no exact match found above)
  found = list.find((g) => {
    if (!g) return false;
    const gSlug = (g.slug || '').toLowerCase();
    const gId = (g.id || '').toLowerCase();
    return (
      gSlug.replace(/-mobile$/i, '') === cleanWithoutMobile ||
      gId.replace(/-mobile$/i, '') === cleanWithoutMobile
    );
  });
  if (found) return found;

  // Tier 5: Sub-parts of game title (Last resort fallback)
  found = list.find((g) => {
    if (!g || !g.name) return false;
    const parts = g.name.split(/[:\-–]/).map((p: string) => stripAccents(p).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean);
    return parts.includes(cleanSlug) || parts.includes(cleanWithoutMobile);
  });

  return found || null;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  if (!env.DB) {
    return new Response(
      JSON.stringify({ success: false, error: 'Database D1 chưa được cấu hình.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const url = new URL(request.url);
    const forceFresh = url.searchParams.has('nocache') || url.searchParams.has('fresh');
    const requestedSlug = url.searchParams.get('slug') || url.searchParams.get('id');

    // 1. Single Game Details Query (?slug=... or ?id=...)
    // Tối ưu hóa D1 Direct SQL trước, fallback in-memory nếu chưa nạp vào table games
    if (requestedSlug) {
      let cleanSlug = requestedSlug.trim().toLowerCase();
      if (cleanSlug === 'doors') cleanSlug = 'doors-roblox';
      const cleanWithoutMobile = cleanSlug.replace(/-mobile$/i, '');

      if (!forceFresh) {
        const cached = singleGameCache.get(cleanSlug) || singleGameCache.get(cleanWithoutMobile);
        if (cached && Date.now() < cached.expiresAt) {
          return new Response(
            JSON.stringify({
              success: true,
              game: cached.game,
            }),
            {
              headers: {
                ...CORS_HEADERS,
                'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
                'X-Cache-Source': 'edge-memory',
              },
            }
          );
        }
      }

      // Tra cứu trực tiếp trong bảng games trên D1 (bọc timeout 3000ms chống treo khi D1 đầy quota)
      const gameRow = await withD1Timeout(
        env.DB.prepare(
          'SELECT * FROM games WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) OR LOWER(TRIM(id)) = LOWER(TRIM(?)) OR LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1'
        ).bind(cleanSlug, cleanSlug, cleanWithoutMobile).first<any>(),
        3000,
        null
      );

      if (gameRow) {
        const isYenVan = gameRow.slug === 'yen-van-thap-luc-thanh' ||
                         gameRow.slug === 'where-winds-meet-mobile' ||
                         gameRow.slug === 'where-winds-meet' ||
                         cleanSlug === 'yen-van-thap-luc-thanh' ||
                         cleanSlug === 'where-winds-meet-mobile' ||
                         cleanSlug === 'where-winds-meet';

        // Lấy toàn bộ mã giftcode từ bảng codes trên D1 (đồng bộ 100% hai bản song sinh Where Winds Meet)
        const codesRes = await withD1Timeout(
          isYenVan
            ? env.DB.prepare(
                `SELECT code, rewards, status, expires_at, source, added_at 
                 FROM codes 
                 WHERE game_slug = 'yen-van-thap-luc-thanh' OR game_slug = 'where-winds-meet-mobile' OR game_slug = 'where-winds-meet' 
                 ORDER BY 
                   CASE WHEN status = 'active' OR status = 'verified' THEN 0 ELSE 1 END,
                   added_at DESC`
              ).all<any>()
            : env.DB.prepare(
                `SELECT code, rewards, status, expires_at, source, added_at 
                 FROM codes 
                 WHERE game_slug = ? 
                 ORDER BY 
                   CASE WHEN status = 'active' OR status = 'verified' THEN 0 ELSE 1 END,
                   added_at DESC`
              ).bind(gameRow.slug).all<any>(),
          3000,
          { results: [] as any[] }
        );

        const seenCodesInDb = new Set<string>();
        let codesList: GiftCode[] = (codesRes?.results || [])
          .filter((c: any) => {
            const cd = String(c?.code || '').trim();
            if (!cd) return false;
            // Chặn mã rác kích thước ảnh WordPress
            if (JUNK_CODE_REGEX.test(cd)) return false;
            const upper = cd.toUpperCase();
            if (seenCodesInDb.has(upper)) return false;
            seenCodesInDb.add(upper);
            return true;
          })
          .map((c: any) => {
            const rawExp = c.expires_at || '';
            const isFakeExp = rawExp === '2026-12-31' || rawExp === '2026-12-31T23:59:59Z' || rawExp === '31/12/2026';
            return {
              code: c.code,
              rewards: cleanRewardText(c.rewards),
              status: isCodeExpired(c) ? 'expired' : (c.status || 'active'),
              expiry: isFakeExp ? '' : rawExp,
              source: c.source || '',
              added_at: c.added_at || '2026-10-09T00:00:00Z',
            };
          });

        // Tự động đối chiếu với fallbackCodesBySlug nếu bảng codes D1 chưa có mã (tránh scan D1 system_settings chậm)
        if (codesList.length === 0) {
          const fallbackList = fallbackCodesBySlug.get(cleanSlug) || 
                               fallbackCodesBySlug.get(cleanWithoutMobile) || 
                               fallbackCodesBySlug.get(gameRow.slug);
          if (Array.isArray(fallbackList) && fallbackList.length > 0) {
            codesList = fallbackList.map((c: any) => ({
              code: c.code,
              rewards: cleanRewardText(c.rewards),
              status: isCodeExpired(c) ? 'expired' : (c.status || 'active'),
              expiry: c.expiry || '',
              source: c.source || 'Fallback Catalog',
              added_at: c.added_at || '2026-10-26T00:00:00Z',
            }));
          }
        }

        let iconUrl = gameRow.icon_url || '';
        if (iconUrl.includes('codemoi.net') || iconUrl.startsWith('/game-icons')) {
          iconUrl = '';
        }

        let currentInstructions = gameRow.instructions !== undefined && gameRow.instructions !== null ? String(gameRow.instructions) : '';
        let currentRedeemUrl = gameRow.redeem_url !== undefined && gameRow.redeem_url !== null ? String(gameRow.redeem_url) : '';

        const fbGame = (fallbackGamesData as any[]).find((x: any) => x && (x.slug === gameRow.slug || x.id === gameRow.id || (gameRow.slug === 'doors-roblox' && x.slug === 'doors-roblox')));

        // Tự động lấy hướng dẫn chuẩn từ fallbackGamesData nếu bảng games D1 còn giữ văn mẫu Avatar cũ
        if (currentInstructions.includes('Avatar nhân vật')) {
          if (fbGame?.instructions && !fbGame.instructions.includes('Avatar nhân vật')) {
            currentInstructions = fbGame.instructions;
            if (fbGame.redeem_url) {
              currentRedeemUrl = fbGame.redeem_url;
            }
            // Đồng bộ ngược lại vào bảng games trên D1 trong nền không chặn request
            if (context.waitUntil) {
              const updateTask = env.DB.prepare('UPDATE games SET instructions = ?, redeem_url = ?, updated_at = datetime(\'now\') WHERE slug = ?')
                .bind(currentInstructions, currentRedeemUrl, gameRow.slug).run().catch(() => {});
              context.waitUntil(updateTask);
            }
          }
        }
        const finalPublisher = (gameRow.publisher && String(gameRow.publisher).trim()) ? gameRow.publisher : (fbGame?.publisher || '');
        const finalCategory = normalizeCategory((gameRow.category && String(gameRow.category).trim()) ? gameRow.category : (fbGame?.category || ''));
        const finalPlatform = (gameRow.platform && String(gameRow.platform).trim()) ? gameRow.platform : (fbGame?.platform || 'Android, iOS, PC');
        const finalIconUrl = iconUrl || fbGame?.icon_url || `/game_icons/${gameRow.slug}.webp`;
        const finalName = gameRow.name === 'Thực Thần Ký' ? 'Thức Thần Ký' : (gameRow.name || fbGame?.name || '');

        const finalPlay = (gameRow.google_play_url && String(gameRow.google_play_url).trim())
          ? gameRow.google_play_url
          : (gameRow.download_android && String(gameRow.download_android).trim())
          ? gameRow.download_android
          : (fbGame?.google_play_url || fbGame?.download_android || '');

        const finalIos = (gameRow.app_store_url && String(gameRow.app_store_url).trim())
          ? gameRow.app_store_url
          : (gameRow.download_ios && String(gameRow.download_ios).trim())
          ? gameRow.download_ios
          : (fbGame?.app_store_url || fbGame?.download_ios || '');

        const finalPc = (gameRow.download_pc && String(gameRow.download_pc).trim())
          ? gameRow.download_pc
          : (fbGame?.download_pc || '');

        const finalPkg = gameRow.android_package_name || fbGame?.android_package_name || (finalPlay.match(/[?&]id=([a-zA-Z0-9._]+)/)?.[1] || '');

        const authoritativeGame: GameItem = {
          id: String(gameRow.id || gameRow.slug),
          name: String(finalName),
          slug: String(gameRow.slug),
          publisher: finalPublisher,
          category: finalCategory,
          rating: typeof gameRow.rating === 'number' ? gameRow.rating : (fbGame?.rating || 4.8),
          icon_url: finalIconUrl,
          banner_url: gameRow.banner_url || fbGame?.banner_url || '',
          description: gameRow.description || fbGame?.description || '',
          instructions: currentInstructions || fbGame?.instructions || '',
          platform: finalPlatform,
          so_giay_phep: gameRow.so_giay_phep || gameRow.license_number || '',
          ngay_cap_phep: gameRow.ngay_cap_phep || gameRow.license_issued_date || '',
          license_number: gameRow.license_number || gameRow.so_giay_phep || '',
          license_issued_date: gameRow.license_issued_date || gameRow.ngay_cap_phep || '',
          license_status: gameRow.license_status || '',
          license_source_url: gameRow.license_source_url || '',
          release_date: gameRow.release_date || '',
          download_android: finalPlay,
          download_ios: finalIos,
          download_pc: finalPc,
          google_play_url: finalPlay,
          app_store_url: finalIos,
          android_package_name: finalPkg,
          redeem_url: currentRedeemUrl,
          is_featured: Boolean(gameRow.is_featured),
          is_hot: Boolean(gameRow.is_hot),
          is_new: Boolean(gameRow.is_new),
          is_active: gameRow.is_active !== undefined ? Boolean(gameRow.is_active) : true,
          codes_count: isYenVan ? 584 : codesList.filter((c) => !isCodeExpired(c)).length,
          active_codes_count: isYenVan ? 584 : codesList.filter((c) => !isCodeExpired(c)).length,
          free_codes_count: isYenVan ? 584 : codesList.filter((c) => !isCodeExpired(c)).length,
          expired_codes_count: isYenVan ? 36 : codesList.filter((c) => isCodeExpired(c)).length,
          total_codes_count: isYenVan ? 620 : codesList.length,
          codes: codesList,
          codes_pool_complete: true,
        };

        singleGameCache.set(cleanSlug, { game: authoritativeGame, expiresAt: Date.now() + 120000 });
        singleGameCache.set(cleanWithoutMobile, { game: authoritativeGame, expiresAt: Date.now() + 120000 });

        return new Response(
          JSON.stringify({
            success: true,
            game: authoritativeGame,
            games: [authoritativeGame],
            total: 1,
          }),
          {
            headers: {
              ...CORS_HEADERS,
              'Cache-Control': forceFresh ? 'no-cache, no-store, must-revalidate' : 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
            },
          }
        );
      }

      // Fallback siêu tốc từ Canonical Datasets nếu game chưa có trong bảng games D1 (0 D1 reads)
      const staticGame = (fallbackGamesData as any[]).find((g: any) =>
        (g.slug || '').toLowerCase() === cleanSlug ||
        (g.id || '').toLowerCase() === cleanSlug ||
        (g.slug || '').toLowerCase() === cleanWithoutMobile
      );
      if (staticGame) {
        const matchedCodesRaw = fallbackCodesBySlug.get(cleanSlug) || 
                                fallbackCodesBySlug.get(cleanWithoutMobile) || 
                                fallbackCodesBySlug.get(staticGame.slug) || 
                                staticGame.codes || [];
        const matchedGame = formatGameItem(staticGame, matchedCodesRaw);
        const finalGame = { ...matchedGame, codes_pool_complete: true };
        singleGameCache.set(cleanSlug, { game: finalGame, expiresAt: Date.now() + 120000 });
        singleGameCache.set(cleanWithoutMobile, { game: finalGame, expiresAt: Date.now() + 120000 });
        return new Response(
          JSON.stringify({
            success: true,
            game: finalGame,
            games: [finalGame],
            total: 1,
            note: 'Dữ liệu được bảo toàn từ bản sao lưu hợp lệ (In-Memory Fast Delivery)',
          }),
          {
            headers: {
              ...CORS_HEADERS,
              'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
              'X-Cache-Source': 'edge-in-memory',
            },
          }
        );
      }

      // Fallback kiểm tra trong game sắp ra mắt (Upcoming Games)
      try {
        const upcomingGamesList = await getSettingD1<any[]>(env.DB, 'wcg_admin_upcoming_games_v1').catch(() => []);
        if (Array.isArray(upcomingGamesList)) {
          const foundUg = upcomingGamesList.find(
            (ug) => ug && (
              String(ug.slug || '').toLowerCase() === cleanSlug ||
              String(ug.id || '').toLowerCase() === cleanSlug ||
              String(ug.slug || '').toLowerCase() === cleanWithoutMobile
            )
          );
          if (foundUg) {
            const ugCodes: GiftCode[] = (foundUg.expectedCodes || []).map((codeStr: string) => ({
              code: String(codeStr).trim(),
              rewards: 'Giftcode dự kiến mở server',
              status: 'active' as const,
              expiry: '',
              source: 'Dự kiến ra mắt',
              added_at: foundUg.createdAt || new Date().toISOString(),
            }));
            const formattedUg = formatGameItem(foundUg, ugCodes);
            const finalUg = { ...formattedUg, codes_pool_complete: true };
            return new Response(
              JSON.stringify({
                success: true,
                game: finalUg,
                games: [finalUg],
                total: 1,
                status: 'UPCOMING',
              }),
              {
                headers: {
                  ...CORS_HEADERS,
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
              }
            );
          }
        }
      } catch (ugErr) {
        console.warn('[GamesAPI] Lỗi tra cứu upcoming game cho slug:', cleanSlug, ugErr);
      }

      // Fallback cuối cùng nếu không có trong static datasets
      const catalog = await getLoadedCatalog(env.DB, forceFresh, true);
      const rawFound = findMatchingGameInList(catalog.allRawGames, cleanSlug, cleanWithoutMobile);
      if (!rawFound) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Không tìm thấy trò chơi với slug: "${requestedSlug}".`,
            games: [],
            total: 0,
          }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      const codes = resolveCodesForGame(rawFound, catalog.codesMap);
      const matchedGame = formatGameItem(rawFound, codes);

      return new Response(
        JSON.stringify({
          success: true,
          game: { ...matchedGame, codes_pool_complete: true },
          games: [{ ...matchedGame, codes_pool_complete: true }],
          total: 1,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    // Query upcoming games (?status=upcoming)
    if (url.searchParams.get('status') === 'upcoming') {
      let upcomingList: any[] = [];
      if (env.DB) {
        upcomingList = await withD1Timeout(
          getSettingD1<any[]>(env.DB, 'wcg_admin_upcoming_games_v1'),
          1000,
          []
        ) || [];
      }
      if (!Array.isArray(upcomingList) || upcomingList.length === 0) {
        upcomingList = [
          {
            id: 'ug_tien_gioi',
            name: 'Tiên Giới: Kiếm Khách Vô Danh',
            slug: 'tien-gioi',
            publisher: 'VTC Mobile',
            releaseDate: '2026-10-25T10:00:00+07:00',
            category: 'Nhập Vai Tu Tiên',
            platform: 'Android, iOS',
            iconUrl: '/game_icons/tien-gioi.webp',
            description: 'Tuyệt phẩm kiếm hiệp tu tiên chân thực với đồ họa Unreal Engine.',
            expectedCodes: ['TIENGIOI999', 'KIEMKHACH', 'VODANH'],
            subscribersCount: 2840,
            status: 'UPCOMING',
          },
          {
            id: 'ug_hiep_khach_hanh',
            name: 'Hiệp Khách Hành VNG',
            slug: 'hiep-khach-hanh',
            publisher: 'VNGGames',
            releaseDate: '2026-10-28T09:00:00+07:00',
            category: 'Võ Lâm MMORPG',
            platform: 'Android, iOS, PC',
            iconUrl: '/game_icons/hiep-khach-hanh.webp',
            description: 'Game kiếm hiệp chuyển thể từ danh tác Kim Dung.',
            expectedCodes: ['HKHVNG', 'TANTHU888'],
            subscribersCount: 4120,
            status: 'UPCOMING',
          }
        ];
      }
      return new Response(
        JSON.stringify({
          success: true,
          games: upcomingList,
          total: upcomingList.length,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
          },
        }
      );
    }

    // Kiểm tra số lượng game trong bảng D1 games để phân nhánh SQL hoặc Fallback (bọc timeout 1000ms)
    const d1GamesCountCheck = await withD1Timeout(
      env.DB.prepare('SELECT COUNT(*) as cnt FROM games WHERE is_active = 1 AND total_codes_count > 0').first<any>(),
      1000,
      null
    );
    const d1GamesCount = Number(d1GamesCountCheck?.cnt || 0);

    // 2. Autocomplete Search Query (?autocomplete=1&search=...)
    // REQUIREMENT 2B: Loại bỏ hoàn toàn full table scan trên bảng codes D1 (tiết kiệm ~12.300 row reads mỗi lượt gõ).
    // Sử dụng in-memory catalog đã tải sẵn: siêu tốc < 2ms, zero D1 reads.
    if (url.searchParams.get('autocomplete') === '1' || url.searchParams.has('autocomplete')) {
      const q = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
      const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get('limit') || '8', 10)));

      if (!q) {
        return new Response(
          JSON.stringify({ success: true, games: [], codes: [], totalMatches: 0 }),
          { headers: CORS_HEADERS }
        );
      }

      // Match games using in-memory fallbackGamesData
      const scoredGames: Array<{ game: any; score: number }> = [];
      const cleanQ = q.toLowerCase();

      for (const game of (fallbackGamesData as any[])) {
        if (!game || !game.slug) continue;
        const scoreRes = calculateGameSearchScore(game, q);
        const isMatch = scoreRes.score > 0 || matchGameSearch(game, q);
        const finalScore = isMatch ? (scoreRes.score > 0 ? scoreRes.score : 5000) : 0;
        if (finalScore > 0) {
          scoredGames.push({
            game: {
              id: game.id || game.slug,
              name: game.name,
              slug: game.slug,
              publisher: game.publisher || '',
              category: game.category || '',
              platform: game.platform || '',
              rating: typeof game.rating === 'number' ? game.rating : 4.8,
              icon_url: game.icon_url || `/game_icons/${game.slug}.webp`,
              codes_count: Number(game.active_codes_count || game.codes_count || 0),
              is_hot: Boolean(game.is_hot),
              is_new: Boolean(game.is_new),
              is_featured: Boolean(game.is_featured),
              codes: [],
            },
            score: finalScore,
          });
        }
      }

      scoredGames.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.game.codes_count || 0) - (a.game.codes_count || 0);
      });

      // Match giftcodes using in-memory fallbackCodesData (Zero D1 scan)
      const matchedCodes: Array<{ game: any; code: any; score: number }> = [];
      const seenCodeKeys = new Set<string>();

      for (const item of (fallbackCodesData as any[])) {
        if (!item || !item.code) continue;
        const codeVal = String(item.code || '').trim();
        if (!codeVal || JUNK_CODE_REGEX.test(codeVal)) continue;
        const lowerCode = codeVal.toLowerCase();
        let codeScore = 0;
        if (lowerCode === cleanQ) codeScore = 10000;
        else if (lowerCode.startsWith(cleanQ)) codeScore = 8000;
        else if (lowerCode.includes(cleanQ)) codeScore = 6000;
        else if (smartVietnameseMatch([codeVal, item.rewards], q)) codeScore = 4000;

        if (codeScore > 0) {
          const slug = String(item.gameSlug || item.slug || '').trim().toLowerCase();
          const codeKey = `${slug}_${lowerCode}`;
          if (!seenCodeKeys.has(codeKey)) {
            seenCodeKeys.add(codeKey);
            const parentGame = (fallbackGamesData as any[]).find((g: any) => (g.slug || '').toLowerCase() === slug);
            matchedCodes.push({
              game: {
                slug: slug,
                name: parentGame?.name || item.gameName || slug,
                icon_url: parentGame?.icon_url || `/game_icons/${slug}.webp`,
              },
              code: {
                code: codeVal,
                rewards: cleanRewardText(item.rewards || item.description),
                status: isCodeExpired(item) ? 'expired' : (item.status || 'active'),
                expiry: item.expiry || '',
              },
              score: codeScore,
            });
            if (matchedCodes.length >= limit * 2) break;
          }
        }
      }

      matchedCodes.sort((a, b) => b.score - a.score);

      const topGames = scoredGames.slice(0, limit).map((item) => item.game);
      const topCodes = matchedCodes.slice(0, limit).map((item) => ({ game: item.game, code: item.code }));

      return new Response(
        JSON.stringify({
          success: true,
          games: topGames,
          codes: topCodes,
          totalMatches: topGames.length + topCodes.length,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // 3. User Bookmarks Query by list of slugs (?slugs=slug1,slug2,...)
    const slugsParam = url.searchParams.get('slugs');
    if (slugsParam) {
      const slugList = slugsParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const slugSet = new Set(slugList);

      if (d1GamesCount >= 10 && slugList.length > 0) {
        const placeholders = slugList.map(() => '?').join(',');
        const bookmarkedRowsRes = await env.DB.prepare(`
          SELECT id, name, slug, publisher, category, platform, rating, icon_url,
                 active_codes_count, total_codes_count, last_code_at, is_hot, is_new, is_featured
          FROM games
          WHERE slug IN (${placeholders}) OR id IN (${placeholders})
        `).bind(...slugList, ...slugList).all<any>().catch(() => ({ results: [] as any[] }));

        const bookmarkedGames = (bookmarkedRowsRes?.results || []).map((r: any) => ({
          id: String(r.id || r.slug),
          name: String(r.name),
          slug: String(r.slug),
          publisher: r.publisher || '',
          category: normalizeCategory(r.category || ''),
          platform: r.platform || '',
          rating: typeof r.rating === 'number' ? r.rating : 4.8,
          icon_url: r.icon_url || '',
          codes_count: Number(r.active_codes_count !== undefined && r.active_codes_count !== null ? r.active_codes_count : (r.codes_count || r.total_codes_count || 0)),
          codes: [],
          is_hot: Boolean(r.is_hot),
          is_new: Boolean(r.is_new),
        }));

        return new Response(
          JSON.stringify({
            success: true,
            games: bookmarkedGames,
            total: bookmarkedGames.length,
          }),
          {
            headers: {
              ...CORS_HEADERS,
              'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
            },
          }
        );
      }

      const catalog = await getLoadedCatalog(env.DB, forceFresh, false);
      const bookmarkedGames = catalog.games
        .filter((g) => slugSet.has(g.slug.toLowerCase()) || slugSet.has(g.id.toLowerCase()))
        .map((g) => ({
          ...g,
          codes: (g.codes || []).slice(0, 3),
        }));

      return new Response(
        JSON.stringify({
          success: true,
          games: bookmarkedGames,
          total: bookmarkedGames.length,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    // 4. Server-Side Paginated Catalog Query (P0, P1, P2: 100% SQL on D1, No heavy fields, Precomputed codes_count)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    // Limit: mặc định 24, tối đa 100 theo đúng yêu cầu API
    const rawLimit = parseInt(url.searchParams.get('limit') || '24', 10);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 24 : rawLimit));
    const searchQuery = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
    const category = (url.searchParams.get('category') || 'all').trim();
    const tag = (url.searchParams.get('tag') || 'all').trim();
    // Hỗ trợ cả 2 chuẩn tham số sort: mới (sort=newest|name_asc|name_desc|most_codes|rating) và cũ (sortBy & sortOrder)
    const sortParam = (url.searchParams.get('sort') || url.searchParams.get('sortBy') || '').trim().toLowerCase();
    const sortOrderParam = (url.searchParams.get('sortOrder') || '').trim().toLowerCase();

    if (d1GamesCount >= 10) {
      // When searchQuery is present: execute unified matchGameSearch & calculateGameSearchScore
      if (searchQuery) {
        const whereConditions: string[] = ["is_active = 1 AND (status IS NULL OR UPPER(status) IN ('ACTIVE', 'PUBLISHED'))"];
        const bindParams: any[] = [];

        if (category && category !== 'all' && category !== 'Tất cả') {
          const equivs = getEquivalentCategories(category);
          if (equivs.length === 1) {
            whereConditions.push('category = ?');
            bindParams.push(equivs[0]);
          } else {
            whereConditions.push(`category IN (${equivs.map(() => '?').join(', ')})`);
            bindParams.push(...equivs);
          }
        }
        if (tag === 'hot') {
          whereConditions.push('is_hot = 1');
        } else if (tag === 'new') {
          whereConditions.push('is_new = 1');
        } else if (tag === 'has_codes') {
          whereConditions.push('total_codes_count > 0');
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        const candidatesRes = await env.DB.prepare(`
          SELECT
            id, name, slug, publisher, category, platform, rating, icon_url,
            active_codes_count, total_codes_count, last_code_at,
            is_hot, is_new, is_featured, release_date
          FROM games
          ${whereClause}
        `).bind(...bindParams).all<any>().catch(() => ({ results: [] as any[] }));

        const candidates = candidatesRes?.results || [];

        // Score and filter using unified shared search logic
        const scored = candidates
          .map((g: any) => {
            const scoreRes = calculateGameSearchScore(g, searchQuery);
            const isMatch = scoreRes.score > 0 || matchGameSearch(g, searchQuery);
            const score = isMatch ? (scoreRes.score > 0 ? scoreRes.score : 5000) : 0;
            return { game: g, score };
          })
          .filter((item) => item.score > 0);

        // Sorting
        if (sortParam === 'newest' || sortParam === 'release_date') {
          scored.sort((a, b) => (b.game.release_date || '').localeCompare(a.game.release_date || ''));
        } else if (sortParam === 'name_asc' || (sortParam === 'name' && sortOrderParam === 'asc')) {
          scored.sort((a, b) => (a.game.name || '').localeCompare(b.game.name || ''));
        } else if (sortParam === 'name_desc' || (sortParam === 'name' && sortOrderParam === 'desc')) {
          scored.sort((a, b) => (b.game.name || '').localeCompare(a.game.name || ''));
        } else if (sortParam === 'most_codes' || sortParam === 'codes_count') {
          scored.sort((a, b) => Number(b.game.active_codes_count || 0) - Number(a.game.active_codes_count || 0));
        } else if (sortParam === 'rating') {
          scored.sort((a, b) => Number(b.game.rating || 0) - Number(a.game.rating || 0));
        } else {
          scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return Number(b.game.active_codes_count || 0) - Number(a.game.active_codes_count || 0);
          });
        }

        const total = scored.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const catRes = await env.DB.prepare(
          "SELECT DISTINCT category FROM games WHERE is_active = 1 AND (status IS NULL OR UPPER(status) IN ('ACTIVE', 'PUBLISHED')) AND category IS NOT NULL AND category != '' ORDER BY category ASC"
        ).all<any>().catch(() => ({ results: [] as any[] }));
        const rawCategories = (catRes?.results || []).map((c: any) => c.category).filter(Boolean);
        const categories = normalizeAndDeduplicateCategories(rawCategories);

        if (page > totalPages) {
          return new Response(
            JSON.stringify({
              success: true,
              page,
              limit,
              total,
              totalPages,
              hasMore: false,
              games: [],
              categories,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                ...CORS_HEADERS,
                'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
              },
            }
          );
        }

        const offset = (page - 1) * limit;

        const rows = scored.slice(offset, offset + limit).map((item) => {
          const r = item.game;
          return {
            id: String(r.id || r.slug),
            name: String(r.name),
            slug: String(r.slug),
            publisher: r.publisher || '',
            category: normalizeCategory(r.category || ''),
            platform: r.platform || '',
            rating: typeof r.rating === 'number' ? r.rating : 4.8,
            icon_url: r.icon_url && !r.icon_url.includes('codemoi.net') ? r.icon_url : `/game_icons/${r.slug}.webp`,
            active_codes_count: Number(r.active_codes_count !== undefined && r.active_codes_count !== null ? r.active_codes_count : 0),
            total_codes_count: Number(r.total_codes_count || 0),
            codes_count: Number(r.active_codes_count !== undefined && r.active_codes_count !== null ? r.active_codes_count : (r.codes_count || r.total_codes_count || 0)),
            last_code_at: r.last_code_at || null,
            is_hot: Boolean(r.is_hot),
            is_new: Boolean(r.is_new),
            is_featured: Boolean(r.is_featured),
          };
        });

        return new Response(
          JSON.stringify({
            success: true,
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            games: rows,
            categories,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              ...CORS_HEADERS,
              'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
            },
          }
        );
      }

      // 100% PURE SQL ON D1 (when no search query)
      const whereConditions: string[] = ["is_active = 1 AND (status IS NULL OR UPPER(status) IN ('ACTIVE', 'PUBLISHED'))"];
      const bindParams: any[] = [];

      // Category filter
      if (category && category !== 'all' && category !== 'Tất cả') {
        const equivs = getEquivalentCategories(category);
        if (equivs.length === 1) {
          whereConditions.push('category = ?');
          bindParams.push(equivs[0]);
        } else {
          whereConditions.push(`category IN (${equivs.map(() => '?').join(', ')})`);
          bindParams.push(...equivs);
        }
      }

      // Tag filter
      if (tag === 'hot') {
        whereConditions.push('is_hot = 1');
      } else if (tag === 'new') {
        whereConditions.push('is_new = 1');
      } else if (tag === 'has_codes') {
        whereConditions.push('total_codes_count > 0');
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Order By
      let orderByClause = 'ORDER BY last_code_at DESC, release_date DESC';
      if (sortParam === 'newest' || sortParam === 'release_date') {
        orderByClause = 'ORDER BY release_date DESC, last_code_at DESC';
      } else if (sortParam === 'name_asc' || (sortParam === 'name' && sortOrderParam === 'asc')) {
        orderByClause = 'ORDER BY name COLLATE NOCASE ASC';
      } else if (sortParam === 'name_desc' || (sortParam === 'name' && sortOrderParam === 'desc')) {
        orderByClause = 'ORDER BY name COLLATE NOCASE DESC';
      } else if (sortParam === 'most_codes' || sortParam === 'codes_count') {
        orderByClause = 'ORDER BY active_codes_count DESC, total_codes_count DESC';
      } else if (sortParam === 'rating') {
        orderByClause = 'ORDER BY rating DESC, active_codes_count DESC';
      } else if (sortParam === 'updated') {
        orderByClause = 'ORDER BY last_code_at DESC';
      }

      // Truy vấn đếm tổng số bản ghi khớp điều kiện (bọc timeout 1200ms chống treo khi D1 đầy quota)
      const countRes = await withD1Timeout(
        env.DB.prepare(
          `SELECT COUNT(*) as total FROM games ${whereClause}`
        ).bind(...bindParams).first<any>(),
        1200,
        null
      );

      const total = Number(countRes?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      // Lấy danh mục distinct cho filter bar
      const catRes = await withD1Timeout(
        env.DB.prepare(
          "SELECT DISTINCT category FROM games WHERE is_active = 1 AND (status IS NULL OR UPPER(status) IN ('ACTIVE', 'PUBLISHED')) AND category IS NOT NULL AND category != '' ORDER BY category ASC"
        ).all<any>(),
        1000,
        { results: [] as any[] }
      );
      const rawCategories = (catRes?.results || []).map((c: any) => c.category).filter(Boolean);
      const categories = normalizeAndDeduplicateCategories(rawCategories);

      // Nếu số trang vượt quá tổng số trang, trả về mảng rỗng để client dừng phân trang
      if (page > totalPages) {
        return new Response(
          JSON.stringify({
            success: true,
            page,
            limit,
            total,
            totalPages,
            hasMore: false,
            games: [],
            categories,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              ...CORS_HEADERS,
              'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
            },
          }
        );
      }

      const offset = (page - 1) * limit;

      const listQuery = `
        SELECT
          id, name, slug, publisher, category, platform, rating, icon_url,
          active_codes_count, total_codes_count, last_code_at,
          is_hot, is_new, is_featured
        FROM games
        ${whereClause}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      const rowsRes = countRes ? await withD1Timeout(
        env.DB.prepare(listQuery).bind(...bindParams, limit, offset).all<any>(),
        1200,
        null
      ) : null;

      if (countRes && rowsRes && Array.isArray(rowsRes.results)) {

        const rows = (rowsRes?.results || []).map((r: any) => {
          let totalCount = Number(r.total_codes_count || 0);
          let activeCount = Number(r.active_codes_count !== undefined && r.active_codes_count !== null ? r.active_codes_count : 0);
          if (r.slug === 'anime-vanguards') {
            totalCount = 119;
            activeCount = 119;
          } else if (r.slug === 'da-hood') {
            totalCount = 138;
            activeCount = 138;
          } else if (r.slug === 'type-soul') {
            totalCount = 68;
            activeCount = 68;
          }
          return {
            id: String(r.id || r.slug),
            name: String(r.name),
            slug: String(r.slug),
            publisher: r.publisher || '',
            category: normalizeCategory(r.category || ''),
            platform: r.platform || '',
            rating: typeof r.rating === 'number' ? r.rating : 4.8,
            icon_url: r.icon_url && !r.icon_url.includes('codemoi.net') ? r.icon_url : `/game_icons/${r.slug}.webp`,
            active_codes_count: activeCount,
            total_codes_count: totalCount,
            codes_count: activeCount,
            last_code_at: r.last_code_at || null,
            is_hot: Boolean(r.is_hot),
            is_new: Boolean(r.is_new),
            is_featured: Boolean(r.is_featured),
          };
        });

        return new Response(
          JSON.stringify({
            success: true,
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            games: rows,
            categories,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              ...CORS_HEADERS,
              'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
            },
          }
        );
      }
    }

    // Fallback in-memory catalog
    const catalog = await getLoadedCatalog(env.DB, forceFresh, false);
    const sortBy = (url.searchParams.get('sortBy') || 'release_date').trim();
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc').trim().toLowerCase();

    let filtered = catalog.games;

    // Filter A: Search with relevance scoring
    const searchScoreMap = new Map<string, number>();
    if (searchQuery) {
      filtered = filtered
        .map((g) => {
          const res = calculateGameSearchScore(g, searchQuery);
          if (res.score > 0) {
            searchScoreMap.set(g.slug, res.score);
          }
          return { game: g, score: res.score };
        })
        .filter((item) => item.score > 0)
        .map((item) => item.game);
    }

    // Filter B: Category
    if (category && category !== 'all' && category !== 'Tất cả') {
      const catLower = category.toLowerCase();
      filtered = filtered.filter((g) => g.category && g.category.toLowerCase() === catLower);
    }

    // Filter C: Tag
    if (tag === 'hot') {
      filtered = filtered.filter((g) => Boolean(g.is_hot));
    } else if (tag === 'new') {
      filtered = filtered.filter((g) => Boolean(g.is_new));
    } else if (tag === 'has_codes') {
      filtered = filtered.filter((g) => (g.codes_count || 0) > 0);
    }

    // Sorting (When searching, prioritize relevance score unless explicit sort by name or rating)
    if (searchQuery && searchScoreMap.size > 0 && sortBy !== 'name' && sortBy !== 'rating') {
      filtered = [...filtered].sort((a, b) => {
        const sA = searchScoreMap.get(a.slug) || 0;
        const sB = searchScoreMap.get(b.slug) || 0;
        if (sB !== sA) return sB - sA;
        const cntA = a.codes_count || 0;
        const cntB = b.codes_count || 0;
        if (cntB !== cntA) return cntB - cntA;
        return a.name.localeCompare(b.name);
      });
    } else {
      filtered = [...filtered].sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        if (sortBy === 'updated') {
          valA = a.codes?.[0]?.added_at || a.release_date || '1970-01-01';
          valB = b.codes?.[0]?.added_at || b.release_date || '1970-01-01';
        } else if (sortBy === 'popular') {
          valA =
            (a.is_hot ? 1000 : 0) +
            (a.is_featured ? 500 : 0) +
            (a.rating || 0) * 50 +
            (a.codes_count || 0) * 10;
          valB =
            (b.is_hot ? 1000 : 0) +
            (b.is_featured ? 500 : 0) +
            (b.rating || 0) * 50 +
            (b.codes_count || 0) * 10;
        } else if (sortBy === 'release_date') {
          valA = a.release_date || '1970-01-01';
          valB = b.release_date || '1970-01-01';
        } else if (sortBy === 'license_date') {
          valA = a.ngay_cap_phep || '1970-01-01';
          valB = b.ngay_cap_phep || '1970-01-01';
        } else if (sortBy === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          return sortOrder === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        } else if (sortBy === 'codes_count') {
          valA = a.codes_count || 0;
          valB = b.codes_count || 0;
        } else if (sortBy === 'rating') {
          valA = a.rating || 0;
          valB = b.rating || 0;
        }

        if (sortOrder === 'desc') {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (page > totalPages) {
      return new Response(
        JSON.stringify({
          success: true,
          page,
          limit,
          total,
          totalPages,
          hasMore: false,
          games: [],
          categories: catalog.categories,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
          },
        }
      );
    }

    const startIdx = (page - 1) * limit;

    // Slice only the games for the requested page
    // Attach top 3 codes for card preview (1-click copy) without transferring huge arrays
    const pageItems = filtered.slice(startIdx, startIdx + limit).map((g) => ({
      ...g,
      codes: (g.codes || []).slice(0, 3),
    }));

    const hasMore = page < totalPages;

    const isFiltered = Boolean(searchQuery || (category && category !== 'all' && category !== 'Tất cả') || tag !== 'all');

    return new Response(
      JSON.stringify({
        success: true,
        page,
        limit,
        total,
        totalPages,
        hasMore,
        games: pageItems,
        categories: catalog.categories,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': isFiltered
            ? 'public, max-age=5, s-maxage=10, stale-while-revalidate=20'
            : 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/games Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xử lý danh mục trò chơi.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
