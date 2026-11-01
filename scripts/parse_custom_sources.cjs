const fs = require('fs');

console.log('==============================================');
console.log('1. PARSING WHERE WINDS MEET FROM CODES.YAR.GG');
console.log('==============================================');
const yarHtml = fs.readFileSync('scratch/yar_home.html', 'utf8');

// Find all code elements, copy buttons, or tables in yarHtml
console.log('yarHtml length:', yarHtml.length);
// Extract buttons, data-code, or aria-labels
const yarButtons = [...yarHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[0]);
console.log('yar button count:', yarButtons.length);
console.log('Sample yar buttons:', yarButtons.slice(0, 10));

// Find all code tags or text
const yarCodes = [...yarHtml.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map(m => m[1]);
console.log('yar code tags:', yarCodes);

// Search for table or list items
const yarRows = [...yarHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
console.log('yar table rows count:', yarRows.length);
if (yarRows.length > 0) {
  yarRows.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, r.replace(/\s+/g, ' ')));
}

console.log('\n==============================================');
console.log('2. PARSING DELTA FORCE FROM XEMGI.TODAY/CODES');
console.log('==============================================');
const xemgiHtml = fs.readFileSync('scratch/xemgi_codes.html', 'utf8');
console.log('xemgiHtml length:', xemgiHtml.length);

const xemgiButtons = [...xemgiHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[0]);
console.log('xemgi button count:', xemgiButtons.length);
console.log('Sample xemgi buttons:', xemgiButtons.slice(0, 10));

const xemgiCodes = [...xemgiHtml.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map(m => m[1]);
console.log('xemgi code tags:', xemgiCodes);

// Search for script JSON or JS data inside xemgiHtml
const xemgiScripts = [...xemgiHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('xemgi script count:', xemgiScripts.length);
xemgiScripts.forEach((s, i) => {
  if (s.includes('code') || s.includes('DELTA') || s.includes('items') || s.includes('gifts')) {
    console.log(`Script ${i} length ${s.length}:\n`, s.slice(0, 500));
  }
});
