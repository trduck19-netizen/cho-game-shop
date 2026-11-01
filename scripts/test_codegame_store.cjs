const https = require('https');
const fs = require('fs');
const path = require('path');

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
      console.error('Error fetching', url, err.message);
      resolve('');
    });
  });
}

async function test() {
  console.log('Fetching codegame.store sitemap...');
  const sitemap = await fetchUrl('https://codegame.store/sitemap.xml');
  console.log('Sitemap length:', sitemap.length);
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  console.log(`Found ${locs.length} URLs in sitemap`);
  console.log('Sample URLs:', locs.slice(0, 10));

  // Also check if there is an API sync endpoint
  const stats = await fetchUrl('https://codegame.store/api/stats');
  console.log('Stats endpoint:', stats.slice(0, 200));

  const sync = await fetchUrl('https://codegame.store/api/sync?key=wcg_admin_games_v4');
  console.log('Sync games endpoint:', sync.slice(0, 200));
}

test();
