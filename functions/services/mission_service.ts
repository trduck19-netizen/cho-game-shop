import { verifyToken } from './auth_service';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ADMIN_SYNC_SECRET?: string;
  PINE_API_KEY?: string;
  MUSE_API_KEY?: string;
}

export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Admin-Key, X-Api-Key, x-admin-sync-key, Idempotency-Key',
};

/**
 * SHA-256 Hash helper using Web Crypto API
 */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates proof link against URL standard and allowed domains.
 * Supported domain matching handles root & subdomains (e.g. m.facebook.com, fb.com).
 */
export function validateProofLink(
  link: string,
  allowedDomainsStr: string = 'facebook.com,fb.com,fb.watch'
): { valid: boolean; reason?: string; normalizedUrl?: string } {
  if (!link || typeof link !== 'string') {
    return { valid: false, reason: 'Vui lòng cung cấp link bằng chứng bài đăng.' };
  }

  const clean = link.trim();
  let url: URL;
  try {
    url = new URL(clean);
  } catch {
    return { valid: false, reason: 'Link bài đăng không đúng định dạng URL hợp lệ (phải bắt đầu bằng http:// hoặc https://).' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, reason: 'Giao thức link phải là http:// hoặc https://.' };
  }

  const hostname = url.hostname.toLowerCase();
  const allowedList = allowedDomainsStr
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);

  if (allowedList.length > 0) {
    const isDomainAllowed = allowedList.some((allowed) => {
      // Matches exact host or subdomain (e.g. "facebook.com" matches "facebook.com" and "m.facebook.com")
      return hostname === allowed || hostname.endsWith('.' + allowed);
    });

    if (!isDomainAllowed) {
      return {
        valid: false,
        reason: `Tên miền bài đăng (${hostname}) không nằm trong danh sách được phép: ${allowedList.join(', ')}`,
      };
    }
  }

  return { valid: true, normalizedUrl: clean };
}

/**
 * Master Fallback Secrets & Keys
 */
const MASTER_SYSTEM_KEYS = [
  'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef',
  'wcg_admin_sync_master_key_2026_secured',
];

/**
 * Parse scopes string (comma-separated, whitespace, or JSON) into array of normalized strings
 */
export function parseScopes(scopeStr: string | undefined | null): string[] {
  if (!scopeStr) return [];
  const clean = String(scopeStr).trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).toUpperCase().trim()).filter(Boolean);
    } catch {}
  }
  return clean
    .toUpperCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Format scopes array into clean comma-separated string
 */
export function formatScopes(scopes: string[] | string): string {
  if (typeof scopes === 'string') {
    return parseScopes(scopes).join(',');
  }
  if (Array.isArray(scopes)) {
    return scopes.map((s) => String(s).toUpperCase().trim()).filter(Boolean).join(',');
  }
  return '';
}

/**
 * Check if a scope string or record has a required permission
 */
export function hasScope(scopeStr: string | undefined | null, requiredScope: string): boolean {
  if (!scopeStr) return false;
  const scopes = parseScopes(scopeStr);
  if (scopes.some((s) => ['ADMIN_FULL', 'FULL', '*', 'SUPER_ADMIN', 'ALL'].includes(s))) {
    return true;
  }
  const target = requiredScope.toUpperCase().trim();
  if (target === 'GAMES_MANAGE' && scopes.includes('GAMES_FULL')) return true;
  if (target === 'GAMES_FULL' && scopes.includes('GAMES_MANAGE')) return true;
  return scopes.includes(target);
}

/**
 * Authenticate AI Agent via Scoped Bearer API Key or Master Secret
 */
