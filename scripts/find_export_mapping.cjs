const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_MatchErrorBoundary.js', 'utf8');

// Find `as ia` and `as la`
const expIdx = code.lastIndexOf('export{');
console.log('Export index:', expIdx);
if (expIdx !== -1) {
  const expBlock = code.slice(expIdx);
  console.log('Export block snippet:\n', expBlock.slice(0, 500));
  
  const mIa = expBlock.match(/([a-zA-Z0-9_$]+)\s+as\s+ia/);
  const mLa = expBlock.match(/([a-zA-Z0-9_$]+)\s+as\s+la/);
  console.log('ia mapped from:', mIa ? mIa[1] : null);
  console.log('la mapped from:', mLa ? mLa[1] : null);

  if (mIa) {
    const origIa = mIa[1];
    const defIdx = code.indexOf(`${origIa}=`);
    console.log(`Definition of ${origIa} at ${defIdx}:\n`, code.slice(Math.max(0, defIdx - 100), defIdx + 1500));
  }
  if (mLa) {
    const origLa = mLa[1];
    const defIdx2 = code.indexOf(`${origLa}=`);
    console.log(`Definition of ${origLa} at ${defIdx2}:\n`, code.slice(Math.max(0, defIdx2 - 100), defIdx2 + 1500));
  }
}
