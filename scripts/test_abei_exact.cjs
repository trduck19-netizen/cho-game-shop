async function testAbeiExact() {
  const url = 'https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotPaging';
  
  const payloadG1 = {
    startRow: 0,
    endRow: 10,
    sortModel: [{ colId: "validFrom", sort: "desc" }],
    filterModel: {
      platformCategoryCode: {
        type: "contains",
        filterType: "text",
        filter: "QD_GAME_G1"
      }
    }
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

    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Total G1 items returned:', json?.data?.data?.length || 0);
    if (json?.data?.data?.length > 0) {
      console.log('First G1 item:\n', JSON.stringify(json.data.data[0], null, 2));
    } else {
      console.log('Raw JSON:\n', JSON.stringify(json, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAbeiExact();
