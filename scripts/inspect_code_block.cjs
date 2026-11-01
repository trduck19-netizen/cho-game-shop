const fs = require('fs');

const html = fs.readFileSync('test_game_page.html', 'utf8');

// Find all code cards / rows
// Let's search around "DEVIP15"
const target = 'DEVIP15';
const idx = html.indexOf(target);
if (idx !== -1) {
  console.log('--- Context around first code ---');
  console.log(html.slice(Math.max(0, idx - 400), Math.min(html.length, idx + 800)));
}

// Let's check if there are expired codes in another game like free-fire or tam-quoc-tu-thoi-ca
