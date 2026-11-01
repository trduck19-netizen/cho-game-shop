const fs = require('fs');

async function checkSources() {
  // 1. codes.yar.gg
  try {
    const res1 = await fetch('https://codes.yar.gg/');
    console.log('codes.yar.gg status:', res1.status);
    const html1 = await res1.text();
    fs.writeFileSync('scratch/yar_home.html', html1, 'utf8');

    // Also check sitemap or search on yar.gg
    const resMap = await fetch('https://codes.yar.gg/sitemap.xml');
    if (resMap.ok) {
      const xml = await resMap.text();
      fs.writeFileSync('scratch/yar_sitemap.xml', xml, 'utf8');
      const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
      console.log('Total URLs in codes.yar.gg sitemap:', matches.length);
      const wwmUrls = matches.filter(u => u.includes('where-winds-meet') || u.includes('winds'));
      console.log('Where winds meet URLs in sitemap:', wwmUrls);
    }
  } catch (e) {
    console.error('Error fetching yar.gg:', e.message);
  }

  // 2. xemgi.today/codes
  try {
    const res2 = await fetch('https://xemgi.today/codes', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    console.log('xemgi.today/codes status:', res2.status);
    const html2 = await res2.text();
    fs.writeFileSync('scratch/xemgi_codes.html', html2, 'utf8');

    // Also check sitemap or direct search on xemgi.today
    const resMap2 = await fetch('https://xemgi.today/sitemap.xml');
    if (resMap2.ok) {
      const xml2 = await resMap2.text();
      const matches2 = [...xml2.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
      console.log('Total URLs in xemgi.today sitemap:', matches2.length);
      const dfUrls = matches2.filter(u => u.includes('delta-force') || u.includes('delta'));
      console.log('Delta Force URLs in sitemap:', dfUrls);
    }
  } catch (e) {
    console.error('Error fetching xemgi.today:', e.message);
  }
}

checkSources();
