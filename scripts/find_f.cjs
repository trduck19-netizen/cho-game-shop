const fs = require('fs');

const code = fs.readFileSync('chunk_3394.js', 'utf8');

const fIdx = code.indexOf('let f=');
if (fIdx !== -1) {
  console.log(code.slice(fIdx, fIdx + 1000));
} else {
  const pIdx = code.indexOf('function f(');
  if (pIdx !== -1) console.log(code.slice(pIdx, pIdx + 1000));
  else {
    const varF = code.match(/(?:const|let|var)\s+f\s*=\s*[\s\S]*?;/);
    if (varF) console.log(varF[0].slice(0, 1000));
  }
}