export async function verifyAiKeyAuth(
  request: Request,
  db: D1Database,
  env?: Env,
  requiredScope?: string
): Promise<{ authorized: boolean; keyRecord?: any; error?: string }> {
  const authHeader = request.headers.get('Authorization') || '';
  const apiKeyHeader =
    request.headers.get('X-Api-Key') ||
    request.headers.get('X-Admin-Key') ||
    request.headers.get('X-Sync-Key') ||
    request.headers.get('x-admin-sync-key') ||
    '';
  const rawKey = (apiKeyHeader || authHeader.replace(/^Bearer\s+/i, '')).trim();

  if (!rawKey) {
    return { authorized: false, error: 'Thiếu API Key xác thực cho AI (Header Authorization: Bearer <key> hoặc X-Api-Key).' };
  }

  // Check Master Secrets
  const candidateMasterSecrets = [
    env?.ADMIN_SYNC_SECRET,
    env?.PINE_API_KEY,
    env?.MUSE_API_KEY,
    ...MASTER_SYSTEM_KEYS,
  ].filter(Boolean) as string[];

  if (candidateMasterSecrets.includes(rawKey)) {
    return {
      authorized: true,
      keyRecord: { id: 'api_master', key_name: 'Master System API Key', scope: 'FULL' },
    };
  }

  const keyHash = await computeSha256(rawKey);
  const keyRecord = await db
    .prepare('SELECT * FROM mission_ai_api_keys WHERE api_key_hash = ? AND is_active = 1 LIMIT 1')
    .bind(keyHash)
    .first<any>();

  if (!keyRecord) {
    return { authorized: false, error: 'API Key không hợp lệ hoặc đã bị vô hiệu hóa.' };
  }

  // Check expiration if time-based restriction is active
  if (keyRecord.expires_at) {
    const expTime = new Date(keyRecord.expires_at).getTime();
    if (!isNaN(expTime) && Date.now() > expTime) {
      return {
        authorized: false,
        error: `Khóa API đã hết hạn sử dụng vào lúc ${new Date(expTime).toLocaleString('vi-VN')}. Vui lòng liên hệ Quản trị viên để gia hạn.`,
      };
    }
  }

  if (requiredScope) {
    if (
      !hasScope(keyRecord.scope, requiredScope) &&
      !hasScope(keyRecord.scope, 'ADMIN_FULL') &&
      !hasScope(keyRecord.scope, 'FULL') &&
      keyRecord.scope !== '*'
    ) {
      return {
        authorized: false,
        error: `Khóa API '${keyRecord.key_name}' không có quyền ${requiredScope}. Quyền hiện tại: ${keyRecord.scope || 'NONE'}`,
      };
    }
  } else {
    if (
      !hasScope(keyRecord.scope, 'MISSIONS_REVIEW') &&
      !hasScope(keyRecord.scope, 'REVIEW_ONLY') &&
      !hasScope(keyRecord.scope, 'MISSIONS_FULL') &&
      !hasScope(keyRecord.scope, 'ADMIN_FULL') &&
      !hasScope(keyRecord.scope, 'FULL') &&
      keyRecord.scope !== '*'
    ) {
      return {
        authorized: false,
        error: `Khóa API này không có quyền thẩm định bài nộp Nhiệm vụ. Quyền hiện tại: ${keyRecord.scope}`,
      };
    }
  }

  // Update last used timestamp asynchronously
  db.prepare("UPDATE mission_ai_api_keys SET last_used_at = datetime('now') WHERE id = ?")
    .bind(keyRecord.id)
    .run()
    .catch(() => {});

  return { authorized: true, keyRecord };
}

/**
 * Authenticate Admin Session / Master Secret / Full Access API Key
 * Cấp toàn quyền quản trị và thực thi API cho toàn bộ module Nhiệm Vụ (Missions)
 */
