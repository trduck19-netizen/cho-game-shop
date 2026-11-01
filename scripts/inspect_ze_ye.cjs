const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_MatchErrorBoundary.js', 'utf8');

// Find Ze definition
const idxZe = code.indexOf('Ze=');
console.log('Index of Ze=:', idxZe);
if (idxZe !== -1) {
  console.log('Definition of Ze:\n', code.slice(Math.max(0, idxZe - 50), idxZe + 3000));
}

// Find Ye definition
const idxYe = code.indexOf('Ye=');
console.log('Index of Ye=:', idxYe);
if (idxYe !== -1) {
  console.log('Definition of Ye:\n', code.slice(Math.max(0, idxYe - 50), idxYe + 2000));
}
