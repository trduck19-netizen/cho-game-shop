const fs = require('fs');

async function testFetchApi() {
  console.log('=== 1. FETCHING CODES-BACKEND.WWMCODES.WORKERS.DEV ===');
  try {
    const res = await fetch('https://codes-backend.wwmcodes.workers.dev/v1/codes');
    console.log('wwmcodes status:', res.status);
    const json = await res.json();
    fs.writeFileSync('scratch/wwm_codes.json', JSON.stringify(json, null, 2), 'utf8');
    console.log('WWM API Response keys:', Object.keys(json));
    console.log('Active codes count:', json.active?.length);
    console.log('Expired codes count:', json.expired?.length);
    console.log('Sample active codes:', json.active?.slice(0, 10));
    console.log('Sample expired codes:', json.expired?.slice(0, 5));
  } catch (e) {
    console.error('Error fetching WWM API:', e.message);
  }

  console.log('\n=== 2. SEARCHING XEMGI.TODAY CHUNKS FOR DELTA FORCE ===');
  // List all possible chunks from xemgi
  const chunks = [
    'LegalModal-BJ5HbSBz.js',
    'GachaFanPrototype-CN85iLCJ.js',
    'BrowsePage-hpUaxmxS.js',
    'EsportsPage-CDaY7h-P.js',
    'TitleDetailPage-BD0lu9bn.js',
    'ListPage-CCVdvhV0.js',
    'LegalPages-BC01bx5I.js',
    'PosterAuditPage-D5WONHkd.js',
    'GachaPage-CY3AG75s.js',
    'AdminEsportsPage-BVKmCdaJ.js',
    'AdminSportsPage-bSkac7MP.js',
    'SportsPage-xWZdPqSV.js'
  ];

  for (const c of chunks) {
    try {
      const res = await fetch(`https://xemgi.today/assets/${c}`);
      if (res.ok) {
        const text = await res.text();
        if (text.toLowerCase().includes('delta') || text.toLowerCase().includes('code') || text.toLowerCase().includes('gift')) {
          console.log(`[MATCH in ${c}] Length: ${text.length}`);
          fs.writeFileSync(`scratch/xemgi_${c}`, text, 'utf8');
        }
      }
    } catch (e) {}
  }
}

testFetchApi();
