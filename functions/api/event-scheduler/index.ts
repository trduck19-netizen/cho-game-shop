import {
  CORS_HEADERS,
  Env,
  verifyAiKeyAuth,
  verifyAdminAuth,
  hasScope,
} from '../../services/mission_service';
import {
  getSettingD1,
  setSettingD1,
  invalidateSettingMemoryCache,
} from '../../services/d1_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

const SCHEDULE_STORAGE_KEY = 'wcg_event_schedules_v1';

export interface ScheduledEventRecord {
  id: string;
  title: string;
  subtitle?: string;
  type: 'GIVEAWAY' | 'FLASH_SALE_PRODUCT' | 'GLOBAL_ANNOUNCEMENT';
  target_id?: string;
  game_slug?: string;
  game_name?: string;
  target_name?: string;
  original_price?: number;
  sale_price?: number;
  discount_percent?: number;
  start_time: string;
  end_time: string;
  countdown_lead_hours?: number;
  show_top_banner: boolean;
  show_in_giveaways: boolean;
  show_in_store: boolean;
  show_in_game_detail: boolean;
  theme: 'fire' | 'cyber' | 'gold' | 'emerald';
  badge_label?: string;
  cta_text?: string;
  cta_link?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Tính toán trạng thái thời gian thực của sự kiện
 */
function calculateEventStatus(event: ScheduledEventRecord, nowMs: number = Date.now()): 'UPCOMING' | 'LIVE' | 'ENDED' | 'HIDDEN' {
  if (!event.is_active) {
    return 'ENDED';
  }

  const startMs = new Date(event.start_time).getTime();
  const endMs = new Date(event.end_time).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    return 'ENDED';
  }

  if (nowMs >= endMs) {
    return 'ENDED';
  }

  if (nowMs >= startMs && nowMs < endMs) {
    return 'LIVE';
  }

  if (nowMs < startMs) {
    const leadHours = typeof event.countdown_lead_hours === 'number' ? event.countdown_lead_hours : 72;
    if (leadHours > 0) {
      const leadMs = leadHours * 3600 * 1000;
      if (nowMs < startMs - leadMs) {
        return 'HIDDEN';
      }
    }
    return 'UPCOMING';
  }

  return 'ENDED';
}

/**
 * Tính toán thời gian đếm ngược chi tiết
 */
function calculateCountdown(event: ScheduledEventRecord, nowMs: number = Date.now()) {
  const status = calculateEventStatus(event, nowMs);
  const startMs = new Date(event.start_time).getTime();
  const endMs = new Date(event.end_time).getTime();

  let targetMs = startMs;
  if (status === 'LIVE') {
    targetMs = endMs;
  }

  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalRemainingMs: diff,
    isExpired: diff <= 0,
    status,
  };
}

/**
 * Xác thực quyền quản trị Lịch Sự Kiện (Chấp nhận API Key có scope EVENT_SCHEDULER_FULL, ADMIN_FULL, FULL hoặc Master Admin Secret)
 */
async function authorizeEventSchedulerRequest(
  request: Request,
  env: Env
): Promise<{ authorized: boolean; keyRecord?: any; error?: string }> {
  // 1. Kiểm tra Admin Session / Sync Key / Secret
  const adminCheck = await verifyAdminAuth(request, env);
  if (adminCheck.authorized) {
    return {
      authorized: true,
      keyRecord: { id: 'admin_session', key_name: 'Quản Trị Viên (Admin Session)', scope: 'ADMIN_FULL' },
    };
  }

  // 2. Kiểm tra API Key từ Header (X-Api-Key hoặc Authorization: Bearer <key>)
  if (env.DB) {
    const aiKeyCheck = await verifyAiKeyAuth(request, env.DB, env, 'EVENT_SCHEDULER_FULL');
    if (aiKeyCheck.authorized && aiKeyCheck.keyRecord) {
      const scope = aiKeyCheck.keyRecord.scope;
      if (hasScope(scope, 'EVENT_SCHEDULER_FULL')) {
        return {
          authorized: true,
          keyRecord: aiKeyCheck.keyRecord,
        };
      }
      return {
        authorized: false,
        error: `Khóa API '${aiKeyCheck.keyRecord.key_name}' không có quyền EVENT_SCHEDULER_FULL (Phạm vi hiện tại: ${scope || 'NONE'}).`,
      };
    }
    if (aiKeyCheck.error) {
      return { authorized: false, error: aiKeyCheck.error };
    }
  }

  return {
    authorized: false,
    error: 'Từ chối truy cập. Yêu cầu đính kèm header X-Api-Key hoặc Authorization: Bearer có quyền EVENT_SCHEDULER_FULL.',
  };
}

