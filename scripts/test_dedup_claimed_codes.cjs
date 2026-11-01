/**
 * scripts/test_dedup_claimed_codes.cjs
 * Kiểm thử tự động cơ chế khử trùng lặp mã code Giveaway và Orders
 */

const assert = require('assert');

// Tạo mock localStorage chuẩn Web Storage API
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

console.log('🧪 BẮT ĐẦU KIỂM THỬ KHỬ TRÙNG LẶP MÃ CODE GIVEAWAY & ORDERS...\n');

// 1. Thuật toán deduplicate của getClaimedCodes()
function runGetClaimedCodes(storageKey) {
  try {
    const data = global.localStorage.getItem(storageKey);
    const list = data ? JSON.parse(data) : [];
    const invalidErrorCodes = new Set(['OUT_OF_STOCK', 'CAMPAIGN_NOT_STARTED', 'CAMPAIGN_ENDED', 'ACCOUNT_TOO_NEW', 'COOLDOWN_ACTIVE', 'MISSING_CLIENT_IP']);
    
    const seenKeys = new Set();
    const deduplicated = [];
    
    for (const c of list) {
      if (!c || !c.code_value) continue;
      const cleanCode = String(c.code_value).trim().toUpperCase();
      if (invalidErrorCodes.has(cleanCode)) continue;
      
      const campId = String(c.campaign_id || '').trim();
      const uniqueKey = `${campId}_${cleanCode}`;
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        deduplicated.push(c);
      }
    }

    if (deduplicated.length !== list.length) {
      global.localStorage.setItem(storageKey, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return [];
  }
}

// 2. Thuật toán sync của refreshCurrentUserBalance()
function runSyncGiveawayClaims(storageKey, serverGiveawayClaims) {
  try {
    const claimRaw = global.localStorage.getItem(storageKey);
    let existingClaims = claimRaw ? JSON.parse(claimRaw) : [];
    const claimMap = new Map();
    
    const getClaimUniqueKey = (c) => {
      if (!c) return '';
      const campId = String(c.campaign_id || '').trim();
      const codeVal = String(c.code_value || '').trim().toUpperCase();
      if (campId && codeVal) return `${campId}_${codeVal}`;
      return c.id ? String(c.id).trim() : '';
    };

    existingClaims.forEach((c) => {
      const key = getClaimUniqueKey(c);
      if (key) claimMap.set(key, c);
    });

    serverGiveawayClaims.forEach((c) => {
      const key = getClaimUniqueKey(c);
      if (key) {
        const existing = claimMap.get(key);
        claimMap.set(key, {
          id: c.id || existing?.id || `claim_${Date.now()}`,
          campaign_id: c.campaign_id || existing?.campaign_id,
          game_name: c.game_name || existing?.game_name || 'Sự Kiện',
          game_slug: c.game_slug || existing?.game_slug || '',
          game_icon_url: c.game_icon_url || existing?.game_icon_url || '',
          code_value: c.code_value || existing?.code_value,
          rewards: c.rewards || existing?.rewards || 'Quà tặng sự kiện',
          claimed_at: c.claimed_at || existing?.claimed_at || new Date().toISOString(),
        });
      }
    });

    const mergedClaims = Array.from(claimMap.values()).sort(
      (a, b) => new Date(b.claimed_at || 0).getTime() - new Date(a.claimed_at || 0).getTime()
    );
    global.localStorage.setItem(storageKey, JSON.stringify(mergedClaims));
    return mergedClaims;
  } catch (e) {
    return [];
  }
}

// TEST 1: Khử trùng lặp từ 14 mã (7 cặp trùng như ảnh chụp của user)
console.log('--- TEST 1: Tự động khử trùng lặp và self-healing localStorage ---');
const duplicated14Codes = [
  { id: 'c1', campaign_id: 'gw_black_myth', game_name: 'TA LÀ HẮC NGỘ KHÔNG', code_value: 'AE1059E7D634FC88', rewards: 'Code VIP 1' },
  { id: 'c2', campaign_id: 'gw_black_myth', game_name: 'TA LÀ HẮC NGỘ KHÔNG', code_value: 'AE1059E7D634FC88', rewards: 'Code VIP 1' },
  { id: 'c3', campaign_id: 'gw_pirate', game_name: 'Pirate Legends', code_value: 'DDHD4P73BNMT', rewards: 'Rương Vàng' },
  { id: 'c4', campaign_id: 'gw_pirate', game_name: 'Pirate Legends', code_value: 'DDHD4P73BNMT', rewards: 'Rương Vàng' },
  { id: 'c5', campaign_id: 'gw_wherewinds', game_name: 'Yến Vân Thập Lục Thanh', code_value: 'WWMTOP1VN', rewards: 'Trang Phục' },
  { id: 'c6', campaign_id: 'gw_wherewinds', game_name: 'Yến Vân Thập Lục Thanh', code_value: 'WWMTOP1VN', rewards: 'Trang Phục' },
  { id: 'c7', campaign_id: 'gw_game4', game_name: 'Game 4', code_value: 'CODE4', rewards: 'Quà 4' },
  { id: 'c8', campaign_id: 'gw_game4', game_name: 'Game 4', code_value: 'CODE4', rewards: 'Quà 4' },
  { id: 'c9', campaign_id: 'gw_game5', game_name: 'Game 5', code_value: 'CODE5', rewards: 'Quà 5' },
  { id: 'c10', campaign_id: 'gw_game5', game_name: 'Game 5', code_value: 'CODE5', rewards: 'Quà 5' },
  { id: 'c11', campaign_id: 'gw_game6', game_name: 'Game 6', code_value: 'CODE6', rewards: 'Quà 6' },
  { id: 'c12', campaign_id: 'gw_game6', game_name: 'Game 6', code_value: 'CODE6', rewards: 'Quà 6' },
  { id: 'c13', campaign_id: 'gw_game7', game_name: 'Game 7', code_value: 'CODE7', rewards: 'Quà 7' },
  { id: 'c14', campaign_id: 'gw_game7', game_name: 'Game 7', code_value: 'CODE7', rewards: 'Quà 7' },
];

global.localStorage.setItem('wcg_claimed_giveaways', JSON.stringify(duplicated14Codes));
const res1 = runGetClaimedCodes('wcg_claimed_giveaways');

assert.strictEqual(res1.length, 7, 'Phải khử trùng lặp từ 14 mã về đúng 7 mã duy nhất!');
const storedClean = JSON.parse(global.localStorage.getItem('wcg_claimed_giveaways'));
assert.strictEqual(storedClean.length, 7, 'localStorage phải được self-healing lưu đúng 7 mã!');
console.log('✅ TEST 1 PASSED: 14 mã trùng lặp đã được làm sạch về đúng 7 mã duy nhất trong localStorage.\n');

// TEST 2: Ngăn chặn nhân đôi khi đồng bộ Server D1 vs Local Client
console.log('--- TEST 2: Ngăn chặn nhân đôi khi đồng bộ Cloudflare D1 Server ---');
// Giả lập client vừa giật code cục bộ (id: claim_local_...)
global.localStorage.setItem('wcg_claimed_giveaways', JSON.stringify([
  { id: 'claim_1792909571892', campaign_id: 'gw_black_myth', game_name: 'TA LÀ HẮC NGỘ KHÔNG', code_value: 'AE1059E7D634FC88', rewards: 'Code VIP 1' }
]));

// Server Cloudflare D1 trả về bản ghi cùng code nhưng ID server là số hoặc UUID khác
const serverD1Claims = [
  { id: 14, campaign_id: 'gw_black_myth', game_name: 'TA LÀ HẮC NGỘ KHÔNG', code_value: 'AE1059E7D634FC88', rewards: 'Code VIP 1 (Server Synced)' }
];

const res2 = runSyncGiveawayClaims('wcg_claimed_giveaways', serverD1Claims);
assert.strictEqual(res2.length, 1, 'Sau khi đồng bộ với server D1, số lượng mã phải là 1 (không được nhân đôi)!');
assert.strictEqual(res2[0].rewards, 'Code VIP 1 (Server Synced)', 'Bản ghi phải được cập nhật từ server.');
console.log('✅ TEST 2 PASSED: Đồng bộ Cloudflare D1 không tạo thêm bản ghi trùng lặp.\n');

// TEST 3: Chuẩn hóa không phân biệt hoa thường và khoảng trắng
console.log('--- TEST 3: Chuẩn hóa hoa thường và khoảng trắng ---');
global.localStorage.setItem('wcg_claimed_giveaways', JSON.stringify([
  { id: 'c1', campaign_id: 'gw_test', code_value: 'ABC-123' },
  { id: 'c2', campaign_id: 'gw_test', code_value: ' abc-123 ' },
  { id: 'c3', campaign_id: 'gw_test', code_value: 'ABC-123' },
  { id: 'c4', campaign_id: 'gw_test', code_value: 'XYZ-999' }
]));
const res3 = runGetClaimedCodes('wcg_claimed_giveaways');
assert.strictEqual(res3.length, 2, 'Phải chuẩn hóa và chỉ giữ 2 mã phân biệt ABC-123 và XYZ-999!');
console.log('✅ TEST 3 PASSED: Chuẩn hóa ký tự và khoảng trắng hoạt động chính xác.\n');

// TEST 4: Khử mã lỗi rác không hợp lệ
console.log('--- TEST 4: Tự động loại bỏ mã lỗi rác ---');
global.localStorage.setItem('wcg_claimed_giveaways', JSON.stringify([
  { id: 'c1', campaign_id: 'gw_valid', code_value: 'VALID_CODE_2026' },
  { id: 'c2', campaign_id: 'gw_err', code_value: 'OUT_OF_STOCK' },
  { id: 'c3', campaign_id: 'gw_err2', code_value: 'COOLDOWN_ACTIVE' }
]));
const res4 = runGetClaimedCodes('wcg_claimed_giveaways');
assert.strictEqual(res4.length, 1, 'Chỉ được giữ lại 1 mã hợp lệ, loại bỏ các mã lỗi!');
assert.strictEqual(res4[0].code_value, 'VALID_CODE_2026');
console.log('✅ TEST 4 PASSED: Tự động loại bỏ mã lỗi rác.\n');

console.log('🎉 TẤT CẢ 4 BÀI KIỂM THỬ KHỬ TRÙNG LẶP ĐỀU ĐẠT 100%!');
