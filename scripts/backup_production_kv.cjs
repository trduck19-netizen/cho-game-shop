const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = path.resolve(__dirname, '../backups');

const ALL_15_KEYS = [
  'wcg_admin_content_v4',
  'wcg_admin_giveaways_v4',
  'wcg_admin_inventory_v4',
  'wcg_admin_members_v4',
  'wcg_admin_orders_v4',
  'wcg_admin_private_codes_v4',
  'wcg_admin_security_logs_v4',
  'wcg_admin_sepay_logs_v4',
  'wcg_admin_sepay_v4',
  'wcg_admin_store_products_v4',
  'wcg_admin_submissions_v4',
  'wcg_admin_transactions_v4',
  'wcg_admin_utilities_v4',
  'wcg_last_sync_timestamp',
  'wcg_master_state_v4',
];

async function runReadOnlyBackup() {
  console.log('📦 ========================================================');
  console.log('📦 SAO LƯU READ-ONLY TOÀN BỘ 15 KEYS TRÊN PRODUCTION KV');
  console.log('📦 ========================================================\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const consolidatedBackup = {
    backup_timestamp: new Date().toISOString(),
    source: 'Cloudflare Pages KV Namespace (Production)',
    keys_count: ALL_15_KEYS.length,
    data: {},
  };

  const results = [];

  for (let i = 0; i < ALL_15_KEYS.length; i++) {
    const key = ALL_15_KEYS[i];
    process.stdout.write(`[${i + 1}/${ALL_15_KEYS.length}] Đang đọc key "${key}"... `);

    try {
      const raw = execSync(`npx.cmd wrangler kv key get --binding=KV "${key}"`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      });

      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      // Save individual key file
      const keyFilePath = path.join(BACKUP_DIR, `${key}.json`);
      fs.writeFileSync(keyFilePath, typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2), 'utf-8');

      consolidatedBackup.data[key] = parsed;

      const sizeBytes = Buffer.byteLength(raw, 'utf-8');
      results.push({ key, sizeBytes, status: 'OK' });
      console.log(`✅ Thành công (${(sizeBytes / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.log(`❌ Lỗi: ${err.message}`);
      results.push({ key, sizeBytes: 0, status: 'ERROR', error: err.message });
    }
  }

  // Save consolidated timestamped backup
  const consolidatedPath = path.join(BACKUP_DIR, `full_kv_backup_${timestamp}.json`);
  fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedBackup, null, 2), 'utf-8');

  console.log('\n========================================================');
  console.log(`🎉 ĐÃ SAO LƯU THÀNH CÔNG VÀO THƯ MỤC: ${BACKUP_DIR}`);
  console.log(`📁 File tổng hợp: backups/full_kv_backup_${timestamp}.json`);
  console.log('========================================================\n');

  console.table(results);
}

runReadOnlyBackup();
