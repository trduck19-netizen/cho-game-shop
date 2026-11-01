const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const matches = [...code.matchAll(/api\/license\/[a-zA-Z0-9_\-\/]+/g)].map(m => m[0]);
console.log('Unique API endpoints:', [...new Set(matches)]);

// Let's inspect the functions that make POST or GET requests in chunk_3394.js
const funcRegex = /let\s+([a-zA-Z0-9_$]+)\s*=\s*async\s*\(?([^)]*)\)?\s*=>\s*\{([\s\S]*?catch\(e\)[^}]*\})/g;
let fMatch;
while ((fMatch = funcRegex.exec(code)) !== null) {
  console.log(`\nFunction ${fMatch[1]}:`);
  console.log(fMatch[0].slice(0, 300));
}
