const fs = require('fs');

async function testRscObjectExtract(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();
  const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
  const joined = pushMatches.join('').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');

  // Search for {"slug":"<slug>", ...}
  const needle = `"slug":"${slug}"`;
  const idx = joined.indexOf(needle);
  console.log(`[${slug}] Index in RSC:`, idx);
  if (idx !== -1) {
    // Look backwards to find the start of the object `{`
    let startObj = joined.lastIndexOf('{', idx);
    // Find the matching closing bracket or scan json
    const slice = joined.slice(startObj, startObj + 30000);
    // Try to match game structure
    const match = slice.match(/\{"slug":"[^"]+","name":"[^"]+",[\s\S]*?"codes":\[[\s\S]*?\][\s\S]*?\}/);
    if (match) {
      console.log('Matched game JSON block, length:', match[0].length);
      try {
        const obj = JSON.parse(match[0]);
        console.log('Parsed game JSON object successfully!');
        console.log('Name:', obj.name);
        console.log('Publisher:', obj.publisher);
        console.log('Genre:', obj.genre);
        console.log('Redeem steps:', obj.redeemSteps);
        console.log('Total codes:', obj.codes?.length);
        console.log('Active codes:', obj.codes?.filter(c => c.status === 'active').map(c => c.code));
        console.log('Expired codes:', obj.codes?.filter(c => c.status === 'expired').map(c => c.code));
        return obj;
      } catch (e) {
        console.log('JSON parse failed, checking raw snippet:', match[0].slice(0, 300));
      }
    }
  }
}

async function run() {
  await testRscObjectExtract('soul-land-time-reversed');
  await testRscObjectExtract('genshin-impact');
  await testRscObjectExtract('tam-quoc-tu-thoi-ca');
}

run();
