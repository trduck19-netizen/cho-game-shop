const fs = require('fs');

async function testAccurateExtraction(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();

  // Boundary of current game content only (exclude related games)
  const startIdx = html.indexOf('<article');
  let endIdx = html.indexOf('✨ Chắc bạn cũng thích!');
  if (endIdx === -1) endIdx = html.indexOf('🆕 Game mới');
  if (endIdx === -1) endIdx = html.indexOf('</article>');
  if (endIdx === -1) endIdx = html.length;

  const gameContent = startIdx !== -1 ? html.slice(startIdx, endIdx) : html;

  const activeCodes = new Set();
  const expiredCodes = new Set();

  // 1. Live HTML copy buttons inside article
  const activeMatches = [...gameContent.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1].trim());
  for (const c of activeMatches) {
    if (c && c.length >= 3 && c.length <= 40) activeCodes.add(c);
  }

  // 2. FAQ active codes for this game
  const faqM = html.match(/"name":"Code [^"]* mới nhất[^"]*","acceptedAnswer":\{"@type":"Answer","text":"[^"]*?còn dùng được[^:]*:\s*([^.]+)\./i);
  if (faqM) {
    const rawFaqCodes = faqM[1].split(/,\s*/);
    for (const fc of rawFaqCodes) {
      const cleanFc = fc.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9_\-]+$/g, '');
      if (cleanFc && cleanFc.length >= 3 && cleanFc.length <= 40) {
        activeCodes.add(cleanFc);
      }
    }
  }

  // 3. Expired codes inside article (before related games)
  const expIdx = gameContent.toLowerCase().indexOf('hết hạn');
  if (expIdx !== -1) {
    const expSlice = gameContent.slice(expIdx);
    const expMatches = [...expSlice.matchAll(/<code[^>]*>([a-zA-Z0-9_\-]+)<\/code>/g)].map(m => m[1].trim());
    for (const c of expMatches) {
      if (c && c.length >= 3 && c.length <= 40 && !activeCodes.has(c)) {
        expiredCodes.add(c);
      }
    }
  }

  return {
    slug,
    activeCount: activeCodes.size,
    expiredCount: expiredCodes.size,
    activeSample: [...activeCodes].slice(0, 5),
    expiredSample: [...expiredCodes].slice(0, 5)
  };
}

async function run() {
  const sample = ['genshin-impact', 'lien-quan-mobile', 'samkok-tam-quoc', 'outerplane', 'tam-quoc-tu-thoi-ca', 'free-fire'];
  for (const s of sample) {
    const r = await testAccurateExtraction(s);
    console.log(r);
  }
}

run();
