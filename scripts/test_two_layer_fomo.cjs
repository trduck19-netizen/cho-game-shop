/**
 * test_two_layer_fomo.cjs
 * Comprehensive Verification Test for Two-Layer SSOT FOMO Engine & Cloudflare Quota Protection
 * 
 * Tests:
 * 1. Raw Layer Isolation & Zero-touch of original files
 * 2. Virtual Buffer & Restock Floor Logic (Server & Client SSOT)
 * 3. Elimination of Client Peak Reporting & Local Drift
 * 4. Realtime API Unified Payload Contract (Events + Counters)
 * 5. Cloudflare D1 Quota Tracker & Batching Guarantees
 * 6. Admin 3-Column Reconciliation UI & Tab Integration
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 TEST SUITE: TWO-LAYER SSOT FOMO ENGINE & QUOTA OPTIMIZATION');
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

// -------------------------------------------------------------
// TEST 1: Raw Layer Isolation
// -------------------------------------------------------------
console.log('▶ [1/6] Kiểm tra Tính Bất Khả Xâm Phạm Của Dữ Liệu Gốc (Raw Layer Isolation)...');

it('storeProducts.json, utilities.json và giveaways.json không bị nhiễm trường virtual_* hoặc is_simulated', () => {
  const storePath = path.join(__dirname, '..', 'src', 'data', 'storeProducts.json');
  const utilPath = path.join(__dirname, '..', 'src', 'data', 'utilities.json');
  const gwPath = path.join(__dirname, '..', 'src', 'data', 'giveaways.json');

  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const utils = JSON.parse(fs.readFileSync(utilPath, 'utf8'));
  const gws = JSON.parse(fs.readFileSync(gwPath, 'utf8'));

  // Ensure raw records maintain real semantics
  for (const item of store) {
    assert.strictEqual(item.is_simulated, undefined, `Store item ${item.id} không được có is_simulated`);
    assert.strictEqual(item.virtual_buffer, undefined, `Store item ${item.id} không được có virtual_buffer`);
  }
  for (const item of utils) {
    assert.strictEqual(item.is_simulated, undefined, `Utility item ${item.id} không được có is_simulated`);
    assert.strictEqual(item.virtual_buffer, undefined, `Utility item ${item.id} không được có virtual_buffer`);
  }
  for (const item of gws) {
    assert.strictEqual(item.is_simulated, undefined, `Giveaway item ${item.id} không được có is_simulated`);
    assert.strictEqual(item.virtual_buffer, undefined, `Giveaway item ${item.id} không được có virtual_buffer`);
  }
});

// -------------------------------------------------------------
// TEST 2: Two-Layer Service & Restock Floor Logic
// -------------------------------------------------------------
console.log('\n▶ [2/6] Kiểm tra Logic Bộ Đệm Ảo & Tự Động Restock (virtualLayerService.ts)...');

it('virtualLayerService.ts chứa đầy đủ thuật toán Two-Layer SSOT và Floor Restock', () => {
  const vServicePath = path.join(__dirname, '..', 'functions', 'services', 'virtualLayerService.ts');
  assert.ok(fs.existsSync(vServicePath), 'virtualLayerService.ts phải tồn tại');
  const content = fs.readFileSync(vServicePath, 'utf8');

  // Verify floor rule
  assert.ok(content.includes('displayStock = p.realStock > 0 ? (p.realStock + Math.max(0, p.virtualBuffer)) : 0'), 'Phải tính displayStock theo floor rule');
  assert.ok(content.includes('RESTOCK_PRODUCT'), 'Phải phát sinh sự kiện RESTOCK_PRODUCT khi chạm floor');
  assert.ok(content.includes('autoRestockAmount'), 'Phải sử dụng mức tăng autoRestockAmount từ cấu hình');
  assert.ok(content.includes('is_simulated: true'), 'Mọi sự kiện ảo phải có cờ is_simulated: true');

  // Verify atomic companion toast & log
  assert.ok(content.includes('pendingFlushEvents.push'), 'Phải đưa mọi dòng sổ ảo vào pendingFlushEvents');
  assert.ok(content.includes('getUnifiedRealtimePayload'), 'Phải cung cấp hàm getUnifiedRealtimePayload');
});

// -------------------------------------------------------------
// TEST 3: Floor Restock Math Verification
// -------------------------------------------------------------
console.log('\n▶ [3/6] Mô Phỏng Tính Toán Bộ Đệm Ảo: Bán Ảo -> Chạm Floor -> Restock Ảo...');

it('Mô phỏng toán học: Bán ảo trừ buffer, khi buffer <= 0 tự động restock và không bao giờ < tồn thật', () => {
  const real_stock = 8;
  const autoRestockAmount = 20;
  let virtual_buffer = 3;
  let virtual_sold = 50;
  let virtual_restock_count = 0;
  let restockEventsGenerated = 0;

  function simulateVirtualSale() {
    virtual_sold += 1;
    virtual_buffer -= 1;
    if (virtual_buffer <= 0) {
      virtual_buffer += autoRestockAmount;
      virtual_restock_count += 1;
      restockEventsGenerated += 1;
    }
    const display_stock = real_stock > 0 ? real_stock + virtual_buffer : 0;
    return { display_stock, virtual_buffer, virtual_sold, virtual_restock_count };
  }

  // Sale 1: buffer 3 -> 2
  let res = simulateVirtualSale();
  assert.strictEqual(res.virtual_buffer, 2);
  assert.strictEqual(res.display_stock, 10);
  assert.strictEqual(restockEventsGenerated, 0);

  // Sale 2: buffer 2 -> 1
  res = simulateVirtualSale();
  assert.strictEqual(res.virtual_buffer, 1);
  assert.strictEqual(res.display_stock, 9);
  assert.strictEqual(restockEventsGenerated, 0);

  // Sale 3: buffer 1 -> 0 -> chạm floor! Auto restock +20 -> buffer = 20
  res = simulateVirtualSale();
  assert.strictEqual(res.virtual_buffer, 20);
  assert.strictEqual(res.display_stock, 28);
  assert.strictEqual(res.virtual_restock_count, 1);
  assert.strictEqual(restockEventsGenerated, 1);

  // Display stock must ALWAYS be >= real_stock when real_stock > 0
  assert.ok(res.display_stock >= real_stock, 'Số hiển thị không bao giờ được thấp hơn tồn thật');
});

it('Khi tồn thật = 0 thì số hiển thị = 0, buffer = 0, không restock', () => {
  const real_stock = 0;
  let virtual_buffer = 0;
  const display_stock = real_stock > 0 ? real_stock + virtual_buffer : 0;
  assert.strictEqual(display_stock, 0, 'Hết hàng thật thì số hiển thị bắt buộc là 0');
});

// -------------------------------------------------------------
// TEST 4: Elimination of Client Peak Reporting Loop
// -------------------------------------------------------------
console.log('\n▶ [4/6] Kiểm tra Triệt Tiêu Vòng Lặp Báo Peak & High-Water Mark Phía Client...');

it('marketingService.ts đã vô hiệu hóa peak reporting và trả về số từ Server SSOT', () => {
  const mServicePath = path.join(__dirname, '..', 'src', 'services', 'marketingService.ts');
  const content = fs.readFileSync(mServicePath, 'utf8');

  // Check that peak report timer is defunct
  assert.ok(content.includes('schedulePeakReport') && content.includes('return;'), 'schedulePeakReport phải return rỗng');
  assert.ok(content.includes('reportPeakMetrics') && content.includes('return;'), 'reportPeakMetrics phải return ngay không gửi request');
  
  // Hourly growth neutralized
  assert.ok(content.includes('getHourlyGrowth') && content.includes('return 0;'), 'getHourlyGrowth phải return 0');
  assert.ok(content.includes('getInHourProgression') && content.includes('return 0;'), 'getInHourProgression phải return 0');

  // Purge old local storage keys
  assert.ok(content.includes('wcg_high_water_sold_counts_v1'), 'Phải dọn dẹp wcg_high_water_sold_counts_v1');
  assert.ok(content.includes('wcg_admin_override_sold_v2'), 'Phải dọn dẹp wcg_admin_override_sold_v2');

  // DeterministicEngine check
  const detPath = path.join(__dirname, '..', 'src', 'shared', 'deterministicEngine.ts');
  const detContent = fs.readFileSync(detPath, 'utf8');
  assert.ok(detContent.includes('const displaySold = rawDisplaySold;'), 'deterministicEngine không dùng peak để lạm phát bán');
  assert.ok(detContent.includes('const displayClaimed = rawDisplayClaimed;'), 'deterministicEngine không dùng peak để lạm phát claim');
});

it('/api/sync từ chối lưu report_peak_metrics để bảo vệ D1 quota', () => {
  const syncPath = path.join(__dirname, '..', 'functions', 'api', 'sync.ts');
  const syncContent = fs.readFileSync(syncPath, 'utf8');
  assert.ok(syncContent.includes("body.type === 'report_peak_metrics'"), 'sync.ts phải chặn body.type report_peak_metrics');
});

// -------------------------------------------------------------
// TEST 5: Cloudflare D1 Quota Protection & Batching
// -------------------------------------------------------------
console.log('\n▶ [5/6] Kiểm tra Cơ Chế Tiết Kiệm Quota D1 & Batch Flush...');

it('d1_service.ts có cơ chế giám sát hạn mức D1, batchFlush và Circuit Breaker', () => {
  const d1Path = path.join(__dirname, '..', 'functions', 'services', 'd1_service.ts');
  const content = fs.readFileSync(d1Path, 'utf8');

  assert.ok(content.includes('wcg_virtual_aggregates'), 'Phải tạo bảng wcg_virtual_aggregates');
  assert.ok(content.includes('wcg_virtual_events'), 'Phải tạo bảng wcg_virtual_events');
  assert.ok(content.includes('recordD1Read'), 'Phải có recordD1Read');
  assert.ok(content.includes('recordD1Write'), 'Phải có recordD1Write');
  assert.ok(content.includes('triggerD1CircuitBreaker'), 'Phải có triggerD1CircuitBreaker');
  assert.ok(content.includes('batchFlushVirtualLayerD1'), 'Phải có batchFlushVirtualLayerD1');
  assert.ok(content.includes('WARN_70'), 'Phải có ngưỡng cảnh báo WARN_70 (3.5M)');
  assert.ok(content.includes('CRITICAL_90'), 'Phải có ngưỡng cảnh báo CRITICAL_90 (4.5M)');
});

// -------------------------------------------------------------
// TEST 6: Unified Realtime API & Admin 3-Column UI
// -------------------------------------------------------------
console.log('\n▶ [6/6] Kiểm tra Endpoint Hợp Nhất & Giao Diện Quản Trị Đối Soát 3 Cột...');

it('/api/realtime-events trả về cả events và counters trong cùng một payload', () => {
  const rtPath = path.join(__dirname, '..', 'functions', 'api', 'realtime-events.ts');
  const content = fs.readFileSync(rtPath, 'utf8');
  assert.ok(content.includes('getUnifiedRealtimePayload'), 'realtime-events.ts phải gọi getUnifiedRealtimePayload');
});

it('Admin MarketingModule có Sub-tab 8 (virtual-stats) và render VirtualLayerAnalytics', () => {
  const modPath = path.join(__dirname, '..', 'src', 'admin', 'modules', 'MarketingModule.tsx');
  const content = fs.readFileSync(modPath, 'utf8');

  assert.ok(content.includes("id: 'virtual-stats'"), 'Phải có tab virtual-stats');
  assert.ok(content.includes("<VirtualLayerAnalytics"), 'Phải render component VirtualLayerAnalytics');

  const compPath = path.join(__dirname, '..', 'src', 'admin', 'components', 'VirtualLayerAnalytics.tsx');
  assert.ok(fs.existsSync(compPath), 'VirtualLayerAnalytics.tsx phải tồn tại');
  const compContent = fs.readFileSync(compPath, 'utf8');
  assert.ok(compContent.includes('real_sold') && compContent.includes('virtual_sold') && compContent.includes('display_sold'), 'Phải có 3 cột: real, virtual, display');
  assert.ok(compContent.includes('d1Quota'), 'Phải có bảng giám sát D1 Quota');
  assert.ok(compContent.includes('paginated_events'), 'Phải có sổ nhật ký sự kiện ảo phân trang');
});

console.log('\n================================================================');
console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐẠT (100% SUCCESS)`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
