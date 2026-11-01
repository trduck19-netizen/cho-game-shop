import { verifyToken } from '../../services/auth_service';
import { ensureNotificationTablesD1 } from './_emailHelper';

interface Env {
  DB?: any;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Requested-With',
};

async function isAuthorizedAdmin(request: Request, env: Env): Promise<boolean> {
  const configuredSecret = (env.ADMIN_SYNC_SECRET || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const syncKeyHeader = request.headers.get('X-Sync-Key') || '';

  if (configuredSecret && configuredSecret.length >= 16) {
    if (syncKeyHeader && syncKeyHeader === configuredSecret) return true;
    if (authHeader.startsWith('Bearer ') && authHeader.replace('Bearer ', '').trim() === configuredSecret) return true;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const secrets = [env.JWT_SECRET, env.ADMIN_SYNC_SECRET];
    const { valid, userId } = await verifyToken(token, secrets);
    if (valid && userId && env.DB) {
      const member = await env.DB.prepare('SELECT role FROM members WHERE id = ?').bind(userId).first<any>().catch(() => null);
      if (member && (member.role === 'ADMIN' || member.role === 'SUPER_ADMIN')) {
        return true;
      }
    }
  }

  return false;
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS_HEADERS });

/**
 * Lấy danh sách subscribers cho Admin
 */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  const auth = await isAuthorizedAdmin(request, env);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, message: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (env.DB) {
    await ensureNotificationTablesD1(env.DB);
    try {
      const rows: any = await env.DB.prepare(
        'SELECT * FROM email_subscribers ORDER BY created_at DESC LIMIT 500'
      ).all().catch(() => ({ results: [] }));

      const subscribers = (rows?.results || []).map((r: any) => {
        let games = [];
        try { games = JSON.parse(r.subscribed_games || '[]'); } catch {}
        return {
          id: r.id,
          email: r.email,
          userId: r.user_id,
          notifyFollowedCodes: Boolean(r.notify_followed_codes),
          notifyGiveaways: Boolean(r.notify_giveaways),
          notifySales: Boolean(r.notify_sales),
          subscribedGames: games,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      });

      return new Response(
        JSON.stringify({ success: true, subscribers }),
        { headers: CORS_HEADERS }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, message: err?.message || 'Lỗi đọc danh sách subscribers' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
    { status: 500, headers: CORS_HEADERS }
  );
};

/**
 * Xóa hoặc đổi trạng thái subscriber
 */
export const onRequestDelete = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  const auth = await isAuthorizedAdmin(request, env);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, message: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu ID subscriber cần xóa.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (env.DB) {
      await env.DB.prepare('DELETE FROM email_subscribers WHERE id = ?').bind(id).run();
      return new Response(
        JSON.stringify({ success: true, message: 'Đã xóa người đăng ký thành công.' }),
        { headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err?.message || 'Lỗi xóa subscriber' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
