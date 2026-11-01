const fs = require('fs');
const path = require('path');
const https = require('https');

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

async function run() {
  console.log('=== SYNC ALL GAME ICONS MASTER SCRIPT ===');
  const syncData = await fetchJson('https://codegame.shop/api/sync');
  const syncGames = syncData.games || [];
  console.log(`Fetched ${syncGames.length} games from /api/sync`);

  const iconDir = path.join(__dirname, '..', 'public', 'game_icons');
  const existingFiles = new Set(fs.readdirSync(iconDir));

  // 1. Check all games and normalize icon_url
  let fixedCount = 0;
  const normalizedSyncGames = syncGames.map(g => {
    const slug = g.slug || g.id;
    let icon = g.icon_url || g.iconUrl || '';
    if (!icon || icon.includes('googleusercontent.com') || icon.includes('codemoi.net') || icon.startsWith('/game-icons')) {
      icon = `/game_icons/${slug}.webp`;
      fixedCount++;
    }
    return {
      ...g,
      icon_url: icon,
      iconUrl: icon
    };
  });
  console.log(`Normalized ${fixedCount} games with empty/external icons to /game_icons/\${slug}.webp`);

  // 2. Update local games188.json files
  const filePaths = [
    path.join(__dirname, '..', 'src', 'data', 'games188.json'),
    path.join(__dirname, '..', 'public', 'data', 'games188.json'),
    path.join(__dirname, '..', 'public', 'data', 'games_database.json'),
    path.join(__dirname, '..', 'data', 'games188.json')
  ];

  for (const fp of filePaths) {
    if (fs.existsSync(fp)) {
      const currentList = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const slugMap = new Map();
      currentList.forEach(g => slugMap.set(g.slug, g));

      // Merge newly approved real games
      normalizedSyncGames.forEach(ng => {
        if (!slugMap.has(ng.slug)) {
          currentList.push({
            id: ng.id || ng.slug,
            name: ng.name,
            slug: ng.slug,
            publisher: ng.publisher || '',
            category: ng.category || 'Game Mới',
            rating: typeof ng.rating === 'number' ? ng.rating : 4.8,
            icon_url: ng.icon_url,
            iconUrl: ng.icon_url,
            banner_url: ng.banner_url || '',
            description: ng.description || '',
            instructions: ng.instructions || '',
            platform: ng.platform || 'Android, iOS, PC',
            download_android: ng.download_android || '',
            download_ios: ng.download_ios || '',
            download_pc: ng.download_pc || '',
            is_active: true,
            status: 'ACTIVE'
          });
        } else {
          // Normalize existing game icon
          const existing = slugMap.get(ng.slug);
          existing.icon_url = ng.icon_url;
          existing.iconUrl = ng.icon_url;
        }
      });

      fs.writeFileSync(fp, JSON.stringify(currentList, null, 2), 'utf8');
      console.log(`Updated ${fp} (total games: ${currentList.length})`);
    }
  }

  console.log('=== SYNC COMPLETED SUCCESSFULLY ===');
}

run().catch(console.error);
