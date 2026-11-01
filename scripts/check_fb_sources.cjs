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

const fbUrls = new Map();

// From publishers (rows 5 to 22)
for (let i = 5; i <= 22; i++) {
  const r = rows[i];
  if (r && r[5] && r[5].includes('facebook.com')) {
    const url = r[5].trim();
    fbUrls.set(url, {
      name: 'Fanpage ' + r[1],
      url: url,
      publisher: r[1],
      type: 'fanpage',
      description: 'Fanpage chính thức NPH/Studio ' + r[1]
    });
  }
}

// From games (rows 26 to 146)
for (let i = 26; i <= 146; i++) {
  const r = rows[i];
  if (r && r[8] && r[8].includes('facebook.com')) {
    const url = r[8].trim();
    if (!fbUrls.has(url)) {
      fbUrls.set(url, {
        name: 'Fanpage Game ' + r[4],
        url: url,
        publisher: r[2],
        gameName: r[4],
        type: 'fanpage',
        description: 'Fanpage chính thức game ' + r[4] + ' (' + r[2] + ')'
      });
    }
  }
}

console.log('Total unique Facebook Fanpage URLs in sheet:', fbUrls.size);

const existingSources = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/crawler_sources.json'), 'utf8'));
const existingUrls = new Set(existingSources.map(s => (s.url || '').toLowerCase().replace(/\/+$/, '')));

const newFbSources = [];
for (const [url, info] of fbUrls.entries()) {
  const normUrl = url.toLowerCase().replace(/\/+$/, '');
  if (!existingUrls.has(normUrl)) {
    newFbSources.push(info);
  }
}

console.log('Already in crawler_sources.json:', fbUrls.size - newFbSources.length);
console.log('New Facebook Fanpages to add:', newFbSources.length);
console.log('\n--- NEW FACEBOOK SOURCES LIST ---');
newFbSources.forEach((s, idx) => {
  console.log(`${idx + 1}. [${s.publisher}] ${s.name}: ${s.url}`);
});

fs.writeFileSync(path.resolve(__dirname, 'new_fb_sources.json'), JSON.stringify(newFbSources, null, 2));
