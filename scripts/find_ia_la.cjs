const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

// Find ia definition
const iaIdx = code.indexOf('ia=');
console.log('Index of ia=:', iaIdx);
if (iaIdx !== -1) {
  console.log('Snippet around ia=:\n', code.slice(Math.max(0, iaIdx - 50), iaIdx + 2500));
}

// Find la definition
const laIdx = code.indexOf('la=');
console.log('Index of la=:', laIdx);
if (laIdx !== -1) {
  console.log('Snippet around la=:\n', code.slice(Math.max(0, laIdx - 50), laIdx + 1000));
}
