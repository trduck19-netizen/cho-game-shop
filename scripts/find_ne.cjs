const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_MatchErrorBoundary.js', 'utf8');

const idxNe = code.indexOf('Ne=');
console.log('Index of Ne=:', idxNe);
if (idxNe !== -1) {
  console.log('Definition of Ne:\n', code.slice(Math.max(0, idxNe - 200), idxNe + 4000));
}
