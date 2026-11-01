/**
 * Script Đồng Bộ & Chuẩn Hóa Logo Cho Toàn Bộ Game Quét Được
 * - Tự động tra cứu Google Play Store VN
 * - Tải và tối ưu hóa icon chuẩn WebP và JPG vào public/game_icons/
 * - Đồng bộ danh sách pending games lên Cloudflare D1/KV
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch {}

const { resolveAndPersistGameLogo } = require('./crawler/engine/game_logo_resolver.cjs');

const SYNC_URL = process.env.SYNC_URL || 'https://codegame.shop/api/sync';
const SYNC_KEY = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

function requestHttp(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const reqOptions = {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'WCG-Icon-Sync/1.0',
          'Accept': 'application/json, text/plain, */*',
          ...(options.headers || {})
        },
        timeout: 25000,
      };

      const req = client.request(urlObj, reqOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsedData = body;
          if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
            try {
              parsedData = JSON.parse(body);
            } catch {}
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsedData });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout kết nối tới ${url}`));
      });

      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function syncAllPendingGameIcons() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  🖼️  ĐỒNG BỘ & CHUẨN HÓA LOGO GAME QUÉT ĐƯỢC TOÀN DIỆN          ');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Tải danh sách pending games từ server
  let pendingGames = [];
  try {
    const res = await requestHttp(`${SYNC_URL}?fresh=true`, {
      headers: { 'X-Sync-Key': SYNC_KEY },
    });
    if (res && res.status === 200 && res.data && Array.isArray(res.data.crawlerPendingGames)) {
      pendingGames = res.data.crawlerPendingGames;
      console.log(`[Sync] ✅ Đã tải ${pendingGames.length} game đang chờ duyệt từ máy chủ.`);
    }
  } catch (err) {
    console.warn(`[Sync] ⚠️ Không kết nối được ${SYNC_URL}:`, err.message);
    // Thử fallback sang web-code-game.pages.dev
    try {
      const altRes = await requestHttp('https://web-code-game.pages.dev/api/sync?fresh=true', {
        headers: { 'X-Sync-Key': SYNC_KEY },
      });
      if (altRes && altRes.status === 200 && altRes.data && Array.isArray(altRes.data.crawlerPendingGames)) {
        pendingGames = altRes.data.crawlerPendingGames;
        console.log(`[Sync] ✅ Đã tải ${pendingGames.length} game chờ duyệt từ web-code-game.pages.dev.`);
      }
    } catch (altErr) {
      console.warn(`[Sync] ⚠️ Fallback cũng lỗi:`, altErr.message);
    }
  }

  if (pendingGames.length === 0) {
    console.log('[Sync] ℹ️ Không có game nào trong hàng chờ duyệt cần xử lý.');
    return;
  }

  const updatedPendingGames = [];
  let successCount = 0;

  for (const game of pendingGames) {
    console.log(`\n▶ Xử lý logo cho: "${game.name}" (${game.slug})...`);
    try {
      const resolved = await resolveAndPersistGameLogo(game);
      updatedPendingGames.push({
        ...game,
        iconUrl: resolved.iconUrl,
        localIconPath: resolved.localIconPath,
        packageId: resolved.packageId || game.packageId,
        playStoreUrl: resolved.playStoreUrl || game.playStoreUrl,
      });
      successCount++;
    } catch (err) {
      console.warn(`⚠️ Lỗi xử lý ${game.slug}:`, err.message);
      updatedPendingGames.push(game);
    }
  }

  console.log('\n────────────────────────────────────────────────────────────────');
  console.log(`📊 TỔNG KẾT: Đã chuẩn hóa thành công ${successCount}/${pendingGames.length} logo game.`);
  console.log('────────────────────────────────────────────────────────────────');

  // 2. Gửi payload cập nhật lên máy chủ Cloudflare
  const syncPayload = {
    crawlerPendingGames: updatedPendingGames,
  };

  const targetUrls = [
    SYNC_URL,
    'https://web-code-game.pages.dev/api/sync',
  ];

  for (const url of targetUrls) {
    try {
      console.log(`[Sync] 🚀 Đang gửi dữ liệu cập nhật lên ${url}...`);
      const syncRes = await requestHttp(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': SYNC_KEY,
        },
      }, syncPayload);

      if (syncRes && syncRes.status === 200 && syncRes.data && syncRes.data.success) {
        console.log(`[Sync] ✅ Đồng bộ thành công lên ${url}!`);
      } else {
        console.warn(`[Sync] ⚠️ Phản hồi từ ${url}:`, syncRes?.data || syncRes?.status);
      }
    } catch (e) {
      console.warn(`[Sync] ⚠️ Lỗi gửi lên ${url}:`, e.message);
    }
  }

  console.log('🎉 Hoàn tất quá trình đồng bộ logo chính xác!');
}

if (require.main === module) {
  syncAllPendingGameIcons().catch(console.error);
}

module.exports = { syncAllPendingGameIcons };
