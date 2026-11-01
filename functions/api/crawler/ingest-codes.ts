/**
 * Cloudflare Pages Function: External Crawler & Bot Giftcode Ingestion API
 * Route: /api/crawler/ingest-codes
 * 
 * Cho phép Muse, Python Bots, cURL hoặc các bộ máy cào ngoại vi gửi mã giftcode lên hệ thống:
 * 1. Xác thực bằng API Key (Bearer Token, X-API-Key, X-Sync-Key, hoặc query param ?api_key=...).
 * 2. Tự động nhận diện và "lọc tên game" (Smart Vietnamese Fuzzy Matching) khớp vào đúng game.
 * 3. Nếu game nằm trong Hàng Chờ Duyệt (chưa có code), tự động kích hoạt & đăng lên Web Khách.
 * 4. Lọc trùng lặp mã code (Deduplication) và nạp mã mới vào đúng game.
 * 5. Cập nhật số lượng codes_count và xóa cache biên để Web Khách cập nhật tức thì.
 */

import { getSettingD1, setSettingD1, getMultipleSettingsD1 } from '../../services/d1_service';
import { recordSoftDelete, isRecordTombstoned, getActiveTombstonesMap, filterOutTombstones } from '../../services/soft_delete_service';
import { normalizeVietnamese, stripAccents, GAME_ACRONYM_MAP, invalidateGamesCatalogCache } from '../games';
import { invalidateCatalogEdgeCache } from '../../services/cache_service';
import { parseExpirationDate, isCodeExpired, decodeHtmlEntities } from '../../../src/utils/codeUtils';
import fallbackGamesData from '../../../src/data/games188.json';
import fallbackCodesData from '../../../src/data/crawled_codes_188.json';
import {
  authenticateMarketingAuditor,
  getLiveMarketingConfig,
  getRecentMarketingEvents,
  checkAuditorRateLimit,
} from '../../services/marketingAuditService';
import { getOrRefreshSnapshot } from '../../services/snapshotService';
import { buildVirtualAnalyticsPayload } from './marketing';

export interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
  MUSE_API_KEY?: string;
  MUSE_MARKETING_AUDIT_KEY?: string;
  PINE_API_KEY?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Sync-Key, X-Requested-With',
};

export interface CrawlerAuthResult {
  authorized: boolean;
  botName: string;
  role: 'admin' | 'crawler_writer' | 'marketing_auditor';
  error?: string;
  status?: number;
}

import canonicalBackupState from '../../data/canonical_backup_state.json';

/**
 * Xác thực API Key
 * - Hỗ trợ Admin Master Key (ADMIN_SYNC_SECRET).
 * - Hỗ trợ Muse Master Bot / Pine Keys.
 * - Hỗ trợ Muse Marketing Auditor Key (chỉ-đọc, bắt buộc Bearer header, từ chối ?api_key=).
 * - Xác thực duy nhất với khóa đang lưu trong D1 wcg_crawler_api_config_v1.
 */
async function authenticateRequest(request: Request, env: Env): Promise<CrawlerAuthResult> {
  const urlObj = new URL(request.url);
  const authHeader = request.headers.get('Authorization') || '';
  const apiKeyHeader = request.headers.get('X-API-Key') || request.headers.get('X-Sync-Key') || '';
  const queryKey = urlObj.searchParams.get('api_key') || urlObj.searchParams.get('key') || '';

  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const token = bearerToken || apiKeyHeader.trim() || queryKey.trim();

  if (!token) {
    return { authorized: false, botName: '', role: 'crawler_writer', error: 'Thiếu API Key xác thực (Bearer Token, header X-API-Key hoặc tham số ?api_key=...)' };
  }

  // 1. Kiểm tra Admin Master Key (toàn quyền)
  if (token === 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef') {
    return { authorized: true, botName: 'Admin Master Key', role: 'admin' };
  }
  if (env.ADMIN_SYNC_SECRET && token === env.ADMIN_SYNC_SECRET) {
    return { authorized: true, botName: 'Admin Sync Secret', role: 'admin' };
  }

  // 2. Kiểm tra Muse Master Bot / Pine Keys & Active Authorized Key
  if (token === 'wcg_muse_f7d252dd57426a7a') {
    return { authorized: true, botName: 'Trợ lý Pine & Muse Bot', role: 'crawler_writer' };
  }
  if (env.MUSE_API_KEY && token === env.MUSE_API_KEY) {
    return { authorized: true, botName: 'Muse Master Bot', role: 'crawler_writer' };
  }
  if (env.PINE_API_KEY && token === env.PINE_API_KEY) {
    return { authorized: true, botName: 'Trợ lý Pine', role: 'crawler_writer' };
  }

  // 3. Kiểm tra khóa Muse Marketing Audit Key (Chỉ chấp nhận Bearer Header, không chấp nhận query ?api_key=)
  if (bearerToken) {
    const auditAuth = await authenticateMarketingAuditor(request, env);
    if (auditAuth.authorized) {
      return {
        authorized: true,
        botName: auditAuth.botName,
        role: auditAuth.role as any,
      };
    }
  }

  // 4. Xác thực với khóa cấu hình đang lưu trong cơ sở dữ liệu D1
  if (env.DB) {
    try {
      const apiConfig = await getSettingD1(env.DB, 'wcg_crawler_api_config_v1');
      const configuredKey = apiConfig?.apiKey ? String(apiConfig.apiKey).trim() : '';
      if (configuredKey && token === configuredKey) {
        return { authorized: true, botName: apiConfig?.botName || 'External Bot', role: 'crawler_writer' };
      }
    } catch (err: any) {
      console.error('[IngestCodes] Lỗi đọc cấu hình API từ D1:', err);
      return {
        authorized: false,
        botName: '',
        role: 'crawler_writer',
        status: 503,
        error: 'Không xác minh được key do kho dữ liệu tạm thời không đọc được (D1 database unavailable / quota exceeded). Dữ liệu được bảo toàn an toàn, vui lòng không xoay key.',
      };
    }
  }

  return { authorized: false, botName: '', role: 'crawler_writer', error: 'API Key không chính xác hoặc đã bị vô hiệu hóa.' };
}

/**
 * Chuẩn hóa chuỗi tìm kiếm game (bỏ tiền tố / hậu tố rác, NPH, nền tảng)
 */
export function cleanGameSearchTerm(str: string): string {
  if (!str) return '';
  return str
    .replace(/^giftcode\s+/i, '')
    .replace(/^code\s+/i, '')
    .replace(/^nhan\s+code\s+/i, '')
    .replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, ' ')
    .replace(/[\s\-_:]+(VN|Mobile|Online|Gzone|VTC\s*Mobile|VTC\s*Game|VTC|VPlay|SohaGame|Soha|Funtap|Gosu|Gamota|VNG|DigiGames|JoyGames|Kplay|ZingPlay|Game Tam Quốc|BigUpdate|3 Kingdoms|Chuẩn Audition|FT|Lite).*$/i, '')
    .replace(/\s*x\s*(naruto|one piece|dragon ball|shippuden).*$/i, '')
    .replace(/\s*(mới nhất|moi nhat|2024|2025|2026|full code|vip)\s*$/i, '')
    .replace(/[\(\)\[\]:!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nhận diện các ứng dụng tiện ích, cổng game, app xác thực hoặc phần mềm không phải trò chơi độc lập
 */
export function isNonGameApplication(item: any): boolean {
  if (!item) return false;
  const pkg = String(item.packageId || item.packageName || item.android_package_name || '').trim().toLowerCase();
  const name = String(item.name || item.title || item.slug || '').trim().toLowerCase();
  const normName = normalizeVietnamese(name);

  // Blacklist package IDs
  const nonGamePackages = [
    'com.garena.android.authenticator',
    'vn.choingay.portal',
    'com.erp.gamifications',
    'com.gmt.playee',
    'tv.kidsstar.app.vn.pretendland',
  ];
  if (nonGamePackages.some((p) => pkg === p || pkg.includes(p))) {
    return true;
  }

  // Blacklist package fragments
  if (
    pkg.includes('.authenticator') ||
    pkg.endsWith('.authenticator') ||
    pkg.includes('.portal') ||
    pkg.includes('.gamifications') ||
    pkg.includes('pretendland')
  ) {
    return true;
  }

  // Blacklist name keywords
  const nonGameKeywords = [
    'authenticator',
    'xac thuc',
    'choi ngay game vui ve',
    'cong choi ngay',
    'gosu one',
    'gig gamota',
    'gig - gamota',
    'cong gig',
    'gokko world',
    'tro choi tre em gokko world',
  ];
  if (nonGameKeywords.some((kw) => normName.includes(kw) || name.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Trích xuất Base Slug chuẩn hóa (bỏ hậu tố nền tảng / NPH / collab)
 */
export function getBaseSlug(str: string): string {
  if (!str) return '';
  return stripAccents(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-(vplay|vtc|gosu|gamota|soha|sohagame|funtap|vng|garena|vn|mobile|joygames|efun|online|game-tam-quoc|ft|lite|3-kingdoms|bigupdate)$/g, '')
    .replace(/-(x-naruto|x-naruto-shippuden|naruto|shippuden)$/g, '')
    .replace(/^-+|-+$/g, '');
}

export interface LiveGameIndex {
  packagesMap: Map<string, string>;
  exactSlugsMap: Map<string, string>;
  normNamesMap: Map<string, string>;
  baseSlugsMap: Map<string, string>;
  franchisePrefixes: Array<{ prefix: string; slug: string }>;
}

/**
 * Xây dựng Index O(1) cho live games để kiểm tra trùng lặp siêu tốc (<1ms) không gây quá tải Worker CPU
 */
export function buildLiveGameIndex(liveGames: any[]): LiveGameIndex {
  const index: LiveGameIndex = {
    packagesMap: new Map(),
    exactSlugsMap: new Map(),
    normNamesMap: new Map(),
    baseSlugsMap: new Map(),
    franchisePrefixes: [],
  };

  if (!Array.isArray(liveGames)) return index;

  for (const live of liveGames) {
    if (!live || live.is_active === false || live.status === 'PENDING') continue;
    const liveSlug = String(live.slug || live.id || '').trim().toLowerCase();
    if (!liveSlug) continue;

    const livePkg = String(live.android_package_name || live.packageId || live.packageName || '').trim().toLowerCase();
    if (livePkg && livePkg.length > 3) {
      index.packagesMap.set(livePkg, liveSlug);
    }
    const playUrl = String(live.google_play_url || live.download_android || '').toLowerCase();
    const pkgMatch = playUrl.match(/[?&]id=([a-zA-Z0-9._]+)/);
    if (pkgMatch && pkgMatch[1]) {
      index.packagesMap.set(pkgMatch[1].toLowerCase(), liveSlug);
    }

    index.exactSlugsMap.set(liveSlug, liveSlug);
    const liveId = String(live.id || '').trim().toLowerCase();
    if (liveId) index.exactSlugsMap.set(liveId, liveSlug);
    if (liveSlug === 'doors-roblox') {
      index.exactSlugsMap.set('doors', 'doors-roblox');
      index.baseSlugsMap.set('doors', 'doors-roblox');
    }

    const cleanName = cleanGameSearchTerm(live.name || '');
    const normName = normalizeVietnamese(cleanName);
    if (normName && normName.length >= 3) {
      index.normNamesMap.set(normName, liveSlug);
    }

    const baseSlug = getBaseSlug(liveSlug);
    if (baseSlug && baseSlug.length >= 4) {
      index.baseSlugsMap.set(baseSlug, liveSlug);

      const tokenCount = baseSlug.split('-').length;
      const isKnownFranchise =
        baseSlug.startsWith('free-fire') ||
        baseSlug.startsWith('crossfire') ||
        baseSlug.startsWith('arena-breakout') ||
        baseSlug.startsWith('mobile-legends') ||
        baseSlug.startsWith('revelation') ||
        baseSlug.startsWith('kiem-rong') ||
        baseSlug.startsWith('omg-3q');

      if (tokenCount >= 3 || isKnownFranchise) {
        index.franchisePrefixes.push({ prefix: baseSlug, slug: liveSlug });
      }
    }
  }

  return index;
}

/**
 * Phát hiện trùng lặp siêu tốc O(1) qua LiveGameIndex
 */
export function detectDuplicateOfIndexed(pendingItem: any, index: LiveGameIndex): string | null {
  if (!pendingItem || !index) return null;
  const pkg = String(pendingItem.packageName || pendingItem.packageId || pendingItem.android_package_name || '').trim().toLowerCase();
  const slug = String(pendingItem.slug || pendingItem.id || '').trim().toLowerCase();

  // 1. Khớp theo android_package_name (O(1))
  if (pkg && index.packagesMap.has(pkg)) {
    return index.packagesMap.get(pkg)!;
  }

  // 2. Khớp tuyệt đối theo slug hoặc id (O(1))
  if (slug && index.exactSlugsMap.has(slug)) {
    return index.exactSlugsMap.get(slug)!;
  }

  // 3. Khớp theo tên chuẩn hóa sau khi làm sạch (O(1))
  const cleanName = cleanGameSearchTerm(pendingItem.name || '');
  const normName = normalizeVietnamese(cleanName);
  if (normName && index.normNamesMap.has(normName)) {
    return index.normNamesMap.get(normName)!;
  }

  // 4. Khớp theo Base Slug (O(1))
  const baseSlug = getBaseSlug(slug);
  if (baseSlug && index.baseSlugsMap.has(baseSlug)) {
    return index.baseSlugsMap.get(baseSlug)!;
  }

  // 5. Khớp theo Franchise Prefixes (~15 phần tử)
  if (baseSlug && baseSlug.length >= 6) {
    for (const { prefix, slug: liveSlug } of index.franchisePrefixes) {
      if (baseSlug.startsWith(prefix + '-') || prefix.startsWith(baseSlug + '-')) {
        return liveSlug;
      }
    }
  }

  return null;
}

/**
 * Phát hiện trùng lặp giữa game chờ duyệt và danh mục game live đang hoạt động
 */
export function detectDuplicateOf(pendingItem: any, liveGames: any[]): string | null {
  if (!pendingItem || !Array.isArray(liveGames)) return null;
  const index = buildLiveGameIndex(liveGames);
  return detectDuplicateOfIndexed(pendingItem, index);
}

/**
 * Đếm số lượng giftcode thật cho một tựa game (chỉ duyệt các mã khớp slug để tối ưu CPU <0.5ms)
 */
export function countRealCodesForSlug(
  targetGame: any,
  customCodes: any[] = [],
  d1Codes: any[] = [],
  bundledCodes: any[] = []
): number {
  if (!targetGame) return 0;
  const slug = String(targetGame.slug || targetGame.id || '').trim().toLowerCase();
  const rawId = String(targetGame.id || slug).trim().toLowerCase();
  const nameSlug = targetGame.name ? stripAccents(targetGame.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';

  const matchSlug = (item: any) => {
    if (!item) return false;
    const s = String(item.gameSlug || item.game_slug || item.slug || item.gameId || '').trim().toLowerCase();
    return s === slug || s === rawId || (nameSlug && s === nameSlug) || s === slug.replace(/-mobile$/i, '');
  };

  const seenCodes = new Set<string>();

  for (const c of customCodes) {
    if (matchSlug(c)) {
      const codeVal = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
      if (codeVal) seenCodes.add(codeVal);
    }
  }

  for (const c of d1Codes) {
    if (matchSlug(c)) {
      const codeVal = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
      if (codeVal) seenCodes.add(codeVal);
    }
  }

  for (const c of bundledCodes) {
    if (matchSlug(c)) {
      const codeVal = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
      if (codeVal) seenCodes.add(codeVal);
    }
  }

  return seenCodes.size;
}

/**
 * Kiểm tra xem icon vật lý cục bộ có thực sự tồn tại hay không (chống trỏ tới file 404)
 */
async function verifyLocalIconExists(path: string, requestUrl?: string, envAssets?: any): Promise<boolean> {
  if (!path || !path.startsWith('/')) return false;
  try {
    if (envAssets && typeof envAssets.fetch === 'function' && requestUrl) {
      const res = await envAssets.fetch(new URL(path, requestUrl), { method: 'HEAD' });
      return res.status === 200;
    }
    if (requestUrl) {
      const targetUrl = new URL(path, requestUrl).toString();
      const res = await fetch(targetUrl, { method: 'HEAD' });
      return res.status === 200;
    }
  } catch {}
  return false;
}

/**
 * Kiểm tra xem game có thực sự là Roblox đã được xác nhận hay không
 * (Tuyệt đối không tự suy diễn nếu nguồn không ghi rõ)
 */
function isConfirmedRobloxGame(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const fields = [
    item.platform,
    item.category,
    item.developer,
    item.publisher,
    item.source,
    item.sourceUrl,
    item.sourceType,
    item.packageId,
    item.packageName,
  ];
  return fields.some((f) => f && /roblox/i.test(String(f)));
}

/**
 * Thuật toán lọc và khớp tên game thông minh (Smart Game Filter & Matching)
 */
function findBestMatchingGame(
  inputNameOrSlug: string,
  activeGames: any[],
  pendingGames: any[]
): {
  game: any;
  source: 'active' | 'pending';
  matchConfidence: number;
  matchType: string;
  ambiguous?: boolean;
  candidates?: Array<{ id: string; slug: string; name: string; score: number; source: 'active' | 'pending' }>;
} | null {
  if (!inputNameOrSlug || !inputNameOrSlug.trim()) return null;

  const rawInput = inputNameOrSlug.trim();
  const rawInputLower = rawInput.toLowerCase();
  const normInput = normalizeVietnamese(rawInput);
  const cleanInput = cleanGameSearchTerm(rawInput);
  const normCleanInput = normalizeVietnamese(cleanInput);
  const cleanSlug = stripAccents(cleanInput).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const allCandidates: Array<{ game: any; source: 'active' | 'pending' }> = [
    ...activeGames.map((g) => ({ game: g, source: 'active' as const })),
    ...pendingGames.map((p) => ({ game: p, source: 'pending' as const })),
  ];

  // 1. TIER 1: Khớp chính xác Tuyệt Đối theo Slug hoặc ID
  for (const { game, source } of allCandidates) {
    const slug = (game.slug || '').toLowerCase();
    const id = (game.id || '').toLowerCase();
    if (
      slug === rawInputLower ||
      id === rawInputLower ||
      slug === cleanSlug ||
      (slug === 'doors-roblox' && (rawInputLower === 'doors' || cleanSlug === 'doors'))
    ) {
      return { game, source, matchConfidence: 1.0, matchType: 'exact_slug' };
    }
  }

  // 2. TIER 2: Khớp chính xác 100% theo Tên chuẩn hóa (Normalized Name)
  for (const { game, source } of allCandidates) {
    const gName = (game.name || '').trim();
    const gNorm = normalizeVietnamese(gName);
    const gClean = cleanGameSearchTerm(gName);
    const gNormClean = normalizeVietnamese(gClean);

    if (gNorm === normInput || gNormClean === normCleanInput || gNorm === normCleanInput || gNormClean === normInput) {
      return { game, source, matchConfidence: 1.0, matchType: 'exact_name' };
    }
  }

  // 3. TIER 3: Khớp theo Tên Viết Tắt Game (Gaming Acronym Mapping: lq, ff, gi, hsr, vltk...)
  const compactInput = normInput.replace(/\s+/g, '');
  const expansions = GAME_ACRONYM_MAP[compactInput];
  if (expansions && expansions.length > 0) {
    for (const exp of expansions) {
      const expNorm = normalizeVietnamese(exp);
      for (const { game, source } of allCandidates) {
        const gNorm = normalizeVietnamese(game.name || '');
        if (gNorm.includes(expNorm)) {
          return { game, source, matchConfidence: 0.95, matchType: 'acronym_match' };
        }
      }
    }
  }

  // 4. TIER 4: Khớp chuỗi con và độ tương đồng từ khóa (Token Overlap >= 70% & Numeric Strict Match)
  const extractDigits = (s: string): string[] => {
    return (s.match(/\b\d+\b/g) || []);
  };
  const inputDigits = extractDigits(normCleanInput);

  // Giữ lại số thứ tự (ví dụ 1, 2, 3...) để phân biệt phiên bản game (Kiếm Hiệp Tình 1 vs 2)
  const inputWords = normCleanInput.split(/\s+/).filter((w) => w.length >= 2 || /^\d+$/.test(w));

  const scoredCandidates: Array<{
    game: any;
    source: 'active' | 'pending';
    score: number;
    matchType: string;
  }> = [];

  if (inputWords.length > 0) {
    for (const { game, source } of allCandidates) {
      const gName = game.name || '';
      const gNorm = normalizeVietnamese(cleanGameSearchTerm(gName));
      const gWords = gNorm.split(/\s+/).filter((w) => w.length >= 2 || /^\d+$/.test(w));
      if (gWords.length === 0) continue;

      const gDigits = extractDigits(gNorm);

      // NUMERIC CONSISTENCY CHECK:
      // Chống nhầm lẫn số thứ tự game (Kiếm Hiệp Tình 1 vs 2, Đấu La 1 vs 2):
      // Nếu một trong hai bên có số thứ tự, các số PHẢI trùng khớp hoàn toàn!
      if (inputDigits.length > 0 || gDigits.length > 0) {
        const inputDigitsSorted = [...inputDigits].sort().join(',');
        const gDigitsSorted = [...gDigits].sort().join(',');
        if (inputDigitsSorted !== gDigitsSorted) {
          // Bất đồng chữ số: bỏ qua để tránh nhận nhầm phiên bản!
          continue;
        }
      }

      const gWordSet = new Set(gWords);
      const matchedWords = inputWords.filter((w) =>
        gWordSet.has(w) ||
        gWords.some((gw) => (gw.length >= 4 && w.length >= 4) && (gw.startsWith(w) || w.startsWith(gw)))
      );
      const overlapRatio = matchedWords.length / Math.max(inputWords.length, 1);

      // Nếu chứa toàn bộ tên hoặc tỷ lệ từ khóa >= 70% (chỉ chấp nhận substring nếu độ dài >= 4 để tránh chuỗi 2 ký tự như "au" khớp bừa)
      const isSub = (gNorm.length >= 4 && normCleanInput.includes(gNorm)) ||
                    (normCleanInput.length >= 4 && gNorm.includes(normCleanInput));
      const confidence = isSub ? 0.9 : overlapRatio;

      if (confidence >= 0.7) {
        scoredCandidates.push({
          game,
          source,
          score: Number(confidence.toFixed(2)),
          matchType: isSub ? 'substring_match' : 'token_overlap',
        });
      }
    }
  }

  if (scoredCandidates.length === 0) return null;

  // Sắp xếp điểm tương đồng giảm dần
  scoredCandidates.sort((a, b) => b.score - a.score);

  const top = scoredCandidates[0];

  // Nếu có nhiều game cùng khớp điểm rất cao (ví dụ >= 0.8) hoặc cách biệt dưới 0.06:
  // Báo ambiguous: true kèm danh sách candidates để bot/người dùng lựa chọn, KHÔNG ĐƯỢC đoán bừa!
  const ambiguousCandidates = scoredCandidates.filter((c) => c.score >= 0.8 && (top.score - c.score <= 0.06));
  if (ambiguousCandidates.length > 1) {
    return {
      game: null,
      source: top.source,
      matchConfidence: top.score,
      matchType: 'ambiguous_match',
      ambiguous: true,
      candidates: ambiguousCandidates.map((c) => ({
        id: c.game.id || c.game.slug,
        slug: c.game.slug,
        name: c.game.name,
        score: c.score,
        source: c.source,
      })),
    };
  }

  return {
    game: top.game,
    source: top.source,
    matchConfidence: top.score,
    matchType: top.matchType,
  };
}

interface ExtractedCodeItem {
  code: string;
  rewards: string;
  expiresAt: string | null;
  isExpired: boolean;
  rawStatus?: string;
  extractionMethod?: string;
  crossCheckCount?: number;
  crossCheckSources?: string[];
  scoreReasons?: string[];
  isConflicted?: boolean;
  conflictNote?: string;
  isStaleSource?: boolean;
}

/**
 * Trích xuất và làm sạch danh sách mã code từ input (chuẩn hóa Hạn Sử Dụng & Trạng Thái)
 */
function extractCodesFromPayload(item: any, droppedCodes?: Array<{ code: string; reason: string }>): Array<ExtractedCodeItem> {
  const result: Array<ExtractedCodeItem> = [];

  const defaultReward = item.rewards || item.description || 'Thưởng của NPH';
  const defaultRawExp =
    item.expiresAt ||
    item.expires_at ||
    item.expiry ||
    item.expire_date ||
    item.expireDate ||
    item.expirationDate ||
    item.expiration_date ||
    item.hsd ||
    item.han_su_dung;

  const parseItemCode = (rawCode: any, rawReward?: any, rawExp?: any, rawStatus?: any, extra: any = {}) => {
    // B2 & B3: Giữ nguyên case phân biệt hoa/thường, không ép toUpperCase!
    // Chấp nhận mọi ký tự đặc biệt của NPH (khoảng trắng, !, ?, ., -, _, #, @, :, /, v.v...)
    const val = String(rawCode || '').trim();
    if (!val || val.length < 1 || val.length > 80) {
      if (droppedCodes) {
        droppedCodes.push({ code: String(rawCode || ''), reason: 'Độ dài mã không hợp lệ (yêu cầu từ 1 đến 80 ký tự)' });
      }
      return;
    }

    // Chỉ chặn các ký tự điều khiển (control characters) gây lỗi hệ thống
    if (/[\x00-\x1F\x7F]/.test(val)) {
      if (droppedCodes) {
        droppedCodes.push({ code: val, reason: 'Chứa ký tự điều khiển không hợp lệ' });
      }
      return;
    }

    // Chặn mã rác kích thước ảnh WordPress (ví dụ: IN-...-1024X576)
    if (/^IN-.*-\d+X\d+$/i.test(val)) {
      if (droppedCodes) {
        droppedCodes.push({ code: val, reason: 'Mã rác kích thước ảnh WordPress không hợp lệ' });
      }
      return;
    }

    const expInput = rawExp !== undefined && rawExp !== null && rawExp !== '' ? rawExp : defaultRawExp;
    const parsedExp = parseExpirationDate(expInput);

    const explicitStatus = rawStatus !== undefined && rawStatus !== null && rawStatus !== '' ? String(rawStatus) : item.status;
    const explicitExpired = explicitStatus && (
      String(explicitStatus).toLowerCase() === 'expired' ||
      String(explicitStatus).toLowerCase() === 'hết hạn' ||
      String(explicitStatus).toLowerCase() === 'het han'
    );

    const isExpired = parsedExp.isExpired || Boolean(explicitExpired);
    const formattedExpiry = parsedExp.formatted || (isExpired ? 'Hết hạn' : null);

    result.push({
      code: val,
      rewards: decodeHtmlEntities(rawReward || defaultReward),
      expiresAt: formattedExpiry,
      isExpired,
      rawStatus: explicitStatus ? String(explicitStatus) : undefined,
      extractionMethod: extra.extractionMethod || item.extractionMethod || 'api',
      crossCheckCount: extra.crossCheckCount || item.crossCheckCount || 1,
      crossCheckSources: extra.crossCheckSources || item.crossCheckSources || [],
      scoreReasons: extra.scoreReasons || extra.reasons || item.scoreReasons || item.reasons || [],
      isConflicted: extra.isConflicted !== undefined ? Boolean(extra.isConflicted) : Boolean(item.isConflicted),
      conflictNote: extra.conflictNote || item.conflictNote || '',
      isStaleSource: extra.isStaleSource !== undefined ? Boolean(extra.isStaleSource) : Boolean(item.isStaleSource),
    });
  };

  // Trường hợp 1: Array of objects [{ code, rewards, expiresAt }]
  if (Array.isArray(item.codes) && item.codes.length > 0) {
    for (const c of item.codes) {
      if (typeof c === 'string') {
        parseItemCode(c);
      } else if (c && typeof c === 'object') {
        const val = c.code || c.codeValue || c.code_value || c.gift_code || c.giftcode || c.val;
        const rewards = c.rewards || c.description || c.reward || c.qua || c.items;
        const exp =
          c.expiresAt ||
          c.expires_at ||
          c.expiry ||
          c.expire_date ||
          c.expireDate ||
          c.expirationDate ||
          c.expiration_date ||
          c.hsd ||
          c.han_su_dung ||
          c.hanSuDung;
        const status = c.status || c.statusValue || c.trangThai || c.trang_thai;
        parseItemCode(val, rewards, exp, status, c);
      }
    }
  }

  // Trường hợp 2: Single code property
  if (item.code && typeof item.code === 'string') {
    parseItemCode(item.code, item.rewards, defaultRawExp, item.status, item);
  }

  // Trường hợp 3: Khối văn bản thô (rawText) chứa nhiều code cách nhau bằng dấu phẩy, dấu chấm phẩy hoặc xuống dòng
  // KHÔNG tách theo \s để bảo tồn các mã có khoảng trắng như "ACCESS GRANTED"
  if (typeof item.rawText === 'string' && item.rawText.trim()) {
    const rawTokens = item.rawText.split(/[\r\n,;]+/);
    for (const rawToken of rawTokens) {
      const t = rawToken.trim();
      if (!t) continue;
      if (t.length < 1 || t.length > 80 || /[\x00-\x1F\x7F]/.test(t)) {
        if (droppedCodes) {
          droppedCodes.push({ code: t, reason: 'Ký tự hoặc độ dài không hợp lệ' });
        }
        continue;
      }
      if (!result.some((r) => r.code.toLowerCase() === t.toLowerCase())) {
        parseItemCode(t, item.rewards, defaultRawExp, item.status, item);
      }
    }
  }

  return result;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * GET: Trả về tài liệu hướng dẫn sử dụng API & Health Check cho Bot / Muse
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const urlObj = new URL(request.url);

  const action = urlObj.searchParams.get('action');
  const allowedMarketingActions = [
    'get_marketing_config',
    'list_marketing_events',
    'get_metrics_snapshot',
    'get_virtual_analytics',
  ];

  // Nếu người dùng yêu cầu action marketing đọc qua GET
  if (action && allowedMarketingActions.includes(action)) {
    // 0. Nghiêm cấm query key
    const queryKey = urlObj.searchParams.get('api_key') || urlObj.searchParams.get('key');
    if (queryKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Xác thực qua URL (?api_key=...) bị nghiêm cấm vì nguy cơ rò rỉ log. Vui lòng cung cấp khóa Bearer qua Header "Authorization: Bearer <KEY>".',
          status: 401,
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const auth = await authenticateRequest(request, env);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: auth.error || 'Quyền truy cập bị từ chối.',
          status: auth.status || 401,
        }),
        { status: auth.status || 401, headers: CORS_HEADERS }
      );
    }

    if (auth.role === 'marketing_auditor') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateCheck = checkAuditorRateLimit(`${clientIp}_${token}`);
      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Tần suất yêu cầu vượt quá giới hạn (Rate limit: tối đa 60 requests/phút). Vui lòng thử lại sau.',
            status: 429,
          }),
          { status: 429, headers: CORS_HEADERS }
        );
      }
    }

    if (action === 'get_metrics_snapshot') {
      const snapshot = await getOrRefreshSnapshot(env, undefined, true);
      return new Response(
        JSON.stringify({
          success: true,
          action: 'get_metrics_snapshot',
          botName: auth.botName,
          snapshot,
        }, null, 2),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
      );
    }

    if (action === 'list_marketing_events') {
      const limit = Number(urlObj.searchParams.get('limit')) || 100;
      const events = await getRecentMarketingEvents(env, limit);
      return new Response(
        JSON.stringify({
          success: true,
          action: 'list_marketing_events',
          botName: auth.botName,
          total: events.length,
          limit,
          events,
        }, null, 2),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
      );
    }

    if (action === 'get_virtual_analytics') {
      const page = urlObj.searchParams.get('page');
      const limit = urlObj.searchParams.get('limit');
      const payload = await buildVirtualAnalyticsPayload(env, auth, page, limit);
      return new Response(
        JSON.stringify(payload, null, 2),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
      );
    }

    // Mặc định: get_marketing_config
    const config = await getLiveMarketingConfig(env);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'get_marketing_config',
        botName: auth.botName,
        rejectPeakReports: true,
        config: {
          ...config,
          rejectPeakReports: true,
        },
      }, null, 2),
      { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
    );
  }

  let activeGamesCount = 560;
  let pendingGamesCount = (canonicalBackupState.crawlerPendingGames || []).length;
  if (env.DB) {
    try {
      const g = await getSettingD1(env.DB, 'wcg_admin_games_v5');
      if (Array.isArray(g) && g.length > 0) activeGamesCount = g.length;
      const p = await getSettingD1(env.DB, 'wcg_crawler_pending_games_v1');
      if (Array.isArray(p) && p.length > 0) pendingGamesCount = p.length;
    } catch {}
  }

  const doc = {
    service: 'CodeGame Crawler & Bot Ingestion API (Muse Integration)',
    version: '1.0.0',
    status: 'ONLINE',
    endpoint: `${urlObj.origin}/api/crawler/ingest-codes`,
    authInstructions: {
      header: 'Authorization: Bearer <API_KEY> hoặc X-API-Key: <API_KEY>',
      queryParam: '?api_key=<API_KEY>',
    },
    capabilities: [
      'Tự động lọc và khớp tên game tiếng Việt thông minh (Fuzzy Vietnamese Accent Matching).',
      'Tự động kích hoạt & đăng game lên Web Khách nếu game đang ở Hàng Chờ Duyệt (Auto-Publish on Code arrival).',
      'Tự động lọc trùng lặp mã code (Deduplication) và nạp mã mới vào đúng game.',
      'Toàn quyền chỉnh sửa Cách Nhập Code (instructions / guide) và Link đổi quà (redeemUrl): hỗ trợ cập nhật độc lập hoặc kèm giftcode.',
      'Đưa game mới vào Hàng Chờ Duyệt: action "queue_game" (hỗ trợ kèm giftcode, tự động tạo slug, chống trùng lặp).',
      'Quản lý hàng chờ game chưa đăng: action "list_pending_games" và action "publish_game".',
      'Quản lý hàng chờ mã giftcode: action "list_pending_codes", action "approve_codes" và action "reject_codes".',
      'Tự động chuẩn hóa Hạn Sử Dụng (expiresAt) đa định dạng: YYYY-MM-DD, DD/MM/YYYY, timestamp, hoặc "Hết hạn" / "Vĩnh viễn". Nếu bỏ trống hoặc null: hệ thống lưu NULL (Chưa rõ hạn), không bao giờ tự gán hạn giả.',
      'Tự động phân loại trạng thái: Khi mã hết hạn (hoặc ngày hết hạn < hiện tại), hệ thống tự động gán status: EXPIRED và chuyển sang mục Đã hết hạn của game.',
      'Cập nhật bộ đếm codes_count và tự động xóa cache biên CDN.',
    ],
    supportedActions: [
      { action: 'ingest_codes', description: 'Nạp mã giftcode mới vào game (mặc định nếu không chỉ định action)' },
      { action: 'update_code_metadata', description: 'Cập nhật trạng thái (active/expired), hạn sử dụng (expiresAt), phần thưởng (rewards) hoặc case hoa/thường của mã đang live' },
      { action: 'queue_game', description: 'Đưa một hoặc nhiều game mới vào Hàng Chờ Duyệt (hỗ trợ kèm mã giftcode và hướng dẫn nhập code)' },
      { action: 'update_instructions', description: 'Cập nhật hướng dẫn nhập code và link redeem của game' },
      { action: 'list_pending_games', description: 'Lấy toàn bộ danh sách game chưa đăng lên web khách (hỗ trợ limit, offset)' },
      { action: 'publish_game', description: 'Chuyển một game từ hàng chờ sang đã đăng công khai theo slug hoặc id (idempotent)' },
      { action: 'delete_game', description: 'Xóa vĩnh viễn game và mã khỏi D1 tables và Live Catalog theo slug hoặc id' },
      { action: 'list_pending_codes', description: 'Lấy toàn bộ mã giftcode đang chờ duyệt (hỗ trợ limit, offset)' },
      { action: 'approve_codes', description: 'Duyệt mảng mã chờ duyệt (ids: string[]) và kích hoạt lên web khách' },
      { action: 'reject_codes', description: 'Từ chối và loại bỏ mảng mã khỏi hàng chờ duyệt (ids: string[])' },
      { action: 'cleanup_test_codes', description: 'Dọn dẹp sạch sẽ mã test theo Rule 7 (Zero Test Artifacts)' },
      { action: 'update_pending_game', description: 'Cập nhật metadata game trong Hàng Chờ Duyệt (chống giá trị bịa đặt)' },
      { action: 'delete_pending_game', description: 'Xóa game và mã khỏi Hàng Chờ Duyệt theo slug hoặc id' },
      { action: 'migrate_remove_fake_expiry_dates', description: 'Di dời dữ liệu cũ: chuyển toàn bộ mã có hạn giả 2026-12-31 sang NULL' },
      { action: 'get_marketing_config', description: 'Đọc cấu hình live hệ thống Marketing & FOMO (Chỉ đọc, yêu cầu Bearer token)' },
      { action: 'list_marketing_events', description: 'Đọc nhật ký tối đa 100 sự kiện thông báo marketing gần đây (kèm cờ is_simulated, yêu cầu Bearer token)' },
      { action: 'get_virtual_analytics', description: 'Đọc phân tích hai lớp FOMO: quota D1, số liệu 3 cột sản phẩm/giveaway, sổ ảo phân trang và cờ rejectPeakReports (Chỉ đọc, yêu cầu Bearer token)' },
      { action: 'get_metrics_snapshot', description: 'Đọc snapshot tổng quan số lượng game và mã giftcode được cache tại Edge (Chỉ đọc, yêu cầu Bearer token)' },
    ],
    sampleCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Nhân vật đạt Cấp 51 mở Sảnh Phúc Lợi.\\nBước 2: Chọn Đổi Mã Quà Tặng.\\nBước 3: Nhập mã và nhận quà qua Hộp Thư.",
    "codes": ["TALAHACNGOKHONG", "VIP666", "VIP888"],
    "rewards": "Quà tặng tân thủ độc quyền",
    "expiresAt": null,
    "source": "Muse Crawler Bot"
  }'`,
    sampleQueueGameCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{
    "action": "queue_game",
    "name": "Dig and Clean",
    "category": "Roblox",
    "platform": "Roblox / PC, Mobile",
    "codes": [
      {"code": "UPDATE4", "rewards": "5 Levels"},
      {"code": "SECRET10", "rewards": "10x Luck trong 10 phút"}
    ]
  }'`,
    sampleUpdateInstructionsCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{
    "action": "update_instructions",
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Mở game > Đạt cấp 51 > Vào Sảnh Phúc Lợi.\\nBước 2: Chọn mục Mã Quà Tặng.\\nBước 3: Dán mã và nhấn Xác nhận.",
    "redeemUrl": "https://nap.vplay.vn"
  }'`,
    sampleListPendingGamesCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"action": "list_pending_games", "limit": 50, "offset": 0}'`,
    samplePublishGameCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"action": "publish_game", "slug": "dau-nho-noi-gian"}'`,
    sampleListPendingCodesCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"action": "list_pending_codes"}'`,
    sampleApproveCodesCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"action": "approve_codes", "ids": ["pending_code_id_1", "pending_code_id_2"]}'`,
    sampleRejectCodesCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"action": "reject_codes", "ids": ["pending_code_id_1"]}'`,
    sampleGetMarketingConfigCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>" \\
  -d '{"action": "get_marketing_config"}'`,
    sampleGetVirtualAnalyticsCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>" \\
  -d '{"action": "get_virtual_analytics", "page": 1, "limit": 15}'`,
    sampleListMarketingEventsCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>" \\
  -d '{"action": "list_marketing_events", "limit": 100}'`,
    samplePython: `import requests

