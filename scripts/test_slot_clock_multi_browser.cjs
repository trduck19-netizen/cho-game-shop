// scripts/test_slot_clock_multi_browser.cjs
// Kiểm chứng hành vi hiển thị theo đồng hồ khe (10s), hỏi theo khe & loại bỏ replay ngẫu nhiên trên đa trình duyệt

const assert = require('assert');

console.log('=== BẮT ĐẦU KIỂM THỬ: ĐỒNG HỒ KHE 10 GIÂY & HỎI DỮ LIỆU THEO KHE (SLOT CLOCK ENGINE) ===');

const SLOT_DURATION_MS = 10000; // Nhịp khe 10 giây cố định toàn hệ thống
const DISPLAY_DURATION_MS = 4000; // Thời lượng hiển thị tối đa 4 giây (nhỏ hơn nhịp khe 10s)

function getVnDayAnchor(nowMs) {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnNow = new Date(nowMs + VN_OFFSET_MS);
  const vnMidnightUtc = Date.UTC(
    vnNow.getUTCFullYear(),
    vnNow.getUTCMonth(),
    vnNow.getUTCDate(),
    0, 0, 0, 0
  );
  return vnMidnightUtc - VN_OFFSET_MS;
}

function extractSlotIndex(evt, dayStartMs) {
  if (evt.id) {
    const m = evt.id.match(/(?:sim_slot|slot_\w+)_(\d+)/);
    if (m) {
      return parseInt(m[1], 10);
    }
  }
  if (evt.timestamp) {
    return Math.floor((evt.timestamp - dayStartMs) / SLOT_DURATION_MS);
  }
  return null;
}

class SimulatedBrowserClient {
  constructor(name, clockSkewMs = 0) {
    this.name = name;
    this.clockSkewMs = clockSkewMs;
    this.slotEventsMap = new Map();
    this.realEventsQueue = [];
    this.lastDisplayedSlot = -1;
    this.displayedHistory = [];
    this.pollCount = 0;
  }

  // Bộ hỏi dữ liệu đồng bộ theo nhịp khe: hỏi vào giây 0.65 của khe
  pollFromHub(serverEvents, currentServerTime) {
    this.pollCount++;
    const dayStartMs = getVnDayAnchor(currentServerTime);
    for (const evt of serverEvents) {
      const slotIdx = extractSlotIndex(evt, dayStartMs);
      if (slotIdx !== null) {
        this.slotEventsMap.set(slotIdx, evt);
      }
    }
  }

  getCurrentSlotEvent(slotIndex) {
    return this.slotEventsMap.get(slotIndex) || null;
  }

  // Giả lập vòng tick hiển thị (như hàm scheduleDeterministicSlot trong Toast)
  tick(currentTimeMs) {
    const calibratedNow = currentTimeMs + this.clockSkewMs;
    const dayStartMs = getVnDayAnchor(calibratedNow);
    const currentSlotIndex = Math.floor((calibratedNow - dayStartMs) / SLOT_DURATION_MS);
    const slotStartMs = dayStartMs + currentSlotIndex * SLOT_DURATION_MS;
    const slotFireTimeMs = slotStartMs + 1500; // Giây 1.5 của khe 10s
    const slotHideTimeMs = slotFireTimeMs + DISPLAY_DURATION_MS; // Giây 5.5 của khe 10s

    // Ưu tiên 1: Real event
    if (this.realEventsQueue.length > 0) {
      const realEvt = this.realEventsQueue.shift();
      this.displayedHistory.push({ type: 'real', event: realEvt, time: calibratedNow });
      return { action: 'show_real', event: realEvt };
    }

    // Ưu tiên 2: Sự kiện theo khe
    if (this.lastDisplayedSlot === currentSlotIndex) {
      return { action: 'already_shown_this_slot', slotIndex: currentSlotIndex };
    }

    if (calibratedNow < slotFireTimeMs) {
      return { action: 'wait_until_fire_time', waitMs: slotFireTimeMs - calibratedNow };
    }

    // Cửa sổ hiển thị hợp lệ: từ giây 1.5 đến giây 7.0 của khe (slotHideTimeMs + 1500)
    if (calibratedNow >= slotFireTimeMs && calibratedNow < slotHideTimeMs + 1500) {
      const slotEvt = this.getCurrentSlotEvent(currentSlotIndex);
      if (!slotEvt) {
        return { action: 'no_slot_event_and_no_replay' };
      }
      this.lastDisplayedSlot = currentSlotIndex;
      this.displayedHistory.push({ type: 'slot', slotIndex: currentSlotIndex, event: slotEvt, time: calibratedNow });
      return { action: 'show_slot', slotIndex: currentSlotIndex, event: slotEvt };
    }

    // Quá cửa sổ khe (> 7s) -> Bỏ qua an toàn, không nổ trễ
    this.lastDisplayedSlot = currentSlotIndex;
    return { action: 'skip_expired_slot', slotIndex: currentSlotIndex };
  }
}

