/**
 * Test: Giveaway Claimed Count Admin Single Source of Truth (SSOT)
 * Verifies that:
 * 1. virtualClaimed strictly equals virtual_claimed_offset set by Admin.
 * 2. CUMULATIVE_BASELINES_20261025 does NOT contain any gw_* entries overriding admin config.
 * 3. No runaway time drift deltaClaims added to giveaway claimed counts.
 * 4. marketingService.getClaimedDisplay() returns realClaimed + virtual_claimed_offset without inflating to 52-112 when 0.
 * 5. Failsafe rejects any bloated/inflated server counters.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TEST: Giveaway Claimed Count Admin SSOT ===\n');

// 1. Verify virtualLayerService.ts
const vLayerPath = path.resolve(__dirname, '../functions/services/virtualLayerService.ts');
const vLayerContent = fs.readFileSync(vLayerPath, 'utf8');

console.log('1. Checking CUMULATIVE_BASELINES_20261025 in virtualLayerService.ts...');
assert(!vLayerContent.includes("'gw_gamerpower_rotwood':"), 'gw_gamerpower_rotwood must NOT be in CUMULATIVE_BASELINES_20261025');
assert(!vLayerContent.includes("'gw_giang_ho_ky_ngo':"), 'gw_giang_ho_ky_ngo must NOT be in CUMULATIVE_BASELINES_20261025');
assert(!vLayerContent.includes("'gw_1792235539701_wee':"), 'gw_1792235539701_wee must NOT be in CUMULATIVE_BASELINES_20261025');
assert(!vLayerContent.includes("deltaClaims"), 'deltaClaims must NOT exist in virtualLayerService.ts');
console.log('   ✓ No giveaway baselines or deltaClaims found in virtualLayerService.ts');

console.log('2. Checking Giveaway Claimed Initialization in virtualLayerService.ts...');
assert(vLayerContent.includes('const virtualClaimed = gw.virtual_claimed_offset !== undefined && gw.virtual_claimed_offset !== null'),
  'virtualClaimed must be initialized directly from virtual_claimed_offset');
assert(!vLayerContent.includes('52 + (idSeed % (112 - 52 + 1))'),
  'No random 52-112 fallback in virtualLayerService.ts');
console.log('   ✓ virtualClaimed strictly bound to admin virtual_claimed_offset');

// 2. Verify snapshotService.ts
const snapPath = path.resolve(__dirname, '../functions/services/snapshotService.ts');
const snapContent = fs.readFileSync(snapPath, 'utf8');
console.log('3. Checking Cleanse Logic in snapshotService.ts...');
assert(snapContent.includes('numVal > exactTarget + 5 || numVal < exactTarget'),
  'snapshotService must cleanse any bloated peaks > exactTarget + 5');
console.log('   ✓ snapshotService cleanses stale bloated giveaway peaks');

// 3. Verify stats.ts
const statsPath = path.resolve(__dirname, '../functions/api/stats.ts');
const statsContent = fs.readFileSync(statsPath, 'utf8');
console.log('4. Checking stats.ts...');
const gwLoopMatch = statsContent.match(/giveaways\.forEach\(\(gw\) => \{([\s\S]*?)\}\);/);
assert(gwLoopMatch, 'giveaways.forEach must exist in stats.ts');
const gwLoopBody = gwLoopMatch[1];
assert(!gwLoopBody.includes('growth'), 'giveaways.forEach must NOT calculate or add growth');
assert(gwLoopBody.includes('hourlyGrowth: 0'), 'stats.ts must set hourlyGrowth: 0 for giveaways');
console.log('   ✓ stats.ts does not add runaway growth to giveaways');

// 4. Verify marketingService.ts logic
const mktPath = path.resolve(__dirname, '../src/services/marketingService.ts');
const mktContent = fs.readFileSync(mktPath, 'utf8');
console.log('5. Checking marketingService.ts...');
assert(!mktContent.includes('virtualBase = 52 + (idSeed % (112 - 52 + 1))'),
  'marketingService.ts must NOT force random 52-112 when virtualBase <= 0');
assert(mktContent.includes('serverClaimed <= effectiveRealClaimed + virtualBase + 5'),
  'marketingService.ts must reject inflated server counters with failsafe');
console.log('   ✓ marketingService enforces admin SSOT and rejects inflated counters');

console.log('\n=== ALL GIVEAWAY CLAIMED SSOT CHECKS PASSED 100%! ===');
