const fs = require('fs');

const html = fs.readFileSync('test_game_page.html', 'utf8');

const codeStart = html.indexOf('aria-label="Copy code DEVIP15"');
if (codeStart !== -1) {
  console.log(html.slice(codeStart - 500, codeStart + 1500));
}
