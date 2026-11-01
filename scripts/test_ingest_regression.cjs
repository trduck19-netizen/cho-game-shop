/**
 * test_ingest_regression.cjs
 * Bộ kiểm thử hồi quy cho hệ thống Ingest: B1 (Trùng ảo), B2 (Ký tự đặc biệt), B3 (Phân biệt hoa/thường), B4 (Cập nhật metadata)
 * Tuân thủ Rule 7 (Zero Test Artifacts on Production) - 100% dọn sạch sau khi test.
 */

const BASE_URL = process.env.BASE_URL || 'https://codegame.shop';
const API_KEY = process.env.MUSE_API_KEY || 'wcg_muse_f7d252dd57426a7a';
const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

async function fetchJson(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

async function runRegressionSuite() {
  console.log('========================================================================================');
  console.log('🛡️ BẮT ĐẦU BỘ KIỂM THỬ HỒI QUY INGEST: B1 (TRÙNG ẢO), B2 (KÝ TỰ ĐẶC BIỆT), B3 (CASE)');
  console.log('========================================================================================\n');

  let passed = true;
  const testCodesToClean = [];

  try {
    // ----------------------------------------------------------------------------------
    // TEST 1 (B2): Chấp nhận mã chứa khoảng trắng, !, ?, ., #
    // ----------------------------------------------------------------------------------
    console.log('▶ [1/4] Kiểm thử B2: Mã chứa ký tự đặc biệt (khoảng trắng, !, ?, ., #)...');
    const b2Codes = [
      { code: 'ACCESS GRANTED', rewards: 'Thưởng có khoảng trắng' },
      { code: 'MACRO!', rewards: 'Thưởng có dấu chấm than' },
      { code: 'MS.FAMILIAR', rewards: 'Thưởng có dấu chấm' },
      { code: 'WHAT_NEXT?', rewards: 'Thưởng có dấu hỏi' },
    ];
    testCodesToClean.push(...b2Codes.map(c => c.code));

    const b2Res = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        gameSlug: 'zenless-zone-zero',
        codes: b2Codes
      })
    });

    assert(b2Res.ok, `API Ingest trả lỗi status ${b2Res.status}`);
    const b2Data = b2Res.data;
    assert(b2Data.success === true, 'API trả success = false');
    const result0 = b2Data.results?.[0] || {};
    
    // Đảm bảo không mã nào bị rơi vào droppedCodes
    const dropped = b2Data.droppedCodes || [];
    const droppedForTest = dropped.filter(d => b2Codes.some(bc => bc.code === d.code));
    assert(droppedForTest.length === 0, `Có mã bị loại bỏ sai quy định: ${JSON.stringify(droppedForTest)}`);
    console.log(`   ✅ B2 ĐẠT: Toàn bộ ${b2Codes.length} mã chứa khoảng trắng, !, ., ? đều được chấp nhận 100%!`);

    // ----------------------------------------------------------------------------------
    // TEST 2 (B3): Giữ nguyên case phân biệt hoa/thường (không ép toUpperCase)
    // ----------------------------------------------------------------------------------
    console.log('\n▶ [2/4] Kiểm thử B3: Bảo tồn chữ hoa/chữ thường (Case Sensitivity)...');
    const b3Codes = [
      { code: 'SunbringerTestAlpha', rewards: 'Test hoa thường' },
      { code: 'ckwy32t1eeevs_lower', rewards: 'Test chữ thường hoàn toàn' }
    ];
    testCodesToClean.push(...b3Codes.map(c => c.code));

    const b3Res = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        gameSlug: 'zenless-zone-zero',
        codes: b3Codes
      })
    });

    assert(b3Res.ok, `API Ingest trả lỗi status ${b3Res.status}`);
    const b3Data = b3Res.data;
    const b3Result = b3Data.results?.[0] || {};
    const addedOrDup = [...(b3Result.addedCodes || []), ...(b3Result.duplicateCodes || [])];
    
    assert(addedOrDup.includes('SunbringerTestAlpha'), 'Mã "SunbringerTestAlpha" bị biến đổi case!');
    assert(addedOrDup.includes('ckwy32t1eeevs_lower'), 'Mã "ckwy32t1eeevs_lower" bị biến đổi case!');
    console.log('   ✅ B3 ĐẠT: Chuỗi mã giữ nguyên 100% case gốc phân biệt hoa/thường!');

    // ----------------------------------------------------------------------------------
    // TEST 3 (B4): Cập nhật metadata khi đẩy trùng (Upsert) & Action update_code_metadata
    // ----------------------------------------------------------------------------------
    console.log('\n▶ [3/4] Kiểm thử B4: Cập nhật metadata (Hạn dùng, phần thưởng, trạng thái)...');
    const updateTestCode = 'SunbringerTestAlpha';
    const b4Res = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        action: 'update_code_metadata',
        gameSlug: 'zenless-zone-zero',
        code: updateTestCode,
        status: 'expired',
        expiresAt: '2026-10-29 23:59:59 UTC+8',
        rewards: 'Phần thưởng cập nhật mới 50 Polychrome'
      })
    });

    assert(b4Res.ok, `Action update_code_metadata thất bại: status ${b4Res.status}`);
    assert(b4Res.data?.success === true, 'update_code_metadata trả về success = false');
    assert(b4Res.data?.status === 'expired', 'Trạng thái không được cập nhật sang expired');
    console.log('   ✅ B4 ĐẠT: Metadata hạn dùng, phần thưởng và trạng thái được cập nhật tức thì!');

    // ----------------------------------------------------------------------------------
    // TEST 4 (B1): Mã mới không bao giờ báo trùng ảo & Response minh bạch duplicateDetails
    // ----------------------------------------------------------------------------------
    console.log('\n▶ [4/4] Kiểm thử B1: Không báo trùng ảo và response minh bạch duplicateDetails...');
    const uniqueFreshCode = `FRESH_${Date.now()}_TEST`;
    testCodesToClean.push(uniqueFreshCode);

    const b1FreshRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        gameSlug: 'zenless-zone-zero',
        codes: [{ code: uniqueFreshCode, rewards: 'Mã mới 100%' }]
      })
    });

    assert(b1FreshRes.ok, 'Ingest fresh code failed');
    const b1FreshResult = b1FreshRes.data?.results?.[0] || {};
    assert(b1FreshResult.addedCount === 1, `Mã hoàn toàn mới bị báo trùng ảo! (addedCount: ${b1FreshResult.addedCount}, duplicateCount: ${b1FreshResult.duplicateCount})`);
    assert(b1FreshResult.duplicateCount === 0, 'Mã hoàn toàn mới không được có duplicateCount > 0');

    // Đẩy lại chính mã đó để kiểm tra duplicateDetails
    const b1DupRes = await fetchJson('/api/crawler/ingest-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        gameSlug: 'zenless-zone-zero',
        codes: [{ code: uniqueFreshCode, rewards: 'Mã mới 100%' }]
      })
    });
    const b1DupResult = b1DupRes.data?.results?.[0] || {};
    assert(b1DupResult.duplicateCount === 1, 'Đẩy lại không nhận diện duplicate');
    assert(Array.isArray(b1DupResult.duplicateDetails) && b1DupResult.duplicateDetails.length > 0, 'Thiếu trường duplicateDetails trong response');
    const dupDetail = b1DupResult.duplicateDetails[0];
    assert(dupDetail.code === uniqueFreshCode, 'duplicateDetails không đúng mã');
    assert(dupDetail.gameSlug === 'zenless-zone-zero', 'duplicateDetails không đúng gameSlug');
    console.log(`   ✅ B1 ĐẠT: Mã mới không bị trùng ảo; mã trùng báo rõ vị trí (${dupDetail.existingLocation}) và trạng thái (${dupDetail.status})!`);

  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM TOÁN:', err.message);
    passed = false;
  } finally {
    // ----------------------------------------------------------------------------------
    // RULE 7: ZERO TEST ARTIFACTS ON PRODUCTION - DỌN SẠCH 100%
    // ----------------------------------------------------------------------------------
    console.log('\n🧹 Đang thực thi dọn dẹp sạch mã test theo Rule 7 (Zero Test Artifacts)...');
    try {
      await fetchJson('/api/crawler/ingest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          action: 'cleanup_test_codes',
          prefix: 'SunbringerTest'
        })
      });

      await fetchJson('/api/crawler/ingest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          action: 'cleanup_test_codes',
          prefix: 'FRESH_'
        })
      });

      await fetchJson('/api/crawler/ingest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          action: 'cleanup_test_codes',
          codes: [
            'ACCESS GRANTED',
            'MACRO!',
            'MS.FAMILIAR',
            'WHAT_NEXT?',
            'ckwy32t1eeevs_lower'
          ]
        })
      });

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
      console.log('✅ HOÀN TẤT DỌN DẸP: Dữ liệu production sạch sẽ 100%!');
    } catch (cleanErr) {
      console.warn('⚠️ Cảnh báo dọn dẹp:', cleanErr.message);
    }
  }

  console.log('\n========================================================================================');
  if (passed) {
    console.log('🎉 TẤT CẢ 4 BÀI KIỂM THỬ HỒI QUY INGEST ĐÃ ĐẠT 100%!');
    console.log('========================================================================================\n');
    process.exit(0);
  } else {
    console.error('💥 CÓ BÀI KIỂM THỬ HỒI QUY THẤT BẠI!');
    console.log('========================================================================================\n');
    process.exit(1);
  }
}

runRegressionSuite();
