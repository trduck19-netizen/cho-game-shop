const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

// Find all calls or references to _o
const matches = [...code.matchAll(/([a-zA-Z0-9_$]+)\s*:\s*_o/g)].map(m => m[0]);
console.log('References to _o:', matches);

// Search for where _o is rendered or where its props (totalAllCodes, allSpecialCodes, allNormalCodes) come from
const callerIdx = code.indexOf('totalAllCodes:');
console.log('Caller index of totalAllCodes:', callerIdx);
if (callerIdx !== -1) {
  console.log('Snippet before totalAllCodes:\n', code.slice(Math.max(0, callerIdx - 2000), callerIdx + 1000));
}
