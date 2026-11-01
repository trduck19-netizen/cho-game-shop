const fs = require('fs');

async function extractFullGame(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();

  // RSC payload
  const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
  const joinedRsc = pushMatches.join('').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '');

  const activeCodes = new Set();
  const expiredCodes = new Set();

  // 1. Extract from live HTML buttons (100% active)
  const activeMatches = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1].trim());
  activeMatches.forEach(c => {
    if (c) activeCodes.add(c);
  });

  // 2. Extract structured codes from RSC (both active and expired)
  const codeRegex = /\{"code":"([^"]+)","reward":("([^"]*)"|null),"status":"(active|expired)"/g;
  const matches = [...joinedRsc.matchAll(codeRegex)];
  matches.forEach(m => {
    const code = m[1].trim();
    const status = m[4];
    if (code) {
      if (status === 'active') {
        activeCodes.add(code);
      } else if (status === 'expired') {
        if (!activeCodes.has(code)) {
          expiredCodes.add(code);
        }
      }
    }
  });

  return {
    slug,
    activeCount: activeCodes.size,
    expiredCount: expiredCodes.size,
    active: [...activeCodes].slice(0, 5),
    expired: [...expiredCodes].slice(0, 5)
  };
}

async function run() {
  const sample = ['genshin-impact', 'lien-quan-mobile', 'samkok-kingdom-crush', 'mong-huyen-giang-ho', 'free-fire'];
  for (const s of sample) {
    const r = await extractFullGame(s);
    console.log(r);
  }
}

run();
