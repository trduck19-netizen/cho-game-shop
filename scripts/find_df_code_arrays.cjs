const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

const matches = [...code.matchAll(/jsxs?\(_o,\s*(\{[\s\S]*?\})\)/g)].map(m => m[1]);
console.log('Matches rendering _o:', matches.length);
matches.forEach((m, idx) => {
  console.log(`Render _o ${idx}:\n`, m.slice(0, 500));
});

// Also search for Delta Force code list array in EsportsPage
// Look for arrays of code objects like [{code:"...",...}] or string arrays
const codeDefMatch = code.match(/const\s+[a-zA-Z0-9_$]+\s*=\s*\[(?:\{[^}]*code:[^}]*\}|"[A-Z0-9_\-]+")/g);
console.log('codeDefMatch:', codeDefMatch);

// Look for any string arrays containing uppercase codes
const allCodeArrays = [...code.matchAll(/\[("([A-Z0-9_\-]{4,20})"(?:,\s*"([A-Z0-9_\-]{4,20})"){2,})\]/g)].map(m => m[0]);
console.log('Code arrays found:', allCodeArrays);
