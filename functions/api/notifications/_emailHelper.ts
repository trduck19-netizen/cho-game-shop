// Helper gửi email đa nhà cung cấp (Resend & Brevo) và tạo template Cyberpunk cho CodeGame.shop

export interface EmailProviderConfig {
  provider: 'resend' | 'brevo';
  apiKey: string;
  senderEmail: string;
  senderName: string;
  isEnabled: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailProviderConfig = {
  provider: 'resend',
  apiKey: '',
  senderEmail: 'notifications@codegame.shop',
  senderName: 'CodeGame.shop - Thông Báo Sự Kiện & Code Game',
  isEnabled: false,
};

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  previewText?: string;
}

/**
 * Gửi email qua Resend API
 */
export async function sendViaResend(config: EmailProviderConfig, payload: SendEmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    // Resend from header format: "Sender Name <email@domain>"
    const from = `${config.senderName || 'CodeGame Alert'} <${config.senderEmail || 'onboarding@resend.dev'}>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Resend error status ${res.status}`,
      };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error connecting to Resend' };
  }
}

/**
 * Gửi email qua Brevo API
 */
export async function sendViaBrevo(config: EmailProviderConfig, payload: SendEmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to]).map((email) => ({ email }));
    const sender = {
      name: config.senderName || 'CodeGame Alert',
      email: config.senderEmail || 'contact@codegame.shop',
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: recipients,
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    });

    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Brevo error status ${res.status}`,
      };
    }

    return { success: true, id: data?.messageId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error connecting to Brevo' };
  }
}

/**
 * Điều phối gửi email theo cấu hình
 */
export async function dispatchEmail(config: EmailProviderConfig, payload: SendEmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!config.isEnabled) {
    return { success: false, error: 'Tính năng gửi email hiện đang tạm tắt trong Cài đặt Admin.' };
  }
  if (!config.apiKey || !config.apiKey.trim()) {
    return { success: false, error: 'Chưa cấu hình API Key cho nhà cung cấp email.' };
  }

  if (config.provider === 'brevo') {
    return sendViaBrevo(config, payload);
  }
  return sendViaResend(config, payload);
}

/**
 * Đảm bảo các bảng D1 notification tồn tại (Runtime Auto-heal)
 */
export async function ensureNotificationTablesD1(db: any): Promise<void> {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS email_subscribers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        user_id TEXT,
        notify_followed_codes INTEGER DEFAULT 1,
        notify_giveaways INTEGER DEFAULT 1,
        notify_sales INTEGER DEFAULT 1,
        subscribed_games TEXT DEFAULT '[]',
        unsubscribe_token TEXT UNIQUE NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run().catch(() => {});

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS email_notification_logs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        recipient_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'SENT',
        sent_by TEXT DEFAULT 'SYSTEM',
        error_message TEXT,
        created_at TEXT NOT NULL
      )
    `).run().catch(() => {});
  } catch (err) {
    console.warn('[Notification DB Init]', err);
  }
}

export interface EmailTemplateParams {
  type: 'CODE_DROP' | 'GIVEAWAY' | 'FLASH_SALE' | 'BROADCAST' | 'TEST';
  badgeTitle?: string;
  title: string;
  description: string;
  gameName?: string;
  gameIconUrl?: string;
  codes?: Array<{ code: string; rewards?: string; expires?: string }>;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}

/**
 * Trình tạo mẫu HTML Email phong cách Cyberpunk Dark Mode cho CodeGame.shop
 */
export function buildCyberpunkEmailHtml(params: EmailTemplateParams): string {
  const origin = 'https://codegame.shop';
  const ctaUrl = params.ctaUrl || origin;
  const unsubUrl = params.unsubscribeUrl || `${origin}/?action=unsubscribe`;

  let badgeColor = '#06b6d4'; // teal
  let badgeText = params.badgeTitle || 'THÔNG BÁO TỪ CODEGAME.SHOP';
  if (params.type === 'CODE_DROP') {
    badgeColor = '#10b981'; // emerald
    badgeText = params.badgeTitle || '🎁 GIFTCODE MỚI ĐÃ CẬP NHẬT';
  } else if (params.type === 'GIVEAWAY') {
    badgeColor = '#f59e0b'; // amber
    badgeText = params.badgeTitle || '⚡ SỰ KIỆN PHÁT CODE MIỄN PHÍ';
  } else if (params.type === 'FLASH_SALE') {
    badgeColor = '#ef4444'; // rose/red
    badgeText = params.badgeTitle || '🔥 FLASH SALE GIỜ VÀNG GIẢM GIÁ';
  } else if (params.type === 'TEST') {
    badgeColor = '#8b5cf6'; // purple
    badgeText = params.badgeTitle || '🧪 EMAIL THỬ NGHIỆM HỆ THỐNG';
  }

  // Khối danh sách mã code nếu có
  let codesHtml = '';
  if (params.codes && params.codes.length > 0) {
    const items = params.codes.map((c) => `
      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: bold; color: #38bdf8; letter-spacing: 1px;">
            ${c.code}
          </span>
          <span style="font-size: 11px; background: rgba(56, 189, 248, 0.15); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-weight: bold;">
            CÒN HẠN
          </span>
        </div>
        ${c.rewards ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">🎁 Phần thưởng: <strong style="color: #cbd5e1;">${c.rewards}</strong></div>` : ''}
        ${c.expires ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">⏳ Hạn dùng: ${c.expires}</div>` : ''}
      </div>
    `).join('');

    codesHtml = `
      <div style="margin: 20px 0;">
        <div style="font-size: 13px; font-weight: bold; color: #e2e8f0; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
          Danh Sách Mã Code Dành Cho Bạn:
        </div>
        ${items}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Container chính -->
        <table role="presentation" width="100%" style="max-width: 600px; background: linear-gradient(180deg, #0f172a 0%, #0b0f19 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);" cellspacing="0" cellpadding="0">
          
          <!-- Header Logo -->
          <tr>
            <td style="padding: 24px 28px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(15, 23, 42, 0.6);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <a href="${origin}" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                      <span style="font-size: 20px; font-weight: 900; background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #38bdf8; letter-spacing: -0.5px;">
                        CODEGAME.SHOP
                      </span>
                    </a>
                  </td>
                  <td align="right">
                    <span style="font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 20px; background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor}44; text-transform: uppercase;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              ${params.gameName ? `
                <div style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                  🎮 ${params.gameName}
                </div>
              ` : ''}

              <h1 style="margin: 0 0 14px; font-size: 22px; font-weight: 800; color: #f8fafc; line-height: 1.35;">
                ${params.title}
              </h1>

              <div style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 20px;">
                ${params.description.replace(/\n/g, '<br/>')}
              </div>

              ${codesHtml}

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0 16px;">
                <a href="${ctaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 13px 32px; border-radius: 12px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                  ${params.ctaText || 'Mở Trang Nhận Quà Ngay'} &rarr;
                </a>
              </div>

              <div style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px;">
                Hoặc truy cập trực tiếp: <a href="${origin}" style="color: #38bdf8; text-decoration: underline;">https://codegame.shop</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background: rgba(3, 7, 18, 0.8); border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #64748b; line-height: 1.6;">
              <p style="margin: 0 0 8px;">
                Bạn nhận được email này vì đã đăng ký thông báo tại <strong>codegame.shop</strong>.
              </p>
              <p style="margin: 0;">
                Nếu không muốn tiếp tục nhận email này, bạn có thể 
                <a href="${unsubUrl}" style="color: #94a3b8; text-decoration: underline;">
                  hủy đăng ký nhận tin tại đây
                </a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
