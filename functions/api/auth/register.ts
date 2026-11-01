import { ensureSchemaUpgrades } from '../../services/d1_service';
import { createSignedToken, getSigningSecret, computeHash } from '../../services/auth_service';

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
    const { username, email, passwordHash, salt, displayName, phone, turnstileToken, password } = body;

    // 1. Validation
    if (!username || !email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng cung cấp đầy đủ tên đăng nhập và email.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    // XSS & Script Tag Injection Prevention
    if (/<[^>]*>?/gm.test(cleanUsername) || cleanUsername.includes('<') || cleanUsername.includes('>')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tên đăng nhập không được chứa mã HTML hoặc thẻ script.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const country = request.headers.get('cf-ipcountry') || 'VN';

    // 2. Turnstile Anti-bot Token check
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

    // 3. Check for duplicates in D1 (SSOT)
    const dup = await env.DB.prepare(`
      SELECT id FROM members
      WHERE LOWER(username) = ? OR LOWER(display_name) = ? OR LOWER(email) = ?
      LIMIT 1
    `).bind(cleanUsername, cleanUsername, cleanEmail).first();

    if (dup) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Tên đăng nhập hoặc email này đã được sử dụng trên hệ thống.',
        }),
        { status: 409, headers: CORS_HEADERS }
      );
    }

    // 4. IP Daily Registration Limit (Max 2 accounts / IP / day)
    const ipRow = await env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM members
      WHERE registered_ip = ? AND created_at >= date('now', 'start of day')
    `).bind(clientIp).first<any>();
    const ipCountToday = Number(ipRow?.cnt) || 0;

    if (ipCountToday >= 2) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Địa chỉ IP của bạn đã đạt giới hạn tạo tối đa 2 tài khoản trong 1 ngày. Vui lòng quay lại vào ngày mai.',
        }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 5. Create new Member record in D1
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const signingSecret = getSigningSecret(env);
    const sessionToken = await createSignedToken(userId, signingSecret);
    const nowIso = new Date().toISOString();
    const finalDisplayName = (displayName ? String(displayName).replace(/<[^>]*>?/gm, '').trim() : '') || cleanUsername;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}&backgroundColor=0b0d19,16192e,241a45`;

    const finalSalt = salt || ('wcg_salt_' + Math.random().toString(36).slice(2, 10));
    let finalPasswordHash = passwordHash;
    if (!finalPasswordHash && password) {
      const pepper = env.PASSWORD_PEPPER || 'wcg_edge_sec_salt_2026';
      finalPasswordHash = await computeHash(password, finalSalt, pepper);
    }

    await env.DB.prepare(`
      INSERT INTO members (id, username, display_name, email, phone, role, balance, total_spent, status, salt, password_hash, avatar_url, session_token, last_login, created_at, registered_ip)
      VALUES (?, ?, ?, ?, ?, 'MEMBER', 0, 0, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      cleanUsername,
      finalDisplayName,
      cleanEmail,
      phone?.trim() || '',
      finalSalt,
      finalPasswordHash || '',
      avatarUrl,
      sessionToken,
      nowIso,
      nowIso,
      clientIp
    ).run();

    // 6. Security Log
    const logId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await env.DB.prepare(`
      INSERT INTO security_logs (id, actor_name, actor_email, action, target_id, ip_address, severity, details, created_at)
      VALUES (?, ?, ?, 'MEMBER_REGISTER', ?, ?, 'INFO', ?, datetime('now'))
    `).bind(
      logId,
      finalDisplayName,
      cleanEmail,
      userId,
      clientIp,
      JSON.stringify({ country })
    ).run().catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        token: sessionToken,
        client_ip: clientIp,
        user: {
          id: userId,
          username: cleanUsername,
          displayName: finalDisplayName,
          email: cleanEmail,
          phone: phone?.trim() || '',
          role: 'user',
          wallet_balance: 0,
          avatar_url: avatarUrl,
          session_token: sessionToken,
          registered_ip: clientIp,
          created_at: nowIso,
        },
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xử lý đăng ký trên Cloudflare Edge.', error: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
