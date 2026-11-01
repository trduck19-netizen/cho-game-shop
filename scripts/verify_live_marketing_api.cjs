require('dotenv').config();

const secret = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

async function main() {
  console.log('=== 1. Test get_marketing_config via /api/crawler/marketing ===');
  const res1 = await fetch('https://codegame.shop/api/crawler/marketing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + secret
    },
    body: JSON.stringify({ action: 'get_marketing_config' })
  });
  console.log('HTTP Status:', res1.status);
  const data1 = await res1.json();
  console.log('Active Ratio:', data1.config?.statusExplanation?.activeTypesRatio);
  console.log('7/6 Explanation:', data1.config?.statusExplanation?.historicalTypoExplanation);
  console.log('Notification Types Breakdown:');
  for (const [k, v] of Object.entries(data1.config?.notificationTypes || {})) {
    console.log(`  - ${k} (${v.name}): ${v.effectivePercentage}% (Trọng số: ${v.rawWeight}, Đang bật: ${v.enabled})`);
  }

  console.log('\n=== 2. Test list_marketing_events via /api/crawler/marketing ===');
  const res2 = await fetch('https://codegame.shop/api/crawler/marketing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + secret
    },
    body: JSON.stringify({ action: 'list_marketing_events', limit: 5 })
  });
  console.log('HTTP Status:', res2.status);
  const data2 = await res2.json();
  console.log('Total Events Received:', data2.events?.length);
  if (data2.events?.length > 0) {
    console.log('First 2 Events:');
    console.log(JSON.stringify(data2.events.slice(0, 2), null, 2));
  }

  console.log('\n=== 3. Test get_marketing_config via /api/crawler/ingest-codes ===');
  const res3 = await fetch('https://codegame.shop/api/crawler/ingest-codes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + secret
    },
    body: JSON.stringify({ action: 'get_marketing_config' })
  });
  console.log('HTTP Status:', res3.status);
  const data3 = await res3.json();
  console.log('Success:', data3.success, 'activeTypesCount:', data3.config?.activeTypesCount);

  console.log('\n=== 4. Test Rejecting Query Param ?api_key= ===');
  const res4 = await fetch('https://codegame.shop/api/crawler/marketing?api_key=' + secret);
  console.log('HTTP Status (Expect 401):', res4.status);
  const data4 = await res4.json();
  console.log('Error message:', data4.error);

  console.log('\n=== 5. Test Public API Info (Zero Key Leakage) ===');
  const res5 = await fetch('https://codegame.shop/api/crawler/marketing');
  console.log('HTTP Status:', res5.status);
  const text5 = await res5.text();
  const hasSecret = text5.includes(secret) || text5.includes('wcg_muse_f7d252dd57426a7a');
  console.log('Zero Secret Leakage Guaranteed?:', !hasSecret);

  console.log('\n=== 6. Test Write Action Rejection with 403 Forbidden ===');
  const res6 = await fetch('https://codegame.shop/api/crawler/marketing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + secret
    },
    body: JSON.stringify({ action: 'update_marketing_config', typeWeights: { copyCode: 10 } })
  });
  console.log('HTTP Status (Expect 403):', res6.status);
  const data6 = await res6.json();
  console.log('Error message:', data6.error);
}

main().catch(console.error);
