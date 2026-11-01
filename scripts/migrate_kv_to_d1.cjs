const fs = require('fs');
const path = require('path');

console.log('=== TẠO FILE SQL IMPORT DỮ LIỆU TỪ KV SANG D1 ===');

const backupDir = path.join(__dirname, '..', 'backups');
const sqlFile = path.join(__dirname, '..', 'migrations', '0002_initial_data.sql');

let sqlStatements = [];
sqlStatements.push('-- Migration: 0002_initial_data.sql');
sqlStatements.push('-- Sinh tự động từ bản sao lưu Cloudflare KV');
sqlStatements.push('PRAGMA foreign_keys = ON;\n');

// 1. Store Products
const prodFile = path.join(backupDir, 'wcg_admin_store_products_v4.json');
if (fs.existsSync(prodFile)) {
  const products = JSON.parse(fs.readFileSync(prodFile, 'utf8'));
  for (const p of products) {
    if (!p.id) continue;
    const title = (p.title || '').replace(/'/g, "''");
    const gameSlug = (p.game_slug || '').replace(/'/g, "''");
    const gameName = (p.game_name || '').replace(/'/g, "''");
    const originalPrice = Number(p.original_price) || 0;
    const discountPercent = Number(p.discount_percent) || 0;
    const currentPrice = Number(p.current_price) || 0;
    const stockQuantity = Number(p.stock_quantity) || 0;
    const isActive = p.is_active ? 1 : 0;

    sqlStatements.push(
      `INSERT OR IGNORE INTO store_products (id, title, game_slug, game_name, original_price, discount_percent, current_price, stock_quantity, is_active) ` +
      `VALUES ('${p.id}', '${title}', '${gameSlug}', '${gameName}', ${originalPrice}, ${discountPercent}, ${currentPrice}, ${stockQuantity}, ${isActive});`
    );
  }
}

// 2. Members (Seed admin user nếu KV members rỗng)
const memFile = path.join(backupDir, 'wcg_admin_members_v4.json');
let members = [];
if (fs.existsSync(memFile)) {
  try {
    members = JSON.parse(fs.readFileSync(memFile, 'utf8'));
  } catch {}
}

if (!Array.isArray(members) || members.length === 0) {
  // Thêm tài khoản admin290200 chuẩn
  sqlStatements.push(
    `INSERT OR IGNORE INTO members (id, username, display_name, email, role, balance, status, salt, password_hash) ` +
    `VALUES ('usr_admin', 'admin290200', 'admin290200', 'admin@codegame.store', 'SUPER_ADMIN', 9999000, 'ACTIVE', 'wcg_admin_salt_seed_2026', '69ea02563957ebf469d695bd94910669ace925bbeceffc0f3dffecce2ce51aac');`
  );
} else {
  for (const m of members) {
    if (!m.id) continue;
    const username = (m.username || m.displayName || '').replace(/'/g, "''");
    const displayName = (m.displayName || m.username || '').replace(/'/g, "''");
    const email = (m.email || '').replace(/'/g, "''");
    const roleUpper = String(m.role || 'MEMBER').toUpperCase();
    const balance = Math.max(0, Number(m.balance) || 0);
    const status = m.status === 'BANNED' ? 'BANNED' : 'ACTIVE';
    const salt = (m.salt || '').replace(/'/g, "''");
    const hash = (m.passwordHash || '').replace(/'/g, "''");

    sqlStatements.push(
      `INSERT OR IGNORE INTO members (id, username, display_name, email, role, balance, status, salt, password_hash) ` +
      `VALUES ('${m.id}', '${username}', '${displayName}', '${email}', '${roleUpper}', ${balance}, '${status}', '${salt}', '${hash}');`
    );
  }
}

fs.writeFileSync(sqlFile, sqlStatements.join('\n') + '\n', 'utf8');
console.log('✅ Đã tạo tệp migrations/0002_initial_data.sql với', sqlStatements.length, 'dòng lệnh SQL.');
