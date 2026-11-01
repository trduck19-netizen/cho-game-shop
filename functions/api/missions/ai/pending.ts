import {
  CORS_HEADERS,
  Env,
  verifyAiKeyAuth,
} from '../../../services/mission_service';

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

    // Authenticate with scoped AI API Key
    const aiAuth = await verifyAiKeyAuth(request, env.DB);
    if (!aiAuth.authorized) {
      return new Response(
        JSON.stringify({ success: false, message: aiAuth.error || 'Quyền truy cập AI API Key bị từ chối.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));

    // Get pending submissions where mission review_mode is AI_AUTO or AI_ASSISTED
    const query = `
      SELECT 
        s.id as submission_id,
        s.mission_id,
        s.proof_link,
        s.proof_note,
        s.user_id,
        s.user_name,
        s.resubmission_count,
        s.ai_recommendation,
        s.created_at as submitted_at,
        m.title as mission_title,
        m.task_type,
        m.target_channel_name,
        m.target_channel_url,
        m.content_requirements,
        m.allowed_domains,
        m.review_mode,
        m.ai_prompt_guidelines
      FROM mission_submissions s
      INNER JOIN missions m ON s.mission_id = m.id
      WHERE s.status = 'PENDING'
        AND m.status = 'ACTIVE'
        AND m.review_mode IN ('AI_AUTO', 'AI_ASSISTED')
        AND (s.ai_recommendation IS NULL OR s.ai_recommendation = '')
      ORDER BY s.created_at ASC
      LIMIT ?
    `;

    const result = await env.DB.prepare(query).bind(limit).all<any>();

    return new Response(
      JSON.stringify({
        success: true,
        aiKeyName: aiAuth.keyRecord?.key_name,
        count: (result?.results || []).length,
        submissions: result?.results || [],
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi tải hàng chờ duyệt cho AI.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
