const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, 'downloaded_sheet.csv');
const text = fs.readFileSync(csvPath, 'utf8');

function parseCSV(content) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

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

const rows = parseCSV(text);
console.log('Total parsed rows:', rows.length);

// Print sample rows around section headers
rows.forEach((r, idx) => {
  const lineText = r.join(' | ');
  if (lineText.includes('PHẦN') || lineText.includes('STT') || idx < 15) {
    console.log(`[Row ${idx}]`, lineText.slice(0, 150));
  }
});
