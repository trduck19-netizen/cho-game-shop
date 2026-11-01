const fs = require('fs');

const html = fs.readFileSync('test_game_page.html', 'utf8');

// Find all elements or text where giftcodes appear
// For example, buttons or tables or text
const snippets = [];
let pos = 0;
while (true) {
  const idx = html.indexOf('Sao chép', pos);
  if (idx === -1) break;
  snippets.push(html.slice(Math.max(0, idx - 300), Math.min(html.length, idx + 300)));
  pos = idx + 8;
  if (snippets.length > 5) break;
}

if (snippets.length === 0) {
  // Let's search for "code" or "Copy"
  pos = 0;
  while (true) {
    const idx = html.indexOf('Copy', pos);
    if (idx === -1) break;
    snippets.push(html.slice(Math.max(0, idx - 200), Math.min(html.length, idx + 200)));
    pos = idx + 4;
    if (snippets.length > 5) break;
  }
}

console.log('Found snippets count:', snippets.length);
snippets.forEach((s, i) => console.log(`\n--- Snippet ${i} ---\n`, s));
