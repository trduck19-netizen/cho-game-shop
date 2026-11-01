const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

// Look for 'delta-force' in the whole file
const dfOccurrences = [...code.matchAll(/delta-force/g)];
console.log('delta-force count in file:', dfOccurrences.length);

dfOccurrences.forEach((m, idx) => {
  const i = m.index;
  console.log(`\nOccurrence ${idx} at ${i}:\n`, code.slice(Math.max(0, i - 100), i + 300));
});
