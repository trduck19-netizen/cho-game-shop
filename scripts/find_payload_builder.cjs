const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

// Search for all occurrences of pivotPaging and see what calls it
const matches = [...code.matchAll(/post\([^,]+api\/license\/pivotPaging[^,]*,\s*([^)]+)\)/g)];
console.log('pivotPaging calls:', matches.map(m => m[1]));

// Let's find where the variable passed to post is created
const idx = code.indexOf('api/license/pivotPaging');
const before = code.slice(Math.max(0, idx - 800), idx);
console.log('Before pivotPaging:\n', before);
