const https = require('https');
require('dotenv').config();

const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'codegame.shop',
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': ADMIN_SYNC_SECRET,
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function main() {
  console.log('1. Fetching current custom codes from D1...');
  const customRes = await apiRequest('/api/sync?key=wcg_admin_custom_free_codes_v1');
  const existingCustom = customRes.data?.data || [];
  console.log('Current custom codes count:', existingCustom.length);

  const gameSlug = 'ky-tich-tro-lai';
  const gameName = 'Kỳ Tích Trở Lại';
  const nowIso = new Date().toISOString();

  const codesToEnsure = [
    { code: 'DT30K', rewards: 'Gói quà đăng ký trước 30.000 lượt (Kim Cương + Vé Tầm Bảo)' },
    { code: 'MUNG60K', rewards: 'Gói quà mừng 60.000 người chơi (Rương Trang Bị Hoàng Kim)' },
    { code: 'VIP666', rewards: 'Quà VIP 666 Lộc Phát (Bạc + Đá Nâng Cấp)' },
    { code: 'VIP888', rewards: 'Quà VIP 888 Phát Tài (Đan Thể Lực + Thẻ Rút Tướng)' },
    { code: 'VIP999', rewards: 'Quà VIP 999 Đại Cát (Thời Trang Độc Quyền + Danh Hiệu Tân Thủ)' }
  ];

  // Remove existing codes for this game to avoid stale or malformed records
  const filteredCustom = existingCustom.filter(c => {
    const s = (c.gameSlug || c.game_slug || c.slug || c.gameId || '').toLowerCase();
    return s !== gameSlug;
  });

  for (const c of codesToEnsure) {
    filteredCustom.unshift({
      id: `code_${gameSlug}_${c.code}`,
      gameId: gameSlug,
      gameSlug: gameSlug,
      game_slug: gameSlug,
      slug: gameSlug,
      gameName: gameName,
      code: c.code,
      codeValue: c.code,
      code_value: c.code,
      gift_code: c.code,
      rewards: c.rewards,
      description: c.rewards,
      status: 'ACTIVE',
      is_active: true,
      is_verified: true,
      isVerified: true,
      expires_at: null,
      expiresAt: null,
      expiry: null,
      sourceUrl: `https://codegame.shop/game/${gameSlug}`,
      source: 'Nhà phát hành Mobile Intelligence Saigon',
      copyCount: 150 + Math.floor(Math.random() * 200),
      createdAt: nowIso,
      created_at: nowIso,
      added_at: nowIso,
    });
  }

  console.log('2. Saving updated custom codes back to D1...');
  const saveCustomRes = await apiRequest('/api/sync', 'POST', {
    key: 'wcg_admin_custom_free_codes_v1',
    data: filteredCustom
  });
  console.log('Save custom codes response:', saveCustomRes.status, saveCustomRes.data?.message || saveCustomRes.data?.success);

  console.log('3. Fetching games list to update codes_count for Kỳ Tích Trở Lại...');
  const gamesRes = await apiRequest('/api/sync?key=wcg_admin_games_v5');
  const gamesList = gamesRes.data?.data || [];
  const gIdx = gamesList.findIndex(g => (g.slug || '').toLowerCase() === gameSlug || (g.id || '').toLowerCase() === gameSlug);
  if (gIdx !== -1) {
    gamesList[gIdx] = {
      ...gamesList[gIdx],
      codes_count: 5,
      free_codes_count: 5,
      updated_at: nowIso
    };
    console.log('Found game at index', gIdx, '- updating codes_count to 5');
    const saveGamesRes = await apiRequest('/api/sync', 'POST', {
      key: 'wcg_admin_games_v5',
      data: gamesList
    });
    console.log('Save games response:', saveGamesRes.status, saveGamesRes.data?.message || saveGamesRes.data?.success);
  } else {
    console.log('Game not found in games_v5 list, creating it...');
    gamesList.unshift({
      id: gameSlug,
      slug: gameSlug,
      name: gameName,
      publisher: 'Mobile Intelligence Saigon',
      category: 'Nhập Vai',
      rating: 4.8,
      icon_url: `/game_icons/${gameSlug}.webp`,
      cover_image_url: `/game_icons/${gameSlug}.webp`,
      description: 'Kỳ Tích Trở Lại là tựa game mobile mới phát hành chính thức bởi Mobile Intelligence Saigon.',
      instructions: 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
      platform: 'Android, iOS, PC',
      release_date: '2026-10-22',
      is_new: true,
      is_hot: true,
      is_active: true,
      status: 'ACTIVE',
      codes_count: 5,
      free_codes_count: 5,
      created_at: nowIso,
      updated_at: nowIso
    });
    const saveGamesRes = await apiRequest('/api/sync', 'POST', {
      key: 'wcg_admin_games_v5',
      data: gamesList
    });
    console.log('Save games response:', saveGamesRes.status, saveGamesRes.data?.message || saveGamesRes.data?.success);
  }

  console.log('DONE!');
}

main().catch(console.error);
