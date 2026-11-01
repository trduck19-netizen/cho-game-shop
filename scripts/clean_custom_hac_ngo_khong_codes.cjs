const fs = require('fs');

async function cleanCustomCodes() {
  const syncKey = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
  const endpoints = [
    'https://web-code-game.pages.dev',
    'https://admin-code-game-shop.pages.dev',
    'https://codegame.shop'
  ];

  console.log('Fetching sync state...');
  const res = await fetch('https://codegame.shop/api/sync', {
    headers: { 'X-Sync-Key': syncKey }
  });
  const data = await res.json();

  const customFreeCodes = data.customFreeCodes || [];
  const deletedFreeCodes = data.deletedFreeCodes || [];

  const removedIds = [];
  const keptCustom = [];

  for (const c of customFreeCodes) {
    if (c.gameSlug === 'ta-la-hac-ngo-khong' || c.gameId === 'ta-la-hac-ngo-khong') {
      if (c.id) removedIds.push(c.id);
    } else {
      keptCustom.push(c);
    }
  }

  const newDeleted = Array.from(new Set([...deletedFreeCodes, ...removedIds]));

  console.log(`Removed ${removedIds.length} old custom codes for ta-la-hac-ngo-khong:`, removedIds);
  console.log(`Remaining custom codes count: ${keptCustom.length}`);

  for (const base of endpoints) {
    try {
      console.log(`Pushing clean customFreeCodes to ${base}...`);
      await fetch(`${base}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey },
        body: JSON.stringify({ key: 'wcg_admin_custom_free_codes_v1', data: keptCustom })
      });

      console.log(`Pushing deletedFreeCodes to ${base}...`);
      await fetch(`${base}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey },
        body: JSON.stringify({ key: 'wcg_deleted_free_codes', data: newDeleted })
      });
    } catch (e) {
      console.error(`Error on ${base}:`, e.message);
    }
  }

  console.log('Done cleaning custom codes!');
}

cleanCustomCodes();
