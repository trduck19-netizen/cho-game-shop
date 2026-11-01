const fs = require('fs');

async function testFetch(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`);
  const html = await res.text();
  console.log(`\n=== Game: ${slug} ===`);
  const hasExpired = html.includes('hết hạn') || html.includes('Hết hạn') || html.includes('expired');
  console.log('Contains expired keyword:', hasExpired);
  
  // Find all sections or lists
  const codeButtons = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
  console.log(`Found ${codeButtons.length} code buttons:`, codeButtons.slice(0, 10));

  // Let's search for "Hết hạn" header or similar
  const expiredIdx = html.toLowerCase().indexOf('hết hạn');
  if (expiredIdx !== -1) {
    console.log('Expired snippet:');
    console.log(html.slice(Math.max(0, expiredIdx - 100), Math.min(html.length, expiredIdx + 600)));
  }
}

async function main() {
  await testFetch('free-fire');
  await testFetch('genshin-impact');
  await testFetch('tam-quoc-tu-thoi-ca');
}

main();
