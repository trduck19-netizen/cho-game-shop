const fs = require('fs');
const path = require('path');

function decodeHtmlEntities(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return String(raw)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&amp;/gi, '&')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const avJunk = new Set([
  'IN-ANIME-VANGUARDS-1024X576',
  'IN-ANIME-VANGUARDS-145X82',
  'IN-ANIME-VANGUARDS-150X84',
  'IN-ANIME-VANGUARDS-1536X864',
  'IN-ANIME-VANGUARDS-367X206',
  'IN-ANIME-VANGUARDS-400X225',
  'IN-ANIME-VANGUARDS-616X347',
  'IN-ANIME-VANGUARDS-768X432',
  'IN-ANIME-VANGUARDS-781X439'
]);

const dhJunk = new Set([
  'IN-DA-HOOD-1024X576',
  'IN-DA-HOOD-145X82',
  'IN-DA-HOOD-367X206',
  'IN-DA-HOOD-400X225',
  'IN-DA-HOOD-768X432',
  'IN-DA-HOOD-781X439'
]);

const tsJunk = new Set([
  'IN-TYPE-SOUL-1024X576',
  'IN-TYPE-SOUL-145X82',
  'IN-TYPE-SOUL-150X84',
  'IN-TYPE-SOUL-367X206',
  'IN-TYPE-SOUL-400X225',
  'IN-TYPE-SOUL-768X432',
  'IN-TYPE-SOUL-781X439'
]);

function isImageJunkCode(code, slug) {
  const upper = String(code || '').trim().toUpperCase();
  if (slug === 'anime-vanguards' && avJunk.has(upper)) return true;
  if (slug === 'da-hood' && dhJunk.has(upper)) return true;
  if (slug === 'type-soul' && tsJunk.has(upper)) return true;
  if (/^IN-.*-\d+X\d+$/i.test(upper)) return true;
  return false;
}

const targetFiles = [
  'src/data/crawled_codes_188.json',
  'public/data/codes_database.json',
  'public/data/crawled_codes_188.json',
  'data/crawled_codes_188.json',
  'data/games188.json'
];

for (const relPath of targetFiles) {
  const file = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(file)) continue;
  console.log(`\n========================================\nĐang quét & làm sạch: ${relPath}`);
  
  if (relPath === 'data/games188.json') {
    let games = JSON.parse(fs.readFileSync(file, 'utf8'));
    let cleanedEntities = 0;
    let junkRemoved = 0;
    for (const g of games) {
      if (Array.isArray(g.codes)) {
        const origLen = g.codes.length;
        g.codes = g.codes.filter(c => !isImageJunkCode(c.code || c.codeValue, g.slug));
        junkRemoved += (origLen - g.codes.length);
        for (const c of g.codes) {
          if (c.rewards) {
            const orig = c.rewards;
            c.rewards = decodeHtmlEntities(c.rewards);
            if (orig !== c.rewards) cleanedEntities++;
          }
          if (c.description) c.description = decodeHtmlEntities(c.description);
        }
      }
    }
    console.log(`- data/games188.json: Đã xóa ${junkRemoved} mã rác ảnh, làm sạch ${cleanedEntities} rewards HTML entities.`);
    fs.writeFileSync(file, JSON.stringify(games, null, 2), 'utf8');
    continue;
  }

  // Array of codes
  let codes = JSON.parse(fs.readFileSync(file, 'utf8'));
  const initialCount = codes.length;

  const filtered = codes.filter(c => {
    const slug = c.gameSlug || c.game_slug;
    const code = c.code || c.codeValue || c.gift_code || '';
    return !isImageJunkCode(code, slug);
  });

  let cleanedEntitiesCount = 0;
  for (const c of filtered) {
    if (c.rewards) {
      const orig = c.rewards;
      c.rewards = decodeHtmlEntities(c.rewards);
      if (orig !== c.rewards) cleanedEntitiesCount++;
    }
    if (c.description) {
      c.description = decodeHtmlEntities(c.description);
    }
  }

  console.log(`- Ban đầu: ${initialCount} mã.`);
  console.log(`- Đã xóa ${initialCount - filtered.length} mã rác ảnh WordPress.`);
  console.log(`- Đã làm sạch ${cleanedEntitiesCount} phần thưởng chứa HTML entity (&nbsp;).`);

  const avCount = filtered.filter(c => (c.gameSlug || c.game_slug) === 'anime-vanguards').length;
  const dhCount = filtered.filter(c => (c.gameSlug || c.game_slug) === 'da-hood').length;
  const tsCount = filtered.filter(c => (c.gameSlug || c.game_slug) === 'type-soul').length;
  const inCount = filtered.filter(c => String(c.code || c.codeValue || '').startsWith('IN-')).length;
  const nbspCount = filtered.filter(c => (c.rewards || '').includes('&nbsp;')).length;

  console.log(`- Anime Vanguards: ${avCount} mã`);
  console.log(`- Da Hood: ${dhCount} mã`);
  console.log(`- Type Soul: ${tsCount} mã`);
  console.log(`- Mã còn bắt đầu bằng IN-: ${inCount}`);
  console.log(`- Mã còn chứa &nbsp;: ${nbspCount}`);

  fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf8');
}

console.log('\n✅ Hoàn tất dọn dẹp toàn bộ file baseline!');
