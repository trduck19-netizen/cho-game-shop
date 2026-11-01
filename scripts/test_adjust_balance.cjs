const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const secret = process.env.JWT_SECRET;
const syncSecret = process.env.ADMIN_SYNC_SECRET;
const userId = 'usr_admin';

async function createToken(uId, s) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 12);
  const payload = `${uId}.${timestamp}.${random}`;
  const hash = crypto.createHash('sha256').update(`${payload}:${s}`).digest('hex');
  const sig = hash.substring(0, 16);
  return `wcg_edge_tok_${uId}_${timestamp}_${random}_${sig}`;
}

async function run() {
  const token = await createToken(userId, secret);
  console.log('Using Admin Token:', token);

  // 1. Fetch current members from /api/sync
  const getRes = await fetch('https://web-code-game.pages.dev/api/sync', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Sync-Key': syncSecret
    }
  });
  const getData = await getRes.json();
  console.log('GET /api/sync status:', getRes.status);
  console.log('Current members count:', getData.members ? getData.members.length : 'none');
  const targetMember = (getData.members || []).find(m => m.id === 'usr-2');
  console.log('Target member usr-2 (Nguyễn Văn An):', targetMember ? targetMember.displayName : 'not found');
  console.log('Current usr-2 balance:', targetMember ? targetMember.balance : 'not found');

  // 2. Adjust balance (+50,000)
  const currentBal = targetMember ? targetMember.balance : 1450000;
  const newBal = currentBal + 50000;
  const updatedMembers = (getData.members || []).map(m => m.id === 'usr-2' ? { ...m, balance: newBal } : m);

  const postRes = await fetch('https://web-code-game.pages.dev/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Sync-Key': syncSecret
    },
    body: JSON.stringify({
      key: 'wcg_admin_members_v4',
      data: updatedMembers,
      members: updatedMembers
    })
  });
  const postData = await postRes.json();
  console.log('POST /api/sync status:', postRes.status);
  console.log('POST Response:', postData);

  // 3. Immediately re-fetch to see if balance persisted!
  const verifyRes = await fetch('https://web-code-game.pages.dev/api/sync?t=' + Date.now(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Sync-Key': syncSecret,
      'Cache-Control': 'no-cache'
    }
  });
  const verifyData = await verifyRes.json();
  const verifyTarget = (verifyData.members || []).find(m => m.id === 'usr-2');
  console.log('Re-fetched usr-2 balance:', verifyTarget ? verifyTarget.balance : 'not found');
  console.log('Did balance change from', currentBal, 'to', newBal, '?', verifyTarget?.balance === newBal ? '✅ YES (SUCCESS)' : '❌ NO');
}

run().catch(console.error);
