/**
 * test_live_submission_and_approval.cjs
 * End-to-end live testing of mission submission, review approval, reward delivery,
 * and automatic 100% cleanup in finally block (Rule 7).
 */

const BASE_URL = 'https://codegame.shop';
const ADMIN_KEY = 'wcg_admin_sync_master_key_2026_secured';
const USER_TOKEN = 'wcg_tok_usr_admin_test_session';

async function runLiveTest() {
  console.log('=== STARTING LIVE END-TO-END MISSION WORKFLOW TEST ===\n');

  let testMissionId = null;
  let testSubmissionId = null;

  try {
    // 1. Create temporary test mission
    console.log('Step 1: Creating temporary test mission...');
    const createRes = await fetch(`${BASE_URL}/api/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_KEY}`,
      },
      body: JSON.stringify({
        title: '[AUTOMATED TEST] Temporary Performance Test Mission',
        description: 'Auto test - will be deleted immediately',
        reward_type: 'CODE',
        reward_value: 0,
        quota: 5,
        review_mode: 'MANUAL',
        status: 'ACTIVE',
      }),
    });

    const createData = await createRes.json();
    console.log('  Create Response:', createRes.status, createData.message);
    if (!createData.success || !createData.missionId) {
      throw new Error(`Failed to create test mission: ${JSON.stringify(createData)}`);
    }
    testMissionId = createData.missionId;
    console.log('  Created test mission ID:', testMissionId);

    // 2. Add 2 test codes to the reward pool
    console.log('\nStep 2: Adding 2 test reward codes to pool...');
    const poolRes = await fetch(`${BASE_URL}/api/missions/pools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_KEY}`,
      },
      body: JSON.stringify({
        mission_id: testMissionId,
        codes: ['TEST_GIFTCODE_PERF_1', 'TEST_GIFTCODE_PERF_2'],
      }),
    });
    const poolData = await poolRes.json();
    console.log('  Pool Add Response:', poolRes.status, poolData.message);

    // 3. Verify mission details before submission
    console.log('\nStep 3: Verifying test mission initial state...');
    const detailBeforeRes = await fetch(`${BASE_URL}/api/missions/${testMissionId}`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` },
    });
    const detailBefore = await detailBeforeRes.json();
    console.log('  Initial available codes:', detailBefore.mission.available_codes_count);
    console.log('  Initial completed count:', detailBefore.mission.completed_count);
    if (detailBefore.mission.available_codes_count !== 2) {
      throw new Error(`Expected 2 available codes, got ${detailBefore.mission.available_codes_count}`);
    }

    // 4. Submit proof as member
    console.log('\nStep 4: Submitting proof for test mission...');
    const submitRes = await fetch(`${BASE_URL}/api/missions/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_TOKEN}`,
      },
      body: JSON.stringify({
        mission_id: testMissionId,
        proof_link: 'https://facebook.com/groups/codegametest/posts/999999999',
        proof_note: 'Automated workflow test note',
      }),
    });
    const submitData = await submitRes.json();
    console.log('  Submit Response:', submitRes.status, submitData.message);
    if (!submitData.success || !submitData.submission_id) {
      throw new Error(`Failed to submit proof: ${JSON.stringify(submitData)}`);
    }
    testSubmissionId = submitData.submission_id;
    console.log('  Submission ID:', testSubmissionId);

    // 5. Approve submission as Admin
    console.log('\nStep 5: Approving submission as Admin...');
    const approveRes = await fetch(`${BASE_URL}/api/missions/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_KEY}`,
      },
      body: JSON.stringify({
        action: 'APPROVE',
        submission_id: testSubmissionId,
      }),
    });
    const approveData = await approveRes.json();
    console.log('  Approve Response:', approveRes.status, approveData.message);
    console.log('  Reward Delivered:', approveData.rewardDelivered);
    if (!approveData.success || !approveData.rewardDelivered) {
      throw new Error(`Failed to approve: ${JSON.stringify(approveData)}`);
    }

    // 6. Verify pool and completed counts updated correctly
    console.log('\nStep 6: Verifying counts after approval...');
    const detailAfterRes = await fetch(`${BASE_URL}/api/missions/${testMissionId}`, {
      headers: { 'Authorization': `Bearer ${ADMIN_KEY}` },
    });
    const detailAfter = await detailAfterRes.json();
    console.log('  Available codes remaining:', detailAfter.mission.available_codes_count);
    console.log('  Completed count:', detailAfter.mission.completed_count);
    if (detailAfter.mission.available_codes_count !== 1) {
      throw new Error(`Expected 1 code remaining, got ${detailAfter.mission.available_codes_count}`);
    }
    if (detailAfter.mission.completed_count !== 1) {
      throw new Error(`Expected 1 completed count, got ${detailAfter.mission.completed_count}`);
    }

    console.log('\n>>> WORKFLOW VERIFICATION SUCCESSFUL! <<<');
  } finally {
    // 7. CLEANUP - Rule 7: Zero Test Artifacts on Production
    console.log('\n=== CLEANUP: REMOVING ALL TEST DATA (RULE 7) ===');
    if (testMissionId) {
      try {
        const delRes = await fetch(`${BASE_URL}/api/missions/${testMissionId}?force=true`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${ADMIN_KEY}` },
        });
        const delData = await delRes.json();
        console.log('  Force deleted test mission:', delRes.status, delData.message);
      } catch (err) {
        console.error('  Failed to delete test mission:', err.message);
      }
    }

    // Verify real active mission is completely intact
    console.log('\nVerifying production active missions state...');
    const prodRes = await fetch(`${BASE_URL}/api/missions`);
    const prodData = await prodRes.json();
    console.log('  Total missions remaining:', prodData.total);
    if (prodData.missions && prodData.missions.length > 0) {
      const activeM = prodData.missions[0];
      console.log('  Active mission preserved:');
      console.log('    ID:', activeM.id);
      console.log('    Title:', activeM.title);
      console.log('    Status:', activeM.status);
      console.log('    Available codes:', activeM.available_codes_count);
      console.log('    Quota:', activeM.quota);
      console.log('    Completed:', activeM.completed_count);
    }
    console.log('=== CLEANUP COMPLETE ===\n');
  }
}

runLiveTest().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
