import {
  CORS_HEADERS,
  Env,
  verifyMemberAuth,
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

    const memberCheck = await verifyMemberAuth(request, env);
    if (!memberCheck.authorized || !memberCheck.member) {
      return new Response(
        JSON.stringify({ success: false, message: memberCheck.error || 'Vui lòng đăng nhập.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const member = memberCheck.member;

    const result = await env.DB.prepare(`
      SELECT s.*, m.title as mission_title, m.reward_type, m.reward_value, m.max_resubmissions
      FROM mission_submissions s
      LEFT JOIN missions m ON s.mission_id = m.id
      WHERE s.user_id = ?
      ORDER BY s.updated_at DESC
    `)
      .bind(member.id)
      .all<any>();

    return new Response(
      JSON.stringify({
        success: true,
        submissions: result?.results || [],
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Authorization, Accept-Encoding',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi lấy danh sách hồ sơ.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
