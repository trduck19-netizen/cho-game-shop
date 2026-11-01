import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
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

    let query = `
      SELECT l.*, COALESCE(NULLIF(l.mission_title, ''), m.title, l.mission_id) as mission_title
      FROM mission_audit_logs l
      LEFT JOIN missions m ON l.mission_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (missionId && missionId !== 'all') {
      query += ' AND l.mission_id = ?';
      params.push(missionId);
    }

    query += ' ORDER BY l.created_at DESC LIMIT 200';

    const result = await env.DB.prepare(query).bind(...params).all<any>();

    return new Response(
      JSON.stringify({
        success: true,
        logs: result?.results || [],
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi tải nhật ký kiểm toán.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
