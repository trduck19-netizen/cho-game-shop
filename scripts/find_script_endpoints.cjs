const fs = require('fs');

console.log('=== SEARCHING NETWORKING IN YAR.GG SCRIPT ===');
const yarScript = fs.readFileSync('scratch/yar_script.js', 'utf8');
const yarFetches = [...yarScript.matchAll(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi)].map(m => m[1]);
console.log('yar fetch URLs:', yarFetches);

// Search for URLs / endpoints in yarScript
const yarUrls = [...yarScript.matchAll(/["'`](https?:\/\/[^"'`]+|\/[^"'`]+\.(?:json|txt|js))["'`]/gi)].map(m => m[1]);
console.log('yar URLs:', yarUrls);

// Search for any code strings in yarScript
const yarLines = yarScript.split('\n');
console.log('Total yar lines:', yarLines.length);
yarLines.forEach((l, i) => {
  if (l.includes('codeEntries') || l.includes('codes =') || l.includes('WWM') || l.includes('coupon') || l.includes('WIND') || l.includes('reward')) {
    console.log(`Line ${i}:`, l.slice(0, 150));
  }
});

console.log('\n=== SEARCHING NETWORKING IN XEMGI.TODAY BUNDLE ===');
const xemgiBundle = fs.readFileSync('scratch/xemgi_bundle.js', 'utf8');
const xemgiFetches = [...xemgiBundle.matchAll(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi)].map(m => m[1]);
console.log('xemgi fetch URLs:', xemgiFetches);

const xemgiUrls = [...xemgiBundle.matchAll(/["'`](https?:\/\/[^"'`]+|\/[^"'`]+\.(?:json|txt|js|webp|png))["'`]/gi)].map(m => m[1]);
console.log('xemgi URLs:', xemgiUrls);

// Search for all imports / lazy loaded chunks in xemgi
const dynamicImports = [...xemgiBundle.matchAll(/import\s*\(\s*["'`]([^"'`]+)["'`]\)/gi)].map(m => m[1]);
console.log('xemgi dynamic imports:', dynamicImports);
