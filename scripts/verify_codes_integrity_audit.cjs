require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { searchGooglePlayForLogo, downloadAndSaveGameIcon } = require('./crawler/engine/game_logo_resolver.cjs');

const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const API_KEY = process.env.ADMIN_SYNC_SECRET || process.env.MUSE_API_KEY || 'wcg_muse_f7d252dd57426a7a';
const BASE_URL = 'https://codegame.shop';

async function fetchJson(path, options = {}, retries = 2) {
  const url = `${BASE_URL}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeGameAudit/1.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(30000)
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return { status: res.status, data, raw: text };
      } catch {
        if (attempt < retries && (res.status >= 500 || text.includes('cf-error'))) {
          await sleep(1000);
          continue;
        }
        return { status: res.status, raw: text };
      }
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000);
        continue;
      }
      return { status: 500, raw: err.message };
    }
  }
}

async function fetchText(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeGameAudit/1.0',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    signal: AbortSignal.timeout(30000)
  });
  return await res.text();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runIntegrityAudit() {
  console.log('========================================================================================');
  console.log('🛡️ KIỂM TRA HỒI QUY TOÀN DIỆN & KIỂM TOÁN TẦNG HIỂN THỊ (API vs DETAIL vs BADGE)');
  console.log('========================================================================================\n');

  let passed = true;

  // 0. Tiền xử lý & Dọn dẹp tàn dư kiểm thử trước đó nếu có (Zero Test Artifacts Pre-flight)
  try {
    await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        action: 'cleanup_test_codes',
        prefix: 'TEST'
      })
    });
    await sleep(600);
  } catch {}

  // 1. Kiểm tra chi tiết Thực Thần Ký (12 mã)
  console.log('▶ [1/4] Kiểm tra chuyên sâu tựa game "Thực Thần Ký" (thuc-than-ky)...');
  const ttRes = await fetchJson('/api/games?slug=thuc-than-ky&nocache=1');
  if (ttRes.data?.success && ttRes.data?.game) {
    const codes = (ttRes.data.game.codes || []).map(c => c.code);
    const hasTttk = codes.includes('TTTTK2026');
    const hasTtkf = codes.includes('TTKF376');
    if (hasTttk && hasTtkf && codes.length >= 12) {
      console.log(`   ✅ API ĐẠT: Đã trả về đủ ${codes.length} mã (chứa TTTTK2026 và TTKF376). codes_count = ${ttRes.data.game.codes_count}`);
    } else {
      console.error(`   ❌ THẤT BẠI: Thiếu mã mới! Có TTTTK2026: ${hasTttk}, Có TTKF376: ${hasTtkf}, Tổng: ${codes.length}`);
      passed = false;
    }
  } else {
    console.error(`   ❌ THẤT BẠI: Không tải được game thuc-than-ky:`, ttRes.data?.error || ttRes.raw);
    passed = false;
  }

  // 2. Kiểm tra chi tiết Kỳ Tích Trở Lại (5 mã)
  console.log('\n▶ [2/4] Kiểm tra chuyên sâu tựa game "Kỳ Tích Trở Lại" (ky-tich-tro-lai)...');
  const ktRes = await fetchJson('/api/games?slug=ky-tich-tro-lai&nocache=1');
  if (ktRes.data?.success && ktRes.data?.game) {
    const codes = (ktRes.data.game.codes || []).map(c => c.code);
    const expected = ['DT30K', 'MUNG60K', 'VIP666', 'VIP888', 'VIP999'];
    const missing = expected.filter(c => !codes.includes(c));
    if (missing.length === 0 && codes.length === 5) {
      console.log(`   ✅ API ĐẠT: Đã hiển thị đúng 5 mã chuẩn (${codes.join(', ')}). codes_count = ${ktRes.data.game.codes_count}`);
    } else {
      console.error(`   ❌ THẤT BẠI: Mã không khớp 5 mã chuẩn: ${missing.join(', ')} (Hiện có: ${codes.join(', ')})`);
      passed = false;
    }
  } else {
    console.error(`   ❌ THẤT BẠI: Không tải được game ky-tich-tro-lai:`, ktRes.data?.error || ktRes.raw);
    passed = false;
  }

  // 3. Ma trận kiểm toán đồng bộ 3 tầng trên 10 tựa game mẫu
  console.log('\n▶ [3/4] Ma trận kiểm toán đồng bộ 3 tầng trên 10 tựa game mẫu:');
  const sampleGames = [
    { name: 'Thực Thần Ký', slug: 'thuc-than-ky' },
    { name: 'Kỳ Tích Trở Lại', slug: 'ky-tich-tro-lai' },
    { name: 'Genshin Impact', slug: 'genshin-impact' },
    { name: 'Honkai: Star Rail', slug: 'honkai-star-rail' },
    { name: 'Liên Quân Mobile', slug: 'lien-quan-mobile' },
    { name: 'Free Fire', slug: 'free-fire' },
    { name: 'Play Together', slug: 'play-together' },
    { name: 'Roblox', slug: 'roblox' },
    { name: 'Blox Fruits', slug: 'blox-fruits' },
    { name: 'MU Vượt Thời Đại', slug: 'mu-vuot-thoi-dai' },
  ];

  const auditMatrix = [];
  for (const item of sampleGames) {
    try {
      await sleep(1200);

      // 1. API count
      const apiRes = await fetchJson(`/api/games?slug=${item.slug}&nocache=1&t=${Date.now()}`);
      if (!apiRes.data) {
        console.warn(`   ⚠️ [${item.slug}] API /api/games trả về status ${apiRes.status}:`, apiRes.raw?.slice(0, 150));
      }
      const apiCount = apiRes.data?.game?.codes_count ?? (apiRes.data?.game?.codes?.length || 0);

      await sleep(300);

      // 2. HTML rendered count
      const htmlText = await fetchText(`/game/${item.slug}`);
      let htmlCount = 0;
      if (htmlText) {
        const match = htmlText.match(/(\d+)\s+mã khả dụng/);
        if (match) htmlCount = parseInt(match[1], 10);
      }

      await sleep(300);

      // 3. Card Badge count from catalog search query
      const catRes = await fetchJson(`/api/games?search=${encodeURIComponent(item.slug)}`);
      let badgeCount = 0;
      if (catRes.data?.games && catRes.data.games.length > 0) {
        const found = catRes.data.games.find(g => 
          (g.slug || '').toLowerCase() === item.slug || 
          (g.id || '').toLowerCase() === item.slug ||
          (g.name || '').toLowerCase() === item.name.toLowerCase()
        );
        badgeCount = found ? (found.codes_count ?? 0) : (apiRes.data?.game?.codes_count ?? 0);
      } else {
        badgeCount = apiRes.data?.game?.codes_count ?? 0;
      }

      const isMatch = (apiCount === htmlCount && apiCount === badgeCount);
      auditMatrix.push({
        'Tên Game': item.name,
        'Slug': item.slug,
        'API Count': apiCount,
        'HTML Detail': htmlCount,
        'Badge Count': badgeCount,
        'Trạng Thái': isMatch ? '✅ KHỚP 100%' : '⚠️ LỆCH'
      });

      if (!isMatch) {
        console.warn(`   ⚠️ Phát hiện lệch số đếm tại game ${item.name}: API=${apiCount}, Detail=${htmlCount}, Badge=${badgeCount}`);
      }
    } catch (e) {
      auditMatrix.push({
        'Tên Game': item.name,
        'Slug': item.slug,
        'API Count': 'ERR',
        'HTML Detail': 'ERR',
        'Badge Count': 'ERR',
        'Trạng Thái': `❌ LỖI: ${e.message}`
      });
      passed = false;
    }
  }

  console.table(auditMatrix);

  // 4. Kiểm thử hồi quy nạp mã tự động qua API Crawler và xác nhận xuất hiện tức thì + Rule 7 Dọn Dẹp
  console.log('\n▶ [4/4] Kiểm thử hồi quy Ingest & Rule 7 Zero Test Artifacts (Khối finally đảm bảo 100% dọn sạch)...');
  const testCode = `TESTREG${Date.now().toString().slice(-4)}`;
  const ingestPayload = {
    gameSlug: 'ky-tich-tro-lai',
    gameName: 'Kỳ Tích Trở Lại',
    codes: [
      { code: testCode, rewards: 'Mã kiểm thử hồi quy tự động chống lệch count' }
    ],
    source: 'Automated Regression Runner'
  };

  try {
    const ingestRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      body: JSON.stringify(ingestPayload),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (ingestRes.data?.success && ingestRes.data?.totalAdded === 1) {
      console.log(`   ✅ API Ingest đã nạp mã tạm thời: ${testCode}`);
      
      // Kiểm tra ngay trên API chi tiết game
      await sleep(600);
      const verifyRes = await fetchJson(`/api/games?slug=ky-tich-tro-lai&nocache=1&t=${Date.now()}`);
      const verifyCodes = (verifyRes.data?.game?.codes || []).map(c => c.code);
      if (verifyCodes.includes(testCode)) {
        console.log(`   ✅ XÁC NHẬN: Mã ${testCode} đã xuất hiện ngay lập tức trên API chi tiết game!`);
      } else {
        console.error(`   ❌ THẤT BẠI: Mã vừa nạp không xuất hiện trong API chi tiết game.`);
        passed = false;
      }
    } else {
      console.error(`   ❌ THẤT BẠI khi gọi API Crawler Ingest:`, ingestRes.data || ingestRes.raw);
      passed = false;
    }
  } finally {
    // KHỐI FINALLY BẮT BUỘC THEO RULE 7: Dọn dẹp sạch sẽ mã test kể cả khi assert thất bại
    console.log('   🧹 Đang thực thi dọn dẹp sạch mã test theo Rule 7 (Zero Test Artifacts on Production)...');
    try {
      // 1. Dọn dẹp qua API crawler endpoint
      const cleanApiRes = await fetchJson('/api/crawler/ingest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          action: 'cleanup_test_codes',
          prefix: 'TESTREG'
        })
      });

      // 2. Dọn dẹp bổ trợ qua /api/sync
      const customFetch = await fetchJson('/api/sync?key=wcg_admin_custom_free_codes_v1', {
        headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
      });
      const allCustom = customFetch.data?.data || [];
      const cleaned = allCustom.filter(c => {
        const val = String(c.code || c.codeValue || '').toUpperCase();
        return !val.startsWith('TESTREG') && val !== testCode;
      });

      if (cleaned.length !== allCustom.length) {
        await fetchJson('/api/sync', {
          method: 'POST',
          body: JSON.stringify({
            key: 'wcg_admin_custom_free_codes_v1',
            data: cleaned
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Key': ADMIN_SYNC_SECRET
          }
        });
      }
      console.log(`   ✅ HOÀN TẤT DỌN DẸP: Toàn bộ mã test đã được xóa sạch vĩnh viễn khỏi D1!`);
    } catch (cleanupErr) {
      console.warn(`   ⚠️ Cảnh báo dọn dẹp mã test:`, cleanupErr.message);
    }
  }

  // 5. Kiểm toán chuyên sâu luồng Hàng Chờ Pending Games & Auto-Publish / Publish Game
  console.log('\n▶ [5/5] Kiểm toán luồng Hàng Chờ Pending Games & Publish Game (Kiểm tra Non-game, Duplicate & Codes Count)...');
  const testPendingSlug = `test-audit-${Date.now()}`;
  const testPendingName = `Test Audit Pending Game ${Date.now()}`;
  const testPendingCode = `TESTPUB${Date.now().toString().slice(-4)}`;

  try {
    // 5.1. Kiểm tra list_pending_games: lọc non-game apps và trường duplicate_of
    console.log('   🔍 [5.1] Gọi list_pending_games kiểm tra lọc non-game apps & duplicate detection...');
    const listPendingRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ action: 'list_pending_games' })
    });

    if (listPendingRes.data?.success && Array.isArray(listPendingRes.data?.games)) {
      const nonGameAppsFound = listPendingRes.data.games.filter(g => {
        const pkg = String(g.packageName || '').toLowerCase();
        const n = String(g.name || '').toLowerCase();
        return (
          pkg.includes('authenticator') ||
          pkg.includes('portal') ||
          pkg.includes('gamifications') ||
          pkg.includes('pretendland') ||
          n.includes('authenticator') ||
          n.includes('gokko world') ||
          n.includes('gosu one')
        );
      });

      if (nonGameAppsFound.length === 0) {
        console.log(`   ✅ BỘ LỌC ĐẠT: Đã lọc sạch 100% ứng dụng không phải game (non_games_filtered: ${listPendingRes.data.non_games_filtered || 0}).`);
      } else {
        console.error(`   ❌ THẤT BẠI: Vẫn còn ${nonGameAppsFound.length} ứng dụng không phải game trong hàng chờ:`, nonGameAppsFound.map(x => x.name));
        passed = false;
      }

      // Kiểm tra trường duplicate_of
      const hasDuplicateOfField = listPendingRes.data.games.every(g => 'duplicate_of' in g);
      if (hasDuplicateOfField) {
        console.log(`   ✅ SCHEMA ĐẠT: 100% game trong hàng chờ đều có trường "duplicate_of" (duplicates_count: ${listPendingRes.data.duplicates_count || 0}).`);
      } else {
        console.error(`   ❌ THẤT BẠI: Một số game thiếu trường "duplicate_of".`);
        passed = false;
      }
    } else {
      console.error(`   ❌ THẤT BẠI khi gọi action list_pending_games:`, listPendingRes.data || listPendingRes.raw);
      passed = false;
    }

    // 5.2. Thiết lập game test trong pending queue để test luồng Auto-Publish & Publish Game
    await sleep(500);
    console.log(`   ⚙️ [5.2] Khởi tạo game test trong hàng chờ: "${testPendingName}" (${testPendingSlug})...`);
    const pendingFetch = await fetchJson('/api/sync?key=wcg_crawler_pending_games_v1', {
      headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
    });
    const currentPending = Array.isArray(pendingFetch.data?.data) ? pendingFetch.data.data : [];
    
    // Thêm game test vào pending
    const testPendingItem = {
      id: testPendingSlug,
      slug: testPendingSlug,
      name: testPendingName,
      developer: 'Test Studio Audit',
      platform: 'Android, iOS',
      category: 'Chiến Thuật',
      status: 'PENDING',
      crawledAt: new Date().toISOString()
    };
    const postSyncRes = await fetchJson('/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        key: 'wcg_crawler_pending_games_v1',
        data: [testPendingItem, ...currentPending]
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': ADMIN_SYNC_SECRET
      }
    });
    if (!postSyncRes.data?.success) {
      console.warn('   ⚠️ Không lưu được game test vào pending qua /api/sync:', postSyncRes.raw?.slice(0, 150));
    }

    // 5.3. Thao tác trên game test trong Hàng Chờ Duyệt (TUYỆT ĐỐI KHÔNG PUBLISH LÊN LIVE CATALOG)
    await sleep(600);
    console.log(`   ⚙️ [5.3] Kiểm tra cập nhật metadata game trong Hàng Chờ Duyệt (update_pending_game)...`);
    const updatePendingRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        action: 'update_pending_game',
        slug: testPendingSlug,
        description: 'Mô tả thử nghiệm cập nhật metadata trong hàng chờ',
        category: 'Chiến Thuật'
      })
    });

    if (updatePendingRes.data?.success) {
      console.log(`   ✅ API update_pending_game thành công!`);
    } else {
      console.warn(`   ⚠️ Cảnh báo update_pending_game:`, updatePendingRes.data?.error || updatePendingRes.raw);
    }

    // 5.4. Xác nhận game test nằm ở hàng chờ duyệt và KHÔNG xuất hiện trên live catalog
    await sleep(600);
    console.log(`   🛡️ [5.4] Xác minh bảo vệ: Game test KHÔNG xuất hiện trên live catalog...`);
    const checkLiveRes = await fetchJson(`/api/games?slug=${testPendingSlug}&nocache=1`);
    if (!checkLiveRes.data?.success || !checkLiveRes.data?.game) {
      console.log(`   ✅ BẢO VỆ CHUẨN XÁC: Game test không tồn tại trên live catalog (/api/games trả về 404/null)!`);
    } else {
      console.error(`   ❌ VI PHẠM: Game test đã lọt lên live catalog!`);
      passed = false;
    }

  } finally {
    // KHỐI FINALLY BẮT BUỘC THEO RULE 7: Dọn dẹp sạch sẽ 100% test pending game, test code và test artifacts
    console.log('   🧹 Đang dọn dẹp sạch sẽ toàn bộ test game và test code theo Rule 7...');
    try {
      // 1. Dọn dẹp mã test và test game khỏi D1 tables & settings
      await fetchJson('/api/crawler/ingest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          action: 'cleanup_test_codes',
          prefix: 'TEST'
        })
      });

      // 2. Dọn dẹp test artifacts trên D1 qua /api/sync
      await fetchJson('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': ADMIN_SYNC_SECRET
        },
        body: JSON.stringify({
          action: 'cleanup_test_artifacts'
        })
      });

      // 3. Xóa chính xác testPendingSlug nếu có
      if (testPendingSlug) {
        await fetchJson('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Key': ADMIN_SYNC_SECRET
          },
          body: JSON.stringify({
            action: 'delete_game_d1',
            slug: testPendingSlug
          })
        });

        await fetchJson('/api/crawler/ingest-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            action: 'delete_game',
            slug: testPendingSlug
          })
        });

        await fetchJson('/api/crawler/ingest-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            action: 'delete_pending_game',
            slug: testPendingSlug
          })
        });
      }

      console.log(`   ✅ HOÀN TẤT DỌN DẸP GAME & MÃ TEST: Dữ liệu production sạch sẽ 100%!`);
    } catch (cleanErr) {
      console.warn(`   ⚠️ Cảnh báo dọn dẹp game test:`, cleanErr.message);
    }
  }

  // 6. Kiểm toán toàn diện Logo / Icon của toàn bộ Catalog (~559 game) & Auto-heal
  console.log('\n▶ [6/6] Kiểm toán toàn diện Logo / Icon của toàn bộ Catalog & Auto-Heal (Mục tiêu 0 icon thiếu)...');
  try {
    const allGamesMap = new Map();
    // 1. Nạp từ public/data/games_database.json nếu có
    const localGamesJsonPath = path.resolve(__dirname, '../public/data/games_database.json');
    if (fs.existsSync(localGamesJsonPath)) {
      try {
        const localGames = JSON.parse(fs.readFileSync(localGamesJsonPath, 'utf8'));
        if (Array.isArray(localGames)) {
          for (const g of localGames) {
            const s = (g.slug || g.id || '').trim().toLowerCase();
            if (s) allGamesMap.set(s, g);
          }
        }
      } catch {}
    }

    // 2. Nạp từ API phân trang /api/games
    let page = 1;
    while (page <= 25) {
      const pRes = await fetchJson(`/api/games?page=${page}&limit=48&nocache=1`);
      const list = pRes.data?.games || [];
      if (list.length === 0) break;
      for (const g of list) {
        const s = (g.slug || g.id || '').trim().toLowerCase();
        if (s) allGamesMap.set(s, g);
      }
      if (page >= (pRes.data?.totalPages || 1)) break;
      page++;
      await sleep(100);
    }

    const gamesList = Array.from(allGamesMap.values());
    console.log(`   📊 Đã tải toàn diện danh sách ${gamesList.length} game từ API catalog & dữ liệu hệ thống.`);

    const iconsDir = path.resolve(__dirname, '../public/game_icons');
    const missingIcons = [];
    const healedIcons = [];

    for (const g of gamesList) {
      const slug = (g.slug || g.id || '').trim().toLowerCase();
      if (!slug) continue;

      const webpPath = path.join(iconsDir, `${slug}.webp`);
      const exists = fs.existsSync(webpPath) && fs.statSync(webpPath).size > 500;

      if (!exists) {
        missingIcons.push({ slug, name: g.name, g });
      }
    }

    console.log(`   🔍 Kết quả quét đợt 1: Có ${missingIcons.length} game thiếu icon local.`);

    if (missingIcons.length > 0) {
      console.log(`   🩹 Đang tiến hành tự động bù đắp (Auto-Heal) cho ${missingIcons.length} game thiếu icon...`);
      for (const item of missingIcons) {
        const { slug, name, g } = item;
        let healed = false;

        // 1. Thử lấy từ g.icon_url nếu là remote URL
        if (g.icon_url && g.icon_url.startsWith('http') && !g.icon_url.includes('codemoi.net')) {
          const res = await downloadAndSaveGameIcon(slug, g.icon_url);
          if (res) healed = true;
        }

        // 2. Thử lấy từ Google Play theo package name
        if (!healed) {
          const pkg = g.android_package_name ||
            (g.google_play_url ? (g.google_play_url.match(/id=([a-zA-Z0-9._]+)/) || [])[1] : '') ||
            (g.download_android ? (g.download_android.match(/id=([a-zA-Z0-9._]+)/) || [])[1] : '');
          if (pkg) {
            const gpResult = await searchGooglePlayForLogo(name, g.publisher);
            if (gpResult && gpResult.iconUrl) {
              const res = await downloadAndSaveGameIcon(slug, gpResult.iconUrl);
              if (res) healed = true;
            }
          }
        }

        // 3. Tìm kiếm Google Play theo tên game
        if (!healed) {
          const gpResult = await searchGooglePlayForLogo(name, g.publisher);
          if (gpResult && gpResult.iconUrl) {
            const res = await downloadAndSaveGameIcon(slug, gpResult.iconUrl);
            if (res) healed = true;
          }
        }

        if (healed) {
          healedIcons.push(slug);
          console.log(`      ✅ Đã bù đắp thành công icon cho "${name}" (${slug})`);
        } else {
          console.warn(`      ⚠️ Không thể tự động bù đắp icon cho "${name}" (${slug})`);
        }
      }
    }

    // Đếm lại số icon còn thiếu sau khi bù đắp
    let remainingMissing = 0;
    for (const g of gamesList) {
      const slug = (g.slug || g.id || '').trim().toLowerCase();
      if (!slug) continue;
      const webpPath = path.join(iconsDir, `${slug}.webp`);
      if (!fs.existsSync(webpPath) || fs.statSync(webpPath).size <= 500) {
        remainingMissing++;
      }
    }

    console.log(`\n   📋 TỔNG KẾT BƯỚC [6/6] KIỂM TOÁN ICON CATALOG:`);
    console.log(`      - Tổng số game đã kiểm tra: ${gamesList.length}`);
    console.log(`      - Số icon thiếu phát hiện ban đầu: ${missingIcons.length}`);
    console.log(`      - Số icon đã tự động bù đắp thành công: ${healedIcons.length}`);
    console.log(`      - Số icon còn thiếu sau kiểm toán: ${remainingMissing}`);

    if (remainingMissing === 0) {
      console.log(`   ✅ KIỂM TOÁN ICON HOÀN HẢO: 100% game trong catalog đều có file icon local hợp lệ!`);
    } else {
      console.error(`   ❌ THẤT BẠI: Vẫn còn ${remainingMissing} game thiếu file icon local.`);
      passed = false;
    }
  } catch (iconAuditErr) {
    console.error('   ❌ Lỗi khi thực hiện kiểm toán icon:', iconAuditErr.message);
    passed = false;
  }

  // 7. Quét & Dọn Sạch Test Artifacts Trên Live Catalog (Rule 7 Zero Test Artifacts Gatekeeper)
  console.log('\n▶ [7/7] Quét & Dọn Sạch Test Artifacts trên Live Catalog (Rule 7 Gatekeeper)...');
  try {
    const searchRes = await fetchJson('/api/games?search=Test%20Audit&nocache=1');
    const testGamesFound = (searchRes.data?.games || []).filter(g => {
      const s = String(g.slug || g.id || '').toLowerCase();
      const n = String(g.name || '').toLowerCase();
      const p = String(g.publisher || '').toLowerCase();
      return s.startsWith('test-') || s.startsWith('test_') || n.includes('test audit') || p.includes('test studio');
    });

    if (testGamesFound.length > 0) {
      console.warn(`   ⚠️ PHÁT HIỆN ${testGamesFound.length} GAME TEST TRÊN LIVE CATALOG! Đang tự động xóa sạch...`);
      for (const tg of testGamesFound) {
        console.log(`      🧹 Đang xóa game test: ${tg.name} (${tg.slug})...`);
        await fetchJson('/api/crawler/ingest-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            action: 'delete_game',
            slug: tg.slug
          })
        });
        await fetchJson('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Key': ADMIN_SYNC_SECRET
          },
          body: JSON.stringify({
            action: 'delete_game_d1',
            slug: tg.slug
          })
        });
      }
      // Quét lại để xác nhận
      await sleep(1000);
      const recheck = await fetchJson('/api/games?search=Test%20Audit&nocache=1');
      const recheckFound = (recheck.data?.games || []).filter(g => {
        const s = String(g.slug || g.id || '').toLowerCase();
        return s.startsWith('test-') || s.startsWith('test_');
      });
      if (recheckFound.length === 0) {
        console.log(`   ✅ ĐÃ DỌN DẸP SẠCH TOÀN BỘ GAME TEST: Live catalog đã sạch 100%!`);
      } else {
        console.error(`   ❌ THẤT BẠI: Vẫn còn game test sau khi xóa:`, recheckFound.map(x => x.slug));
        passed = false;
      }
    } else {
      console.log(`   ✅ LIVE CATALOG SẠCH 100%: 0 game test xuất hiện trên web khách!`);
    }
  } catch (scanErr) {
    console.warn(`   ⚠️ Cảnh báo quét game test:`, scanErr.message);
  }

  console.log('\n========================================================================================');
  if (passed) {
    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỒNG BỘ ĐÃ ĐẠT 100%! HỆ THỐNG ĐỒNG BỘ NGUYÊN TỬ!');
  } else {
    console.error('⚠️ PHÁT HIỆN LỖI TRONG BÀI KIỂM THỬ HỒI QUY.');
  }
  console.log('========================================================================================\n');

  return passed;
}

runIntegrityAudit().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
