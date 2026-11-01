import { ensureNotificationTablesD1 } from './_emailHelper';

interface Env {
  DB?: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS_HEADERS });

/**
 * Xử lý hủy đăng ký nhận email (qua GET link trong email hoặc POST API)
 */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  let unsubscribed = false;
  let targetEmail = email;

  if (env.DB && (token || email)) {
    await ensureNotificationTablesD1(env.DB);
    try {
      if (token) {
        const found: any = await env.DB.prepare('SELECT email FROM email_subscribers WHERE unsubscribe_token = ? LIMIT 1').bind(token).first().catch(() => null);
        if (found) {
          targetEmail = found.email;
          await env.DB.prepare('UPDATE email_subscribers SET is_active = 0, updated_at = ? WHERE unsubscribe_token = ?')
            .bind(new Date().toISOString(), token).run();
          unsubscribed = true;
        }
      } else if (email) {
        await env.DB.prepare('UPDATE email_subscribers SET is_active = 0, updated_at = ? WHERE email = ?')
          .bind(new Date().toISOString(), email).run();
        unsubscribed = true;
      }
    } catch (err) {
      console.warn('[Unsubscribe Error]', err);
    }
  }

  // Trả về trang HTML thông báo trực quan, thân thiện
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hủy Nhận Thông Báo - CodeGame.shop</title>
  <style>
    body {
      margin: 0; padding: 0;
      background: #030712; color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      max-width: 460px; margin: 20px; padding: 36px 28px;
      background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 28px; margin-bottom: 20px;
    }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #f8fafc; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
    .email-box {
      font-family: monospace; background: rgba(0,0,0,0.4);
      padding: 6px 12px; border-radius: 6px; color: #38bdf8; display: inline-block; margin-bottom: 20px;
    }
    .btn {
      display: inline-block; padding: 12px 28px; border-radius: 12px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #fff; text-decoration: none; font-weight: bold; font-size: 14px;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>${unsubscribed ? 'Đã Hủy Nhận Thông Báo' : 'Không Tìm Thấy Thông Tin'}</h1>
    ${targetEmail ? `<div class="email-box">${targetEmail}</div>` : ''}
    <p>
      ${unsubscribed
        ? 'Bạn sẽ không còn nhận email cập nhật mã giftcode và sự kiện tự động từ CodeGame.shop. Bạn có thể đăng ký lại bất cứ khi nào bạn muốn trên website.'
        : 'Liên kết không hợp lệ hoặc bạn đã hủy đăng ký trước đó.'}
    </p>
    <a href="https://codegame.shop" class="btn">Quay Về Trang Chủ CodeGame.shop</a>
  </div>
</body>
</html>
  `;

  return new Response(html, {
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!token && !email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu token hoặc email.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (env.DB) {
      await ensureNotificationTablesD1(env.DB);
      if (token) {
        await env.DB.prepare('UPDATE email_subscribers SET is_active = 0, updated_at = ? WHERE unsubscribe_token = ?')
          .bind(new Date().toISOString(), token).run();
      } else if (email) {
        await env.DB.prepare('UPDATE email_subscribers SET is_active = 0, updated_at = ? WHERE email = ?')
          .bind(new Date().toISOString(), email).run();
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Đã hủy nhận thông báo email thành công.' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'D1 database không khả dụng.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err?.message || 'Lỗi xử lý hủy email' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
