/**
 * Telegram Task Receiver & Security Guard
 * Ensures ONLY the authorized Owner (Chat ID: 7791142901) can interact or assign tasks.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnvConfig() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const config = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        config[key] = val;
      }
    }
  }
  return config;
}

const env = getEnvConfig();
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const AUTHORIZED_OWNER_ID = String(env.TELEGRAM_CHAT_ID || '7791142901');

if (!BOT_TOKEN) {
  console.error('❌ Thiếu TELEGRAM_BOT_TOKEN trong .env');
  process.exit(1);
}

console.log(`🔐 [Security Guard] Khởi động chế độ bảo mật Owner-Only`);
console.log(`👤 Chủ sở hữu được cấp quyền duy nhất: Chat ID ${AUTHORIZED_OWNER_ID}`);

function apiRequest(method, payload = {}) {
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ ok: false, error: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function handleIncomingMessage(msg) {
  const senderId = String(msg.from?.id || msg.chat?.id || '');
  const senderName = msg.from?.first_name || msg.from?.username || 'Người dùng ẩn danh';
  const text = msg.text || '';

  // 1. STRICT SECURITY CHECK
  if (senderId !== AUTHORIZED_OWNER_ID) {
    console.warn(`🚨 [SECURITY ALERT] Phát hiện truy cập trái phép từ ID ${senderId} (${senderName})!`);
    
    // Phản hồi từ chối tới kẻ xâm nhập
    await apiRequest('sendMessage', {
      chat_id: msg.chat.id,
      text: `⛔ <b>TRUY CẬP BỊ TỪ CHỐI</b>\n\nBạn không có quyền tương tác với bot này. Hệ thống chỉ chấp nhận lệnh từ Chủ sở hữu duy nhất.`,
      parse_mode: 'HTML',
    });

    // Báo cáo cảnh báo bảo mật về tài khoản Chủ sở hữu
    await apiRequest('sendMessage', {
      chat_id: AUTHORIZED_OWNER_ID,
      text: `⚠️ <b>[CẢNH BÁO BẢO MẬT]</b> Có tài khoản lạ vừa cố gắng tương tác với Bot:\n• <b>ID:</b> <code>${senderId}</code>\n• <b>Tên:</b> ${senderName}\n• <b>Nội dung:</b> <i>${text.replace(/</g, '&lt;')}</i>\n• <b>Hành động:</b> Đã tự động chặn 100%.`,
      parse_mode: 'HTML',
    });
    return;
  }

  // 2. AUTHORIZED OWNER COMMANDS
  console.log(`✅ [Owner Authenticated] Nhận chỉ thị từ Chủ sở hữu: "${text}"`);

  if (text.startsWith('/start') || text.startsWith('/help')) {
    await apiRequest('sendMessage', {
      chat_id: AUTHORIZED_OWNER_ID,
      text: `🛡️ <b>[XÁC THỰC THÀNH CÔNG]</b>\nXin chào Chủ sở hữu!\n\nBot đã được kích hoạt chế độ bảo mật nghiêm ngặt <b>Owner-Only</b> (chỉ chấp nhận lệnh từ ID của bạn: <code>${AUTHORIZED_OWNER_ID}</code>).\n\nBạn có thể nhắn trực tiếp yêu cầu/công việc tại đây!`,
      parse_mode: 'HTML',
    });
  } else {
    await apiRequest('sendMessage', {
      chat_id: AUTHORIZED_OWNER_ID,
      text: `📥 <b>[ĐÃ TIẾP NHẬN YÊU CẦU MỚI]</b>\n\nNội dung: <i>${text.replace(/</g, '&lt;')}</i>\n\nTrợ lý AI đang xử lý công việc và sẽ gửi báo cáo chi tiết ngay khi hoàn tất!`,
      parse_mode: 'HTML',
    });
  }
}

let lastUpdateId = 0;
async function pollUpdates() {
  try {
    const res = await apiRequest('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 20,
    });

    if (res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        if (update.message) {
          await handleIncomingMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.warn('[Poll Error]:', err.message);
  }
}

// Single run or export
module.exports = { handleIncomingMessage, pollUpdates, AUTHORIZED_OWNER_ID };