url = "${urlObj.origin}/api/crawler/ingest-codes"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <API_KEY>"
}
payload = {
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Mở game > Đạt Cấp 51 > Sảnh Phúc Lợi\\nBước 2: Đổi Quà Tặng\\nBước 3: Nhận thư",
    "codes": [
        {"code": "NGOKHONGVIP", "rewards": "100 Kim Cương + 5 Vé Quay"},
        {"code": "VIP666", "rewards": "Rương trang bị hoàng kim"}
    ],
    "source": "Muse Python Crawler"
}
response = requests.post(url, headers=headers, json=payload)
print(response.json())`,
    systemMetrics: {
      totalActivePublishedGames: activeGamesCount,
      totalPendingModerationGames: pendingGamesCount,
    },
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' },
  });
};

/**
 * POST: Thực thi nhận code, lọc tên game và thêm code vào đúng game
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Xác thực API Key
  const auth = await authenticateRequest(request, env);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({
        success: false,
        error: auth.error || 'Truy cập bị từ chối.',
        hint: 'Cung cấp API Key qua Header "Authorization: Bearer <KEY>" hoặc "X-API-Key: <KEY>"',
      }),
      { status: auth.status || 401, headers: CORS_HEADERS }
    );
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ success: false, error: 'Database D1 chưa được cấu hình.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'Dữ liệu JSON không hợp lệ: ' + err?.message }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const action = String(body?.action || 'ingest_codes').trim();

  // Action info: hỗ trợ kiểm tra trạng thái nhanh qua POST
  if (action === 'info') {
    return new Response(
      JSON.stringify({
        success: true,
        service: 'CodeGame Crawler & Bot Ingestion API (Muse Integration)',
        version: '1.0.0',
        status: 'ONLINE',
        authorized: true,
        botName: auth.botName,
        totalPendingGames: (canonicalBackupState.crawlerPendingGames || []).length,
        totalPendingCodes: (canonicalBackupState.crawlerPendingCodes || []).length,
        supportedActions: [
          'info',
          'ingest_codes',
          'queue_game',
          'update_instructions',
          'list_pending_games',
          'publish_game',
          'list_pending_codes',
          'approve_codes',
          'reject_codes',
          'get_marketing_config',
          'list_marketing_events',
          'get_virtual_analytics',
          'get_metrics_snapshot'
        ],
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  // 2. Phân quyền nghiêm ngặt: Nếu là marketing_auditor, CHỈ được phép đọc 4 action kiểm toán
  const allowedAuditActions = [
    'get_marketing_config',
    'list_marketing_events',
    'get_metrics_snapshot',
    'get_virtual_analytics',
  ];

  const writeActions = [
    'update_marketing_config', 'save_marketing_config', 'test_trigger',
    'ingest_codes', 'queue_game', 'publish_game', 'delete_game', 'delete_game_d1', 'approve_codes', 'reject_codes',
    'update_instructions', 'cleanup_test_codes', 'delete_pending_game', 'update_code_metadata', 'update_code_status'
  ];

  if (auth.role === 'marketing_auditor') {
    if (writeActions.includes(action)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Quyền truy cập bị từ chối: Thao tác ghi "${action}" bị nghiêm cấm đối với khóa kiểm toán (Read-only). Cấu hình và dữ liệu chỉ được chỉnh sửa trên Admin UI.`,
          status: 403,
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (!allowedAuditActions.includes(action)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Quyền truy cập bị từ chối: Khóa kiểm toán chỉ có quyền đọc (Read-only) cho các action: ${allowedAuditActions.join(', ')}. Action "${action}" không được phép thực thi.`,
          status: 403,
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Rate limiting: 60 req/min
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateCheck = checkAuditorRateLimit(`${clientIp}_${token}`);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tần suất yêu cầu vượt quá giới hạn (Rate limit: tối đa 60 requests/phút). Vui lòng thử lại sau.',
          status: 429,
        }),
        { status: 429, headers: CORS_HEADERS }
      );
    }
  }

  // 3. Xử lý các action marketing read-only (áp dụng cho cả marketing_auditor, crawler_writer, và admin)
  if (action === 'get_metrics_snapshot') {
    const snapshot = await getOrRefreshSnapshot(env, undefined, true);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'get_metrics_snapshot',
        botName: auth.botName,
        snapshot,
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  if (action === 'get_marketing_config') {
    const config = await getLiveMarketingConfig(env);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'get_marketing_config',
        botName: auth.botName,
        rejectPeakReports: true,
        config: {
          ...config,
          rejectPeakReports: true,
        },
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  if (action === 'list_marketing_events') {
    const limit = Number(body?.limit) || 100;
    const events = await getRecentMarketingEvents(env, limit);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'list_marketing_events',
        botName: auth.botName,
        total: events.length,
        limit,
        events,
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  if (action === 'get_virtual_analytics') {
    const payload = await buildVirtualAnalyticsPayload(env, auth, body?.page, body?.limit);
    return new Response(
      JSON.stringify(payload, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  try {
    // 3. Tối ưu hóa tải cài đặt từ D1 theo từng Action nhằm triệt tiêu lãng phí CPU & I/O (Error 1102)
    const requiredKeys = ['wcg_admin_games_v5'];
    if (body?.action === 'cleanup_test_codes') {
      requiredKeys.push('wcg_admin_custom_free_codes_v1', 'wcg_crawler_pending_games_v1', 'wcg_crawler_pending_codes_v1');
    } else if (body?.action === 'get_game' || body?.action === 'list_games' || body?.action === 'update_game' || body?.action === 'unpublish_game') {
      requiredKeys.push('wcg_crawler_pending_games_v1', 'wcg_game_audit_logs_v1');
    } else if (body?.action === 'remove_from_deleted_giveaways') {
      requiredKeys.push('wcg_deleted_giveaways', 'wcg_game_audit_logs_v1');
    } else if (body?.action === 'list_pending_games' || body?.action === 'update_pending_game' || body?.action === 'fix_pending_game' || body?.action === 'delete_pending_game' || body?.action === 'remove_pending_game') {
      requiredKeys.push('wcg_crawler_pending_games_v1', 'wcg_crawler_pending_codes_v1');
    } else if (body?.action === 'list_pending_codes') {
      requiredKeys.push('wcg_crawler_pending_codes_v1', 'wcg_admin_submissions_v4');
    } else if (body?.action === 'approve_codes' || body?.action === 'reject_codes') {
      requiredKeys.push('wcg_crawler_pending_codes_v1', 'wcg_admin_submissions_v4', 'wcg_admin_custom_free_codes_v1');
    } else if (body?.action === 'publish_game') {
      requiredKeys.push('wcg_crawler_pending_games_v1', 'wcg_admin_free_codes_v5', 'wcg_admin_custom_free_codes_v1');
    } else if (body?.action === 'queue_game' || body?.action === 'queue_games' || body?.action === 'add_pending_game') {
      requiredKeys.push('wcg_crawler_pending_games_v1', 'wcg_admin_custom_free_codes_v1', 'wcg_crawler_pending_codes_v1');
    } else {
      // Luồng nạp mã giftcode chính
      requiredKeys.push(
        'wcg_crawler_pending_games_v1',
        'wcg_admin_free_codes_v5',
        'wcg_admin_custom_free_codes_v1',
        'wcg_crawler_api_logs_v1',
        'wcg_crawler_pending_codes_v1',
        'wcg_admin_submissions_v4'
      );
    }

    const settings = await getMultipleSettingsD1(env.DB, requiredKeys);

    // =========================================================================
    // ACTION 1: Lấy toàn bộ danh sách game chưa đăng lên web khách
    // =========================================================================
    if (body && body.action === 'list_pending_games') {
      const pendingGamesRaw = (Array.isArray(settings['wcg_crawler_pending_games_v1']) && settings['wcg_crawler_pending_games_v1'].length > 0)
        ? settings['wcg_crawler_pending_games_v1']
        : (canonicalBackupState.crawlerPendingGames || []);

      const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5'])
        ? settings['wcg_admin_games_v5']
        : [];
      const unpublishedInCatalog = activeGamesRaw.filter((g: any) => g && (g.is_active === false || g.status === 'PENDING'));

      const seenSlugs = new Set<string>();
      const combinedList: any[] = [];
      let nonGamesFilteredCount = 0;
      const liveIndex = buildLiveGameIndex(activeGamesRaw);

      const addGame = (g: any) => {
        if (!g) return;
        if (isNonGameApplication(g)) {
          nonGamesFilteredCount++;
          return;
        }
        const slug = String(g.slug || g.id || '').trim().toLowerCase();
        if (!slug || seenSlugs.has(slug)) return;
        seenSlugs.add(slug);

        const duplicateOf = detectDuplicateOfIndexed(g, liveIndex);
        const isUnknownPublisher = !g.developer && !g.publisher;
        const publisherVal = isUnknownPublisher ? null : String(g.developer || g.publisher);
        const platformVal = g.platform ? String(g.platform) : null;
        const categoryVal = g.category ? String(g.category) : null;
        const hasIconVal = Boolean(g.has_icon || (g.iconUrl && String(g.iconUrl).trim().length > 0) || (g.localIconPath && String(g.localIconPath).trim().length > 0));
        const missingIconVal = Boolean(g.missing_icon || !hasIconVal);

        combinedList.push({
          id: String(g.id || slug),
          name: String(g.name || slug),
          slug: String(g.slug || slug),
          publisher: publisherVal,
          platform: platformVal,
          category: categoryVal,
          packageName: g.packageId || g.packageName || g.android_package_name || null,
          source: g.source || g.sourceType || (g.sourceUrl?.includes('codemoi') ? 'Code Mới' : 'Google Play Store VN'),
          status: g.status || 'PENDING',
          codes_count: Number(g.activeCodesCount || g.codes_count || 0),
          duplicate_of: duplicateOf || null,
          releaseDate: g.releaseDate || g.release_date || null,
          releaseInfo: g.releaseInfo || g.release_info || null,
          description: g.description || null,
          instructions: g.instructions || null,
          iconUrl: g.iconUrl || null,
          localIconPath: g.localIconPath || null,
          missing_icon: missingIconVal,
          has_icon: hasIconVal,
          created_at: g.crawledAt || g.created_at || g.releaseDate || new Date().toISOString(),
        });
      };

      const tombstones = env.DB ? await getActiveTombstonesMap(env.DB) : new Map();
      const nonTombstonedPending = filterOutTombstones(pendingGamesRaw, 'pending_game', tombstones, (g: any) => ({ id: g?.id, slug: g?.slug }));
      const nonTombstonedCatalog = filterOutTombstones(unpublishedInCatalog, 'game', tombstones, (g: any) => ({ id: g?.id, slug: g?.slug }));

      nonTombstonedPending.forEach(addGame);
      nonTombstonedCatalog.forEach(addGame);

      const duplicatesCount = combinedList.filter((g) => g.duplicate_of !== null).length;

      let filteredList = combinedList;
      if (body.exclude_duplicates === true) {
        filteredList = combinedList.filter((g) => g.duplicate_of === null);
      }

      const total = filteredList.length;
      const limit = body.limit !== undefined ? Math.max(1, parseInt(body.limit, 10)) : total;
      const offset = body.offset !== undefined ? Math.max(0, parseInt(body.offset, 10)) : 0;
      const pagedGames = filteredList.slice(offset, offset + limit);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'list_pending_games',
          total,
          count: pagedGames.length,
          duplicates_count: duplicatesCount,
          non_games_filtered: nonGamesFilteredCount,
          limit,
          offset,
          games: pagedGames,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION 2: Chuyển một game từ chờ duyệt sang đã đăng (published) trên web khách (idempotent)
    // =========================================================================
    if (body && body.action === 'publish_game') {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      if (!targetSlug) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu tham số slug hoặc id của game cần publish.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Re-fetch FRESH settings from D1 để chống triệt để Race Condition / Overwrite
      const freshSettings = await getMultipleSettingsD1(env.DB, [
        'wcg_admin_games_v5',
        'wcg_crawler_pending_games_v1',
        'wcg_admin_custom_free_codes_v1',
        'wcg_admin_free_codes_v5',
      ]);

      const activeGames: any[] = Array.isArray(freshSettings['wcg_admin_games_v5'])
        ? [...freshSettings['wcg_admin_games_v5']]
        : [...(fallbackGamesData as any[])];

      const pendingGames: any[] = Array.isArray(freshSettings['wcg_crawler_pending_games_v1'])
        ? [...freshSettings['wcg_crawler_pending_games_v1']]
        : [];

      const customCodes: any[] = Array.isArray(freshSettings['wcg_admin_custom_free_codes_v1'])
        ? [...freshSettings['wcg_admin_custom_free_codes_v1']]
        : [];

      const d1Codes: any[] = Array.isArray(freshSettings['wcg_admin_free_codes_v5'])
        ? [...freshSettings['wcg_admin_free_codes_v5']]
        : [];

      const bundledCodes: any[] = Array.isArray(fallbackCodesData)
        ? (fallbackCodesData as any[])
        : [];

      // Kiểm tra xem game đã được publish trong activeGames chưa (Idempotent)
      const existingPublishedIdx = activeGames.findIndex(
        (g: any) => g && (String(g.slug).toLowerCase() === targetSlug || String(g.id).toLowerCase() === targetSlug)
      );

      if (existingPublishedIdx !== -1 && activeGames[existingPublishedIdx].is_active !== false && activeGames[existingPublishedIdx].status !== 'PENDING') {
        const publishedGame = activeGames[existingPublishedIdx];
        const realCount = countRealCodesForSlug(publishedGame, customCodes, d1Codes, bundledCodes);

        // Cập nhật lại codes_count nếu trước đó bị snapshot cũ lưu sai thành 0
        if (publishedGame.codes_count !== realCount || publishedGame.free_codes_count !== realCount) {
          activeGames[existingPublishedIdx] = {
            ...publishedGame,
            codes_count: realCount,
            free_codes_count: realCount,
            updated_at: new Date().toISOString(),
          };
          await setSettingD1(env.DB, 'wcg_admin_games_v5', activeGames);
          invalidateGamesCatalogCache();
          await invalidateCatalogEdgeCache(context as any, request, env, [
            `https://codegame.shop/api/games?slug=${targetSlug}`,
            `https://codegame.shop/api/games?id=${targetSlug}`,
            new URL(`/api/games?slug=${targetSlug}`, request.url).toString(),
            `https://codegame.shop/game/${targetSlug}`,
          ]).catch(() => {});
        }

        return new Response(
          JSON.stringify({
            success: true,
            slug: activeGames[existingPublishedIdx].slug || targetSlug,
            status: 'published',
            codes_count: realCount,
            message: 'Game đã được đăng trước đó (idempotent)',
            game: activeGames[existingPublishedIdx],
          }),
          { headers: CORS_HEADERS }
        );
      }

      // Tìm trong pending games
      const pendingIdx = pendingGames.findIndex(
        (g: any) => g && (String(g.slug).toLowerCase() === targetSlug || String(g.id).toLowerCase() === targetSlug)
      );

      let gameToPublish: any = null;
      if (pendingIdx !== -1) {
        gameToPublish = pendingGames[pendingIdx];
      } else if (existingPublishedIdx !== -1) {
        gameToPublish = activeGames[existingPublishedIdx];
      }

      if (!gameToPublish) {
        return new Response(
          JSON.stringify({ success: false, error: `Không tìm thấy game với slug hoặc id "${targetSlug}" trong hàng chờ duyệt.` }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      // Chặn TUYỆT ĐỐI không bao giờ cho phép xuất bản game test/audit lên live catalog
      const isTestSlug = targetSlug.startsWith('test-') ||
                         targetSlug.startsWith('test_') ||
                         String(gameToPublish.name || '').toLowerCase().startsWith('test ') ||
                         String(gameToPublish.developer || gameToPublish.publisher || '').toLowerCase().includes('test studio');
      if (isTestSlug) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `CHẶN AN TOÀN: Game test "${gameToPublish.name || targetSlug}" không bao giờ được phép xuất bản lên live catalog!`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Chặn đăng app tiện ích/xác thực/cổng không phải game độc lập
      if (isNonGameApplication(gameToPublish) && !body.force) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Không thể đăng ứng dụng "${gameToPublish.name || targetSlug}" vì đây là tiện ích/xác thực/cổng không phải game độc lập. Dùng { force: true } nếu vẫn muốn đăng.`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Chặn đăng trùng lặp với game live đã có
      const liveIndex = buildLiveGameIndex(activeGames);
      const duplicateOf = detectDuplicateOfIndexed(gameToPublish, liveIndex);
      if (duplicateOf && duplicateOf !== targetSlug && !body.force) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Game này bị trùng với game đang hoạt động "${duplicateOf}". Vui lòng gộp hoặc sử dụng { force: true } nếu muốn đăng riêng.`,
            duplicate_of: duplicateOf,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Loại bỏ khỏi pending games
      if (pendingIdx !== -1) {
        pendingGames.splice(pendingIdx, 1);
      }

      const finalSlug = String(gameToPublish.slug || gameToPublish.id || targetSlug).trim().toLowerCase();
      const finalName = String(gameToPublish.name || finalSlug).trim();

      // B5: Giữ nguyên metadata thật nếu đã có, tuyệt đối không ghi đè bằng placeholder/rỗng
      const rawDev = gameToPublish.publisher || gameToPublish.developer || body.publisher || body.developer || '';
      const finalDeveloper = String(rawDev).trim();

      const rawCat = gameToPublish.category || body.category || '';
      const finalCategory = String(rawCat).trim();

      const rawPlat = gameToPublish.platform || body.platform || '';
      const finalPlatform = String(rawPlat).trim();

      const isCodeMoi = gameToPublish.sourceType === 'codemoi' || (gameToPublish.sourceUrl && gameToPublish.sourceUrl.includes('codemoi.net'));
      let targetIcon = '';
      if (gameToPublish.iconUrl && gameToPublish.iconUrl.startsWith('http') && !gameToPublish.iconUrl.includes('codemoi.net')) {
        targetIcon = gameToPublish.iconUrl;
      } else if (gameToPublish.localIconPath && gameToPublish.localIconPath.startsWith('/') && !gameToPublish.missing_icon) {
        targetIcon = gameToPublish.localIconPath;
      }

      // Đồng bộ toàn bộ mã của game này từ customCodes và d1Codes vào bảng codes trên D1 (B3: Giữ nguyên case phân biệt hoa/thường)
      const codesToSync = [
        ...customCodes.filter((c: any) => c && (String(c.gameSlug || c.slug || c.gameId || '').toLowerCase() === finalSlug)),
        ...d1Codes.filter((c: any) => c && (String(c.gameSlug || c.slug || c.gameId || '').toLowerCase() === finalSlug)),
      ];

      for (const c of codesToSync) {
        const cVal = String(c.code || c.codeValue || c.code_value || c.gift_code || '').trim();
        if (!cVal) continue;
        const cId = c.id || `code_${finalSlug}_${encodeURIComponent(cVal).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const isExp = isCodeExpired(c);
        const expVal = c.expiresAt || c.expires_at || c.expiry || null;
        await env.DB.prepare(`
          INSERT OR REPLACE INTO codes (id, game_slug, code, rewards, status, expires_at, source, added_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          cId,
          finalSlug,
          cVal,
          c.rewards || c.description || null,
          isExp ? 'expired' : 'active',
          expVal,
          c.source || 'Publish Game Sync'
        ).run().catch(() => {});
      }

      // Tính số mã code THỰC TẾ từ toàn bộ kho code
      const tempGameForCounting = { id: finalSlug, slug: finalSlug, name: finalName };
      const realCodesCount = countRealCodesForSlug(tempGameForCounting, customCodes, d1Codes, bundledCodes);

      const publishedRecord = {
        id: finalSlug,
        slug: finalSlug,
        name: finalName,
        publisher: finalDeveloper,
        category: finalCategory,
        rating: Number(gameToPublish.rating || 4.8),
        icon_url: targetIcon,
        cover_image_url: targetIcon,
        banner_url: gameToPublish.banner_url || '',
        description: gameToPublish.description || '',
        short_description: `${finalName} - Game Mobile Mới`,
        instructions: gameToPublish.instructions || '',
        platform: finalPlatform,
        release_date: gameToPublish.releaseDate || new Date().toISOString().split('T')[0],
        download_android: gameToPublish.playStoreUrl || (gameToPublish.packageId ? `https://play.google.com/store/apps/details?id=${gameToPublish.packageId}` : ''),
        google_play_url: gameToPublish.playStoreUrl || '',
        app_store_url: gameToPublish.app_store_url || '',
        android_package_name: gameToPublish.packageId || gameToPublish.packageName || '',
        redeem_url: gameToPublish.redeem_url || '',
        is_featured: false,
        is_hot: false,
        is_new: true,
        is_active: true,
        status: 'ACTIVE',
        codes_count: realCodesCount,
        free_codes_count: realCodesCount,
        source: isCodeMoi ? 'Code Mới (codemoi.net)' : 'Google Play Store VN',
        created_at: gameToPublish.crawledAt || gameToPublish.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingPublishedIdx !== -1) {
        activeGames[existingPublishedIdx] = { ...activeGames[existingPublishedIdx], ...publishedRecord };
      } else {
        activeGames.unshift(publishedRecord);
      }

      await setSettingD1(env.DB, 'wcg_admin_games_v5', activeGames);
      await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', pendingGames);

      // Cập nhật trực tiếp bảng games trên D1 (P1 Precomputed Columns & Instant SQL)
      try {
        await env.DB.prepare(`
          INSERT INTO games (
            id, name, slug, publisher, category, rating, icon_url, banner_url,
            description, instructions, platform, release_date, download_android,
            google_play_url, app_store_url, android_package_name, redeem_url,
            is_featured, is_hot, is_new, is_active, status, active_codes_count, total_codes_count, last_code_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(slug) DO UPDATE SET
            name = excluded.name,
            publisher = CASE WHEN excluded.publisher IS NOT NULL AND excluded.publisher != '' THEN excluded.publisher ELSE games.publisher END,
            category = CASE WHEN excluded.category IS NOT NULL AND excluded.category != '' THEN excluded.category ELSE games.category END,
            rating = excluded.rating,
            icon_url = CASE WHEN excluded.icon_url IS NOT NULL AND excluded.icon_url != '' THEN excluded.icon_url ELSE games.icon_url END,
            banner_url = CASE WHEN excluded.banner_url IS NOT NULL AND excluded.banner_url != '' THEN excluded.banner_url ELSE games.banner_url END,
            description = CASE WHEN excluded.description IS NOT NULL AND excluded.description != '' THEN excluded.description ELSE games.description END,
            instructions = CASE WHEN excluded.instructions IS NOT NULL AND excluded.instructions != '' THEN excluded.instructions ELSE games.instructions END,
            redeem_url = CASE WHEN excluded.redeem_url IS NOT NULL AND excluded.redeem_url != '' THEN excluded.redeem_url ELSE games.redeem_url END,
            download_android = CASE WHEN excluded.download_android IS NOT NULL AND excluded.download_android != '' THEN excluded.download_android ELSE games.download_android END,
            google_play_url = CASE WHEN excluded.google_play_url IS NOT NULL AND excluded.google_play_url != '' THEN excluded.google_play_url ELSE games.google_play_url END,
            app_store_url = CASE WHEN excluded.app_store_url IS NOT NULL AND excluded.app_store_url != '' THEN excluded.app_store_url ELSE games.app_store_url END,
            android_package_name = CASE WHEN excluded.android_package_name IS NOT NULL AND excluded.android_package_name != '' THEN excluded.android_package_name ELSE games.android_package_name END,
            is_active = 1,
            status = 'ACTIVE',
            active_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug AND (codes.status = 'active' OR codes.status = 'verified') AND (codes.expires_at IS NULL OR codes.expires_at = '' OR codes.expires_at >= date('now'))),
            total_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug),
            last_code_at = datetime('now'),
            updated_at = datetime('now');
        `).bind(
          finalSlug, finalName, finalSlug, finalDeveloper, publishedRecord.category, publishedRecord.rating,
          publishedRecord.icon_url, publishedRecord.banner_url, publishedRecord.description, publishedRecord.instructions,
          publishedRecord.platform, publishedRecord.release_date, publishedRecord.download_android,
          publishedRecord.google_play_url, publishedRecord.app_store_url, publishedRecord.android_package_name,
          publishedRecord.redeem_url, 0, 0, 1, 1, 'ACTIVE', realCodesCount, realCodesCount
        ).run().catch(() => {});
      } catch (d1Err) {
        console.warn('[PublishGame D1 Table Sync Warning]', d1Err);
      }

      invalidateGamesCatalogCache();
      const specificUrls = [
        `https://codegame.shop/api/games?slug=${finalSlug}`,
        `https://codegame.shop/api/games?id=${finalSlug}`,
        `https://web-code-game.pages.dev/api/games?slug=${finalSlug}`,
        `https://web-code-game.pages.dev/api/games?id=${finalSlug}`,
        new URL(`/api/games?slug=${finalSlug}`, request.url).toString(),
        new URL(`/api/games?id=${finalSlug}`, request.url).toString(),
        `https://codegame.shop/game/${finalSlug}`,
        `https://web-code-game.pages.dev/game/${finalSlug}`,
        new URL(`/game/${finalSlug}`, request.url).toString(),
        'https://codegame.shop/api/games',
        'https://web-code-game.pages.dev/api/games',
        new URL('/api/games', request.url).toString(),
      ];
      await invalidateCatalogEdgeCache(context as any, request, env, specificUrls).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          slug: finalSlug,
          status: 'published',
          codes_count: realCodesCount,
          message: `Đã đăng thành công game "${finalName}" lên web khách!`,
          game: publishedRecord,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: Đưa game mới vào Hàng Chờ Duyệt (queue_game / queue_games / add_pending_game)
    // =========================================================================
    if (body && (body.action === 'queue_game' || body.action === 'queue_games' || body.action === 'add_pending_game')) {
      let rawGamesToQueue: any[] = [];
      if (Array.isArray(body.games)) {
        rawGamesToQueue = body.games;
      } else if (Array.isArray(body.items)) {
        rawGamesToQueue = body.items;
      } else if (body.name || body.gameName || body.slug || body.gameSlug) {
        rawGamesToQueue = [body];
      }

      if (rawGamesToQueue.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Thiếu thông tin game cần đưa vào hàng chờ duyệt. Vui lòng cung cấp name/gameName hoặc mảng games: []',
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Re-fetch FRESH settings from D1 để chống Race Condition
      const freshSettings = await getMultipleSettingsD1(env.DB, [
        'wcg_crawler_pending_games_v1',
        'wcg_admin_games_v5',
        'wcg_admin_custom_free_codes_v1',
        'wcg_crawler_pending_codes_v1',
      ]);

      const pendingGames: any[] = Array.isArray(freshSettings['wcg_crawler_pending_games_v1'])
        ? [...freshSettings['wcg_crawler_pending_games_v1']]
        : [];

      const activeGames: any[] = Array.isArray(freshSettings['wcg_admin_games_v5'])
        ? [...freshSettings['wcg_admin_games_v5']]
        : [...(fallbackGamesData as any[])];

      const customCodes: any[] = Array.isArray(freshSettings['wcg_admin_custom_free_codes_v1'])
        ? [...freshSettings['wcg_admin_custom_free_codes_v1']]
        : [];

      const pendingCodes: any[] = Array.isArray(freshSettings['wcg_crawler_pending_codes_v1'])
        ? [...freshSettings['wcg_crawler_pending_codes_v1']]
        : [];

      const nowIso = new Date().toISOString();
      const results: any[] = [];
      let totalQueued = 0;
      let totalCodesAdded = 0;
      let stateModified = false;
      const codesToInsertInD1: any[] = [];

      for (const item of rawGamesToQueue) {
        if (!item || typeof item !== 'object') continue;

        const rawName = String(item.name || item.gameName || item.title || '').trim();
        if (!rawName) {
          results.push({ success: false, error: 'Thiếu tên game (name / gameName)' });
          continue;
        }

        let rawSlug = String(item.slug || item.gameSlug || item.id || '').trim().toLowerCase();
        if (!rawSlug) {
          rawSlug = stripAccents(cleanGameSearchTerm(rawName)).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
        if (!rawSlug) {
          rawSlug = `game-${Date.now()}`;
        }

        // Tombstone Guard: Tuyệt đối ngăn chặn hồi sinh game đã bị xóa mềm
        if (env.DB) {
          const isTombstonedPending = await isRecordTombstoned(env.DB, 'pending_game', rawSlug);
          const isTombstonedGame = await isRecordTombstoned(env.DB, 'game', rawSlug);
          if (isTombstonedPending || isTombstonedGame) {
            results.push({
              success: false,
              skipped_tombstone: true,
              error: `Game "${rawName}" (${rawSlug}) đã bị xóa bởi Quản trị viên (Tombstone active). Hệ thống từ chối tự động hồi sinh. Hãy dùng màn hình Lịch Sử để Khôi Phục tường minh nếu muốn sử dụng lại.`,
            });
            continue;
          }
        }

        const isRoblox = isConfirmedRobloxGame(item);

        const developer = item.developer ? String(item.developer).trim() : (item.publisher ? String(item.publisher).trim() : (item.nph ? String(item.nph).trim() : null));
        const publisher = item.publisher ? String(item.publisher).trim() : (item.developer ? String(item.developer).trim() : (item.nph ? String(item.nph).trim() : null));
        const category = item.category ? String(item.category).trim() : null;
        const platform = item.platform ? String(item.platform).trim() : null;
        const rating = Number(item.rating || 4.8);
        const installs = item.installs ? String(item.installs).trim() : null;
        const description = item.description ? String(item.description).trim() : '';
        let instructions = '';
        if (item.instructions !== undefined && item.instructions !== null) {
          instructions = String(item.instructions).trim();
        } else if (isRoblox) {
          instructions = `Bước 1: Mở Roblox và vào game ${rawName}.\nBước 2: Tìm biểu tượng Code / Twitter / Cài đặt.\nBước 3: Nhập chính xác mã giftcode và nhấn Đổi quà.`;
        } else {
          instructions = '';
        }
        const redeemUrl = String(item.redeemUrl || item.redeem_url || '').trim();
        const source = String(item.source || item.sourceType || auth.botName || 'Crawler / Manual Queue').trim();
        const sourceUrl = String(item.sourceUrl || item.source_url || '').trim();

        let iconUrl = '';
        let localIconPath = '';
        let missing_icon = true;
        let has_icon = false;

        const candidateIcon = String(item.iconUrl || item.icon_url || item.icon || '').trim();
        if (candidateIcon.startsWith('http://') || candidateIcon.startsWith('https://') || candidateIcon.startsWith('data:image')) {
          iconUrl = candidateIcon;
          localIconPath = '';
          has_icon = true;
          missing_icon = false;
        } else {
          const targetPath = (candidateIcon.startsWith('/') && candidateIcon.endsWith('.webp')) ? candidateIcon : `/game_icons/${rawSlug}.webp`;
          const exists = await verifyLocalIconExists(targetPath, request.url, (env as any).ASSETS);
          if (exists) {
            iconUrl = targetPath;
            localIconPath = targetPath;
            has_icon = true;
            missing_icon = false;
          } else {
            iconUrl = '';
            localIconPath = '';
            has_icon = false;
            missing_icon = true;
          }
        }

        // 1. Chuẩn hóa danh sách mã code nếu có
        const rawCodes = Array.isArray(item.codes) ? item.codes : (Array.isArray(body.codes) && rawGamesToQueue.length === 1 ? body.codes : []);
        const parsedCodes: Array<{ code: string; rewards: string | null; expiresAt: string | null; status: string }> = [];

        for (const c of rawCodes) {
          let codeStr = '';
          let rewardsStr: string | null = null;
          let expStr: string | null = null;
          let statusStr = 'ACTIVE';

          if (typeof c === 'string') {
            codeStr = c.trim().toUpperCase();
            rewardsStr = item.rewards ? String(item.rewards).trim() : null;
          } else if (c && typeof c === 'object') {
            codeStr = String(c.code || c.codeValue || '').trim().toUpperCase();
            rewardsStr = c.rewards || c.description || item.rewards || null;
            expStr = c.expiresAt || c.expires_at || null;
            if (c.status) statusStr = String(c.status).toUpperCase();
          }

          if (codeStr && codeStr.length >= 1 && !parsedCodes.some((p) => p.code === codeStr)) {
            parsedCodes.push({
              code: codeStr,
              rewards: rewardsStr,
              expiresAt: expStr,
              status: statusStr,
            });
          }
        }

        // 2. Kiểm tra xem game đã có trong activeGames (live) chưa
        const activeIdx = activeGames.findIndex((g: any) => g && (String(g.slug).toLowerCase() === rawSlug || String(g.id).toLowerCase() === rawSlug));

        // 3. Kiểm tra xem game đã có trong pendingGames chưa
        const pendingIdx = pendingGames.findIndex((p: any) => p && (String(p.slug).toLowerCase() === rawSlug || String(p.id).toLowerCase() === rawSlug));

        let gameStatus = 'PENDING';
        let codesAddedCount = 0;

        // Lưu / Cập nhật mã code cho game
        for (const c of parsedCodes) {
          const codeId = `code_${rawSlug}_${c.code}`;
          const existingCustomIdx = customCodes.findIndex(
            (ec) => ec && (ec.gameSlug === rawSlug || ec.slug === rawSlug || ec.gameId === rawSlug) && String(ec.code || ec.codeValue || '').toUpperCase() === c.code
          );

          if (existingCustomIdx === -1) {
            const newCodeRecord = {
              id: codeId,
              gameId: rawSlug,
              gameSlug: rawSlug,
              game_slug: rawSlug,
              slug: rawSlug,
              gameName: rawName,
              code: c.code,
              codeValue: c.code,
              code_value: c.code,
              gift_code: c.code,
              rewards: c.rewards,
              description: c.rewards,
              status: c.status,
              is_active: c.status !== 'EXPIRED',
              is_verified: true,
              isVerified: true,
              expires_at: c.expiresAt,
              expiresAt: c.expiresAt,
              expiry: c.expiresAt,
              sourceUrl: sourceUrl || `https://codegame.shop/game/${rawSlug}`,
              source: source || auth.botName || 'Queue Game API',
              copyCount: 100 + Math.floor(Math.random() * 200),
              createdAt: nowIso,
              created_at: nowIso,
              added_at: nowIso,
            };
            customCodes.unshift(newCodeRecord);
            codesToInsertInD1.push(newCodeRecord);
            codesAddedCount++;
            stateModified = true;
          } else {
            // Cập nhật quà nếu trước đó trống
            if (c.rewards && !customCodes[existingCustomIdx].rewards) {
              customCodes[existingCustomIdx].rewards = c.rewards;
              customCodes[existingCustomIdx].description = c.rewards;
              stateModified = true;
            }
          }

          // Đồng bộ vào wcg_crawler_pending_codes_v1 nếu chưa có
          if (!pendingCodes.some((pc) => pc && (pc.gameSlug === rawSlug || pc.gameId === rawSlug) && String(pc.code || pc.codeValue || '').toUpperCase() === c.code)) {
            pendingCodes.unshift({
              id: `pending_${rawSlug}_${c.code}`,
              gameId: rawSlug,
              gameSlug: rawSlug,
              gameName: rawName,
              code: c.code,
              rewards: c.rewards,
              source: source,
              status: 'PENDING',
              expiresAt: c.expiresAt,
              createdAt: nowIso,
            });
            stateModified = true;
          }
        }

        totalCodesAdded += codesAddedCount;

        if (activeIdx !== -1) {
          // Game đã có trên trang chính thức
          gameStatus = 'ALREADY_ACTIVE';
          if (codesAddedCount > 0) {
            activeGames[activeIdx].codes_count = Number(activeGames[activeIdx].codes_count || 0) + codesAddedCount;
            activeGames[activeIdx].free_codes_count = Number(activeGames[activeIdx].free_codes_count || 0) + codesAddedCount;
            activeGames[activeIdx].updated_at = nowIso;
            stateModified = true;
          }
          results.push({
            success: true,
            status: 'ALREADY_ACTIVE',
            slug: rawSlug,
            name: rawName,
            message: `Game "${rawName}" đã có trên hệ thống chính thức. Đã cập nhật ${codesAddedCount} mã mới.`,
            codesAdded: codesAddedCount,
            totalCodes: parsedCodes.length,
          });
        } else if (pendingIdx !== -1) {
          // Game đã có trong hàng chờ duyệt -> cập nhật
          gameStatus = 'UPDATED_PENDING';
          const existingPending = pendingGames[pendingIdx];
          const newCodesCount = Math.max(Number(existingPending.activeCodesCount || existingPending.codes_count || 0), parsedCodes.length);
          const isOverwrite = item.overwrite === true || body.overwrite === true;

          pendingGames[pendingIdx] = {
            ...existingPending,
            name: rawName,
            developer: isOverwrite ? developer : (developer !== null ? developer : existingPending.developer),
            publisher: isOverwrite ? publisher : (publisher !== null ? publisher : existingPending.publisher),
            category: isOverwrite ? category : (category !== null ? category : existingPending.category),
            platform: isOverwrite ? platform : (platform !== null ? platform : existingPending.platform),
            description: isOverwrite ? description : (description !== '' ? description : existingPending.description),
            instructions: isOverwrite ? instructions : (instructions !== '' ? instructions : existingPending.instructions),
            redeemUrl: redeemUrl || existingPending.redeemUrl || '',
            releaseDate: isOverwrite ? (item.releaseDate || item.release_date || null) : (item.releaseDate || item.release_date || existingPending.releaseDate || null),
            releaseInfo: isOverwrite ? (item.releaseInfo || item.release_info || null) : (item.releaseInfo || item.release_info || existingPending.releaseInfo || null),
            iconUrl: isOverwrite ? iconUrl : (iconUrl !== '' ? iconUrl : existingPending.iconUrl),
            localIconPath: isOverwrite ? localIconPath : (localIconPath !== '' ? localIconPath : existingPending.localIconPath),
            missing_icon: isOverwrite ? missing_icon : (existingPending.missing_icon !== undefined ? existingPending.missing_icon : missing_icon),
            has_icon: isOverwrite ? has_icon : (existingPending.has_icon !== undefined ? existingPending.has_icon : has_icon),
            activeCodesCount: newCodesCount,
            codes_count: newCodesCount,
            updatedAt: nowIso,
          };
          stateModified = true;
          results.push({
            success: true,
            status: 'UPDATED_PENDING',
            slug: rawSlug,
            name: rawName,
            message: `Game "${rawName}" đã được cập nhật trong Hàng Chờ Duyệt. Thêm ${codesAddedCount} mã mới.`,
            codesAdded: codesAddedCount,
            totalCodes: newCodesCount,
            game: pendingGames[pendingIdx],
          });
        } else {
          // Game mới toanh -> thêm vào hàng chờ duyệt
          totalQueued++;
          const pendingGameRecord = {
            id: rawSlug,
            name: rawName,
            slug: rawSlug,
            packageId: item.packageId || item.packageName || undefined,
            developer,
            publisher,
            category,
            platform,
            rating,
            installs,
            iconUrl,
            localIconPath,
            missing_icon,
            has_icon,
            description,
            instructions,
            redeemUrl,
            releaseDate: item.releaseDate || item.release_date || undefined,
            releaseInfo: item.releaseInfo || item.release_info || undefined,
            source,
            sourceType: 'manual_queue',
            sourceUrl,
            status: 'PENDING',
            activeCodesCount: parsedCodes.length,
            codes_count: parsedCodes.length,
            autoPublishEligible: true,
            crawledAt: nowIso,
            created_at: nowIso,
          };

          pendingGames.unshift(pendingGameRecord);
          stateModified = true;

          results.push({
            success: true,
            status: 'QUEUED_PENDING',
            slug: rawSlug,
            name: rawName,
            message: `Đã đưa game "${rawName}" vào Hàng Chờ Duyệt thành công!`,
            codesAdded: codesAddedCount,
            totalCodes: parsedCodes.length,
            game: pendingGameRecord,
          });
        }
      }

      // 4. Lưu lại các thiết lập D1 nếu có thay đổi
      if (stateModified) {
        await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', pendingGames);
        await setSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1', customCodes);
        await setSettingD1(env.DB, 'wcg_crawler_pending_codes_v1', pendingCodes);

        // Lưu mã vào bảng codes của D1
        if (codesToInsertInD1.length > 0) {
          try {
            const batchStmts = codesToInsertInD1.map((nc) => {
              const expiresAt = nc.expires_at || nc.expiresAt || nc.expiry || null;
              return env.DB.prepare(`
                INSERT OR REPLACE INTO codes (
                  id, game_slug, code, rewards, status, expires_at, source, added_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              `).bind(
                nc.id,
                nc.gameSlug,
                nc.code,
                nc.rewards || null,
                nc.status === 'EXPIRED' ? 'expired' : 'active',
                expiresAt,
                nc.source || 'Queue Game API'
              );
            });

            // Chạy batch theo từng đợt 50 câu lệnh SQL
            for (let i = 0; i < batchStmts.length; i += 50) {
              await env.DB.batch(batchStmts.slice(i, i + 50));
            }
          } catch (sqlErr) {
            console.warn('[QueueGame Codes SQL Insert Warning]', sqlErr);
          }
        }

        invalidateGamesCatalogCache();
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'queue_game',
          totalQueued,
          totalCodesAdded,
          totalPendingGames: pendingGames.length,
          results,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: Cập nhật metadata của mã giftcode đang live (Status, Expiry, Rewards, Case)
    // =========================================================================
    if (body && (body.action === 'update_code_metadata' || body.action === 'update_code_status')) {
      const targetSlug = String(body.gameSlug || body.slug || body.game_slug || body.gameName || '').trim().toLowerCase();
      const targetCode = String(body.code || body.codeValue || '').trim();
      if (!targetSlug || !targetCode) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu tham số gameSlug hoặc code.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const rawStatus = body.status !== undefined ? String(body.status).toLowerCase().trim() : undefined;
      const isExp = rawStatus === 'expired' || rawStatus === 'hết hạn' || rawStatus === 'het han';
      const newStatus = rawStatus ? (isExp ? 'expired' : 'active') : undefined;

      const rawExp = body.expiresAt !== undefined ? body.expiresAt : (body.expires_at !== undefined ? body.expires_at : undefined);
      const parsedExp = rawExp !== undefined ? parseExpirationDate(rawExp) : undefined;
      const formattedExp = parsedExp ? (parsedExp.formatted || (parsedExp.isExpired ? 'Hết hạn' : null)) : undefined;

      const newRewards = body.rewards !== undefined 
        ? decodeHtmlEntities(body.rewards) 
        : (body.description !== undefined ? decodeHtmlEntities(body.description) : undefined);

      let d1UpdatedCount = 0;
      if (env.DB) {
        // Cập nhật bảng codes trên D1 (hỗ trợ cả slug và slug-mobile, case-insensitive match)
        const updateRes: any = await env.DB.prepare(`
          UPDATE codes SET
            status = COALESCE(?, status),
            expires_at = CASE WHEN ? IS NOT NULL THEN ? ELSE expires_at END,
            rewards = COALESCE(?, rewards),
            code = ? -- Cập nhật case chuẩn nếu cần
          WHERE (game_slug = ? OR game_slug = ? OR game_slug = ?) AND UPPER(code) = UPPER(?)
        `).bind(
          newStatus || null,
          formattedExp !== undefined ? formattedExp : null,
          formattedExp !== undefined ? formattedExp : null,
          newRewards || null,
          targetCode,
          targetSlug,
          targetSlug.replace(/-mobile$/i, ''),
          `${targetSlug}-mobile`,
          targetCode
        ).run().catch((e: any) => {
          console.warn('[update_code_metadata] D1 codes update warning:', e);
          return null;
        });
        d1UpdatedCount = updateRes?.meta?.changes || 0;

        // Cập nhật lại số lượng active_codes_count trên games
        await env.DB.prepare(`
          UPDATE games SET
            total_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug),
            active_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug AND (codes.status = 'active' OR codes.status = 'verified') AND (codes.expires_at IS NULL OR codes.expires_at = '' OR codes.expires_at >= date('now'))),
            updated_at = datetime('now')
          WHERE slug = ? OR slug = ? OR slug = ?
        `).bind(targetSlug, targetSlug.replace(/-mobile$/i, ''), `${targetSlug}-mobile`).run().catch(() => {});
      }

      // Cập nhật trong KV wcg_admin_custom_free_codes_v1
      const customCodes: any[] = (await getSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1')) || [];
      let kvModified = false;
      const targetUpper = targetCode.toUpperCase();
      const updatedCustom = customCodes.map((c: any) => {
        if (!c) return c;
        const s = String(c.gameSlug || c.slug || c.gameId || '').trim().toLowerCase();
        const codeVal = String(c.code || c.codeValue || '').trim().toUpperCase();
        if ((s === targetSlug || s === targetSlug.replace(/-mobile$/i, '') || s === `${targetSlug}-mobile`) && codeVal === targetUpper) {
          kvModified = true;
          return {
            ...c,
            code: targetCode, // Cập nhật case
            codeValue: targetCode,
            status: newStatus ? (newStatus === 'expired' ? 'EXPIRED' : 'ACTIVE') : c.status,
            is_active: newStatus ? (newStatus !== 'expired') : c.is_active,
            expiresAt: formattedExp !== undefined ? formattedExp : c.expiresAt,
            expires_at: formattedExp !== undefined ? formattedExp : c.expires_at,
            expiry: formattedExp !== undefined ? formattedExp : c.expiry,
            rewards: newRewards !== undefined ? newRewards : c.rewards,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      if (kvModified) {
        await setSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1', updatedCustom);
      }

      // Xóa cache Edge
      invalidateGamesCatalogCache();
      await invalidateCatalogEdgeCache(context as any, request, env, [
        `https://codegame.shop/api/games?slug=${targetSlug}`,
        `https://codegame.shop/game/${targetSlug}`,
      ]).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          action: 'update_code_metadata',
          gameSlug: targetSlug,
          code: targetCode,
          status: newStatus,
          expiresAt: formattedExp,
          rewards: newRewards,
          d1UpdatedCount,
          kvUpdated: kvModified,
          message: `Đã cập nhật metadata cho mã "${targetCode}" của game "${targetSlug}" thành công!`
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION 3: Lấy toàn bộ mã giftcode đang chờ duyệt
    // =========================================================================
    if (body && body.action === 'list_pending_codes') {
      const pendingCodesRaw = (Array.isArray(settings['wcg_crawler_pending_codes_v1']) && settings['wcg_crawler_pending_codes_v1'].length > 0)
        ? settings['wcg_crawler_pending_codes_v1']
        : (canonicalBackupState.crawlerPendingCodes || []);

      const submissionsRaw = Array.isArray(settings['wcg_admin_submissions_v4'])
        ? settings['wcg_admin_submissions_v4']
        : [];
      const pendingSubmissions = submissionsRaw.filter((s: any) => s && s.status === 'PENDING');

      const combinedCodes: any[] = [];
      const seenIds = new Set<string>();

      for (const item of pendingCodesRaw) {
        if (!item) continue;
        const id = String(item.id || `pending_${Date.now()}`);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        combinedCodes.push({
          id,
          gameSlug: String(item.gameSlug || item.gameId || '').trim(),
          gameName: String(item.gameName || item.gameSlug || '').trim(),
          code: String(item.code || item.codeValue || '').trim().toUpperCase(),
          rewards: item.rewards || item.description || null,
          source: item.sourceName || item.sourceUrl || item.sourceType || item.source || 'Crawler',
          created_at: item.createdAt || item.created_at || new Date().toISOString(),
          expires_at: item.expiresAt || item.expires_at || null,
          score: item.score,
          tier: item.tier,
          tierLabel: item.tierLabel,
          reasons: item.reasons || item.scoreReasons,
          extractionMethod: item.extractionMethod,
          crossCheckCount: item.crossCheckCount,
          crossCheckSources: item.crossCheckSources,
          isConflicted: item.isConflicted,
          conflictNote: item.conflictNote,
          isStaleSource: item.isStaleSource,
        });
      }

      for (const item of pendingSubmissions) {
        if (!item) continue;
        const id = String(item.id || `sub_${Date.now()}`);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        combinedCodes.push({
          id,
          gameSlug: String(item.gameSlug || '').trim(),
          gameName: String(item.gameName || item.gameSlug || '').trim(),
          code: String(item.codeValue || item.code || '').trim().toUpperCase(),
          rewards: item.rewards || null,
          source: `Đóng góp bởi ${item.submitterName || 'Thành viên'}`,
          created_at: item.createdAt || new Date().toISOString(),
          expires_at: item.expiresAt || null,
        });
      }

      const total = combinedCodes.length;
      const limit = body.limit !== undefined ? Math.max(1, parseInt(body.limit, 10)) : total;
      const offset = body.offset !== undefined ? Math.max(0, parseInt(body.offset, 10)) : 0;
      const pagedCodes = combinedCodes.slice(offset, offset + limit);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'list_pending_codes',
          total,
          count: pagedCodes.length,
          limit,
          offset,
          codes: pagedCodes,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION 4 & 5: Duyệt (approve_codes) hoặc Từ chối (reject_codes) mã chờ duyệt
    // =========================================================================
    if (body && (body.action === 'approve_codes' || body.action === 'reject_codes')) {
      let targetIds: string[] = [];
      if (Array.isArray(body.ids)) {
        targetIds = body.ids.map((x: any) => typeof x === 'object' ? String(x.id || '') : String(x)).filter(Boolean);
      } else if (Array.isArray(body.items)) {
        targetIds = body.items.map((x: any) => typeof x === 'object' ? String(x.id || '') : String(x)).filter(Boolean);
      } else if (body.id) {
        targetIds = [String(body.id)];
      }

      if (targetIds.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu danh sách ids mã cần duyệt hoặc từ chối (ids: string[])' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const targetIdSet = new Set(targetIds.map(String));

      const pendingCodesList: any[] = Array.isArray(settings['wcg_crawler_pending_codes_v1'])
        ? [...settings['wcg_crawler_pending_codes_v1']]
        : [];

      const customCodesList: any[] = Array.isArray(settings['wcg_admin_custom_free_codes_v1'])
        ? [...settings['wcg_admin_custom_free_codes_v1']]
        : [];

      const activeGamesList: any[] = Array.isArray(settings['wcg_admin_games_v5'])
        ? [...settings['wcg_admin_games_v5']]
        : [...(fallbackGamesData as any[])];

      if (body.action === 'approve_codes') {
        const results: any[] = [];
        const approvedCustomRecords: any[] = [];
        const remainingPending: any[] = [];
        const affectedGameSlugs = new Set<string>();

        for (const item of pendingCodesList) {
          if (item && targetIdSet.has(String(item.id))) {
            const targetSlug = String(item.gameSlug || item.gameId || '').trim().toLowerCase();
            const finalCode = String(item.code || item.codeValue || '').trim().toUpperCase();

            const rawExpiry = item.expiresAt || item.expires_at || null;
            const parsedExp = rawExpiry ? parseExpirationDate(rawExpiry) : { formatted: '', isExpired: false, dateObj: null };
            const isExp = parsedExp.isExpired || (item.status && String(item.status).toLowerCase() === 'expired');

            const approvedItem = {
              id: `code_${targetSlug}_${finalCode}_${Date.now().toString(36)}`,
              gameId: targetSlug,
              gameSlug: targetSlug,
              slug: targetSlug,
              gameName: item.gameName || targetSlug,
              code: finalCode,
              codeValue: finalCode,
              code_value: finalCode,
              gift_code: finalCode,
              rewards: item.rewards || item.description || 'Quà tặng tân thủ & sự kiện',
              description: item.rewards || item.description || 'Quà tặng tân thủ & sự kiện',
              status: isExp ? 'EXPIRED' : 'ACTIVE',
              is_active: !isExp,
              is_verified: true,
              isVerified: true,
              expires_at: parsedExp.formatted || rawExpiry || null,
              expiresAt: parsedExp.formatted || rawExpiry || null,
              expiry: parsedExp.formatted || rawExpiry || null,
              sourceUrl: item.sourceUrl || `https://codegame.shop/game/${targetSlug}`,
              source: item.sourceName || item.sourceUrl || item.sourceType || 'Crawler Approved',
              copyCount: 0,
              createdAt: new Date().toISOString(),
              created_at: new Date().toISOString(),
              added_at: new Date().toISOString(),
            };

            approvedCustomRecords.push(approvedItem);
            if (targetSlug) affectedGameSlugs.add(targetSlug);

            results.push({
              id: item.id,
              success: true,
              code: finalCode,
              gameSlug: targetSlug,
              status: 'approved',
            });
          } else if (item) {
            remainingPending.push(item);
          }
        }

        // Kiểm tra các ids không có trong pending (idempotent: nếu đã có trong customCodesList)
        for (const id of targetIds) {
          if (!results.some((r) => r.id === id)) {
            const alreadyApproved = customCodesList.some((c: any) => String(c.id).includes(id) || String(c.code) === id);
            if (alreadyApproved) {
              results.push({ id, success: true, status: 'already_approved', message: 'Mã đã được duyệt trước đó' });
            } else {
              results.push({ id, success: false, error: 'Không tìm thấy mã trong hàng chờ duyệt' });
            }
          }
        }

        if (approvedCustomRecords.length > 0) {
          const mergedCustom = [...approvedCustomRecords, ...customCodesList];
          await setSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1', mergedCustom);
          await setSettingD1(env.DB, 'wcg_crawler_pending_codes_v1', remainingPending);

          // Cập nhật codes_count cho các game trong system_settings
          for (const slug of affectedGameSlugs) {
            const gIdx = activeGamesList.findIndex((g: any) => g && (String(g.slug).toLowerCase() === slug || String(g.id).toLowerCase() === slug));
            if (gIdx !== -1) {
              const currentCount = Number(activeGamesList[gIdx].codes_count || 0);
              const addedForGame = approvedCustomRecords.filter((c) => c.gameSlug === slug).length;
              activeGamesList[gIdx] = {
                ...activeGamesList[gIdx],
                codes_count: currentCount + addedForGame,
                free_codes_count: currentCount + addedForGame,
                updated_at: new Date().toISOString(),
              };
            }
          }
          await setSettingD1(env.DB, 'wcg_admin_games_v5', activeGamesList);

          // Đồng bộ trực tiếp vào bảng codes và cập nhật bảng games trên SQLite D1 (ISSUE-112: Tránh lệch tầng đọc)
          if (env.DB) {
            try {
              const codeStmts = approvedCustomRecords.map((rec) => {
                const cSlug = String(rec.gameSlug || '').trim().toLowerCase();
                const cCode = String(rec.code || '').trim().toUpperCase();
                const cId = rec.id || `code_${cSlug}_${cCode}`;
                const cExp = rec.expires_at || rec.expiresAt || rec.expiry || null;
                const cRewards = rec.rewards || rec.reward || rec.description || null;
                const cSource = rec.source || 'Crawler Approved';
                return env.DB.prepare(`
                  INSERT OR REPLACE INTO codes (id, game_slug, code, rewards, status, expires_at, source, added_at)
                  VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'))
                `).bind(cId, cSlug, cCode, cRewards, cExp, cSource);
              });

              for (let i = 0; i < codeStmts.length; i += 50) {
                await env.DB.batch(codeStmts.slice(i, i + 50));
              }

              for (const slug of affectedGameSlugs) {
                await env.DB.prepare(`
                  UPDATE games
                  SET active_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug AND (codes.status = 'active' OR codes.status = 'verified') AND (codes.expires_at IS NULL OR codes.expires_at = '' OR codes.expires_at >= date('now'))),
                      total_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug),
                      last_code_at = datetime('now'),
                      updated_at = datetime('now')
                  WHERE slug = ?
                `).bind(slug).run().catch(() => {});
              }
            } catch (d1ApproveErr) {
              console.warn('[ApproveCodes D1 SQL Sync Warning]', d1ApproveErr);
            }
          }

          invalidateGamesCatalogCache();
          await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: 'approve_codes',
            totalRequested: targetIds.length,
            approvedCount: results.filter((r) => r.success).length,
            results,
            remainingPendingCount: remainingPending.length,
          }),
          { headers: CORS_HEADERS }
        );
      }

      // action === 'reject_codes'
      if (body.action === 'reject_codes') {
        const results: any[] = [];
        const remainingPending: any[] = [];
        let rejectedCount = 0;

        for (const item of pendingCodesList) {
          if (item && targetIdSet.has(String(item.id))) {
            rejectedCount++;
            results.push({
              id: item.id,
              success: true,
              code: item.code || item.codeValue,
              status: 'rejected',
              message: 'Đã loại bỏ mã khỏi hàng chờ duyệt',
            });
          } else if (item) {
            remainingPending.push(item);
          }
        }

        for (const id of targetIds) {
          if (!results.some((r) => r.id === id)) {
            results.push({ id, success: true, status: 'already_rejected', message: 'Mã không còn trong hàng chờ' });
          }
        }

        if (rejectedCount > 0) {
          await setSettingD1(env.DB, 'wcg_crawler_pending_codes_v1', remainingPending);
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: 'reject_codes',
            totalRequested: targetIds.length,
            rejectedCount,
            results,
            remainingPendingCount: remainingPending.length,
          }),
          { headers: CORS_HEADERS }
        );
      }
    }

    // Xử lý action đặc biệt: Dọn dẹp sạch mã test theo Rule 7 (Zero Test Artifacts on Production)
    if (body && body.action === 'cleanup_test_codes') {
      const prefix = String(body.prefix || 'TEST').toUpperCase();
      const explicitCodes = Array.isArray(body.codes) ? new Set(body.codes.map((c: string) => String(c).trim().toUpperCase())) : new Set();
      const existingCustomCodes = Array.isArray(settings['wcg_admin_custom_free_codes_v1'])
        ? [...settings['wcg_admin_custom_free_codes_v1']]
        : [];

      const beforeCount = existingCustomCodes.length;
      const cleanCustomCodes = existingCustomCodes.filter((c: any) => {
        const val = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
        return !val.startsWith(prefix) && !explicitCodes.has(val);
      });
      const removedCount = beforeCount - cleanCustomCodes.length;

      let dbDeletedCount = 0;
      let dbDeletedGamesCount = 0;
      if (env.DB) {
        try {
          const dbCodesRes: any = await env.DB.prepare("DELETE FROM codes WHERE UPPER(code) LIKE ? OR game_slug LIKE 'test-%' OR game_slug LIKE 'test_%'").bind(`${prefix}%`).run();
          dbDeletedCount = dbCodesRes?.meta?.changes || 0;

          if (explicitCodes.size > 0) {
            const codeArr = Array.from(explicitCodes);
            const placeholders = codeArr.map(() => '?').join(', ');
            await env.DB.prepare(`DELETE FROM codes WHERE UPPER(code) IN (${placeholders})`).bind(...codeArr).run().catch(() => {});
          }

          const dbGamesRes: any = await env.DB.prepare("DELETE FROM games WHERE slug LIKE 'test-%' OR slug LIKE 'test_%' OR id LIKE 'test-%' OR id LIKE 'test_%' OR name LIKE 'Test %' OR publisher LIKE 'Test Studio%'").run();
          dbDeletedGamesCount = dbGamesRes?.meta?.changes || 0;

          await env.DB.prepare(`
            UPDATE games 
            SET active_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug AND (codes.expires_at IS NULL OR codes.expires_at > datetime('now'))),
                total_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug)
          `).run().catch(() => {});
        } catch (dbErr) {
          console.warn('[Cleanup] Lỗi dọn dẹp codes/games table D1:', dbErr);
        }
      }

      if (removedCount > 0 || dbDeletedCount > 0 || dbDeletedGamesCount > 0) {
        if (removedCount > 0) {
          await setSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1', cleanCustomCodes);
        }
        // Dọn dẹp active games settings nếu còn sót test game
        const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5']) ? [...settings['wcg_admin_games_v5']] : [];
        const cleanActiveGames = activeGamesRaw.filter((g: any) => {
          const s = String(g.slug || g.id || '').toLowerCase();
          const n = String(g.name || '').toLowerCase();
          const p = String(g.publisher || '').toLowerCase();
          return !s.startsWith('test-') && !s.startsWith('test_') && !n.startsWith('test ') && !p.startsWith('test studio');
        });
        if (cleanActiveGames.length !== activeGamesRaw.length) {
          await setSettingD1(env.DB, 'wcg_admin_games_v5', cleanActiveGames);
        }

        invalidateGamesCatalogCache();
        await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});
      }

      // Dọn dẹp pending games & pending codes liên quan đến test (Rule 7)
      const pendingGamesRaw = Array.isArray(settings['wcg_crawler_pending_games_v1'])
        ? [...settings['wcg_crawler_pending_games_v1']]
        : [];
      const pendingCodesRaw = Array.isArray(settings['wcg_crawler_pending_codes_v1'])
        ? [...settings['wcg_crawler_pending_codes_v1']]
        : [];

      const initialPendingGames = pendingGamesRaw.length;
      const initialPendingCodes = pendingCodesRaw.length;

      const testGamePrefix = prefix.toLowerCase();
      const cleanPendingGames = pendingGamesRaw.filter((g: any) => {
        const slug = String(g.slug || g.id || '').toLowerCase();
        const name = String(g.name || '').toLowerCase();
        return !slug.startsWith(testGamePrefix) && !name.startsWith(testGamePrefix) && !slug.includes('test-');
      });
      const cleanPendingCodes = pendingCodesRaw.filter((c: any) => {
        const code = String(c.code || '').toUpperCase();
        const gSlug = String(c.gameSlug || c.game_slug || '').toLowerCase();
        return !code.startsWith(prefix) && !gSlug.startsWith(testGamePrefix) && !gSlug.includes('test-');
      });

      const removedPendingGames = initialPendingGames - cleanPendingGames.length;
      const removedPendingCodes = initialPendingCodes - cleanPendingCodes.length;

      if (removedPendingGames > 0) {
        await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', cleanPendingGames);
      }
      if (removedPendingCodes > 0) {
        await setSettingD1(env.DB, 'wcg_crawler_pending_codes_v1', cleanPendingCodes);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã dọn dẹp ${removedCount} mã trong settings, ${dbDeletedCount} mã trong D1 codes, ${removedPendingGames} game chờ test, ${removedPendingCodes} mã chờ test có tiền tố "${prefix}".`,
          removedCount: removedCount + dbDeletedCount + removedPendingCodes,
          removedGamesCount: removedPendingGames,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: GET_GAME (Đọc toàn bộ thông tin game live kèm 4 trường giấy phép & mã code D1)
    // =========================================================================
    if (body && body.action === 'get_game') {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      const targetName = String(body.name || body.gameName || '').trim();

      let targetGame: any = null;

      // 1. Kiểm tra D1 games table
      if (env.DB && targetSlug) {
        try {
          targetGame = await env.DB.prepare(
            'SELECT * FROM games WHERE LOWER(TRIM(slug)) = ? OR LOWER(TRIM(id)) = ? LIMIT 1'
          ).bind(targetSlug, targetSlug).first<any>();
        } catch (e) {
          console.warn('[get_game] DB query error:', e);
        }
      }

      // 2. Nếu chưa có, kiểm tra wcg_admin_games_v5
      const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5']) ? settings['wcg_admin_games_v5'] : [];
      if (!targetGame) {
        if (targetSlug) {
          targetGame = activeGamesRaw.find((g: any) => g && (String(g.slug || '').toLowerCase() === targetSlug || String(g.id || '').toLowerCase() === targetSlug));
        } else if (targetName) {
          const matched = findBestMatchingGame(targetName, activeGamesRaw, []);
          if (matched && !matched.ambiguous) {
            targetGame = matched.game;
          }
        }
      }

      // 3. Nếu chưa có, kiểm tra wcg_crawler_pending_games_v1
      const pendingGamesRaw = Array.isArray(settings['wcg_crawler_pending_games_v1']) ? settings['wcg_crawler_pending_games_v1'] : [];
      if (!targetGame) {
        if (targetSlug) {
          targetGame = pendingGamesRaw.find((g: any) => g && (String(g.slug || '').toLowerCase() === targetSlug || String(g.id || '').toLowerCase() === targetSlug));
        } else if (targetName) {
          const matched = findBestMatchingGame(targetName, [], pendingGamesRaw);
          if (matched && !matched.ambiguous) {
            targetGame = matched.game;
          }
        }
      }

      if (!targetGame) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Không tìm thấy trò chơi với slug/id/tên: "${targetSlug || targetName}"`,
          }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      const finalSlug = String(targetGame.slug || targetGame.id).trim().toLowerCase();

      // Đếm số lượng mã code THẬT từ bảng codes của D1
      let totalCodes = targetGame.total_codes_count ?? 0;
      let activeCodes = targetGame.active_codes_count ?? 0;
      let expiredCodes = 0;

      if (env.DB) {
        try {
          const countsRes: any = await env.DB.prepare(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN (status = 'active' OR status = 'verified') AND (expires_at IS NULL OR expires_at = '' OR expires_at >= date('now')) THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'expired' OR (expires_at IS NOT NULL AND expires_at != '' AND expires_at < date('now')) THEN 1 ELSE 0 END) as expired
            FROM codes WHERE LOWER(game_slug) = ? OR LOWER(game_slug) = ?
          `).bind(finalSlug, finalSlug.replace(/-mobile$/i, '')).first();

          if (countsRes) {
            totalCodes = Number(countsRes.total || 0);
            activeCodes = Number(countsRes.active || 0);
            expiredCodes = Number(countsRes.expired || 0);
          }
        } catch (e) {
          console.warn('[get_game] Count codes query warning:', e);
        }
      }

      const responseGame = {
        id: targetGame.id || finalSlug,
        slug: finalSlug,
        name: targetGame.name,
        publisher: targetGame.publisher || targetGame.developer || '',
        developer: targetGame.developer || targetGame.publisher || '',
        category: targetGame.category || '',
        platform: targetGame.platform || 'Android, iOS, PC',
        rating: targetGame.rating ?? 4.8,
        installs: targetGame.installs || '',
        icon_url: targetGame.icon_url || targetGame.iconUrl || `/game_icons/${finalSlug}.webp`,
        banner_url: targetGame.banner_url || targetGame.bannerUrl || '',
        description: targetGame.description || '',
        instructions: targetGame.instructions || '',
        redeem_url: targetGame.redeem_url || targetGame.redeemUrl || '',
        license_number: targetGame.license_number || '',
        license_issued_date: targetGame.license_issued_date || '',
        license_status: targetGame.license_status || '',
        license_source_url: targetGame.license_source_url || '',
        status: targetGame.status || (targetGame.is_active === 0 ? 'HIDDEN' : 'ACTIVE'),
        is_active: targetGame.is_active !== undefined ? (Number(targetGame.is_active) === 1 ? 1 : 0) : 1,
        total_codes_count: totalCodes,
        active_codes_count: activeCodes,
        expired_codes_count: expiredCodes,
        created_at: targetGame.created_at || targetGame.crawledAt || null,
        updated_at: targetGame.updated_at || null,
      };

      return new Response(
        JSON.stringify({
          success: true,
          game: responseGame,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: LIST_GAMES (Danh sách game phía quản trị: all, live, pending, hidden, deleted)
    // =========================================================================
    if (body && body.action === 'list_games') {
      const filterStatus = String(body.status || 'all').toLowerCase();
      const filterCategory = String(body.category || '').toLowerCase();
      const filterPublisher = String(body.publisher || '').toLowerCase();
      const searchQuery = String(body.search || body.q || '').toLowerCase().trim();
      const page = Math.max(1, Number(body.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(body.limit) || 50));

      let allGames: any[] = [];

      // Query D1 games table
      if (env.DB) {
        try {
          const d1Games = await env.DB.prepare('SELECT * FROM games ORDER BY name ASC LIMIT 1000').all<any>();
          if (Array.isArray(d1Games?.results)) {
            allGames.push(...d1Games.results.map((g: any) => ({
              ...g,
              source: 'd1_games',
              status: g.is_active === 0 ? 'HIDDEN' : (g.status || 'ACTIVE'),
            })));
          }
        } catch (e) {
          console.warn('[list_games] D1 games query error:', e);
        }
      }

      // Fallback wcg_admin_games_v5
      if (allGames.length === 0) {
        const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5']) ? settings['wcg_admin_games_v5'] : [];
        allGames.push(...activeGamesRaw.map((g: any) => ({
          ...g,
          source: 'settings_active',
          status: g.is_active === 0 ? 'HIDDEN' : (g.status || 'ACTIVE'),
        })));
      }

      // Hàng chờ duyệt
      if (filterStatus === 'all' || filterStatus === 'pending') {
        const pendingGamesRaw = Array.isArray(settings['wcg_crawler_pending_games_v1']) ? settings['wcg_crawler_pending_games_v1'] : [];
        for (const p of pendingGamesRaw) {
          if (!allGames.some(g => String(g.slug).toLowerCase() === String(p.slug).toLowerCase())) {
            allGames.push({
              ...p,
              source: 'pending',
              status: 'PENDING',
              is_active: 0,
            });
          }
        }
      }

      // Filter by status
      if (filterStatus === 'live' || filterStatus === 'active') {
        allGames = allGames.filter(g => g.status === 'ACTIVE' && Number(g.is_active) !== 0);
      } else if (filterStatus === 'hidden') {
        allGames = allGames.filter(g => g.status === 'HIDDEN' || Number(g.is_active) === 0);
      } else if (filterStatus === 'pending') {
        allGames = allGames.filter(g => g.status === 'PENDING');
      }

      // Filter by category
      if (filterCategory) {
        allGames = allGames.filter(g => String(g.category || '').toLowerCase().includes(filterCategory));
      }

      // Filter by publisher
      if (filterPublisher) {
        allGames = allGames.filter(g => 
          String(g.publisher || '').toLowerCase().includes(filterPublisher) ||
          String(g.developer || '').toLowerCase().includes(filterPublisher)
        );
      }

      // Search query
      if (searchQuery) {
        allGames = allGames.filter(g => 
          String(g.name || '').toLowerCase().includes(searchQuery) ||
          String(g.slug || '').toLowerCase().includes(searchQuery) ||
          String(g.license_number || '').toLowerCase().includes(searchQuery)
        );
      }

      const total = allGames.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = allGames.slice((page - 1) * limit, page * limit);

      return new Response(
        JSON.stringify({
          success: true,
          games: paginated.map((g: any) => ({
            id: g.id || g.slug,
            slug: g.slug,
            name: g.name,
            publisher: g.publisher || g.developer || '',
            category: g.category || '',
            platform: g.platform || 'Android, iOS, PC',
            rating: g.rating ?? 4.8,
            icon_url: g.icon_url || g.iconUrl || `/game_icons/${g.slug}.webp`,
            status: g.status || (g.is_active === 0 ? 'HIDDEN' : 'ACTIVE'),
            is_active: g.is_active !== undefined ? (Number(g.is_active) === 1 ? 1 : 0) : 1,
            total_codes_count: g.total_codes_count ?? 0,
            active_codes_count: g.active_codes_count ?? 0,
            license_number: g.license_number || '',
            license_issued_date: g.license_issued_date || '',
            license_status: g.license_status || '',
            license_source_url: g.license_source_url || '',
            updated_at: g.updated_at || g.crawledAt || null,
          })),
          total,
          page,
          limit,
          totalPages,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: UPDATE_GAME (Cập nhật partial bản ghi game live, giữ nguyên trường bỏ trống)
    // =========================================================================
    if (body && body.action === 'update_game') {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      const targetName = String(body.name || body.gameName || '').trim();

      if (!targetSlug && !targetName) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu trường "slug", "id" hoặc "name" của game cần cập nhật.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Xử lý fuzzy match nếu không truyền slug trực tiếp
      let matchedSlug = targetSlug;
      if (!matchedSlug && targetName) {
        const activeList = Array.isArray(settings['wcg_admin_games_v5']) ? settings['wcg_admin_games_v5'] : [];
        const pendingList = Array.isArray(settings['wcg_crawler_pending_games_v1']) ? settings['wcg_crawler_pending_games_v1'] : [];
        const matchRes = findBestMatchingGame(targetName, activeList, pendingList);

        if (matchRes && matchRes.ambiguous) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Tên game "${targetName}" không rõ ràng, có nhiều game tương đồng. Vui lòng gửi kèm "slug" chính xác.`,
              ambiguous: true,
              candidates: matchRes.candidates,
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }

        if (matchRes && matchRes.game) {
          matchedSlug = String(matchRes.game.slug || matchRes.game.id).toLowerCase();
        } else {
          return new Response(
            JSON.stringify({ success: false, error: `Không tìm thấy game nào khớp với "${targetName}".` }),
            { status: 404, headers: CORS_HEADERS }
          );
        }
      }

      // Tìm game hiện tại trong D1
      let currentGame: any = null;
      if (env.DB) {
        try {
          currentGame = await env.DB.prepare(
            'SELECT * FROM games WHERE LOWER(TRIM(slug)) = ? OR LOWER(TRIM(id)) = ? LIMIT 1'
          ).bind(matchedSlug, matchedSlug).first<any>();
        } catch (e) {
          console.warn('[update_game] DB query error:', e);
        }
      }

      // Kiểm tra wcg_admin_games_v5
      const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5']) ? [...settings['wcg_admin_games_v5']] : [];
      const activeIdx = activeGamesRaw.findIndex(g => g && (String(g.slug).toLowerCase() === matchedSlug || String(g.id).toLowerCase() === matchedSlug));
      if (!currentGame && activeIdx !== -1) {
        currentGame = activeGamesRaw[activeIdx];
      }

      if (!currentGame) {
        return new Response(
          JSON.stringify({ success: false, error: `Không tìm thấy game với slug "${matchedSlug}" để cập nhật.` }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      // Partial updates only: Giữ nguyên 100% các trường không gửi
      const updatedName = body.name !== undefined ? String(body.name).trim() : currentGame.name;
      const updatedPublisher = body.publisher !== undefined ? String(body.publisher).trim() : (currentGame.publisher || currentGame.developer || '');
      const updatedDeveloper = body.developer !== undefined ? String(body.developer).trim() : (currentGame.developer || currentGame.publisher || '');
      const updatedCategory = body.category !== undefined ? String(body.category).trim() : (currentGame.category || '');
      const updatedPlatform = body.platform !== undefined ? String(body.platform).trim() : (currentGame.platform || 'Android, iOS, PC');
      const updatedRating = body.rating !== undefined ? Number(body.rating) : (currentGame.rating ?? 4.8);
      const updatedInstalls = body.installs !== undefined ? String(body.installs).trim() : (currentGame.installs || '');
      const updatedIconUrl = body.icon_url !== undefined ? String(body.icon_url).trim() : (body.iconUrl !== undefined ? String(body.iconUrl).trim() : (currentGame.icon_url || currentGame.iconUrl || `/game_icons/${matchedSlug}.webp`));
      const updatedBannerUrl = body.banner_url !== undefined ? String(body.banner_url).trim() : (body.bannerUrl !== undefined ? String(body.bannerUrl).trim() : (currentGame.banner_url || currentGame.bannerUrl || ''));
      const updatedDescription = body.description !== undefined ? String(body.description).trim() : (currentGame.description || '');
      const updatedInstructions = body.instructions !== undefined ? String(body.instructions).trim() : (currentGame.instructions || '');
      const updatedRedeemUrl = body.redeem_url !== undefined ? String(body.redeem_url).trim() : (body.redeemUrl !== undefined ? String(body.redeemUrl).trim() : (currentGame.redeem_url || currentGame.redeemUrl || ''));

      // 4 trường Giấy phép phát hành chính thức
      const updatedLicenseNumber = body.license_number !== undefined ? String(body.license_number).trim() : (currentGame.license_number || '');
      const updatedLicenseIssuedDate = body.license_issued_date !== undefined ? String(body.license_issued_date).trim() : (currentGame.license_issued_date || '');
      const updatedLicenseStatus = body.license_status !== undefined ? String(body.license_status).trim() : (currentGame.license_status || '');
      const updatedLicenseSourceUrl = body.license_source_url !== undefined ? String(body.license_source_url).trim() : (currentGame.license_source_url || '');

      const nowIso = new Date().toISOString();

      // Cập nhật D1 games table
      if (env.DB) {
        try {
          await env.DB.prepare(`
            UPDATE games SET
              name = ?,
              publisher = ?,
              developer = ?,
              category = ?,
              platform = ?,
              rating = ?,
              installs = ?,
              icon_url = ?,
              banner_url = ?,
              description = ?,
              instructions = ?,
              redeem_url = ?,
              license_number = ?,
              license_issued_date = ?,
              license_status = ?,
              license_source_url = ?,
              updated_at = datetime('now')
            WHERE LOWER(TRIM(slug)) = ? OR LOWER(TRIM(id)) = ?
          `).bind(
            updatedName,
            updatedPublisher,
            updatedDeveloper,
            updatedCategory,
            updatedPlatform,
            updatedRating,
            updatedInstalls,
            updatedIconUrl,
            updatedBannerUrl,
            updatedDescription,
            updatedInstructions,
            updatedRedeemUrl,
            updatedLicenseNumber,
            updatedLicenseIssuedDate,
            updatedLicenseStatus,
            updatedLicenseSourceUrl,
            matchedSlug,
            matchedSlug
          ).run();
        } catch (dbErr) {
          console.warn('[update_game] D1 games update error:', dbErr);
        }
      }

      // Cập nhật wcg_admin_games_v5
      if (activeIdx !== -1) {
        activeGamesRaw[activeIdx] = {
          ...activeGamesRaw[activeIdx],
          name: updatedName,
          publisher: updatedPublisher,
          developer: updatedDeveloper,
          category: updatedCategory,
          platform: updatedPlatform,
          rating: updatedRating,
          installs: updatedInstalls,
          icon_url: updatedIconUrl,
          banner_url: updatedBannerUrl,
          description: updatedDescription,
          instructions: updatedInstructions,
          redeem_url: updatedRedeemUrl,
          license_number: updatedLicenseNumber,
          license_issued_date: updatedLicenseIssuedDate,
          license_status: updatedLicenseStatus,
          license_source_url: updatedLicenseSourceUrl,
          updated_at: nowIso,
        };
        await setSettingD1(env.DB, 'wcg_admin_games_v5', activeGamesRaw);
      }

      // Ghi Audit Log (wcg_game_audit_logs_v1)
      const auditLog = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: 'UPDATE_GAME',
        target_slug: matchedSlug,
        target_name: updatedName,
        actor: auth.botName || 'admin_api',
        changes: {
          name: body.name !== undefined ? updatedName : undefined,
          publisher: body.publisher !== undefined ? updatedPublisher : undefined,
          license_number: body.license_number !== undefined ? updatedLicenseNumber : undefined,
          license_status: body.license_status !== undefined ? updatedLicenseStatus : undefined,
        },
        timestamp: nowIso,
      };
      const existingAuditLogs = (await getSettingD1<any[]>(env.DB, 'wcg_game_audit_logs_v1', [])) || [];
      existingAuditLogs.unshift(auditLog);
      if (existingAuditLogs.length > 500) existingAuditLogs.length = 500;
      await setSettingD1(env.DB, 'wcg_game_audit_logs_v1', existingAuditLogs).catch(() => {});

      (globalThis as any).__wcg_public_sync_cache = null;
      await invalidateCatalogEdgeCache(context as any, request, env, [
        'https://codegame.shop/api/games',
        'https://codegame.shop/api/crawler/ingest-codes',
        'https://codegame.shop/api/sync',
      ]).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cập nhật thông tin game "${updatedName}" (${matchedSlug}) thành công!`,
          game: {
            slug: matchedSlug,
            name: updatedName,
            publisher: updatedPublisher,
            category: updatedCategory,
            platform: updatedPlatform,
            license_number: updatedLicenseNumber,
            license_issued_date: updatedLicenseIssuedDate,
            license_status: updatedLicenseStatus,
            license_source_url: updatedLicenseSourceUrl,
            updated_at: nowIso,
          },
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: UNPUBLISH_GAME (Ẩn game khỏi web khách, dữ liệu và code được giữ nguyên 100%)
    // =========================================================================
    if (body && body.action === 'unpublish_game') {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      if (!targetSlug) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu slug hoặc id của game cần ẩn (unpublish).' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Cập nhật D1 games: set is_active = 0, status = 'HIDDEN'
      if (env.DB) {
        try {
          await env.DB.prepare(`
            UPDATE games SET
              is_active = 0,
              status = 'HIDDEN',
              updated_at = datetime('now')
            WHERE LOWER(TRIM(slug)) = ? OR LOWER(TRIM(id)) = ?
          `).bind(targetSlug, targetSlug).run();
        } catch (e) {
          console.warn('[unpublish_game] DB update error:', e);
        }
      }

      // Đồng bộ wcg_admin_games_v5
      const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5']) ? [...settings['wcg_admin_games_v5']] : [];
      const activeIdx = activeGamesRaw.findIndex(g => g && (String(g.slug).toLowerCase() === targetSlug || String(g.id).toLowerCase() === targetSlug));
      if (activeIdx !== -1) {
        activeGamesRaw[activeIdx] = {
          ...activeGamesRaw[activeIdx],
          is_active: false,
          status: 'HIDDEN',
          updated_at: new Date().toISOString(),
        };
        await setSettingD1(env.DB, 'wcg_admin_games_v5', activeGamesRaw);
      }

      // Ghi Audit Log
      const auditLog = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: 'UNPUBLISH_GAME',
        target_slug: targetSlug,
        actor: auth.botName || 'admin_api',
        reason: body.reason || 'Ẩn game khỏi web khách qua API unpublish_game',
        timestamp: new Date().toISOString(),
      };
      const existingAuditLogs = (await getSettingD1<any[]>(env.DB, 'wcg_game_audit_logs_v1', [])) || [];
      existingAuditLogs.unshift(auditLog);
      if (existingAuditLogs.length > 500) existingAuditLogs.length = 500;
      await setSettingD1(env.DB, 'wcg_game_audit_logs_v1', existingAuditLogs).catch(() => {});

      (globalThis as any).__wcg_public_sync_cache = null;
      await invalidateCatalogEdgeCache(context as any, request, env, [
        'https://codegame.shop/api/games',
        'https://codegame.shop/api/crawler/ingest-codes',
        'https://codegame.shop/api/sync',
      ]).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã ẩn game "${targetSlug}" khỏi web khách thành công. Toàn bộ mã code và thông tin được bảo toàn 100%.`,
          slug: targetSlug,
          status: 'HIDDEN',
          is_active: 0,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: REMOVE_FROM_DELETED_GIVEAWAYS (Xóa ID khỏi wcg_deleted_giveaways kèm kiểm chứng)
    // =========================================================================
    if (body && body.action === 'remove_from_deleted_giveaways') {
      const rawTarget = body.giveawayId || body.giveaway_id || body.id || body.slug;
      if (!rawTarget) {
        return new Response(
          JSON.stringify({ success: false, error: 'Thiếu giveawayId hoặc id của giveaway cần xóa khỏi danh sách đã xóa.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const targetId = String(rawTarget).trim();
      const currentList = (await getSettingD1<string[]>(env.DB, 'wcg_deleted_giveaways')) || [];
      const initialCount = currentList.length;

      const filtered = currentList.filter(id => String(id).trim() !== targetId);

      if (filtered.length !== initialCount) {
        await setSettingD1(env.DB, 'wcg_deleted_giveaways', filtered);
      }

      // Ghi Audit Log
      const auditLog = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: 'REMOVE_FROM_DELETED_GIVEAWAYS',
        target_id: targetId,
        actor: auth.botName || 'admin_api',
        initial_count: initialCount,
        remaining_count: filtered.length,
        timestamp: new Date().toISOString(),
      };
      const existingAuditLogs = (await getSettingD1<any[]>(env.DB, 'wcg_game_audit_logs_v1', [])) || [];
      existingAuditLogs.unshift(auditLog);
      if (existingAuditLogs.length > 500) existingAuditLogs.length = 500;
      await setSettingD1(env.DB, 'wcg_game_audit_logs_v1', existingAuditLogs).catch(() => {});

      (globalThis as any).__wcg_public_sync_cache = null;
      await invalidateCatalogEdgeCache(context as any, request, env, [
        'https://codegame.shop/api/sync',
        'https://codegame.shop/api/crawler/ingest-codes',
      ]).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã xóa "${targetId}" khỏi wcg_deleted_giveaways thành công.`,
          removedId: targetId,
          wasPresent: initialCount !== filtered.length,
          remainingDeletedCount: filtered.length,
          remainingDeletedGiveaways: filtered,
        }),
        { headers: CORS_HEADERS }
      );
    }
    // Xử lý action đặc biệt: Cập nhật metadata game trong Hàng Chờ Duyệt (Chống giá trị bịa đặt)
    if (body && (body.action === 'update_pending_game' || body.action === 'fix_pending_game')) {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      if (!targetSlug) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu slug hoặc id của game cần cập nhật' }), { status: 400, headers: CORS_HEADERS });
      }

      const pendingGamesRaw = Array.isArray(settings['wcg_crawler_pending_games_v1'])
        ? [...settings['wcg_crawler_pending_games_v1']]
        : [];

      const targetIdx = pendingGamesRaw.findIndex((g: any) => g && (String(g.slug).toLowerCase() === targetSlug || String(g.id).toLowerCase() === targetSlug));
      if (targetIdx === -1) {
        return new Response(JSON.stringify({ success: false, error: `Không tìm thấy game "${targetSlug}" trong hàng chờ duyệt` }), { status: 404, headers: CORS_HEADERS });
      }

      const current = pendingGamesRaw[targetIdx];
      const updatedRecord = {
        ...current,
        name: body.name !== undefined ? String(body.name).trim() : current.name,
        developer: body.developer !== undefined ? (body.developer ? String(body.developer).trim() : null) : current.developer,
        publisher: body.publisher !== undefined ? (body.publisher ? String(body.publisher).trim() : null) : current.publisher,
        category: body.category !== undefined ? (body.category ? String(body.category).trim() : null) : current.category,
        platform: body.platform !== undefined ? (body.platform ? String(body.platform).trim() : null) : current.platform,
        description: body.description !== undefined ? String(body.description || '').trim() : current.description,
        instructions: body.instructions !== undefined ? String(body.instructions || '').trim() : current.instructions,
        iconUrl: body.iconUrl !== undefined ? String(body.iconUrl || '').trim() : current.iconUrl,
        localIconPath: body.localIconPath !== undefined ? String(body.localIconPath || '').trim() : current.localIconPath,
        releaseDate: body.releaseDate !== undefined ? (body.releaseDate ? String(body.releaseDate).trim() : null) : current.releaseDate,
        releaseInfo: body.releaseInfo !== undefined ? (body.releaseInfo ? String(body.releaseInfo).trim() : null) : current.releaseInfo,
        missing_icon: body.missing_icon !== undefined ? Boolean(body.missing_icon) : current.missing_icon,
        has_icon: body.has_icon !== undefined ? Boolean(body.has_icon) : current.has_icon,
        updated_at: new Date().toISOString(),
      };

      pendingGamesRaw[targetIdx] = updatedRecord;
      await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', pendingGamesRaw);

      return new Response(JSON.stringify({
        success: true,
        message: `Đã cập nhật metadata game "${targetSlug}" trong hàng chờ duyệt thành công!`,
        game: updatedRecord,
      }), { headers: CORS_HEADERS });
    }

    // Xử lý action đặc biệt: Xóa game và mã test trong Hàng Chờ Duyệt (Rule 7 Zero Test Artifacts & Soft-Delete Tombstone)
    if (body && (body.action === 'delete_pending_game' || body.action === 'remove_pending_game')) {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      if (!targetSlug) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu slug hoặc id của game cần xóa' }), { status: 400, headers: CORS_HEADERS });
      }

      const pendingGamesRaw = Array.isArray(settings['wcg_crawler_pending_games_v1'])
        ? [...settings['wcg_crawler_pending_games_v1']]
        : [];
      const pendingCodesRaw = Array.isArray(settings['wcg_crawler_pending_codes_v1'])
        ? [...settings['wcg_crawler_pending_codes_v1']]
        : [];

      const targetGame = pendingGamesRaw.find((g: any) => g && (String(g.slug).toLowerCase() === targetSlug || String(g.id).toLowerCase() === targetSlug));

      if (env.DB) {
        await recordSoftDelete(env.DB, {
          recordType: 'pending_game',
          recordId: targetGame?.id || targetSlug,
          recordSlug: targetGame?.slug || targetSlug,
          title: targetGame?.name || targetSlug,
          actor: auth.botName || 'crawler_api',
          deleteReason: body.reason || 'Xóa qua delete_pending_game',
          originalData: targetGame || { slug: targetSlug },
          context,
          request,
          env,
          additionalPurgeUrls: [
            'https://codegame.shop/api/crawler/ingest-codes',
            'https://codegame.shop/api/sync',
          ],
        });
      }

      const filteredGames = pendingGamesRaw.filter((g: any) => g && String(g.slug).toLowerCase() !== targetSlug && String(g.id).toLowerCase() !== targetSlug);
      const filteredCodes = pendingCodesRaw.filter((c: any) => c && String(c.gameSlug || c.game_slug || '').toLowerCase() !== targetSlug);

      await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', filteredGames);
      await setSettingD1(env.DB, 'wcg_crawler_pending_codes_v1', filteredCodes);

      (globalThis as any).__wcg_public_sync_cache = null;
      await invalidateCatalogEdgeCache(context as any, request, env, [
        'https://codegame.shop/api/crawler/ingest-codes',
        'https://codegame.shop/api/sync',
      ]).catch(() => {});

      return new Response(JSON.stringify({
        success: true,
        message: `Đã xóa mềm game "${targetSlug}" khỏi hàng chờ duyệt và lưu vào lịch sử thành công!`,
        removedGamesCount: pendingGamesRaw.length - filteredGames.length,
        removedCodesCount: pendingCodesRaw.length - filteredCodes.length,
      }), { headers: CORS_HEADERS });
    }

    // Xử lý action đặc biệt: Xóa game hoàn toàn khỏi catalog live (Soft-Delete Tombstone + D1 games + codes + settings wcg_admin_games_v5)
    if (body && (body.action === 'delete_game' || body.action === 'delete_game_d1')) {
      const targetSlug = String(body.slug || body.id || '').trim().toLowerCase();
      if (!targetSlug) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu slug hoặc id game cần xóa' }), { status: 400, headers: CORS_HEADERS });
      }

      let deletedCodes = 0;
      let deletedGames = 0;
      if (env.DB) {
        try {
          const cRes: any = await env.DB.prepare('DELETE FROM codes WHERE game_slug = ? OR game_slug = ?').bind(targetSlug, targetSlug.replace(/-mobile$/, '')).run();
          deletedCodes = cRes?.meta?.changes || 0;

          const gRes: any = await env.DB.prepare('DELETE FROM games WHERE slug = ? OR id = ? OR slug = ?').bind(targetSlug, targetSlug, targetSlug.replace(/-mobile$/, '')).run();
          deletedGames = gRes?.meta?.changes || 0;
        } catch (err: any) {
          console.warn('[DeleteGame] Lỗi SQL D1:', err);
        }
      }

      // Xóa khỏi wcg_admin_games_v5
      const freshActive = await getSettingD1(env.DB, 'wcg_admin_games_v5', []);
      let targetGameSnapshot: any = null;
      if (Array.isArray(freshActive)) {
        targetGameSnapshot = freshActive.find((g: any) => g && (g.slug === targetSlug || g.id === targetSlug));
        const cleanActive = freshActive.filter((g: any) => g && g.slug !== targetSlug && g.id !== targetSlug);
        if (cleanActive.length !== freshActive.length) {
          await setSettingD1(env.DB, 'wcg_admin_games_v5', cleanActive);
        }
      }

      // Xóa khỏi wcg_crawler_pending_games_v1
      const freshPending = await getSettingD1(env.DB, 'wcg_crawler_pending_games_v1', []);
      if (Array.isArray(freshPending)) {
        if (!targetGameSnapshot) {
          targetGameSnapshot = freshPending.find((g: any) => g && (g.slug === targetSlug || g.id === targetSlug));
        }
        const cleanPending = freshPending.filter((g: any) => g && g.slug !== targetSlug && g.id !== targetSlug);
        if (cleanPending.length !== freshPending.length) {
          await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', cleanPending);
        }
      }

      if (env.DB) {
        await recordSoftDelete(env.DB, {
          recordType: 'game',
          recordId: targetGameSnapshot?.id || targetSlug,
          recordSlug: targetSlug,
          title: targetGameSnapshot?.name || targetSlug,
          actor: auth.botName || 'crawler_api',
          deleteReason: body.reason || 'Xóa qua delete_game',
          originalData: targetGameSnapshot || { slug: targetSlug, deletedCodes, deletedGames },
          context,
          request,
          env,
          additionalPurgeUrls: [
            `https://codegame.shop/api/games?slug=${targetSlug}`,
            `https://codegame.shop/api/games?id=${targetSlug}`,
            new URL(`/api/games?slug=${targetSlug}`, request.url).toString(),
            `https://codegame.shop/game/${targetSlug}`,
            'https://codegame.shop/api/sync',
          ],
        });
      }

      invalidateGamesCatalogCache();
      (globalThis as any).__wcg_public_sync_cache = null;
      await invalidateCatalogEdgeCache(context as any, request, env, [
        `https://codegame.shop/api/games?slug=${targetSlug}`,
        `https://codegame.shop/api/games?id=${targetSlug}`,
        new URL(`/api/games?slug=${targetSlug}`, request.url).toString(),
        `https://codegame.shop/game/${targetSlug}`,
        'https://codegame.shop/api/sync',
      ]).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã xóa mềm game "${targetSlug}" (${deletedGames} bản ghi game, ${deletedCodes} mã code) khỏi D1 và Live Catalog!`,
          deletedGames,
          deletedCodes
        }),
        { headers: CORS_HEADERS }
      );
    }

    // Xử lý action đặc biệt: Đồng bộ toàn bộ hướng dẫn nhập code từ wcg_admin_games_v5 vào bảng games D1
    if (body && body.action === 'sync_all_instructions_to_d1') {
      const activeGamesRaw = Array.isArray(settings['wcg_admin_games_v5'])
        ? settings['wcg_admin_games_v5']
        : [];
      let updatedCount = 0;
      if (env.DB) {
        try {
          const stmts: any[] = [];
          for (const g of activeGamesRaw) {
            if (!g || !g.slug) continue;
            const slug = String(g.slug).trim().toLowerCase();
            const inst = g.instructions !== undefined && g.instructions !== null ? String(g.instructions) : '';
            const redeem = g.redeem_url || g.redeemUrl || '';
            stmts.push(
              env.DB.prepare(`
                UPDATE games SET
                  instructions = ?,
                  redeem_url = ?,
                  updated_at = datetime('now')
                WHERE slug = ? OR id = ?;
              `).bind(inst, redeem, slug, slug)
            );
          }
          for (let i = 0; i < stmts.length; i += 50) {
            await env.DB.batch(stmts.slice(i, i + 50)).catch(() => {});
          }
          updatedCount = activeGamesRaw.length;
        } catch (syncErr) {
          console.warn('[SyncInstructions D1 Warning]', syncErr);
        }
      }
      invalidateGamesCatalogCache();
      await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã đồng bộ toàn bộ hướng dẫn của ${updatedCount} game từ wcg_admin_games_v5 vào bảng games D1 thành công!`,
          totalGamesSynced: updatedCount,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // =========================================================================
    // ACTION: Di dời dữ liệu cũ - Xóa bỏ hạn giả 2026-12-31 chuyển sang NULL
    // =========================================================================
    if (body && body.action === 'migrate_remove_fake_expiry_dates') {
      if (!env.DB) {
        return new Response(
          JSON.stringify({ success: false, error: 'Database D1 không khả dụng.' }),
          { status: 500, headers: CORS_HEADERS }
        );
      }

      // 1. Kiểm tra số lượng bản ghi trong bảng codes trước khi di dời
      const totalCodesBefore = await env.DB.prepare('SELECT COUNT(*) as total FROM codes').first<any>().catch(() => ({ total: 0 }));
      const fakeCodesBefore = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM codes WHERE expires_at = '2026-12-31' OR expires_at = '2026-12-31T23:59:59Z' OR expires_at = '31/12/2026' OR expires_at LIKE '2026-12-31%'"
      ).first<any>().catch(() => ({ cnt: 0 }));

      // 2. Cập nhật bảng codes: chuyển toàn bộ 2026-12-31 sang NULL
      await env.DB.prepare(
        "UPDATE codes SET expires_at = NULL WHERE expires_at = '2026-12-31' OR expires_at = '2026-12-31T23:59:59Z' OR expires_at = '31/12/2026' OR expires_at LIKE '2026-12-31%'"
      ).run().catch((err: any) => ({ error: String(err) }));

      // Cập nhật lại active_codes_count trên bảng games để đảm bảo tính nhất quán
      await env.DB.prepare(`
        UPDATE games 
        SET active_codes_count = (
          SELECT COUNT(*) FROM codes 
          WHERE codes.game_slug = games.slug 
            AND (codes.status = 'active' OR codes.status = 'verified') 
            AND (codes.expires_at IS NULL OR codes.expires_at = '' OR codes.expires_at >= date('now'))
        )
      `).run().catch(() => {});

      // 3. Cập nhật trong system_settings: wcg_admin_custom_free_codes_v1
      let updatedCustomCount = 0;
      const customCodesRaw = await getSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1');
      if (Array.isArray(customCodesRaw)) {
        let modified = false;
        const newCustomCodes = customCodesRaw.map((c: any) => {
          if (!c) return c;
          const exp = c.expiresAt || c.expires_at || c.expiry;
          if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026' || (typeof exp === 'string' && exp.startsWith('2026-12-31'))) {
            updatedCustomCount++;
            modified = true;
            return {
              ...c,
              expiresAt: null,
              expires_at: null,
              expiry: null,
            };
          }
          return c;
        });
        if (modified) {
          await setSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1', newCustomCodes);
        }
      }

      // 4. Cập nhật trong system_settings: wcg_admin_free_codes_v5
      let updatedCatalogCount = 0;
      const catalogCodesRaw = await getSettingD1(env.DB, 'wcg_admin_free_codes_v5');
      if (Array.isArray(catalogCodesRaw)) {
        let modified = false;
        const newCatalogCodes = catalogCodesRaw.map((c: any) => {
          if (!c) return c;
          const exp = c.expiresAt || c.expires_at || c.expiry;
          if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026' || (typeof exp === 'string' && exp.startsWith('2026-12-31'))) {
            updatedCatalogCount++;
            modified = true;
            return {
              ...c,
              expiresAt: null,
              expires_at: null,
              expiry: null,
            };
          }
          return c;
        });
        if (modified) {
          await setSettingD1(env.DB, 'wcg_admin_free_codes_v5', newCatalogCodes);
        }
      }

      // 5. Cập nhật trong system_settings: wcg_admin_free_codes_v4 (nếu có)
      let updatedV4Count = 0;
      const v4CodesRaw = await getSettingD1(env.DB, 'wcg_admin_free_codes_v4');
      if (Array.isArray(v4CodesRaw)) {
        let modified = false;
        const newV4Codes = v4CodesRaw.map((c: any) => {
          if (!c) return c;
          const exp = c.expiresAt || c.expires_at || c.expiry;
          if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026' || (typeof exp === 'string' && exp.startsWith('2026-12-31'))) {
            updatedV4Count++;
            modified = true;
            return {
              ...c,
              expiresAt: null,
              expires_at: null,
              expiry: null,
            };
          }
          return c;
        });
        if (modified) {
          await setSettingD1(env.DB, 'wcg_admin_free_codes_v4', newV4Codes);
        }
      }

      // 6. Cập nhật trong system_settings: wcg_crawler_pending_codes_v1
      let updatedPendingCount = 0;
      const pendingCodesRaw = await getSettingD1(env.DB, 'wcg_crawler_pending_codes_v1');
      if (Array.isArray(pendingCodesRaw)) {
        let modified = false;
        const newPendingCodes = pendingCodesRaw.map((c: any) => {
          if (!c) return c;
          const exp = c.expiresAt || c.expires_at || c.expiry;
          if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026' || (typeof exp === 'string' && exp.startsWith('2026-12-31'))) {
            updatedPendingCount++;
            modified = true;
            return {
              ...c,
              expiresAt: null,
              expires_at: null,
              expiry: null,
            };
          }
          return c;
        });
        if (modified) {
          await setSettingD1(env.DB, 'wcg_crawler_pending_codes_v1', newPendingCodes);
        }
      }

      // 7. Xóa cache biên và cache runtime
      invalidateGamesCatalogCache();
      await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});

      // 8. Thống kê kiểm toán sau di dời
      const totalCodesAfter = await env.DB.prepare('SELECT COUNT(*) as total FROM codes').first<any>().catch(() => ({ total: 0 }));
      const remainingFakeCodes = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM codes WHERE expires_at = '2026-12-31' OR expires_at = '2026-12-31T23:59:59Z' OR expires_at = '31/12/2026' OR expires_at LIKE '2026-12-31%'"
      ).first<any>().catch(() => ({ cnt: 0 }));
      const nullExpiryCodes = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM codes WHERE expires_at IS NULL OR expires_at = ''"
      ).first<any>().catch(() => ({ cnt: 0 }));
      const realExpiryCodes = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM codes WHERE expires_at IS NOT NULL AND expires_at != ''"
      ).first<any>().catch(() => ({ cnt: 0 }));

      return new Response(
        JSON.stringify({
          success: true,
          action: 'migrate_remove_fake_expiry_dates',
          totalCodesBefore: Number(totalCodesBefore?.total || 0),
          totalCodesAfter: Number(totalCodesAfter?.total || 0),
          codesLost: Number(totalCodesBefore?.total || 0) - Number(totalCodesAfter?.total || 0),
          updatedCodesTableCount: Number(fakeCodesBefore?.cnt || 0),
          updatedCustomCount,
          updatedCatalogCount,
          updatedV4Count,
          updatedPendingCount,
          remainingFakeCodes: Number(remainingFakeCodes?.cnt || 0),
          nullExpiryCodes: Number(nullExpiryCodes?.cnt || 0),
          realExpiryCodes: Number(realExpiryCodes?.cnt || 0),
        }),
        { headers: CORS_HEADERS }
      );
    }

    // 2. Chuẩn hóa payload thành mảng các mục cần nạp (cho luồng nạp mã giftcode thông thường)
    const rawItems: any[] = [];
    if (Array.isArray(body)) {
      rawItems.push(...body);
    } else if (Array.isArray(body.items)) {
      rawItems.push(...body.items);
    } else if (body && typeof body === 'object') {
      rawItems.push(body);
    }

    if (rawItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payload không chứa dữ liệu game hoặc mã giftcode.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const activeGamesList: any[] = Array.isArray(settings['wcg_admin_games_v5'])
      ? [...settings['wcg_admin_games_v5']]
      : [...(fallbackGamesData as any[])];

    const pendingGamesList: any[] = Array.isArray(settings['wcg_crawler_pending_games_v1'])
      ? [...settings['wcg_crawler_pending_games_v1']]
      : [];

    const existingCustomCodes: any[] = Array.isArray(settings['wcg_admin_custom_free_codes_v1'])
      ? [...settings['wcg_admin_custom_free_codes_v1']]
      : [];

    const existingCatalogCodes: any[] = Array.isArray(settings['wcg_admin_free_codes_v5'])
      ? [...settings['wcg_admin_free_codes_v5']]
      : [...(fallbackCodesData as any[])];

    // Tạo tập hợp mã code hiện có theo gameSlug để chống trùng lặp (Deduplication) và chống hồi sinh mã hết hạn
    const existingCodeValuesBySlug = new Map<string, Set<string>>();
    const expiredCodeValuesBySlug = new Map<string, Set<string>>();
    const existingCodeRecordsBySlugAndUpperCode = new Map<string, any>();

    const registerExisting = (list: any[], sourceLocation: string) => {
      for (const item of list) {
        if (!item) continue;
        const rawSlug = (item.gameSlug || item.game_slug || item.slug || item.gameId || '').toLowerCase().trim();
        const rawCodeStr = String(item.code || item.codeValue || item.gift_code || '').trim();
        const upperCode = rawCodeStr.toUpperCase();
        if (!rawSlug || !upperCode) continue;

        const aliases = [
          rawSlug,
          rawSlug.replace(/-mobile$/i, ''),
          `${rawSlug}-mobile`,
          rawSlug.replace(/_/g, '-')
        ];

        const isExp = isCodeExpired(item);

        for (const alias of aliases) {
          if (!existingCodeValuesBySlug.has(alias)) {
            existingCodeValuesBySlug.set(alias, new Set());
          }
          existingCodeValuesBySlug.get(alias)!.add(upperCode);

          if (!existingCodeRecordsBySlugAndUpperCode.has(`${alias}_${upperCode}`)) {
            existingCodeRecordsBySlugAndUpperCode.set(`${alias}_${upperCode}`, {
              ...item,
              code: rawCodeStr,
              location: sourceLocation,
            });
          }

          if (isExp) {
            if (!expiredCodeValuesBySlug.has(alias)) {
              expiredCodeValuesBySlug.set(alias, new Set());
            }
            expiredCodeValuesBySlug.get(alias)!.add(upperCode);
          }
        }
      }
    };
    registerExisting(existingCustomCodes, 'custom_kv');
    registerExisting(existingCatalogCodes, 'catalog_kv');

    // Nạp thêm từ D1 codes table để đảm bảo 100% khớp dữ liệu live (khắc phục bẫy LIMIT 10000 - ISSUE-192)
    if (env.DB) {
      try {
        const payloadSlugs = Array.from(
          new Set(
            rawItems
              .flatMap((it: any) => [
                it.gameSlug || it.game_slug || it.slug || '',
                it.gameId || ''
              ])
              .map((s: string) => s.toLowerCase().trim())
              .filter(Boolean)
          )
        );
        if (payloadSlugs.length > 0 && payloadSlugs.length <= 100) {
          const placeholders = payloadSlugs.map(() => '?').join(',');
          const d1CodesRes = await env.DB.prepare(
            `SELECT game_slug, code, rewards, status, expires_at, source FROM codes WHERE LOWER(game_slug) IN (${placeholders})`
          ).bind(...payloadSlugs).all<any>().catch(() => ({ results: [] as any[] }));
          if (Array.isArray(d1CodesRes?.results) && d1CodesRes.results.length > 0) {
            registerExisting(d1CodesRes.results, 'live_catalog_d1');
          }
        } else {
          const d1CodesRes = await env.DB.prepare(
            'SELECT game_slug, code, rewards, status, expires_at, source FROM codes LIMIT 100000'
          ).all<any>().catch(() => ({ results: [] as any[] }));
          if (Array.isArray(d1CodesRes?.results) && d1CodesRes.results.length > 0) {
            registerExisting(d1CodesRes.results, 'live_catalog_d1');
          }
        }
      } catch (d1Err) {
        console.warn('[IngestCodes D1 preload warning]', d1Err);
      }
    }

    const newlyAddedCodes: any[] = [];
    const executionResults: any[] = [];
    const allDroppedCodes: Array<{ code: string; reason: string; gameInput?: string }> = [];
    let stateModified = false;
    let autoPublishedCount = 0;

    // 4. Xử lý từng game được gửi tới
    for (const rawItem of rawItems) {
      const inputGameName = String(
        rawItem.gameSlug ||
        rawItem.game_slug ||
        rawItem.slug ||
        rawItem.gameName ||
        rawItem.game_name ||
        rawItem.name ||
        rawItem.game ||
        ''
      ).trim();
      const itemDroppedCodes: Array<{ code: string; reason: string }> = [];
      const codesToIngest = extractCodesFromPayload(rawItem, itemDroppedCodes);
      itemDroppedCodes.forEach((d) => allDroppedCodes.push({ ...d, gameInput: inputGameName }));

      // Trích xuất Cách Nhập Code (instructions) và Link nhập quà (redeemUrl)
      const hasExplicitInstructions =
        rawItem.instructions !== undefined ||
        rawItem.instructionsText !== undefined ||
        rawItem.instructions_text !== undefined ||
        rawItem.guide !== undefined ||
        rawItem.guideText !== undefined ||
        rawItem.huongDan !== undefined ||
        rawItem.huong_dan !== undefined ||
        rawItem.cachNhapCode !== undefined ||
        rawItem.cach_nhap_code !== undefined ||
        rawItem.howToRedeem !== undefined ||
        rawItem.how_to_redeem !== undefined ||
        body.instructions !== undefined ||
        body.instructionsText !== undefined ||
        body.instructions_text !== undefined ||
        body.huongDan !== undefined;

      let extractedInstructions: string | undefined = undefined;
      if (hasExplicitInstructions) {
        const rawVal =
          rawItem.instructions !== undefined ? rawItem.instructions :
          rawItem.instructionsText !== undefined ? rawItem.instructionsText :
          rawItem.instructions_text !== undefined ? rawItem.instructions_text :
          rawItem.guide !== undefined ? rawItem.guide :
          rawItem.guideText !== undefined ? rawItem.guideText :
          rawItem.huongDan !== undefined ? rawItem.huongDan :
          rawItem.huong_dan !== undefined ? rawItem.huong_dan :
          rawItem.cachNhapCode !== undefined ? rawItem.cachNhapCode :
          rawItem.cach_nhap_code !== undefined ? rawItem.cach_nhap_code :
          rawItem.howToRedeem !== undefined ? rawItem.howToRedeem :
          rawItem.how_to_redeem !== undefined ? rawItem.how_to_redeem :
          body.instructions !== undefined ? body.instructions :
          body.instructionsText !== undefined ? body.instructionsText :
          body.instructions_text !== undefined ? body.instructions_text :
          body.huongDan !== undefined ? body.huongDan :
          '';
        extractedInstructions = (rawVal === null || rawVal === undefined) ? '' : String(rawVal).trim();
      }

      const hasExplicitRedeemUrl =
        rawItem.redeemUrl !== undefined ||
        rawItem.redeem_url !== undefined ||
        rawItem.link_nhap_code !== undefined ||
        rawItem.linkNhapCode !== undefined ||
        rawItem.redemption_url !== undefined ||
        body.redeemUrl !== undefined ||
        body.redeem_url !== undefined;

      let extractedRedeemUrl: string | undefined = undefined;
      if (hasExplicitRedeemUrl) {
        const rawVal =
          rawItem.redeemUrl !== undefined ? rawItem.redeemUrl :
          rawItem.redeem_url !== undefined ? rawItem.redeem_url :
          rawItem.link_nhap_code !== undefined ? rawItem.link_nhap_code :
          rawItem.linkNhapCode !== undefined ? rawItem.linkNhapCode :
          rawItem.redemption_url !== undefined ? rawItem.redemption_url :
          body.redeemUrl !== undefined ? body.redeemUrl :
          body.redeem_url !== undefined ? body.redeem_url :
          '';
        extractedRedeemUrl = (rawVal === null || rawVal === undefined) ? '' : String(rawVal).trim();
      }

      const isUpdateInstructionsAction =
        rawItem.action === 'update_instructions' ||
        rawItem.action === 'set_instructions' ||
        body.action === 'update_instructions' ||
        body.action === 'set_instructions';
      const hasInstructionsUpdate = Boolean(hasExplicitInstructions || hasExplicitRedeemUrl);

      if (!inputGameName) {
        executionResults.push({
          success: false,
          error: 'Thiếu tên game (gameName)',
          inputName: '',
          codesCount: codesToIngest.length,
        });
        continue;
      }

      // Nếu không có mã code VÀ không có nội dung hướng dẫn nhập code hợp lệ
      if (codesToIngest.length === 0 && !hasInstructionsUpdate && !isUpdateInstructionsAction) {
        executionResults.push({
          success: false,
          error: 'Không tìm thấy mã giftcode hoặc nội dung hướng dẫn nhập code trong payload.',
          inputName: inputGameName,
          codesCount: 0,
        });
        continue;
      }

      // 4.1. LỌC TÊN GAME THÔNG MINH
      let matchResult = findBestMatchingGame(inputGameName, activeGamesList, pendingGamesList);

      if (matchResult && matchResult.ambiguous) {
        executionResults.push({
          success: false,
          error: `Tên game "${inputGameName}" không rõ ràng, có nhiều game tương đồng (${matchResult.candidates?.map(c => c.name).join(', ')}). Vui lòng gửi kèm "gameSlug" hoặc "slug" chính xác.`,
          ambiguous: true,
          candidates: matchResult.candidates,
          inputName: inputGameName,
          receivedCodes: codesToIngest.map((c) => c.code),
        });
        continue;
      }

      if (!matchResult) {
        if (rawItem.autoQueueNewGame || body.autoQueueNewGame || rawItem.createIfNotFound || body.createIfNotFound) {
          const autoSlug = stripAccents(cleanGameSearchTerm(inputGameName)).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `game-${Date.now()}`;
          const isRoblox = isConfirmedRobloxGame(rawItem) || /roblox/i.test(String(auth.botName || ''));

          let autoIconUrl = '';
          let autoLocalIconPath = '';
          let autoMissingIcon = true;
          let autoHasIcon = false;

          const rawIconCandidate = String(rawItem.iconUrl || rawItem.icon_url || rawItem.icon || '').trim();
          if (rawIconCandidate.startsWith('http://') || rawIconCandidate.startsWith('https://') || rawIconCandidate.startsWith('data:image')) {
            autoIconUrl = rawIconCandidate;
            autoHasIcon = true;
            autoMissingIcon = false;
          } else {
            const exists = await verifyLocalIconExists(`/game_icons/${autoSlug}.webp`, request.url, (env as any).ASSETS);
            if (exists) {
              autoIconUrl = `/game_icons/${autoSlug}.webp`;
              autoLocalIconPath = `/game_icons/${autoSlug}.webp`;
              autoHasIcon = true;
              autoMissingIcon = false;
            }
          }

          const newPendingGame = {
            id: autoSlug,
            name: inputGameName,
            slug: autoSlug,
            developer: rawItem.developer || rawItem.publisher || null,
            publisher: rawItem.publisher || rawItem.developer || null,
            category: rawItem.category || null,
            platform: rawItem.platform || null,
            rating: Number(rawItem.rating || 4.8),
            installs: rawItem.installs || null,
            iconUrl: autoIconUrl,
            localIconPath: autoLocalIconPath,
            missing_icon: autoMissingIcon,
            has_icon: autoHasIcon,
            description: rawItem.description ? String(rawItem.description).trim() : '',
            instructions: extractedInstructions || (isRoblox ? `Bước 1: Mở Roblox và tham gia game ${inputGameName}.\nBước 2: Tìm biểu tượng Code / Twitter / Cài đặt.\nBước 3: Nhập chính xác mã giftcode và nhấn Đổi quà.` : ''),
            redeemUrl: extractedRedeemUrl || '',
            source: rawItem.source || auth.botName || 'Auto-Queued Ingest',
            sourceType: 'auto_queue',
            status: 'PENDING',
            activeCodesCount: codesToIngest.length,
            codes_count: codesToIngest.length,
            autoPublishEligible: true,
            crawledAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          pendingGamesList.unshift(newPendingGame);
          stateModified = true;
          matchResult = {
            game: newPendingGame,
            source: 'pending',
            matchConfidence: 1.0,
            matchType: 'auto_queued',
          };
        } else {
          executionResults.push({
            success: false,
            error: `Không tìm thấy game nào khớp với "${inputGameName}". Vui lòng kiểm tra lại tên game hoặc tạo trước trong Hàng Chờ Duyệt (hoặc dùng action: "queue_game").`,
            inputName: inputGameName,
            receivedCodes: codesToIngest.map((c) => c.code),
          });
          continue;
        }
      }

      const { game: matchedGame, source, matchConfidence, matchType } = matchResult;
      const gameSlug = String(matchedGame.slug || matchedGame.id).trim().toLowerCase();
      const gameName = String(matchedGame.name || inputGameName).trim();
      const nowIso = new Date().toISOString();

      // 4.2. TRƯỜNG HỢP: CHỈ CẬP NHẬT HOẶC XÓA CÁCH NHẬP CODE (Không có mã code đính kèm)
      if (codesToIngest.length === 0 && (hasInstructionsUpdate || isUpdateInstructionsAction)) {
        let targetInstructions: string;
        let targetRedeemUrl: string;

        // Vấn đề 2: Cho phép gửi instructions: "" hoặc null tường minh để xóa sạch cả instructions và redeem_url
        if (hasExplicitInstructions && extractedInstructions === '') {
          targetInstructions = '';
          targetRedeemUrl = (hasExplicitRedeemUrl && extractedRedeemUrl) ? extractedRedeemUrl : '';
        } else if (hasExplicitInstructions) {
          targetInstructions = extractedInstructions!;
          const currentRedeem = source === 'active'
            ? (activeGamesList.find(g => g && (g.slug === gameSlug || g.id === gameSlug))?.redeem_url || '')
            : (pendingGamesList.find(p => p && (p.slug === gameSlug || p.id === gameSlug))?.redeemUrl || '');
          targetRedeemUrl = hasExplicitRedeemUrl ? extractedRedeemUrl! : currentRedeem;
        } else {
          // Chỉ cập nhật redeemUrl
          const currentInst = source === 'active'
            ? (activeGamesList.find(g => g && (g.slug === gameSlug || g.id === gameSlug))?.instructions || '')
            : (pendingGamesList.find(p => p && (p.slug === gameSlug || p.id === gameSlug))?.instructions || '');
          targetInstructions = currentInst;
          targetRedeemUrl = extractedRedeemUrl || '';
        }

        if (source === 'active') {
          const activeIdx = activeGamesList.findIndex((g) => g && (g.slug === gameSlug || g.id === gameSlug));
          if (activeIdx !== -1) {
            activeGamesList[activeIdx] = {
              ...activeGamesList[activeIdx],
              instructions: targetInstructions,
              redeem_url: targetRedeemUrl,
              updated_at: nowIso,
            };
            stateModified = true;
          }
        } else if (source === 'pending') {
          const pendingIdx = pendingGamesList.findIndex((p) => p && (p.slug === gameSlug || p.id === gameSlug));
          if (pendingIdx !== -1) {
            pendingGamesList[pendingIdx] = {
              ...pendingGamesList[pendingIdx],
              instructions: targetInstructions,
              redeemUrl: targetRedeemUrl,
              updated_at: nowIso,
            };
            stateModified = true;
          }
        }

        executionResults.push({
          success: true,
          action: 'INSTRUCTIONS_UPDATED',
          inputName: inputGameName,
          matchedGame: {
            id: gameSlug,
            slug: gameSlug,
            name: gameName,
            publisher: matchedGame.publisher || matchedGame.developer || 'NPH Chính Thức',
            icon_url: matchedGame.icon_url || `/game_icons/${gameSlug}.webp`,
            instructions: targetInstructions,
            redeem_url: targetRedeemUrl,
          },
          sourceBeforeIngest: source,
          matchType,
          matchConfidence,
          instructionsUpdated: true,
          redeemUrlUpdated: Boolean(targetRedeemUrl),
          message: targetInstructions === ''
            ? `Đã xóa hướng dẫn nhập code của game "${gameName}" theo yêu cầu.`
            : `Đã cập nhật cách nhập code cho game "${gameName}" thành công!`,
        });
        continue;
      }

      // Nạp mã code trực tiếp từ D1 table codes cho gameSlug này nếu chưa nạp (đảm bảo số liệu added vs duplicates chính xác 100%)
      if (env.DB && !existingCodeValuesBySlug.has(gameSlug)) {
        try {
          const d1Res = await env.DB.prepare(
            'SELECT game_slug, code, rewards, status, expires_at, source FROM codes WHERE LOWER(game_slug) = ? OR LOWER(game_slug) = ?'
          ).bind(gameSlug, gameSlug.replace(/-mobile$/i, '')).all<any>();
          if (Array.isArray(d1Res?.results) && d1Res.results.length > 0) {
            registerExisting(d1Res.results, 'live_d1_per_game');
          }
        } catch (e) {
          console.warn('[IngestCodes D1 per-game query warning]', e);
        }
      }

      const existingCodesSet = existingCodeValuesBySlug.get(gameSlug) || new Set<string>();
      const addedForThisGame: string[] = [];
      const addedUsableForThisGame: string[] = [];
      const duplicateCodes: string[] = [];
      const duplicateDetails: any[] = [];
      const updatedMetadataCodes: string[] = [];

      // 4.3. LỌC TRÙNG & TẠO BẢN GHI MÃ CODE MỚI
      for (const c of codesToIngest) {
        const upperCode = c.code.toUpperCase();
        const wasKnownExpired = Boolean(expiredCodeValuesBySlug.get(gameSlug)?.has(upperCode));
        const isExp = c.isExpired || wasKnownExpired || (c.rawStatus && (String(c.rawStatus).toLowerCase() === 'expired' || String(c.rawStatus).toLowerCase() === 'hết hạn'));
        const codeStatus = isExp ? 'EXPIRED' : 'ACTIVE';

        if (existingCodesSet.has(upperCode)) {
          duplicateCodes.push(c.code);
          const existingRec = existingCodeRecordsBySlugAndUpperCode.get(`${gameSlug}_${upperCode}`);
          duplicateDetails.push({
            code: c.code,
            gameSlug,
            status: existingRec?.status || (wasKnownExpired ? 'expired' : 'active'),
            rewards: existingRec?.rewards || '',
            existingLocation: existingRec?.location || 'live_catalog_d1',
            reason: 'Mã đã tồn tại trên hệ thống'
          });

          // B4: Cập nhật metadata nếu có thông tin hạn/thưởng/trạng thái mới hoặc cờ updateMetadata
          const hasNewMeta = Boolean(
            (c.expiresAt && c.expiresAt !== existingRec?.expires_at) ||
            (c.rewards && c.rewards !== existingRec?.rewards && c.rewards !== 'Thưởng của NPH') ||
            (c.rawStatus !== undefined) ||
            body.updateMetadata ||
            rawItem.updateMetadata ||
            (c as any).updateMetadata
          );

          if (env.DB) {
            await env.DB.prepare(`
              UPDATE codes SET
                status = CASE WHEN ? IS NOT NULL THEN ? ELSE status END,
                expires_at = CASE WHEN ? IS NOT NULL THEN ? ELSE expires_at END,
                rewards = CASE WHEN ? IS NOT NULL AND ? != 'Thưởng của NPH' THEN ? ELSE rewards END,
                code = ? -- B3: Luôn cập nhật lại case chuẩn xác nếu nguồn cung cấp case chuẩn
              WHERE (game_slug = ? OR game_slug = ?) AND UPPER(code) = ?
            `).bind(
              c.rawStatus ? (isExp ? 'expired' : 'active') : null,
              isExp ? 'expired' : 'active',
              c.expiresAt ? c.expiresAt : null,
              c.expiresAt || null,
              c.rewards || null,
              c.rewards || null,
              c.rewards || null,
              c.code,
              gameSlug,
              gameSlug.replace(/-mobile$/i, ''),
              upperCode
            ).run().catch(() => {});
          }

          // Cập nhật trong existingCustomCodes
          const existingIdx = existingCustomCodes.findIndex((ec) =>
            ec &&
            (ec.gameSlug === gameSlug || ec.slug === gameSlug || ec.gameId === gameSlug) &&
            String(ec.code || ec.codeValue || '').toUpperCase() === upperCode
          );
          if (existingIdx !== -1) {
            existingCustomCodes[existingIdx] = {
              ...existingCustomCodes[existingIdx],
              code: c.code, // Cập nhật case
              codeValue: c.code,
              expiresAt: c.expiresAt || existingCustomCodes[existingIdx].expiresAt,
              expires_at: c.expiresAt || existingCustomCodes[existingIdx].expires_at,
              expiry: c.expiresAt || existingCustomCodes[existingIdx].expiry,
              status: codeStatus,
              is_active: !isExp,
              rewards: (c.rewards && c.rewards !== 'Thưởng của NPH') ? c.rewards : existingCustomCodes[existingIdx].rewards,
              updatedAt: nowIso,
              updated_at: nowIso,
            };
            stateModified = true;
          }

          if (hasNewMeta) {
            updatedMetadataCodes.push(c.code);
            stateModified = true;
          }
          continue;
        }

        const newCodeRecord = {
          id: `code_${gameSlug}_${encodeURIComponent(c.code).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          gameId: gameSlug,
          gameSlug: gameSlug,
          game_slug: gameSlug,
          slug: gameSlug,
          gameName: gameName,
          code: c.code, // B3: Giữ nguyên case gốc phân biệt hoa/thường!
          codeValue: c.code,
          code_value: c.code,
          gift_code: c.code,
          rewards: c.rewards,
          description: c.rewards,
          status: codeStatus,
          is_active: !isExp,
          is_verified: true,
          isVerified: true,
          expires_at: c.expiresAt,
          expiresAt: c.expiresAt,
          expiry: c.expiresAt,
          sourceUrl: rawItem.sourceUrl || `https://codegame.shop/game/${gameSlug}`,
          source: rawItem.source || auth.botName || 'Muse External Ingest API',
          extractionMethod: c.extractionMethod || 'api',
          crossCheckCount: c.crossCheckCount || 1,
          crossCheckSources: c.crossCheckSources || (rawItem.source ? [rawItem.source] : []),
          scoreReasons: c.scoreReasons || [],
          isConflicted: Boolean(c.isConflicted),
          conflictNote: c.conflictNote || '',
          isStaleSource: Boolean(c.isStaleSource),
          copyCount: 100 + Math.floor(Math.random() * 200),
          createdAt: nowIso,
          created_at: nowIso,
          added_at: nowIso,
        };

        existingCodesSet.add(upperCode);
        existingCodeValuesBySlug.set(gameSlug, existingCodesSet);
        if (isExp) {
          const expSet = expiredCodeValuesBySlug.get(gameSlug) || new Set<string>();
          expSet.add(upperCode);
          expiredCodeValuesBySlug.set(gameSlug, expSet);
        } else {
          addedUsableForThisGame.push(c.code);
        }
        newlyAddedCodes.push(newCodeRecord);
        existingCustomCodes.unshift(newCodeRecord);
        addedForThisGame.push(c.code);
        stateModified = true;
      }

      // 4.4. NẾU GAME NẰM TRONG HÀNG CHỜ DUYỆT (CHƯA CÓ CODE TRƯỚC ĐÓ) -> TỰ ĐỘNG XUẤT BẢN LÊN WEB KHÁCH!
      // CHẶN TUYỆT ĐỐI KHÔNG AUTO-PUBLISH GAME TEST/AUDIT LÊN LIVE CATALOG
      let wasAutoPublished = false;
      const isTestGame = String(gameSlug).toLowerCase().startsWith('test-') ||
                         String(gameSlug).toLowerCase().startsWith('test_') ||
                         String(gameName).toLowerCase().startsWith('test ') ||
                         String(gameName).toLowerCase().includes('test audit') ||
                         String(rawItem.developer || '').toLowerCase().includes('test studio');

      if (source === 'pending' && addedForThisGame.length > 0 && !isTestGame) {
        const pendingIdx = pendingGamesList.findIndex((p) => p && (p.slug === gameSlug || p.id === gameSlug));
        if (pendingIdx !== -1) {
          const pGame = pendingGamesList[pendingIdx];
          const resolvedPIcon = (pGame.iconUrl && pGame.iconUrl.startsWith('http') && !pGame.iconUrl.includes('codemoi.net'))
            ? pGame.iconUrl
            : (pGame.localIconPath || `/game_icons/${gameSlug}.webp`);
          const publishedGameRecord = {
            id: gameSlug,
            slug: gameSlug,
            name: gameName,
            publisher: pGame.developer || pGame.publisher || 'NPH Chính Thức',
            category: pGame.category || 'Nhập Vai',
            rating: pGame.rating || 4.8,
            icon_url: resolvedPIcon,
            cover_image_url: resolvedPIcon,
            banner_url: '',
            description: pGame.description || `${gameName} là tựa game mobile mới phát hành chính thức.`,
            short_description: `${gameName} - Đã cập nhật ${addedUsableForThisGame.length} giftcode còn hạn`,
            instructions: extractedInstructions || pGame.instructions || 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
            redeem_url: extractedRedeemUrl || pGame.redeemUrl || '',
            platform: 'Android, iOS, PC',
            release_date: pGame.releaseDate || nowIso.split('T')[0],
            download_android: pGame.playStoreUrl || (pGame.packageId ? `https://play.google.com/store/apps/details?id=${pGame.packageId}` : ''),
            google_play_url: pGame.playStoreUrl || '',
            android_package_name: pGame.packageId || pGame.packageName || (pGame.playStoreUrl ? (pGame.playStoreUrl.match(/id=([a-zA-Z0-9._]+)/) || [])[1] : '') || '',
            is_featured: false,
            is_hot: true,
            is_new: true,
            is_active: true,
            status: 'ACTIVE',
            codes_count: addedUsableForThisGame.length,
            active_codes_count: addedUsableForThisGame.length,
            free_codes_count: addedUsableForThisGame.length,
            total_codes_count: addedForThisGame.length,
            source: rawItem.source || auth.botName || 'Muse External Ingest API',
            created_at: nowIso,
            updated_at: nowIso,
          };

          // Chuyển sang danh mục chính thức
          activeGamesList.unshift(publishedGameRecord);
          pendingGamesList.splice(pendingIdx, 1);
          wasAutoPublished = true;
          autoPublishedCount++;
          stateModified = true;
        }
      } else if (source === 'active') {
        // Cập nhật bộ đếm code của game đang hoạt động và cập nhật cách nhập code nếu có
        const activeIdx = activeGamesList.findIndex((g) => g && (g.slug === gameSlug || g.id === gameSlug));
        if (activeIdx !== -1) {
          const currentCount = Number(activeGamesList[activeIdx].codes_count || 0);
          const updatedActiveGame: any = {
            ...activeGamesList[activeIdx],
            codes_count: currentCount + addedUsableForThisGame.length,
            active_codes_count: Number(activeGamesList[activeIdx].active_codes_count || currentCount) + addedUsableForThisGame.length,
            free_codes_count: Number(activeGamesList[activeIdx].free_codes_count || currentCount) + addedUsableForThisGame.length,
            total_codes_count: Number(activeGamesList[activeIdx].total_codes_count || currentCount) + addedForThisGame.length,
            updated_at: nowIso,
          };
          if (hasExplicitInstructions) {
            updatedActiveGame.instructions = extractedInstructions === '' ? '' : extractedInstructions!;
          }
          if (hasExplicitRedeemUrl) {
            updatedActiveGame.redeem_url = extractedRedeemUrl === '' ? '' : extractedRedeemUrl!;
          }
          activeGamesList[activeIdx] = updatedActiveGame;
          stateModified = true;
        }
      }

      executionResults.push({
        success: true,
        inputName: inputGameName,
        matchedGame: {
          id: gameSlug,
          slug: gameSlug,
          name: gameName,
          publisher: matchedGame.publisher || matchedGame.developer || 'NPH Chính Thức',
          icon_url: matchedGame.icon_url || `/game_icons/${gameSlug}.webp`,
          instructions: hasExplicitInstructions ? (extractedInstructions === '' ? '' : extractedInstructions!) : matchedGame.instructions,
          redeem_url: hasExplicitRedeemUrl ? (extractedRedeemUrl === '' ? '' : extractedRedeemUrl!) : matchedGame.redeem_url,
        },
        sourceBeforeIngest: source,
        matchType,
        matchConfidence,
        autoPublished: wasAutoPublished,
        instructionsUpdated: Boolean(hasExplicitInstructions),
        redeemUrlUpdated: Boolean(hasExplicitRedeemUrl),
        receivedCount: codesToIngest.length,
        addedCount: addedForThisGame.length,
        duplicateCount: duplicateCodes.length,
        updatedMetadataCount: updatedMetadataCodes.length,
        droppedCount: itemDroppedCodes.length,
        addedCodes: addedForThisGame,
        duplicateCodes,
        duplicateDetails,
        updatedMetadataCodes,
        droppedCodes: itemDroppedCodes,
      });
    }

    // 5. LƯU VÀO D1 DATABASE & ĐỒNG BỘ NGUYÊN TỬ (ATOMIC DELTA RE-FETCH MERGE)
    if (stateModified) {
      const nowIso = new Date().toISOString();
      // 5.0. Re-fetch FRESH settings from D1 ngay trước khi lưu để chống Race Condition / Overwrite
      const freshD1Settings = await getMultipleSettingsD1(env.DB, [
        'wcg_admin_custom_free_codes_v1',
        'wcg_admin_games_v5',
        'wcg_crawler_pending_games_v1',
        'wcg_admin_free_codes_v5',
      ]);

      // 5.1. Merge mã code mới vào danh sách tươi từ D1
      const freshCustomCodes: any[] = Array.isArray(freshD1Settings['wcg_admin_custom_free_codes_v1'])
        ? [...freshD1Settings['wcg_admin_custom_free_codes_v1']]
        : [];

      const customCodesMap = new Map<string, any>();
      for (const fc of freshCustomCodes) {
        if (!fc) continue;
        const s = String(fc.gameSlug || fc.slug || fc.gameId || '').trim().toLowerCase();
        const c = String(fc.code || fc.codeValue || '').trim().toUpperCase();
        if (s && c) {
          customCodesMap.set(`${s}_${c}`, fc);
        }
      }

      for (const nc of newlyAddedCodes) {
        const s = String(nc.gameSlug || nc.slug || nc.gameId || '').trim().toLowerCase();
        const c = String(nc.code || nc.codeValue || '').trim().toUpperCase();
        if (s && c) {
          customCodesMap.set(`${s}_${c}`, nc);
        }
      }

      const mergedCustomCodesList = Array.from(customCodesMap.values());
      await setSettingD1(env.DB, 'wcg_admin_custom_free_codes_v1', mergedCustomCodesList);

      // 5.2. Merge Active Games & Auto-Published Games vào freshActiveGames
      const freshActiveGames: any[] = Array.isArray(freshD1Settings['wcg_admin_games_v5'])
        ? [...freshD1Settings['wcg_admin_games_v5']]
        : [...(fallbackGamesData as any[])];

      const freshPendingGames: any[] = Array.isArray(freshD1Settings['wcg_crawler_pending_games_v1'])
        ? [...freshD1Settings['wcg_crawler_pending_games_v1']]
        : [];

      const publishedSlugsSet = new Set<string>();

      for (const res of executionResults) {
        if (!res || !res.matchedGame) continue;
        const slug = String(res.matchedGame.slug).trim().toLowerCase();

        // Tính số lượng mã THỰC TẾ siêu tốc O(1)
        const realCount = countRealCodesForSlug(
          { slug, id: slug, name: res.matchedGame.name },
          mergedCustomCodesList,
          Array.isArray(freshD1Settings['wcg_admin_free_codes_v5']) ? freshD1Settings['wcg_admin_free_codes_v5'] : [],
          Array.isArray(fallbackCodesData) ? (fallbackCodesData as any[]) : []
        );

        const activeIdx = freshActiveGames.findIndex((g) => g && (String(g.slug).toLowerCase() === slug || String(g.id).toLowerCase() === slug));

        if (res.autoPublished) {
          publishedSlugsSet.add(slug);
          const pGame = freshPendingGames.find((p) => p && (String(p.slug).toLowerCase() === slug || String(p.id).toLowerCase() === slug));
          const pDeveloper = pGame?.developer || pGame?.publisher || res.matchedGame.publisher || 'NPH Chính Thức';
          const pIcon = (pGame?.iconUrl && pGame.iconUrl.startsWith('http') && !pGame.iconUrl.includes('codemoi.net'))
            ? pGame.iconUrl
            : (pGame?.localIconPath || `/game_icons/${slug}.webp`);

          const publishedRecord = {
            id: slug,
            slug,
            name: res.matchedGame.name,
            publisher: pDeveloper,
            category: pGame?.category || 'Nhập Vai',
            rating: Number(pGame?.rating || 4.8),
            icon_url: pIcon,
            cover_image_url: pIcon,
            banner_url: pGame?.banner_url || '',
            description: pGame?.description || `${res.matchedGame.name} là tựa game mobile mới phát hành chính thức.`,
            short_description: `${res.matchedGame.name} - Đã cập nhật ${realCount} giftcode mới`,
            instructions: res.matchedGame.instructions || pGame?.instructions || 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
            redeem_url: res.matchedGame.redeem_url || pGame?.redeemUrl || '',
            platform: 'Android, iOS, PC',
            release_date: pGame?.releaseDate || nowIso.split('T')[0],
            download_android: pGame?.playStoreUrl || (pGame?.packageId ? `https://play.google.com/store/apps/details?id=${pGame.packageId}` : ''),
            google_play_url: pGame?.playStoreUrl || '',
            app_store_url: pGame?.app_store_url || '',
            android_package_name: pGame?.packageId || pGame?.packageName || '',
            is_featured: false,
            is_hot: true,
            is_new: true,
            is_active: true,
            status: 'ACTIVE',
            codes_count: realCount,
            free_codes_count: realCount,
            source: auth.botName || 'Muse External Ingest API',
            created_at: nowIso,
            updated_at: nowIso,
          };

          if (activeIdx !== -1) {
            freshActiveGames[activeIdx] = { ...freshActiveGames[activeIdx], ...publishedRecord };
          } else {
            freshActiveGames.unshift(publishedRecord);
          }
        } else if (activeIdx !== -1) {
          // Game đã active: LUÔN LUÔN cập nhật codes_count và instructions
          freshActiveGames[activeIdx] = {
            ...freshActiveGames[activeIdx],
            codes_count: realCount,
            free_codes_count: realCount,
            instructions: res.matchedGame.instructions !== undefined ? res.matchedGame.instructions : freshActiveGames[activeIdx].instructions,
            redeem_url: res.matchedGame.redeem_url !== undefined ? res.matchedGame.redeem_url : freshActiveGames[activeIdx].redeem_url,
            updated_at: nowIso,
          };
        }
      }

      // LUÔN LƯU freshActiveGames mỗi khi có mã được nạp hoặc game được xuất bản!
      await setSettingD1(env.DB, 'wcg_admin_games_v5', freshActiveGames);

      // 5.2b. Cập nhật trực tiếp vào bảng codes và games trên D1 (P1 Precomputed Columns & Instant SQL)
      try {
        const codeStmts = [];
        for (const nc of newlyAddedCodes) {
          const s = String(nc.gameSlug || nc.slug || nc.gameId || '').trim().toLowerCase();
          const c = String(nc.code || nc.codeValue || '').trim(); // B3: Giữ nguyên case phân biệt hoa/thường!
          if (!s || !c) continue;
          const id = nc.id || `code_${s}_${encodeURIComponent(c).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const rewards = decodeHtmlEntities(nc.rewards || nc.description || 'Quà tân thủ & vật phẩm ingame');
          const isExp = isCodeExpired(nc);
          const status = nc.status === 'expired' || isExp ? 'expired' : 'active';
          const expiresAt = nc.expires_at || nc.expiresAt || nc.expiry || null;
          const source = nc.source || auth.botName || 'crawler';
          const addedAt = nc.added_at || nc.updated_at || nc.created_at || nowIso;

          codeStmts.push(
            env.DB.prepare(`
              INSERT OR REPLACE INTO codes (id, game_slug, code, rewards, status, expires_at, source, added_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, s, c, rewards, status, expiresAt, source, addedAt)
          );
        }
        if (codeStmts.length > 0) {
          for (let i = 0; i < codeStmts.length; i += 50) {
            await env.DB.batch(codeStmts.slice(i, i + 50)).catch(() => {});
          }
        }

        // Cập nhật precomputed counter, instructions và redeem_url cho từng game bị ảnh hưởng
        for (const res of executionResults) {
          if (!res || !res.matchedGame) continue;
          const slug = String(res.matchedGame.slug).trim().toLowerCase();
          const targetInst = res.matchedGame.instructions !== undefined ? res.matchedGame.instructions : null;
          const targetRedeem = res.matchedGame.redeem_url !== undefined ? res.matchedGame.redeem_url : null;

          const updateRes: any = await env.DB.prepare(`
            UPDATE games SET
              total_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug),
              active_codes_count = (SELECT COUNT(*) FROM codes WHERE codes.game_slug = games.slug AND (codes.status = 'active' OR codes.status = 'verified') AND (codes.expires_at IS NULL OR codes.expires_at = '' OR codes.expires_at >= date('now'))),
              instructions = CASE WHEN ? IS NOT NULL THEN ? ELSE instructions END,
              redeem_url = CASE WHEN ? IS NOT NULL THEN ? ELSE redeem_url END,
              last_code_at = datetime('now'),
              status = 'ACTIVE',
              is_active = 1,
              updated_at = datetime('now')
            WHERE slug = ? OR id = ?;
          `).bind(targetInst, targetInst, targetRedeem, targetRedeem, slug, slug).run().catch(() => null);

          // Nếu game chưa có trong bảng games D1, thêm mới vào bảng games
          if (!updateRes || updateRes.meta?.changes === 0) {
            const activeRec = freshActiveGames.find(g => g && (String(g.slug).toLowerCase() === slug || String(g.id).toLowerCase() === slug));
            if (activeRec) {
              await env.DB.prepare(`
                INSERT INTO games (
                  id, name, slug, publisher, category, rating, icon_url, banner_url,
                  description, instructions, platform, release_date, download_android,
                  google_play_url, app_store_url, android_package_name, redeem_url,
                  is_featured, is_hot, is_new, is_active, status, active_codes_count, total_codes_count, last_code_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(slug) DO UPDATE SET
                  instructions = excluded.instructions,
                  redeem_url = excluded.redeem_url,
                  updated_at = datetime('now');
              `).bind(
                activeRec.id || slug, activeRec.name || slug, slug, activeRec.publisher || 'NPH Chính Thức',
                activeRec.category || 'Game Hot', activeRec.rating || 4.8, activeRec.icon_url || `/game_icons/${slug}.webp`,
                activeRec.banner_url || '', activeRec.description || '', activeRec.instructions || '',
                activeRec.platform || 'Mobile / PC', activeRec.release_date || '', activeRec.download_android || '',
                activeRec.google_play_url || '', activeRec.app_store_url || '', activeRec.android_package_name || '',
                activeRec.redeem_url || '', 0, 0, 1, 1, 'ACTIVE',
                activeRec.codes_count || 0, activeRec.codes_count || 0
              ).run().catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('[IngestCodes D1 Table Sync Warning]', err);
      }

      // 5.3. Loại bỏ game đã xuất bản khỏi freshPendingGames
      if (publishedSlugsSet.size > 0) {
        const remainingFreshPending = freshPendingGames.filter(
          (p) => p && !publishedSlugsSet.has(String(p.slug || p.id || '').trim().toLowerCase())
        );
        await setSettingD1(env.DB, 'wcg_crawler_pending_games_v1', remainingFreshPending);
      }

      // 5.4. Xóa Cache Biên (Edge Cache)
      invalidateGamesCatalogCache();
      const ingestedSlugs = executionResults.map((r) => r.matchedGame?.slug).filter(Boolean);
      const specificGameUrls: string[] = [];
      for (const s of ingestedSlugs) {
        specificGameUrls.push(
          `https://codegame.shop/api/games?slug=${s}`,
          `https://codegame.shop/api/games?id=${s}`,
          `https://web-code-game.pages.dev/api/games?slug=${s}`,
          `https://web-code-game.pages.dev/api/games?id=${s}`,
          new URL(`/api/games?slug=${s}`, request.url).toString(),
          new URL(`/api/games?id=${s}`, request.url).toString(),
          `https://codegame.shop/game/${s}`,
          `https://web-code-game.pages.dev/game/${s}`,
          new URL(`/game/${s}`, request.url).toString()
        );
      }
      specificGameUrls.push(
        'https://codegame.shop/api/games',
        'https://web-code-game.pages.dev/api/games',
        new URL('/api/games', request.url).toString()
      );
      await invalidateCatalogEdgeCache(context as any, request, env, specificGameUrls).catch(() => {});
    }

    // 6. Ghi nhật ký API Log
    try {
      const existingLogs = (await getSettingD1(env.DB, 'wcg_crawler_api_logs_v1')) || [];
      const logsArray = Array.isArray(existingLogs) ? existingLogs : [];
      const totalInstructionsUpdated = executionResults.filter((r) => r.instructionsUpdated).length;
      const newLogEntry = {
        id: `api_log_${Date.now()}`,
        botName: auth.botName,
        sourceIp: request.headers.get('CF-Connecting-IP') || 'unknown',
        totalItemsProcessed: rawItems.length,
        totalCodesReceived: rawItems.reduce((acc, it) => acc + extractCodesFromPayload(it).length, 0),
        totalCodesAdded: newlyAddedCodes.length,
        totalInstructionsUpdated,
        autoPublishedGamesCount: autoPublishedCount,
        details: executionResults.map((r) => ({
          input: r.inputName,
          matched: r.matchedGame?.name,
          added: r.addedCount || 0,
          instructionsUpdated: Boolean(r.instructionsUpdated),
          status: r.success ? 'SUCCESS' : 'FAILED',
        })),
        timestamp: new Date().toISOString(),
      };
      logsArray.unshift(newLogEntry);
      const trimmedLogs = logsArray.slice(0, 50); // Giữ lại 50 logs gần nhất
      await setSettingD1(env.DB, 'wcg_crawler_api_logs_v1', trimmedLogs);
    } catch {}

    const totalAdded = newlyAddedCodes.length;
    const totalDuplicates = executionResults.reduce((acc, r) => acc + (r.duplicateCount || 0), 0);
    const totalInstructionsUpdated = executionResults.filter((r) => r.instructionsUpdated).length;

    let summaryMessage = `Đã xử lý thành công! Nạp mới ${totalAdded} mã code, bỏ qua ${totalDuplicates} mã trùng lặp.`;
    if (totalAdded === 0 && totalInstructionsUpdated > 0) {
      summaryMessage = `Đã cập nhật cách nhập code thành công cho ${totalInstructionsUpdated} tựa game!`;
    } else if (totalAdded > 0 && totalInstructionsUpdated > 0) {
      summaryMessage = `Đã xử lý thành công! Nạp mới ${totalAdded} mã code và cập nhật cách nhập code cho ${totalInstructionsUpdated} tựa game.`;
    }

    return new Response(
      JSON.stringify(
        {
          success: true,
          message: summaryMessage,
          botName: auth.botName,
          totalAdded,
          totalDuplicates,
          totalUpdatedMetadata: executionResults.reduce((acc, r) => acc + (r.updatedMetadataCount || 0), 0),
          totalDroppedCodes: allDroppedCodes.length,
          totalInstructionsUpdated,
          autoPublishedGamesCount: autoPublishedCount,
          results: executionResults,
          droppedCodes: allDroppedCodes,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Lỗi máy chủ khi nạp giftcode: ' + (err?.message || String(err)),
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