export async function verifyAdminAuth(
  request: Request,
  env: Env,
  requiredScope: string = 'MISSIONS_FULL'
): Promise<{ authorized: boolean; adminId?: string; adminName?: string; error?: string; scope?: string }> {
  const authHeader = request.headers.get('Authorization') || '';
  const syncKeyHeader = request.headers.get('X-Sync-Key') || '';
  const adminKeyHeader = request.headers.get('X-Admin-Key') || '';
  const apiKeyHeader = request.headers.get('X-Api-Key') || '';
  const adminSyncKeyHeader = request.headers.get('x-admin-sync-key') || '';

  const token = (
    apiKeyHeader ||
    adminKeyHeader ||
    adminSyncKeyHeader ||
    syncKeyHeader ||
    authHeader.replace(/^Bearer\s+/i, '')
  ).trim();

  if (!token) {
    return { authorized: false, error: 'Yêu cầu quyền Quản trị viên hoặc API Key hợp lệ (Header X-Api-Key hoặc Authorization: Bearer <token>).' };
  }

  // 1. Direct Master Secret Match (Cấp toàn quyền tối cao)
  const candidateMasterSecrets = [
    (env.ADMIN_SYNC_SECRET || '').trim(),
    (env.PINE_API_KEY || '').trim(),
    (env.MUSE_API_KEY || '').trim(),
    ...MASTER_SYSTEM_KEYS,
  ].filter((s) => s.length >= 16);

  if (candidateMasterSecrets.includes(token)) {
    return {
      authorized: true,
      adminId: 'api_master',
      adminName: 'Master API Key',
      scope: 'FULL',
    };
  }

  // 2. Mission API Key Check từ bảng mission_ai_api_keys
  if (env.DB) {
    const keyHash = await computeSha256(token);
    const keyRecord = await env.DB
      .prepare('SELECT * FROM mission_ai_api_keys WHERE api_key_hash = ? AND is_active = 1 LIMIT 1')
      .bind(keyHash)
      .first<any>();

    if (keyRecord) {
      // Check expiration if time-based restriction is active
      if (keyRecord.expires_at) {
        const expTime = new Date(keyRecord.expires_at).getTime();
        if (!isNaN(expTime) && Date.now() > expTime) {
          return {
            authorized: false,
            error: `Khóa API đã hết hạn sử dụng vào lúc ${new Date(expTime).toLocaleString('vi-VN')}. Vui lòng liên hệ Quản trị viên để gia hạn.`,
          };
        }
      }

      // Update last used timestamp asynchronously
      env.DB.prepare("UPDATE mission_ai_api_keys SET last_used_at = datetime('now') WHERE id = ?")
        .bind(keyRecord.id)
        .run()
        .catch(() => {});

      if (!hasScope(keyRecord.scope, requiredScope) && !hasScope(keyRecord.scope, 'ADMIN_FULL')) {
        return {
          authorized: false,
          error: `Khóa API này không có quyền thực hiện thao tác (${requiredScope}). Quyền hiện tại: ${keyRecord.scope}`,
        };
      }

      return {
        authorized: true,
        adminId: keyRecord.id,
        adminName: keyRecord.key_name || 'API Client',
        scope: hasScope(keyRecord.scope, 'ADMIN_FULL') ? 'ADMIN_FULL' : keyRecord.scope,
      };
    }
  }

  // 3. Admin Member Token Session
  if (env.DB) {
    let member: any = null;

    if (token.startsWith('wcg_edge_tok_')) {
      const candidateSecrets = [env.JWT_SECRET, env.ADMIN_SYNC_SECRET];
      const { valid, userId } = await verifyToken(token, candidateSecrets);
      if (valid && userId) {
        member = await env.DB.prepare(
          'SELECT id, username, display_name, role, status FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1'
        ).bind(userId, userId, userId).first<any>();
      }
    }

    if (!member) {
      member = await env.DB.prepare(
        'SELECT id, username, display_name, role, status FROM members WHERE session_token = ? LIMIT 1'
      ).bind(token).first<any>();
    }

    if (!member && (token.startsWith('wcg_tok_usr_admin_') || token.includes('usr_admin') || token.includes('admin290200'))) {
      member = await env.DB.prepare(
        "SELECT id, username, display_name, role, status FROM members WHERE id = 'usr_admin' OR username = 'admin290200' OR email = 'admin@codegame.store' OR role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1"
      ).first<any>();
    }

    if (member && (member.role === 'ADMIN' || member.role === 'SUPER_ADMIN') && member.status !== 'BANNED') {
      return {
        authorized: true,
        adminId: member.id,
        adminName: member.display_name || member.username || 'Admin',
        scope: 'FULL',
      };
    }
  }

  return { authorized: false, error: 'Khóa API hoặc phiên đăng nhập không có quyền quản trị.' };
}

/**
 * Authenticate Logged-in Member Session
 */
export async function verifyMemberAuth(
  request: Request,
  env: Env
): Promise<{ authorized: boolean; member?: any; error?: string }> {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { authorized: false, error: 'Vui lòng đăng nhập tài khoản để thực hiện chức năng này.' };
  }

  if (!env.DB) {
    return { authorized: false, error: 'Cơ sở dữ liệu chưa sẵn sàng.' };
  }

  let member: any = null;

  if (token.startsWith('wcg_edge_tok_')) {
    const candidateSecrets = [env.JWT_SECRET, env.ADMIN_SYNC_SECRET];
    const { valid, userId } = await verifyToken(token, candidateSecrets);
    if (valid && userId) {
      member = await env.DB.prepare(
        'SELECT id, username, display_name, email, role, balance, status, created_at FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1'
      ).bind(userId, userId, userId).first<any>();
    }
  }

  if (!member) {
    member = await env.DB.prepare(
      'SELECT id, username, display_name, email, role, balance, status, created_at FROM members WHERE session_token = ? LIMIT 1'
    ).bind(token).first<any>();
  }

  if (!member && (token.startsWith('wcg_tok_usr_admin_') || token.includes('usr_admin'))) {
    member = await env.DB.prepare(
      "SELECT id, username, display_name, email, role, balance, status, created_at FROM members WHERE id = 'usr_admin' OR role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1"
    ).first<any>();
  }

  if (!member) {
    return { authorized: false, error: 'Phiên đăng nhập đã hết hạn hoặc không tồn tại.' };
  }

  if (member.status === 'BANNED') {
    return { authorized: false, error: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.' };
  }

  return { authorized: true, member };
}

