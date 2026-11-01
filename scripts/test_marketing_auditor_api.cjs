/**
 * Comprehensive Acceptance Test: Marketing & FOMO Independent Auditor API
 * Tests all requirements from Site Owner:
 * 1. get_marketing_config matching admin ratios (50%, 16%, 6%, 3%, 19%, 4%, 2%) and explains 7/6.
 * 2. list_marketing_events (max 100 events, explicit is_simulated flag, zero PII).
 * 3. Permission Scoping: write actions strictly forbidden (HTTP 403).
 * 4. Auth: Bearer token only, rejects ?api_key= query parameter.
 * 5. Public info: GET without key does not leak secrets.
 */

require('dotenv').config();
const assert = require('assert');

// Mock Env
const TEST_AUDIT_KEY = 'wcg_audit_muse_sec_vault_2026_test_token';
const ADMIN_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

// Dynamic mock DB for local testing
const mockSettingsDb = new Map();
const mockEnv = {
  ADMIN_SYNC_SECRET: ADMIN_SECRET,
  MUSE_MARKETING_AUDIT_KEY: TEST_AUDIT_KEY,
  DB: {
    prepare: (sql) => {
      const stmt = {
        bind: (...args) => stmt,
        first: async () => {
          if (sql.includes('system_settings')) {
            return null;
          }
          if (sql.includes('schema_migrations')) {
            return { 1: 1 };
          }
          return null;
        },
        all: async () => {
          return { results: [] };
        },
        run: async () => {
          return { meta: { changes: 0 } };
        }
      };
      return stmt;
    }
  }
};

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ RUNNING ACCEPTANCE TESTS: MARKETING & FOMO AUDITOR API');
  console.log('================================================================\n');

  let passedAll = true;

  // Dynamically import the compiled or TS service
  const {
    authenticateMarketingAuditor,
    getLiveMarketingConfig,
    getRecentMarketingEvents,
    checkAuditorRateLimit,
    maskSimulatedAccount,
  } = await import('../functions/services/marketingAuditService.ts');

  // TEST 1: get_marketing_config ratio and 7/6 verification
  console.log('▶ [TEST 1] Kiểm tra get_marketing_config đối chiếu Admin...');
  const cfg = await getLiveMarketingConfig(mockEnv);

  assert.strictEqual(cfg.isEnabled, true, 'Module phải ở trạng thái isEnabled = true');
  assert.strictEqual(cfg.activeTypesCount, 7, 'Phải có đúng 7 loại đang BẬT');
  assert.strictEqual(cfg.totalConfiguredTypes, 7, 'Tổng số loại cấu hình phải là 7');
  assert.deepStrictEqual(cfg.statusExplanation.disabledTypes, [], 'Không được có loại nào bị tắt');

  const types = cfg.notificationTypes;
  console.log('   📊 Tỷ lệ phân bổ từng loại thông báo:');
  console.log(`      - Sao chép mã (COPY_CODE): ${types.COPY_CODE.effectivePercentage}% (Trọng số: ${types.COPY_CODE.rawWeight})`);
  console.log(`      - Đơn hàng Cửa Hàng (BUY_STORE): ${types.BUY_STORE.effectivePercentage}% (Trọng số: ${types.BUY_STORE.rawWeight})`);
  console.log(`      - Đơn hàng Tiện Ích (BUY_UTILITY): ${types.BUY_UTILITY.effectivePercentage}% (Trọng số: ${types.BUY_UTILITY.rawWeight})`);
  console.log(`      - Bổ sung tồn kho (RESTOCK_PRODUCT): ${types.RESTOCK_PRODUCT.effectivePercentage}% (Trọng số: ${types.RESTOCK_PRODUCT.rawWeight})`);
  console.log(`      - Săn quà Giveaway (CLAIM_GIVEAWAY): ${types.CLAIM_GIVEAWAY.effectivePercentage}% (Trọng số: ${types.CLAIM_GIVEAWAY.rawWeight})`);
  console.log(`      - Nạp tiền vào ví (DEPOSIT_WALLET): ${types.DEPOSIT_WALLET.effectivePercentage}% (Trọng số: ${types.DEPOSIT_WALLET.rawWeight})`);
  console.log(`      - Thống kê copy (STATS_COPY): ${types.STATS_COPY.effectivePercentage}% (Trọng số: ${types.STATS_COPY.rawWeight})`);

  assert.strictEqual(types.COPY_CODE.effectivePercentage, 50, 'COPY_CODE phải đúng 50%');
  assert.strictEqual(types.BUY_STORE.effectivePercentage, 16, 'BUY_STORE phải đúng 16%');
  assert.strictEqual(types.BUY_UTILITY.effectivePercentage, 6, 'BUY_UTILITY phải đúng 6%');
  assert.strictEqual(types.RESTOCK_PRODUCT.effectivePercentage, 3, 'RESTOCK_PRODUCT phải đúng 3%');
  assert.strictEqual(types.CLAIM_GIVEAWAY.effectivePercentage, 19, 'CLAIM_GIVEAWAY phải đúng 19%');
  assert.strictEqual(types.DEPOSIT_WALLET.effectivePercentage, 4, 'DEPOSIT_WALLET phải đúng 4%');
  assert.strictEqual(types.STATS_COPY.effectivePercentage, 2, 'STATS_COPY phải đúng 2%');

  const totalSum = Object.values(types).reduce((s, t) => s + t.effectivePercentage, 0);
  assert.strictEqual(totalSum, 100, 'Tổng tỷ lệ phải đạt chuẩn 100%');

  // Verify delivery timing & flags
  assert.strictEqual(cfg.deliveryTiming.intervalMinSeconds, 25);
  assert.strictEqual(cfg.deliveryTiming.intervalMaxSeconds, 45);
  assert.strictEqual(cfg.deliveryTiming.displayDurationSeconds, 5);
  assert.strictEqual(cfg.deliveryTiming.peakHours.enabled, true);
  assert.strictEqual(cfg.deliveryTiming.peakHours.startTime, '19:00');
  assert.strictEqual(cfg.deliveryTiming.peakHours.endTime, '23:30');
  assert.strictEqual(cfg.deliveryTiming.peakHours.multiplier, 1.15);

  assert.strictEqual(cfg.privacyAndControls.isNameMasked, true);
  assert.strictEqual(cfg.privacyAndControls.snoozeDurationMinutes, 60);
  assert.strictEqual(cfg.privacyAndControls.autoHideOnMobileSearch, true);

  // Verify simulated accounts library
  assert.strictEqual(cfg.simulatedAccountsLibrary.totalCount, 90, 'Thư viện tài khoản phải có đủ 90 nick');
  cfg.simulatedAccountsLibrary.sampleMaskedAccounts.forEach((acc) => {
    assert.ok(acc.includes('***'), `Tài khoản sample phải được che dấu sao: ${acc}`);
  });
  console.log('   ✅ TEST 1 ĐẠT: Cấu hình và tỷ lệ 7 loại khớp 100% với màn hình Admin!\n');

  // TEST 2: list_marketing_events
  console.log('▶ [TEST 2] Kiểm tra list_marketing_events (tối đa 100 sự kiện, is_simulated, zero PII)...');
  const events = await getRecentMarketingEvents(mockEnv, 100);
  assert.ok(Array.isArray(events), 'Events phải là một mảng');
  assert.ok(events.length > 0 && events.length <= 100, `Số lượng sự kiện phải <= 100 (thực tế: ${events.length})`);

  events.forEach((ev, i) => {
    assert.ok(ev.id, `Sự kiện #${i} phải có id`);
    assert.ok(ev.timestamp, `Sự kiện #${i} phải có timestamp`);
    assert.ok(ev.type, `Sự kiện #${i} phải có type`);
    assert.ok(ev.content, `Sự kiện #${i} phải có content`);
    assert.strictEqual(typeof ev.is_simulated, 'boolean', `Sự kiện #${i} bắt buộc phải có cờ is_simulated là boolean`);

    // Zero PII check
    assert.strictEqual(ev.userName, undefined, `Sự kiện #${i} không được để lộ trường userName thật`);
    assert.strictEqual(ev.email, undefined, `Sự kiện #${i} không được để lộ email`);
    assert.strictEqual(ev.phone, undefined, `Sự kiện #${i} không được để lộ số điện thoại`);
    assert.strictEqual(ev.userId, undefined, `Sự kiện #${i} không được để lộ userId`);
  });
  console.log(`   ✅ TEST 2 ĐẠT: Đã trả về ${events.length} sự kiện mẫu, 100% có cờ is_simulated và không lộ PII!\n`);

  // TEST 3: Auth & Security
  console.log('▶ [TEST 3] Kiểm tra bảo mật & Phân quyền hạn chế (Scoping)...');

  // 3a. Header Bearer hợp lệ
  const reqValid = new Request('https://codegame.shop/api/crawler/marketing', {
    headers: { 'Authorization': `Bearer ${TEST_AUDIT_KEY}` }
  });
  const authValid = await authenticateMarketingAuditor(reqValid, mockEnv);
  assert.strictEqual(authValid.authorized, true);
  assert.strictEqual(authValid.role, 'marketing_auditor');
  console.log('   ✅ 3a. Bearer token hợp lệ được xác thực vai trò marketing_auditor.');

  // 3b. Từ chối xác thực qua ?api_key= trên URL
  const reqUrlKey = new Request(`https://codegame.shop/api/crawler/marketing?api_key=${TEST_AUDIT_KEY}`);
  const authUrlKey = await authenticateMarketingAuditor(reqUrlKey, mockEnv);
  assert.strictEqual(authUrlKey.authorized, false, 'Phải từ chối xác thực qua URL param ?api_key=');
  assert.strictEqual(authUrlKey.status, 401);
  console.log('   ✅ 3b. Từ chối xác thực qua URL param ?api_key= đúng theo yêu cầu bảo mật log.');

  // 3c. Rate limiter (tối đa 60 req/phút)
  const testIp = 'test_auditor_ip';
  for (let i = 0; i < 60; i++) {
    const r = checkAuditorRateLimit(testIp);
    assert.strictEqual(r.allowed, true);
  }
  const overLimit = checkAuditorRateLimit(testIp);
  assert.strictEqual(overLimit.allowed, false, 'Yêu cầu thứ 61 phải bị từ chối do vượt quá 60 req/phút');
  console.log('   ✅ 3c. Rate limiter hoạt động chuẩn xác (chặn khi vượt quá 60 req/phút).');

  // TEST 4: Test endpoint onRequestPost rejection on write actions
  console.log('\n▶ [TEST 4] Kiểm tra từ chối hành động ghi (HTTP 403 Forbidden)...');
  const { onRequestPost: marketingPost } = await import('../functions/api/crawler/marketing.ts');

  // Thử gửi hành động ghi: ingest_codes
  const writeReq1 = new Request('https://codegame.shop/api/crawler/marketing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_AUDIT_KEY}`,
    },
    body: JSON.stringify({
      action: 'ingest_codes',
      gameName: 'Free Fire',
      codes: ['TESTCODE123']
    })
  });
  const res1 = await marketingPost({ request: writeReq1, env: mockEnv });
  assert.strictEqual(res1.status, 403, 'Hành động ghi ingest_codes phải trả về 403 Forbidden');
  const res1Json = await res1.json();
  assert.strictEqual(res1Json.success, false);
  console.log('   ✅ 4a. Từ chối ingest_codes với HTTP 403 Forbidden.');

  // Thử gửi hành động ghi: update_marketing_config
  const writeReq2 = new Request('https://codegame.shop/api/crawler/marketing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_AUDIT_KEY}`,
    },
    body: JSON.stringify({
      action: 'update_marketing_config',
      typeWeights: { copyCode: 10 }
    })
  });
  const res2 = await marketingPost({ request: writeReq2, env: mockEnv });
  assert.strictEqual(res2.status, 403, 'Hành động đổi cấu hình phải trả về 403 Forbidden');
  console.log('   ✅ 4b. Từ chối đổi cấu hình với HTTP 403 Forbidden.');

  // Thử gửi hành động đọc hợp lệ: get_marketing_config
  const readReq = new Request('https://codegame.shop/api/crawler/marketing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_AUDIT_KEY}`,
    },
    body: JSON.stringify({ action: 'get_marketing_config' })
  });
  const resRead = await marketingPost({ request: readReq, env: mockEnv });
  assert.strictEqual(resRead.status, 200, 'Hành động đọc get_marketing_config phải trả về 200 OK');
  const readJson = await resRead.json();
  assert.strictEqual(readJson.success, true);
  assert.strictEqual(readJson.config.activeTypesCount, 7);
  console.log('   ✅ 4c. Hành động đọc get_marketing_config thành công 100% với HTTP 200 OK.');

  // TEST 5: Public API Info không lộ key
  console.log('\n▶ [TEST 5] Kiểm tra API Info GET công khai (Zero Key Leakage)...');
  const { onRequestGet: marketingGet } = await import('../functions/api/crawler/marketing.ts');
  const publicReq = new Request('https://codegame.shop/api/crawler/marketing', {
    method: 'GET'
  });
  const pubRes = await marketingGet({ request: publicReq, env: mockEnv });
  const pubText = await pubRes.text();
  assert.ok(!pubText.includes(TEST_AUDIT_KEY), 'Không được chứa TEST_AUDIT_KEY');
  assert.ok(!pubText.includes(ADMIN_SECRET), 'Không được chứa ADMIN_SECRET');
  assert.ok(!pubText.includes('wcg_muse_f7d252dd57426a7a'), 'Không được chứa crawler key');
  assert.ok(pubText.includes('<MUSE_MARKETING_AUDIT_KEY>'), 'Chỉ được hiển thị placeholder');
  console.log('   ✅ TEST 5 ĐẠT: Tài liệu công khai GET 100% an toàn, không chứa bất kỳ khóa thực tế nào!');

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ 5 BÀI TEST CHẤP NHẬN ĐẠT 100%!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
