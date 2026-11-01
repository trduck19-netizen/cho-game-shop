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

function postRequest(token, payload) {
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.telegram.org/bot${token}/sendMessage`,
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
            resolve({ ok: false, description: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ ok: false, description: err.message }));
    req.write(data);
    req.end();
  });
}

async function sendTelegramMessage(text) {
  const env = getEnvConfig();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('ℹ️ Telegram chưa được cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID');
    return { success: false, reason: 'MISSING_CREDENTIALS' };
  }

  const cleanText = text.replace(/<br\s*[\/]?>/gi, '\n');

  // Try 1: HTML
  let res = await postRequest(token, {
    chat_id: chatId,
    text: cleanText.slice(0, 4000),
    parse_mode: 'HTML',
  });

  // Try 2: Plain text fallback if HTML fails
  if (!res.ok) {
    res = await postRequest(token, {
      chat_id: chatId,
      text: cleanText.replace(/<[^>]+>/g, '').slice(0, 4000),
    });
  }

  if (res.ok) {
    console.log('✅ Đã gửi báo cáo qua Telegram thành công!');
    return { success: true, data: res };
  } else {
    console.warn('⚠️ Gửi Telegram thất bại:', res.description);
    return { success: false, error: res.description };
  }
}

if (require.main === module) {
  const message = process.argv.slice(2).join(' ') || '✅ Công việc trên web-code-game đã hoàn thành thành công!';
  sendTelegramMessage(message);
}

module.exports = { sendTelegramMessage };
