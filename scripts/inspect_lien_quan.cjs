const fs = require('fs');

(async () => {
  const res = await fetch('https://codemoi.net/games/lien-quan-mobile/');
  const html = await res.text();
  const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
  const joined = pushMatches.join('').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
  
  fs.writeFileSync('scratch/lq_rsc.txt', joined, 'utf8');

  // Let's find "slug":"lien-quan-mobile"
  const idx = joined.indexOf('"slug":"lien-quan-mobile"');
  console.log('Index of slug:', idx);
  if (idx !== -1) {
    console.log('Snippet around slug:\n', joined.slice(Math.max(0, idx - 100), idx + 800));
  }
})();
