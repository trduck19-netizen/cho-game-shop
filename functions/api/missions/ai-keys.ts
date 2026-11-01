import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
  computeSha256,
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

    const result = await env.DB.prepare(
      'SELECT id, key_name, key_prefix, scope, is_active, last_used_at, created_at FROM mission_ai_api_keys ORDER BY created_at DESC'
    ).all<any>();

    return new Response(
      JSON.stringify({
        success: true,
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
    const { key_name, scope = 'FULL' } = body;

    if (!key_name || typeof key_name !== 'string' || !key_name.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng đặt tên cho khóa API (ví dụ: Pine AI Agent).' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const validScope = scope === 'REVIEW_ONLY' ? 'REVIEW_ONLY' : 'FULL';

    // Generate random 32-hex string
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const rawKey = `wcg_ai_${randomHex}`;
    const keyPrefix = rawKey.substring(0, 15) + '...';
    const keyHash = await computeSha256(rawKey);

    const id = `ak_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO mission_ai_api_keys (id, key_name, api_key_hash, key_prefix, scope, is_active, last_used_at, created_at)
      VALUES (?, ?, ?, ?, ?, 1, '', ?)
    `).bind(id, key_name.trim(), keyHash, keyPrefix, validScope, nowIso).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tạo khóa API thành công! Khóa chỉ hiển thị một lần duy nhất, vui lòng lưu lại cẩn thận.',
        rawKey,
        key: {
          id,
          key_name: key_name.trim(),
          key_prefix: keyPrefix,
          scope: validScope,
          is_active: 1,
          last_used_at: '',
          created_at: nowIso,
        },
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi tạo khóa API.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
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
    const { id, is_active } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu id khóa API.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await env.DB.prepare('UPDATE mission_ai_api_keys SET is_active = ? WHERE id = ?')
      .bind(is_active ? 1 : 0, id)
      .run();

    return new Response(
      JSON.stringify({ success: true, message: 'Cập nhật trạng thái khóa API thành công!' }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi cập nhật khóa API.' }),
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
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu id khóa API cần xóa.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await env.DB.prepare('DELETE FROM mission_ai_api_keys WHERE id = ?').bind(id).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Xóa khóa API thành công!' }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi xóa khóa API.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
