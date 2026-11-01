const https = require('https');
const fs = require('fs');
const path = require('path');

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

function stripAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
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
  console.log('Fetching databases from production and local...');
  const [gamesRes, customRes, freeRes] = await Promise.all([
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_games_v5'),
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_custom_free_codes_v1'),
    fetchJson('https://codegame.shop/api/sync?key=wcg_admin_free_codes_v5')
  ]);

  const games = gamesRes.data || [];
  const customCodes = customRes.data || [];
  const freeCodes = freeRes.data || [];
  const bundled = JSON.parse(fs.readFileSync('src/data/crawled_codes_188.json', 'utf8'));

  const rawBySlug = new Map();
  function registerRaw(item, src) {
    if (!item) return;
    const slug = (item.gameSlug || item.game_slug || item.slug || item.gameId || '').toLowerCase().trim();
    if (!slug) return;
    if (!rawBySlug.has(slug)) rawBySlug.set(slug, []);
    rawBySlug.get(slug).push({ ...item, _source: src });
  }

  customCodes.forEach(c => registerRaw(c, 'custom'));
  freeCodes.forEach(c => registerRaw(c, 'd1_free'));
  bundled.forEach(c => registerRaw(c, 'bundled'));

  const targetSlugs = [
    'where-winds-meet-mobile',
    'yen-van-thap-luc-thanh',
    'tam-quoc-x',
    'me-ta-tam-quoc',
    'delta-force',
    'honkai-star-rail',
    'genshin-impact',
    'samkok-tam-quoc',
    'anime-vanguards',
    'chien-gioi-4d',
    'call-of-duty-mobile-vn',
    'da-hood',
    'fisch-roblox'
  ];

  const auditReport = [];

  for (const slug of targetSlugs) {
    const game = games.find(g => g.slug === slug) || { name: slug, slug };
    const rawList = rawBySlug.get(slug) || [];
    
    // Check duplicates inside rawList
    const rawCodeCount = new Map();
    for (const c of rawList) {
      const codeStr = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
      rawCodeCount.set(codeStr, (rawCodeCount.get(codeStr) || 0) + 1);
    }
    let internalDups = 0;
    for (const cnt of rawCodeCount.values()) {
      if (cnt > 1) internalDups += (cnt - 1);
    }

    // Now resolve using resolveCodesForGame
    const possibleKeys = [
      slug,
      slug.replace(/-mobile$/i, ''),
      slug + '-mobile',
      slug.replace(/_/g, '-')
    ];
    if (game.name) {
      const nameSlug = stripAccents(game.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      possibleKeys.push(nameSlug);
    }

    const merged = new Map();
    for (const k of possibleKeys) {
      const list = rawBySlug.get(k) || [];
      for (const item of list) {
        const codeStr = String(item.code || item.codeValue || item.gift_code || '').trim().toUpperCase();
        if (codeStr && !merged.has(codeStr)) {
          merged.set(codeStr, item);
        }
      }
    }

    let expiredCount = 0;
    let genuineValidFuture = 0;
    let genuineNoDate = 0;
    const sourcesSummary = {};
    const datesSummary = {};

    for (const [codeStr, item] of merged.entries()) {
      const exp = isCodeExpired(item);
      const expVal = item.expiresAt || item.expires_at || item.expiry || '';
      const isFake = (expVal === '2026-12-31' || expVal === '2026-12-31T23:59:59Z' || expVal === '31/12/2026');

      if (exp) {
        expiredCount++;
      } else {
        if (!expVal || isFake) {
          genuineNoDate++;
        } else {
          genuineValidFuture++;
        }
      }

      const src = item.source || item.sourceUrl || item._source || 'Unknown';
      const shortSrc = String(src).slice(0, 35);
      sourcesSummary[shortSrc] = (sourcesSummary[shortSrc] || 0) + 1;

      const dt = (item.createdAt || item.created_at || item.added_at || '').slice(0, 10) || 'unknown';
      datesSummary[dt] = (datesSummary[dt] || 0) + 1;
    }

    // Cross-game check with other 12 games
    const crossGameOverlap = {};
    for (const otherSlug of targetSlugs) {
      if (otherSlug === slug) continue;
      const otherList = rawBySlug.get(otherSlug) || [];
      const otherCodes = new Set(otherList.map(c => String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase()));
      let common = 0;
      for (const c of merged.keys()) {
        if (otherCodes.has(c)) common++;
      }
      if (common > 0) {
        crossGameOverlap[otherSlug] = common;
      }
    }

    auditReport.push({
      name: game.name,
      slug,
      current_codes_count: game.codes_count || 0,
      raw_records: rawList.length,
      raw_internal_duplicates: internalDups,
      resolved_unique_codes: merged.size,
      genuinely_usable: genuineValidFuture + genuineNoDate,
      genuine_valid_future: genuineValidFuture,
      genuine_no_date: genuineNoDate,
      expired_count: expiredCount,
      cross_game_overlap: crossGameOverlap,
      sources: sourcesSummary,
      dates: datesSummary
    });
  }

  if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });
  fs.writeFileSync('scratch/audit_report_13_games.json', JSON.stringify(auditReport, null, 2));
  console.log('Saved audit report to scratch/audit_report_13_games.json');

  auditReport.forEach((r, idx) => {
    console.log(`\n========================================================================`);
    console.log(`[${idx+1}] ${r.name} (${r.slug})`);
    console.log(`  - codes_count hiện tại trên web: ${r.current_codes_count}`);
    console.log(`  - Bản ghi thô trong kho: ${r.raw_records} (Trùng lặp nội bộ: ${r.raw_internal_duplicates})`);
    console.log(`  - Mã duy nhất resolved: ${r.resolved_unique_codes}`);
    console.log(`  - CÒN DÙNG ĐƯỢC (Chưa hết hạn + Chưa rõ hạn): ${r.genuinely_usable} (Có hạn tương lai: ${r.genuine_valid_future}, Chưa rõ hạn: ${r.genuine_no_date})`);
    console.log(`  - ĐÃ HẾT HẠN THẬT: ${r.expired_count}`);
    console.log(`  - Trùng lặp với game khác:`, Object.entries(r.cross_game_overlap).map(([k,v]) => `${k}: ${v} mã`).join(', ') || 'Không trùng');
    console.log(`  - Nguồn tiêu biểu:`, Object.entries(r.sources).slice(0, 3).map(([k,v]) => `${k}: ${v}`).join('; '));
    console.log(`  - Ngày nạp tiêu biểu:`, Object.entries(r.dates).slice(0, 3).map(([k,v]) => `${k}: ${v}`).join('; '));
  });
}

run().catch(console.error);
