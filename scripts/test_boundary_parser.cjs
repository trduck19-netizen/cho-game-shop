const fs = require('fs');

async function testGame(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();

  // 1. Boundary of current game content (exclude related/hot games)
  const startIdx = html.indexOf('<article');
  let endIdx = html.indexOf('✨ Chắc bạn cũng thích!');
  if (endIdx === -1) endIdx = html.indexOf('🆕 Game mới');
  if (endIdx === -1) endIdx = html.indexOf('</article>');
  if (endIdx === -1) endIdx = html.length;

  const gameContent = startIdx !== -1 ? html.slice(startIdx, endIdx) : html;

  // 2. Game Title
  let name = '';
  const h1M = html.match(/<h1[^>]*>Code (.*?) mới nhất/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1M) name = h1M[1].replace(/mới nhất.*$/i, '').trim();
  else name = slug;

  // 3. Icon / Cover URL
  const imgM = html.match(/<img[^>]*src="([^"]*\/covers\/[^"]+)"/i) || html.match(/property="og:image" content="([^"]+)"/i);
  let icon_url = imgM ? (imgM[1].startsWith('http') ? imgM[1] : `https://codemoi.net${imgM[1]}`) : `https://codemoi.net/covers/${slug}.webp`;

  // 4. Instructions
  let instructions = '';
  const faqM = html.match(/"name":"Cách nhập giftcode[^"]*","acceptedAnswer":\{"@type":"Answer","text":"([^"]+)"\}/);
  if (faqM) {
    instructions = faqM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }

  // 5. Active Codes (from Copy code buttons in game body)
  const activeCodes = [];
  const activeMatches = [...gameContent.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1].trim());
  for (const c of activeMatches) {
    if (c && !activeCodes.includes(c)) activeCodes.push(c);
  }

  // Also check FAQ for any active codes mentioned
  const faqCodesM = html.match(/"name":"Code [^"]* mới nhất[^"]*","acceptedAnswer":\{"@type":"Answer","text":"[^"]*?còn dùng được[^:]*:\s*([^.]+)\./i);
  if (faqCodesM) {
    const rawFaqCodes = faqCodesM[1].split(/,\s*/);
    for (const fc of rawFaqCodes) {
      const cleanFc = fc.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9_\-]+$/g, '');
      if (cleanFc && !activeCodes.includes(cleanFc) && cleanFc.length >= 3 && cleanFc.length <= 40) {
        activeCodes.push(cleanFc);
      }
    }
  }

  // 6. Expired Codes (from hết hạn section in game body)
  const expiredCodes = [];
  const expIdx = gameContent.toLowerCase().indexOf('hết hạn');
  if (expIdx !== -1) {
    const expSlice = gameContent.slice(expIdx);
    const expMatches = [...expSlice.matchAll(/<code[^>]*>([a-zA-Z0-9_\-]+)<\/code>/g)].map(m => m[1].trim());
    for (const c of expMatches) {
      if (c && !activeCodes.includes(c) && !expiredCodes.includes(c)) {
        expiredCodes.push(c);
      }
    }
  }

  return {
    slug,
    name,
    icon_url,
    instructions: instructions.slice(0, 100) + (instructions.length > 100 ? '...' : ''),
    activeCount: activeCodes.length,
    activeCodes,
    expiredCount: expiredCodes.length,
    expiredCodes
  };
}

async function run() {
  const testList = [
    'free-fire',
    'lien-quan-mobile',
    'genshin-impact',
    'honkai-star-rail',
    'tam-quoc-chi-chien-luoc-tth',
    'outerplane',
    'hac-tay-du-chuong-cam',
    '3q-dao-dao-dao',
    'aniimo',
    'long-tuong-tam-quoc'
  ];

  for (const s of testList) {
    const res = await testGame(s);
    console.log(`\n=== [${res.slug}] ${res.name} ===`);
    console.log(`Icon: ${res.icon_url}`);
    console.log(`Active (${res.activeCount}):`, res.activeCodes);
    console.log(`Expired (${res.expiredCount}):`, res.expiredCodes);
    console.log(`Guide:`, res.instructions);
  }
}

run();
