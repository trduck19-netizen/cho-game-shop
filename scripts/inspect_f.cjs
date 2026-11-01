const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const fIdx = code.indexOf(',f=');
if (fIdx !== -1) {
  console.log(code.slice(fIdx, fIdx + 2000));
}
