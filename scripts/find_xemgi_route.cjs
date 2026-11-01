const fs = require('fs');

const bundle = fs.readFileSync('scratch/xemgi_bundle.js', 'utf8');
const routesIdx = bundle.indexOf('path:"/codes"');
console.log('Index of path:/codes:', routesIdx);
if (routesIdx !== -1) {
  console.log('Snippet around /codes:\n', bundle.slice(Math.max(0, routesIdx - 200), routesIdx + 400));
} else {
  // Search for "codes"
  const allCodesMatches = [...bundle.matchAll(/codes/gi)];
  console.log('Total "codes" matches in bundle:', allCodesMatches.length);
  allCodesMatches.forEach(m => {
    const idx = m.index;
    console.log('Match snippet:', bundle.slice(Math.max(0, idx - 100), idx + 150));
  });
}
