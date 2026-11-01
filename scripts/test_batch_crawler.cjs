const fs = require('fs');

async function crawlGame(slug) {
  try {
    const res = await fetch(`https://codemoi.net/games/${slug}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.status === 200) return null;
    const html = await res.text();

    // 1. Extract Game Name
    let name = '';
    const h1Match = html.match(/<h1[^>]*>Code (.*?) mới nhất/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      name = h1Match[1].replace(/mới nhất.*$/i, '').trim();
    } else {
      const titleM = html.match(/<title>Code (.*?) mới nhất/i) || html.match(/<title>(.*?)<\/title>/i);
      name = titleM ? titleM[1].replace(/mới nhất.*$/i, '').replace(/\|.*$/i, '').trim() : slug;
    }

    // 2. Extract Icon / Cover image
    let iconUrl = '';
    const imgMatch = html.match(/<img[^>]*src="([^"]*\/covers\/[^"]+)"/i) || html.match(/property="og:image" content="([^"]+)"/i);
    if (imgMatch) {
      iconUrl = imgMatch[1].startsWith('http') ? imgMatch[1] : `https://codemoi.net${imgMatch[1]}`;
    }

    // 3. Extract Updated Date
    let updatedDate = '';
    const dateM = html.match(/Cập nhật:\s*<!--\s*-->\s*([0-9\/]+)/i);
    if (dateM) updatedDate = dateM[1];

    // 4. Extract FAQ instructions if available
    let instructions = '';
    const faqM = html.match(/"@type":"Question","name":"Cách nhập giftcode[^"]*","acceptedAnswer":\{"@type":"Answer","text":"([^"]+)"\}/);
    if (faqM) {
      instructions = faqM[1];
    }

    // 5. Extract Active Codes
    const activeCodes = [];
    const activeButtons = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
    for (const code of activeButtons) {
      if (!activeCodes.includes(code)) {
        activeCodes.push(code);
      }
    }

    // 6. Extract Expired Codes
    const expiredCodes = [];
    const expiredSecIdx = html.toLowerCase().indexOf('hết hạn');
    if (expiredSecIdx !== -1) {
      const expiredSec = html.slice(expiredSecIdx, expiredSecIdx + 4000);
      const expMatches = [...expiredSec.matchAll(/<code[^>]*>([a-zA-Z0-9_\-]+)<\/code>/g)].map(m => m[1]);
      for (const code of expMatches) {
        if (!activeCodes.includes(code) && !expiredCodes.includes(code)) {
          expiredCodes.push(code);
        }
      }
    }

    return {
      name,
      slug,
      iconUrl,
      updatedDate,
      instructions,
      activeCodes,
      expiredCodes
    };
  } catch (err) {
    console.error(`Error crawling ${slug}:`, err.message);
    return null;
  }
}

async function testBatch() {
  const slugs = [
    'aniimo',
    '3q-dao-dao-dao',
    'long-tuong-tam-quoc',
    'tam-quoc-tu-thoi-ca',
    'chinh-phuc-cuu-chau',
    'where-winds-meet-mobile',
    'quan-nhi-ca',
    'genshin-impact',
    'honkai-star-rail',
    'wuthering-waves'
  ];

  console.log('Crawling test batch of 10 games...');
  const results = await Promise.all(slugs.map(s => crawlGame(s)));
  console.log('Results summary:');
  results.forEach(r => {
    if (r) {
      console.log(`- ${r.name} (${r.slug}): ${r.activeCodes.length} active codes, ${r.expiredCodes.length} expired codes, icon: ${r.iconUrl}`);
    }
  });
}

testBatch();
