require('dotenv').config();
const assert = require('assert');

const API_KEY = process.env.CRAWLER_API_KEY || 'wcg_muse_f7d252dd57426a7a';
const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const BASE_URL = process.env.BASE_URL || 'https://codegame.shop';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeGameAntiFakeDefaultsTest/1.0',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text), raw: text };
  } catch {
    return { status: res.status, raw: text };
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING REGRESSION TEST: ANTI-FAKE DEFAULTS IN GAME QUEUING');
  console.log('   Target URL:', BASE_URL);
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testNeutralSlug = `test-neutral-${timestamp}`;
  const testNeutralName = `Test Neutral Game ${timestamp}`;
  const testRobloxSlug = `test-roblox-${timestamp}`;
  const testRobloxName = `Test Roblox Game ${timestamp}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Tạo game test không phải Roblox (không truyền metadata/icon/instructions)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 1] Tạo game test trung lập không truyền metadata...');
    const queueNeutralRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        action: 'queue_game',
        name: testNeutralName,
        slug: testNeutralSlug,
        // Cố tình không truyền: developer, publisher, category, platform, description, instructions, iconUrl
        codes: [
          { code: `TESTNEUTRAL_${timestamp}`, rewards: 'Phần thưởng thử nghiệm' }
        ]
      })
    });

    assert.strictEqual(queueNeutralRes.status, 200, `Queue game failed with status ${queueNeutralRes.status}`);
    assert.strictEqual(queueNeutralRes.data?.success, true, 'queue_game API returned success: false');

    const createdGame = queueNeutralRes.data?.results?.[0]?.game || queueNeutralRes.data?.game;
    assert.ok(createdGame, 'Không nhận được đối tượng game sau khi queue');

    console.log('   Dữ liệu game trung lập vừa tạo:');
    console.log('   - developer:', JSON.stringify(createdGame.developer));
    console.log('   - publisher:', JSON.stringify(createdGame.publisher));
    console.log('   - category:', JSON.stringify(createdGame.category));
    console.log('   - platform:', JSON.stringify(createdGame.platform));
    console.log('   - description:', JSON.stringify(createdGame.description));
    console.log('   - instructions:', JSON.stringify(createdGame.instructions));
    console.log('   - iconUrl:', JSON.stringify(createdGame.iconUrl));
    console.log('   - missing_icon:', createdGame.missing_icon);

    // Assertions: Tuyệt đối không chứa "Roblox" hay giá trị bịa đặt
    assert.ok(!createdGame.developer || !/roblox/i.test(createdGame.developer), 'LỖI: developer bị gán thành Roblox!');
    assert.ok(!createdGame.publisher || !/roblox/i.test(createdGame.publisher), 'LỖI: publisher bị gán thành Roblox!');
    assert.ok(!createdGame.category || !/roblox/i.test(createdGame.category), 'LỖI: category bị gán thành Roblox!');
    assert.ok(!createdGame.platform || !/roblox/i.test(createdGame.platform), 'LỖI: platform bị gán thành Roblox!');
    assert.ok(!createdGame.description || !/roblox/i.test(createdGame.description), 'LỖI: description bị gán thành Roblox!');
    assert.ok(!createdGame.instructions || !/roblox/i.test(createdGame.instructions), 'LỖI: instructions bị gán 3 bước Roblox!');
    assert.strictEqual(createdGame.instructions, '', 'LỖI: instructions phải rỗng "" khi không có thông tin!');
    assert.strictEqual(createdGame.iconUrl, '', 'LỖI: iconUrl phải rỗng "" khi file cục bộ không tồn tại (chống 404)!');
    assert.strictEqual(createdGame.missing_icon, true, 'LỖI: missing_icon phải là true khi chưa có icon thật!');

    console.log('   ✅ TEST 1 ĐẠT: Không có bất kỳ giá trị mặc định bịa đặt nào!\n');

    // -------------------------------------------------------------------------
    // TEST 2: Tạo game test xác nhận Roblox (khai báo platform / category Roblox)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 2] Tạo game test xác nhận nền tảng Roblox...');
    const queueRobloxRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        action: 'queue_game',
        name: testRobloxName,
        slug: testRobloxSlug,
        platform: 'Roblox / PC, Mobile',
        category: 'Roblox',
        codes: [
          { code: `TESTROBLOX_${timestamp}`, rewards: 'Roblox test reward' }
        ]
      })
    });

    assert.strictEqual(queueRobloxRes.status, 200, `Queue Roblox game failed with status ${queueRobloxRes.status}`);
    const robloxGame = queueRobloxRes.data?.results?.[0]?.game || queueRobloxRes.data?.game;
    assert.ok(robloxGame, 'Không nhận được đối tượng Roblox game sau khi queue');

    console.log('   Dữ liệu game Roblox vừa tạo:');
    console.log('   - platform:', robloxGame.platform);
    console.log('   - instructions:', JSON.stringify(robloxGame.instructions));

    // Assertions: Hướng dẫn Roblox chỉ xuất hiện ở ca này
    assert.ok(/roblox/i.test(robloxGame.instructions), 'LỖI: Hướng dẫn Roblox không xuất hiện khi game đã xác nhận là Roblox!');
    assert.ok(robloxGame.instructions.includes('Bước 1: Mở Roblox'), 'LỖI: Hướng dẫn không đúng định dạng chuẩn Roblox!');

    console.log('   ✅ TEST 2 ĐẠT: Hướng dẫn Roblox chỉ được gán khi nền tảng được xác nhận!\n');

    // -------------------------------------------------------------------------
    // TEST 3: Kiểm chứng Avatar Land trên production
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 3] Kiểm chứng bản ghi Avatar Land trên production...');
    const avatarRes = await fetchJson('/api/sync?key=wcg_crawler_pending_games_v1&nocache=1', {
      headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
    });
    const avatarGame = (avatarRes.data?.data || []).find(g => g.slug === 'avatar-land' || g.id === 'avatar-land');
    assert.ok(avatarGame, 'Không tìm thấy Avatar Land trong wcg_crawler_pending_games_v1!');

    console.log('   Avatar Land metadata:');
    console.log('   - developer:', JSON.stringify(avatarGame.developer));
    console.log('   - publisher:', JSON.stringify(avatarGame.publisher));
    console.log('   - category:', JSON.stringify(avatarGame.category));
    console.log('   - platform:', JSON.stringify(avatarGame.platform));
    console.log('   - description:', JSON.stringify(avatarGame.description));
    console.log('   - instructions:', JSON.stringify(avatarGame.instructions));
    console.log('   - iconUrl:', JSON.stringify(avatarGame.iconUrl));
    console.log('   - missing_icon:', avatarGame.missing_icon);
    console.log('   - status:', avatarGame.status);

    assert.strictEqual(avatarGame.developer, null, 'LỖI: Avatar Land developer phải là null!');
    assert.strictEqual(avatarGame.publisher, null, 'LỖI: Avatar Land publisher phải là null!');
    assert.strictEqual(avatarGame.category, null, 'LỖI: Avatar Land category phải là null!');
    assert.strictEqual(avatarGame.platform, null, 'LỖI: Avatar Land platform phải là null!');
    assert.strictEqual(avatarGame.description, '', 'LỖI: Avatar Land description phải là rỗng!');
    assert.strictEqual(avatarGame.instructions, '', 'LỖI: Avatar Land instructions phải là rỗng!');
    assert.strictEqual(avatarGame.iconUrl, '', 'LỖI: Avatar Land iconUrl phải là rỗng (chống 404)!');
    assert.strictEqual(avatarGame.missing_icon, true, 'LỖI: Avatar Land missing_icon phải là true!');
    assert.strictEqual(avatarGame.status, 'PENDING', 'LỖI: Avatar Land status phải là PENDING!');

    // Kiểm tra code AL-PNVN26 còn nguyên vẹn
    const pendingCodesRes = await fetchJson('/api/sync?key=wcg_crawler_pending_codes_v1', {
      headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
    });
    const avatarCodes = (pendingCodesRes.data?.data || []).filter(c => c.gameSlug === 'avatar-land');
    assert.strictEqual(avatarCodes.length, 1, 'LỖI: Avatar Land phải có đúng 1 mã trong hàng chờ!');
    assert.strictEqual(avatarCodes[0].code, 'AL-PNVN26', 'LỖI: Mã của Avatar Land phải là AL-PNVN26!');
    assert.strictEqual(avatarCodes[0].expiresAt, '2026-10-25', 'LỖI: Hạn dùng của mã AL-PNVN26 phải là 2026-10-25!');

    console.log('   ✅ TEST 3 ĐẠT: Bản ghi Avatar Land hoàn toàn sạch sẽ, mã AL-PNVN26 giữ nguyên!\n');

    // -------------------------------------------------------------------------
    // TEST 4: Kiểm chứng 3 game Roblox thật còn nguyên vẹn
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 4] Kiểm chứng 3 game Roblox thật trong hàng chờ...');
    const allPendingGames = avatarRes.data?.data || [];
    const allPendingCodes = pendingCodesRes.data?.data || [];

    const expectedRoblox = [
      { slug: 'grow-a-chicken-fighter', name: 'Grow a Chicken Fighter', expectedCodes: 8 },
      { slug: 'command-an-army', name: 'Command an Army', expectedCodes: 7 },
      { slug: 'dig-and-clean', name: 'Dig and Clean', expectedCodes: 7 }
    ];

    for (const item of expectedRoblox) {
      const g = allPendingGames.find(x => x.slug === item.slug);
      assert.ok(g, `Không tìm thấy game ${item.slug} trong hàng chờ!`);
      assert.ok(/roblox/i.test(String(g.platform || '')), `Game ${item.slug} phải giữ nguyên platform Roblox!`);
      assert.ok(/roblox/i.test(String(g.instructions || '')), `Game ${item.slug} phải giữ nguyên instructions Roblox!`);

      const codes = allPendingCodes.filter(c => c.gameSlug === item.slug);
      assert.strictEqual(codes.length, item.expectedCodes, `Game ${item.slug} phải có đủ ${item.expectedCodes} mã (thực tế: ${codes.length})!`);
      console.log(`   - ${g.name}: ${codes.length}/${item.expectedCodes} mã -> [${codes.map(c => c.code).join(', ')}]`);
    }

    console.log('   ✅ TEST 4 ĐẠT: Cả 3 game Roblox thật giữ nguyên đầy đủ metadata và mã!\n');

  } finally {
    // -------------------------------------------------------------------------
    // TEST 5: Dọn dẹp sạch sẽ toàn bộ bản ghi test (QUY TẮC 7: ZERO TEST ARTIFACTS)
    // -------------------------------------------------------------------------
    console.log('▶ [CLEANUP] Thực hiện dọn dẹp sạch sẽ toàn bộ bản ghi test (Quy tắc 7)...');
    const cleanupRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        action: 'cleanup_test_codes',
        prefix: 'TEST'
      })
    });
    console.log('   cleanup_test_codes:', cleanupRes.data?.message || cleanupRes.raw);

    // Xóa cụ thể 2 game test nếu còn
    await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ action: 'delete_pending_game', slug: testNeutralSlug })
    });
    await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ action: 'delete_pending_game', slug: testRobloxSlug })
    });

    // Dọn dẹp trực tiếp qua sync nếu cần
    try {
      const finalPendingRes = await fetchJson('/api/sync?key=wcg_crawler_pending_games_v1', {
        headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
      });
      const list = finalPendingRes.data?.data || [];
      const cleanList = list.filter(g => g && !g.slug?.startsWith('test-') && !g.name?.startsWith('Test '));
      if (cleanList.length !== list.length) {
        await fetchJson('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Sync-Key': ADMIN_SYNC_SECRET },
          body: JSON.stringify({ crawlerPendingGames: cleanList })
        });
      }

      const finalCodesRes = await fetchJson('/api/sync?key=wcg_crawler_pending_codes_v1', {
        headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
      });
      const cList = finalCodesRes.data?.data || [];
      const cleanCodesList = cList.filter(c => c && !c.code?.startsWith('TEST') && !c.gameSlug?.startsWith('test-'));
      if (cleanCodesList.length !== cList.length) {
        await fetchJson('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Sync-Key': ADMIN_SYNC_SECRET },
          body: JSON.stringify({ crawlerPendingCodes: cleanCodesList })
        });
      }
    } catch (e) {
      console.warn('   Cảnh báo phụ dọn dẹp qua sync:', e?.message);
    }

    // Xác nhận 0 bản ghi test tồn tại trên production
    const auditRes = await fetchJson('/api/sync?key=wcg_crawler_pending_games_v1', {
      headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
    });
    const remainingTestGames = (auditRes.data?.data || []).filter(g => g && (g.slug?.startsWith('test-') || g.name?.startsWith('Test ')));
    assert.strictEqual(remainingTestGames.length, 0, `LỖI: Vẫn còn ${remainingTestGames.length} game test trên production sau dọn dẹp!`);

    console.log('   ✅ CLEANUP ĐẠT: Toàn bộ bản ghi test đã được xóa sạch sẽ 100% khỏi production!\n');
  }

  console.log('================================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ VƯỢT QUA 100%!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
