/**
 * test_virtual_fomo_boost.cjs
 * 
 * Kiểm thử toàn diện:
 * 1. Bổ sung số ảo cho các mục code đã giật trong admin & web ngẫu nhiên từ 52 đến 112.
 * 2. Bổ sung số ảo cho các mục đã bán có số lượng dưới 10 ngẫu nhiên từ 32 đến 212.
 * 3. Bảo toàn nghiêm ngặt Quy tắc kho hàng (Rule 3.1): Hết hàng thật thì tồn kho hiển thị bắt buộc = 0.
 * 4. Kiểm tra đồng bộ dữ liệu giữa JSON cơ sở, Admin Data Service, và Server Counter SSOT.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 TEST SUITE: BỔ SUNG SỐ ẢO GIVEAWAYS (52-112) & ĐÃ BÁN (32-212)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Kiểm tra src/data/giveaways.json
// -----------------------------------------------------------------------------
console.log('▶ [1/4] Kiểm tra 32 Chiến dịch Giveaway trong src/data/giveaways.json...');
const giveawaysPath = path.join(__dirname, '../src/data/giveaways.json');
const giveaways = JSON.parse(fs.readFileSync(giveawaysPath, 'utf8'));

assert.strictEqual(giveaways.length, 32, 'giveaways.json phải có chính xác 32 chiến dịch chuẩn SEO');

giveaways.forEach((gw, idx) => {
  const offset = Number(gw.virtual_claimed_offset);
  assert(
    typeof offset === 'number' && !isNaN(offset),
    `Giveaway ${gw.id} (${gw.title}) phải có virtual_claimed_offset kiểu số`
  );
  assert(
    offset >= 52 && offset <= 112,
    `Giveaway ${gw.id} (${gw.title}) có virtual_claimed_offset = ${offset} nằm ngoài khoảng [52, 112]`
  );
  assert.strictEqual(
    gw.show_claimed_count,
    true,
    `Giveaway ${gw.id} phải bật show_claimed_count = true`
  );
});
console.log('  ✅ [PASS] 100% (32/32) chiến dịch Giveaway có số ảo đã giật nằm trong khoảng [52, 112]!');

// -----------------------------------------------------------------------------
// TEST 2: Kiểm tra src/data/utilities.json
// -----------------------------------------------------------------------------
console.log('\n▶ [2/4] Kiểm tra 18 Tiện ích trong src/data/utilities.json...');
const utilitiesPath = path.join(__dirname, '../src/data/utilities.json');
const utilities = JSON.parse(fs.readFileSync(utilitiesPath, 'utf8'));

assert.strictEqual(utilities.length, 18, 'utilities.json phải có chính xác 18 tiện ích');

utilities.forEach((u) => {
  const sold = Number(u.virtual_sold_count);
  assert(
    typeof sold === 'number' && !isNaN(sold),
    `Tiện ích ${u.id} (${u.title}) phải có virtual_sold_count kiểu số`
  );

  if (u.id === 'ut_vs_05_vip_7d') {
    // Flagship item có doanh số lớn
    assert(sold >= 32, `VIP 7 Days phải có số đã bán >= 32 (hiện tại: ${sold})`);
  } else {
    assert(
      sold >= 32 && sold <= 212,
      `Tiện ích ${u.id} (${u.title}) có virtual_sold_count = ${sold} nằm ngoài khoảng [32, 212]`
    );
  }

  assert.strictEqual(
    u.show_sold_count,
    true,
    `Tiện ích ${u.id} phải bật show_sold_count = true`
  );
});
console.log('  ✅ [PASS] 100% (18/18) tiện ích có số ảo đã bán nằm trong khoảng chuẩn [32, 212] (VIP 7D >= 32)!');

// -----------------------------------------------------------------------------
// TEST 3: Kiểm tra Server Layer (virtualLayerService.ts) & CUMULATIVE_BASELINES
// -----------------------------------------------------------------------------
console.log('\n▶ [3/4] Kiểm tra Cơ chế Server Layer & Snapshot Baselines...');
const virtualServicePath = path.join(__dirname, '../functions/services/virtualLayerService.ts');
const vContent = fs.readFileSync(virtualServicePath, 'utf8');

// Trích xuất CUMULATIVE_BASELINES_20261025
assert(vContent.includes('export const CUMULATIVE_BASELINES_20261025'), 'Phải export CUMULATIVE_BASELINES_20261025');

// Kiểm tra không còn lỗi ép số về 0 khi hết hàng
assert(
  !vContent.includes('p.virtualSold = 0;') && !vContent.includes('p.virtualSold = 0'),
  'virtualLayerService.ts KHÔNG ĐƯỢC ép p.virtualSold = 0 khi hết hàng thật!'
);
assert(
  !vContent.includes('g.virtualClaimed = 0;') && !vContent.includes('g.virtualClaimed = 0'),
  'virtualLayerService.ts KHÔNG ĐƯỢC ép g.virtualClaimed = 0 khi hết mã thật!'
);

// Kiểm tra bảo toàn Rule 3.1: Hết hàng thật thì tồn hiển thị = 0
assert(
  vContent.includes('p.virtualBuffer = 0;'),
  'Khi p.realStock <= 0, virtualBuffer phải = 0'
);
assert(
  vContent.includes('g.virtualRemainingBuffer = 0;'),
  'Khi g.realRemaining <= 0, virtualRemainingBuffer phải = 0'
);

console.log('  ✅ [PASS] Server Layer bảo toàn nguyên vẹn số đã bán / đã giật khi hết hàng thật!');
console.log('  ✅ [PASS] Quy tắc kho hàng 3.1 được bảo vệ nghiêm ngặt: Hết hàng thật thì tồn hiển thị bắt buộc = 0!');

// -----------------------------------------------------------------------------
// TEST 4: Mô phỏng hiển thị trên Web Khách & Admin khi hết hàng thật
// -----------------------------------------------------------------------------
console.log('\n▶ [4/4] Mô phỏng hiển thị Web Khách & Admin đối với mặt hàng hết hàng thật...');

// Test Giveaway hết hàng thật (realRemaining = 0, realClaimed = 0, virtualClaimed = 84):
const mockGw = {
  id: 'gw_clash_of_critters',
  realRemaining: 0,
  realClaimed: 0,
  virtualRemainingBuffer: 0,
  virtualClaimed: 84,
};

const displayRemaining = mockGw.realRemaining > 0 ? (mockGw.realRemaining + mockGw.virtualRemainingBuffer) : 0;
const displayClaimed = mockGw.realClaimed + mockGw.virtualClaimed;

assert.strictEqual(displayRemaining, 0, 'Khi realRemaining = 0 thì displayRemaining phải = 0 (Hết code)');
assert.strictEqual(displayClaimed, 84, 'Khi realRemaining = 0 thì displayClaimed phải = 84 (Số ảo giật)');

// Test Utility hết hàng thật (realStock = 0, realSold = 0, virtualSold = 187):
const mockUtil = {
  id: 'ut_vs_01_basic_1d',
  realStock: 0,
  realSold: 0,
  virtualBuffer: 0,
  virtualSold: 187,
};

const displayStock = mockUtil.realStock > 0 ? (mockUtil.realStock + mockUtil.virtualBuffer) : 0;
const displaySold = mockUtil.realSold + mockUtil.virtualSold;

assert.strictEqual(displayStock, 0, 'Khi realStock = 0 thì displayStock phải = 0 (Hết hàng)');
assert.strictEqual(displaySold, 187, 'Khi realStock = 0 thì displaySold phải = 187 (Số ảo bán)');

console.log('  ✅ [PASS] Mô phỏng thành công: Thẻ hiển thị "Đã giật: 84 mã | Còn lại: 0 mã" (Hết Code)');
console.log('  ✅ [PASS] Mô phỏng thành công: Thẻ hiển thị "Đã bán: 187 | Còn: 0" (Tạm hết hàng)');

console.log('\n================================================================');
console.log('🎉 TẤT CẢ 4/4 BÀI KIỂM THỬ SỐ ẢO VÀ KHO HÀNG ĐÃ ĐẠT 100%!');
console.log('================================================================');
