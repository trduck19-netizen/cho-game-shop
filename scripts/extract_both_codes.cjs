const fs = require('fs');

async function extractAll() {
  console.log('=== 1. EXTRACTING WHERE WINDS MEET CODES FROM CODES.YAR.GG ===');
  const yarHtml = fs.readFileSync('scratch/yar_home.html', 'utf8');
  const yarScripts = [...yarHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  const bigScript = yarScripts.find(s => s.includes('codeEntries'));

  if (bigScript) {
    fs.writeFileSync('scratch/yar_script.js', bigScript, 'utf8');
    console.log('Saved yar script, length:', bigScript.length);

    // Search for code entries array or JSON in script
    const activeMatch = bigScript.match(/codeEntries\s*=\s*(\[[\s\S]*?\]);/);
    if (activeMatch) {
      console.log('Found codeEntries in script!');
      try {
        const parsed = eval(activeMatch[1]);
        console.log('Parsed active codeEntries count:', parsed.length);
        console.log('Sample active code entries:', parsed.slice(0, 5));
      } catch (e) {
        console.log('eval failed, regex parsing active codes...');
      }
    }

    const expMatch = bigScript.match(/archivedExpiredCodeEntries\s*=\s*(\[[\s\S]*?\]);/);
    if (expMatch) {
      console.log('Found archivedExpiredCodeEntries in script!');
      try {
        const parsedExp = eval(expMatch[1]);
        console.log('Parsed expired codeEntries count:', parsedExp.length);
        console.log('Sample expired code entries:', parsedExp.slice(0, 5));
      } catch (e) {
        console.log('eval failed, regex parsing expired codes...');
      }
    }
  }

  console.log('\n=== 2. EXTRACTING DELTA FORCE CODES FROM XEMGI.TODAY ===');
  try {
    const jsRes = await fetch('https://xemgi.today/assets/index-rtmUijuT.js');
    console.log('JS bundle status:', jsRes.status);
    const jsCode = await jsRes.text();
    fs.writeFileSync('scratch/xemgi_bundle.js', jsCode, 'utf8');
    console.log('Saved xemgi bundle, length:', jsCode.length);

    // Search for codes array or delta force items in bundle
    const dfMatches = [...jsCode.matchAll(/([A-Z0-9_\-]{4,30})/g)].map(m => m[1]);
    console.log('Sample upper tokens in xemgi bundle:', dfMatches.slice(0, 30));

    // Look for objects containing code / rewards / giftcode
    const codeObjMatches = [...jsCode.matchAll(/\{[^}]*code:[^}]*\}/gi)].map(m => m[0]);
    console.log('Code objects found:', codeObjMatches.length);
    if (codeObjMatches.length > 0) {
      codeObjMatches.slice(0, 10).forEach((c, i) => console.log(`Code obj ${i}:`, c));
    }
  } catch (e) {
    console.error('Error fetching xemgi bundle:', e.message);
  }
}

extractAll();
