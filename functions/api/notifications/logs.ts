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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * Lấy danh sách 100 log gửi email gần nhất cho Admin
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
        'SELECT * FROM email_notification_logs ORDER BY created_at DESC LIMIT 100'
      ).all().catch(() => ({ results: [] }));

      const logs = (rows?.results || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        subject: r.subject,
        recipientCount: Number(r.recipient_count || 0),
        successCount: Number(r.success_count || 0),
        status: r.status,
        sentBy: r.sent_by,
        errorMessage: r.error_message,
        createdAt: r.created_at,
      }));

      return new Response(
        JSON.stringify({ success: true, logs }),
        { headers: CORS_HEADERS }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, message: err?.message || 'Lỗi đọc logs email' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
    { status: 500, headers: CORS_HEADERS }
  );
};
