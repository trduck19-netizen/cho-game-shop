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
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const authHeader = request.headers.get('Authorization') || '';
    const hasAuth = Boolean(authHeader.trim());
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status')?.trim().toUpperCase();
    const isAdminParam = url.searchParams.get('admin') === 'true';

    // 1. Edge Cache Check for Public Guests (No Authorization header, no admin param, no status filter)
    const cache = typeof caches !== 'undefined' ? (caches as any).default : null;
    const cacheKey = new Request(request.url, request);

    if (!hasAuth && !isAdminParam && (!statusParam || statusParam === 'ALL') && cache) {
      try {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const hitHeaders = new Headers(cachedResponse.headers);
          hitHeaders.set('X-Edge-Cache', 'HIT');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            headers: hitHeaders,
          });
        }
      } catch {}
    }

    // 2. Authentication check ONLY when Authorization header is supplied
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

    // 3. Query Missions
    let missionsQuery = 'SELECT * FROM missions';
    const queryParams: any[] = [];

    if (isAdmin) {
      if (statusParam && statusParam !== 'ALL') {
        missionsQuery += ' WHERE status = ?';
        queryParams.push(statusParam);
      }
    } else {
      // Clients only see ACTIVE or ENDED missions (not DRAFT)
      missionsQuery += " WHERE status IN ('ACTIVE', 'ENDED')";
    }
    missionsQuery += ' ORDER BY sort_order ASC, created_at DESC';

    const missionsResult = queryParams.length > 0
      ? await env.DB.prepare(missionsQuery).bind(...queryParams).all<any>()
      : await env.DB.prepare(missionsQuery).all<any>();
    const missions = missionsResult?.results || [];

    const isGuest = !hasAuth && !isAdmin && !currentMember;

    if (missions.length === 0) {
      const emptyHeaders: Record<string, string> = isGuest
        ? {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
            'Vary': 'Authorization, Accept-Encoding',
            'X-Edge-Cache': 'MISS',
          }
        : {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Authorization, Accept-Encoding',
            'X-Edge-Cache': 'BYPASS',
          };

      const emptyRes = new Response(
        JSON.stringify({ success: true, missions: [], total: 0 }),
        { status: 200, headers: emptyHeaders }
      );

      if (isGuest && cache) {
        try {
          context.waitUntil(cache.put(cacheKey, emptyRes.clone()));
        } catch {}
      }

      return emptyRes;
    }

    // 4. Batch Aggregate Queries (No N+1 queries!)
    const [poolRes, subRes, userSubRes] = await Promise.all([
      env.DB.prepare(`
        SELECT 
          mission_id,
          COUNT(*) as total_codes,
          SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_codes,
          SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed_codes
        FROM mission_reward_pools
        GROUP BY mission_id
      `).all<any>(),
      env.DB.prepare(`
        SELECT 
          mission_id,
          COUNT(*) as total_submissions,
          COUNT(DISTINCT user_id) as participants_count,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_submissions,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_submissions,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_submissions
        FROM mission_submissions
        GROUP BY mission_id
      `).all<any>(),
      currentMember?.id
        ? env.DB.prepare(
            'SELECT * FROM mission_submissions WHERE user_id = ? ORDER BY created_at DESC'
          ).bind(currentMember.id).all<any>()
        : Promise.resolve({ results: [] })
    ]);

    const poolMap = new Map<string, any>();
    for (const row of (poolRes?.results || [])) {
      if (row.mission_id) poolMap.set(row.mission_id, row);
    }

    const subMap = new Map<string, any>();
    for (const row of (subRes?.results || [])) {
      if (row.mission_id) subMap.set(row.mission_id, row);
    }

    const userSubMap = new Map<string, any>();
    if (currentMember?.id) {
      for (const row of (userSubRes?.results || [])) {
        if (row.mission_id && !userSubMap.has(row.mission_id)) {
          userSubMap.set(row.mission_id, row);
        }
      }
    }

    const augmentedMissions = missions.map((m: any) => {
      let guideSteps: string[] = [];
      try {
        guideSteps = typeof m.guide_steps === 'string' ? JSON.parse(m.guide_steps) : m.guide_steps || [];
      } catch {
        guideSteps = [];
      }

      const poolRow = poolMap.get(m.id);
      const statsRow = subMap.get(m.id);
      const userSubmission = currentMember?.id ? (userSubMap.get(m.id) || null) : null;
      const availableCodesCount = m.reward_type === 'CODE' ? (Number(poolRow?.available_codes) || 0) : 0;

      const detailedStats = {
        views: Number(m.views) || 0,
        participants_count: Number(statsRow?.participants_count) || 0,
        submissions_count: Number(statsRow?.total_submissions) || 0,
        total_submissions: Number(statsRow?.total_submissions) || 0,
        pending_submissions: Number(statsRow?.pending_submissions) || 0,
        approved_count: Number(statsRow?.approved_submissions) || 0,
        approved_submissions: Number(statsRow?.approved_submissions) || 0,
        rejected_count: Number(statsRow?.rejected_submissions) || 0,
        rejected_submissions: Number(statsRow?.rejected_submissions) || 0,
        rewards_claimed: Number(m.completed_count) || 0,
        quota_remaining: Math.max(0, (Number(m.quota) || 0) - (Number(m.completed_count) || 0)),
        total_codes: Number(poolRow?.total_codes) || 0,
        available_codes: Number(poolRow?.available_codes) || 0,
        claimed_codes: Number(poolRow?.claimed_codes) || 0,
      };

      return {
        ...m,
        views: detailedStats.views,
        participants_count: detailedStats.participants_count,
        guide_steps: guideSteps,
        available_codes_count: availableCodesCount,
        user_submission: userSubmission,
        stats: detailedStats,
      };
    });

    const responseHeaders: Record<string, string> = isGuest
      ? {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
          'Vary': 'Authorization, Accept-Encoding',
          'X-Edge-Cache': 'MISS',
        }
      : {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Authorization, Accept-Encoding',
          'X-Edge-Cache': 'BYPASS',
        };

    const finalResponse = new Response(
      JSON.stringify({
        success: true,
        missions: augmentedMissions,
        total: augmentedMissions.length,
      }),
      { status: 200, headers: responseHeaders }
    );

    if (isGuest && cache) {
      try {
        context.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      } catch {}
    }

    return finalResponse;
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi tải danh sách nhiệm vụ.' }),
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

    // --- Batch Action 1: Batch Update Status (Open / Close Missions) ---
    if (body.action === 'batch_update_status') {
      const { ids, status } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Danh sách ID nhiệm vụ không được để trống.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const newStatus = status === 'ACTIVE' ? 'ACTIVE' : status === 'PAUSED' ? 'PAUSED' : 'CLOSED';
      const nowIso = new Date().toISOString();
      const adminActor = `ADMIN:${adminCheck.adminName || adminCheck.adminId || 'Admin'}`;

      const stmts = ids.map((id) =>
        env.DB.prepare('UPDATE missions SET status = ?, updated_at = ? WHERE id = ?').bind(newStatus, nowIso, id)
      );
      await env.DB.batch(stmts);

      // Audit log batch update
      await env.DB.prepare(`
        INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at)
        VALUES (?, '', 'Batch Update Status', '', '', 'MISSION_UPDATED', ?, ?, ?)
      `).bind(
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        adminActor,
        `Cập nhật trạng thái ${ids.length} nhiệm vụ sang ${newStatus} (${newStatus === 'ACTIVE' ? 'Mở - Hiện trên web khách' : 'Đóng - Ẩn khỏi web khách'})`,
        nowIso
      ).run().catch(() => {});

      await invalidateMissionEdgeCache(request);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã ${newStatus === 'ACTIVE' ? 'MỞ (Hiện trên web)' : 'ĐÓNG (Ẩn khỏi web)'} thành công ${ids.length} nhiệm vụ!`,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // --- Batch Action 2: Batch Delete Missions ---
    if (body.action === 'batch_delete') {
      const { ids, force = false } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Danh sách ID nhiệm vụ không được để trống.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const nowIso = new Date().toISOString();
      const adminActor = `ADMIN:${adminCheck.adminName || adminCheck.adminId || 'Admin'}`;
      let deletedCount = 0;
      const skippedIds: string[] = [];

      for (const id of ids) {
        const subCountRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM mission_submissions WHERE mission_id = ?').bind(id).first<any>();
        const subCount = Number(subCountRow?.cnt) || 0;
        if (subCount > 0 && !force) {
          skippedIds.push(id);
          continue;
        }

        const mission = await env.DB.prepare('SELECT * FROM missions WHERE id = ? LIMIT 1').bind(id).first<any>();
        if (!mission) continue;

        // Record soft delete tombstone
        await recordSoftDelete(env.DB, {
          recordType: 'mission',
          recordId: id,
          recordSlug: mission.slug || id,
          title: mission.title || '',
          deletedBy: adminActor,
          reason: `Xóa hàng loạt nhiệm vụ (isForce=${force}, subCount=${subCount})`,
          originalPayload: mission,
        }).catch(() => {});

        // Delete mission
        if (subCount > 0 && force) {
          await env.DB.prepare('DELETE FROM mission_submissions WHERE mission_id = ?').bind(id).run().catch(() => {});
        }
        await env.DB.prepare('DELETE FROM mission_reward_pools WHERE mission_id = ?').bind(id).run().catch(() => {});
        await env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(id).run();
        deletedCount++;
      }

      await invalidateMissionEdgeCache(request);

      return new Response(
        JSON.stringify({
          success: true,
          deletedCount,
          skippedCount: skippedIds.length,
          skippedIds,
          message: skippedIds.length > 0
            ? `Đã xóa ${deletedCount} nhiệm vụ. Bỏ qua ${skippedIds.length} nhiệm vụ vì đã có bài nộp (cần ?force=true).`
            : `Đã xóa thành công ${deletedCount} nhiệm vụ!`,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const {
      title,
      description = '',
      task_type = 'POST_SHARE_GROUP_PAGE',
      target_channel_name = '',
      target_channel_url = '',
      guide_steps = [],
      content_requirements = '',
      reward_type = 'CODE',
      reward_value = 0,
      quota = 10,
      min_account_age_days = 0,
      max_resubmissions = 2,
      resubmission_cooldown_seconds = 60,
      review_mode = 'AI_AUTO',
      ai_prompt_guidelines = '',
      allowed_domains = 'facebook.com,fb.com,fb.watch',
      recurrence_type = 'ONCE',
      start_time = '',
      end_time = '',
      status = 'ACTIVE',
      sort_order = 0,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tiêu đề nhiệm vụ không được để trống.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const missionId = `ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const guideStepsJson = JSON.stringify(Array.isArray(guide_steps) ? guide_steps : []);
    const effectiveRewardValue = reward_type === 'CODE' ? 0 : Number(reward_value) || 0;
    const effectiveCooldownSec = Math.max(0, Number(resubmission_cooldown_seconds ?? 60) || 60);

    await env.DB.prepare(`
      INSERT INTO missions (
        id, title, description, task_type, target_channel_name, target_channel_url,
        guide_steps, content_requirements, reward_type, reward_value, quota, completed_count,
        min_account_age_days, max_resubmissions, resubmission_cooldown_seconds, views,
        review_mode, ai_prompt_guidelines, allowed_domains, recurrence_type,
        start_time, end_time, status, sort_order, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 0,
        ?, ?, ?, 0,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `).bind(
      missionId,
      title.trim(),
      description.trim(),
      task_type,
      target_channel_name.trim(),
      target_channel_url.trim(),
      guideStepsJson,
      content_requirements.trim(),
      reward_type,
      effectiveRewardValue,
      Math.max(1, Number(quota) || 10),
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
      nowIso
    ).run();

    // Audit log mission creation
    await env.DB.prepare(`
      INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at)
      VALUES (?, ?, ?, '', '', 'MISSION_CREATED', ?, ?, ?)
    `).bind(
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      missionId,
      title.trim(),
      `ADMIN:${adminCheck.adminName || adminCheck.adminId || 'Admin'}`,
      `Khởi tạo nhiệm vụ mới (Quota: ${quota}, Thưởng: ${reward_type})`,
      nowIso
    ).run().catch(() => {});

    // Invalidate edge cache immediately
    await invalidateMissionEdgeCache(request);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tạo nhiệm vụ mới thành công!',
        missionId,
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Lỗi khi tạo nhiệm vụ.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
