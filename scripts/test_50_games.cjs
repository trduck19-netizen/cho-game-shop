const fs = require('fs');

async function test50() {
  const sitemapRes = await fetch('https://codemoi.net/sitemap.xml');
  const sitemapXml = await sitemapRes.text();
  const slugs = [...sitemapXml.matchAll(/<loc>https:\/\/codemoi\.net\/games\/([^\/]+)\/<\/loc>/g)].map(m => m[1]);

  console.log(`Testing 50 games with boundary parser...`);
  const sample = slugs.slice(0, 50);

  const start = Date.now();
  let totalActive = 0;
  let totalExpired = 0;

  // Process in batches of 15
  for (let i = 0; i < sample.length; i += 15) {
    const chunk = sample.slice(i, i + 15);
    const results = await Promise.all(chunk.map(async slug => {
      try {
        const res = await fetch(`https://codemoi.net/games/${slug}/`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = await res.text();

        const startIdx = html.indexOf('<article');
        let endIdx = html.indexOf('✨ Chắc bạn cũng thích!');
        if (endIdx === -1) endIdx = html.indexOf('🆕 Game mới');
        if (endIdx === -1) endIdx = html.indexOf('</article>');
        if (endIdx === -1) endIdx = html.length;

        const gameContent = startIdx !== -1 ? html.slice(startIdx, endIdx) : html;

        let name = '';
        const h1M = html.match(/<h1[^>]*>Code (.*?) mới nhất/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1M) name = h1M[1].replace(/mới nhất.*$/i, '').trim();
        else name = slug;

        const imgM = html.match(/<img[^>]*src="([^"]*\/covers\/[^"]+)"/i) || html.match(/property="og:image" content="([^"]+)"/i);
        let icon_url = imgM ? (imgM[1].startsWith('http') ? imgM[1] : `https://codemoi.net${imgM[1]}`) : `https://codemoi.net/covers/${slug}.webp`;

        const activeCodes = [];
        const activeMatches = [...gameContent.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1].trim());
        for (const c of activeMatches) {
          if (c && !activeCodes.includes(c)) activeCodes.push(c);
        }

        const expiredCodes = [];
        const expIdx = gameContent.toLowerCase().indexOf('hết hạn');
        if (expIdx !== -1) {
          const expSlice = gameContent.slice(expIdx);
          const expMatches = [...expSlice.matchAll(/<code[^>]*>([a-zA-Z0-9_\-]+)<\/code>/g)].map(m => m[1].trim());
          for (const c of expMatches) {
            if (c && !activeCodes.includes(c) && !expiredCodes.includes(c)) expiredCodes.push(c);
          }
        }

        return { slug, name, icon_url, activeCount: activeCodes.length, expiredCount: expiredCodes.length };
      } catch (err) {
        return null;
      }
    }));

    results.forEach(r => {
      if (r) {
        totalActive += r.activeCount;
        totalExpired += r.expiredCount;
        process.stdout.write(`[${r.slug}: ${r.activeCount} active] `);
      }
    });
  }

  console.log(`\n\nDone 50 games in ${((Date.now() - start) / 1000).toFixed(2)}s! Total active: ${totalActive}, expired: ${totalExpired}`);
}

test50();
