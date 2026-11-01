const fs = require('fs');
const path = require('path');
const { downloadAndSaveGameIcon, searchGooglePlayForLogo } = require('./crawler/engine/game_logo_resolver.cjs');

const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public/game_icons');

async function main() {
  console.log('=== BẮT ĐẦU TẢI & CHUẨN HÓA TOÀN BỘ LOGO GAME CHÍNH XÁC ===\n');

  const headers = { 'Authorization': 'Bearer wcg_tok_usr_admin_master' };
  
  // 1. Lấy danh sách games và pending từ Cloudflare D1
  const resG = await fetch('https://web-code-game.pages.dev/api/sync?key=wcg_admin_games_v5', { headers });
  const jsonG = await resG.json();
  const games = jsonG.data || jsonG.games || [];

  const resP = await fetch('https://web-code-game.pages.dev/api/sync?key=wcg_crawler_pending_games_v1', { headers });
  const jsonP = await resP.json();
  const pending = jsonP.data || jsonP.pendingGames || [];

  console.log(`Đã tải: ${games.length} games chính thức, ${pending.length} games trong hàng chờ.`);

  const allItems = [...games, ...pending];
  const uniqueItemsMap = new Map();
  for (const item of allItems) {
    const slug = item.slug || item.id;
    if (slug && !uniqueItemsMap.has(slug)) {
      uniqueItemsMap.set(slug, item);
    }
  }

  const items = Array.from(uniqueItemsMap.values());
  let downloadedCount = 0;
  let alreadyExistCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slug = item.slug || item.id;
    const name = item.name || slug;
    const webpPath = path.join(ICONS_DIR, `${slug}.webp`);

    if (fs.existsSync(webpPath) && fs.statSync(webpPath).size > 1000) {
      alreadyExistCount++;
      continue;
    }

    console.log(`[${i + 1}/${items.length}] Đang xử lý logo cho: "${name}" (${slug})...`);

    let iconUrl = item.icon_url || item.iconUrl || item.cover_image_url || '';

    // Nếu đã có URL Google Play trực tiếp
    if (iconUrl && iconUrl.includes('googleusercontent.com')) {
      const highRes = iconUrl.replace(/=s\d+.*$/, '') + '=s256-rw';
      const saved = await downloadAndSaveGameIcon(slug, highRes);
      if (saved) {
        console.log(`   ✓ Đã tải logo Google Play: ${saved}`);
        downloadedCount++;
        continue;
      }
    }

    // Nếu có packageId
    if (item.packageId) {
      const directUrl = `https://play-lh.googleusercontent.com/`; // thử tìm
      const gpFound = await searchGooglePlayForLogo(name, item.developer || item.publisher || '');
      if (gpFound && gpFound.iconUrl) {
        const saved = await downloadAndSaveGameIcon(slug, gpFound.iconUrl);
        if (saved) {
          console.log(`   ✓ Tìm thấy và tải logo Google Play cho ${name}: ${saved}`);
          downloadedCount++;
          continue;
        }
      }
    }

    // Thử tìm kiếm trên Google Play Store VN
    const gpResult = await searchGooglePlayForLogo(name, item.publisher || item.developer || '');
    if (gpResult && gpResult.iconUrl) {
      const saved = await downloadAndSaveGameIcon(slug, gpResult.iconUrl);
      if (saved) {
        console.log(`   ✓ Tra cứu Google Play thành công: ${saved}`);
        downloadedCount++;
        continue;
      }
    }

    // Nếu có URL bất kỳ khác
    if (iconUrl && iconUrl.startsWith('http')) {
      const saved = await downloadAndSaveGameIcon(slug, iconUrl);
      if (saved) {
        console.log(`   ✓ Tải từ icon_url nguồn: ${saved}`);
        downloadedCount++;
        continue;
      }
    }

    console.warn(`   ⚠️ Không tìm được logo cho: ${name} (${slug})`);
    failedCount++;
  }

  console.log('\n======================================================');
  console.log(`Tổng kết tải logo:`);
  console.log(`- Đã có sẵn: ${alreadyExistCount}`);
  console.log(`- Đã tải mới thành công: ${downloadedCount}`);
  console.log(`- Không tìm thấy / lỗi: ${failedCount}`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
