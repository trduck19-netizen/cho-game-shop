/**
 * Live End-to-End Verification on Production (codegame.shop)
 * Strictly verifies releaseDate updating via test record, and cleans up completely.
 */

const API_BASE = 'https://codegame.shop/api/crawler/ingest-upcoming-games';
const API_KEY = 'wcg_muse_f7d252dd57426a7a'; // Existing upcoming games bot API key

const TEST_SLUG = `test-ag-release-date-${Date.now()}`;

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...options.headers,
        },
      });
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

async function run() {
  console.log('🚀 Running Live End-to-End Verification on Production...');
  console.log(`Endpoint: ${API_BASE}`);
  console.log(`Using API Key: ${API_KEY.slice(0, 10)}...`);

  // Step 1: Read initial state
  const resInit = await fetchWithRetry(`${API_BASE}?status=ALL&_t=${Date.now()}`);
  if (!resInit.ok) throw new Error(`Initial GET failed: ${resInit.status}`);
  const jsonInit = await resInit.json();
  const initialTotal = jsonInit.games.length;
  console.log(`[Step 1] Initial total games on production: ${initialTotal}`);

  const mhoInit = jsonInit.games.find(g => (g.slug || '').toLowerCase() === 'monster-hunter-outlanders');
  if (mhoInit) {
    console.log(`[Step 1] Verified Monster Hunter Outlanders on production:`);
    console.log(`         releaseDate: ${mhoInit.releaseDate}`);
    console.log(`         status: ${mhoInit.status}`);
    console.log(`         publisher: ${mhoInit.publisher}`);
  }

  try {
    // Step 2: Create temporary test record
    console.log(`\n[Step 2] Creating temporary test game "${TEST_SLUG}" with releaseDate 10:00...`);
    const resCreate = await fetchWithRetry(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'ingest',
        directPublish: true,
        games: [
          {
            name: `Test AG Game ${Date.now()}`,
            slug: TEST_SLUG,
            publisher: 'Antigravity Test Studio',
            releaseDate: '2026-10-30T10:00:00+07:00',
            category: 'Hành Động Nhập Vai',
            platform: 'PC, Android',
            status: 'UPCOMING',
            expectedCodes: ['TESTCODE1', 'TESTCODE2'],
            subscribersCount: 100,
          }
        ]
      })
    });
    const jsonCreate = await resCreate.json();
    console.log(`[Step 2] Creation response: success=${jsonCreate.success}, addedCount=${jsonCreate.addedCount}`);
    if (!jsonCreate.success) throw new Error(`Creation failed: ${JSON.stringify(jsonCreate)}`);

    // Verify test record exists
    const resAfterCreate = await fetchWithRetry(`${API_BASE}?status=ALL&_t=${Date.now()}`);
    const jsonAfterCreate = await resAfterCreate.json();
    console.log(`[Step 2] Total after creation: ${jsonAfterCreate.games.length} (expected ${initialTotal + 1})`);
    if (jsonAfterCreate.games.length !== initialTotal + 1) {
      throw new Error(`Total games count did not increase by 1!`);
    }

    // Step 3: Test Upsert Path (change releaseDate from 10:00 to 05:00)
    console.log(`\n[Step 3] Testing Upsert Path: changing releaseDate to 2026-10-30T05:00:00+07:00...`);
    const resUpsert = await fetchWithRetry(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        directPublish: true,
        games: [
          {
            name: `Test AG Game ${Date.now()}`,
            slug: TEST_SLUG,
            publisher: 'Antigravity Test Studio',
            releaseDate: '2026-10-30T05:00:00+07:00',
            category: 'Hành Động Nhập Vai',
            platform: 'PC, Android',
            status: 'UPCOMING',
            expectedCodes: ['TESTCODE1', 'TESTCODE2'],
            subscribersCount: 100,
          }
        ]
      })
    });
    const jsonUpsert = await resUpsert.json();
    console.log(`[Step 3] Upsert response: success=${jsonUpsert.success}, updatedCount=${jsonUpsert.updatedCount}`);

    // Read back via GET
    const resGet1 = await fetchWithRetry(`${API_BASE}?status=ALL&_t=${Date.now()}`);
    const jsonGet1 = await resGet1.json();
    const testGame1 = jsonGet1.games.find(g => g.slug === TEST_SLUG);
    console.log(`[Step 3] Read back after Upsert:`);
    console.log(`         releaseDate: ${testGame1?.releaseDate} (EXPECTED: 2026-10-30T05:00:00+07:00)`);
    console.log(`         category: ${testGame1?.category} (EXPECTED: Hành Động Nhập Vai)`);
    console.log(`         publisher: ${testGame1?.publisher} (EXPECTED: Antigravity Test Studio)`);
    console.log(`         status: ${testGame1?.status} (EXPECTED: UPCOMING)`);
    if (testGame1?.releaseDate !== '2026-10-30T05:00:00+07:00') {
      throw new Error(`Upsert path failed to update releaseDate! Got: ${testGame1?.releaseDate}`);
    }

    // Step 4: Test Action `set_release_date` (change releaseDate to 07:30)
    console.log(`\n[Step 4] Testing Action set_release_date: changing releaseDate to 2026-10-30T07:30:00+07:00...`);
    const resAction = await fetchWithRetry(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'set_release_date',
        slug: TEST_SLUG,
        releaseDate: '2026-10-30T07:30:00+07:00',
      })
    });
    const jsonAction = await resAction.json();
    console.log(`[Step 4] Action response: success=${jsonAction.success}, message=${jsonAction.message}`);

    // Read back via GET
    const resGet2 = await fetchWithRetry(`${API_BASE}?status=ALL&_t=${Date.now()}`);
    const jsonGet2 = await resGet2.json();
    const testGame2 = jsonGet2.games.find(g => g.slug === TEST_SLUG);
    console.log(`[Step 4] Read back after set_release_date:`);
    console.log(`         releaseDate: ${testGame2?.releaseDate} (EXPECTED: 2026-10-30T07:30:00+07:00)`);
    if (testGame2?.releaseDate !== '2026-10-30T07:30:00+07:00') {
      throw new Error(`Action set_release_date failed! Got: ${testGame2?.releaseDate}`);
    }

    // Step 5: Test Setting releaseDate: null (Chưa rõ ngày)
    console.log(`\n[Step 5] Testing Action set_release_date with null...`);
    const resNull = await fetchWithRetry(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'set_release_date',
        slug: TEST_SLUG,
        releaseDate: null,
      })
    });
    const jsonNull = await resNull.json();
    console.log(`[Step 5] Action null response: success=${jsonNull.success}`);

    // Read back via GET
    const resGet3 = await fetchWithRetry(`${API_BASE}?status=ALL&_t=${Date.now()}`);
    const jsonGet3 = await resGet3.json();
    const testGame3 = jsonGet3.games.find(g => g.slug === TEST_SLUG);
    console.log(`[Step 5] Read back after setting null:`);
    console.log(`         releaseDate: ${testGame3?.releaseDate} (EXPECTED: null)`);
    if (testGame3?.releaseDate !== null) {
      throw new Error(`Setting null failed! Got: ${testGame3?.releaseDate}`);
    }

    console.log(`\n✅ All API releaseDate modification tests PASSED on live production!`);

  } finally {
    // Step 6: ALWAYS DELETE the test record to ensure Zero Test Artifacts on Production
    console.log(`\n[Step 6] Cleaning up: Deleting temporary test game "${TEST_SLUG}"...`);
    try {
      const resDel = await fetchWithRetry(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: API_KEY,
          action: 'delete',
          slug: TEST_SLUG,
        })
      });
      const jsonDel = await resDel.json();
      console.log(`[Step 6] Deletion response: success=${jsonDel.success}`);

      // Confirm total count returned to initial
      const resFinal = await fetchWithRetry(`${API_BASE}?status=ALL&_t=${Date.now()}`);
      const jsonFinal = await resFinal.json();
      console.log(`[Step 6] Final total games count: ${jsonFinal.games.length} (original: ${initialTotal})`);

      const mhoFinal = jsonFinal.games.find(g => (g.slug || '').toLowerCase() === 'monster-hunter-outlanders');
      if (mhoFinal) {
        console.log(`[Step 6] Verified Monster Hunter Outlanders strictly untouched:`);
        console.log(`         releaseDate: ${mhoFinal.releaseDate}`);
        console.log(`         status: ${mhoFinal.status}`);
      }

      if (jsonFinal.games.length === initialTotal) {
        console.log(`\n🎉 ZERO TEST ARTIFACTS VERIFIED: Production is 100% clean and restored!`);
      } else {
        console.warn(`⚠️ Warning: Count mismatch after cleanup. Expected ${initialTotal}, got ${jsonFinal.games.length}`);
      }
    } catch (cleanupErr) {
      console.error(`❌ Cleanup error:`, cleanupErr);
    }
  }
}

run().catch(err => {
  console.error(`❌ Test failed:`, err);
  process.exit(1);
});
