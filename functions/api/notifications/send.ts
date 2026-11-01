import { verifyToken } from '../../services/auth_service';
import {
  DEFAULT_EMAIL_CONFIG,
  EmailProviderConfig,
  dispatchEmail,
  buildCyberpunkEmailHtml,
  ensureNotificationTablesD1,
} from './_emailHelper';

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
 * Gửi email thông báo (Thử nghiệm / Broadcast / Sự kiện tự động)
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
    const type: 'CODE_DROP' | 'GIVEAWAY' | 'FLASH_SALE' | 'BROADCAST' | 'TEST' = body.type || 'BROADCAST';
    const targetGroup: 'ALL' | 'GIVEAWAY' | 'SALE' | 'GAME' = body.targetGroup || 'ALL';
    const gameSlug = String(body.gameSlug || '').trim();
    const gameName = String(body.gameName || '').trim();
    const testEmail = String(body.testEmail || '').trim().toLowerCase();

    const title = String(body.title || 'Thông báo từ CodeGame.shop').trim();
    const subject = String(body.subject || title).trim();
    const description = String(body.description || body.message || 'Có cập nhật mới trên website.').trim();
    const ctaText = body.ctaText ? String(body.ctaText).trim() : undefined;
    const ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim() : undefined;
    const codes = Array.isArray(body.codes) ? body.codes : undefined;

    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    await ensureNotificationTablesD1(env.DB);

    // 1. Lấy cấu hình email provider từ D1
    const row: any = await env.DB.prepare(
      'SELECT value FROM system_settings WHERE key = ? LIMIT 1'
    ).bind('wcg_email_provider_config_v1').first().catch(() => null);

    let config: EmailProviderConfig = DEFAULT_EMAIL_CONFIG;
    if (row && row.value) {
      try { config = { ...DEFAULT_EMAIL_CONFIG, ...JSON.parse(row.value) }; } catch {}
    }

    if (!config.apiKey || !config.apiKey.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Chưa cấu hình API Key cho nhà cung cấp email (Resend / Brevo). Vui lòng vào Cài đặt để thêm key.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Lọc danh sách người nhận
    interface Recipient {
      email: string;
      token: string;
    }
    const recipients: Recipient[] = [];

    if (type === 'TEST') {
      if (!testEmail) {
        return new Response(
          JSON.stringify({ success: false, message: 'Thiếu email nhận thử nghiệm.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      recipients.push({ email: testEmail, token: 'test_token' });
    } else {
      let query = 'SELECT email, unsubscribe_token, notify_followed_codes, notify_giveaways, notify_sales, subscribed_games FROM email_subscribers WHERE is_active = 1';
      const rows: any = await env.DB.prepare(query).all().catch(() => ({ results: [] }));
      const allSubs = rows?.results || [];

      for (const s of allSubs) {
        let match = false;
        if (targetGroup === 'ALL') {
          match = true;
        } else if (targetGroup === 'GIVEAWAY' || type === 'GIVEAWAY') {
          if (s.notify_giveaways === 1) match = true;
        } else if (targetGroup === 'SALE' || type === 'FLASH_SALE') {
          if (s.notify_sales === 1) match = true;
        } else if (targetGroup === 'GAME' || type === 'CODE_DROP') {
          if (s.notify_followed_codes === 1 && gameSlug) {
            try {
              const games = JSON.parse(s.subscribed_games || '[]');
              if (Array.isArray(games) && games.includes(gameSlug)) {
                match = true;
              }
            } catch {}
          }
        }

        if (match && s.email) {
          recipients.push({ email: s.email, token: s.unsubscribe_token || 'unsub' });
        }
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Không tìm thấy người đăng ký nào phù hợp với nhóm đã chọn.',
          recipientCount: 0,
          successCount: 0,
        }),
        { headers: CORS_HEADERS }
      );
    }

    // 3. Thực hiện gửi mail
    let successCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const r of recipients) {
      const unsubUrl = `https://codegame.shop/api/notifications/unsubscribe?token=${encodeURIComponent(r.token)}`;
      const html = buildCyberpunkEmailHtml({
        type,
        title,
        description,
        gameName,
        codes,
        ctaText,
        ctaUrl,
        unsubscribeUrl: unsubUrl,
      });

      const res = await dispatchEmail(config, {
        to: r.email,
        subject,
        html,
      });

      if (res.success) {
        successCount++;
      } else {
        failedCount++;
        lastError = res.error || 'Gửi thất bại';
      }
    }

    // 4. Ghi log lịch sử gửi
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await env.DB.prepare(`
      INSERT INTO email_notification_logs 
      (id, type, title, subject, recipient_count, success_count, status, sent_by, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ADMIN', ?, ?)
    `).bind(
      logId,
      type,
      title,
      subject,
      recipients.length,
      successCount,
      successCount > 0 ? 'SENT' : 'FAILED',
      lastError || null,
      new Date().toISOString()
    ).run().catch(() => {});

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: successCount > 0
          ? `Đã gửi thành công ${successCount}/${recipients.length} email!`
          : `Gửi thất bại: ${lastError}`,
        recipientCount: recipients.length,
        successCount,
        failedCount,
        error: lastError || undefined,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err?.message || 'Lỗi gửi email' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
