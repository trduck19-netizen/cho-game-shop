const fs = require('fs');

async function inspectAbei() {
  const res = await fetch('https://giayphep.abei.gov.vn/g1');
  const html = await res.text();
  fs.writeFileSync('abei_g1.html', html);

  // Check table or api calls
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/g);
  console.log('Tables found:', tableMatches ? tableMatches.length : 0);

  // Check API endpoints in script tags
  const apiMatches = [...html.matchAll(/\/api\/[a-zA-Z0-9_\-\/]+/g)].map(m => m[0]);
  console.log('API endpoints found:', apiMatches);

  // Check script tags
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  console.log('Scripts:', scripts);

  // Check RSC or JSON data
  const jsonMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
  console.log('RSC pushes found:', jsonMatches.length);
  if (jsonMatches.length > 0) {
    fs.writeFileSync('abei_rsc.txt', jsonMatches.join('\n'));
  }
}

inspectAbei();
