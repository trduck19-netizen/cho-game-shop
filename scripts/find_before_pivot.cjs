const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const idx = code.indexOf('api/license/pivotPaging');
if (idx !== -1) {
  console.log(code.slice(Math.max(0, idx - 1500), idx));
}