// BẮT ĐẦU CÁC BÀI TEST

// Test 1: Mô phỏng 2 trình duyệt chạy đồng thời 5 phút (30 khe 10 giây)
console.log('\n--- Test 1: Nghiệm thu 2 trình duyệt chạy 5 phút (30 khe 10s = 300 giây) ---');
const baseTime = 1792913000000;
const dayStart = getVnDayAnchor(baseTime);
const startSlot = Math.floor((baseTime - dayStart) / SLOT_DURATION_MS);

// Giả lập 30 sự kiện cho 30 khe liên tiếp trên máy chủ
const serverSlotsEvents = [];
for (let s = 0; s < 30; s++) {
  const slotIdx = startSlot + s;
  serverSlotsEvents.push({
    id: `sim_slot_${slotIdx}`,
    message: `Thông báo khe #${slotIdx}`,
    type: s % 2 === 0 ? 'BUY_STORE' : 'CLAIM_GIVEAWAY',
    timestamp: dayStart + slotIdx * SLOT_DURATION_MS + 500,
  });
}

const clientA = new SimulatedBrowserClient('Chrome Client', 0);
const clientB = new SimulatedBrowserClient('Safari Client', 150); // Lệch 150ms do đồng hồ

// Chạy mô phỏng 30 khe (mỗi khe 10s = 10000ms)
for (let s = 0; s < 30; s++) {
  const slotIdx = startSlot + s;
  const currentSlotStart = dayStart + slotIdx * SLOT_DURATION_MS;

  // Hỏi dữ liệu ở giây 0.65 của khe
  const pollTime = currentSlotStart + 650;
  clientA.pollFromHub(serverSlotsEvents, pollTime);
  clientB.pollFromHub(serverSlotsEvents, pollTime + 50); // Hỏi lệch 50ms

  // Kích hoạt tick ở giây 1.5 của khe
  const fireTime = currentSlotStart + 1500;
  const resA = clientA.tick(fireTime);
  const resB = clientB.tick(fireTime);

  assert.strictEqual(resA.action, 'show_slot', `Client A phải hiển thị ở khe ${slotIdx}`);
  assert.strictEqual(resB.action, 'show_slot', `Client B phải hiển thị ở khe ${slotIdx}`);
  assert.strictEqual(resA.event.id, resB.event.id, `Cả 2 client phải có cùng id ở khe ${slotIdx}`);
}

assert.strictEqual(clientA.displayedHistory.length, 30, 'Client A phải hiển thị đúng 30 thông báo trong 5 phút');
assert.strictEqual(clientB.displayedHistory.length, 30, 'Client B phải hiển thị đúng 30 thông báo trong 5 phút');
assert.strictEqual(clientA.pollCount, 30, 'Tần suất hỏi đúng 1 lần/khe (30 lần / 5 phút = 6 lần / phút)');
console.log(`[PASS] Test 1: Hai trình duyệt hiển thị chính xác 30/30 thông báo trong 5 phút (${clientA.displayedHistory.length} thông báo / 30 khe), cùng khe cùng một thông báo 100%!`);

