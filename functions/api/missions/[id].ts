import {
  CORS_HEADERS,
  Env,
  verifyAdminAuth,
  verifyMemberAuth,
  invalidateMissionEdgeCache,
} from '../../services/mission_service';
import { recordSoftDelete } from '../../services/soft_delete_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;
  const missionId = String(params.id || '');

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const mission = await env.DB.prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .bind(missionId)
      .first<any>();

    if (!mission) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy nhiệm vụ.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const authHeader = request.headers.get('Authorization') || '';
    const hasAuth = Boolean(authHeader.trim());

    let isAdmin = false;
    let currentMember: any = null;

    if (hasAuth) {
      const adminCheck = await verifyAdminAuth(request, env);
      isAdmin = adminCheck.authorized;
      if (!isAdmin) {
        const memberCheck = await verifyMemberAuth(request, env);
        currentMember = memberCheck.authorized ? memberCheck.member : null;
      }
    }

    // Increment views for client requests asynchronously
    if (!isAdmin) {
      env.DB.prepare('UPDATE missions SET views = COALESCE(views, 0) + 1 WHERE id = ?')
        .bind(mission.id)
        .run()
        .catch(() => {});
      mission.views = (Number(mission.views) || 0) + 1;
    }

    let guideSteps: string[] = [];
    try {
      guideSteps = typeof mission.guide_steps === 'string' ? JSON.parse(mission.guide_steps) : mission.guide_steps || [];
    } catch {
      guideSteps = [];
    }

    // Parallel aggregate queries
    const [statsRow, poolRow, userSubmission] = await Promise.all([
      env.DB.prepare(`
        SELECT 
          COUNT(*) as total_submissions,
          COUNT(DISTINCT user_id) as participants_count,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_submissions,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_submissions,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_submissions
        FROM mission_submissions
        WHERE mission_id = ?
      `).bind(mission.id).first<any>(),
      env.DB.prepare(`
        SELECT 
          COUNT(*) as total_codes,
          SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_codes,
          SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed_codes
        FROM mission_reward_pools
        WHERE mission_id = ?
      `).bind(mission.id).first<any>(),
      currentMember?.id
        ? env.DB.prepare(
            'SELECT * FROM mission_submissions WHERE mission_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
          ).bind(mission.id, currentMember.id).first<any>()
        : Promise.resolve(null),
    ]);

    const availableCodesCount = mission.reward_type === 'CODE' ? (Number(poolRow?.available_codes) || 0) : 0;

    const detailedStats = {
      views: Number(mission.views) || 0,
      participants_count: Number(statsRow?.participants_count) || 0,
      submissions_count: Number(statsRow?.total_submissions) || 0,
      total_submissions: Number(statsRow?.total_submissions) || 0,
      pending_submissions: Number(statsRow?.pending_submissions) || 0,
      approved_count: Number(statsRow?.approved_submissions) || 0,
      approved_submissions: Number(statsRow?.approved_submissions) || 0,
      rejected_count: Number(statsRow?.rejected_submissions) || 0,
      rejected_submissions: Number(statsRow?.rejected_submissions) || 0,
      rewards_claimed: Number(mission.completed_count) || 0,
      quota_remaining: Math.max(0, (Number(mission.quota) || 0) - (Number(mission.completed_count) || 0)),
      total_codes: Number(poolRow?.total_codes) || 0,
      available_codes: Number(poolRow?.available_codes) || 0,
      claimed_codes: Number(poolRow?.claimed_codes) || 0,
    };

    const isGuest = !hasAuth && !isAdmin && !currentMember;
    const responseHeaders: Record<string, string> = isGuest
      ? {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
          'Vary': 'Authorization, Accept-Encoding',
        }
      : {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Authorization, Accept-Encoding',
        };

    return new Response(
      JSON.stringify({
        success: true,
        mission: {
          ...mission,
          views: detailedStats.views,
          participants_count: detailedStats.participants_count,
          guide_steps: guideSteps,
          available_codes_count: availableCodesCount,
          user_submission: userSubmission,
          stats: detailedStats,
        },
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi lấy chi tiết nhiệm vụ.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;
  const missionId = String(params.id || '');

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

    const existing = await env.DB.prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .bind(missionId)
      .first<any>();

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy nhiệm vụ để cập nhật.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const {
      title = existing.title,
      description = existing.description,
      task_type = existing.task_type,
      target_channel_name = existing.target_channel_name,
      target_channel_url = existing.target_channel_url,
      guide_steps = existing.guide_steps,
      content_requirements = existing.content_requirements,
      reward_type = existing.reward_type,
      reward_value = existing.reward_value,
      quota = existing.quota,
      min_account_age_days = existing.min_account_age_days,
      max_resubmissions = existing.max_resubmissions,
      resubmission_cooldown_seconds = existing.resubmission_cooldown_seconds,
      review_mode = existing.review_mode,
      ai_prompt_guidelines = existing.ai_prompt_guidelines,
      allowed_domains = existing.allowed_domains,
      recurrence_type = existing.recurrence_type,
      start_time = existing.start_time,
      end_time = existing.end_time,
      status = existing.status,
      sort_order = existing.sort_order,
    } = body;

    const guideStepsJson = typeof guide_steps === 'string' ? guide_steps : JSON.stringify(Array.isArray(guide_steps) ? guide_steps : []);
    const nowIso = new Date().toISOString();
    const effectiveRewardValue = reward_type === 'CODE' ? 0 : Number(reward_value) || 0;
    const effectiveCooldownSec = Math.max(0, Number(resubmission_cooldown_seconds ?? 60) || 60);

    await env.DB.prepare(`
      UPDATE missions SET
        title = ?,
        description = ?,
        task_type = ?,
        target_channel_name = ?,
        target_channel_url = ?,
        guide_steps = ?,
        content_requirements = ?,
        reward_type = ?,
        reward_value = ?,
        quota = ?,
        min_account_age_days = ?,
        max_resubmissions = ?,
        resubmission_cooldown_seconds = ?,
        review_mode = ?,
        ai_prompt_guidelines = ?,
        allowed_domains = ?,
        recurrence_type = ?,
        start_time = ?,
        end_time = ?,
        status = ?,
        sort_order = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      title.trim(),
      description.trim(),
      task_type,
      target_channel_name.trim(),
      target_channel_url.trim(),
      guideStepsJson,
      content_requirements.trim(),
      reward_type,
      effectiveRewardValue,
      Math.max(1, Number(quota) || 1),
      Math.max(0, Number(min_account_age_days) || 0),
      Math.max(0, Number(max_resubmissions) || 2),
      effectiveCooldownSec,
      review_mode,
      ai_prompt_guidelines.trim(),
      allowed_domains.trim() || 'facebook.com,fb.com,fb.watch',
      recurrence_type,
      start_time || '',
      end_time || '',
      status,
      Number(sort_order) || 0,
      nowIso,
      missionId
    ).run();

    await invalidateMissionEdgeCache(request);

    return new Response(
      JSON.stringify({ success: true, message: 'Cập nhật nhiệm vụ thành công!' }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi cập nhật nhiệm vụ.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;
  const missionId = String(params.id || '');

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

    const existing = await env.DB.prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .bind(missionId)
      .first<any>();

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Nhiệm vụ không tồn tại.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const url = new URL(request.url);
    const isForce = url.searchParams.get('force') === 'true';

    // Rule: Chỉ xóa được khi chưa có ai nộp bài, trừ khi có cờ ?force=true
    const subCountRow = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM mission_submissions WHERE mission_id = ?'
    )
      .bind(missionId)
      .first<any>();

    const subCount = Number(subCountRow?.cnt) || 0;
    if (subCount > 0 && !isForce) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Không thể xóa nhiệm vụ này vì đã có ${subCount} hồ sơ nộp bài. Bạn có thể đổi trạng thái sang TẠM DỪNG / ĐÃ KẾT THÚC, hoặc gửi tham số ?force=true nếu muốn xóa toàn diện.`,
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const nowIso = new Date().toISOString();
    const adminActor = `ADMIN:${adminCheck.adminName || adminCheck.adminId || 'Admin'}`;

    // 1. Đồng bộ lưu mission_title vào toàn bộ nhật ký cũ của nhiệm vụ này trước khi xóa hàng missions
    await env.DB.prepare(
      "UPDATE mission_audit_logs SET mission_title = ? WHERE mission_id = ? AND (mission_title IS NULL OR mission_title = '')"
    ).bind(existing.title || '', missionId).run().catch(() => {});

    // 2. Ghi nhận hành động xóa vào nhật ký kiểm tra bất biến
    await env.DB.prepare(`
      INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at)
      VALUES (?, ?, ?, '', '', 'MISSION_DELETED', ?, ?, ?)
    `).bind(
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      missionId,
      existing.title || '',
      adminActor,
      `Xóa nhiệm vụ (isForce=${isForce}, subCount=${subCount})`,
      nowIso
    ).run().catch(() => {});

    // 2.1 Ghi nhận vào Tombstone & Deleted Records History chống hồi sinh
    await recordSoftDelete(env.DB, {
      recordType: 'mission',
      recordId: missionId,
      recordSlug: existing.slug || missionId,
      title: existing.title || '',
      deletedBy: adminActor,
      reason: `Xóa nhiệm vụ (isForce=${isForce}, subCount=${subCount})`,
      originalPayload: existing,
    }).catch(() => {});

    // 3. Xóa toàn diện chỉ xóa: kho mã (pools), bài nộp (submissions) và nhiệm vụ (missions).
    // TUYỆT ĐỐI BẢO TỒN TOÀN BỘ NHẬT KÝ KIỂM TRA (mission_audit_logs) BẤT BIẾN!
    await env.DB.batch([
      env.DB.prepare('DELETE FROM mission_reward_pools WHERE mission_id = ?').bind(missionId),
      env.DB.prepare('DELETE FROM mission_submissions WHERE mission_id = ?').bind(missionId),
      env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(missionId),
    ]);

    await invalidateMissionEdgeCache(request);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Xóa nhiệm vụ thành công! Toàn bộ nhật ký kiểm tra đã được lưu trữ bất biến an toàn.',
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi xóa nhiệm vụ.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
