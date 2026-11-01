const fs = require('fs');
const path = require('path');

function stripAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

function cleanName(str) {
  return stripAccents(str).replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toSlug(str) {
  return stripAccents(str).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

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
      if (inQuotes && nextChar === '"') { currentField += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField);
      currentField = '';
      if (row.some(f => f.trim().length > 0)) lines.push(row);
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
const sheetGames = [];
for (let i = 26; i <= 146; i++) {
  const r = rows[i];
  if (r && r[4] && r[4].trim()) {
    sheetGames.push({
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

const existingGames = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/games188.json'), 'utf8'));

const matched = [];
const unmatched = [];

for (const sg of sheetGames) {
  const sNameClean = cleanName(sg.gameName);
  const sSlug = toSlug(sg.gameName);

  // Extract base name without parentheses e.g. 'Liên Minh Huyền Thoại (League of Legends)' -> 'Liên Minh Huyền Thoại' & 'League of Legends'
  const parenMatch = sg.gameName.match(/^(.*?)\s*\((.*?)\)$/);
  const nameParts = [sNameClean];
  if (parenMatch) {
    nameParts.push(cleanName(parenMatch[1]));
    nameParts.push(cleanName(parenMatch[2]));
  }

  let found = existingGames.find(eg => {
    const egNameClean = cleanName(eg.name);
    const egSlug = (eg.slug || '').toLowerCase();
    
    // Check slug exact match
    if (egSlug === sSlug) return true;

    // Check name parts
    for (const part of nameParts) {
      if (part.length > 3) {
        if (egNameClean === part) return true;
        if (egSlug === toSlug(part)) return true;
      }
    }

    // Check substring if sufficiently long (e.g. >= 6 chars)
    for (const part of nameParts) {
      if (part.length >= 7) {
        if (egNameClean.includes(part) || part.includes(egNameClean)) {
          // If either name includes the other, check if publishers match or relate
          return true;
        }
      }
    }

    return false;
  });

  if (found) {
    matched.push({ sheet: sg.gameName, matchedWith: found.name, slug: found.slug, publisher: sg.publisher });
  } else {
    unmatched.push(sg);
  }
}

console.log('Total in Sheet:', sheetGames.length);
console.log('Matched with existing games in web:', matched.length);
console.log('Unmatched (New to add):', unmatched.length);

console.log('\n--- ALL MATCHED (' + matched.length + ') ---');
matched.forEach((m, idx) => {
  console.log(`${idx + 1}. [Sheet] "${m.sheet}" === [Web] "${m.matchedWith}" (${m.slug})`);
});

console.log('\n--- ALL UNMATCHED TO ADD (' + unmatched.length + ') ---');
unmatched.forEach((u, idx) => {
  console.log(`${idx + 1}. "${u.gameName}" | NPH: ${u.publisher} | Group: ${u.group} | Platform: ${u.platform}`);
});

fs.writeFileSync(path.resolve(__dirname, 'comparison_result.json'), JSON.stringify({ matched, unmatched }, null, 2));
