/**
 * Gatekeeper Audit Script: Zero Test Artifacts on Production
 * Run via: node scripts/audit_zero_test_artifacts.cjs
 * Fails fast (exit 1) if ANY test artifact (giveaway, utility, store product, or test giftcode) is detected.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🛡️ RUNNING AUDIT: ZERO TEST ARTIFACTS ON PRODUCTION & CODEBASE');
console.log('================================================================\n');

const KNOWN_TEST_IDS = new Set([
  'gw_gamerpower_rotwood',
  'gw_alienware_vaultbreakers',
  'gw_garena_delta_force',
  'ut_test_01',
  'ut_1791615390756_1yc',
  'sp_hsr_pass',
  'sp_genshin_welkin',
  'sp_roblox_robux_1000',
  'sp_lq_qh_500',
  'sp_ff_kc_520',
  'sp_pubg_uc_600',
  'code_delta-force_GP-3812-VAULTBRE',
  'code_delta-force_AA-VAULTBREAKER-2026',
  'code_where-winds-meet-mobile_GP-EVERWIND-AW51',
  'code_yen-van-thap-luc-thanh_AA-WWM-EXCL-2026'
]);

function isTestItem(item) {
  if (!item) return false;
  const id = String(item.id || '').toLowerCase();
  const title = String(item.title || item.name || '').toLowerCase();
  const gameName = String(item.game_name || item.gameName || '').toLowerCase();

  if (KNOWN_TEST_IDS.has(item.id)) return true;
  if (id.startsWith('test_') || id.includes('_test_') || id.startsWith('ut_test_') || id.startsWith('sp_test_') || id.startsWith('gw_test_')) return true;
  if (title.includes('rotwood') || title.includes('vaultbreaker') || title.includes('pine world')) return true;
  if (item.is_test === true) return true;
  return false;
}

// 1. Audit src/data/giveaways.json
console.log('▶ [1/4] Kiểm tra giveaways.json (Giật Code)...');
const giveaways = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/giveaways.json'), 'utf8'));
const badGw = giveaways.filter(isTestItem);
if (badGw.length > 0) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Phát hiện chiến dịch test trong giveaways.json:', badGw.map(g => ({ id: g.id, title: g.title })));
  process.exit(1);
}
const badGwPools = giveaways.filter(g => (g.codes_pool || []).some(c => String(c).toUpperCase().startsWith('TEST')));
if (badGwPools.length > 0) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Phát hiện mã test trong kho Giveaway:', badGwPools.map(g => ({ id: g.id, title: g.title, pool: g.codes_pool })));
  process.exit(1);
}
console.log(`   ✅ giveaways.json sạch 100% (${giveaways.length} chiến dịch thực tế, 0 mục test).`);

// 2. Audit src/data/storeProducts.json
console.log('▶ [2/4] Kiểm tra storeProducts.json (Cửa Hàng)...');
const storeProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/storeProducts.json'), 'utf8'));
const badSp = storeProducts.filter(isTestItem);
if (badSp.length > 0) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Phát hiện sản phẩm test trong storeProducts.json:', badSp.map(p => ({ id: p.id, title: p.title })));
  process.exit(1);
}
assert(storeProducts.length === 0, 'storeProducts.json must remain [] until real products are added by admin');
console.log('   ✅ storeProducts.json sạch 100% (0 sản phẩm test).');

// 3. Audit src/data/utilities.json
console.log('▶ [3/4] Kiểm tra utilities.json (Tiện Ích)...');
const utilities = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/utilities.json'), 'utf8'));
const badUt = utilities.filter(isTestItem);
if (badUt.length > 0) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Phát hiện tiện ích test trong utilities.json:', badUt.map(u => ({ id: u.id, title: u.title })));
  process.exit(1);
}
assert(utilities.length === 18, 'utilities.json must contain exactly 18 canonical user packages');
const vip7d = utilities.find(u => u.id === 'ut_vs_05_vip_7d');
assert(vip7d && vip7d.stock_quantity === 7, 'ut_vs_05_vip_7d must have stock_quantity: 7');
console.log('   ✅ utilities.json sạch 100% (18 tiện ích người dùng, ut_vs_05_vip_7d còn 7, 0 mục test).');

// 4. Audit src/data/crawled_codes_188.json
console.log('▶ [4/5] Kiểm tra crawled_codes_188.json (Kho Giftcode)...');
const codes = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/crawled_codes_188.json'), 'utf8'));
const badCodes = codes.filter(c => KNOWN_TEST_IDS.has(c.id) || (c.code && (c.code.includes('VAULTBRE') || c.code.includes('EXCL-2026'))));
if (badCodes.length > 0) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Phát hiện giftcode test trong crawled_codes_188.json:', badCodes.map(c => ({ id: c.id, code: c.code })));
  process.exit(1);
}
console.log(`   ✅ crawled_codes_188.json sạch 100% (${codes.length} giftcode thực tế, 0 mã test).`);

// 5. Audit src/data/games188.json
console.log('▶ [5/5] Kiểm tra games188.json (Kho Tựa Game)...');
const gamesCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/games188.json'), 'utf8'));
const badGames = gamesCatalog.filter(g => {
  const s = String(g.slug || g.id || '').toLowerCase();
  const n = String(g.name || '').toLowerCase();
  const p = String(g.publisher || '').toLowerCase();
  return s.startsWith('test-') || s.startsWith('test_') || n.includes('test audit') || p.includes('test studio');
});
if (badGames.length > 0) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Phát hiện game test trong games188.json:', badGames.map(g => ({ id: g.id, name: g.name })));
  process.exit(1);
}
console.log(`   ✅ games188.json sạch 100% (${gamesCatalog.length} tựa game thực tế, 0 game test).\n`);

console.log('================================================================');
console.log('🎉 AUDIT THÀNH CÔNG: KHÔNG CÓ BẤT KỲ SẢN PHẨM HOẶC DỮ LIỆU TEST NÀO!');
console.log('================================================================');
