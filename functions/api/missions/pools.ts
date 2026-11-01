import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
  invalidateMissionEdgeCache,
} from '../../services/mission_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

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

    const url = new URL(request.url);
    const missionId = url.searchParams.get('mission_id');

    if (!missionId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu mission_id.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const codesResult = await env.DB.prepare(
      'SELECT * FROM mission_reward_pools WHERE mission_id = ? ORDER BY created_at DESC LIMIT 500'
    )
      .bind(missionId)
      .all<any>();

    const codes = codesResult?.results || [];
    const availableCount = codes.filter((c: any) => c.status === 'AVAILABLE').length;
    const claimedCount = codes.filter((c: any) => c.status === 'CLAIMED').length;

    return new Response(
      JSON.stringify({
        success: true,
        codes,
        stats: {
          total: codes.length,
          available: availableCount,
          claimed: claimedCount,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi tải kho mã quà tặng.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

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
    const { mission_id, raw_codes, codes } = body;

    if (!mission_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu mission_id.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let lines: string[] = [];
    if (Array.isArray(codes)) {
      lines = codes.map((c) => String(c).trim()).filter((c) => c.length > 0);
    } else if (raw_codes && typeof raw_codes === 'string') {
      lines = raw_codes
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }

    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy mã code hợp lệ để thêm vào kho (truyền raw_codes hoặc mảng codes).' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Insert codes
    const nowIso = new Date().toISOString();
    const batchInserts = lines.map((codeStr) => {
      const id = `mrc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      return env.DB.prepare(
        'INSERT INTO mission_reward_pools (id, mission_id, code_content, status, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, mission_id, codeStr, 'AVAILABLE', nowIso);
    });

    await env.DB.batch(batchInserts);

    await invalidateMissionEdgeCache(request);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã nạp thành công ${lines.length} mã code vào kho của nhiệm vụ!`,
        count: lines.length,
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi nhập mã vào kho.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
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

    const url = new URL(request.url);
    const codeId = url.searchParams.get('id');
    const missionId = url.searchParams.get('mission_id');

    if (codeId) {
      await env.DB.prepare("DELETE FROM mission_reward_pools WHERE id = ? AND status = 'AVAILABLE'")
        .bind(codeId)
        .run();
      await invalidateMissionEdgeCache(request);
      return new Response(
        JSON.stringify({ success: true, message: 'Đã xóa mã khả dụng khỏi kho.' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (missionId && url.searchParams.get('clear_available') === 'true') {
      await env.DB.prepare("DELETE FROM mission_reward_pools WHERE mission_id = ? AND status = 'AVAILABLE'")
        .bind(missionId)
        .run();
      await invalidateMissionEdgeCache(request);
      return new Response(
        JSON.stringify({ success: true, message: 'Đã xóa toàn bộ mã chưa phát trong kho của nhiệm vụ.' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Yêu cầu tham số id hoặc mission_id + clear_available.' }),
      { status: 400, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi xóa mã trong kho.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
