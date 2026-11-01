const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, 'downloaded_sheet.csv');
const content = fs.readFileSync(csvPath, 'utf8');

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField);
      currentField = '';
      if (row.some(f => f.trim().length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField);
    if (row.some(f => f.trim().length > 0)) lines.push(row);
  }
  return lines;
}

const rows = parseCSV(content);

// 1. Parse Publishers (Phần 1: Rows 4 to 22)
const publisherHeader = rows[4];
console.log('Publishers Header:', publisherHeader);
const publishers = [];
for (let i = 5; i <= 22; i++) {
  const r = rows[i];
  if (r && r[1]) {
    publishers.push({
      stt: r[0],
      name: r[1],
      legalName: r[2],
      type: r[3],
      homepage: r[4],
      fanpage: r[5],
      gameCount: r[6]
    });
  }
}
console.log(`Found ${publishers.length} publishers in Phần 1.`);

// 2. Parse Games (Phần 2: Rows 25 to 146)
const gamesHeader = rows[25];
console.log('Games Header (Phần 2):', gamesHeader);
const games = [];
for (let i = 26; i <= 146; i++) {
  const r = rows[i];
  if (r && r[4] && r[4].trim()) {
    games.push({
      sttTotal: r[0],
      sttNph: r[1],
      publisher: r[2],
      group: r[3],
      gameName: r[4].trim(),
      genre: r[5],
      platform: r[6],
      officialUrl: r[7],
      fanpageUrl: r[8],
      status: r[9] || 'Đang hoạt động'
    });
  }
}
console.log(`Found ${games.length} games in Phần 2.`);
console.log('Sample game 0:', games[0]);
console.log('Sample game 1:', games[1]);

// Check existing games in web-code-game
const existingGamesPath = path.resolve(__dirname, '../src/data/games188.json');
const existingGames = JSON.parse(fs.readFileSync(existingGamesPath, 'utf8'));
console.log(`Total existing games in web: ${existingGames.length}`);

const existingNames = new Set(existingGames.map(g => (g.name || '').toLowerCase().trim()));
const existingSlugs = new Set(existingGames.map(g => (g.slug || '').toLowerCase().trim()));

const newGames = [];
const matchedGames = [];

for (const g of games) {
  const cleanName = g.gameName.toLowerCase().trim();
  const matched = existingGames.find(eg => {
    const egName = (eg.name || '').toLowerCase().trim();
    if (egName === cleanName) return true;
    // Check if name includes or vice versa
    if (cleanName.length > 5 && egName.includes(cleanName)) return true;
    if (egName.length > 5 && cleanName.includes(egName)) return true;
    return false;
  });

  if (matched) {
    matchedGames.push({ sheetGame: g, existing: matched });
  } else {
    newGames.push(g);
  }
}

console.log(`Matched games already in web: ${matchedGames.length}`);
console.log(`New games to be added: ${newGames.length}`);
newGames.forEach((ng, idx) => {
  console.log(`[New ${idx + 1}] "${ng.gameName}" | NPH: ${ng.publisher} | Fanpage: ${ng.fanpageUrl}`);
});

fs.writeFileSync(path.resolve(__dirname, 'sheet_parsed_summary.json'), JSON.stringify({
  publishers,
  totalGames: games.length,
  matchedCount: matchedGames.length,
  newCount: newGames.length,
  newGames,
  matchedGames: matchedGames.map(m => ({ sheet: m.sheetGame.gameName, existing: m.existing.name, slug: m.existing.slug }))
}, null, 2), 'utf8');
