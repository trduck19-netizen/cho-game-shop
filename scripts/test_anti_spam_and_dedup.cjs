// scripts/test_anti_spam_and_dedup.cjs
// Kiểm chứng toàn diện: Chống spam sao chép 20s & Chống lặp thông báo 100% trên cùng trình duyệt

const assert = require('assert');

console.log('=== BẮT ĐẦU KIỂM THỬ: CHỐNG SPAM SAO CHÉP 20S & CHỐNG LẶP SỰ KIỆN ===');

const COPY_COOLDOWN_MS = 20000; // 20s copy cooldown per user

// 1. Giả lập cơ chế quản lý cooldown và chống lặp
class AntiSpamAndDedupEngine {
  constructor(name) {
    this.name = name;
    this.processedNotifIds = new Set();
    this.userActionCooldownMap = new Map();
    this.lastDisplayedSlot = -1;
    this.displayedNotifications = [];
    this.masterCopyCounter = 0;
  }

  canDisplayActionNotification(maskedUserName, actionType = 'COPY_CODE', nowMs) {
    if (actionType !== 'COPY_CODE') return true;
    const safeUser = (maskedUserName || 'Khách').trim();
    const key = `${safeUser}_${actionType}`;
    const lastTime = this.userActionCooldownMap.get(key) || 0;
    if (nowMs - lastTime < COPY_COOLDOWN_MS) {
      return false; // Đang trong 20s cooldown -> Chặn
    }
    return true;
  }

  recordActionNotificationDisplayed(maskedUserName, actionType = 'COPY_CODE', nowMs) {
    const safeUser = (maskedUserName || 'Khách').trim();
    const key = `${safeUser}_${actionType}`;
    this.userActionCooldownMap.set(key, nowMs);
  }

  isNotificationProcessed(notifId) {
    if (!notifId) return false;
    return this.processedNotifIds.has(notifId);
  }

  markNotificationProcessed(notifId, slotIndex) {
    if (!notifId) return;
    this.processedNotifIds.add(notifId);
    if (typeof slotIndex === 'number') {
      this.lastDisplayedSlot = slotIndex;
    }
  }

