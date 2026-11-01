const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('=== DI CHUYỂN GAME 0 CODE VỀ HÀNG CHỜ DUYỆT & CHUẨN HÓA LOGO ===\n');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer wcg_tok_usr_admin_master'
  };

  // 1. Tải danh mục hiện tại từ D1
  const resG = await fetch('https://web-code-game.pages.dev/api/sync?key=wcg_admin_games_v5', { headers });
  const jsonG = await resG.json();
  const d1Games = jsonG.data || jsonG.games || [];

  const resP = await fetch('https://web-code-game.pages.dev/api/sync?key=wcg_crawler_pending_games_v1', { headers });
  const jsonP = await resP.json();
  const d1Pending = jsonP.data || jsonP.pendingGames || [];

  const crawledCodes = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/crawled_codes_188.json'), 'utf8'));
  const codeCountsBySlug = new Map();
  for (const c of crawledCodes) {
    const s = (c.gameSlug || c.game_slug || c.slug || c.gameId || '').toLowerCase().trim();
    if (s) codeCountsBySlug.set(s, (codeCountsBySlug.get(s) || 0) + 1);
  }

  console.log(`Hiện tại trên D1: ${d1Games.length} games chính thức, ${d1Pending.length} games trong hàng chờ.`);

  const publishedGames = [];
  const movedToPending = [];

  for (const g of d1Games) {
    const slug = (g.slug || g.id || '').toLowerCase().trim();
    const codesCount = codeCountsBySlug.get(slug) || (Array.isArray(g.codes) ? g.codes.length : (g.codes_count || 0));

    // Đảm bảo icon_url luôn trỏ về icon nội bộ
    let iconUrl = g.icon_url || `/game_icons/${slug}.webp`;
    if (iconUrl.includes('googleusercontent.com') || iconUrl.includes('codemoi.net') || iconUrl.startsWith('http')) {
      iconUrl = `/game_icons/${slug}.webp`;
    }

    const cleanGame = {
      ...g,
      icon_url: iconUrl,
      cover_image_url: iconUrl,
      codes_count: codesCount,
      free_codes_count: codesCount,
    };

    if (codesCount > 0) {
      publishedGames.push(cleanGame);
    } else {
      // Game không có code -> chuyển về Hàng Chờ Duyệt
      movedToPending.push({
        id: `pending_${slug}`,
        name: g.name,
        slug: slug,
        packageId: g.download_android ? g.download_android.replace(/^.*id=/, '') : '',
        developer: g.publisher || 'NPH Chính Thức',
        publisher: g.publisher || 'NPH Chính Thức',
        category: g.category || 'Nhập Vai',
        rating: g.rating || 4.8,
        installs: 'Mới ra mắt',
        iconUrl: iconUrl,
        localIconPath: `/game_icons/${slug}.webp`,
        playStoreUrl: g.download_android || '',
        sourceType: g.source && g.source.includes('codemoi') ? 'codemoi' : 'googleplay',
        sourceUrl: g.download_android || '',
        releaseInfo: g.source || 'Danh mục chờ giftcode',
        activeCodesCount: 0,
        description: g.description || `${g.name} đang chờ cập nhật giftcode từ nhà phát hành.`,
        releaseDate: g.release_date || new Date().toISOString().split('T')[0],
        status: 'PENDING',
        autoPublishEligible: false,
        crawledAt: g.created_at || new Date().toISOString(),
      });
    }
  }

  console.log(`\nKết quả phân loại:`);
  console.log(`- Games có code giữ lại xuất bản: ${publishedGames.length}`);
  console.log(`- Games không có code chuyển về Hàng Chờ Duyệt: ${movedToPending.length}`);

  // Hợp nhất vào pending list (tránh trùng lặp slug)
  const existingPendingSlugs = new Set(d1Pending.map(p => (p.slug || '').toLowerCase()));
  const mergedPending = [...d1Pending];
  for (const item of movedToPending) {
    if (!existingPendingSlugs.has(item.slug)) {
      mergedPending.push(item);
      existingPendingSlugs.add(item.slug);
    }
  }

  console.log(`- Tổng số games trong Hàng Chờ Duyệt sau khi gộp: ${mergedPending.length}`);

  // 2. Cập nhật các file local database
  const gamesFiles = [
    path.join(ROOT, 'src/data/games188.json'),
    path.join(ROOT, 'public/data/games188.json'),
    path.join(ROOT, 'public/data/games_database.json'),
  ];

  for (const fp of gamesFiles) {
    if (!fs.existsSync(fp)) continue;
    fs.writeFileSync(fp, JSON.stringify(publishedGames, null, 2), 'utf8');
    console.log(`✓ Đã cập nhật ${fp} (${publishedGames.length} games có code)`);
  }

  // 3. Đồng bộ lên Cloudflare D1
  const endpoints = [
    'https://web-code-game.pages.dev/api/sync',
    'https://admin-code-game-shop.pages.dev/api/sync'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\nĐang đồng bộ tới ${ep}...`);
      
      // Đẩy published games
      const resG = await fetch(ep, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_admin_games_v5',
          games: publishedGames,
          data: publishedGames
        }),
        signal: AbortSignal.timeout(15000)
      });
      const dataG = await resG.json().catch(() => ({}));
      console.log(`-> Push wcg_admin_games_v5: ${resG.status}`, dataG.message || '');

      // Đẩy pending games
      const resP = await fetch(ep, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_crawler_pending_games_v1',
          data: mergedPending
        }),
        signal: AbortSignal.timeout(15000)
      });
      const dataP = await resP.json().catch(() => ({}));
      console.log(`-> Push wcg_crawler_pending_games_v1: ${resP.status}`, dataP.message || '');
    } catch (err) {
      console.error(`! Lỗi đồng bộ tới ${ep}:`, err.message);
    }
  }

  console.log('\n✅ HOÀN TẤT DI CHUYỂN TOÀN BỘ GAME 0 CODE VỀ HÀNG CHỜ DUYỆT!');
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
