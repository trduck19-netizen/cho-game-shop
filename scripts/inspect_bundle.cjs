const fs = require('fs');

async function inspectBundle() {
  const url = 'https://giayphep.abei.gov.vn/_next/static/chunks/app/g1/page-3b12b0c7a9886b52.js';
  const res = await fetch(url);
  const code = await res.text();
  console.log('Bundle length:', code.length);

  // Search for URLs or endpoints or GraphQL or fetch
  const urls = [...code.matchAll(/(https?:\/\/[^\s"']+|\/api\/[^\s"']+|[a-zA-Z0-9_\-\/]+(?:giay-phep|g1|game|search|page|list|license)[a-zA-Z0-9_\-\/]*)/g)].map(m => m[0]);
  console.log('Found matching URL patterns:', [...new Set(urls)]);

  // Let's search for fetch / axios / useQuery / useSWR
  const fetches = [...code.matchAll(/(?:fetch|axios|get|post)\s*\(\s*[`"']([^`"']+)[`"']/g)].map(m => m[1]);
  console.log('Fetch calls:', fetches);

  fs.writeFileSync('g1_bundle.js', code);
}

inspectBundle();
