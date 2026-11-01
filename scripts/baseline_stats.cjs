const https = require('https');
const fs = require('fs');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Sync-Key': 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef' } }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve({ error: d }); }
      });
    }).on('error', reject);
  });
}

function isCodeExpired(c) {
  if (c.status === 'EXPIRED' || c.status === 'expired') return true;
  const exp = c.expiresAt || c.expires_at || c.expiry || '';
  if (!exp) return false;
  if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026') return false;
  const now = new Date();
  const d = new Date(exp);
  if (isNaN(d.getTime())) return false;
  return d < now;
}

async function run() {
  const [gamesRes, customRes, freeRes] = await Promise.all([
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_games_v5'),
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_custom_free_codes_v1'),
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_free_codes_v5')
  ]);

  const games = gamesRes.data || [];
  const customCodes = customRes.data || [];
  const freeCodes = freeRes.data || [];
  const bundled = JSON.parse(fs.readFileSync('src/data/crawled_codes_188.json', 'utf8'));

  console.log('--- BASELINE TOTALS ---');
  console.log('Games count:', games.length);
  console.log('Custom codes in D1:', customCodes.length);
  console.log('Free codes in D1:', freeCodes.length);
  console.log('Bundled codes (crawled_codes_188.json):', bundled.length);

  // Check unique codes across all sources per gameSlug
  const allCodes = [...customCodes, ...freeCodes, ...bundled];
  console.log('Total raw records combined across all sources:', allCodes.length);

  const uniqueSlugCodeMap = new Map();
  let duplicatesFound = 0;
  for (const c of allCodes) {
    const slug = (c.gameSlug || c.game_slug || c.slug || c.gameId || '').toLowerCase().trim();
    const code = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
    if (!slug || !code) continue;
    const key = slug + ':::' + code;
    if (uniqueSlugCodeMap.has(key)) {
      duplicatesFound++;
      // Priority: keep one with best rewards and valid status/expiry
      const prev = uniqueSlugCodeMap.get(key);
      const isExpPrev = isCodeExpired(prev);
      const isExpCurr = isCodeExpired(c);
      const merged = {
        ...prev,
        rewards: (c.rewards && c.rewards.length > (prev.rewards?.length || 0)) ? c.rewards : prev.rewards,
        expiresAt: c.expiresAt || prev.expiresAt,
        status: (isExpPrev || isExpCurr) ? 'EXPIRED' : 'ACTIVE'
      };
      uniqueSlugCodeMap.set(key, merged);
    } else {
      uniqueSlugCodeMap.set(key, c);
    }
  }

  console.log('Unique (slug + code) combinations:', uniqueSlugCodeMap.size);
  console.log('Duplicate records across raw storage:', duplicatesFound);

  let totalActive = 0;
  let totalExpired = 0;
  let totalNoDate = 0;
  for (const c of uniqueSlugCodeMap.values()) {
    if (isCodeExpired(c)) {
      totalExpired++;
    } else {
      totalActive++;
      const exp = c.expiresAt || c.expires_at || c.expiry || '';
      if (!exp || exp.startsWith('2026-12-31')) {
        totalNoDate++;
      }
    }
  }
  console.log('Of unique codes:');
  console.log('  - Active (Usable):', totalActive);
  console.log('  - Expired:', totalExpired);
  console.log('  - No expiry date (Chưa rõ hạn):', totalNoDate);
}

run().catch(console.error);