/**
 * Tải danh sách lịch sự kiện từ D1
 */
async function loadSchedules(db: D1Database): Promise<ScheduledEventRecord[]> {
  try {
    const raw = await getSettingD1<ScheduledEventRecord[]>(db, SCHEDULE_STORAGE_KEY, [], true);
    if (Array.isArray(raw)) {
      return raw;
    }
  } catch (err: any) {
    console.warn('[EventSchedulerApi] Load error:', err?.message);
  }
  return [];
}

/**
 * Lưu danh sách lịch sự kiện vào D1
 */
async function persistSchedules(db: D1Database, schedules: ScheduledEventRecord[]): Promise<void> {
  await setSettingD1(db, SCHEDULE_STORAGE_KEY, schedules);
  invalidateSettingMemoryCache(SCHEDULE_STORAGE_KEY);
}

/**
 * GET /api/event-scheduler
 * Tra cứu danh sách lịch sự kiện hoặc 1 sự kiện chi tiết kèm trạng thái countdown realtime
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

    const auth = await authorizeEventSchedulerRequest(request, env);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: auth.error || 'Quyền truy cập bị từ chối.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const url = new URL(request.url);
    const targetId = url.searchParams.get('id');
    const statusParam = (url.searchParams.get('status') || 'ALL').toUpperCase();
    const typeParam = (url.searchParams.get('type') || 'ALL').toUpperCase();
    const searchParam = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim().toLowerCase();

    const allSchedules = await loadSchedules(env.DB);
    const nowMs = Date.now();

    // Map thêm status và countdown realtime
    const enriched = allSchedules.map((item) => {
      const status = calculateEventStatus(item, nowMs);
      const countdown = calculateCountdown(item, nowMs);
      return {
        ...item,
        status,
        countdown,
      };
    });

    // Lọc theo ID nếu có
    if (targetId) {
      const found = enriched.find((s) => s.id === targetId);
      if (!found) {
        return new Response(
          JSON.stringify({ success: false, message: `Không tìm thấy sự kiện với ID: ${targetId}` }),
          { status: 404, headers: CORS_HEADERS }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          event: found,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Lọc theo bộ lọc
    const filtered = enriched.filter((item) => {
      if (statusParam !== 'ALL' && item.status !== statusParam) return false;
      if (typeParam !== 'ALL' && item.type !== typeParam) return false;
      if (searchParam) {
        const matchTitle = item.title.toLowerCase().includes(searchParam);
        const matchGame = (item.game_name || '').toLowerCase().includes(searchParam);
        const matchTarget = (item.target_name || '').toLowerCase().includes(searchParam);
        if (!matchTitle && !matchGame && !matchTarget) return false;
      }
      return true;
    });

    // Tổng hợp thống kê
    let liveCount = 0;
    let upcomingCount = 0;
    let endedCount = 0;

    enriched.forEach((item) => {
      if (item.status === 'LIVE') liveCount++;
      else if (item.status === 'UPCOMING') upcomingCount++;
      else if (item.status === 'ENDED') endedCount++;
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: filtered.length,
        summary: {
          total_events: enriched.length,
          live: liveCount,
          upcoming: upcomingCount,
          ended: endedCount,
        },
        events: filtered,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi máy chủ nội bộ: ' + (err?.message || 'Unknown error') }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * POST /api/event-scheduler
 * Tạo mới hoặc cập nhật toàn diện sự kiện đếm ngược
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

    const auth = await authorizeEventSchedulerRequest(request, env);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: auth.error || 'Quyền truy cập bị từ chối.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, message: 'Dữ liệu body JSON không hợp lệ.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const title = String(body.title || '').trim();
    if (!title) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tiêu đề sự kiện (title) không được để trống.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const nowIso = new Date().toISOString();
    const eventId = String(body.id || '').trim() || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Tính start_time & end_time
    let startTime = String(body.start_time || '').trim();
    let endTime = String(body.end_time || '').trim();

    if (!startTime) {
      // Mặc định bắt đầu sau 1 giờ nếu không truyền
      startTime = new Date(Date.now() + 3600 * 1000).toISOString();
    }
    if (!endTime) {
      // Mặc định kết thúc sau 24 giờ kể từ lúc bắt đầu
      const sMs = new Date(startTime).getTime();
      endTime = new Date((isNaN(sMs) ? Date.now() : sMs) + 24 * 3600 * 1000).toISOString();
    }

    const recordToSave: ScheduledEventRecord = {
      id: eventId,
      title,
      subtitle: body.subtitle ? String(body.subtitle).trim() : undefined,
      type: ['GIVEAWAY', 'FLASH_SALE_PRODUCT', 'GLOBAL_ANNOUNCEMENT'].includes(body.type)
        ? body.type
        : 'GIVEAWAY',
      target_id: body.target_id ? String(body.target_id).trim() : undefined,
      game_slug: body.game_slug ? String(body.game_slug).trim() : undefined,
      game_name: body.game_name ? String(body.game_name).trim() : undefined,
      target_name: body.target_name ? String(body.target_name).trim() : undefined,
      original_price: typeof body.original_price === 'number' ? body.original_price : undefined,
      sale_price: typeof body.sale_price === 'number' ? body.sale_price : undefined,
      discount_percent: typeof body.discount_percent === 'number' ? body.discount_percent : undefined,
      start_time: startTime,
      end_time: endTime,
      countdown_lead_hours: typeof body.countdown_lead_hours === 'number' ? body.countdown_lead_hours : 72,
      show_top_banner: body.show_top_banner !== false,
      show_in_giveaways: body.show_in_giveaways !== false,
      show_in_store: body.show_in_store !== false,
      show_in_game_detail: body.show_in_game_detail !== false,
      theme: ['fire', 'cyber', 'gold', 'emerald'].includes(body.theme) ? body.theme : 'fire',
      badge_label: body.badge_label ? String(body.badge_label).trim() : 'SẮP DIỄN RA',
      cta_text: body.cta_text ? String(body.cta_text).trim() : 'Săn Mã Ngay',
      cta_link: body.cta_link ? String(body.cta_link).trim() : '',
      is_active: body.is_active !== false,
      created_at: body.created_at || nowIso,
      updated_at: nowIso,
    };

    const currentList = await loadSchedules(env.DB);
    const existingIndex = currentList.findIndex((item) => item.id === eventId);

    if (existingIndex >= 0) {
      currentList[existingIndex] = {
        ...currentList[existingIndex],
        ...recordToSave,
        created_at: currentList[existingIndex].created_at || recordToSave.created_at,
      };
    } else {
      currentList.unshift(recordToSave);
    }

    await persistSchedules(env.DB, currentList);

    const nowMs = Date.now();
    const finalEvent = {
      ...recordToSave,
      status: calculateEventStatus(recordToSave, nowMs),
      countdown: calculateCountdown(recordToSave, nowMs),
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: existingIndex >= 0 ? 'Đã cập nhật sự kiện đếm ngược thành công.' : 'Đã tạo sự kiện đếm ngược mới thành công.',
        event: finalEvent,
        actor: auth.keyRecord?.key_name || 'Admin',
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi khi lưu sự kiện: ' + (err?.message || 'Unknown error') }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * PUT /api/event-scheduler
 * Thao tác nhanh: TOGGLE_ACTIVE, EXTEND_TIME, TRIGGER_LIVE
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const auth = await authorizeEventSchedulerRequest(request, env);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: auth.error || 'Quyền truy cập bị từ chối.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, message: 'Dữ liệu body JSON không hợp lệ.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const targetId = String(body.id || '').trim();
    if (!targetId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu trường id của sự kiện cần thao tác.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const currentList = await loadSchedules(env.DB);
    const existingIndex = currentList.findIndex((item) => item.id === targetId);

    if (existingIndex < 0) {
      return new Response(
        JSON.stringify({ success: false, message: `Không tìm thấy sự kiện với ID: ${targetId}` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const action = String(body.action || '').toUpperCase().trim();
    const event = { ...currentList[existingIndex] };
    const nowIso = new Date().toISOString();
    let actionDesc = '';

    switch (action) {
      case 'TOGGLE_ACTIVE': {
        event.is_active = typeof body.is_active === 'boolean' ? body.is_active : !event.is_active;
        event.updated_at = nowIso;
        actionDesc = event.is_active ? 'Đã kích hoạt sự kiện' : 'Đã tạm ngưng sự kiện';
        break;
      }

      case 'EXTEND_TIME': {
        const addMinutes = Number(body.extend_minutes || body.additional_minutes || 60);
        const currentEndMs = new Date(event.end_time).getTime();
        const baseMs = isNaN(currentEndMs) || currentEndMs < Date.now() ? Date.now() : currentEndMs;
        event.end_time = new Date(baseMs + addMinutes * 60 * 1000).toISOString();
        event.is_active = true;
        event.updated_at = nowIso;
        actionDesc = `Đã gia hạn sự kiện thêm ${addMinutes} phút (Kết thúc lúc: ${event.end_time})`;
        break;
      }

      case 'TRIGGER_LIVE': {
        const durationMinutes = Number(body.duration_minutes || 120);
        event.start_time = nowIso;
        event.end_time = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
        event.is_active = true;
        event.updated_at = nowIso;
        actionDesc = `Đã kích hoạt sự kiện LIVE ngay lập tức (Thời lượng: ${durationMinutes} phút)`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: `Hành động không hợp lệ: "${action}". Các hành động hỗ trợ: TOGGLE_ACTIVE, EXTEND_TIME, TRIGGER_LIVE.`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
    }

    currentList[existingIndex] = event;
    await persistSchedules(env.DB, currentList);

    const nowMs = Date.now();
    const finalEvent = {
      ...event,
      status: calculateEventStatus(event, nowMs),
      countdown: calculateCountdown(event, nowMs),
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: actionDesc,
        event: finalEvent,
        actor: auth.keyRecord?.key_name || 'Admin',
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xử lý thao tác: ' + (err?.message || 'Unknown error') }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * DELETE /api/event-scheduler
 * Xóa vĩnh viễn sự kiện đếm ngược
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const auth = await authorizeEventSchedulerRequest(request, env);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: auth.error || 'Quyền truy cập bị từ chối.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const url = new URL(request.url);
    let targetId = url.searchParams.get('id');

    if (!targetId) {
      const body = await request.json().catch(() => null);
      if (body?.id) {
        targetId = String(body.id).trim();
      }
    }

    if (!targetId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu tham số id của sự kiện cần xóa.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const currentList = await loadSchedules(env.DB);
    const existing = currentList.find((item) => item.id === targetId);

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: `Không tìm thấy sự kiện với ID: ${targetId}` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const updatedList = currentList.filter((item) => item.id !== targetId);
    await persistSchedules(env.DB, updatedList);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã xóa vĩnh viễn sự kiện "${existing.title}" thành công.`,
        deleted_id: targetId,
        actor: auth.keyRecord?.key_name || 'Admin',
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi khi xóa sự kiện: ' + (err?.message || 'Unknown error') }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
