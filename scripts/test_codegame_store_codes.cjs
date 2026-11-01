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
    ).on('error', () => resolve(''));
  });
}

async function run() {
  const html = await fetchUrl('https://codegame.store/game/di-gioi-sinh-ton-oeg');
  // Match any code blocks, reward texts, etc.
  console.log('HTML snippet:');
  const codeMatches = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)];
  codeMatches.forEach(m => console.log('Found Code:', m[1]));
  
  // Also check if there are other games, e.g. genshin-impact, where-winds-meet, free-fire
  for (const slug of ['genshin-impact', 'lien-quan-mobile', 'where-winds-meet', 'free-fire', 'honkai-star-rail']) {
    const h = await fetchUrl(`https://codegame.store/game/${slug}`);
    const cd = [...h.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map(m => m[1]);
    console.log(`Game [${slug}] codes (${cd.length}):`, cd.slice(0, 5));
  }
}

run();
