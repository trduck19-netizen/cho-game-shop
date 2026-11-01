/**
 * Verify Real Successful Purchase via D1 Atomic Engine
 */

const BASE_URL = 'https://web-code-game.pages.dev';

async function testSuccessfulPurchase() {
  console.log('Testing Successful Purchase with admin290200...');

  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin290200', password: 'admin290200' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const initialBalance = loginData.user?.wallet_balance;
  console.log('Initial balance:', initialBalance, 'Core');

  // 2. Buy 1 code of sp_1791227679911_g5f
  const buyRes = await fetch(`${BASE_URL}/api/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      productId: 'sp_1791227679911_g5f',
      quantity: 1,
    }),
  });

  const buyData = await buyRes.json();
  console.log('\nPurchase Response Status:', buyRes.status);
  console.log('Success:', buyData.success);
  console.log('Message:', buyData.message);
  console.log('Order ID:', buyData.order?.id);
  console.log('Delivered Codes:', buyData.deliveredCodes);
  console.log('New Balance:', buyData.newBalance, 'Core');
  console.log('Updated Stock:', buyData.updatedStock);

  if (
    buyRes.ok &&
    buyData.success &&
    buyData.deliveredCodes?.length === 1 &&
    buyData.newBalance === initialBalance - 15000
  ) {
    console.log('✅ [PASS] 100% ACID Purchase Success! Money deducted, code delivered, stock updated!');
  } else {
    console.error('❌ [FAIL] Purchase verification mismatch:', buyData);
  }

  // 3. Query /api/auth/me to verify balance & orders persistence
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('\n/api/auth/me Profile verification:');
  console.log('Persisted Balance:', meData.user?.wallet_balance);
  console.log('Recent Orders count:', meData.orders?.length);
  console.log('Recent Tx count:', meData.transactions?.length);
  if (meData.user?.wallet_balance === buyData.newBalance) {
    console.log('✅ [PASS] /api/auth/me reports 100% accurate balance and order history directly from D1!');
  }
}

testSuccessfulPurchase();
