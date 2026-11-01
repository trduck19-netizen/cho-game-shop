const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const idx = code.indexOf('api/license/pivotPaging');
if (idx !== -1) {
  console.log('Context around pivotPaging:');
  console.log(code.slice(Math.max(0, idx - 400), Math.min(code.length, idx + 1000)));
}
