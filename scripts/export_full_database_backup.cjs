const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const SYNC_SECRET = (process.env.ADMIN_SYNC_SECRET || '').trim();
if (!SYNC_SECRET) {
  console.error('❌ Lỗi: Chưa cấu hình biến môi trường ADMIN_SYNC_SECRET trong file .env');
  process.exit(1);
}
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://admin-code-game-shop.pages.dev/api/sync';

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function runBackup() {
  console.log('🚀 Bắt đầu quá trình sao lưu toàn bộ dữ liệu hệ thống Web Code Game...');

  const headers = {
    'X-Sync-Key': SYNC_SECRET,
    'Accept': 'application/json',
  };

  // 1. Tải toàn bộ Master State từ Server D1
  console.log('📦 1/3. Đang trích xuất toàn bộ dữ liệu tổng từ Cloudflare D1 (/api/sync)...');
  const masterData = await fetchWithRetry(ADMIN_API_URL, { headers });

  // 2. Tải toàn bộ danh sách thành viên đầy đủ kèm mã băm mật khẩu (salt, password_hash)
  console.log('🔐 2/3. Đang trích xuất thông tin tài khoản thành viên kèm mã băm mật khẩu...');
  const membersRaw = await fetchWithRetry(`${ADMIN_API_URL}?key=wcg_admin_members_v4`, { headers });
  const fullMembers = membersRaw && Array.isArray(membersRaw.value) ? membersRaw.value : masterData.members || [];

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.replace(/[:.]/g, '-');

  const backupPayload = {
    metadata: {
      exportedAt: timestamp,
      sourceUrl: 'https://admin-code-game-shop.pages.dev',
      database: 'web-code-game-db (Cloudflare D1)',
      version: 'v4.5-full-snapshot',
      summary: {
        gamesCount: (masterData.games || []).length,
        freeCodesGameCount: Object.keys(masterData.freeCodes || {}).length,
        storeProductsCount: (masterData.storeProducts || []).length,
        utilitiesCount: (masterData.utilities || []).length,
        giveawaysCount: (masterData.giveaways || []).length,
        membersCount: fullMembers.length,
        ordersCount: (masterData.orders || []).length,
        inventoryCount: (masterData.inventory || []).length,
        walletTransactionsCount: (masterData.transactions || []).length,
        sepayTransactionsCount: (masterData.sepayLogs || []).length,
        bannersCount: (masterData.content?.banners || []).length,
      }
    },
    members: fullMembers,
    games: masterData.games || [],
    freeCodes: masterData.freeCodes || {},
    storeProducts: masterData.storeProducts || [],
    utilities: masterData.utilities || [],
    giveaways: masterData.giveaways || [],
    orders: masterData.orders || [],
    inventory: masterData.inventory || [],
    walletTransactions: masterData.transactions || [],
    sepayTransactions: masterData.sepayLogs || [],
    sepayConfig: masterData.sepay || {},
    contentCMS: masterData.content || {},
    marketingConfig: masterData.marketingConfig || {},
    securityLogs: masterData.securityLogs || [],
  };

  const backupDir = path.join(__dirname, '..', 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 3. Ghi ra 2 file: File snapshot mới nhất và File lưu trữ theo mốc thời gian
  const latestFile = path.join(backupDir, 'full_database_backup_latest.json');
  const timedFile = path.join(backupDir, `backup_${dateStr}.json`);

  console.log('💾 3/3. Đang lưu file JSON sao lưu độc lập vào thư mục data/backups/...');
  fs.writeFileSync(latestFile, JSON.stringify(backupPayload, null, 2), 'utf-8');
  fs.writeFileSync(timedFile, JSON.stringify(backupPayload, null, 2), 'utf-8');

  // 4. Tạo file SQL Restore độc lập
  const sqlFile = path.join(backupDir, 'full_database_restore.sql');
  const sqlLines = [
    `-- ========================================================`,
    `-- FULL DATABASE BACKUP RESTORE SCRIPT (SQLite / Cloudflare D1)`,
    `-- Exported At: ${timestamp}`,
    `-- ========================================================`,
    `BEGIN TRANSACTION;`,
    ``,
  ];

  // Helper escape SQL
  const esc = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // Restore Members
  sqlLines.push(`-- --- 1. MEMBERS (${fullMembers.length} records) ---`);
  for (const m of fullMembers) {
    sqlLines.push(
      `INSERT OR REPLACE INTO members (id, username, display_name, email, phone, role, balance, total_spent, status, avatar_url, session_token, last_login, created_at, registered_ip, salt, password_hash) ` +
      `VALUES (${esc(m.id)}, ${esc(m.username)}, ${esc(m.display_name || m.displayName)}, ${esc(m.email)}, ${esc(m.phone)}, ${esc(m.role)}, ${Number(m.balance) || 0}, ${Number(m.total_spent) || 0}, ${esc(m.status || 'ACTIVE')}, ${esc(m.avatar_url || m.avatarUrl)}, ${esc(m.session_token)}, ${esc(m.last_login)}, ${esc(m.created_at || m.createdAt)}, ${esc(m.registered_ip)}, ${esc(m.salt)}, ${esc(m.password_hash || m.passwordHash)});`
    );
  }

  // Restore Inventory Codes
  const invList = masterData.inventory || [];
  sqlLines.push(``, `-- --- 2. INVENTORY CODES (${invList.length} records) ---`);
  for (const inv of invList) {
    sqlLines.push(
      `INSERT OR REPLACE INTO inventory_codes (id, product_id, code_content, status, order_id, sold_at, created_at) ` +
      `VALUES (${esc(inv.id)}, ${esc(inv.sku || inv.product_id)}, ${esc(inv.codeValue || inv.code_content)}, ${esc(inv.status || 'AVAILABLE')}, ${esc(inv.orderId || inv.order_id)}, ${esc(inv.soldAt || inv.sold_at)}, ${esc(inv.createdAt || inv.created_at)});`
    );
  }

  // Restore Orders
  const ordList = masterData.orders || [];
  sqlLines.push(``, `-- --- 3. ORDERS (${ordList.length} records) ---`);
  for (const o of ordList) {
    const delJson = Array.isArray(o.deliveredCodes) ? JSON.stringify(o.deliveredCodes) : (o.delivered_codes || '[]');
    sqlLines.push(
      `INSERT OR REPLACE INTO orders (id, member_id, buyer_email, product_id, product_title, quantity, unit_price, total_amount, delivered_codes, status, created_at) ` +
      `VALUES (${esc(o.id)}, ${esc(o.memberId || o.member_id)}, ${esc(o.buyerEmail || o.buyer_email)}, ${esc(o.productId || o.product_id)}, ${esc(o.productTitle || o.product_title)}, ${Number(o.quantity) || 1}, ${Number(o.unitPrice || o.unit_price) || 0}, ${Number(o.amount || o.total_amount) || 0}, ${esc(delJson)}, ${esc(o.status || 'PAID')}, ${esc(o.createdAt || o.created_at)});`
    );
  }

  // Restore Wallet Transactions
  const txList = masterData.transactions || [];
  sqlLines.push(``, `-- --- 4. WALLET TRANSACTIONS (${txList.length} records) ---`);
  for (const t of txList) {
    sqlLines.push(
      `INSERT OR REPLACE INTO wallet_transactions (id, member_id, member_email, type, amount, balance_before, balance_after, description, status, order_id, created_at) ` +
      `VALUES (${esc(t.id)}, ${esc(t.memberId || t.member_id)}, ${esc(t.memberEmail || t.member_email)}, ${esc(t.type)}, ${Number(t.amount) || 0}, ${Number(t.balanceBefore || t.balance_before) || 0}, ${Number(t.balanceAfter || t.balance_after) || 0}, ${esc(t.note || t.description)}, ${esc(t.status || 'COMPLETED')}, ${esc(t.orderId || t.order_id)}, ${esc(t.createdAt || t.created_at)});`
    );
  }

  // Restore SePay Transactions
  const spList = masterData.sepayLogs || [];
  sqlLines.push(``, `-- --- 5. SEPAY TRANSACTIONS (${spList.length} records) ---`);
  for (const s of spList) {
    sqlLines.push(
      `INSERT OR REPLACE INTO sepay_transactions (id, transaction_id, gateway, account_number, amount_in, transaction_content, member_id, status, created_at) ` +
      `VALUES (${esc(s.id)}, ${esc(s.transactionId || s.transaction_id)}, ${esc(s.gateway)}, ${esc(s.accountNumber || s.account_number)}, ${Number(s.transferAmount || s.amount_in) || 0}, ${esc(s.content || s.transaction_content)}, ${esc(s.memberId || s.member_id)}, ${esc(s.status)}, ${esc(s.processedAt || s.created_at)});`
    );
  }

  sqlLines.push(``, `COMMIT;`);
  fs.writeFileSync(sqlFile, sqlLines.join('\n'), 'utf-8');

  const stats = fs.statSync(latestFile);
  const sqlStats = fs.statSync(sqlFile);

  console.log('\n======================================================');
  console.log('✅ SAO LƯU THÀNH CÔNG 100% DỮ LIỆU TOÀN DIỆN:');
  console.log(`- File JSON: ${latestFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- File SQL:  ${sqlFile} (${(sqlStats.size / 1024).toFixed(2)} KB)`);
  console.log('------------------------------------------------------');
  console.log(`- Games Catalog:        ${backupPayload.metadata.summary.gamesCount}`);
  console.log(`- Thành viên (Members):  ${backupPayload.metadata.summary.membersCount}`);
  console.log(`- Đơn hàng (Orders):     ${backupPayload.metadata.summary.ordersCount}`);
  console.log(`- Mã trong kho (Codes):  ${backupPayload.metadata.summary.inventoryCount}`);
  console.log(`- Biến động ví (Txs):    ${backupPayload.metadata.summary.walletTransactionsCount}`);
  console.log(`- Nhật ký SePay:         ${backupPayload.metadata.summary.sepayTransactionsCount}`);
  console.log(`- Sự kiện Giveaway:      ${backupPayload.metadata.summary.giveawaysCount}`);
  console.log(`- Gói tiện ích nạp:      ${backupPayload.metadata.summary.utilitiesCount}`);
  console.log('======================================================\n');
}

runBackup().catch(err => {
  console.error('❌ Lỗi khi sao lưu dữ liệu:', err);
  process.exit(1);
});