  // Thao tác sao chép thật của người dùng
  recordRealCopy(userName, count = 1, nowMs) {
    // 1. Luôn tăng bộ đếm đủ 100%
    this.masterCopyCounter += count;

    // 2. Chống spam thông báo toast: kiểm tra cooldown 20s
    const shouldShowToast = this.canDisplayActionNotification(userName, 'COPY_CODE', nowMs);
    let event = null;
    let shown = false;
    if (shouldShowToast) {
      event = {
        id: `copy_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'COPY_CODE',
        userName,
        message: `${userName} vừa sao chép ${count} mã code`,
      };
      shown = this.displayNotification(event, nowMs);
    }
    return { countAdded: count, toastShown: shown, event };
  }

  // Hiển thị thông báo (qua mọi đường: Real Event, Slot Event, Đẩy trực tiếp)
  displayNotification(notif, nowMs, slotIndex) {
    if (!notif || !notif.id) return false;

    // Yêu cầu 2: Không bao giờ hiển thị 2 lần cùng một ID
    if (this.isNotificationProcessed(notif.id)) {
      return false;
    }

    // Yêu cầu 1: Chống spam 20s cho COPY_CODE qua MỌI ĐƯỜNG
    if (notif.type === 'COPY_CODE') {
      if (!this.canDisplayActionNotification(notif.userName, 'COPY_CODE', nowMs)) {
        return false;
      }
      this.recordActionNotificationDisplayed(notif.userName, 'COPY_CODE', nowMs);
    }

    this.markNotificationProcessed(notif.id, slotIndex);
    this.displayedNotifications.push({ ...notif, displayedAt: nowMs, slotIndex });
    return true;
  }
}

// BẮT ĐẦU CHẠY CÁC BÀI TEST

// Test 1: 1 người dùng sao chép 10 lần trong 20s -> chỉ 1 thông báo, bộ đếm +10
console.log('\n--- Test 1: 1 Người dùng sao chép 10 lần trong 20s ---');
const engine1 = new AntiSpamAndDedupEngine('Tab 1');
const startTime = 1792913000000;
let totalToastShown = 0;

for (let i = 0; i < 10; i++) {
  // Mỗi lần cách nhau 1.5 giây (tổng cộng 13.5s < 20s)
  const currentTime = startTime + i * 1500;
  const res = engine1.recordRealCopy('Tuấn *88', 1, currentTime);
  if (res.toastShown) totalToastShown++;
}

assert.strictEqual(engine1.masterCopyCounter, 10, 'Bộ đếm phải đếm đủ 10 lần sao chép (+10)!');
assert.strictEqual(totalToastShown, 1, 'Chỉ được hiển thị đúng 1 thông báo toast trong 20 giây!');
assert.strictEqual(engine1.displayedNotifications.length, 1, 'Danh sách đã hiển thị chỉ có đúng 1 thông báo!');
console.log(`[PASS] Test 1: Sao chép 10 lần trong 20s -> Bộ đếm = ${engine1.masterCopyCounter} (+10 đủ), Thông báo hiển thị = ${totalToastShown} (duy nhất 1 lần)!`);

// Test 2: Hết 20s, lần sao chép thứ 11 lại nổ thông báo bình thường
console.log('\n--- Test 2: Sau 20s (giây thứ 21), lần sao chép tiếp theo hiển thị bình thường ---');
const afterCooldownTime = startTime + 21000; // 21s sau lần đầu
const res11 = engine1.recordRealCopy('Tuấn *88', 1, afterCooldownTime);
assert.strictEqual(res11.toastShown, true, 'Sau 20s, người dùng Tuấn *88 phải được hiển thị thông báo mới');
assert.strictEqual(engine1.masterCopyCounter, 11, 'Bộ đếm tăng lên 11');
assert.strictEqual(engine1.displayedNotifications.length, 2, 'Tổng số thông báo hiển thị là 2');
console.log('[PASS] Test 2: Sau 20s cooldown, thông báo sao chép nổ lại bình thường!');

// Test 3: Không chặn nhầm: 2 người dùng khác nhau sao chép trong cùng 20s -> Mỗi người có thông báo riêng
console.log('\n--- Test 3: Hai người dùng khác nhau sao chép trong cùng 20s (Không chặn nhầm) ---');
const engine2 = new AntiSpamAndDedupEngine('Multi-User Engine');
const t0 = 1792913000000;
const resUserA = engine2.recordRealCopy('Huy *99', 1, t0 + 1000);
const resUserB = engine2.recordRealCopy('Lan *12', 1, t0 + 3000); // Người khác, sau 2s

assert.strictEqual(resUserA.toastShown, true, 'Người dùng A hiển thị thông báo');
assert.strictEqual(resUserB.toastShown, true, 'Người dùng B hiển thị thông báo riêng, không bị chặn nhầm!');
assert.strictEqual(engine2.displayedNotifications.length, 2);
console.log('[PASS] Test 3: Hai người dùng khác nhau đều nhận thông báo riêng, không bị chặn nhầm!');

// Test 4: Chống lặp ID: 1 sự kiện thật hoặc khe không bao giờ lên 2 lần trên cùng trình duyệt
console.log('\n--- Test 4: Chống lặp ID tuyệt đối (Không bao giờ hiển thị 2 lần cùng 1 sự kiện) ---');
const engine3 = new AntiSpamAndDedupEngine('Dedup Engine');
const sharedRealEvent = {
  id: 'real_order_vip_999',
  type: 'BUY_PRODUCT',
  userName: 'Nam *33',
  message: 'Nam *33 vừa mua Thẻ Tuần VIP',
};

// Lần 1: Hiển thị qua đường Real Event
const show1 = engine3.displayNotification(sharedRealEvent, t0, 50);
assert.strictEqual(show1, true, 'Lần đầu tiên phải hiển thị thành công');
assert.strictEqual(engine3.lastDisplayedSlot, 50, 'Khe 50 đã được đánh dấu phục vụ');

// Lần 2: Sự kiện đó lại xuất hiện qua đường khe (Slot Event)
const show2 = engine3.displayNotification(sharedRealEvent, t0 + 2000, 50);
assert.strictEqual(show2, false, 'Lần 2 qua đường khe PHẢI BỊ CHẶN TUYỆT ĐỐI!');

// Lần 3: Giả lập chuyển tab ẩn/hiện hoặc hỏi poller về lại
const show3 = engine3.displayNotification(sharedRealEvent, t0 + 5000, 50);
assert.strictEqual(show3, false, 'Lần 3 qua poller/visibility PHẢI BỊ CHẶN TUYỆT ĐỐI!');

assert.strictEqual(engine3.displayedNotifications.length, 1, 'Chỉ hiển thị đúng duy nhất 1 lần!');
console.log('[PASS] Test 4: Cùng 1 ID sự kiện không bao giờ hiển thị lần 2 qua bất kỳ đường nào!');

// Test 5: Đồng bộ đa tab trong cùng trình duyệt qua BroadcastChannel
console.log('\n--- Test 5: Đồng bộ đa tab trong cùng trình duyệt ---');
const tabA = new AntiSpamAndDedupEngine('Tab A');
const tabB = new AntiSpamAndDedupEngine('Tab B');

const evtTabA = { id: 'sim_slot_100', type: 'BUY_PRODUCT', userName: 'Khách *77' };
// Tab A hiển thị
tabA.displayNotification(evtTabA, t0, 100);

// Tab B nhận broadcast đồng bộ
tabB.markNotificationProcessed(evtTabA.id, 100);

// Bây giờ Tab B cố gắng hiển thị evtTabA
const tabBShow = tabB.displayNotification(evtTabA, t0 + 1000, 100);
assert.strictEqual(tabBShow, false, 'Tab B phải chặn hiển thị vì Tab A đã hiển thị sự kiện này!');
assert.strictEqual(tabB.lastDisplayedSlot, 100, 'Tab B đã đồng bộ khe 100 đã hiển thị');
console.log('[PASS] Test 5: Tab A hiển thị thì Tab B không bao giờ lặp lại sự kiện hay khe đó!');

console.log('\n=== TẤT CẢ 5 BÀI TEST CHỐNG SPAM & CHỐNG LẶP ĐÃ VƯỢT QUA 100% ===\n');
