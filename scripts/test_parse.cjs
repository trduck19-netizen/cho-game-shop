const fs = require('fs');

const html = fs.readFileSync('test_game_page.html', 'utf8');

// Check title
const titleMatch = html.match(/<title>(.*?)<\/title>/);
console.log('Title:', titleMatch ? titleMatch[1] : null);

// Check OG Image
const ogImage = html.match(/property="og:image" content="(.*?)"/);
console.log('OG Image:', ogImage ? ogImage[1] : null);

// Search for codes in HTML or RSC
const codeMatches = [...html.matchAll(/data-code="([^"]+)"/g)].map(m => m[1]);
console.log('data-code matches:', codeMatches);

// Let's search for JSON data in script tags
const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
if (jsonLd) {
  console.log('JSON-LD count:', jsonLd.length);
  jsonLd.forEach((j, idx) => console.log(`JSON-LD ${idx}:`, j.slice(0, 200)));
}

// Check RSC payloads
const rscLines = [];
const rscRegex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
let match;
while ((match = rscRegex.exec(html)) !== null) {
  rscLines.push(match[1]);
}
console.log('RSC chunks count:', rscLines.length);

const combinedRsc = rscLines.join('');
fs.writeFileSync('rsc_dump.txt', combinedRsc);
console.log('Dumped combined RSC of length:', combinedRsc.length);
