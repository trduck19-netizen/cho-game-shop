const fs = require('fs');

const rsc = fs.readFileSync('rsc_dump.txt', 'utf8');

// Unescape JSON string escapes
let unescaped = rsc
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\')
  .replace(/\\n/g, '\n')
  .replace(/\\t/g, '\t');

fs.writeFileSync('rsc_unescaped.txt', unescaped);

// Search for patterns of codes in unescaped text
console.log('Unescaped length:', unescaped.length);

// Look for code items or objects
const codeObjects = [];
const codeRegex = /"code":"([^"]+)","rewards":"([^"]*)"/g;
let m;
while ((m = codeRegex.exec(unescaped)) !== null) {
  codeObjects.push({ code: m[1], rewards: m[2] });
}
console.log('Found codes via regex:', codeObjects);

// Let's check sections or status
const hasActiveSection = unescaped.includes('còn dùng được') || unescaped.includes('Hoạt động') || unescaped.includes('Còn hạn') || unescaped.includes('active');
console.log('Has active markers:', hasActiveSection);

const hasExpiredSection = unescaped.includes('Hết hạn') || unescaped.includes('expired') || unescaped.includes('hết hạn');
console.log('Has expired markers:', hasExpiredSection);

// Let's find snippets around words like "code", "quà", "hạn"
const lines = unescaped.split('\n');
console.log('Total lines:', lines.length);
for (let i = 0; i < Math.min(lines.length, 50); i++) {
  if (lines[i].includes('code') || lines[i].includes('giftcode') || lines[i].includes('game')) {
    console.log(`Line ${i}:`, lines[i].slice(0, 150));
  }
}
