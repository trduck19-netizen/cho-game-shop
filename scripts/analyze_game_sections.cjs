const fs = require('fs');

const html = fs.readFileSync('test_game_page.html', 'utf8');

// Let's inspect sections
const sections = html.split(/<section[^>]*>/);
console.log('Total sections:', sections.length);

sections.forEach((sec, idx) => {
  const heading = sec.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);
  console.log(`\nSection ${idx} heading:`, heading ? heading[1].replace(/<[^>]+>/g, '').trim() : 'No heading');
  
  // Find all copy buttons in this section
  const buttons = [...sec.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
  if (buttons.length > 0) {
    console.log(`  Found ${buttons.length} codes:`, buttons);
  }
});
