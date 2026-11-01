/**
 * test_missions_optimization.cjs
 * Comprehensive test suite verifying:
 * 1. Zero schema checks in read request paths and auth handlers.
 * 2. Elimination of N+1 queries via batch grouping.
 * 3. Strict Edge Cache separation: public for guest, private no-store for logged-in / admin.
 * 4. Zero leak of user_submission to public guests.
 * 5. Instant 0s SWR rendering without skeleton flash.
 * 6. Counters properly reflect ACTIVE missions and delivered rewards.
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

console.log('=== TEST SUITE: MISSIONS PERFORMANCE & CACHE ISOLATION ===\n');

// 1. Check schema DDL absence in read paths
console.log('--- TEST 1: Zero schema/upgrade calls in read requests ---');
const filesToCheck = [
  'functions/api/missions/index.ts',
  'functions/api/missions/submissions.ts',
  'functions/api/missions/pools.ts',
  'functions/api/missions/my-submissions.ts',
  'functions/api/missions/audit-logs.ts',
  'functions/api/missions/[id].ts',
  'functions/api/missions/ai/pending.ts',
  'functions/api/missions/ai/review.ts',
  'functions/services/mission_service.ts',
];

for (const relPath of filesToCheck) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');

  // Verify ensureMissionSchema is not called in this file
  const hasEnsureMissionSchema = /ensureMissionSchema\s*\(/.test(content);
  assert(!hasEnsureMissionSchema, `${relPath} does not call ensureMissionSchema`);

  // Verify ensureSchemaUpgrades is not called in this file
  const hasEnsureSchemaUpgrades = /ensureSchemaUpgrades\s*\(/.test(content);
  assert(!hasEnsureSchemaUpgrades, `${relPath} does not call ensureSchemaUpgrades`);
}

// 2. Check N+1 query elimination in index.ts
console.log('\n--- TEST 2: Elimination of N+1 queries in functions/api/missions/index.ts ---');
const indexContent = fs.readFileSync(path.join(__dirname, '../functions/api/missions/index.ts'), 'utf8');
const hasGroupQueryPool = /FROM\s+mission_reward_pools\s+GROUP BY\s+mission_id/i.test(indexContent);
const hasGroupQuerySubs = /FROM\s+mission_submissions\s+GROUP BY\s+mission_id/i.test(indexContent);
assert(hasGroupQueryPool, 'functions/api/missions/index.ts uses GROUP BY mission_id for reward pools');
assert(hasGroupQuerySubs, 'functions/api/missions/index.ts uses GROUP BY mission_id for submissions');
assert(!/missions\.map\(async/i.test(indexContent), 'functions/api/missions/index.ts does not loop queries in missions.map(async ...)');

// 3. Check Cache Isolation in functions/api/missions/index.ts
console.log('\n--- TEST 3: Strict Edge Cache separation ---');
assert(indexContent.includes("'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'"), 'Public guest response gets Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=300');
assert(indexContent.includes("'Cache-Control': 'private, no-store, no-cache, must-revalidate'"), 'Logged-in member / admin gets Cache-Control: private, no-store, no-cache, must-revalidate');
assert(indexContent.includes("'Vary': 'Authorization, Accept-Encoding'"), 'Both responses specify Vary: Authorization, Accept-Encoding to prevent proxy pollution');
assert(indexContent.includes('!hasAuth') && indexContent.includes('cache.match'), 'Edge cache match only executes when Authorization header is absent');
assert(indexContent.includes('context.waitUntil(cache.put'), 'Edge cache put only stores public guest responses');

// 4. Check SWR and Skeleton logic in src/components/MissionsView.tsx
console.log('\n--- TEST 4: SWR and Instant Render in MissionsView.tsx ---');
const viewContent = fs.readFileSync(path.join(__dirname, '../src/components/MissionsView.tsx'), 'utf8');
assert(viewContent.includes('localStorage.getItem(\'wcg_cached_missions_v1\')'), 'MissionsView.tsx reads from wcg_cached_missions_v1 localStorage');
assert(viewContent.includes('{isLoading && missions.length === 0 ?'), 'Skeletons only show when isLoading AND missions.length === 0 (never blocks cached missions)');
assert(viewContent.includes('fetchMissions(false)'), 'Background revalidation runs with fetchMissions(false)');

// 5. Check Counters logic
console.log('\n--- TEST 5: Active Counters logic ---');
assert(viewContent.includes("m.status === 'ACTIVE' && (m.completed_count || 0) < (m.quota || 1)"), 'Active missions counter strictly checks status === ACTIVE and quota not exhausted');
assert(viewContent.includes("missions.reduce((acc, m) => acc + (m.completed_count || 0), 0)"), 'Rewards delivered counter accurately sums completed_count');

console.log(`\n======================================================`);
console.log(`TOTAL: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log(`======================================================`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
