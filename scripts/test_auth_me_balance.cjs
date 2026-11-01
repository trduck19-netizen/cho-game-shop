const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const secret = process.env.JWT_SECRET;

async function createToken(uId, s) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 12);
  const payload = `${uId}.${timestamp}.${random}`;
  const hash = crypto.createHash('sha256').update(`${payload}:${s}`).digest('hex');
  const sig = hash.substring(0, 16);
  return `wcg_edge_tok_${uId}_${timestamp}_${random}_${sig}`;
}

async function run() {
  const token = await createToken('usr-1', secret);
  console.log('Token for usr-1:', token);

  const res = await fetch('https://web-code-game.pages.dev/api/auth/me?t=' + Date.now(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  console.log('GET /api/auth/me status:', res.status);
  const data = await res.json();
  console.log('User ID:', data.user?.id);
  console.log('User Name:', data.user?.displayName || data.user?.username);
  console.log('User Balance in /api/auth/me:', data.user?.wallet_balance);
}

run().catch(console.error);
