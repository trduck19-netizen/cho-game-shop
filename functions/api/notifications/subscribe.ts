import { ensureNotificationTablesD1 } from './_emailHelper';

interface Env {
  DB?: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS_HEADERS });

/**
 * Đăng ký hoặc cập nhật tùy chọn nhận thông báo email
 */
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    // Kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Địa chỉ email không hợp lệ.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const userId = body.userId ? String(body.userId).trim() : null;
    const notifyFollowedCodes = body.notifyFollowedCodes !== false ? 1 : 0;
    const notifyGiveaways = body.notifyGiveaways !== false ? 1 : 0;
    const notifySales = body.notifySales !== false ? 1 : 0;
    
    let subscribedGames: string[] = [];
    if (Array.isArray(body.subscribedGames)) {
      subscribedGames = Array.from(new Set(body.subscribedGames.map(String).map((s) => s.trim()))).filter(Boolean);
    }

    const nowIso = new Date().toISOString();

    if (env.DB) {
      await ensureNotificationTablesD1(env.DB);

      // Tra cứu xem email đã tồn tại chưa
      const existing: any = await env.DB.prepare(
        'SELECT * FROM email_subscribers WHERE email = ? LIMIT 1'
      ).bind(email).first().catch(() => null);

      if (existing) {
        // Cập nhật subscription hiện có
        let mergedGames = subscribedGames;
        if (body.mergeGames === true) {
          try {
            const oldGames = JSON.parse(existing.subscribed_games || '[]');
            if (Array.isArray(oldGames)) {
              mergedGames = Array.from(new Set([...oldGames, ...subscribedGames]));
            }
          } catch {}
        }

        await env.DB.prepare(`
          UPDATE email_subscribers 
          SET user_id = COALESCE(?, user_id),
              notify_followed_codes = ?,
              notify_giveaways = ?,
              notify_sales = ?,
              subscribed_games = ?,
              is_active = 1,
              updated_at = ?
          WHERE id = ?
        `).bind(
          userId,
          notifyFollowedCodes,
          notifyGiveaways,
          notifySales,
          JSON.stringify(mergedGames),
          nowIso,
          existing.id
        ).run();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Đã cập nhật cài đặt nhận thông báo email thành công!',
            subscriber: {
              id: existing.id,
              email,
              userId: userId || existing.user_id,
              notifyFollowedCodes: Boolean(notifyFollowedCodes),
              notifyGiveaways: Boolean(notifyGiveaways),
              notifySales: Boolean(notifySales),
              subscribedGames: mergedGames,
              isActive: true,
            },
          }),
          { headers: CORS_HEADERS }
        );
      } else {
        // Tạo mới subscriber
        const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const unsubToken = `unsub_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

        await env.DB.prepare(`
          INSERT INTO email_subscribers 
          (id, email, user_id, notify_followed_codes, notify_giveaways, notify_sales, subscribed_games, unsubscribe_token, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(
          subId,
          email,
          userId,
          notifyFollowedCodes,
          notifyGiveaways,
          notifySales,
          JSON.stringify(subscribedGames),
          unsubToken,
          nowIso,
          nowIso
        ).run();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Đăng ký nhận thông báo email thành công!',
            subscriber: {
              id: subId,
              email,
              userId,
              notifyFollowedCodes: Boolean(notifyFollowedCodes),
              notifyGiveaways: Boolean(notifyGiveaways),
              notifySales: Boolean(notifySales),
              subscribedGames,
              isActive: true,
            },
          }),
          { headers: CORS_HEADERS }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err?.message || 'Lỗi xử lý đăng ký email' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * Lấy thông tin đăng ký của email / userId
 */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const userId = (url.searchParams.get('userId') || '').trim();

  if (!email && !userId) {
    return new Response(
      JSON.stringify({ success: false, message: 'Thiếu email hoặc userId.' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (env.DB) {
    await ensureNotificationTablesD1(env.DB);
    let record: any = null;
    if (email) {
      record = await env.DB.prepare('SELECT * FROM email_subscribers WHERE email = ? LIMIT 1').bind(email).first().catch(() => null);
    } else if (userId) {
      record = await env.DB.prepare('SELECT * FROM email_subscribers WHERE user_id = ? LIMIT 1').bind(userId).first().catch(() => null);
    }

    if (record) {
      let games = [];
      try { games = JSON.parse(record.subscribed_games || '[]'); } catch {}

      return new Response(
        JSON.stringify({
          success: true,
          subscriber: {
            id: record.id,
            email: record.email,
            userId: record.user_id,
            notifyFollowedCodes: Boolean(record.notify_followed_codes),
            notifyGiveaways: Boolean(record.notify_giveaways),
            notifySales: Boolean(record.notify_sales),
            subscribedGames: games,
            isActive: Boolean(record.is_active),
          },
        }),
        { headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: true, subscriber: null }),
      { headers: CORS_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
    { status: 500, headers: CORS_HEADERS }
  );
};
