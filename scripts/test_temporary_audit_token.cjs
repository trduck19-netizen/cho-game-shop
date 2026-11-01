/**
 * Test: Verify Temporary Read-Only Audit Token logic
 */

const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const secret = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

async function computeSig(payload, sec) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${payload}:${sec}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 20);
}

async function verifyTokenMock(token, candidateSecrets) {
  if (!token || !token.startsWith('wcg_audit_temp_')) return { valid: false, expired: false };
  const parts = token.replace('wcg_audit_temp_', '').split('_');
  if (parts.length < 3) return { valid: false, expired: false };
  const sig = parts.pop();
  const random = parts.pop();
  const expiresAtMs = parseInt(parts.join('_'), 10);
  if (isNaN(expiresAtMs)) return { valid: false, expired: false };
  
  const now = Date.now();
  if (now > expiresAtMs) {
    return { valid: false, expired: true, error: 'Token đã hết hạn' };
  }
  
  const payload = `audit_temp.${expiresAtMs}.${random}`;
  for (const s of candidateSecrets) {
    const expectedSig = await computeSig(payload, s);
    if (sig === expectedSig) {
      return { valid: true, expired: false, remainingSeconds: Math.floor((expiresAtMs - now) / 1000) };
    }
  }
  return { valid: false, expired: false };
}

async function runTests() {
  console.log('🧪 RUNNING TEMPORARY AUDIT TOKEN TESTS...');

  // Test 1: Fresh 2-hour token is valid
  const expiresAt1 = Date.now() + 2 * 3600 * 1000;
  const rand1 = 'testrand1234';
  const sig1 = await computeSig(`audit_temp.${expiresAt1}.${rand1}`, secret);
  const token1 = `wcg_audit_temp_${expiresAt1}_${rand1}_${sig1}`;

  const res1 = await verifyTokenMock(token1, [secret]);
  assert.strictEqual(res1.valid, true, 'Test 1 failed: fresh token should be valid');
  assert.strictEqual(res1.expired, false, 'Test 1 failed: fresh token should not be expired');
  assert(res1.remainingSeconds > 7100, 'Test 1 failed: remaining seconds should be around 7200');
  console.log('✅ [PASS] Fresh 2-hour token is valid');

  // Test 2: Expired token (in past) is rejected with expired: true
  const expiresAt2 = Date.now() - 5000; // 5s ago
  const rand2 = 'expiredrand0';
  const sig2 = await computeSig(`audit_temp.${expiresAt2}.${rand2}`, secret);
  const token2 = `wcg_audit_temp_${expiresAt2}_${rand2}_${sig2}`;

  const res2 = await verifyTokenMock(token2, [secret]);
  assert.strictEqual(res2.valid, false, 'Test 2 failed: expired token should not be valid');
  assert.strictEqual(res2.expired, true, 'Test 2 failed: expired token should be marked expired');
  console.log('✅ [PASS] Expired token is strictly rejected');

  // Test 3: Tampered signature is rejected
  const token3 = `wcg_audit_temp_${expiresAt1}_${rand1}_tamperedsig12345678`;
  const res3 = await verifyTokenMock(token3, [secret]);
  assert.strictEqual(res3.valid, false, 'Test 3 failed: tampered token should not be valid');
  assert.strictEqual(res3.expired, false, 'Test 3 failed: tampered token is not expired, just invalid');
  console.log('✅ [PASS] Tampered token signature is rejected');

  // Test 4: Wrong secret is rejected
  const res4 = await verifyTokenMock(token1, ['wrong_secret_1234567890']);
  assert.strictEqual(res4.valid, false, 'Test 4 failed: wrong secret should fail');
  console.log('✅ [PASS] Wrong secret verification fails cleanly');

  console.log('====================================================');
  console.log('SUMMARY: 4/4 TESTS PASSED 100%');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
