const fs = require('fs');

async function testFetch(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`);
  const html = await res.text();
  
  // Find all code tags `<code>...</code>`
  const codeTags = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  console.log(`\n=== Game: ${slug} ===`);
  console.log(`Total <code> tags: ${codeTags.length}`);
  console.log('Sample codes:', codeTags.slice(0, 10));

  // Let's check rewards: does each code card have a reward description?
  // Let's inspect the parent li of each code
  const lis = [...html.matchAll(/<li class="group bg-card[^"]*"[^>]*>([\s\S]*?)<\/li>/g)];
  console.log(`Total code li items: ${lis.length}`);
  lis.slice(0, 3).forEach((li, idx) => {
    console.log(`Li ${idx}:`, li[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  });
}

async function main() {
  await testFetch('genshin-impact');
  await testFetch('tam-quoc-tu-thoi-ca');
  await testFetch('3q-dao-dao-dao');
}

main();
