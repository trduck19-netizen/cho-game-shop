const fs = require('fs');

const bundle = fs.readFileSync('scratch/xemgi_bundle.js', 'utf8');
const idx = bundle.indexOf('path:"/codes"');
const before = bundle.slice(0, idx);

// Search for definition of `I=` or `I =`
const matches = [...before.matchAll(/([a-zA-Z0-9_$]+)\s*=\s*(?:lazy|w|L|b|R)\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\s*\)\s*\)/g)];
console.log('All lazy components:');
matches.forEach(m => console.log(`${m[1]} -> ${m[2]}`));

// Also check EsportsPage-CDaY7h-P.js since mode="codes" is passed to I which was used in /esports, /players, /highlights, /codes!
