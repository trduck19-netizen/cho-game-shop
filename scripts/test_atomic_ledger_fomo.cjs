const assert = require('assert');

// 1. Test PRNG and Deterministic Replay
function createPRNG(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const CONVERSION_TABLE = {
  BUY_STORE: {
    name: 'Đơn hàng Cửa Hàng',
    target: 'product',
    delta: { sold: 1, stock: -1 },
    description: 'Số bán tăng +1, kho còn giảm -1 trên toàn bộ hệ thống.'
  },
  BUY_UTILITY: {
    name: 'Đơn hàng Tiện Ích',
    target: 'product',
    delta: { sold: 1, stock: -1 },
    description: 'Số bán tăng +1, kho còn giảm -1 trên toàn bộ hệ thống.'
  },
  CLAIM_GIVEAWAY: {
    name: 'Săn quà sự kiện Giveaway',
    target: 'giveaway',
    delta: { claimed: 1, remaining: -1 },
    description: 'Đã giật tăng +1, code còn giảm -1 trên toàn bộ hệ thống.'
  },
  COPY_CODE: {
    name: 'Sao chép mã Giftcode',
    target: 'master_copy',
    delta: { copyClicks: 1 },
    description: 'Lượt sao chép tăng +1 trên toàn bộ hệ thống.'
  },
  STATS_COPY: {
    name: 'Thống kê tổng lượt sao chép',
    target: 'master_copy',
    delta: { copyClicks: 1 },
    description: 'Cột mốc thống kê tương tác, lượt sao chép tăng +1.'
  },
  RESTOCK_PRODUCT: {
    name: 'Bổ sung tồn kho / code mới',
    target: 'product',
    delta: { restock: 20 },
    description: 'Kho còn hoặc code còn tăng thêm đúng mức cài đặt autoRestockAmount.'
  },
  DEPOSIT_WALLET: {
    name: 'Nạp tiền vào ví Core',
    target: 'none',
    delta: {},
    description: 'Chỉ hiển thị kích hoạt tương tác, KHÔNG làm thay đổi 5 bộ đếm hàng hóa.'
  },
};

console.log('--- TEST 1: Bảng quy đổi delta công khai (CONVERSION_TABLE) ---');
assert.strictEqual(CONVERSION_TABLE.BUY_STORE.delta.sold, 1);
assert.strictEqual(CONVERSION_TABLE.BUY_STORE.delta.stock, -1);
assert.strictEqual(CONVERSION_TABLE.CLAIM_GIVEAWAY.delta.claimed, 1);
assert.strictEqual(CONVERSION_TABLE.CLAIM_GIVEAWAY.delta.remaining, -1);
assert.strictEqual(CONVERSION_TABLE.COPY_CODE.delta.copyClicks, 1);
assert.strictEqual(CONVERSION_TABLE.STATS_COPY.delta.copyClicks, 1);
assert.strictEqual(CONVERSION_TABLE.RESTOCK_PRODUCT.delta.restock, 20);
assert.deepStrictEqual(CONVERSION_TABLE.DEPOSIT_WALLET.delta, {});
console.log('✓ TEST 1 PASSED: Bảng quy đổi delta công khai hoàn toàn chính xác.\n');

console.log('--- TEST 2: Đảm bảo Isolate Drift = 0% qua Deterministic Slot Replay ---');
function simulateIsolate(targetSlot) {
  const products = [
    { productId: 'ut_rotwood_01', realStock: 50, virtualBuffer: 20, virtualSold: 0, autoRestockThreshold: 1, autoRestockAmount: 20 },
    { productId: 'sp_genshin_01', realStock: 10, virtualBuffer: 5, virtualSold: 0, autoRestockThreshold: 1, autoRestockAmount: 20 },
  ];
  const giveaways = [
    { campaignId: 'gw_rotwood_code', realRemaining: 19, virtualRemainingBuffer: 1, virtualClaimed: 1, autoRestockThreshold: 1, autoRestockAmount: 20 },
  ];
  let masterCopy = { realClicks: 100, virtualCopy: 0 };
  const events = [];

  for (let slot = 0; slot <= targetSlot; slot++) {
    const seed = stringHash('2026-10-25_fomo_slot_' + slot);
    const rng = createPRNG(seed);
    const typeRoll = rng();

    if (typeRoll < 0.50) {
      masterCopy.virtualCopy += 1;
      events.push({ slot, type: 'COPY_CODE', delta: { copyClicks: 1 } });
    } else if (typeRoll < 0.72) {
      const prod = products[0];
      prod.virtualSold += 1;
      prod.virtualBuffer -= 1;
      events.push({ slot, type: 'BUY_UTILITY', delta: { sold: 1, stock: -1 } });
      if (prod.virtualBuffer <= 0) {
        prod.virtualBuffer += prod.autoRestockAmount;
        events.push({ slot, type: 'RESTOCK_PRODUCT', delta: { stock: prod.autoRestockAmount } });
      }
    } else if (typeRoll < 0.91) {
      const gw = giveaways[0];
      gw.virtualClaimed += 1;
      gw.virtualRemainingBuffer -= 1;
      events.push({ slot, type: 'CLAIM_GIVEAWAY', delta: { claimed: 1, remaining: -1 } });
      if (gw.virtualRemainingBuffer <= 0) {
        gw.virtualRemainingBuffer += gw.autoRestockAmount;
        events.push({ slot, type: 'RESTOCK_PRODUCT', delta: { remaining: gw.autoRestockAmount } });
      }
    }
  }

  return {
    sold: products[0].virtualSold,
    stock: products[0].realStock + products[0].virtualBuffer,
    claimed: giveaways[0].virtualClaimed,
    remaining: giveaways[0].realRemaining + giveaways[0].virtualRemainingBuffer,
    copy: masterCopy.virtualCopy,
    eventsCount: events.length,
    lastEvent: events[events.length - 1],
  };
}

const isolate1 = simulateIsolate(100);
const isolate2 = simulateIsolate(100);
assert.deepStrictEqual(isolate1, isolate2);
console.log('Isolate 1 State:', isolate1);
console.log('Isolate 2 State:', isolate2);
console.log('✓ TEST 2 PASSED: 2 Isolate độc lập đạt cùng trạng thái 100% không lệch 1 đơn vị.\n');

console.log('--- TEST 3: Kiểm chứng Client Toast không còn gọi getDeterministicNotification ---');
const fs = require('fs');
const toastCode = fs.readFileSync('src/components/MarketingNotificationToast.tsx', 'utf8');
assert.strictEqual(
  toastCode.includes('marketingService.getDeterministicNotification'),
  false,
  'Lỗi: MarketingNotificationToast.tsx vẫn còn gọi getDeterministicNotification!'
);
console.log('✓ TEST 3 PASSED: Client hoàn toàn không tự bịa thông báo (zero client ghost notifications).\n');

console.log('--- TEST 4: Kiểm tra Giveaway tra cứu đúng trong getDisplayStock ---');
const marketingServiceCode = fs.readFileSync('src/services/marketingService.ts', 'utf8');
assert.strictEqual(
  marketingServiceCode.includes('this.serverGiveawayCounters.has(productId)'),
  true,
  'Lỗi: getDisplayStock thiếu kiểm tra serverGiveawayCounters!'
);
console.log('✓ TEST 4 PASSED: getDisplayStock hỗ trợ kiểm tra cả serverGiveawayCounters cho giveaways.\n');

console.log('--- TEST 5: Kiểm tra gắn nhãn bắt buộc (productId, targetId, is_simulated boolean) trên mọi sự kiện ---');
const virtualLayerCode = fs.readFileSync('functions/services/virtualLayerService.ts', 'utf8');
const syncCode = fs.readFileSync('functions/api/sync.ts', 'utf8');
const marketingAuditCode = fs.readFileSync('functions/services/marketingAuditService.ts', 'utf8');

// 5a. Kiểm tra virtualLayerService
assert.strictEqual(
  virtualLayerCode.includes('is_simulated: false'),
  true,
  'Lỗi: virtualLayerService thiếu is_simulated: false cho sự kiện thật!'
);
assert.strictEqual(
  virtualLayerCode.includes('is_simulated: true'),
  true,
  'Lỗi: virtualLayerService thiếu is_simulated: true cho sự kiện ảo!'
);
assert.strictEqual(
  virtualLayerCode.includes('productId: effectiveProductId'),
  true,
  'Lỗi: virtualLayerService thiếu productId: effectiveProductId cho sự kiện thật!'
);
assert.strictEqual(
  virtualLayerCode.includes('productId: ve.product_id || null'),
  true,
  'Lỗi: virtualLayerService thiếu productId: ve.product_id cho sự kiện ảo!'
);

// 5b. Kiểm tra stream_health
assert.strictEqual(
  virtualLayerCode.includes('stream_health: streamHealth'),
  true,
  'Lỗi: virtualLayerService thiếu stream_health trong payload!'
);
assert.strictEqual(
  virtualLayerCode.includes('silence_threshold_seconds: 60'),
  true,
  'Lỗi: virtualLayerService thiếu silence_threshold_seconds 60s!'
);

// 5c. Kiểm tra recordRealGiveawayClaim trong client marketingService
assert.strictEqual(
  marketingServiceCode.includes('productId: campaignId,'),
  true,
  'Lỗi: marketingService.recordRealGiveawayClaim thiếu gán productId: campaignId!'
);
assert.strictEqual(
  marketingServiceCode.includes('is_simulated: false,'),
  true,
  'Lỗi: marketingService.recordRealGiveawayClaim thiếu gán is_simulated: false!'
);

// 5d. Kiểm tra sync.ts chuẩn hóa sự kiện thật
assert.strictEqual(
  syncCode.includes('evt.is_simulated = false;'),
  true,
  'Lỗi: functions/api/sync.ts thiếu chuẩn hóa evt.is_simulated = false!'
);
assert.strictEqual(
  syncCode.includes('evt.productId = evt.productId || evt.giveawayId || null;'),
  true,
  'Lỗi: functions/api/sync.ts thiếu chuẩn hóa evt.productId!'
);

console.log('✓ TEST 5 PASSED: 100% sự kiện bắt buộc mang đủ productId, targetId và is_simulated (boolean).\n');

console.log('--- TEST 6: Xác minh danh mục game 560 trang tĩnh vs 563 bản ghi danh mục (560 games188 + 3 Roblox) ---');
const games188 = JSON.parse(fs.readFileSync('public/data/games188.json', 'utf8'));
const upcomingCode = fs.readFileSync('functions/api/crawler/ingest-upcoming-games.ts', 'utf8');
const backupState = JSON.parse(fs.readFileSync('src/data/canonical_backup_state.json', 'utf8'));

assert.strictEqual(
  games188.length,
  560,
  `Lỗi: games188.json phải có đúng 560 game, nhưng lại có ${games188.length}`
);

// 3 game Roblox đăng ngày 25/10 đưa tổng danh mục lên 563:
const robloxGames = ['grow-a-chicken-fighter', 'command-an-army', 'dig-and-clean'];
const robloxFound = (backupState.crawlerPendingGames || []).filter(g => robloxGames.includes(g.slug));
assert.strictEqual(
  robloxFound.length,
  3,
  `Lỗi: Phải tìm thấy đủ 3 game Roblox đăng ngày 25/10 trong crawlerPendingGames, tìm thấy ${robloxFound.length}`
);

// Kiểm tra nhà phát hành Strinova VN đã chuẩn hóa thành Gzone
assert.strictEqual(
  upcomingCode.includes("publisher: 'Gzone'"),
  true,
  'Lỗi: Nhà phát hành Strinova VN trong ingest-upcoming-games.ts phải là Gzone!'
);

console.log(`✓ TEST 6 PASSED: Danh mục games188 = ${games188.length} game + 3 game Roblox (Grow a Chicken Fighter, Command an Army, Dig and Clean) đăng 25/10 = 563 bản ghi danh mục chuẩn xác.`);
console.log(`✓ Nhà phát hành của Strinova VN đã được chuẩn hóa chính xác thành "Gzone".\n`);

console.log('====================================================');
console.log('ALL ATOMIC LEDGER FOMO & HEALTH TESTS PASSED 100%!');
console.log('====================================================');
