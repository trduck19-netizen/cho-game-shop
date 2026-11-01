const https = require('https');

async function testAbei() {
  const res = await fetch('https://giayphep.abei.gov.vn/g1', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const text = await res.text();
  const match = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    console.log('Next Data page:', data.page);
    console.log('pageProps keys:', Object.keys(data.props?.pageProps || {}));
    if (data.props?.pageProps) {
      console.log('Sample pageProps:', JSON.stringify(data.props.pageProps).slice(0, 1000));
    }
  } else {
    console.log('No next data tag. Searching for table/API...');
    // Look for script tags or API paths
    const apis = text.match(/\/api\/[a-zA-Z0-9_\-\/]+/g);
    console.log('Found APIs:', apis);
  }
}

testAbei().catch(console.error);
