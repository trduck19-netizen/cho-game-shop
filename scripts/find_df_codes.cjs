const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

const idx = code.indexOf('allSpecialCodes');
console.log('Index of allSpecialCodes:', idx);
if (idx !== -1) {
  console.log('Snippet before & after allSpecialCodes:\n', code.slice(Math.max(0, idx - 1500), idx + 1500));
}
