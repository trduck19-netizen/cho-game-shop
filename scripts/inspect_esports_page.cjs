const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');
console.log('EsportsPage length:', code.length);

// Search for Delta Force or giftcode or codes in this file
const dfIdx = code.indexOf('Delta');
console.log('Delta index in EsportsPage:', dfIdx);
if (dfIdx !== -1) {
  console.log('Snippet around Delta:\n', code.slice(Math.max(0, dfIdx - 100), dfIdx + 600));
}

// Search for arrays or objects containing code strings
const codeListMatches = [...code.matchAll(/([A-Z0-9_\-]{4,25})/g)].map(m => m[1]);
console.log('Upper tokens count:', codeListMatches.length);

// Search for gift codes or rewards in Vietnamese
const vnMatches = [...code.matchAll(/("([^"]*(?:Giftcode|code|Mã|quà|tân thủ|Delta Force|Garena)[^"]*)")/gi)].map(m => m[1]);
console.log('Vietnamese string matches:', vnMatches.slice(0, 20));

// Find any JSON data or codes array
const arrayMatches = [...code.matchAll(/codes:\s*(\[[\s\S]*?\])/gi)].map(m => m[1]);
console.log('codes: [...] arrays found:', arrayMatches.length);
arrayMatches.forEach((a, i) => console.log(`Array ${i}:`, a.slice(0, 300)));
