const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

const idx = code.indexOf('totalAllCodes:X');
console.log('Index of totalAllCodes:X:', idx);
if (idx !== -1) {
  console.log('Code before render _o:\n', code.slice(Math.max(0, idx - 4000), idx + 200));
}
