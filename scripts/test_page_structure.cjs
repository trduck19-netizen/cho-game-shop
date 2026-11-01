async function findExpiredInSample() {
  const sitemapRes = await fetch('https://codemoi.net/sitemap.xml');
  const xml = await sitemapRes.text();
  const slugs = [...xml.matchAll(/<loc>https:\/\/codemoi\.net\/games\/([^\/]+)\/<\/loc>/g)].map(m => m[1]);
  
  for (const slug of slugs.slice(0, 30)) {
    const res = await fetch(`https://codemoi.net/games/${slug}/`);
    const html = await res.text();
    if (html.toLowerCase().includes('hết hạn')) {
      console.log(`Found 'hết hạn' in: ${slug}`);
      const idx = html.toLowerCase().indexOf('hết hạn');
      console.log(html.slice(idx - 50, idx + 200));
      break;
    }
  }
}
findExpiredInSample().catch(console.error);
