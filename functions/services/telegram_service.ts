/**
 * Telegram Notification Service for Store Alerts & Order Events
 * Automatically alerts Owner (Telegram ID: 7791142901) when products run out of stock or orders succeed.
 */

export interface TelegramEnv {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  DB?: D1Database;
}

const DEFAULT_OWNER_CHAT_ID = '7791142901';

async function getTelegramCredentials(env: TelegramEnv): Promise<{ botToken: string; chatId: string }> {
  let botToken = (env.TELEGRAM_BOT_TOKEN || '').trim();
  let chatId = (env.TELEGRAM_CHAT_ID || '').trim() || DEFAULT_OWNER_CHAT_ID;

  if (!botToken && env.DB) {
    try {
      const stmt = env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_news_schedule_config_v1' LIMIT 1");
      const row: any = await stmt.first();
      if (row?.value) {
        const cfg = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (cfg?.telegramBotToken) botToken = String(cfg.telegramBotToken).trim();
        if (cfg?.telegramChatId) chatId = String(cfg.telegramChatId).trim() || chatId;
      }
    } catch (e: any) {
      console.warn('[TelegramService] Cannot load config from D1:', e?.message);
    }
  }

  return { botToken, chatId };
}

export async function sendTelegramMessage(env: TelegramEnv, message: string): Promise<boolean> {
  try {
    const { botToken, chatId } = await getTelegramCredentials(env);
    if (!botToken || !chatId) {
      return false;
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    return res.ok;
  } catch (err: any) {
    console.warn('[TelegramService] Failed to send telegram message:', err?.message);
    return false;
  }
}

/**
 * Send instant alert when a product stock drops to 0
 */
export async function sendOutOfStockAlert(
  env: TelegramEnv,
  payload: { productId: string; productTitle: string; remainingStock: number }
): Promise<boolean> {
  const timeStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const msg = `🚨 <b>[CẢNH BÁO HẾT HÀNG TRONG KHO]</b>
📦 <b>Sản phẩm:</b> ${payload.productTitle}
🆔 <b>Mã định danh:</b> <code>${payload.productId}</code>
⚠️ <b>Tồn kho khả dụng:</b> 0 mã (HẾT HÀNG)
⏰ <b>Thời điểm:</b> ${timeStr} (GMT+7)

👉 <i>Vui lòng truy cập trang Quản trị Admin để bổ sung tồn kho mới!</i>`;

  return sendTelegramMessage(env, msg);
}

/**
 * Send instant notification for new paid order
 */
export async function sendNewOrderAlert(
  env: TelegramEnv,
  payload: {
    orderId: string;
    productTitle: string;
    quantity: number;
    totalAmount: number;
    buyerName: string;
  }
): Promise<boolean> {
  const timeStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const formattedAmount = Number(payload.totalAmount || 0).toLocaleString('vi-VN');
  const msg = `💰 <b>[ĐƠN HÀNG MỚI THÀNH CÔNG]</b>
🧾 <b>Mã đơn:</b> <code>${payload.orderId}</code>
📦 <b>Sản phẩm:</b> ${payload.productTitle} (x${payload.quantity})
💵 <b>Tổng thanh toán:</b> ${formattedAmount}đ
👤 <b>Khách hàng:</b> ${payload.buyerName}
⏰ <b>Thời điểm:</b> ${timeStr} (GMT+7)`;

  return sendTelegramMessage(env, msg);
}
