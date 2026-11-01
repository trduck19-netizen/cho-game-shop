import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
  formatScopes,
  parseScopes,
} from '../../services/mission_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * POST /api/api-keys/set-permissions
 * Endpoint API Đa Năng cho phép Quản trị viên sử dụng 1 mã API (Master hoặc Versatile có quyền API_KEYS_FULL/ADMIN_FULL)
 * để cấu hình/set bất kỳ tổ hợp quyền nào cho các mã API hiện có trên website.
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

    // 1. Authenticate caller (Must have API_KEYS_FULL or ADMIN_FULL)
    const adminCheck = await verifyAdminAuth(request, env, 'API_KEYS_FULL');
    if (!adminCheck.authorized) {
      return new Response(
        JSON.stringify({
          success: false,
          message: adminCheck.error || 'Quyền truy cập bị từ chối. Yêu cầu mã API có quyền Quản lý Khóa API (API_KEYS_FULL) hoặc Toàn Quyền Quản Trị (ADMIN_FULL).',
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const {
      key_id,
      id,
      key_code,
      scopes,
      scope,
      key_name,
      description,
      expires_at,
      is_active,
    } = body;

    const targetKeyId = (key_id || id || '').trim();
    const targetKeyCode = (key_code || '').trim();

    if (!targetKeyId && !targetKeyCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Thiếu định danh khóa API cần set quyền (key_id hoặc key_code).',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (targetKeyId === 'key_system_master') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Khóa Quản Trị Hệ Thống (Master Key) luôn mặc định sở hữu toàn quyền ADMIN_FULL và không thể chỉnh sửa.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Fetch existing key
    let existing: any = null;
    if (targetKeyId) {
      existing = await env.DB.prepare(
        'SELECT * FROM mission_ai_api_keys WHERE id = ? LIMIT 1'
      ).bind(targetKeyId).first<any>();
    }
    if (!existing && targetKeyCode) {
      existing = await env.DB.prepare(
        'SELECT * FROM mission_ai_api_keys WHERE raw_key = ? OR key_prefix LIKE ? LIMIT 1'
      ).bind(targetKeyCode, `%${targetKeyCode.slice(-6)}`).first<any>();
    }

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy khóa API trong hệ thống.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 3. Process new scopes
    let formattedScope = existing.scope;
    if (scopes !== undefined) {
      formattedScope = formatScopes(scopes);
    } else if (scope !== undefined) {
      formattedScope = formatScopes(scope);
    }

    if (!formattedScope) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vui lòng cung cấp ít nhất 1 quyền hợp lệ cho khóa API (scopes: string[] hoặc scope: string).',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const nextActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;
    const nextExpiresAt = expires_at !== undefined ? String(expires_at).trim() : existing.expires_at;

    await env.DB.prepare(`
      UPDATE mission_ai_api_keys
      SET scope = ?,
          key_name = COALESCE(?, key_name),
          description = COALESCE(?, description),
          expires_at = ?,
          is_active = ?
      WHERE id = ?
    `).bind(
      formattedScope,
      key_name ? String(key_name).trim() : null,
      description !== undefined ? String(description).trim() : null,
      nextExpiresAt,
      nextActive,
      existing.id
    ).run();

    const activeScopesList = parseScopes(formattedScope);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã cập nhật phân quyền thành công cho khóa "${existing.key_name}". Khóa hiện sở hữu ${activeScopesList.length} quyền.`,
        key: {
          id: existing.id,
          key_name: key_name ? String(key_name).trim() : existing.key_name,
          key_prefix: existing.key_prefix,
          scope: formattedScope,
          scopes: activeScopesList,
          description: description !== undefined ? String(description).trim() : existing.description,
          expires_at: nextExpiresAt,
          is_active: nextActive,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi set quyền cho khóa API.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
