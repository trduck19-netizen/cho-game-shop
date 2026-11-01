async function getAbeiCounts() {
  const url = 'https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotCount';

  for (const type of ['QD_GAME_G1', 'QD_GAME_G234']) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterModel: {
          platformCategoryCode: {
            type: 'contains',
            filterType: 'text',
            filter: type
          }
        }
      })
    });
    const json = await res.json();
    console.log(`Total records for ${type}:`, json.data);
  }
}

getAbeiCounts();