// Test 2: Bỏ hoàn toàn replay_ khi khe rỗng
console.log('\n--- Test 2: Tuyệt đối không phát lại ngẫu nhiên (Zero replay_) ---');
const clientEmpty = new SimulatedBrowserClient('Empty Client', 0);
// Nhận sự kiện cũ không có khe hiện tại
clientEmpty.pollFromHub([
  { id: `sim_slot_${startSlot - 5}`, message: 'Sự kiện cũ', type: 'BUY_STORE', timestamp: dayStart + (startSlot - 5) * SLOT_DURATION_MS }
], dayStart + startSlot * SLOT_DURATION_MS + 650);

const resEmpty = clientEmpty.tick(dayStart + startSlot * SLOT_DURATION_MS + 1500);
assert.strictEqual(resEmpty.action, 'no_slot_event_and_no_replay', 'Không được sinh replay khi khe rỗng');
assert.strictEqual(clientEmpty.displayedHistory.length, 0, 'Lịch sử hiển thị phải trống 100%');
console.log('[PASS] Test 2: Không sinh bất kỳ id replay_ nào khi khe rỗng!');

// Test 3: Trình duyệt mới mở & Tab ẩn không xả lại sự kiện cũ trong quá khứ
console.log('\n--- Test 3: Trình duyệt mới mở không xả lại sự kiện cũ trong quá khứ ---');
const clientNew = new SimulatedBrowserClient('New Tab Client', 0);
clientNew.pollFromHub(serverSlotsEvents, dayStart + (startSlot + 10) * SLOT_DURATION_MS + 650);

const resNew = clientNew.tick(dayStart + (startSlot + 10) * SLOT_DURATION_MS + 1500);
assert.strictEqual(resNew.action, 'show_slot');
assert.strictEqual(resNew.slotIndex, startSlot + 10);
assert.strictEqual(clientNew.displayedHistory.length, 1, 'Chỉ hiển thị đúng 1 sự kiện của khe hiện tại');
console.log('[PASS] Test 3: Trình duyệt mới mở bắt đầu ngay từ khe hiện tại, không xả lại các khe cũ!');

// Test 4: Thời lượng hiển thị (4s) nhỏ hơn nhịp khe (10s) - Chống chồng chéo
console.log('\n--- Test 4: Thời lượng hiển thị 4s < Nhịp khe 10s (Chống chồng chéo) ---');
assert.strictEqual(DISPLAY_DURATION_MS < SLOT_DURATION_MS, true);
const quietWindowMs = SLOT_DURATION_MS - (1500 + DISPLAY_DURATION_MS);
assert.strictEqual(quietWindowMs, 4500, 'Khoảng lặng tự nhiên giữa 2 thông báo là 4.5s');
console.log(`[PASS] Test 4: Thời lượng hiển thị ${DISPLAY_DURATION_MS}ms < Nhịp khe ${SLOT_DURATION_MS}ms. Khoảng nghỉ tự nhiên: ${quietWindowMs}ms.`);

// Test 5: Ưu tiên sự kiện thật ngay lập tức
console.log('\n--- Test 5: Sự kiện thật được ưu tiên hiển thị ngay lập tức (vượt khe) ---');
const clientReal = new SimulatedBrowserClient('Real User', 0);
clientReal.realEventsQueue.push({ id: 'real_order_999', message: 'Bạn vừa mua thành công!', type: 'BUY_PRODUCT' });
const resReal = clientReal.tick(baseTime);
assert.strictEqual(resReal.action, 'show_real');
assert.strictEqual(resReal.event.id, 'real_order_999');
console.log('[PASS] Test 5: Sự kiện thật hiển thị tức thời!');

console.log('\n=== TẤT CẢ 5 BÀI TEST ĐỒNG HỒ KHE 10 GIÂY ĐÃ VƯỢT QUA 100% ===\n');
