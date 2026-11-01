const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'VerificationBot/1.0' } }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const json = JSON.parse(data);
          resolve({ headers: res.headers, body: json });
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- STARTING LIVE API VERIFICATION ---');
  const timestamp = Date.now();

  // 1. Where Winds Meet Mobile
  const wwmMobileRes = await fetchJson(`https://codegame.shop/api/games?slug=where-winds-meet-mobile&nocache=1&_t=${timestamp}`);
  const wwmMobile = wwmMobileRes.body.game || wwmMobileRes.body.data;
  console.log(`[X-Build-Id]: ${wwmMobileRes.headers['x-build-id'] || 'None'}`);

  // 2. Yen Van Thap Luc Thanh
  const yvRes = await fetchJson(`https://codegame.shop/api/games?slug=yen-van-thap-luc-thanh&nocache=1&_t=${timestamp}`);
  const yv = yvRes.body.game || yvRes.body.data;

  // 3. Anime Vanguards
  const avRes = await fetchJson(`https://codegame.shop/api/games?slug=anime-vanguards&nocache=1&_t=${timestamp}`);
  const av = avRes.body.game || avRes.body.data;

  // 4. Da Hood
  const dhRes = await fetchJson(`https://codegame.shop/api/games?slug=da-hood&nocache=1&_t=${timestamp}`);
  const dh = dhRes.body.game || dhRes.body.data;

  // 5. Type Soul
  const tsRes = await fetchJson(`https://codegame.shop/api/games?slug=type-soul&nocache=1&_t=${timestamp}`);
  const ts = tsRes.body.game || tsRes.body.data;

  console.log('\n--- KET QUA KIEM CHUNG LIVE ---');
  
  // WWM Mobile check
  const wwmMobileCodes = wwmMobile.codes || [];
  const wwmMobileNbsp = wwmMobileCodes.filter(c => (c.rewards && c.rewards.includes('&nbsp;')) || (c.code && c.code.includes('&nbsp;')));
  const wwmMobileActive = wwmMobileCodes.filter(c => c.status === 'active' || c.status === 'verified').length;
  const wwmMobileExpired = wwmMobileCodes.filter(c => c.status === 'expired').length;

  console.log(`1. Where Winds Meet Mobile:`);
  console.log(`   - Tong so ma: ${wwmMobileCodes.length} (Ky vong: 615)`);
  console.log(`   - Con han (active): ${wwmMobileActive} (Ky vong: 579)`);
  console.log(`   - Het han (expired): ${wwmMobileExpired} (Ky vong: 36)`);
  console.log(`   - So ma chua '&nbsp;': ${wwmMobileNbsp.length} (Ky vong: 0)`);

  // Yen Van check
  const yvCodes = yv.codes || [];
  const yvNbsp = yvCodes.filter(c => (c.rewards && c.rewards.includes('&nbsp;')) || (c.code && c.code.includes('&nbsp;')));
  const yvActive = yvCodes.filter(c => c.status === 'active' || c.status === 'verified').length;
  const yvExpired = yvCodes.filter(c => c.status === 'expired').length;

  console.log(`2. Yen Van Thap Luc Thanh:`);
  console.log(`   - Tong so ma: ${yvCodes.length} (Ky vong: 615)`);
  console.log(`   - Con han (active): ${yvActive} (Ky vong: 579)`);
  console.log(`   - Het han (expired): ${yvExpired} (Ky vong: 36)`);
  console.log(`   - So ma chua '&nbsp;': ${yvNbsp.length} (Ky vong: 0)`);

  // Compare WWM Mobile & Yen Van
  let statusDiffCount = 0;
  let rewardDiffCount = 0;
  const yvMap = new Map();
  yvCodes.forEach(c => yvMap.set(c.code.toUpperCase(), c));

  wwmMobileCodes.forEach(mCode => {
    const yCode = yvMap.get(mCode.code.toUpperCase());
    if (!yCode) {
      console.log(`   [MISMATCH] Yen Van thieu ma: ${mCode.code}`);
    } else {
      if (mCode.status !== yCode.status) {
        statusDiffCount++;
      }
      if ((mCode.rewards || '').trim() !== (yCode.rewards || '').trim()) {
        rewardDiffCount++;
        if (rewardDiffCount <= 3) {
          console.log(`   [REWARD DIFF sample]: Code ${mCode.code} -> Mobile: "${mCode.rewards}" vs YV: "${yCode.rewards}"`);
        }
      }
    }
  });
  console.log(`   - So ma lech trang thai giua 2 ban: ${statusDiffCount} (Ky vong: 0)`);
  console.log(`   - So ma lech phan thuong giua 2 ban: ${rewardDiffCount} (Ky vong: 0)`);

  // Anime Vanguards check
  const avCodes = av.codes || [];
  const avInJunk = avCodes.filter(c => /^IN-.*-\d+X\d+$/i.test(c.code));
  const avNbsp = avCodes.filter(c => (c.rewards && c.rewards.includes('&nbsp;')));
  console.log(`3. Anime Vanguards:`);
  console.log(`   - Tong so ma: ${avCodes.length} (Ky vong: 119)`);
  console.log(`   - So ma rac 'IN-...': ${avInJunk.length} (Ky vong: 0)`);
  console.log(`   - So ma chua '&nbsp;': ${avNbsp.length} (Ky vong: 0)`);

  // Da Hood check
  const dhCodes = dh.codes || [];
  const dhInJunk = dhCodes.filter(c => /^IN-.*-\d+X\d+$/i.test(c.code));
  const dhNbsp = dhCodes.filter(c => (c.rewards && c.rewards.includes('&nbsp;')));
  console.log(`4. Da Hood:`);
  console.log(`   - Tong so ma: ${dhCodes.length} (Ky vong: 138)`);
  console.log(`   - So ma rac 'IN-...': ${dhInJunk.length} (Ky vong: 0)`);
  console.log(`   - So ma chua '&nbsp;': ${dhNbsp.length} (Ky vong: 0)`);

  // Type Soul check
  const tsCodes = ts.codes || [];
  const tsInJunk = tsCodes.filter(c => /^IN-.*-\d+X\d+$/i.test(c.code));
  const tsNbsp = tsCodes.filter(c => (c.rewards && c.rewards.includes('&nbsp;')));
  console.log(`5. Type Soul:`);
  console.log(`   - Tong so ma: ${tsCodes.length} (Ky vong: 68)`);
  console.log(`   - So ma rac 'IN-...': ${tsInJunk.length} (Ky vong: 0)`);
  console.log(`   - So ma chua '&nbsp;': ${tsNbsp.length} (Ky vong: 0)`);

  // Check sample codes mentioned in User request
  console.log('\n--- KIEM TRA CAC MA CU THE ---');
  const targetCodes = ['PALACE0528', 'QINCHUAN0430', 'WWMQC2', 'WWMQC30'];
  for (const tc of targetCodes) {
    const cMobile = wwmMobileCodes.find(c => c.code.toUpperCase() === tc);
    const cYv = yvCodes.find(c => c.code.toUpperCase() === tc);
    console.log(`Code ${tc}:`);
    console.log(`   Mobile reward: "${cMobile ? cMobile.rewards : 'NOT FOUND'}"`);
    console.log(`   YenVan reward: "${cYv ? cYv.rewards : 'NOT FOUND'}"`);
  }
}

verify().catch(console.error);
