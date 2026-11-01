const fs = require('fs');

console.log('=== INSPECTING CODES.YAR.GG ===');
const yarHtml = fs.readFileSync('scratch/yar_home.html', 'utf8');
const yarLinks = [...yarHtml.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
console.log('yar.gg links count:', yarLinks.length);
const yarGameLinks = yarLinks.filter(l => l.includes('/game') || l.includes('/code') || l.includes('where') || l.includes('meet'));
console.log('yar.gg relevant links:', yarGameLinks);

// Search for 'winds' or 'where' in full text
const yarIdx = yarHtml.toLowerCase().indexOf('winds');
console.log('Index of winds in yarHtml:', yarIdx);
if (yarIdx !== -1) {
  console.log('Snippet around winds in yarHtml:\n', yarHtml.slice(Math.max(0, yarIdx - 200), yarIdx + 500));
}

console.log('\n=== INSPECTING XEMGI.TODAY ===');
const xemgiHtml = fs.readFileSync('scratch/xemgi_codes.html', 'utf8');
const xemgiLinks = [...xemgiHtml.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
console.log('xemgi.today links count:', xemgiLinks.length);
const xemgiGameLinks = xemgiLinks.filter(l => l.includes('/code') || l.includes('delta') || l.includes('game'));
console.log('xemgi.today relevant links:', xemgiGameLinks.slice(0, 30));

const dfIdx = xemgiHtml.toLowerCase().indexOf('delta');
console.log('Index of delta in xemgiHtml:', dfIdx);
if (dfIdx !== -1) {
  console.log('Snippet around delta in xemgiHtml:\n', xemgiHtml.slice(Math.max(0, dfIdx - 200), dfIdx + 500));
}
