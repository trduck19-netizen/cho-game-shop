import { ensureSchemaUpgrades, getSettingD1 } from '../../services/d1_service';
import { hashOtp } from '../../services/auth_service';

interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  BREVO_API_KEY?: string;
  EMAIL_FROM?: string;
  ADMIN_SYNC_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface SendEmailOptions {
  toEmail: string;
  displayName: string;
  otpCode: string;
  env: Env;
  emailConfig?: any;
}

async function sendOtpEmail(options: SendEmailOptions): Promise<{ success: boolean; provider?: string; error?: string }> {
  const { toEmail, displayName, otpCode, env, emailConfig } = options;

  const resendKey = env.RESEND_API_KEY || emailConfig?.resendApiKey || emailConfig?.apiKey || '';
  const brevoKey = env.BREVO_API_KEY || emailConfig?.brevoApiKey || '';
  const sendgridKey = env.SENDGRID_API_KEY || emailConfig?.sendgridApiKey || '';
  const fromEmail = env.EMAIL_FROM || emailConfig?.fromEmail || 'no-reply@webcodegame.vn';
  const fromName = 'CodeGame.Shop Security';

  const subject = `[CodeGame.Shop] Mã OTP xác nhận khôi phục mật khẩu: ${otpCode}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9;">
      <div style="max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">CodeGame.Shop</h1>
          <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px;">Hệ Thống Xác Thực & Khôi Phục Tài Khoản</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #cbd5e1;">Xin chào <strong>${displayName || 'bạn'}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này trên hệ thống <strong>CodeGame.Shop</strong>.
          </p>
          <div style="background: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="display: block; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Mã xác thực OTP của bạn là:</span>
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #38bdf8; letter-spacing: 6px;">${otpCode}</span>
            <span style="display: block; font-size: 12px; color: #f59e0b; margin-top: 8px;">⏱️ Có hiệu lực trong vòng 10 phút</span>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
            Vui lòng nhập mã này vào trang web để hoàn tất quá trình thiết lập mật khẩu mới.
          </p>
          <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px;">
            <p style="margin: 0; font-size: 12px; color: #ef4444; line-height: 1.5;">
              ⚠️ <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai, kể cả nhân viên quản trị website. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
            </p>
          </div>
        </div>
        <div style="background: #090d16; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">© 2026 CodeGame.Shop. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Try Resend API
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail.includes('@') ? fromEmail : 'onboarding@resend.dev'}>`,
          to: [toEmail],
          subject,
          html: htmlContent,
        }),
      });
      if (res.ok) {
        return { success: true, provider: 'Resend' };
      }
    } catch (e: any) {
      console.warn('[Email] Resend error:', e?.message);
    }
  }

  // 2. Try Brevo API
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: toEmail, name: displayName }],
          subject,
          htmlContent,
        }),
      });
      if (res.ok) {
        return { success: true, provider: 'Brevo' };
      }
    } catch (e: any) {
      console.warn('[Email] Brevo error:', e?.message);
    }
  }

  // 3. Try SendGrid API
  if (sendgridKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail, name: displayName }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [{ type: 'text/html', value: htmlContent }],
        }),
      });
      if (res.ok || res.status === 202) {
        return { success: true, provider: 'SendGrid' };
      }
    } catch (e: any) {
      console.warn('[Email] SendGrid error:', e?.message);
    }
  }

  // 4. Try Cloudflare Native MailChannels
  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail, name: displayName }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });
    if (res.ok || res.status === 202) {
      return { success: true, provider: 'MailChannels' };
    }
  } catch (e: any) {
    console.warn('[Email] MailChannels error:', e?.message);
  }

  return { success: false, error: 'No active email provider succeeded' };
}

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
    const { action, identifier, otpCode, newPasswordHash, salt } = body;

    const cleanIdentifier = String(identifier || '').trim().toLowerCase();
    if (!cleanIdentifier) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng nhập tên đăng nhập hoặc email.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const member = await env.DB.prepare(`
      SELECT * FROM members
      WHERE LOWER(username) = ? OR LOWER(display_name) = ? OR LOWER(email) = ? OR id = ?
      LIMIT 1
    `).bind(cleanIdentifier, cleanIdentifier, cleanIdentifier, cleanIdentifier).first<any>();

    if (!member) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy tài khoản phù hợp với thông tin đã nhập.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const emailConfig = await getSettingD1(env.DB, 'wcg_admin_email_config_v4').catch(() => null);

    // Step 1: Request OTP Code
    if (action === 'request_otp') {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins
      const otpHashVal = await hashOtp(generatedOtp, member.salt || 'wcg_otp_salt');

      await env.DB.prepare(`
        UPDATE members
        SET recovery_otp = ?,
            recovery_otp_hash = ?,
            otp_expires_at = ?,
            otp_attempts = 0
        WHERE id = ?
      `).bind(generatedOtp, otpHashVal, expiresAt, member.id).run();

      // Log OTP request into security_logs
      const logId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await env.DB.prepare(`
        INSERT INTO security_logs (id, actor_name, actor_email, action, target_id, ip_address, severity, details, created_at)
        VALUES (?, ?, ?, 'REQUEST_PASSWORD_OTP', ?, ?, 'INFO', ?, datetime('now'))
      `).bind(
        logId,
        member.display_name || member.username,
        member.email,
        member.id,
        request.headers.get('cf-connecting-ip') || '127.0.0.1',
        JSON.stringify({ email: member.email })
      ).run().catch(() => {});

      // Mask email for user privacy
      const emailParts = (member.email || '').split('@');
      const namePart = emailParts[0] || '';
      const domainPart = emailParts[1] || '';
      const maskedEmail = namePart.length > 2
        ? `${namePart.slice(0, 2)}****@${domainPart}`
        : `${namePart}****@${domainPart}`;

      // Dispatch Email via integrated provider
      const emailResult = await sendOtpEmail({
        toEmail: member.email,
        displayName: member.display_name || member.username,
        otpCode: generatedOtp,
        env,
        emailConfig,
      });

      if (emailResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            emailSent: true,
            provider: emailResult.provider,
            message: `Mã xác minh OTP đã được gửi đến email ${maskedEmail}. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).`,
            maskedEmail,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            emailSent: false,
            message: 'Hệ thống gửi thư tự động đang bảo trì hoặc chưa cấu hình API gửi email. Vui lòng liên hệ Quản trị viên để được hỗ trợ.',
            maskedEmail,
          }),
          { status: 503, headers: CORS_HEADERS }
        );
      }
    }

    // Step 2: Verify OTP and Set New Password
    if (action === 'reset_password') {
      const inputOtp = String(otpCode || '').trim();
      if (!inputOtp) {
        return new Response(
          JSON.stringify({ success: false, message: 'Vui lòng nhập mã xác minh OTP.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const currentAttempts = (Number(member.otp_attempts) || 0) + 1;
      if (currentAttempts > 5) {
        await env.DB.prepare(`
          UPDATE members
          SET recovery_otp = NULL, recovery_otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0
          WHERE id = ?
        `).bind(member.id).run();

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã xác thực đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng gửi yêu cầu mã mới.',
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const isOtpExpired = !member.otp_expires_at || Date.now() > Number(member.otp_expires_at);
      const computedInputHash = await hashOtp(inputOtp, member.salt || 'wcg_otp_salt');
      const isOtpInvalid = member.recovery_otp_hash
        ? computedInputHash !== member.recovery_otp_hash
        : String(member.recovery_otp || '').trim() !== inputOtp;

      if (isOtpExpired || isOtpInvalid) {
        await env.DB.prepare('UPDATE members SET otp_attempts = ? WHERE id = ?')
          .bind(currentAttempts, member.id)
          .run();

        return new Response(
          JSON.stringify({
            success: false,
            message: isOtpExpired
              ? 'Mã xác minh OTP đã hết hạn (quá 10 phút). Vui lòng yêu cầu mã mới.'
              : `Mã xác minh OTP không chính xác (Lần thử ${currentAttempts}/5).`,
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!newPasswordHash || newPasswordHash.length < 10) {
        return new Response(
          JSON.stringify({ success: false, message: 'Mật khẩu mới không hợp lệ.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const finalPasswordHash = String(newPasswordHash).trim();
      const finalSalt = salt || '';

      await env.DB.prepare(`
        UPDATE members
        SET password_hash = ?,
            salt = ?,
            session_token = NULL,
            recovery_otp = NULL,
            recovery_otp_hash = NULL,
            otp_expires_at = NULL,
            otp_attempts = 0
        WHERE id = ?
      `).bind(finalPasswordHash, finalSalt, member.id).run();

      const logId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await env.DB.prepare(`
        INSERT INTO security_logs (id, actor_name, actor_email, action, target_id, ip_address, severity, details, created_at)
        VALUES (?, ?, ?, 'RESET_PASSWORD_SUCCESS', ?, ?, 'WARN', ?, datetime('now'))
      `).bind(
        logId,
        member.display_name || member.username,
        member.email,
        member.id,
        request.headers.get('cf-connecting-ip') || '127.0.0.1',
        JSON.stringify({ email: member.email })
      ).run().catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Hành động không hợp lệ.' }),
      { status: 400, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xử lý khôi phục mật khẩu trên Edge.', error: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
