async function testAbeiApi() {
  const url = 'https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotPaging';
  
  // Test query for G1
  const payloadG1 = {
    startRow: 0,
    endRow: 23,
    filterModel: {
      type: { filterType: 'text', type: 'equals', filter: 'QD_GAME_G1' }
    },
    sortModel: [{ colId: 'validFrom', sort: 'desc' }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(payloadG1)
    });

    const data = await res.json();
    console.log('G1 Response Status:', res.status);
    console.log('G1 Data sample count:', data?.data?.data?.length || 0);
    if (data?.data?.data?.length > 0) {
      console.log('Sample G1 record:', JSON.stringify(data.data.data[0], null, 2));
    } else {
      console.log('Raw data response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('API Error:', err.message);
  }

  // Test query for G234
  const payloadG234 = {
    startRow: 0,
    endRow: 23,
    filterModel: {
      type: { filterType: 'text', type: 'equals', filter: 'QD_GAME_G234' }
    },
    sortModel: [{ colId: 'validFrom', sort: 'desc' }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(payloadG234)
    });

    const data = await res.json();
    console.log('\nG234 Response Status:', res.status);
    console.log('G234 Data sample count:', data?.data?.data?.length || 0);
    if (data?.data?.data?.length > 0) {
      console.log('Sample G234 record:', JSON.stringify(data.data.data[0], null, 2));
    }
  } catch (err) {
    console.error('G234 Error:', err.message);
  }
}

testAbeiApi();
