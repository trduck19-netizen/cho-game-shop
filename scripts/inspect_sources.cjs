const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/client/data');

function cleanText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function analyze() {
  const curGames = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'games188.json'), 'utf8'));
  const curCodes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'crawled_codes_188.json'), 'utf8'));

  const existingSlugMap = new Map();
  const existingNameMap = new Map();
  curGames.forEach(g => {
    existingSlugMap.set(g.slug.toLowerCase(), g);
    existingNameMap.set(cleanText(g.name), g);
  });

  const existingCodesMap = new Set();
  curCodes.forEach(c => {
    const slug = (c.gameSlug || c.gameId || '').toLowerCase();
    const val = (c.codeValue || c.code_value || '').toUpperCase().trim();
    if (slug && val) existingCodesMap.add(`${slug}_${val}`);
  });

  // 1. Analyze raw_codemoi_all_crawled.json
  const codemoiPath = path.join(DATA_DIR, 'raw_codemoi_all_crawled.json');
  let codemoiNewGames = 0;
  let codemoiNewCodes = 0;
  let codemoiExistingGameNewCodes = 0;

  if (fs.existsSync(codemoiPath)) {
    const codemoi = JSON.parse(fs.readFileSync(codemoiPath, 'utf8'));
    for (const c of codemoi) {
      const slug = (c.slug || '').replace(/\/danh-gia$/, '').toLowerCase().trim();
      const name = (c.gameName || '').replace(/\/danh gia$/i, '').trim();
      if (!slug || !name || name.length < 2 || name.includes('(Tháng')) continue;

      const rawCodes = (c.activeCodes || []).concat(c.codes || []);
      const distinctCodes = [...new Set(rawCodes.map(x => String(x).trim().toUpperCase()))].filter(x => x.length >= 3);
      if (distinctCodes.length === 0) continue;

      const isExisting = existingSlugMap.has(slug) || existingNameMap.has(cleanText(name));
      if (!isExisting) {
        codemoiNewGames++;
        codemoiNewCodes += distinctCodes.length;
      } else {
        const targetSlug = existingSlugMap.get(slug)?.slug || existingNameMap.get(cleanText(name))?.slug;
        for (const code of distinctCodes) {
          if (!existingCodesMap.has(`${targetSlug}_${code}`)) {
            codemoiExistingGameNewCodes++;
          }
        }
      }
    }
  }

  console.log(`\n=== KẾT QUẢ PHÂN TÍCH raw_codemoi_all_crawled.json ===`);
  console.log(`- Số game MỚI tiềm năng có thể thêm: ${codemoiNewGames}`);
  console.log(`- Số mã code đi kèm game mới: ${codemoiNewCodes}`);
  console.log(`- Số mã code MỚI cho các game đã có sẵn: ${codemoiExistingGameNewCodes}`);

  // 3. Analyze ABEI licenses
  const abeiPath = path.join(DATA_DIR, 'abei_all_licenses_crawled.json');
  if (fs.existsSync(abeiPath)) {
    const abei = JSON.parse(fs.readFileSync(abeiPath, 'utf8'));
    const unaddedAbei = [];
    const seenNames = new Set();

    for (const lic of abei) {
      const d = lic.licenseDetail || {};
      const name = (d.gameNameVietnam || lic.gameNameVietnam || '').trim();
      const norm = cleanText(name);
      if (!name || norm.length < 3 || seenNames.has(norm)) continue;
      seenNames.add(norm);

      if (!existingNameMap.has(norm)) {
        unaddedAbei.push({
          name,
          publisher: lic.companyName || d.companyName || 'Nhà phát hành chính thức',
          licenseNumber: lic.licenseNumber || lic.licenseRef || '',
          issueDate: lic.issueDate || lic.validFrom || '',
          ageRating: d.ageRating || '16+',
          homepage: d.gameHomepage || '',
          channel: d.distributionChannel || ''
        });
      }
    }
    console.log(`\n=== NGUỒN ABEI (2,020 giấy phép G1) ===`);
    console.log(`- Số game có giấy phép G1 chưa có trong hệ thống: ${unaddedAbei.length} game.`);
    console.log(`- Mẫu 10 game G1 mới nhất từ ABEI:`);
    unaddedAbei.slice(0, 10).forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.name} (${g.publisher}) - GP: ${g.licenseNumber} - Ngày: ${g.issueDate}`);
    });
  }
}

analyze();


