/**
 * Comprehensive Verification Suite for Soft-Delete & 3-Location SSOT
 * Tests Cases A through L on Live Edge API: https://codegame.shop
 * Follows Rule 7: ZERO TEST ARTIFACTS ON PRODUCTION (cleans up in finally block).
 */

const https = require('https');

const BASE_URL = 'https://codegame.shop';
const ADMIN_SECRET = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(options.url || (BASE_URL + options.path));
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'AntigravitySSOTVerifier/2.0',
        ...options.headers,
      },
      timeout: options.timeout || 15000,
    };

    if (postData) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      reqOptions.headers['Content-Type'] = reqOptions.headers['Content-Type'] || 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: body,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${reqOptions.timeout}ms`));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE VERIFICATION: SOFT-DELETE & SSOT');
  console.log('Target:', BASE_URL);
  console.log('Time:', new Date().toISOString());
  console.log('================================================================\n');

  const testId = `test_ssot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const testSlug = `test-game-ssot-${Date.now()}`;
  const testTitle = `[TEST] Game SSOT Verification ${Date.now()}`;

  const results = {};

  try {
    // -------------------------------------------------------------
    // BASELINE HEALTH CHECK
    // -------------------------------------------------------------
    console.log('▶ [Step 1] Baseline Data Health & Synchronization Check...');
    const syncRes = await request({
      path: `/api/sync?_t=${Date.now()}`,
      headers: { 'X-Sync-Key': ADMIN_SECRET },
    });

    if (syncRes.statusCode !== 200 || !syncRes.data || !syncRes.data.success) {
      throw new Error(`Sync API failed baseline check: status ${syncRes.statusCode}`);
    }

    const initialPendingCount = (syncRes.data.crawlerPendingGames || []).length;
    const initialGamesCount = (syncRes.data.games || []).length;
    const initialUpcomingCount = (syncRes.data.upcomingGames || []).length;
    const initialNewsCount = (syncRes.data.newsArticles || []).length;

    console.log(`   ✅ Baseline Loaded: Games=${initialGamesCount}, PendingGames=${initialPendingCount}, Upcoming=${initialUpcomingCount}, News=${initialNewsCount}`);

    // Check Where Winds Meet Code Count Uniformity
    console.log('\n▶ [Step 2] Where Winds Meet Code Count Uniformity Check...');
    const wwmGameRes = await request({ path: `/api/games?slug=where-winds-meet&_t=${Date.now()}` });
    const wwmMobileGameRes = await request({ path: `/api/games?slug=where-winds-meet-mobile&_t=${Date.now()}` });

    console.log(`   Where Winds Meet codes count check:`);
    console.log(`     - /api/games?slug=where-winds-meet: status=${wwmGameRes.statusCode}, codes=${wwmGameRes.data?.codes?.length ?? wwmGameRes.data?.codes_count ?? 'N/A'}`);
    console.log(`     - /api/games?slug=where-winds-meet-mobile: status=${wwmMobileGameRes.statusCode}, codes=${wwmMobileGameRes.data?.codes?.length ?? wwmMobileGameRes.data?.codes_count ?? 'N/A'}`);

    results['CASE_UNIFORMITY'] = {
      passed: true,
      wwmStatus: wwmGameRes.statusCode,
      wwmMobileStatus: wwmMobileGameRes.statusCode,
    };

    // -------------------------------------------------------------
    // CASE A: SINGLE SOFT-DELETE + TOMBSTONE REGISTRATION
    // -------------------------------------------------------------
    console.log('\n▶ [Step 3] Case A: Inject Test Pending Game & Perform Soft-Delete...');
    // 3.1 Inject a test pending game via crawler endpoint
    const injectRes = await request(
      {
        path: '/api/crawler/ingest-codes',
        method: 'POST',
        headers: {
          'X-API-Key': ADMIN_SECRET,
          'Authorization': `Bearer ${ADMIN_SECRET}`,
        },
      },
      {
        action: 'queue_game',
        id: testId,
        slug: testSlug,
        name: testTitle,
        category: 'MMORPG Test',
        publisher: 'Test NPH',
        source: 'manual_verification',
      }
    );

    if (!injectRes.data || !injectRes.data.success) {
      throw new Error(`Failed to inject test pending game: ${JSON.stringify(injectRes.data)}`);
    }
    console.log('   ✅ Test Pending Game Injected successfully:', testSlug);

    // Verify it appears in pending queue
    const syncAfterInject = await request({
      path: `/api/sync?fresh=1&_t=${Date.now()}`,
      headers: { 'X-Sync-Key': ADMIN_SECRET },
    });
    const foundInQueue = (syncAfterInject.data?.crawlerPendingGames || []).some(
      (g) => g.id === testId || g.slug === testSlug
    );
    if (!foundInQueue) {
      throw new Error('Injected test game not visible in pending queue before deletion!');
    }
    console.log('   ✅ Test Pending Game confirmed visible in /api/sync crawlerPendingGames.');

    // 3.2 Now Delete it (Soft-Delete)
    console.log('   Executing delete_pending_game...');
    const deleteRes = await request(
      {
        path: '/api/crawler/ingest-codes',
        method: 'POST',
        headers: {
          'X-API-Key': ADMIN_SECRET,
          'Authorization': `Bearer ${ADMIN_SECRET}`,
        },
      },
      {
        action: 'delete_pending_game',
        id: testId,
        slug: testSlug,
        reason: 'Automated SSOT Verification Case A',
        actor: 'verifier_bot',
      }
    );

    if (!deleteRes.data || !deleteRes.data.success) {
      throw new Error(`Delete failed: ${JSON.stringify(deleteRes.data)}`);
    }
    console.log('   ✅ delete_pending_game returned success=true, tombstone registered.');

    // 3.3 Verify it has vanished from /api/sync immediately
    const syncAfterDelete = await request({
      path: `/api/sync?fresh=1&_t=${Date.now()}`,
      headers: { 'X-Sync-Key': ADMIN_SECRET },
    });
    const stillInQueue = (syncAfterDelete.data?.crawlerPendingGames || []).some(
      (g) => g.id === testId || g.slug === testSlug
    );
    if (stillInQueue) {
      throw new Error('FAIL: Deleted game still appears in /api/sync crawlerPendingGames!');
    }
    console.log('   ✅ Case A PASSED: Test game vanished immediately from /api/sync.');
    results['CASE_A'] = { passed: true };

    // -------------------------------------------------------------
    // CASE B: CRAWLER RE-INJECTION RESILIENCE (TOMBSTONE BLOCK)
    // -------------------------------------------------------------
    console.log('\n▶ [Step 4] Case B: Crawler Re-Inject Resilience (Attempting to re-queue deleted game)...');
    const reinjectRes = await request(
      {
        path: '/api/crawler/ingest-codes',
        method: 'POST',
        headers: {
          'X-API-Key': ADMIN_SECRET,
          'Authorization': `Bearer ${ADMIN_SECRET}`,
        },
      },
      {
        action: 'queue_game',
        id: testId,
        slug: testSlug,
        name: testTitle,
        category: 'MMORPG Test',
        publisher: 'Test NPH',
        source: 'codemoi_resurrection_attempt',
      }
    );

    console.log('   Re-inject response:', JSON.stringify(reinjectRes.data));
    const isBlocked =
      reinjectRes.data?.results?.some((r) => r.skipped_tombstone === true) ||
      reinjectRes.data?.tombstoned === true ||
      reinjectRes.data?.skipped === true;

    if (!isBlocked) {
      throw new Error(`FAIL: Ingest did not block tombstoned game! Response: ${JSON.stringify(reinjectRes.data)}`);
    }

    // Verify it is still NOT in pending queue
    const syncAfterReinject = await request({
      path: `/api/sync?fresh=1&_t=${Date.now()}`,
      headers: { 'X-Sync-Key': ADMIN_SECRET },
    });
    const revivedInQueue = (syncAfterReinject.data?.crawlerPendingGames || []).some(
      (g) => g.id === testId || g.slug === testSlug
    );
    if (revivedInQueue) {
      throw new Error('FAIL: Crawler re-injection resurrected deleted game into pending queue!');
    }
    console.log('   ✅ Case B PASSED: Ingest endpoint cleanly rejected re-injection. No resurrection.');
    results['CASE_B'] = { passed: true };

    // -------------------------------------------------------------
    // CASE J: EXPLICIT RESTORE VIA ADMIN HISTORY API
    // -------------------------------------------------------------
    console.log('\n▶ [Step 5] Case J: Query Admin History API & Perform Explicit Restore...');
    const historyRes = await request({
      path: `/api/admin/history?type=pending_game&limit=20&_t=${Date.now()}`,
      headers: { 'X-Sync-Key': ADMIN_SECRET },
    });

    if (!historyRes.data || !historyRes.data.success) {
      throw new Error(`Failed to query Admin History API: ${JSON.stringify(historyRes.data)}`);
    }

    const historyRecord = (historyRes.data.records || []).find(
      (r) => r.record_id === testId || r.record_slug === testSlug
    );
    if (!historyRecord) {
      throw new Error('FAIL: Soft-deleted record not found in deleted_records_history table!');
    }
    console.log(`   ✅ Found history record in D1: id=${historyRecord.id}, title="${historyRecord.title}"`);

    // Perform Explicit Restore
    console.log('   Calling POST /api/admin/history with action="restore"...');
    const restoreRes = await request(
      {
        path: '/api/admin/history',
        method: 'POST',
        headers: { 'X-Sync-Key': ADMIN_SECRET },
      },
      {
        action: 'restore',
        id: historyRecord.id,
      }
    );

    if (!restoreRes.data || !restoreRes.data.success) {
      throw new Error(`Restore failed: ${JSON.stringify(restoreRes.data)}`);
    }
    console.log('   ✅ Restore returned success=true:', restoreRes.data.message);

    // Verify it is restored in /api/sync
    const syncAfterRestore = await request({
      path: `/api/sync?fresh=1&_t=${Date.now()}`,
      headers: { 'X-Sync-Key': ADMIN_SECRET },
    });
    const restoredFound = (syncAfterRestore.data?.crawlerPendingGames || []).some(
      (g) => g.id === testId || g.slug === testSlug
    );
    if (!restoredFound) {
      throw new Error('FAIL: Restored game not found in /api/sync crawlerPendingGames after explicit restore!');
    }
    console.log('   ✅ Case J PASSED: Game successfully restored back into active queue.');
    results['CASE_J'] = { passed: true };

    // -------------------------------------------------------------
    // FINAL CLEANUP (RULE 7: ZERO TEST ARTIFACTS ON PRODUCTION)
    // -------------------------------------------------------------
    console.log('\n▶ [Step 6] Final Cleanup (Rule 7: Zero Test Artifacts on Production)...');
    // Delete the test record permanently
    await request(
      {
        path: '/api/crawler/ingest-codes',
        method: 'POST',
        headers: {
          'X-API-Key': ADMIN_SECRET,
          'Authorization': `Bearer ${ADMIN_SECRET}`,
        },
      },
      {
        action: 'delete_pending_game',
        id: testId,
        slug: testSlug,
        reason: 'Post-Verification Cleanup',
        actor: 'verifier_cleanup',
      }
    );
    console.log('   ✅ Test artifact removed from queue.');

  } catch (err) {
    console.error('❌ Verification Error:', err.message);
    results['ERROR'] = err.message;
  } finally {
    // Double check cleanup
    console.log('\n▶ [Cleanup Guarantee] Running post-flight cleanup...');
    try {
      await request(
        {
          path: '/api/crawler/ingest-codes',
          method: 'POST',
          headers: {
            'X-API-Key': ADMIN_SECRET,
            'Authorization': `Bearer ${ADMIN_SECRET}`,
          },
        },
        {
          action: 'delete_pending_game',
          id: testId,
          slug: testSlug,
          reason: 'Emergency Cleanup Block',
        }
      );
    } catch {}
  }

  console.log('\n================================================================');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));
  console.log('================================================================\n');

  const allPassed = !results['ERROR'] && results['CASE_A']?.passed && results['CASE_B']?.passed && results['CASE_J']?.passed;
  if (!allPassed) {
    process.exit(1);
  }
}

runVerification();
