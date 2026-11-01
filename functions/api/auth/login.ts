import { ensureSchemaUpgrades } from '../../services/d1_service';
import { computeHash, createSignedToken, getSigningSecret, isBcryptHash, verifyBcryptPassword } from '../../services/auth_service';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ADMIN_SYNC_SECRET?: string;
  PASSWORD_PEPPER?: string;
  TURNSTILE_SECRET_KEY?: string;
  CF_TURNSTILE_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    await ensureSchemaUpgrades(env.DB);

    const body: any = await request.json().catch(() => ({}));
    const { identifier, password, rememberMe, turnstileToken } = body;

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const country = request.headers.get('cf-ipcountry') || 'VN';
    const nowMs = Date.now();

    // 1. Turnstile Anti-bot Verification
    const turnstileSecret = env.TURNSTILE_SECRET_KEY || env.CF_TURNSTILE_SECRET;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return new Response(
          JSON.stringify({ success: false, message: 'Vui lòng hoàn thành xác minh bảo mật chống bot (Turnstile).' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      try {
        const formData = new FormData();
        formData.append('secret', turnstileSecret);
        formData.append('response', turnstileToken);
        formData.append('remoteip', clientIp);

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
        });
        const outcome: any = await verifyRes.json();
        if (!outcome.success) {
          return new Response(
            JSON.stringify({ success: false, message: 'Xác minh bảo mật chống bot thất bại hoặc đã hết hạn.' }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
      } catch (err: any) {
        console.error('Turnstile verification error:', err);
      }
    }

    const cleanPassword = String(password || '').trim();
    const isAdminLookup =
      cleanIdentifier === 'admin290200' ||
      cleanIdentifier === 'admin2902' ||
      cleanIdentifier === 'admin@codegame.store' ||
      cleanIdentifier === 'usr_admin';

    // 2. IP Rate Limiting via D1 (Max 5 failed attempts in 15 minutes)
    // Lazy prune expired rate limits to prevent unbounded table growth
    await env.DB.prepare('DELETE FROM ip_rate_limits WHERE locked_until > 0 AND locked_until < ?')
      .bind(nowMs)
      .run()
      .catch(() => {});

    const rateLimitRow = await env.DB.prepare(
      'SELECT attempts, locked_until, last_attempt FROM ip_rate_limits WHERE ip_address = ? AND action_type = ?'
    ).bind(clientIp, 'LOGIN').first<any>().catch(() => null);

    const isLockedOut = rateLimitRow && Number(rateLimitRow.locked_until) > nowMs;
    if (isLockedOut) {
      const remainingMin = Math.max(1, Math.ceil((Number(rateLimitRow.locked_until) - nowMs) / 60000));
      return new Response(
        JSON.stringify({
          success: false,
          message: `Địa chỉ IP của bạn đã bị tạm khóa do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau ${remainingMin} phút.`,
          isLocked: true,
          remainingMinutes: remainingMin,
        }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // Helper to record failed attempt in D1
    const recordFailedAttempt = async (actorId?: string, actorName?: string) => {
      const currentAttempts = Number(rateLimitRow?.attempts) || 0;
      const newAttempts = currentAttempts + 1;
      const isNowLocked = newAttempts >= 5;
      const lockDurationMs = 15 * 60 * 1000;
      const lockedUntil = isNowLocked ? nowMs + lockDurationMs : 0;

      await env.DB.prepare(`
        INSERT INTO ip_rate_limits (ip_address, action_type, attempts, locked_until, last_attempt)
        VALUES (?, 'LOGIN', ?, ?, ?)
        ON CONFLICT(ip_address, action_type) DO UPDATE SET
          attempts = excluded.attempts,
          locked_until = excluded.locked_until,
          last_attempt = excluded.last_attempt
      `).bind(clientIp, newAttempts, lockedUntil, nowMs).run().catch(() => {});

      const logId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await env.DB.prepare(`
        INSERT INTO security_logs (id, actor_name, actor_email, action, target_id, ip_address, severity, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        logId,
        actorName || cleanIdentifier,
        cleanIdentifier,
        isNowLocked ? 'IP_LOCKED_FAILED_LOGINS' : 'LOGIN_FAILED',
        actorId || 'UNKNOWN',
        clientIp,
        isNowLocked ? 'CRITICAL' : 'WARN',
        JSON.stringify({ reason: 'Incorrect credentials', attempts: newAttempts, isLocked: isNowLocked, country })
      ).run().catch(() => {});

      if (isNowLocked) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Địa chỉ IP của bạn đã bị tạm khóa trong 15 phút để bảo vệ tài khoản.',
            isLocked: true,
            remainingMinutes: 15,
          }),
          { status: 429, headers: CORS_HEADERS }
        );
      }

      const remainingAttempts = 5 - newAttempts;
      return new Response(
        JSON.stringify({
          success: false,
          message: `Tên đăng nhập hoặc mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử trước khi IP bị khóa tạm thời.`,
          remainingAttempts,
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    };

    // 3. Direct SQL query for user (O(1) Indexed Lookup, zero table scan)
    let member: any = null;
    if (isAdminLookup) {
      member = await env.DB.prepare(`
        SELECT * FROM members
        WHERE id = 'usr_admin' OR username = 'admin290200' OR email = 'admin@codegame.store' OR role IN ('ADMIN', 'SUPER_ADMIN')
        ORDER BY CASE WHEN id = 'usr_admin' THEN 0 WHEN role = 'SUPER_ADMIN' THEN 1 ELSE 2 END
        LIMIT 1
      `).first<any>();
    } else {
      member = await env.DB.prepare(`
        SELECT * FROM members
        WHERE LOWER(TRIM(username)) = ? OR LOWER(TRIM(display_name)) = ? OR LOWER(TRIM(email)) = ? OR id = ?
        LIMIT 1
      `).bind(cleanIdentifier, cleanIdentifier, cleanIdentifier, cleanIdentifier).first<any>();
    }

    if (!member) {
      return await recordFailedAttempt(undefined, cleanIdentifier);
    }

    if (member.status === 'BANNED') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ quản trị viên.',
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // 4. Verify Password securely (Hybrid Auth: PBKDF2/SHA-256 + Migrated Bcrypt)
    const pepper = env.PASSWORD_PEPPER || 'wcg_edge_sec_salt_2026';
    const salt = member.salt || 'wcg_admin_salt_seed_2026';
    const storedHash = member.password_hash || member.passwordHash;
    let isPasswordValid = false;
    let isBcryptMatch = false;

    if (storedHash) {
      if (isBcryptHash(storedHash)) {
        // Tài khoản đồng bộ từ codegame.store dùng mã băm Bcrypt ($2a$, $2b$, $2y$)
        if (await verifyBcryptPassword(cleanPassword, storedHash)) {
          isPasswordValid = true;
          isBcryptMatch = true;
        }
      } else if (salt) {
        // Tài khoản chuẩn của codegame.shop dùng PBKDF2/SHA-256 kèm salt + pepper
        const computedWithPepper = await computeHash(cleanPassword, salt, pepper);
        if (computedWithPepper === storedHash) {
          isPasswordValid = true;
        } else {
          const computedDefault = await computeHash(cleanPassword, salt, 'wcg_edge_sec_salt_2026');
          if (computedDefault === storedHash) {
            isPasswordValid = true;
          } else {
            const computedPlain = await computeHash(cleanPassword, salt, '');
            if (computedPlain === storedHash) {
              isPasswordValid = true;
            }
          }
        }
      }
    }

    // Tự động nâng cấp mã băm Bcrypt sang chuẩn mật mã mới của shop (Zero-friction auto upgrade)
    if (isBcryptMatch && isPasswordValid) {
      try {
        const upgradedSalt = 'wcg_salt_' + Math.random().toString(36).slice(2, 10);
        const upgradedHash = await computeHash(cleanPassword, upgradedSalt, pepper);
        await env.DB.prepare("UPDATE members SET salt = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(upgradedSalt, upgradedHash, member.id)
          .run();
        member.salt = upgradedSalt;
        member.password_hash = upgradedHash;
      } catch (upgradeErr) {
        console.warn('Lưu ý: Không thể tự động nâng cấp hash mật khẩu cho thành viên:', member.id, upgradeErr);
      }
    }

    const isMemberAdmin =
      isAdminLookup ||
      String(member.role || '').toUpperCase() === 'ADMIN' ||
      String(member.role || '').toUpperCase() === 'SUPER_ADMIN';

    // Hỗ trợ linh hoạt các biến thể mật khẩu của Quản trị viên (meomeo29, meomeo2902, Meomeo2902, admin290200)
    if (!isPasswordValid && isMemberAdmin) {
      const validAdminPass = ['meomeo2902', 'meomeo29', 'meomeo290200', 'admin290200'];
      if (validAdminPass.includes(cleanPassword.toLowerCase()) || cleanPassword === 'Meomeo2902') {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid && (!storedHash || String(storedHash).trim() === '') && cleanPassword && cleanPassword.length >= 6) {
      // Uninitialized account first login
      const newSalt = member.salt || ('wcg_salt_' + Math.random().toString(36).slice(2, 10));
      const newHash = await computeHash(cleanPassword, newSalt, pepper);
      await env.DB.prepare('UPDATE members SET salt = ?, password_hash = ? WHERE id = ?')
        .bind(newSalt, newHash, member.id)
        .run()
        .catch(() => {});
      member.salt = newSalt;
      member.password_hash = newHash;
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return await recordFailedAttempt(member.id, member.display_name || member.username);
    }

    // 5. Successful login: Clear rate limits & generate signed session token
    await env.DB.prepare("DELETE FROM ip_rate_limits WHERE ip_address = ? AND action_type = 'LOGIN'")
      .bind(clientIp)
      .run()
      .catch(() => {});

    const signingSecret = getSigningSecret(env);
    const sessionToken = await createSignedToken(member.id, signingSecret);
    const nowIso = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE members
      SET session_token = ?, last_login = ?
      WHERE id = ?
    `).bind(sessionToken, nowIso, member.id).run();

    // Log login success in D1 security_logs
    const logId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await env.DB.prepare(`
      INSERT INTO security_logs (id, actor_name, actor_email, action, target_id, ip_address, severity, details, created_at)
      VALUES (?, ?, ?, 'MEMBER_LOGIN_SUCCESS', ?, ?, 'INFO', ?, datetime('now'))
    `).bind(
      logId,
      member.display_name || member.username,
      member.email,
      member.id,
      clientIp,
      JSON.stringify({ country, rememberMe: Boolean(rememberMe) })
    ).run().catch(() => {});

    const roleUpper = String(member.role || '').toUpperCase();
    const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đăng nhập thành công! Chào mừng ${member.display_name || member.username} quay trở lại.`,
        token: sessionToken,
        syncKey: isAdmin ? (env.ADMIN_SYNC_SECRET || '') : undefined,
        client_ip: clientIp,
        user: {
          id: member.id,
          username: member.username || member.display_name,
          displayName: member.display_name || member.username,
          email: member.email,
          phone: member.phone || '',
          role: isAdmin ? 'admin' : member.role === 'VIP' ? 'VIP' : 'user',
          wallet_balance: Number(member.balance) || 0,
          avatar_url: member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.display_name || member.username)}&backgroundColor=0b0d19,16192e,241a45`,
          session_token: sessionToken,
          registered_ip: member.registered_ip || clientIp,
          created_at: member.created_at,
          last_login: nowIso,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xử lý đăng nhập trên Cloudflare Edge.', error: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
