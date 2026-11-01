import {
  CORS_HEADERS,
  Env,
  verifyMemberAuth,
  validateProofLink,
  invalidateMissionEdgeCache,
} from '../../services/mission_service';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
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

    // 1. Authenticate Member
    const memberCheck = await verifyMemberAuth(request, env);
    if (!memberCheck.authorized || !memberCheck.member) {
      return new Response(
        JSON.stringify({ success: false, message: memberCheck.error || 'Vui lòng đăng nhập để nộp bằng chứng.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const member = memberCheck.member;

    const body: any = await request.json().catch(() => ({}));
    const { mission_id, proof_link, proof_note = '' } = body;

    if (!mission_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu mã nhiệm vụ (mission_id).' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Fetch Mission
    const mission = await env.DB.prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .bind(mission_id)
      .first<any>();

    if (!mission) {
      return new Response(
        JSON.stringify({ success: false, message: 'Nhiệm vụ không tồn tại.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (mission.status !== 'ACTIVE') {
      return new Response(
        JSON.stringify({
          success: false,
          message: mission.status === 'PAUSED' ? 'Nhiệm vụ hiện đang tạm dừng.' : 'Nhiệm vụ đã kết thúc.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const nowMs = Date.now();

    // 2.1. Check start_time: Chưa tới giờ bắt đầu thì không mở
    if (mission.start_time) {
      const startMs = new Date(mission.start_time).getTime();
      if (!isNaN(startMs) && nowMs < startMs) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Nhiệm vụ chưa bắt đầu (Thời gian mở: ${mission.start_time}). Vui lòng quay lại sau!`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    // 2.2. Check end_time: Quá giờ kết thúc thì tự đóng với người mới
    if (mission.end_time) {
      const endMs = new Date(mission.end_time).getTime();
      if (!isNaN(endMs) && nowMs > endMs) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Nhiệm vụ đã kết thúc thời gian nhận bài nộp (Hạn chót: ${mission.end_time}).`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    // 3. Quota check: Hết quota thì tự đóng với người mới
    if (mission.completed_count >= mission.quota) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nhiệm vụ đã đạt tối đa số lượt hoàn thành (hết quota). Bạn không thể nộp thêm hồ sơ mới.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 4. Validate Account Age
    if (mission.min_account_age_days > 0 && member.created_at) {
      const createdAtMs = new Date(member.created_at).getTime();
      const ageDays = (Date.now() - createdAtMs) / (1000 * 60 * 60 * 24);
      if (ageDays < mission.min_account_age_days) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Nhiệm vụ này yêu cầu tài khoản phải được tạo tối thiểu ${mission.min_account_age_days} ngày trước (tài khoản của bạn mới được ${Math.floor(ageDays)} ngày).`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    // 5. Global Pending Limit (Max 5 pending submissions per user across platform)
    const pendingCountRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM mission_submissions WHERE user_id = ? AND status = 'PENDING'"
    )
      .bind(member.id)
      .first<any>();

    const currentPendingCount = Number(pendingCountRow?.cnt) || 0;
    if (currentPendingCount >= 5) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Bạn đang có 5 hồ sơ chờ duyệt trên toàn sàn. Vui lòng đợi quản trị viên duyệt trước khi nộp thêm bài mới.',
        }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 6. Validate Proof Link & Allowed Domains
    const linkValidation = validateProofLink(proof_link, mission.allowed_domains);
    if (!linkValidation.valid || !linkValidation.normalizedUrl) {
      return new Response(
        JSON.stringify({ success: false, message: linkValidation.reason || 'Link bài đăng không hợp lệ.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const cleanUrl = linkValidation.normalizedUrl;

    // Query existing submission by this user for this mission
    const existingUserSub = await env.DB.prepare(
      'SELECT * FROM mission_submissions WHERE mission_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
    )
      .bind(mission.id, member.id)
      .first<any>();

    // 7. Anti-Cheat: 1 link bài đăng chỉ dùng 1 lần cho cùng 1 nhiệm vụ trên toàn hệ thống
    const duplicateLinkRow = await env.DB.prepare(
      "SELECT id, user_id, status FROM mission_submissions WHERE mission_id = ? AND proof_link = ? AND id != ? AND status != 'REJECTED' LIMIT 1"
    )
      .bind(mission.id, cleanUrl, existingUserSub?.id || '')
      .first<any>();

    if (duplicateLinkRow) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Đường link bằng chứng này đã được sử dụng trong hệ thống cho nhiệm vụ này. Vui lòng cung cấp bài đăng chính chủ và duy nhất của bạn.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 8. Check Existing User Submission for this Mission
    if (existingUserSub) {
      if (existingUserSub.status === 'APPROVED' && mission.recurrence_type === 'ONCE') {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Bạn đã hoàn thành và nhận phần thưởng của nhiệm vụ này rồi!',
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (existingUserSub.status === 'PENDING') {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Bạn đang có một bài nộp đang chờ duyệt cho nhiệm vụ này. Vui lòng kiên nhẫn chờ kết quả!',
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (existingUserSub.status === 'REJECTED') {
        const currentResubmissionCount = Number(existingUserSub.resubmission_count) || 0;
        const maxResubmissions = Number(mission.max_resubmissions) || 2;
        if (currentResubmissionCount >= maxResubmissions) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Bạn đã hết số lần nộp lại cho phép đối với nhiệm vụ này (tối đa ${maxResubmissions} lần).`,
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }

        // Cooldown check: Giãn cách thời gian giữa 2 lần nộp lại
        const lastActionTime = existingUserSub.reviewed_at || existingUserSub.updated_at || existingUserSub.created_at;
        const lastActionMs = new Date(lastActionTime).getTime();
        const cooldownSec = Number(mission.resubmission_cooldown_seconds) || 60;
        const elapsedSec = Math.floor((nowMs - lastActionMs) / 1000);
        if (elapsedSec < cooldownSec) {
          const waitSec = cooldownSec - elapsedSec;
          return new Response(
            JSON.stringify({
              success: false,
              message: `Vui lòng đợi ${waitSec} giây nữa trước khi nộp lại bằng chứng mới (Thời gian giãn cách nộp lại: ${cooldownSec} giây).`,
            }),
            { status: 429, headers: CORS_HEADERS }
          );
        }

        // Allow re-submission by resetting existing record to PENDING with updated link & incrementing count
        const nowIso = new Date().toISOString();
        await env.DB.prepare(`
          UPDATE mission_submissions SET
            proof_link = ?,
            proof_note = ?,
            status = 'PENDING',
            resubmission_count = resubmission_count + 1,
            rejection_reason = '',
            ai_recommendation = '',
            ai_reason = '',
            ai_reviewed_at = '',
            reviewed_by = '',
            reviewed_at = '',
            updated_at = ?
          WHERE id = ?
        `).bind(
          cleanUrl,
          String(proof_note || '').trim(),
          nowIso,
          existingUserSub.id
        ).run();

        // Audit log
        await env.DB.prepare(`
          INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at)
          VALUES (?, ?, ?, ?, ?, 'SUBMIT', ?, ?, ?)
        `).bind(
          `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          mission.id,
          mission.title || '',
          existingUserSub.id,
          member.id,
          member.display_name || member.username || member.id,
          `Nộp lại bằng chứng (Lần nộp lại thứ ${currentResubmissionCount + 1}): ${cleanUrl}`,
          nowIso
        ).run();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Nộp lại bằng chứng thành công! Hồ sơ đã được chuyển vào hàng chờ duyệt.',
            submission_id: existingUserSub.id,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }
    }

    // 9. Create brand new submission
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO mission_submissions (
          id, mission_id, user_id, user_name, user_email, proof_link, proof_note,
          status, rejection_reason, resubmission_count, reward_delivered,
          reviewed_by, reviewed_at, ai_recommendation, ai_reason, ai_reviewed_at,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          'PENDING', '', 0, '',
          '', '', '', '', '',
          ?, ?
        )
      `).bind(
        submissionId,
        mission.id,
        member.id,
        member.display_name || member.username || 'Thành viên',
        member.email || '',
        cleanUrl,
        String(proof_note || '').trim(),
        nowIso,
        nowIso
      ),
      env.DB.prepare(`
        INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at)
        VALUES (?, ?, ?, ?, ?, 'SUBMIT', ?, ?, ?)
      `).bind(
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        mission.id,
        mission.title || '',
        submissionId,
        member.id,
        member.display_name || member.username || member.id,
        `Nộp bằng chứng mới: ${cleanUrl}`,
        nowIso
      ),
    ]);

    await invalidateMissionEdgeCache(request);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nộp bằng chứng thành công! Hồ sơ của bạn đã được gửi và đang chờ xét duyệt.',
        submission_id: submissionId,
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi xử lý nộp bằng chứng.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
