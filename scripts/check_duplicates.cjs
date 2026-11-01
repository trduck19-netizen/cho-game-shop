const games = require('../src/data/games188.json');
console.log('Total games in games188.json:', games.length);

const slugCounts = {};
for (const g of games) {
  slugCounts[g.slug] = (slugCounts[g.slug] || 0) + 1;
}
const dupSlugs = Object.entries(slugCounts).filter(([s, c]) => c > 1);
console.log('Duplicate slugs count:', dupSlugs.length);

function norm(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}
const nameCounts = {};
for (const g of games) {
  const n = norm(g.name);
  if (!nameCounts[n]) nameCounts[n] = [];
  nameCounts[n].push(g);
}
const dupNames = Object.entries(nameCounts).filter(([n, list]) => list.length > 1);
console.log('Duplicate names count:', dupNames.length);
for (const [n, list] of dupNames) {
  console.log(`- '${n}': [${list.map(x => x.slug).join(', ')}]`);
}
