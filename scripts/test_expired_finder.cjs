const fs = require('fs');

async function findExpiredExamples() {
  const sitemapRes = await fetch('https://codemoi.net/sitemap.xml');
  const sitemapXml = await sitemapRes.text();
  const allSlugs = [...sitemapXml.matchAll(/<loc>https:\/\/codemoi\.net\/games\/([^\/]+)\/<\/loc>/g)].map(m => m[1]);

  console.log(`Checking 100 games for expired codes section...`);
  const sampleSlugs = allSlugs.slice(0, 100);

  for (const slug of sampleSlugs) {
    const res = await fetch(`https://codemoi.net/games/${slug}/`);
    const html = await res.text();
    if (html.toLowerCase().includes('hết hạn') || html.toLowerCase().includes('không dùng được') || html.toLowerCase().includes('expired')) {
      console.log(`Game has expired mention: ${slug}`);
      // Find where it is
      const idx = html.toLowerCase().indexOf('hết hạn');
      if (idx !== -1) {
        console.log(`Snippet around hết hạn for ${slug}:\n`, html.slice(idx, idx + 400));
      }
    }
  }
}

findExpiredExamples();
