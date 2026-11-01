import { verifyToken } from '../../services/auth_service';
import { DEFAULT_EMAIL_CONFIG, EmailProviderConfig } from './_emailHelper';

interface Env {
  DB?: any;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
 * Lấy cấu hình email provider
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
    try {
      const row: any = await env.DB.prepare(
        'SELECT value FROM system_settings WHERE key = ? LIMIT 1'
      ).bind('wcg_email_provider_config_v1').first().catch(() => null);

      let config = DEFAULT_EMAIL_CONFIG;
      if (row && row.value) {
        try { config = { ...DEFAULT_EMAIL_CONFIG, ...JSON.parse(row.value) }; } catch {}
      }

      return new Response(
        JSON.stringify({ success: true, config }),
        { headers: CORS_HEADERS }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, message: err?.message || 'Lỗi đọc cấu hình' }),
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
 * Lưu cấu hình email provider
 */
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  const auth = await isAuthorizedAdmin(request, env);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, message: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const body: any = await request.json().catch(() => ({}));
    const newConfig: EmailProviderConfig = {
      provider: body.provider === 'brevo' ? 'brevo' : 'resend',
      apiKey: String(body.apiKey || '').trim(),
      senderEmail: String(body.senderEmail || 'notifications@codegame.shop').trim(),
      senderName: String(body.senderName || 'CodeGame.shop - Thông Báo Sự Kiện & Code Game').trim(),
      isEnabled: Boolean(body.isEnabled),
    };

    if (env.DB) {
      await env.DB.prepare(`
        INSERT INTO system_settings (key, value, updated_at) 
        VALUES ('wcg_email_provider_config_v1', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).bind(JSON.stringify(newConfig), new Date().toISOString()).run();

      return new Response(
        JSON.stringify({ success: true, message: 'Đã lưu cấu hình email thành công!', config: newConfig }),
        { headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err?.message || 'Lỗi lưu cấu hình email' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
