const fs = require('fs');

console.log('=== INSPECTING YAR.GG ===');
const yarHtml = fs.readFileSync('scratch/yar_home.html', 'utf8');
// Search for data-code or copy-code or list items or script tags in yarHtml
const yarScripts = [...yarHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('yar script tags count:', yarScripts.length);
yarScripts.forEach((s, idx) => {
  console.log(`Script ${idx} (len ${s.length}):`, s.slice(0, 300));
});

// Search for external scripts in yarHtml
const yarScriptSrcs = [...yarHtml.matchAll(/<script[^>]*src="([^"]+)"/gi)].map(m => m[1]);
console.log('yar external scripts:', yarScriptSrcs);

// Search for list or code cards in yarHtml
const yarCards = [...yarHtml.matchAll(/class="[^"]*(?:code|card|item)[^"]*"/gi)].map(m => m[0]);
console.log('Sample yar card classes:', [...new Set(yarCards)].slice(0, 20));

console.log('\n=== INSPECTING XEMGI.TODAY ===');
const xemgiHtml = fs.readFileSync('scratch/xemgi_codes.html', 'utf8');
console.log('xemgiHtml full content:\n', xemgiHtml);
