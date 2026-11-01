const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../src/data/crawler_sources.json');
const pubPath = path.resolve(__dirname, '../public/data/crawler_sources.json');
const newSources = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'new_fb_sources.json'), 'utf8'));

const existing = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const existingUrls = new Set(existing.map(s => (s.url || '').toLowerCase().replace(/\/+$/, '')));
const existingIds = new Set(existing.map(s => s.id));

function toId(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

let addedCount = 0;
for (const s of newSources) {
  const normUrl = s.url.toLowerCase().replace(/\/+$/, '');
  if (!existingUrls.has(normUrl)) {
    let baseId = `src_fb_${toId(s.publisher)}_${toId(s.gameName || s.name)}`.slice(0, 50);
    let id = baseId;
    let count = 2;
    while (existingIds.has(id)) {
      id = `${baseId}_${count++}`;
    }
    existingIds.add(id);
    existingUrls.add(normUrl);

    existing.push({
      id: id,
      name: s.name,
      type: 'official_fb',
      url: s.url,
      isEnabled: true,
      description: s.description || `Fanpage chính thức ${s.name} từ nhà phát hành.`
    });
    addedCount++;
  }
}

console.log(`Added ${addedCount} new Facebook fanpage sources.`);
console.log(`Total crawler sources now: ${existing.length}`);

fs.writeFileSync(srcPath, JSON.stringify(existing, null, 2), 'utf8');
if (fs.existsSync(pubPath)) {
  fs.writeFileSync(pubPath, JSON.stringify(existing, null, 2), 'utf8');
}
console.log('Successfully saved to src/data/crawler_sources.json and public/data/crawler_sources.json');
