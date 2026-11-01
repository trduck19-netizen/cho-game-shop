const fs = require('fs');

async function testBatch() {
  const sitemapRes = await fetch('https://codemoi.net/sitemap.xml');
  const xml = await sitemapRes.text();
  const slugs = [...xml.matchAll(/<loc>https:\/\/codemoi\.net\/games\/([^\/]+)\/<\/loc>/g)].map(m => m[1]);
  console.log(`Tìm thấy ${slugs.length} slugs trong sitemap.`);

  const sample = slugs.slice(0, 5);
  for (const slug of sample) {
    const t0 = Date.now();
    const res = await fetch(`https://codemoi.net/games/${slug}/`);
    const html = await res.text();
    const codes = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
    console.log(`[${slug}] Status: ${res.status}, Codes: ${codes.length}, Time: ${Date.now() - t0}ms`);
  }
}

testBatch().catch(console.error);
