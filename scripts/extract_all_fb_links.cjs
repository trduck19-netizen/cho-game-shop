const fs = require('fs');
const path = require('path');

// 1. Tải games188.json
const games = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/games188.json'), 'utf8'));

// 2. Tải crawler_sources.json
const crawlerSources = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/crawler_sources.json'), 'utf8'));

// 3. Tải new_fb_sources.json nếu có
let newFbSources = [];
const newFbPath = path.resolve(__dirname, 'new_fb_sources.json');
if (fs.existsSync(newFbPath)) {
  newFbSources = JSON.parse(fs.readFileSync(newFbPath, 'utf8'));
}

// 4. Tải downloaded_sheet.csv nếu có
let csvRows = [];
const csvPath = path.resolve(__dirname, 'downloaded_sheet.csv');
if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  csvRows = csvContent.split('\n');
}

console.log('--- THỐNG KÊ DỮ LIỆU ---');
console.log('Tổng số game trên trang:', games.length);
console.log('Tổng số nguồn crawler:', crawlerSources.length);

// Chuẩn hóa tên để đối chiếu
function normalizeText(str) {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Thu thập link FB theo từng game
const gameFbMap = new Map();

// Helper thêm link vào map
function addGameFb(gameIdentifier, fbUrl, sourceDesc, publisher) {
  if (!fbUrl || !fbUrl.includes('facebook.com')) return;
  const cleanUrl = fbUrl.trim().replace(/\/+$/, '');
  
  if (!gameFbMap.has(gameIdentifier)) {
    gameFbMap.set(gameIdentifier, {
      gameName: gameIdentifier,
      publisher: publisher || '',
      links: new Set(),
      sources: []
    });
  }
  const item = gameFbMap.get(gameIdentifier);
  if (!item.links.has(cleanUrl)) {
    item.links.add(cleanUrl);
    item.sources.push({ url: cleanUrl, desc: sourceDesc });
  }
  if (!item.publisher && publisher) {
    item.publisher = publisher;
  }
}

// A. Quét trong games188.json (trường instructions, description, download_*, website, fanpage...)
for (const g of games) {
  const gName = g.name || g.slug;
  const pub = g.publisher || '';
  
  const rawText = JSON.stringify(g);
  const fbRegex = /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.\-_]+/g;
  let m;
  while ((m = fbRegex.exec(rawText)) !== null) {
    addGameFb(gName, m[0], 'Trong thông tin game (' + (g.slug || '') + ')', pub);
  }
}

// B. Quét trong crawler_sources.json
for (const src of crawlerSources) {
  if (src.url && src.url.includes('facebook.com')) {
    // Tách tên game từ name: "Fanpage Chính Thức - Tên Game"
    let gameName = src.name || '';
    if (gameName.includes('-')) {
      const parts = gameName.split('-');
      gameName = parts.slice(1).join('-').trim();
    }
    gameName = gameName.replace(/^Fanpage\s+(Game\s+|Chính Thức\s+)?/i, '').trim();
    
    // Đối chiếu với danh sách games trên trang
    const normName = normalizeText(gameName);
    let matchedGame = games.find(g => normalizeText(g.name) === normName || normalizeText(g.slug) === normName);
    if (!matchedGame) {
      matchedGame = games.find(g => {
        const nG = normalizeText(g.name);
        return nG.length > 5 && (nG.includes(normName) || normName.includes(nG));
      });
    }

    const targetKey = matchedGame ? matchedGame.name : gameName;
    addGameFb(targetKey, src.url, src.description || src.name, matchedGame ? matchedGame.publisher : '');
  }
}

// C. Quét trong new_fb_sources.json
for (const s of newFbSources) {
  if (s.url && s.url.includes('facebook.com')) {
    const gameName = s.gameName || s.name || '';
    addGameFb(gameName, s.url, s.description || s.name, s.publisher || '');
  }
}

console.log('Tổng số tựa game / nguồn có link Facebook quét được:', gameFbMap.size);

// Xuất file JSON kết quả chi tiết
const results = [];
for (const [name, info] of gameFbMap.entries()) {
  results.push({
    gameName: name,
    publisher: info.publisher,
    links: Array.from(info.links),
    sources: info.sources
  });
}

// Sắp xếp theo tên game A-Z
results.sort((a, b) => a.gameName.localeCompare(b.gameName, 'vi'));

fs.writeFileSync(path.resolve(__dirname, 'game_fb_links_catalog.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Đã lưu danh mục vào scripts/game_fb_links_catalog.json!');
