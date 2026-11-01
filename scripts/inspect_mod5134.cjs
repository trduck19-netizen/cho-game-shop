const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const mod5134 = code.indexOf('5134:function');
if (mod5134 !== -1) {
  console.log(code.slice(mod5134, mod5134 + 3000));
}
