const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== SYNC AUTHORITATIVE INVENTORY & UTILITIES TO CLOUDFLARE KV ===');

const tempDir = path.join(__dirname, '..', 'tmp_kv_sync');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 1. Members
const members = [
  {
    id: 'usr_admin',
    displayName: 'admin290200',
    email: 'admin@codegame.store',
    role: 'SUPER_ADMIN',
    balance: 9999000,
    status: 'ACTIVE',
    salt: 'wcg_admin_salt_seed_2026',
    passwordHash: '69ea02563957ebf469d695bd94910669ace925bbeceffc0f3dffecce2ce51aac'
  }
];

// 2. Deleted utilities tombstones
const deletedUtilities = ['ut_1', 'ut_2', 'ut_3', 'ut_4', 'ut_5', 'ut_6'];

// 3. Utilities
const utilities = [
  {
    id: 'ut_1791090777066_abb',
    title: '14',
    category: 'account',
    category_label: 'Tài khoản Premium',
    badge: 'HOT BÁN CHẠY',
    original_price: 100000,
    discount_percent: 0,
    current_price: 100000,
    stock_quantity: 3,
    sold_count: 1,
    show_sold_count: true,
    virtual_sold_count: 0,
    description: 'Thông tin tài khoản / key bản quyền chính hãng, bảo hành 1 đổi 1.',
    instructions: 'Đăng nhập thông tin được cấp tự động sau khi hoàn tất mua hàng.',
    cover_image_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
    icon_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'ut_1791081494140_ept',
    title: '8',
    category: 'account',
    category_label: 'Tài khoản Premium',
    badge: 'HOT BÁN CHẠY',
    original_price: 100000,
    discount_percent: 0,
    current_price: 100000,
    stock_quantity: 1,
    sold_count: 6,
    show_sold_count: true,
    virtual_sold_count: 0,
    description: 'Thông tin tài khoản / key bản quyền chính hãng, bảo hành 1 đổi 1.',
    instructions: 'Đăng nhập thông tin được cấp tự động sau khi hoàn tất mua hàng.',
    cover_image_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
    icon_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
    is_active: true
  }
];

// 4. Inventory: 3 AVAILABLE for utility 14, 1 SOLD for utility 14; 1 AVAILABLE for utility 8, 6 SOLD for utility 8
const inventory = [
  // Utility "14" Available (3 codes)
  {
    id: 'inv_1791090777066_1',
    sku: 'ut_1791090777066_abb',
    productName: '14',
    codeValue: 'ACC14-PREMIUM-USER01|PASS1401',
    serial: 'PIN-1401',
    price: 100000,
    status: 'AVAILABLE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'inv_1791090777066_2',
    sku: 'ut_1791090777066_abb',
    productName: '14',
    codeValue: 'ACC14-PREMIUM-USER02|PASS1402',
    serial: 'PIN-1402',
    price: 100000,
    status: 'AVAILABLE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'inv_1791090777066_3',
    sku: 'ut_1791090777066_abb',
    productName: '14',
    codeValue: 'ACC14-PREMIUM-USER03|PASS1403',
    serial: 'PIN-1403',
    price: 100000,
    status: 'AVAILABLE',
    createdAt: new Date().toISOString()
  },
  // Utility "14" Sold (1 code)
  {
    id: 'inv_1791090777066_sold1',
    sku: 'ut_1791090777066_abb',
    productName: '14',
    codeValue: 'ACC14-PREMIUM-USER00|PASS1400',
    serial: 'PIN-1400',
    price: 100000,
    status: 'SOLD',
    soldAt: new Date(Date.now() - 3600000).toISOString(),
    orderId: 'UTL-1791090777000',
    buyerEmail: 'player1@gmail.com',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  // Utility "8" Available (1 code)
  {
    id: 'inv_1791081494140_1',
    sku: 'ut_1791081494140_ept',
    productName: '8',
    codeValue: 'ACC8-PREMIUM-USER01|PASS8001',
    serial: 'PIN-8001',
    price: 100000,
    status: 'AVAILABLE',
    createdAt: new Date().toISOString()
  },
  // Utility "8" Sold (6 codes)
  ...[1, 2, 3, 4, 5, 6].map((i) => ({
    id: `inv_1791081494140_sold${i}`,
    sku: 'ut_1791081494140_ept',
    productName: '8',
    codeValue: `ACC8-PREMIUM-SOLD0${i}|PASS800${i}`,
    serial: `PIN-800${i}`,
    price: 100000,
    status: 'SOLD',
    soldAt: new Date(Date.now() - i * 3600000).toISOString(),
    orderId: `UTL-179108149400${i}`,
    buyerEmail: `buyer${i}@gmail.com`,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }))
];

// 5. Master state
const masterState = {
  isInitialized: true,
  utilities,
  inventory,
  members,
  deletedUtilities,
  deletedStoreProducts: ['sp_1', 'sp_2', 'sp_3', 'sp_4', 'sp_5', 'sp_6'],
  storeProducts: [],
  timestamp: new Date().toISOString()
};

const keysToSync = [
  { key: 'wcg_admin_members_v4', data: members },
  { key: 'wcg_deleted_utilities', data: deletedUtilities },
  { key: 'wcg_admin_utilities_v4', data: utilities },
  { key: 'wcg_admin_inventory_v4', data: inventory },
  { key: 'wcg_master_state_v4', data: masterState }
];

for (const item of keysToSync) {
  const filePath = path.join(tempDir, `${item.key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(item.data), 'utf8');
  console.log(`Writing ${item.key} to Cloudflare KV...`);
  try {
    execSync(`cmd /c "npx wrangler kv key put ${item.key} --path="${filePath}" --binding=KV --remote"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log(`Successfully synced ${item.key}`);
  } catch (err) {
    console.error(`Failed to sync ${item.key}:`, err.message);
  }
}

// Cleanup temp dir
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch {}

console.log('=== SYNC HOÀN TẤT ===');
