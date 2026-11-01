const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function auditAllIcons() {
  console.log('--- AUDITING ALL 569 GAMES ICONS ---');
  const syncData = await fetchJson('https://codegame.shop/api/sync');
  const games = syncData.games || [];
  console.log(`Loaded ${games.length} games from /api/sync`);

  const publicIconDir = path.join(__dirname, '..', 'public', 'game_icons');
  const existingFiles = new Set(fs.readdirSync(publicIconDir));

  const missingFiles = [];
  const emptyIcons = [];
  const externalIcons = [];
  const validLocalIcons = [];

  for (const g of games) {
    const slug = g.slug || g.id;
    const expectedWebp = `${slug}.webp`;
    const iconUrl = g.icon_url || g.iconUrl || '';

    if (!iconUrl) {
      emptyIcons.push({ slug, name: g.name, expectedWebp, existsOnDisk: existingFiles.has(expectedWebp) });
    } else if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
      externalIcons.push({ slug, name: g.name, iconUrl, expectedWebp, existsOnDisk: existingFiles.has(expectedWebp) });
    } else if (iconUrl.startsWith('/game_icons/')) {
      const fileName = path.basename(iconUrl);
      if (!existingFiles.has(fileName)) {
        missingFiles.push({ slug, name: g.name, iconUrl, fileName });
      } else {
        validLocalIcons.push(slug);
      }
    } else {
      missingFiles.push({ slug, name: g.name, iconUrl });
    }
  }

  console.log(`\nAudit Results:`);
  console.log(`- Valid local icons: ${validLocalIcons.length}`);
  console.log(`- Missing icon files on disk: ${missingFiles.length}`);
  console.log(`- Empty icon_url: ${emptyIcons.length}`);
  console.log(`- External URL icons: ${externalIcons.length}`);

  if (missingFiles.length > 0) {
    console.log('\nMissing icon files:', missingFiles);
  }
  if (emptyIcons.length > 0) {
    console.log('\nEmpty icon_url games:', emptyIcons);
  }
  if (externalIcons.length > 0) {
    console.log('\nExternal icon games:', externalIcons);
  }
}

auditAllIcons().catch(console.error);
