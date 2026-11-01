import { claimGiveawayD1, getSettingD1, setSettingD1 } from '../../services/d1_service';
import { verifyToken, extractUserIdFromToken } from '../../services/auth_service';
import { getRealEventsHub, saveRealEventsHub } from '../../services/realEventsHub';

interface Env {
  DB: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Requested-With, Idempotency-Key, idempotency-key',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
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

    const body: any = await request.json().catch(() => ({}));
    const campaignId = String(body?.campaignId || '').trim();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu thông tin mã chiến dịch quà tặng.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const authHeader = request.headers.get('Authorization') || '';
    let token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token && body?.sessionToken) {
      token = String(body.sessionToken).trim();
    }

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng đăng nhập tài khoản để nhận quà tặng.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { valid: isSigValid, userId: verifiedUserId } = await verifyToken(token, [
      env.JWT_SECRET,
      env.ADMIN_SYNC_SECRET,
    ]);

    let member: any = await env.DB.prepare(
      'SELECT * FROM members WHERE session_token = ? LIMIT 1'
    ).bind(token).first<any>();

    if (!member && isSigValid && verifiedUserId) {
      member = await env.DB.prepare(
        'SELECT * FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1'
      ).bind(verifiedUserId, verifiedUserId, verifiedUserId).first<any>();
    }

    if (!member && token) {
      const extractedUserId = extractUserIdFromToken(token);
      if (extractedUserId) {
        member = await env.DB.prepare(
          'SELECT * FROM members WHERE id = ? OR username = ? LIMIT 1'
        ).bind(extractedUserId, extractedUserId).first<any>();
      }
    }

    if (!member) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Chống mạo danh (IDOR): Nếu client truyền memberId nhưng không khớp với tài khoản đăng nhập -> Từ chối ngay
    if (body?.memberId && String(body.memberId).trim() !== member.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Lỗi xác thực: Không được phép nhận quà thay cho tài khoản khác.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (member.status === 'BANNED') {
      return new Response(
        JSON.stringify({ success: false, message: 'Tài khoản của bạn đã bị khóa.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // 2. Fetch Campaign from D1
    const campaign = await env.DB.prepare(
      'SELECT * FROM giveaways WHERE id = ? LIMIT 1'
    ).bind(campaignId).first<any>();

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, message: 'Chiến dịch quà tặng không tồn tại.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (campaign.status === 'ENDED' || campaign.status === 'PAUSED' || campaign.status === 'CLOSED' || campaign.is_active === 0 || campaign.is_active === false) {
      return new Response(
        JSON.stringify({ success: false, message: 'Đợt phát code này hiện đã tạm hết mã hoặc đang tạm đóng. Vui lòng quay lại vào đợt sau!' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Inherit from Universal Template ONLY as fallback when campaign property is not explicitly configured
    // Admin configuration is the Single Source of Truth (Chân lý duy nhất)
    try {
      const universalTemplatesRaw: any = await getSettingD1(env.DB, 'wcg_universal_templates_v1');
      if (universalTemplatesRaw && universalTemplatesRaw.giveaway) {
        const gwTpl = universalTemplatesRaw.giveaway;
        if (campaign.use_template !== 0 && campaign.use_template !== false) {
          if ((campaign.min_account_age_days === undefined || campaign.min_account_age_days === null) && gwTpl.min_account_age_days !== undefined) {
            campaign.min_account_age_days = gwTpl.min_account_age_days;
          }
          if ((campaign.max_per_user === undefined || campaign.max_per_user === null) && gwTpl.max_per_user !== undefined) {
            campaign.max_per_user = gwTpl.max_per_user;
          }
          if ((campaign.max_per_ip === undefined || campaign.max_per_ip === null) && gwTpl.max_per_ip !== undefined) {
            campaign.max_per_ip = gwTpl.max_per_ip;
          }
          if ((campaign.cooldown_hours === undefined || campaign.cooldown_hours === null) && gwTpl.cooldown_hours !== undefined) {
            campaign.cooldown_hours = gwTpl.cooldown_hours;
          }
          if (!campaign.custom_success_msg && gwTpl.custom_success_msg) {
            campaign.custom_success_msg = gwTpl.custom_success_msg;
          }
          if (!campaign.custom_cooldown_msg && gwTpl.custom_cooldown_msg) {
            campaign.custom_cooldown_msg = gwTpl.custom_cooldown_msg;
          }
          if (!campaign.custom_out_of_stock_msg && gwTpl.custom_out_of_stock_msg) {
            campaign.custom_out_of_stock_msg = gwTpl.custom_out_of_stock_msg;
          }
        }
        if ((campaign.global_cooldown_seconds === undefined || campaign.global_cooldown_seconds === null) && gwTpl.global_cooldown_seconds !== undefined) {
          campaign.global_cooldown_seconds = gwTpl.global_cooldown_seconds;
        }
      }
    } catch {}

    const nowMs = Date.now();

    // 2.1 Check Start Time / End Time (Calibrated to Vietnam Time UTC+7)
    if (campaign.start_time) {
      const stStr = String(campaign.start_time).trim();
      const startMs = stStr.length === 10 ? new Date(`${stStr}T00:00:00+07:00`).getTime() : new Date(stStr).getTime();
      if (!isNaN(startMs) && nowMs < startMs) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'CAMPAIGN_NOT_STARTED',
            message: `Sự kiện chưa bắt đầu. Thời gian mở: ${new Date(startMs).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    if (campaign.end_time) {
      const etStr = String(campaign.end_time).trim();
      const endMs = etStr.length === 10 ? new Date(`${etStr}T23:59:59+07:00`).getTime() : new Date(etStr).getTime();
      if (!isNaN(endMs) && nowMs > endMs) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'CAMPAIGN_ENDED',
            message: `Sự kiện đã kết thúc vào ${new Date(endMs).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    // 2.2 Check Minimum Account Age
    const minAccountAgeDays = Number(campaign.min_account_age_days) || 0;
    if (minAccountAgeDays > 0) {
      if (!member.created_at) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'ACCOUNT_TOO_NEW',
            message: `Sự kiện yêu cầu tài khoản tối thiểu ${minAccountAgeDays} ngày tuổi để tham gia giật mã.`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const memberCreatedMs = new Date(member.created_at).getTime();
      if (!isNaN(memberCreatedMs)) {
        const accountAgeDays = Math.floor((nowMs - memberCreatedMs) / (1000 * 60 * 60 * 24));
        if (accountAgeDays < minAccountAgeDays) {
          return new Response(
            JSON.stringify({
              success: false,
              code: 'ACCOUNT_TOO_NEW',
              message: `Tài khoản của bạn mới được tạo ${Math.max(0, accountAgeDays)} ngày. Yêu cầu tham gia sự kiện này tối thiểu là ${minAccountAgeDays} ngày tuổi.`,
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }
    }

    const rawIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const clientIp = String(rawIp).split(',')[0].trim() || '127.0.0.1';

    const memberRole = String(member.role || '').toUpperCase();
    const isAdmin =
      memberRole === 'ADMIN' ||
      memberRole === 'SUPER_ADMIN' ||
      member.username === 'admin' ||
      member.username === 'admin290200' ||
      member.id === 'usr_admin';

    const rawMaxPerUser = Number(campaign.max_per_user);
    const isUnlimitedUser = rawMaxPerUser === 0 || rawMaxPerUser >= 999999 || isAdmin;
    const effectiveMaxPerUser = isUnlimitedUser ? 999999 : (rawMaxPerUser > 0 ? rawMaxPerUser : 1);

    const rawMaxPerIp = Number(campaign.max_per_ip);
    const isUnlimitedIp = rawMaxPerIp === 0 || rawMaxPerIp >= 999999 || isAdmin;
    const effectiveMaxPerIp = isUnlimitedIp ? 999999 : (rawMaxPerIp > 0 ? rawMaxPerIp : 1);

    const cooldownMinutes = isAdmin ? 0 : (
      campaign.cooldown_minutes !== undefined && campaign.cooldown_minutes !== null
        ? Number(campaign.cooldown_minutes)
        : (Number(campaign.cooldown_hours) || 0) * 60
    );

    // 3. Run all pre-check queries IN PARALLEL (1 round trip instead of 4)
    const [userClaimsCountRow, ipClaimsCountRow, availCountRow0, lastClaimRow] = await Promise.all([
      env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM giveaway_claims WHERE giveaway_id = ? AND member_id = ?'
      ).bind(campaign.id, member.id).first<any>(),
      env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM giveaway_claims WHERE giveaway_id = ? AND client_ip = ?'
      ).bind(campaign.id, clientIp).first<any>(),
      env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM giveaway_codes WHERE giveaway_id = ? AND status = 'AVAILABLE'"
      ).bind(campaign.id).first<any>(),
      cooldownMinutes > 0
        ? env.DB.prepare(`
            SELECT claimed_at FROM giveaway_claims
            WHERE giveaway_id = ? AND member_id = ?
            ORDER BY claimed_at DESC LIMIT 1
          `).bind(campaign.id, member.id).first<any>()
        : Promise.resolve(null),
    ]);
    const userClaimsCount = Number(userClaimsCountRow?.cnt) || 0;

    // Only block and return previous code if NOT admin, NOT unlimited, and user has reached limit
    if (!isAdmin && !isUnlimitedUser && userClaimsCount >= effectiveMaxPerUser) {
      const prevCodesRes = await env.DB.prepare(`
        SELECT gc.code_content, cl.claimed_at
        FROM giveaway_claims cl
        JOIN giveaway_codes gc ON cl.code_id = gc.id
        WHERE cl.giveaway_id = ? AND cl.member_id = ?
        ORDER BY cl.claimed_at DESC
      `).bind(campaign.id, member.id).all<any>().catch(() => ({ results: [] }));

      const prevCodes = (prevCodesRes?.results || []).map((r: any) => ({
        code: r.code_content,
        claimed_at: r.claimed_at,
      }));

      const lastCode = prevCodes[0]?.code;

      return new Response(
        JSON.stringify({
          success: true,
          code: lastCode,
          claimedCodes: prevCodes,
          alreadyClaimed: true,
          isNewCode: false,
          campaign: {
            id: campaign.id,
            game_name: campaign.game_name,
            game_slug: campaign.game_slug,
            rewards: campaign.title,
          },
          message: lastCode
            ? `Mã giftcode của bạn cho sự kiện này: ${lastCode}`
            : `Bạn đã nhận đủ giới hạn tối đa (${userClaimsCount}/${effectiveMaxPerUser} mã) cho sự kiện này.`,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 3.1 Pre-check Cooldown between claims (bypassed for Admin)
    if (!isAdmin && cooldownMinutes > 0 && userClaimsCount > 0) {
      if (lastClaimRow && lastClaimRow.claimed_at) {
        const lastClaimMs = new Date(lastClaimRow.claimed_at).getTime();
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const remainingCooldownMs = (lastClaimMs + cooldownMs) - nowMs;
        if (remainingCooldownMs > 0) {
          const remHours = Math.floor(remainingCooldownMs / (1000 * 60 * 60));
          const remMins = Math.ceil((remainingCooldownMs % (1000 * 60 * 60)) / (1000 * 60));
          const waitStr = remHours > 0 ? `${remHours} giờ ${remMins} phút` : `${remMins} phút`;
          const cdDisplayStr = cooldownMinutes >= 60 && cooldownMinutes % 60 === 0
            ? `${cooldownMinutes / 60}h`
            : `${cooldownMinutes} phút`;
          return new Response(
            JSON.stringify({
              success: false,
              errorCode: 'COOLDOWN_ACTIVE',
              message: `Bạn đang trong thời gian hồi chiêu (${cdDisplayStr}). Vui lòng quay lại sau ${waitStr} để giật mã tiếp theo.`,
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }
    }

    // 3.2 Global Release Interval / Global Queue Cooldown (Toàn web chờ giữa 2 lần giật)
    const globalCooldownSeconds = isAdmin ? 0 : Math.max(0, Number(campaign.global_cooldown_seconds || 0));
    if (globalCooldownSeconds > 0 && campaign.last_global_claim_at) {
      const lastGlobalMs = new Date(campaign.last_global_claim_at).getTime();
      if (!isNaN(lastGlobalMs)) {
        const globalCooldownMs = globalCooldownSeconds * 1000;
        const remainingGlobalMs = (lastGlobalMs + globalCooldownMs) - nowMs;
        if (remainingGlobalMs > 0) {
          const remTotalSec = Math.ceil(remainingGlobalMs / 1000);
          const remMin = Math.floor(remTotalSec / 60);
          const remSec = remTotalSec % 60;
          const waitStr = remMin > 0 ? `${remMin} phút ${remSec > 0 ? `${remSec} giây` : ''}`.trim() : `${remSec} giây`;

          const lastClaimer = String(campaign.last_claimer_name || '').trim() || 'đồng đạo trước';
          let cdMsg = String(campaign.custom_cooldown_msg || '').trim();
          if (!cdMsg) {
            cdMsg = 'Đợt phát trước đạo hữu {last_user} đã nhanh tay đi trước, đạo hữu vui lòng đợi {time_left} rồi thử sức lại.';
          }
          cdMsg = cdMsg
            .replace(/\{last_user\}|\{claimer\}|\{last_claimer\}|\{last_claimer_name\}|\{user\}/gi, lastClaimer)
            .replace(/\{time_left\}/gi, waitStr)
            .replace(/\{seconds\}|\{sec\}/gi, `${remTotalSec} giây`);

          return new Response(
            JSON.stringify({
              success: false,
              errorCode: 'GLOBAL_COOLDOWN_ACTIVE',
              remainingSeconds: remTotalSec,
              lastClaimerName: lastClaimer,
              nextReleaseAt: new Date(lastGlobalMs + globalCooldownMs).toISOString(),
              message: cdMsg,
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }
    }

    // 4. Pre-check IP limit (bypassed for Admin & Unlimited IP)
    const ipClaimsCount = Number(ipClaimsCountRow?.cnt) || 0;

    if (!isAdmin && !isUnlimitedIp && ipClaimsCount >= effectiveMaxPerIp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Địa chỉ IP của bạn đã đạt giới hạn nhận tối đa (${ipClaimsCount}/${effectiveMaxPerIp} mã) cho sự kiện này.`,
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 4.1 Pre-check Available codes
    let availCount = Number(availCountRow0?.cnt) || 0;

    // Self-healing: If no available codes in D1 giveaway_codes table, check if pool exists in system_settings
    if (availCount <= 0) {
      try {
        const storedGiveaways = await getSettingD1<any[]>(env.DB, 'wcg_admin_giveaways_v4', []);
        const targetGw = Array.isArray(storedGiveaways) ? storedGiveaways.find((g: any) => g.id === campaign.id) : null;
        const pool = Array.isArray(targetGw?.codes_pool) ? targetGw.codes_pool : [];
        if (pool.length > 0) {
          // Clear any stale available rows and re-seed strictly from real admin pool with unique IDs
          await env.DB.prepare("DELETE FROM giveaway_codes WHERE giveaway_id = ? AND status = 'AVAILABLE'").bind(campaign.id).run().catch(() => {});
          const insertStmts: D1PreparedStatement[] = [];
          for (let i = 0; i < pool.length; i++) {
            const codeStr = pool[i];
            if (!codeStr || !codeStr.trim()) continue;
            const codeVal = codeStr.trim();
            const codeId = `gwc_${campaign.id}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
            insertStmts.push(
              env.DB.prepare(`
                INSERT INTO giveaway_codes (id, giveaway_id, code_content, status, created_at)
                VALUES (?, ?, ?, 'AVAILABLE', datetime('now'))
              `).bind(codeId, campaign.id, codeVal)
            );
          }
          if (insertStmts.length > 0) {
            await env.DB.batch(insertStmts).catch(() => {});
            const freshAvailRow = await env.DB.prepare(
              "SELECT COUNT(*) as cnt FROM giveaway_codes WHERE giveaway_id = ? AND status = 'AVAILABLE'"
            ).bind(campaign.id).first<any>();
            availCount = Number(freshAvailRow?.cnt) || 0;

            if (availCount > 0) {
              await env.DB.prepare(
                'UPDATE giveaways SET remaining_codes = ?, total_codes = (claimed_codes + ?) WHERE id = ?'
              ).bind(availCount, availCount, campaign.id).run().catch(() => {});
            }
          }
        }
      } catch (e: any) {
        console.warn('[GiveawayClaim Self-Healing Pool]', e?.message);
      }
    }

    if (availCount <= 0) {
      let oosMsg = String(campaign.custom_out_of_stock_msg || '').trim();
      if (!oosMsg) {
        oosMsg = 'Rất tiếc! Toàn bộ giftcode của sự kiện này đã được trao tặng hết.';
      }
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OUT_OF_STOCK',
          message: oosMsg,
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 5. Atomic D1 Giveaway Claim via Guards
    const claimId = `clm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const d1ClaimRes = await claimGiveawayD1(env.DB, {
      claimId,
      giveawayId: campaign.id,
      memberId: member.id,
      clientIp,
      maxPerUser: effectiveMaxPerUser,
      maxPerIp: effectiveMaxPerIp,
    });

    if (!d1ClaimRes.success) {
      if (!isAdmin && !isUnlimitedUser && userClaimsCount >= effectiveMaxPerUser) {
        const prevCodesRes = await env.DB.prepare(`
          SELECT gc.code_content, cl.claimed_at
          FROM giveaway_claims cl
          JOIN giveaway_codes gc ON cl.code_id = gc.id
          WHERE cl.giveaway_id = ? AND cl.member_id = ?
          ORDER BY cl.claimed_at DESC
        `).bind(campaign.id, member.id).all<any>().catch(() => ({ results: [] }));

        const prevCodes = (prevCodesRes?.results || []).map((r: any) => ({
          code: r.code_content,
          claimed_at: r.claimed_at,
        }));

        const lastCode = prevCodes[0]?.code;

        if (lastCode) {
          return new Response(
            JSON.stringify({
              success: true,
              code: lastCode,
              claimedCodes: prevCodes,
              alreadyClaimed: true,
              isNewCode: false,
              campaign: {
                id: campaign.id,
                game_name: campaign.game_name,
                game_slug: campaign.game_slug,
                rewards: campaign.title,
              },
              message: `Mã giftcode của bạn cho sự kiện này: ${lastCode}`,
            }),
            { status: 200, headers: CORS_HEADERS }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          code: null,
          claimedCodes: [],
          message: d1ClaimRes.error || 'Không thể nhận quà tặng lúc này.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const codeValue = d1ClaimRes.codeContent!;
    const nowIso = new Date().toISOString();
    const claimerDisplayName = member.display_name || member.username || (member.email ? member.email.split('@')[0] : 'Đạo hữu');

    // Immediate authoritative update of last_global_claim_at and last_claimer_name to lock subsequent concurrent claims immediately
    await env.DB.prepare(
      'UPDATE giveaways SET last_global_claim_at = ?, last_claimer_name = ?, last_real_claim_at = ?, is_last_claim_simulated = 0 WHERE id = ?'
    ).bind(nowIso, claimerDisplayName, nowIso, campaign.id).run().catch(() => {});

    // 6 & 7. Asynchronously update counters, settings pool & real events hub in background
    const backgroundSync = async () => {
      try {
        const countRow = await env.DB.prepare(`
          SELECT
            SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed_cnt,
            SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as remain_cnt
          FROM giveaway_codes WHERE giveaway_id = ?
        `).bind(campaign.id).first<any>();

        const remainingCnt = Math.max(0, Number(countRow?.remain_cnt) || 0);
        const claimedCnt = Math.max(0, Number(countRow?.claimed_cnt) || 0);

        // Sync authoritative counters and last_global_claim_at & last_claimer_name to giveaways table
        await env.DB.prepare(
          'UPDATE giveaways SET remaining_codes = ?, claimed_codes = ?, last_global_claim_at = ?, last_claimer_name = ?, last_real_claim_at = ?, is_last_claim_simulated = 0 WHERE id = ?'
        ).bind(remainingCnt, claimedCnt, nowIso, claimerDisplayName, nowIso, campaign.id).run().catch(() => {});

        // Sync codes_pool in wcg_admin_giveaways_v4
        try {
          const storedGiveaways = await getSettingD1<any[]>(env.DB, 'wcg_admin_giveaways_v4', []);
          if (Array.isArray(storedGiveaways)) {
            const gwIdx = storedGiveaways.findIndex((g: any) => g.id === campaign.id);
            if (gwIdx !== -1) {
              const curPool = Array.isArray(storedGiveaways[gwIdx].codes_pool) ? storedGiveaways[gwIdx].codes_pool : [];
              const cIndex = curPool.indexOf(codeValue);
              if (cIndex !== -1) {
                curPool.splice(cIndex, 1);
              }
              storedGiveaways[gwIdx].codes_pool = curPool;
              storedGiveaways[gwIdx].remaining_codes = remainingCnt;
              storedGiveaways[gwIdx].claimed_codes = claimedCnt;
              storedGiveaways[gwIdx].last_global_claim_at = nowIso;
              storedGiveaways[gwIdx].last_claimer_name = claimerDisplayName;
              storedGiveaways[gwIdx].last_real_claim_at = nowIso;
              storedGiveaways[gwIdx].is_last_claim_simulated = false;

              // Append claim record to claim_history for admin dashboard visibility
              const claimHistoryItem = {
                id: claimId,
                user: member.username || member.display_name || member.id,
                email: member.email || '',
                code: codeValue,
                claimedAt: nowIso,
                is_simulated: false,
              };
              storedGiveaways[gwIdx].claim_history = [
                claimHistoryItem,
                ...(Array.isArray(storedGiveaways[gwIdx].claim_history) ? storedGiveaways[gwIdx].claim_history : [])
              ].slice(0, 100);

              await setSettingD1(env.DB, 'wcg_admin_giveaways_v4', storedGiveaways);
            }
          }
        } catch (e: any) {
          console.warn('[GiveawayClaim Pool Removal Warning]', e?.message);
        }

        // Update Real Events Hub for Marketing FOMO & Live Device Sync
        try {
          const hub = await getRealEventsHub(env);
          hub.realGiveawayClaimedCounts[campaign.id] = (hub.realGiveawayClaimedCounts[campaign.id] || 0) + 1;

          hub.peakGiveawayClaimedCounts = hub.peakGiveawayClaimedCounts || {};
          hub.peakGiveawayClaimedCounts[campaign.id] = Math.max(
            hub.peakGiveawayClaimedCounts[campaign.id] || 0,
            hub.realGiveawayClaimedCounts[campaign.id]
          );

          hub.lowestGiveawayRemaining = hub.lowestGiveawayRemaining || {};
          const curLowestGw = hub.lowestGiveawayRemaining[campaign.id];
          if (typeof curLowestGw === 'number') {
            hub.lowestGiveawayRemaining[campaign.id] = Math.max(0, curLowestGw - 1);
          } else {
            hub.lowestGiveawayRemaining[campaign.id] = Math.max(0, (remainingCnt + 20) - 1);
          }

          const claimerDisplayName = member.display_name || member.username || member.email || 'Khách hàng';
          const claimEvt = {
            id: `evt_gw_${campaign.id}_${Date.now()}`,
            type: 'CLAIM_GIVEAWAY',
            title: 'Nhận quà tặng thành công',
            giveawayId: campaign.id,
            giveawayTitle: campaign.title,
            userName: claimerDisplayName,
            message: `${claimerDisplayName} vừa nhận thành công giftcode ${campaign.title}`,
            timeAgo: 'vừa xong',
            timestamp: Date.now(),
            scheduledFireTime: Date.now(),
            isRealUser: true,
          };

          hub.events = [claimEvt, ...(hub.events || [])].slice(0, 20);

          await saveRealEventsHub(env, hub);
        } catch (e: any) {
          console.warn('[GiveawaysClaim D1] Hub update warning:', e?.message);
        }
      } catch (err: any) {
        console.warn('[GiveawayClaim backgroundSync error]', err?.message);
      }
    };

    if (typeof (context as any).waitUntil === 'function') {
      (context as any).waitUntil(backgroundSync());
    } else {
      backgroundSync();
    }

    const claimedCodesNext = (Number(campaign.claimed_codes) || 0) + 1;
    const remainingCodesNext = Math.max(0, (typeof campaign.remaining_codes === 'number' ? campaign.remaining_codes : Number(campaign.total_codes || 1)) - 1);

    let successMsg = String(campaign.custom_success_msg || '').trim();
    if (!successMsg) {
      successMsg = isAdmin
        ? `[Chế độ Quản Trị Viên] Giật thành công mã mới từ kho: ${codeValue}`
        : 'Nhận giftcode thành công!';
    } else {
      successMsg = successMsg
        .replace(/\{code\}/gi, codeValue)
        .replace(/\{game_name\}/gi, campaign.game_name || '')
        .replace(/\{rewards\}/gi, campaign.rewards || campaign.title || '');
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: codeValue,
        isNewCode: true,
        alreadyClaimed: false,
        isAdminBypass: isAdmin,
        userClaimsCount: userClaimsCount + 1,
        last_global_claim_at: nowIso,
        last_claimer_name: claimerDisplayName,
        campaign: {
          id: campaign.id,
          game_name: campaign.game_name,
          game_slug: campaign.game_slug,
          rewards: campaign.title,
          claimed_codes: claimedCodesNext,
          remaining_codes: remainingCodesNext,
          last_global_claim_at: nowIso,
          last_claimer_name: claimerDisplayName,
        },
        message: successMsg,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xử lý nhận giftcode: ' + String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
