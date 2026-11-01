const fs = require('fs');

async function run() {
  const text = await (await fetch('https://xemgi.de/assets/EsportsPage-Co2uxweH.js')).text();
  fs.writeFileSync('scripts/debug_xemgi_esports.js', text, 'utf8');
  console.log('Saved scripts/debug_xemgi_esports.js, size:', text.length);

  // Search for arrays or objects containing codes in this file
  // Search for patterns like {code: "...", or code:"..."
  const codeMatches = [...text.matchAll(/\{[^}]*code\s*:\s*["']([^"']+)["'][^}]*\}/gi)].map(m => m[0]);
  console.log(`Found ${codeMatches.length} code objects!`);
  codeMatches.forEach((m, idx) => console.log(`Code ${idx}:`, m));

  // Search for any strings that look like giftcodes
  const stringLiterals = [...text.matchAll(/["']([A-Z0-9_\-]{5,25})["']/g)].map(m => m[1]);
  console.log('Sample string tokens in file:', [...new Set(stringLiterals)].slice(0, 30));
}

run().catch(console.error);