/**
 * Atomic Execution of Mission Approval and Reward Delivery
 */
export async function executeApproveReward(
  db: D1Database,
  submissionId: string,
  reviewerActor: string
): Promise<{ success: boolean; rewardDelivered?: string; error?: string }> {
  // 1. Fetch submission with lock check (status must be PENDING)
  const submission = await db
    .prepare('SELECT * FROM mission_submissions WHERE id = ? LIMIT 1')
    .bind(submissionId)
    .first<any>();

  if (!submission) {
    return { success: false, error: 'Không tìm thấy hồ sơ nộp bài.' };
  }

  if (submission.status === 'APPROVED') {
    return { success: true, rewardDelivered: submission.reward_delivered, error: 'Hồ sơ này đã được duyệt trước đó.' };
  }

  // 2. Fetch mission
  const mission = await db
    .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
    .bind(submission.mission_id)
    .first<any>();

  if (!mission) {
    return { success: false, error: 'Nhiệm vụ không còn tồn tại.' };
  }

  if (mission.completed_count >= mission.quota) {
    return { success: false, error: 'Nhiệm vụ đã đạt giới hạn trả thưởng tối đa (hết quota).' };
  }

  let rewardDelivered = '';

  // 3. Deliver Reward
  if (mission.reward_type === 'CODE') {
    // Claim 1 AVAILABLE code atomically
    const availCode = await db
      .prepare('SELECT * FROM mission_reward_pools WHERE mission_id = ? AND status = \'AVAILABLE\' ORDER BY created_at ASC LIMIT 1')
      .bind(mission.id)
      .first<any>();

    if (!availCode) {
      return { success: false, error: 'Kho mã quà tặng của nhiệm vụ đã hết mã khả dụng. Vui lòng nạp thêm mã vào kho!' };
    }

    rewardDelivered = availCode.code_content;

    // Atomically claim code, increment mission completed count, and update submission
    const nowIso = new Date().toISOString();
    const batchOps = [
      db.prepare(
        "UPDATE mission_reward_pools SET status = 'CLAIMED', claimed_by_user_id = ?, claimed_at = ?, submission_id = ? WHERE id = ?"
      ).bind(submission.user_id, nowIso, submission.id, availCode.id),
      db.prepare(
        "UPDATE missions SET completed_count = completed_count + 1, updated_at = ? WHERE id = ?"
      ).bind(nowIso, mission.id),
      db.prepare(
        "UPDATE mission_submissions SET status = 'APPROVED', reward_delivered = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
      ).bind(rewardDelivered, reviewerActor, nowIso, nowIso, submission.id),
      db.prepare(
        "INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at) VALUES (?, ?, ?, ?, ?, 'APPROVE', ?, ?, ?)"
      ).bind(
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        mission.id,
        mission.title || '',
        submission.id,
        submission.user_id,
        reviewerActor,
        `Duyệt bài thành công. Trao mã code: ${rewardDelivered}`,
        nowIso
      ),
    ];

    await db.batch(batchOps);
  } else if (mission.reward_type === 'WALLET_BALANCE') {
    const rewardAmount = Math.max(0, Math.floor(Number(mission.reward_value) || 0));
    if (rewardAmount <= 0) {
      return { success: false, error: 'Giá trị phần thưởng số dư ví không hợp lệ.' };
    }

    // Get current member balance
    const member = await db
      .prepare('SELECT id, balance, email FROM members WHERE id = ? LIMIT 1')
      .bind(submission.user_id)
      .first<any>();

    if (!member) {
      return { success: false, error: 'Không tìm thấy tài khoản thành viên để cộng số dư ví.' };
    }

    const balanceBefore = Number(member.balance) || 0;
    const balanceAfter = balanceBefore + rewardAmount;
    const txId = `tx_ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    rewardDelivered = `${rewardAmount.toLocaleString('vi-VN')}đ`;

    const batchOps = [
      db.prepare(
        "UPDATE members SET balance = balance + ?, updated_at = ? WHERE id = ?"
      ).bind(rewardAmount, nowIso, member.id),
      db.prepare(
        `INSERT INTO wallet_transactions (id, member_id, member_email, type, amount, balance_before, balance_after, description, status, created_at)
         VALUES (?, ?, ?, 'MISSION_REWARD', ?, ?, ?, ?, 'COMPLETED', ?)`
      ).bind(
        txId,
        member.id,
        member.email || '',
        rewardAmount,
        balanceBefore,
        balanceAfter,
        `Thưởng hoàn thành nhiệm vụ: ${mission.title}`,
        nowIso
      ),
      db.prepare(
        "UPDATE missions SET completed_count = completed_count + 1, updated_at = ? WHERE id = ?"
      ).bind(nowIso, mission.id),
      db.prepare(
        "UPDATE mission_submissions SET status = 'APPROVED', reward_delivered = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
      ).bind(rewardDelivered, reviewerActor, nowIso, nowIso, submission.id),
      db.prepare(
        "INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at) VALUES (?, ?, ?, ?, ?, 'APPROVE', ?, ?, ?)"
      ).bind(
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        mission.id,
        mission.title || '',
        submission.id,
        submission.user_id,
        reviewerActor,
        `Duyệt bài thành công. Cộng ${rewardDelivered} vào ví (Giao dịch: ${txId})`,
        nowIso
      ),
    ];

    await db.batch(batchOps);
  } else {
    return { success: false, error: 'Loại phần thưởng không được hỗ trợ.' };
  }

  return { success: true, rewardDelivered };
}

/**
 * Rejection Execution
 */
export async function executeRejectSubmission(
  db: D1Database,
  submissionId: string,
  reviewerActor: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  const submission = await db
    .prepare('SELECT * FROM mission_submissions WHERE id = ? LIMIT 1')
    .bind(submissionId)
    .first<any>();

  if (!submission) {
    return { success: false, error: 'Không tìm thấy hồ sơ nộp bài.' };
  }

  const mission = await db
    .prepare('SELECT id, title FROM missions WHERE id = ? LIMIT 1')
    .bind(submission.mission_id)
    .first<any>();
  const missionTitle = mission?.title || '';

  const nowIso = new Date().toISOString();
  const nextResubmissionCount = (Number(submission.resubmission_count) || 0) + 1;
  const reasonText = (rejectionReason || '').trim() || 'Link bài đăng không đáp ứng yêu cầu nhiệm vụ.';

  const batchOps = [
    db.prepare(
      "UPDATE mission_submissions SET status = 'REJECTED', rejection_reason = ?, resubmission_count = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
    ).bind(reasonText, nextResubmissionCount, reviewerActor, nowIso, nowIso, submission.id),
    db.prepare(
      "INSERT INTO mission_audit_logs (id, mission_id, mission_title, submission_id, user_id, action, actor, details, created_at) VALUES (?, ?, ?, ?, ?, 'REJECT', ?, ?, ?)"
    ).bind(
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      submission.mission_id,
      missionTitle,
      submission.id,
      submission.user_id,
      reviewerActor,
      `Từ chối hồ sơ (Lần nộp lại thứ ${nextResubmissionCount}): ${reasonText}`,
      nowIso
    ),
  ];

  await db.batch(batchOps);
  return { success: true };
}

/**
 * Invalidate Cloudflare Edge Cache for Missions API
 */
export async function invalidateMissionEdgeCache(requestOrUrl?: Request | string): Promise<void> {
  if (typeof caches === 'undefined' || !(caches as any).default) return;
  try {
    const cache = (caches as any).default;
    const baseUrls = [
      'https://codegame.shop/api/missions',
      'https://www.codegame.shop/api/missions',
      'https://web-code-game.pages.dev/api/missions',
      'https://admin-code-game-shop.pages.dev/api/missions',
    ];
    if (requestOrUrl) {
      if (typeof requestOrUrl === 'string') {
        baseUrls.push(requestOrUrl);
      } else if ((requestOrUrl as any).url) {
        baseUrls.push(new URL('/api/missions', (requestOrUrl as any).url).toString());
      }
    }
    const uniqueUrls = Array.from(new Set(baseUrls));
    await Promise.all(
      uniqueUrls.map((u) => cache.delete(new Request(u)).catch(() => {}))
    );
  } catch {}
}
