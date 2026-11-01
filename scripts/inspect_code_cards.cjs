const fs = require('fs');

const html = fs.readFileSync('test_game_page.html', 'utf8');

const jsonEnd = html.indexOf('</script><div class="mb-4');
if (jsonEnd !== -1) {
  console.log(html.slice(jsonEnd + 9, jsonEnd + 2500));
}
