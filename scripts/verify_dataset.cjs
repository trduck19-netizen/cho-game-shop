const fs = require('fs');

const games = JSON.parse(fs.readFileSync('src/data/games188.json', 'utf8'));
const codes = JSON.parse(fs.readFileSync('src/data/crawled_codes_188.json', 'utf8'));

console.log('=== DATASET VERIFICATION ===');
console.log(`Total games: ${games.length}`);
console.log(`Total codes: ${codes.length}`);
console.log(`Games with ABEI License: ${games.filter(g => g.so_giay_phep).length}`);
console.log(`Games with Active Codes: ${games.filter(g => g.free_codes_count > 0).length}`);

const sampleSlugs = [
  'genshin-impact',
  'lien-quan-mobile',
  'honkai-star-rail',
  '3q-dao-dao-dao',
  'tam-quoc-tu-thoi-ca',
  'outerplane',
  'aniimo',
  'roblox-blox-fruits',
  'blade-ball',
  'free-fire'
];

sampleSlugs.forEach(s => {
  const g = games.find(x => x.slug === s);
  if (g) {
    console.log(`- [${g.slug}] "${g.name}" | GP: ${g.so_giay_phep || '🌐 Quốc Tế'} | NPH: ${g.publisher} | Icon: ${g.icon_url} | Codes: ${g.free_codes_count}`);
  }
});
