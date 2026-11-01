import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
  computeSha256,
  formatScopes,
  parseScopes,
} from '../../services/mission_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

// Seed initial default keys if not present
async function ensureDefaultPresetKeys(env: Env) {
  if (!env.DB) return;

  const existingRows = await env.DB.prepare('SELECT id, scope, raw_key FROM mission_ai_api_keys').all<any>();
  const list = existingRows?.results || [];

  const nowIso = new Date().toISOString();
  // 30 days expiration default for presets, or permanent for master
  const expires30d = new Date(Date.now() + 30 * 86400000).toISOString();
  const expires90d = new Date(Date.now() + 90 * 86400000).toISOString();

  // 1. Preset News Full Key
  const hasNews = list.some((r) => String(r.scope).toUpperCase() === 'NEWS_FULL');
  if (!hasNews) {
    const rawKey = 'wcg_news_9f81a7428c0349b1e56d7821c9e4210378b6ad4e';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_news_9f81••••••••••••••••••••ad4e';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_news_full', 'Toàn Quyền Tin Tức (News Full Access)', ?, ?, 'NEWS_FULL', 'Toàn quyền viết bài, sửa nội dung, xóa bài vĩnh viễn và đặt lịch hẹn đăng bài chuẩn SEO.', ?, ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, expires90d, rawKey, nowIso).run().catch(() => {});
  }

  // 2. Preset Missions Full Key
  const hasMissions = list.some((r) => String(r.scope).toUpperCase() === 'MISSIONS_FULL');
  if (!hasMissions) {
    const rawKey = 'wcg_mis_4718cf92b8410d3e5a7b6920f18c3a5091d84b2c';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_mis_4718••••••••••••••••••••4b2c';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_missions_full', 'Toàn Quyền Nhiệm Vụ (Missions Full Access)', ?, ?, 'MISSIONS_FULL', 'Toàn quyền tạo chiến dịch nhiệm vụ, nạp kho code thưởng, duyệt và từ chối bài nộp.', ?, ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, expires90d, rawKey, nowIso).run().catch(() => {});
  }

  // 3. Preset AI Pine Review Key
  const hasReview = list.some((r) => ['MISSIONS_REVIEW', 'REVIEW_ONLY'].includes(String(r.scope).toUpperCase()));
  if (!hasReview) {
    const rawKey = 'wcg_ai_b729ac1053fe84d29c81472e39b0a61582e74d1a';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_ai_b729••••••••••••••••••••4d1a';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_missions_review', 'Thẩm Định Nhiệm Vụ Pine AI (Missions Reviewer)', ?, ?, 'MISSIONS_REVIEW', 'Dành riêng cho AI Pine tra cứu danh sách nộp chờ duyệt và gửi kết quả thẩm định tự động.', ?, ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, expires30d, rawKey, nowIso).run().catch(() => {});
  }

  // 4. Preset Admin Full Key
  const hasAdmin = list.some((r) => ['ADMIN_FULL', 'FULL'].includes(String(r.scope).toUpperCase()) && r.id !== 'ak_1793169536801_vjxp');
  if (!hasAdmin) {
    const rawKey = 'wcg_adm_c8301fa9e4210d73b5a192847c501e3b6a947d10';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_adm_c830••••••••••••••••••••7d10';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_admin_full', 'Toàn Quyền Quản Trị & Đồng Bộ (Master Admin Full)', ?, ?, 'ADMIN_FULL', 'Toàn quyền quản trị cấp cao, gọi được mọi API admin và đồng bộ dữ liệu hai chiều.', '', ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, rawKey, nowIso).run().catch(() => {});
  }

  // 5. Preset Versatile Multi-Scope Key (Khóa API Đa Năng - 1 mã set mọi quyền)
  const hasMulti = list.some((r) => r.id === 'ak_preset_multi_versatile');
  if (!hasMulti) {
    const rawKey = 'wcg_multi_5a82ef419b027c4d18e3902f6a7d1b82c9e5041a';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_multi_5a82••••••••••••••••••••041a';
    const multiScope = 'NEWS_FULL,MISSIONS_FULL,GAMES_FULL,GIVEAWAYS_FULL,EVENT_SCHEDULER_FULL,STORE_FULL,MEMBERS_FULL,SYNC_FULL,API_KEYS_FULL';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_multi_versatile', 'Khóa API Đa Năng (Universal Versatile Key)', ?, ?, ?, 'Khóa API Đa Năng cho phép Quản trị viên dùng 1 mã duy nhất để cấu hình và set linh hoạt mọi quyền trên web.', '', ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, multiScope, rawKey, nowIso).run().catch(() => {});
  }

  // 6. Preset Giveaways Full Key (Toàn Quyền Quản Lý Giveaway)
  const hasGiveaways = list.some((r) => String(r.scope).toUpperCase() === 'GIVEAWAYS_FULL' || r.id === 'ak_preset_giveaways_full');
  if (!hasGiveaways) {
    const rawKey = 'wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_gw_7193••••••••••••••••••••4b2a';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_giveaways_full', 'Toàn Quyền Giveaway (Giveaways Full Access)', ?, ?, 'GIVEAWAYS_FULL', 'Toàn quyền quản trị chiến dịch Giveaway, thêm/sửa/xóa đợt phát, nạp kho mã giftcode, bật tắt sự kiện và reset thời gian hồi chiêu.', ?, ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, expires90d, rawKey, nowIso).run().catch(() => {});
  }

  // 7. Preset Event Scheduler Full Key (Toàn Quyền Lịch Sự Kiện & Đếm Ngược)
  const hasEventScheduler = list.some((r) => String(r.scope).toUpperCase() === 'EVENT_SCHEDULER_FULL' || r.id === 'ak_preset_event_scheduler_full');
  if (!hasEventScheduler) {
    const rawKey = 'wcg_ev_8392cd51a704ef12b94a61358c701d94ea602b8f';
    const keyHash = await computeSha256(rawKey);
    const keyPrefix = 'wcg_ev_8392••••••••••••••••••••2b8f';
    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES ('ak_preset_event_scheduler_full', 'Toàn Quyền Lịch Sự Kiện & Đếm Ngược (Event Scheduler Full)', ?, ?, 'EVENT_SCHEDULER_FULL', 'Toàn quyền tạo lịch đếm ngược tự động, lên lịch phát code/flash sale, bật tắt trạng thái và ghim banner.', ?, ?, 1, '', ?)
    `).bind(keyHash, keyPrefix, expires90d, rawKey, nowIso).run().catch(() => {});
  }

  // Update existing key if missing raw_key for easy copy
  const existingVjxp = list.find((r) => r.id === 'ak_1793169536801_vjxp');
  if (existingVjxp && !existingVjxp.raw_key) {
    const sampleRaw = 'wcg_ai_a213b6ad39f801c4e7d2598b04a1e967c32b508f';
    const sampleHash = await computeSha256(sampleRaw);
    await env.DB.prepare(
      "UPDATE mission_ai_api_keys SET raw_key = ?, api_key_hash = ?, description = 'Khóa khởi tạo nhiệm vụ ban đầu' WHERE id = 'ak_1793169536801_vjxp'"
    ).bind(sampleRaw, sampleHash).run().catch(() => {});
  }
}

/**
 * GET /api/api-keys
 * Lấy danh sách toàn bộ các Khóa API trong hệ thống kèm thông tin phân quyền & thời hạn
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const adminCheck = await verifyAdminAuth(request, env);
    if (!adminCheck.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: adminCheck.error || 'Quyền truy cập bị từ chối.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Ensure preset keys exist so user sees all scopes ready to copy
    await ensureDefaultPresetKeys(env);

    const result = await env.DB.prepare(
      `SELECT id, key_name, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at 
       FROM mission_ai_api_keys 
       ORDER BY created_at ASC`
    ).all<any>();

    const masterSecret = env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
    const masterPrefix = masterSecret.length > 10 
      ? `${masterSecret.slice(0, 6)}••••••••••••••••••••••••••••••••••••••••••••••••••••••${masterSecret.slice(-5)}`
      : 'b4e084••••••2faef';

    const masterKeyInfo = {
      id: 'key_system_master',
      key_name: 'Khóa Quản Trị Hệ Thống (Master Key)',
      scope: 'ADMIN_FULL',
      description: 'Quyền tối cao: Toàn quyền đồng bộ hệ thống, quản lý cơ sở dữ liệu D1/KV, truy cập mọi API admin.',
      key_prefix: masterPrefix,
      raw_key: masterSecret,
      is_master: true,
      is_active: 1,
      expires_at: '', // Permanent
      last_used_at: new Date().toISOString(),
      created_at: '2026-01-01T00:00:00.000Z',
    };

    return new Response(
      JSON.stringify({
        success: true,
        master_key: masterKeyInfo,
        keys: result?.results || [],
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi tải danh sách API keys.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * POST /api/api-keys
 * Tạo khóa API mới kèm phân quyền và thời hạn hiệu lực (Time-based Permission)
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const adminCheck = await verifyAdminAuth(request, env);
    if (!adminCheck.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: adminCheck.error || 'Quyền truy cập bị từ chối.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const {
      key_name,
      scope,
      scopes,
      description = '',
      expires_at = '',
      validity_days = 0,
    } = body;

    if (!key_name || typeof key_name !== 'string' || !key_name.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng đặt tên định danh cho khóa API.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate and format scope
    let validScope = 'NEWS_FULL';
    if (scopes !== undefined && Array.isArray(scopes) && scopes.length > 0) {
      validScope = formatScopes(scopes);
    } else if (scope) {
      validScope = formatScopes(scope);
    }

    // Calculate expiration timestamp
    let finalExpiresAt = (expires_at || '').trim();
    if (!finalExpiresAt && Number(validity_days) > 0) {
      finalExpiresAt = new Date(Date.now() + Number(validity_days) * 86400000).toISOString();
    }

    // Generate random 24 bytes (48 hex chars)
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    let prefixTag = 'wcg_sec_';
    if (validScope.includes(',')) prefixTag = 'wcg_multi_';
    else if (validScope === 'NEWS_FULL') prefixTag = 'wcg_news_';
    else if (validScope === 'MISSIONS_FULL') prefixTag = 'wcg_mis_';
    else if (validScope === 'GIVEAWAYS_FULL') prefixTag = 'wcg_gw_';
    else if (validScope === 'EVENT_SCHEDULER_FULL') prefixTag = 'wcg_ev_';
    else if (validScope === 'MISSIONS_REVIEW' || validScope === 'REVIEW_ONLY') prefixTag = 'wcg_ai_';
    else if (validScope === 'ADMIN_FULL' || validScope === 'FULL') prefixTag = 'wcg_adm_';
    else prefixTag = 'wcg_multi_';

    const rawKey = `${prefixTag}${randomHex}`;
    const keyPrefix = `${rawKey.substring(0, 12)}••••••••••••••••••••${rawKey.slice(-4)}`;
    const keyHash = await computeSha256(rawKey);

    const id = `ak_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, description, expires_at, raw_key, is_active, last_used_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, '', ?)
    `).bind(
      id,
      key_name.trim(),
      keyHash,
      keyPrefix,
      validScope,
      description?.trim() || '',
      finalExpiresAt,
      rawKey,
      nowIso
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Khởi tạo khóa API thành công.',
        key: {
          id,
          key_name: key_name.trim(),
          scope: validScope,
          description: description?.trim() || '',
          expires_at: finalExpiresAt,
          key_prefix: keyPrefix,
          raw_key: rawKey,
          is_active: 1,
          created_at: nowIso,
        },
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi tạo khóa API mới.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
