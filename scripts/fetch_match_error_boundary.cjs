const fs = require('fs');

async function fetchMatchChunk() {
  const res = await fetch('https://xemgi.today/assets/MatchErrorBoundary-DVVT3WtS.js');
  console.log('Status:', res.status);
  const text = await res.text();
  fs.writeFileSync('scratch/xemgi_MatchErrorBoundary.js', text, 'utf8');
  console.log('Saved MatchErrorBoundary, length:', text.length);

  // Search for exports or code list in this file
  const dfIdx = text.indexOf('delta-force');
  console.log('delta-force index:', dfIdx);
  if (dfIdx !== -1) {
    console.log('Snippet around delta-force:\n', text.slice(Math.max(0, dfIdx - 200), dfIdx + 2000));
  }

  // Look for any codes array
  const codeArrays = [...text.matchAll(/\[("([A-Z0-9_\-]{4,25})"(?:,\s*"([A-Z0-9_\-]{4,25})"){2,})\]/g)].map(m => m[0]);
  console.log('Code arrays in MatchErrorBoundary:', codeArrays);
}

fetchMatchChunk();
