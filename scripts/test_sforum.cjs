async function testSforum(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML length:', html.length);

    // Look for tables: <table>...<tr><td>CODE</td><td>REWARD</td><td>STATUS</td></tr>...</table>
    const tableMatches = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
    console.log('Found tables:', tableMatches.length);

    let totalCodes = 0;
    for (const tbl of tableMatches) {
      const rows = [...tbl[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const row of rows) {
        const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]+>/g, '').trim());
        if (cells.length >= 2) {
          const possibleCode = cells[0];
          // Check if looks like a code: alphanumeric, 4-25 chars
          if (/^[A-Za-z0-9_-]{4,25}$/.test(possibleCode) && !/^(code|mã|stt|tên|phần|tình|hạn)/i.test(possibleCode)) {
            console.log('Found code:', cells[0], '=>', cells[1], 'Status:', cells[2] || 'unknown');
            totalCodes++;
          }
        }
      }
    }
    console.log('Total extracted codes:', totalCodes);
  } catch (err) {
    console.error('Error:', err);
  }
}

testSforum('https://cellphones.com.vn/sforum/code-genshin-impact');
