const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }
    ).on('error', (err) => {
      console.error(err);
      resolve('');
    });
  });
}

async function inspectGame() {
  const html = await fetchUrl('https://codegame.store/game/di-gioi-sinh-ton-oeg');
  console.log('Page length:', html.length);
  // Find JSON-LD or meta tags
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  console.log('JSON-LD count:', jsonLd.length);
  jsonLd.forEach((j, i) => console.log(`JSON-LD ${i}:\n`, j));

  // Find table or code elements
  const codes = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map(m => m[1]);
  console.log('Code tags:', codes);

  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map(m => m[1]);
  console.log('Tables count:', tables.length);
  if (tables.length > 0) {
    console.log('First table:\n', tables[0].slice(0, 1000));
  }
}

inspectGame();
