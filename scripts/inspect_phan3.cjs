const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, 'downloaded_sheet.csv'), 'utf8');

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

console.log('--- PHẦN 3 ANALYSIS ---');
for (let i = 145; i < Math.min(rows.length, 200); i++) {
  const r = rows[i];
  if (r.some(f => f.includes('BẢNG') || f.includes('PHẦN') || f.includes('STT'))) {
    console.log(`[Row ${i}]`, r.filter(f => f.trim().length > 0).join(' | '));
  }
}
