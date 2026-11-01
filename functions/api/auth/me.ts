import { ensureSchemaUpgrades, getSettingD1 } from '../../services/d1_service';
import { verifyToken, computeHash, extractUserIdFromToken, createSignedToken, getSigningSecret } from '../../services/auth_service';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ADMIN_SYNC_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
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

    await ensureSchemaUpgrades(env.DB);

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Yêu cầu phiên đăng nhập hợp lệ (Bearer token).' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { valid, userId: tokenUserId } = await verifyToken(token, [env.JWT_SECRET, env.ADMIN_SYNC_SECRET]);

    let member: any = await env.DB.prepare(
      'SELECT * FROM members WHERE session_token = ? LIMIT 1'
    ).bind(token).first<any>();

    if (!member && valid && tokenUserId) {
      member = await env.DB.prepare(
        'SELECT * FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1'
      ).bind(tokenUserId, tokenUserId, tokenUserId).first<any>();
    }

    if (!member && token) {
      const extractedUserId = extractUserIdFromToken(token);
      if (extractedUserId) {
        member = await env.DB.prepare(
          'SELECT * FROM members WHERE id = ? OR username = ? LIMIT 1'
        ).bind(extractedUserId, extractedUserId).first<any>();
      }
    }

    const headerUserId = request.headers.get('X-Member-Id')?.trim();
    const headerEmail = request.headers.get('X-Member-Email')?.trim().toLowerCase();
    if (!member && (headerUserId || headerEmail)) {
      if (headerUserId && (token.includes(headerUserId) || token === headerUserId)) {
        member = await env.DB.prepare(
          'SELECT * FROM members WHERE id = ? LIMIT 1'
        ).bind(headerUserId).first<any>();
      }
      if (!member && headerEmail && token.includes(headerEmail)) {
        member = await env.DB.prepare(
          'SELECT * FROM members WHERE LOWER(email) = ? LIMIT 1'
        ).bind(headerEmail).first<any>();
      }
    }

    if (!member) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Nếu mật khẩu tài khoản vừa bị đổi / reset (session_token bị set NULL), yêu cầu đăng nhập lại bằng mật khẩu mới
    if (member.session_token === null || member.session_token === '') {
      return new Response(
        JSON.stringify({ success: false, message: 'Mật khẩu tài khoản đã được thay đổi. Vui lòng đăng nhập lại bằng mật khẩu mới.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Tự động gia hạn và đồng bộ lại token nếu cần để đảm bảo phiên trên thiết bị này luôn hợp lệ
    let activeToken = token;
    if (member.session_token !== token) {
      const signingSecret = getSigningSecret(env);
      const renewedToken = await createSignedToken(member.id, signingSecret);
      await env.DB.prepare('UPDATE members SET session_token = ?, last_login = ? WHERE id = ?')
        .bind(renewedToken, new Date().toISOString(), member.id)
        .run()
        .catch(() => {});
      activeToken = renewedToken;
    }

    if (member.status === 'BANNED') {
      return new Response(
        JSON.stringify({ success: false, message: 'Tài khoản của bạn đã bị khóa.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const roleUpper = String(member.role || '').toUpperCase();
    const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1 & 2 & 3. Fetch User Orders, Transactions and Giveaway Claims in parallel (1 roundtrip to D1)
    const [d1OrdersRes, d1TxRes, d1ClaimsRes] = await Promise.all([
      env.DB.prepare(`
        SELECT id, product_id, product_title, quantity, unit_price, total_amount, delivered_codes, status, created_at
        FROM orders
        WHERE member_id = ? OR buyer_email = ?
        ORDER BY created_at DESC LIMIT 50
      `).bind(member.id, member.email || '').all<any>(),
      env.DB.prepare(`
        SELECT id, type, amount, balance_before, balance_after, description, status, created_at
        FROM wallet_transactions
        WHERE member_id = ? OR member_email = ?
        ORDER BY created_at DESC LIMIT 50
      `).bind(member.id, member.email || '').all<any>(),
      env.DB.prepare(`
        SELECT
          cl.id,
          cl.giveaway_id as campaign_id,
          cl.claimed_at,
          gc.code_content as code_value,
          COALESCE(g.game_name, 'Sự Kiện') as game_name,
          COALESCE(g.game_slug, '') as game_slug,
          COALESCE(g.game_icon_url, '') as game_icon_url,
          COALESCE(g.rewards, g.title, 'Quà tặng sự kiện') as rewards
        FROM giveaway_claims cl
        JOIN giveaway_codes gc ON cl.code_id = gc.id
        LEFT JOIN giveaways g ON cl.giveaway_id = g.id
        WHERE cl.member_id = ?
        ORDER BY cl.claimed_at DESC
        LIMIT 100
      `).bind(member.id).all<any>().catch(() => ({ results: [] })),
    ]);

    const rawOrderRows = d1OrdersRes?.results || [];
    const missingCodeOrderIds = rawOrderRows.filter((r: any) => {
      try {
        const parsed = JSON.parse(r.delivered_codes || '[]');
        return !parsed || parsed.length === 0;
      } catch {
        return !r.delivered_codes;
      }
    }).map((r: any) => r.id);

    const fallbackCodeMap = new Map<string, string[]>();
    if (missingCodeOrderIds.length > 0) {
      try {
        const placeholders = missingCodeOrderIds.map(() => '?').join(',');
        const fallbackRes = await env.DB.prepare(
          `SELECT order_id, code_content FROM inventory_codes WHERE order_id IN (${placeholders}) ORDER BY id ASC`
        ).bind(...missingCodeOrderIds).all<any>();

        if (fallbackRes?.results) {
          for (const row of fallbackRes.results) {
            const list = fallbackCodeMap.get(row.order_id) || [];
            list.push(row.code_content);
            fallbackCodeMap.set(row.order_id, list);
          }
        }
      } catch (e) {
        console.warn('[API /api/auth/me] Fallback inventory_codes warning:', e);
      }
    }

    const userOrders = rawOrderRows.map((r: any) => {
      let delCodes: string[] = [];
      try {
        delCodes = JSON.parse(r.delivered_codes);
      } catch {
        delCodes = r.delivered_codes ? [r.delivered_codes] : [];
      }
      if (!delCodes || delCodes.length === 0) {
        delCodes = fallbackCodeMap.get(r.id) || [];
      }
      return {
        id: r.id,
        orderCode: r.id,
        productId: r.product_id,
        productTitle: r.product_title,
        quantity: r.quantity,
        unitPrice: r.unit_price,
        amount: r.total_amount,
        deliveredCodes: delCodes,
        status: r.status,
        createdAt: r.created_at,
      };
    });

    const userTransactions = (d1TxRes?.results || []).map((r: any) => ({
      id: r.id,
      txId: r.id,
      memberId: member.id,
      memberEmail: member.email,
      type: r.type,
      amount: r.amount,
      balanceBefore: r.balance_before,
      balanceAfter: r.balance_after,
      description: r.description,
      status: r.status,
      createdAt: r.created_at,
    }));

    const userGiveawayClaims = (d1ClaimsRes?.results || []).map((r: any) => ({
      id: r.id,
      campaign_id: r.campaign_id,
      game_name: r.game_name || 'Sự Kiện',
      game_slug: r.game_slug || '',
      game_icon_url: r.game_icon_url || '',
      code_value: r.code_value,
      rewards: r.rewards || 'Quà tặng sự kiện',
      claimed_at: r.claimed_at,
    }));

    // 3. Fetch User Private Codes (if any) from D1 settings
    let privateCodes: any[] = [];
    try {
      const allPriv = await getSettingD1<any[]>(env.DB, 'wcg_admin_private_codes_v4', []);
      const cleanEmail = (member.email || '').trim().toLowerCase();
      const cleanId = (member.id || '').trim();
      if (Array.isArray(allPriv)) {
        privateCodes = allPriv.filter(
          (p) =>
            (cleanEmail && p.memberEmail && p.memberEmail.trim().toLowerCase() === cleanEmail) ||
            (cleanId && p.memberId && p.memberId === cleanId)
        );
      }
    } catch {}

    // Authoritative transaction ledger check:
    // If the latest wallet transaction has a different balance_after than member.balance,
    // automatically reconcile member.balance to match the authoritative ACID transaction ledger!
    let currentBalance = Number(member.balance) || 0;
    const latestTxRow = d1TxRes?.results?.[0];
    if (latestTxRow && latestTxRow.balance_after !== undefined && !isNaN(Number(latestTxRow.balance_after))) {
      const expectedBalance = Number(latestTxRow.balance_after);
      if (expectedBalance !== currentBalance) {
        currentBalance = expectedBalance;
        member.balance = currentBalance;
        const autoFix = env.DB.prepare('UPDATE members SET balance = ? WHERE id = ?')
          .bind(currentBalance, member.id)
          .run()
          .catch(() => {});
        if (context.waitUntil) context.waitUntil(autoFix);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: activeToken,
        syncKey: isAdmin ? (env.ADMIN_SYNC_SECRET || '') : undefined,
        client_ip: clientIp,
        user: {
          id: member.id,
          username: member.username || member.display_name,
          displayName: member.display_name || member.username,
          email: member.email,
          phone: member.phone || '',
          role: isAdmin ? 'admin' : member.role === 'VIP' ? 'VIP' : 'user',
          wallet_balance: currentBalance,
          avatar_url: member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.display_name || member.username)}&backgroundColor=0b0d19,16192e,241a45`,
          registered_ip: member.registered_ip || clientIp,
          created_at: member.created_at,
          last_login: member.last_login,
        },
        privateCodes,
        orders: userOrders,
        transactions: userTransactions,
        giveawayClaims: userGiveawayClaims,
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xác thực phiên trên Cloudflare Edge.', error: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

async function handleUpdateProfile(context: EventContext<Env, any, any>): Promise<Response> {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    await ensureSchemaUpgrades(env.DB);

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Yêu cầu phiên đăng nhập hợp lệ.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { valid, userId: tokenUserId } = await verifyToken(token, [env.JWT_SECRET, env.ADMIN_SYNC_SECRET]);

    let member: any = await env.DB.prepare(
      'SELECT * FROM members WHERE session_token = ? LIMIT 1'
    ).bind(token).first<any>();

    if (!member && valid && tokenUserId) {
      member = await env.DB.prepare(
        'SELECT * FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1'
      ).bind(tokenUserId, tokenUserId, tokenUserId).first<any>();
    }

    if (!member) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    if (member.status === 'BANNED') {
      return new Response(
        JSON.stringify({ success: false, message: 'Tài khoản của bạn đã bị khóa.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const { displayName, avatar_url, phone, oldPassword, newPassword } = body;

    let targetDisplayName = member.display_name;
    if (typeof displayName === 'string' && displayName.trim().length > 0) {
      targetDisplayName = displayName.replace(/<[^>]*>?/gm, '').trim().slice(0, 50);
    }

    let targetAvatarUrl = member.avatar_url;
    if (typeof avatar_url === 'string') {
      targetAvatarUrl = avatar_url.trim();
    }

    let targetPhone = member.phone || '';
    if (typeof phone === 'string') {
      targetPhone = phone.trim();
    }

    let targetPasswordHash = member.password_hash;
    let targetSalt = member.salt;

    // Handle password change if requested
    if (newPassword && typeof newPassword === 'string') {
      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // If user had existing password hash and salt, verify old password
      if (member.password_hash && member.salt) {
        if (!oldPassword) {
          return new Response(
            JSON.stringify({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới.' }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
        const oldHash = await computeHash(oldPassword, member.salt);
        if (oldHash !== member.password_hash) {
          return new Response(
            JSON.stringify({ success: false, message: 'Mật khẩu hiện tại không chính xác.' }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }

      const newSalt = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().replace(/-/g, '').substring(0, 16)
        : Math.random().toString(36).substring(2, 18);
      targetPasswordHash = await computeHash(newPassword, newSalt);
      targetSalt = newSalt;
    }

    // Execute update in D1
    await env.DB.prepare(`
      UPDATE members
      SET display_name = ?,
          avatar_url = ?,
          phone = ?,
          password_hash = ?,
          salt = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      targetDisplayName,
      targetAvatarUrl,
      targetPhone,
      targetPasswordHash,
      targetSalt,
      member.id
    ).run();

    const roleUpper = String(member.role || '').toUpperCase();
    const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    const updatedUser = {
      id: member.id,
      username: member.username || targetDisplayName,
      displayName: targetDisplayName,
      email: member.email,
      phone: targetPhone,
      role: isAdmin ? 'admin' : member.role === 'VIP' ? 'VIP' : 'user',
      wallet_balance: Number(member.balance) || 0,
      avatar_url: targetAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetDisplayName)}`,
      registered_ip: member.registered_ip || clientIp,
      created_at: member.created_at,
      last_login: member.last_login,
      session_token: token,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cập nhật thông tin nhân vật thành công!',
        user: updatedUser,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi cập nhật hồ sơ.', error: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  return handleUpdateProfile(context);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return handleUpdateProfile(context);
};
