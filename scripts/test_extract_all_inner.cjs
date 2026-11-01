const fs = require('fs');

async function testInnerExtract(slug) {
  const res = await fetch(`https://codemoi.net/games/${slug}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();
  const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  // Match the specific game block for `slug`
  // Pattern: {"slug":"<slug>",...,"codes":[...]}
  const reg = new RegExp(`\\{"slug":"${slug}"[^{}]*(?:\\{[^{}]*\\}[^{}]*)*"codes":(\\[[^\\]]*\\])`, 'i');
  const match = unescaped.match(reg);

  if (match) {
    const codesStr = match[1];
    const codeItems = [];
    const innerRegex = /\{"code":"([^"]+)","reward":"([^"]*)","status":"([^"]+)"(?:,"addedAt":"([^"]*)")?(?:,"expiresAt":([^,}]+))?/g;
    let m;
    while ((m = innerRegex.exec(codesStr)) !== null) {
      codeItems.push({
        code: m[1],
        reward: m[2],
        status: m[3],
        addedAt: m[4],
        expiresAt: m[5] !== 'null' ? m[5] : null
      });
    }
    return codeItems;
  }
  return [];
}

async function run() {
  const tests = ['3q-dao-dao-dao', 'tam-quoc-tu-thoi-ca', 'outerplane', 'samkok-tam-quoc', 'lien-quan-mobile'];
  for (const t of tests) {
    const items = await testInnerExtract(t);
    console.log(`[${t}] Inner code items found: ${items.length}`);
    if (items.length > 0) {
      console.log('Sample item:', items[0]);
      console.log('Active:', items.filter(x => x.status === 'active').length, 'Expired:', items.filter(x => x.status === 'expired').length);
    }
  }
}

run();
