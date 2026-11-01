const fs = require('fs');

const testSlugs = [
  'free-fire',
  'genshin-impact',
  'tam-quoc-chi-chien-luoc-tth',
  'outerplane',
  'gunpow',
  'honkai-star-rail',
  'hac-tay-du-chuong-cam'
];

async function inspect(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`);
  const html = await res.text();
  
  // Name
  let name = '';
  const h1M = html.match(/<h1[^>]*>Code (.*?) mới nhất/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1M) name = h1M[1].replace(/mới nhất.*$/i, '').trim();

  // Active codes
  const activeCodes = [];
  const codeCards = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
  for (const c of codeCards) {
    if (!activeCodes.includes(c)) activeCodes.push(c);
  }

  // Expired codes
  const expiredCodes = [];
  const expIdx = html.toLowerCase().indexOf('hết hạn');
  if (expIdx !== -1) {
    const slice = html.slice(expIdx, expIdx + 5000);
    const m = [...slice.matchAll(/<code[^>]*>([a-zA-Z0-9_\-]+)<\/code>/g)].map(x => x[1]);
    for (const c of m) {
      if (!activeCodes.includes(c) && !expiredCodes.includes(c)) expiredCodes.push(c);
    }
  }

  // Cover image
  const imgM = html.match(/<img[^>]*src="([^"]*\/covers\/[^"]+)"/i) || html.match(/property="og:image" content="([^"]+)"/i);
  let icon = imgM ? (imgM[1].startsWith('http') ? imgM[1] : 'https://codemoi.net' + imgM[1]) : '';

  // Instructions
  let instructions = '';
  const faqM = html.match(/"acceptedAnswer":\{"@type":"Answer","text":"([^"]+)"\}/);
  if (faqM) instructions = faqM[1];

  console.log({
    slug,
    name,
    icon,
    activeCount: activeCodes.length,
    activeSample: activeCodes.slice(0, 3),
    expiredCount: expiredCodes.length,
    expiredSample: expiredCodes.slice(0, 3),
    hasInstructions: !!instructions
  });
}

(async () => {
  for (const s of testSlugs) {
    await inspect(s);
  }
})();
