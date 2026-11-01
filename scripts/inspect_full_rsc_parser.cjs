const fs = require('fs');

async function testExtractGameData(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();

  // Combine Next.js RSC push chunks
  const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
  const rawRsc = pushMatches.join('');
  const unescaped = rawRsc.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '');

  // 1. Extract name, publisher, platform, cover, description
  let name = '';
  let publisher = '';
  let description = '';
  let cover = '';
  let instructions = '';

  // Extract from JSON-LD schema
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      const graph = ld['@graph'] || (Array.isArray(ld) ? ld : [ld]);
      for (const item of graph) {
        if (item['@type'] === 'Article') {
          name = (item.headline || '').replace(/^Code\s+/i, '').replace(/\s+mới nhất.*$/i, '').trim();
          description = item.description || description;
        }
        if (item['@type'] === 'FAQPage' || item['acceptedAnswer']) {
          instructions = item.acceptedAnswer?.text || instructions;
        }
      }
    } catch (e) {}
  }

  // Fallback to meta tags & HTML
  if (!name) {
    const h1M = html.match(/<h1[^>]*>Code (.*?) mới nhất/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1M) name = h1M[1].replace(/mới nhất.*$/i, '').trim();
    else name = slug;
  }
  if (!cover) {
    const imgM = html.match(/<img[^>]*src="([^"]*\/covers\/[^"]+)"/i) || html.match(/property="og:image" content="([^"]+)"/i);
    cover = imgM ? (imgM[1].startsWith('http') ? imgM[1] : `https://codemoi.net${imgM[1]}`) : `https://codemoi.net/covers/${slug}.webp`;
  }
  if (!description) {
    const descM = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    if (descM) description = descM[1];
  }

  // 2. Extract structured codes from RSC payload
  const codes = [];
  const codeRegex = /\{"code":"([^"]+)","reward":("([^"]*)"|null),"status":"(active|expired)"(?:,"addedAt":"([^"]*)")?(?:,"expiresAt":("([^"]*)"|null))?(?:,"source":"([^"]*)")?/g;
  const matches = [...unescaped.matchAll(codeRegex)];

  for (const m of matches) {
    const codeVal = m[1].trim();
    const rewardVal = m[3] || 'Quà tặng tân thủ / Tri ân sự kiện';
    const statusVal = m[4] || 'active';
    const addedAtVal = m[5] || '';
    const expiresAtVal = m[7] || null;
    const sourceVal = m[8] || 'CodeMoi';

    if (codeVal && !codes.some(c => c.code.toLowerCase() === codeVal.toLowerCase())) {
      codes.push({
        code: codeVal,
        reward: rewardVal,
        status: statusVal,
        addedAt: addedAtVal,
        expiresAt: expiresAtVal,
        source: sourceVal
      });
    }
  }

  // Fallback if no structured codes matched: match aria-label buttons
  if (codes.length === 0) {
    const activeBtns = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1].trim());
    for (const c of activeBtns) {
      if (c && !codes.some(x => x.code.toLowerCase() === c.toLowerCase())) {
        codes.push({
          code: c,
          reward: 'Quà tặng tân thủ & Giftcode sự kiện',
          status: 'active',
          addedAt: new Date().toISOString().slice(0, 10),
          expiresAt: null,
          source: 'CodeMoi'
        });
      }
    }
  }

  return {
    slug,
    name,
    cover,
    description,
    instructions,
    totalCodes: codes.length,
    activeCodes: codes.filter(c => c.status === 'active'),
    expiredCodes: codes.filter(c => c.status === 'expired')
  };
}

async function run() {
  const tests = ['samkok-kingdom-crush', 'genshin-impact', 'mong-huyen-giang-ho', 'lien-quan-mobile', 'tam-quoc-tu-thoi-ca'];
  for (const t of tests) {
    const data = await testExtractGameData(t);
    console.log(`[${t}] Name: "${data.name}" | Total: ${data.totalCodes} | Active: ${data.activeCodes.length} | Expired: ${data.expiredCodes.length}`);
    if (data.activeCodes.length > 0) {
      console.log('  Active sample:', data.activeCodes.slice(0, 3).map(c => c.code));
    }
    if (data.expiredCodes.length > 0) {
      console.log('  Expired sample:', data.expiredCodes.slice(0, 3).map(c => c.code));
    }
  }
}

run();
