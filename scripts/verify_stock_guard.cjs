/**
 * Test Out of Stock Guard with funded account (admin290200)
 */

const BASE_URL = 'https://web-code-game.pages.dev';

async function testStockGuard() {
  console.log('Testing Stock Guard with funded admin290200 (Balance = 6.859.250 Core)...');

  // 1. Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin290200',
      password: 'admin290200',
    }),
  });

  const loginData = await loginRes.json();
  console.log('Admin login status:', loginRes.status, 'Has token:', Boolean(loginData.token));
  const token = loginData.token;

  if (!token) {
    console.error('Login failed:', loginData);
    return;
  }

  // 2. Attempt to buy sp_1791227687502_g3i which has 0 available codes
  console.log('\nAttempting to buy product sp_1791227687502_g3i (Stock = 0)...');
  const res = await fetch(`${BASE_URL}/api/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      productId: 'sp_1791227687502_g3i',
      quantity: 1,
    }),
  });

  const data = await res.json();
  console.log('Purchase attempt result:');
  console.log('HTTP Status:', res.status);
  console.log('Response body:', data);

  if (res.status === 400 && data.code === 'OUT_OF_STOCK') {
    console.log('✅ [PASS] Stock Guard successfully blocked purchase of out-of-stock product!');
    console.log('   └─ Message:', data.message);
  } else {
    console.error('❌ [FAIL] Expected OUT_OF_STOCK but got:', data);
  }
}

testStockGuard();
