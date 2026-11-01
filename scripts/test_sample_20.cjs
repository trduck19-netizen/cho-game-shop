const fs = require('fs');

async function testCrawlerSample() {
  const sitemapRes = await fetch('https://codemoi.net/sitemap.xml');
  const sitemapXml = await sitemapRes.text();
  const allSlugs = [...sitemapXml.matchAll(/<loc>https:\/\/codemoi\.net\/games\/([^\/]+)\/<\/loc>/g)].map(m => m[1]);

  console.log(`Total slugs in sitemap: ${allSlugs.length}`);
  const sampleSlugs = allSlugs.slice(0, 20);

  for (const slug of sampleSlugs) {
    try {
      const res = await fetch(`https://codemoi.net/games/${slug}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const html = await res.text();

      // Title
      let name = slug;
      const h1M = html.match(/<h1[^>]*>Code (.*?) mới nhất/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1M) name = h1M[1].replace(/mới nhất.*$/i, '').trim();

      // Active codes
      const activeCodes = [];
      const codeMatches = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1].trim());
      for (const c of codeMatches) {
        if (c && !activeCodes.includes(c)) activeCodes.push(c);
      }

      // Expired codes
      const expiredCodes = [];
      const expIdx = html.toLowerCase().indexOf('hết hạn');
      if (expIdx !== -1) {
        const slice = html.slice(expIdx, expIdx + 6000);
        const m = [...slice.matchAll(/<code[^>]*>([a-zA-Z0-9_\-]+)<\/code>/g)].map(x => x[1].trim());
        for (const c of m) {
          if (c && !activeCodes.includes(c) && !expiredCodes.includes(c)) expiredCodes.push(c);
        }
      }

      // Icon
      const imgM = html.match(/<img[^>]*src="([^"]*\/covers\/[^"]+)"/i) || html.match(/property="og:image" content="([^"]+)"/i);
      let icon = imgM ? (imgM[1].startsWith('http') ? imgM[1] : 'https://codemoi.net' + imgM[1]) : `https://codemoi.net/covers/${slug}.webp`;

      console.log(`[OK] ${name} (${slug}) -> ${activeCodes.length} active, ${expiredCodes.length} expired | icon: ${icon}`);
    } catch (e) {
      console.error(`[ERR] ${slug}:`, e.message);
    }
  }
}

testCrawlerSample();
