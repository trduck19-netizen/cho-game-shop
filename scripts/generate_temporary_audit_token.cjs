/**
 * Script: Generate a 2-Hour Temporary Read-Only Audit Token
 * Strictly valid for 120 minutes (7200 seconds) from generation time.
 * Can be verified on Cloudflare Edge without storing in D1 or database.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const secret = (process.env.ADMIN_SYNC_SECRET || '').trim();
if (!secret) {
  console.error('❌ Error: ADMIN_SYNC_SECRET not found in .env');
  process.exit(1);
}

async function generateToken(expiresInHours = 2) {
  const expiresInMs = expiresInHours * 60 * 60 * 1000;
  const now = Date.now();
  const expiresAtMs = now + expiresInMs;
  
  const random = require('crypto').randomUUID().replace(/-/g, '').substring(0, 12);
  const payload = `audit_temp.${expiresAtMs}.${random}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(`${payload}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sig = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 20);
  
  const token = `wcg_audit_temp_${expiresAtMs}_${random}_${sig}`;
  
  const vnDate = new Date(expiresAtMs + 7 * 3600 * 1000);
  const formattedVn = vnDate.toISOString().replace('T', ' ').slice(0, 19) + ' (Giờ Việt Nam UTC+7)';
  
  console.log('================================================================');
  console.log('🔑 KHÓA KIỂM TOÁN TẠM THỜI (2 GIỜ - CHỈ ĐỌC / READ-ONLY)');
  console.log('================================================================');
  console.log(`Token:            ${token}`);
  console.log(`Thời gian cấp:    ${new Date(now + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)} (UTC+7)`);
  console.log(`Thời gian hết hạn: ${formattedVn}`);
  console.log(`Thời lượng:       ${expiresInHours} giờ (${expiresInMs / 1000} giây)`);
  console.log(`Quyền hạn:        CHỈ ĐỌC (Read-Only 100%). Cấm mọi thao tác ghi/sửa.`);
  console.log('================================================================');
  console.log('\n📋 CÁC LỆNH TEST MẪU DÀNH CHO PINE AI / AUDITOR:');
  console.log(`\n1. Đọc Snapshot đối soát kho hàng:`);
  console.log(`curl -X GET "https://codegame.shop/api/crawler/marketing?action=get_metrics_snapshot" \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);
  console.log(`\n2. Đọc toàn bộ Database State gốc trong D1:`);
  console.log(`curl -X GET "https://codegame.shop/api/sync" \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);
  console.log(`\n3. Đọc cấu hình live Marketing & FOMO:`);
  console.log(`curl -X GET "https://codegame.shop/api/crawler/marketing?action=get_marketing_config" \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);
  console.log(`\n4. Quét đối soát kho hàng (Dry-Run Audit):`);
  console.log(`curl -X GET "https://codegame.shop/api/admin/audit-counters" \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);
  console.log('================================================================\n');

  return { token, expiresAtMs, formattedVn };
}

generateToken(2);
