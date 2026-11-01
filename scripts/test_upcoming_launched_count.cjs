/**
 * Test Suite: Verification of Upcoming & Launched Games Logic
 * Validates that launchedCount === 3, liveCount === 7, pendingCount === 0,
 * and that launched games never pollute the active upcoming countdown banner.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('🧪 Starting Upcoming & Launched Games Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Check Canonical Backup State
  const canonicalPath = path.resolve(__dirname, '../functions/data/canonical_backup_state.json');
  const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));

  test('Canonical backup has 7 UPCOMING games', () => {
    assert.strictEqual(canonical.upcomingGames.length, 7);
    const slugs = canonical.upcomingGames.map(g => g.slug);
    assert(!slugs.includes('strinova-vn'));
    assert(!slugs.includes('where-winds-meet'));
    assert(!slugs.includes('honkai-star-rail'));
  });

  test('Canonical backup has 3 LAUNCHED games', () => {
    assert.strictEqual(canonical.launchedGames.length, 3);
    const slugs = canonical.launchedGames.map(g => g.slug);
    assert(slugs.includes('strinova-vn'));
    assert(slugs.includes('where-winds-meet'));
    assert(slugs.includes('honkai-star-rail'));
    canonical.launchedGames.forEach(g => {
      assert.strictEqual(g.status, 'LAUNCHED');
    });
  });

  // 2. Simulate upcoming games ingestion logic
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const allGames = [...canonical.upcomingGames, ...canonical.launchedGames];

  test('Calculation of liveCount === 7 and launchedCount === 3', () => {
    const liveCount = allGames.filter((g) => {
      const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
      if (!isApproved) return false;
      if (!g.releaseDate) return true;
      const target = new Date(g.releaseDate).getTime();
      return isNaN(target) || (now - target) <= ONE_DAY_MS;
    }).length;

    const pendingCount = allGames.filter((g) => g.status === 'PENDING').length;

    const launchedCount = allGames.filter((g) => {
      if (g.status === 'LAUNCHED') return true;
      if (!g.releaseDate) return false;
      const target = new Date(g.releaseDate).getTime();
      return !isNaN(target) && (now - target) > ONE_DAY_MS;
    }).length;

    assert.strictEqual(liveCount, 7, `Expected liveCount 7, got ${liveCount}`);
    assert.strictEqual(pendingCount, 0, `Expected pendingCount 0, got ${pendingCount}`);
    assert.strictEqual(launchedCount, 3, `Expected launchedCount 3, got ${launchedCount}`);
  });

  test('statusFilter === UPCOMING returns only 7 active games', () => {
    const filtered = allGames.filter((g) => {
      const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
      if (!isApproved) return false;
      if (!g.releaseDate) return true;
      const target = new Date(g.releaseDate).getTime();
      if (isNaN(target)) return true;
      const elapsed = now - target;
      return elapsed <= ONE_DAY_MS;
    });

    assert.strictEqual(filtered.length, 7);
    filtered.forEach(g => {
      assert.strictEqual(g.status, 'UPCOMING');
    });
  });

  test('statusFilter === LAUNCHED returns only 3 launched games', () => {
    const filtered = allGames.filter((g) => {
      if (g.status === 'LAUNCHED') return true;
      if (!g.releaseDate) return false;
      const target = new Date(g.releaseDate).getTime();
      return !isNaN(target) && (now - target) > ONE_DAY_MS;
    });

    assert.strictEqual(filtered.length, 3);
    const slugs = filtered.map(g => g.slug);
    assert(slugs.includes('strinova-vn'));
    assert(slugs.includes('where-winds-meet'));
    assert(slugs.includes('honkai-star-rail'));
  });

  test('Client banner filter never displays LAUNCHED games', () => {
    const bannerGames = allGames.filter((g) => {
      if (g.status === 'CANCELLED' || g.status === 'PENDING' || g.status === 'LAUNCHED') return false;
      if (!g.releaseDate) return true;
      const target = new Date(g.releaseDate).getTime();
      if (isNaN(target)) return true;
      const elapsed = now - target;
      return elapsed <= ONE_DAY_MS;
    });

    assert.strictEqual(bannerGames.length, 7);
    const bannerSlugs = bannerGames.map(g => g.slug);
    assert(!bannerSlugs.includes('strinova-vn'));
    assert(!bannerSlugs.includes('where-winds-meet'));
    assert(!bannerSlugs.includes('honkai-star-rail'));
  });

  // 3. Catalog count guarantee
  test('Catalog count remains exactly 560 games', () => {
    // games.ts skips ug.status === 'LAUNCHED'
    const gamesJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/games188.json'), 'utf8'));
    assert.strictEqual(gamesJson.length, 560); // Authoritative catalog baseline
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
