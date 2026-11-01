const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE RECOVERY VERIFICATION TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
      failed++;
    }
  }

  // 1. Check Canonical Backup State File
  const canonicalFile = path.resolve('functions/data/canonical_backup_state.json');
  assert(fs.existsSync(canonicalFile), 'Canonical backup file exists in functions/data');
  const canonical = JSON.parse(fs.readFileSync(canonicalFile, 'utf8'));

  assert(canonical.crawlerPendingGames && canonical.crawlerPendingGames.length === 63,
    'Canonical pending games count === 63',
    `Found: ${canonical.crawlerPendingGames?.length}`);

  assert(canonical.crawlerPendingCodes && canonical.crawlerPendingCodes.length === 22,
    'Canonical pending codes count === 22',
    `Found: ${canonical.crawlerPendingCodes?.length}`);

  assert(canonical.upcomingGames && canonical.upcomingGames.length === 7,
    'Canonical upcoming games count === 7',
    `Found: ${canonical.upcomingGames?.length}`);

  const upcomingSlugs = (canonical.upcomingGames || []).map(g => g.slug);
  assert(!upcomingSlugs.includes('where-winds-meet') && !upcomingSlugs.includes('honkai-star-rail') && !upcomingSlugs.includes('strinova-vn'),
    'Upcoming games does not contain obsolete games (where-winds-meet, honkai-star-rail, strinova-vn)',
    `Slugs: ${upcomingSlugs.join(', ')}`);

  assert(canonical.launchedGames && canonical.launchedGames.length === 3,
    'Canonical launched games count === 3',
    `Found: ${canonical.launchedGames?.length}`);

  const launchedSlugs = (canonical.launchedGames || []).map(g => g.slug);
  assert(launchedSlugs.includes('strinova-vn') && launchedSlugs.includes('where-winds-meet') && launchedSlugs.includes('honkai-star-rail'),
    'Launched games contains exactly strinova-vn, where-winds-meet, honkai-star-rail',
    `Slugs: ${launchedSlugs.join(', ')}`);

  // 2. Check 3 Roblox Games & Exact Codes
  const chickenCodes = canonical.crawlerPendingCodes.filter(c => c.gameSlug === 'grow-a-chicken-fighter');
  const armyCodes = canonical.crawlerPendingCodes.filter(c => c.gameSlug === 'command-an-army');
  const cleanCodes = canonical.crawlerPendingCodes.filter(c => c.gameSlug === 'dig-and-clean');

  assert(chickenCodes.length === 8, 'Grow a Chicken Fighter has exactly 8 codes', `Found: ${chickenCodes.length}`);
  assert(armyCodes.length === 7, 'Command an Army has exactly 7 codes', `Found: ${armyCodes.length}`);
  assert(cleanCodes.length === 7, 'Dig and Clean has exactly 7 codes', `Found: ${cleanCodes.length}`);

  const hasSpecificChickenCode = chickenCodes.some(c => c.code === 'DINOCHICKEN' && c.rewards.includes('Gói quà tân thủ khủng'));
  assert(hasSpecificChickenCode, 'Grow a Chicken Fighter code DINOCHICKEN has exact rewards');

  // 3. Check Avatar Land & AL-PNVN26
  const games188 = JSON.parse(fs.readFileSync('src/data/games188.json', 'utf8'));
  assert(games188.length === 560, 'Catalog has exactly 560 games', `Found: ${games188.length}`);

  const avatarLand = games188.find(g => g.slug === 'avatar-land');
  assert(!!avatarLand, 'Avatar Land exists in games188.json');
  assert(avatarLand?.codes_count === 1, 'Avatar Land codes_count === 1');
  assert(avatarLand?.instructions === '', 'Avatar Land instructions is empty string (no generic placeholder)');

  const avatarCode = (avatarLand?.codes || [])[0];
  assert(avatarCode?.code === 'AL-PNVN26', 'Avatar Land code is AL-PNVN26');
  assert(avatarCode?.expires_at === '2026-10-25', 'AL-PNVN26 expires on 2026-10-25 (no artificial extension)');

  // 4. Check Prerendered HTML for Avatar Land
  const avatarHtmlPath = path.resolve('dist/game/avatar-land/index.html');
  assert(fs.existsSync(avatarHtmlPath), 'dist/game/avatar-land/index.html prerender exists');
  const avatarHtml = fs.readFileSync(avatarHtmlPath, 'utf8');
  assert(avatarHtml.includes('AL-PNVN26'), 'Prerender HTML includes AL-PNVN26');
  assert(avatarHtml.includes('2026-10-25'), 'Prerender HTML includes 2026-10-25');
  assert(!avatarHtml.includes('Hướng Dẫn Nhập Code'), 'Prerender HTML has no instructions header');

  // 5. Search Regression Tests
  const { smartVietnameseMatch } = require('../src/utils/textUtils.ts');
  const searchTests = [
    { query: 'Ky Tich Tro Lai', expectedSlug: 'ky-tich-tro-lai', shouldFind: true },
    { query: 'Thuc Than Ky', expectedSlug: 'thuc-than-ky', shouldFind: true },
    { query: 'Kỳ Tích Trở Lại', expectedSlug: 'ky-tich-tro-lai', shouldFind: true },
    { query: 'thuc-than-ky', expectedSlug: 'thuc-than-ky', shouldFind: true },
    { query: 'Genshin', expectedSlug: 'genshin-impact', shouldFind: true },
    { query: 'Thực Thần Ký', expectedSlug: 'thuc-than-ky', shouldFind: true },
  ];

  for (const st of searchTests) {
    const matches = games188.filter(g => {
      const q = st.query.toLowerCase().trim();
      const name = (g.name || '').toLowerCase();
      const slug = (g.slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q) || smartVietnameseMatch(name, q);
    });
    const found = matches.some(m => m.slug === st.expectedSlug);
    assert(found === st.shouldFind, `Search query "${st.query}" matches expected ${st.shouldFind}`);
  }

  // 6. Check Zero Test Artifacts via Official Audit
  try {
    execSync('node scripts/audit_zero_test_artifacts.cjs', { stdio: 'pipe' });
    assert(true, 'Zero test artifacts verified by audit_zero_test_artifacts.cjs (Rule 7)');
  } catch (err) {
    assert(false, 'audit_zero_test_artifacts.cjs failed', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests();
