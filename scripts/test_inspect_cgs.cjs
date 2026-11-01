const fs = require('fs');
const html = fs.readFileSync('scripts/tam_quoc_cgs.html', 'utf8');

// Check JSON-LD
const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('JSON-LD count:', jsonLd.length);
jsonLd.forEach((j, i) => {
  try {
    const parsed = JSON.parse(j);
    console.log(`JSON-LD ${i}:`, Object.keys(parsed));
  } catch {
    console.log(`JSON-LD ${i} raw:`, j.slice(0, 150));
  }
});

// Check code tags
const codeTags = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
console.log('Code tags count:', codeTags.length);
console.log('Sample code tags:', codeTags);

// Search for "Giftcode" or "gift_code" or "mã" in HTML
const codeSections = [...html.matchAll(/(.{0,100}(?:giftcode|mã code|nhập code).{0,100})/gi)].map(m => m[0].trim());
console.log('Code text mentions count:', codeSections.length);
console.log('Sample mentions:', codeSections.slice(0, 5));
