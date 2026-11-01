const fs = require('fs');

async function inspectSitemap() {
  const res = await fetch('https://codemoi.net/sitemap.xml');
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`Total URLs in sitemap: ${urls.length}`);

  const gameUrls = urls.filter(u => u.includes('/games/'));
  const categoryUrls = urls.filter(u => u.includes('/the-loai/'));
  const otherUrls = urls.filter(u => !u.includes('/games/') && !u.includes('/the-loai/'));

  console.log(`Game URLs: ${gameUrls.length}`);
  console.log(`Category URLs: ${categoryUrls.length}`);
  console.log(`Other URLs: ${otherUrls.length}`);

  // Unique slugs
  const slugs = gameUrls.map(u => {
    const m = u.match(/\/games\/([^\/]+)\/?/);
    return m ? m[1] : null;
  }).filter(Boolean);

  const uniqueSlugs = [...new Set(slugs)];
  console.log(`Unique game slugs: ${uniqueSlugs.length}`);
}

inspectSitemap();
