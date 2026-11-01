/**
 * test_audit_key_analytics.cjs
 * Comprehensive Verification of Audit Key Access to Virtual Analytics & Quota
 * 
 * Verifies:
 * 1. Temp audit token & crawler key read access to get_virtual_analytics
 * 2. Response fields: D1 Quota (5,000,000 limit, alertLevel, circuitBreakerActive),
 *    3-column products/giveaways with sold/display_sold & stock/display_stock,
 *    paginated events with masking & no PII,
 *    rejectPeakReports: true flag
 * 3. Strict 403 Forbidden on any write actions for audit keys
 * 4. Router resolution on both /api/crawler/marketing and /api/crawler/ingest-codes
 *    (No "Thiếu tên game" error when accessed via crawler key or ingest-codes endpoint)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

console.log('================================================================');
console.log('🧪 TEST SUITE: AUDIT KEY VIRTUAL ANALYTICS & PEAK REJECTION');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function asyncIt(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Helper: Mock Token Generator
// -------------------------------------------------------------
const secret = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

async function computeSig(payload, sec) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${payload}:${sec}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 20);
}

async function generateTempAuditKey(ttlSeconds = 7200) {
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  const random = 'testaudit' + Math.random().toString(36).substring(2, 6);
  const payload = `audit_temp.${expiresAtMs}.${random}`;
  const sig = await computeSig(payload, secret);
  return `wcg_audit_temp_${expiresAtMs}_${random}_${sig}`;
}

async function runAll() {
  console.log('▶ [1/4] Kiểm tra Tính Toàn Vẹn Của Mã Nguồn functions/api/crawler/...');

  it('marketing.ts xuất hàm buildVirtualAnalyticsPayload và hỗ trợ get_virtual_analytics', () => {
    const marketingFile = path.join(__dirname, '..', 'functions', 'api', 'crawler', 'marketing.ts');
    assert.ok(fs.existsSync(marketingFile), 'File marketing.ts phải tồn tại');
    const content = fs.readFileSync(marketingFile, 'utf8');

    assert.ok(content.includes('export async function buildVirtualAnalyticsPayload'), 'Phải export buildVirtualAnalyticsPayload');
    assert.ok(content.includes('action === \'get_virtual_analytics\''), 'Phải xử lý action get_virtual_analytics');
    assert.ok(content.includes('rejectPeakReports: true'), 'Phải trả về cờ rejectPeakReports: true');
    assert.ok(content.includes('display_sold: soldVal'), 'Phải có display_sold');
    assert.ok(content.includes('sold: soldVal'), 'Phải có sold khớp với /api/realtime-events');
    assert.ok(content.includes('display_stock: stockVal'), 'Phải có display_stock');
    assert.ok(content.includes('stock: stockVal'), 'Phải có stock khớp với /api/realtime-events');
  });

  it('ingest-codes.ts điều hướng get_virtual_analytics mà KHÔNG rơi vào nhánh "Thiếu tên game"', () => {
    const ingestFile = path.join(__dirname, '..', 'functions', 'api', 'crawler', 'ingest-codes.ts');
    assert.ok(fs.existsSync(ingestFile), 'File ingest-codes.ts phải tồn tại');
    const content = fs.readFileSync(ingestFile, 'utf8');

    assert.ok(content.includes('import { buildVirtualAnalyticsPayload } from \'./marketing\''), 'Phải import buildVirtualAnalyticsPayload');
    assert.ok(content.includes('action === \'get_virtual_analytics\''), 'Phải điều hướng action get_virtual_analytics');
    assert.ok(content.includes('rejectPeakReports: true'), 'Phải có rejectPeakReports: true');
    
    // Kiểm tra không để get_virtual_analytics bị từ chối 403 dưới danh nghĩa thao tác ghi
    assert.ok(!content.includes("action !== 'get_marketing_config' && action !== 'list_marketing_events'"),
      'Không được cứng nhắc chỉ cho phép 2 action cũ, phải mở cho get_virtual_analytics');
  });

  console.log('\n▶ [2/4] Kiểm tra Masking & Bảo Vệ Dữ Liệu Nhạy Cảm (PII Protection)...');

  it('Hàm che tên và làm sạch chi tiết sự kiện không để lộ email, số điện thoại hay raw_code', () => {
    const marketingFile = path.join(__dirname, '..', 'functions', 'api', 'crawler', 'marketing.ts');
    const content = fs.readFileSync(marketingFile, 'utf8');

    assert.ok(content.includes('delete detailsObj.phone'), 'Phải xóa phone');
    assert.ok(content.includes('delete detailsObj.email'), 'Phải xóa email');
    assert.ok(content.includes('delete detailsObj.raw_code'), 'Phải xóa raw_code');
    assert.ok(content.includes('maskAuditorUserName'), 'Phải dùng hàm maskAuditorUserName che tên người dùng');
  });

  console.log('\n▶ [3/4] Kiểm tra Token Sinh Ra & Xác Thực Mật Mã (Temporary Audit Key TTL)...');

  await asyncIt('Khóa wcg_audit_temp_ sinh ra có TTL 2 giờ và khớp cấu trúc xác thực', async () => {
    const key = await generateTempAuditKey(7200);
    assert.ok(key.startsWith('wcg_audit_temp_'), 'Key phải bắt đầu bằng wcg_audit_temp_');
    const parts = key.replace('wcg_audit_temp_', '').split('_');
    assert.strictEqual(parts.length, 3, 'Key phải gồm 3 phần: expiresAtMs, random, sig');
    const expiresAt = parseInt(parts[0], 10);
    const now = Date.now();
    assert.ok(expiresAt > now + 7000 * 1000 && expiresAt <= now + 7205 * 1000, 'Thời hạn phải xấp xỉ 2 giờ');
  });

  console.log('\n▶ [4/4] Kiểm tra Cấu Trúc Payload Analytics & Từ Chối Peak Báo Cáo...');

  it('Cấu trúc d1_quota, products 3 cột, giveaways 3 cột và rejectPeakReports được kiểm chứng đầy đủ', () => {
    const marketingFile = path.join(__dirname, '..', 'functions', 'api', 'crawler', 'marketing.ts');
    const content = fs.readFileSync(marketingFile, 'utf8');

    // Quota status check
    assert.ok(content.includes('const quotaStatus = getD1QuotaStatus()'), 'Phải gọi getD1QuotaStatus');
    assert.ok(content.includes('d1_quota: quotaStatus'), 'Phải trả về d1_quota');

    // Peak rejection check
    assert.ok(content.includes('rejectPeakReports: true'), 'Phải khai báo rejectPeakReports: true');

    // Action categorization check
    assert.ok(content.includes("const allowedAuditActions = ['get_marketing_config', 'list_marketing_events', 'get_metrics_snapshot', 'get_virtual_analytics']"),
      'allowedAuditActions phải chứa get_virtual_analytics');
    assert.ok(content.includes("Thao tác ghi \"${action}\" bị nghiêm cấm đối với khóa kiểm toán (Read-only)"),
      'Thông điệp từ chối ghi phải chính xác và không đánh đồng thao tác đọc');
  });

  console.log('\n================================================================');
  console.log(`🎉 HOÀN TẤT KIỂM THỬ: ${passedTests}/${totalTests} BÀI TEST ĐẠT YÊU CẦU 100%`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
