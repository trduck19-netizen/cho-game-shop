import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
  formatScopes,
} from '../../services/mission_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * PATCH /api/api-keys/:id
 * Cập nhật trạng thái (Bật / Tắt hoạt động), gia hạn hoặc thay đổi thời hạn hiệu lực (phân quyền theo thời gian)
 */
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;

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

    const keyId = params.id as string;
    if (!keyId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu ID khóa API.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (keyId === 'key_system_master') {
      return new Response(
        JSON.stringify({ success: false, message: 'Không thể chỉnh sửa Khóa Master hệ thống qua endpoint này.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const { is_active, key_name, scope, scopes, description, expires_at, extend_days } = body;

    const existing = await env.DB.prepare(
      'SELECT id, is_active, scope, expires_at FROM mission_ai_api_keys WHERE id = ? LIMIT 1'
    ).bind(keyId).first<any>();

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy khóa API.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const nextActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    let nextExpiresAt = existing.expires_at || '';
    if (expires_at !== undefined) {
      nextExpiresAt = String(expires_at).trim();
    } else if (typeof extend_days === 'number' && extend_days > 0) {
      const baseTime = existing.expires_at ? Math.max(Date.now(), new Date(existing.expires_at).getTime()) : Date.now();
      nextExpiresAt = new Date(baseTime + extend_days * 86400000).toISOString();
    }

    let nextScope = existing.scope;
    if (scopes !== undefined && Array.isArray(scopes)) {
      nextScope = formatScopes(scopes);
    } else if (scope !== undefined) {
      nextScope = formatScopes(scope);
    }

    await env.DB.prepare(`
      UPDATE mission_ai_api_keys 
      SET is_active = ?,
          expires_at = ?,
          key_name = COALESCE(?, key_name),
          scope = ?,
          description = COALESCE(?, description)
      WHERE id = ?
    `).bind(
      nextActive,
      nextExpiresAt,
      key_name || null,
      nextScope,
      description || null,
      keyId
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: nextActive === 1 ? 'Đã kích hoạt khóa API.' : 'Đã tạm vô hiệu hóa khóa API.',
        id: keyId,
        is_active: nextActive,
        expires_at: nextExpiresAt,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi cập nhật khóa API.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * DELETE /api/api-keys/:id
 * Thu hồi và xóa vĩnh viễn khóa API khỏi cơ sở dữ liệu
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;

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

    const keyId = params.id as string;
    if (!keyId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu ID khóa API.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (keyId === 'key_system_master') {
      return new Response(
        JSON.stringify({ success: false, message: 'Không thể xóa Khóa Master hệ thống.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await env.DB.prepare(
      'DELETE FROM mission_ai_api_keys WHERE id = ?'
    ).bind(keyId).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Đã thu hồi và xóa vĩnh viễn khóa API.',
        deletedId: keyId,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi xóa khóa API.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
