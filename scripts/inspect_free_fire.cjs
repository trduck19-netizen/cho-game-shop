const fs = require('fs');

(async () => {
  const res = await fetch('https://codemoi.net/games/free-fire/');
  const html = await res.text();
  const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
  const joined = pushMatches.join('');
  const unescaped = joined.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
  fs.writeFileSync('scratch/free_fire_rsc.txt', unescaped, 'utf8');
  console.log('Written to scratch/free_fire_rsc.txt, size:', unescaped.length);

  // Check if there are any codes mentioned in text
  const words = unescaped.match(/[A-Z0-9]{5,20}/g) || [];
  console.log('Upper tokens in free fire:', words.slice(0, 30));
})();
