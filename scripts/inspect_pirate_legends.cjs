const fs = require('fs');

async function checkPirateLegends() {
  const res = await fetch('https://codemoi.net/games/pirate-legends/');
  const html = await res.text();
  console.log('Status: 200, length:', html.length);
  const h1M = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  console.log('H1:', h1M ? h1M[1] : 'none');
  
  // Extract active copy codes
  const copyCodes = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
  console.log('Copy codes (Active):', copyCodes);

  // Extract all code tags
  const codeTags = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  console.log('All code tags:', codeTags);

  // Extract FAQs or descriptions
  const descM = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
  console.log('Meta description:', descM ? descM[1] : 'none');
}

checkPirateLegends().catch(console.error);
