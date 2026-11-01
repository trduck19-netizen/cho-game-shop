const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const mod5134 = code.indexOf('5134:function');
if (mod5134 !== -1) {
  const modCode = code.slice(mod5134, mod5134 + 6000);
  console.log(modCode);
}
