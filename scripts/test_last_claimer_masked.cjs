/**
 * scripts/test_last_claimer_masked.cjs
 * Kiểm thử logic hiển thị dòng thông tin "Đạo hữu nhận thưởng lần trước"
 * kèm cơ chế che tên một phần (PII-safe masking)
 */

const assert = require('assert');

console.log('🧪 BẮT ĐẦU KIỂM THỬ: ĐẠO HỮU NHẬN THƯỞNG LẦN TRƯỚC & CHE TÊN BẢO MẬT...\n');

// Mock marketingService.maskName logic
function maskName(name) {
  if (!name) return 'Khách hàng';
  const trimmed = name.trim();

  // Already masked check
  if (trimmed.includes('***') || trimmed.includes('****') || trimmed.includes('**')) {
    return trimmed;
  }

  // Guest identity formatting: e.g. "Khách #4921" -> "Khách #49**"
  if (trimmed.startsWith('Khách #')) {
    const code = trimmed.replace('Khách #', '').trim();
    if (code.length >= 4) {
      return `Khách #${code.slice(0, 2)}**`;
    }
    return trimmed;
  }

  // Email masking: e.g. "tuannguyen92@gmail.com" -> "tuan***@gmail.com"
  if (trimmed.includes('@')) {
    const [localPart, domain] = trimmed.split('@');
    if (!domain) return trimmed;
    if (localPart.length <= 3) {
      return `${localPart[0]}***@${domain}`;
    } else if (localPart.length <= 6) {
      return `${localPart.slice(0, 3)}***@${domain}`;
    } else {
      return `${localPart.slice(0, 4)}***@${domain}`;
    }
  }

  // Vietnamese phone number masking: e.g. "0984562189" -> "0984***189"
  if (/^\d{9,11}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;
  }

  // Gamer usernames: e.g. "shadow_hunter" -> "shadow***"
  if (trimmed.includes('_') || /^[a-zA-Z0-9]+$/.test(trimmed)) {
    if (trimmed.length <= 4) return `${trimmed[0]}***`;
    return `${trimmed.slice(0, Math.min(6, trimmed.length - 2))}***`;
  }

  // Natural Vietnamese Full Name masking: e.g. "Nguyễn Minh Tuấn" -> "Nguyễn M*** Tuấn"
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    const first = words[0];
    const middleInitial = words[1].charAt(0).toUpperCase();
    const last = words[words.length - 1];
    return `${first} ${middleInitial}*** ${last}`;
  } else if (words.length === 2) {
    const first = words[0];
    const lastInitial = words[1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}***`;
  }

  return `${trimmed.slice(0, Math.min(3, trimmed.length))}***`;
}

const PRESET_VIRTUAL_ACCOUNTS = [
  'Nguyễn Minh Tuấn', 'Trần Hoàng Long', 'Lê Hải Đăng', 'Phạm Quỳnh Nga', 'Hoàng Bảo Trâm',
  'Đỗ Gia Huy', 'Vũ Quốc Anh', 'Bùi Đức Thắng', 'Đặng Thảo Vy', 'Ngô Quang Khải',
  'Dương Anh Khoa', 'Lý Tấn Phát', 'Phan Thanh Tùng', 'Võ Hoài Nam', 'Mai Anh Tuấn',
  '0984562189', '0912389472', 'shadow_hunter', 'pro_sniper_99'
];

function getLastClaimerMasked(campaign) {
  const rawName = String(campaign.last_claimer_name || '').trim();
  if (rawName && rawName.toLowerCase() !== 'người chơi trước' && rawName.toLowerCase() !== 'đồng đạo trước') {
    return maskName(rawName);
  }
  const campId = String(campaign.id || '');
  let hash = 0;
  for (let i = 0; i < campId.length; i++) {
    hash = (hash << 5) - hash + campId.charCodeAt(i);
    hash |= 0;
  }
  const fallbackRaw = PRESET_VIRTUAL_ACCOUNTS[Math.abs(hash) % PRESET_VIRTUAL_ACCOUNTS.length];
  return maskName(fallbackRaw);
}

// TEST 1: Che tên theo các định dạng họ tên, số điện thoại, username, email
console.log('--- TEST 1: Kiểm tra thuật toán che tên một phần ---');
assert.strictEqual(maskName('Nguyễn Minh Tuấn'), 'Nguyễn M*** Tuấn');
assert.strictEqual(maskName('Trần Hoàng Long'), 'Trần H*** Long');
assert.strictEqual(maskName('Lê Nam'), 'Lê N***');
assert.strictEqual(maskName('0984562189'), '0984***189');
assert.strictEqual(maskName('shadow_hunter'), 'shadow***');
assert.strictEqual(maskName('tuannguyen92@gmail.com'), 'tuan***@gmail.com');
assert.strictEqual(maskName('Khách #4921'), 'Khách #49**');
console.log('✅ TEST 1 PASSED: 100% các định dạng tên đều được che bảo mật chuẩn xác.\n');

// TEST 2: Đảm bảo tính xác định (Deterministic) theo Campaign ID
console.log('--- TEST 2: Đảm bảo tính xác định theo Campaign ID (Không đổi ngẫu nhiên) ---');
const camp1 = { id: 'gw_ta_la_hac_ngo_khong', title: 'TA LÀ HẮC NGỘ KHÔNG' };
const nameA1 = getLastClaimerMasked(camp1);
const nameA2 = getLastClaimerMasked(camp1);
const nameA3 = getLastClaimerMasked(camp1);
assert.strictEqual(nameA1, nameA2);
assert.strictEqual(nameA2, nameA3);
assert.ok(nameA1.includes('***'), 'Tên hiển thị phải chứa ký tự ẩn ***');
console.log(`✅ TEST 2 PASSED: Tên đạo hữu cho "${camp1.title}" luôn ổn định = "${nameA1}".\n`);

// TEST 3: Ưu tiên tên người nhận thật từ campaign.last_claimer_name
console.log('--- TEST 3: Ưu tiên tên người nhận thật khi có cập nhật ---');
const campReal = {
  id: 'gw_ta_la_hac_ngo_khong',
  title: 'TA LÀ HẮC NGỘ KHÔNG',
  last_claimer_name: 'Phạm Quỳnh Nga'
};
const realMasked = getLastClaimerMasked(campReal);
assert.strictEqual(realMasked, 'Phạm Q*** Nga');
console.log(`✅ TEST 3 PASSED: Ưu tiên tên người nhận thật "${campReal.last_claimer_name}" -> "${realMasked}".\n`);

console.log('🎉 TẤT CẢ CÁC BÀI TEST ĐẠO HỮU NHẬN THƯỞNG LẦN TRƯỚC ĐÃ ĐẠT 100%!');
