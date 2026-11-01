const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

const poIdx = code.indexOf('function Po(');
console.log('Index of Po:', poIdx);
if (poIdx !== -1) {
  // Let's inspect the 2000 chars before Po
  console.log('2000 chars before Po:\n', code.slice(Math.max(0, poIdx - 2000), poIdx));
}
