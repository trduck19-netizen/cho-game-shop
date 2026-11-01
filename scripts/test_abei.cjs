async function testAbei() {
  try {
    const res1 = await fetch('https://giayphep.abei.gov.vn/g1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const text1 = await res1.text();
    console.log('G1 Status:', res1.status, 'Length:', text1.length);
    console.log('G1 snippet:', text1.slice(0, 500));
  } catch (err) {
    console.error('G1 Error:', err.message);
  }

  try {
    const res2 = await fetch('https://giayphep.abei.gov.vn/g', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const text2 = await res2.text();
    console.log('\nG Status:', res2.status, 'Length:', text2.length);
    console.log('G snippet:', text2.slice(0, 500));
  } catch (err) {
    console.error('G Error:', err.message);
  }
}

testAbei();
