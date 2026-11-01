const fs = require('fs');
const path = require('path');

const ABEI_API_URL = 'https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotPaging';

async function fetchLicenses(categoryCode, maxRows = 20000) {
  console.log(`[ABEI] Đang tải danh sách giấy phép ${categoryCode}...`);
  const allItems = [];
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < maxRows; i += batchSize) {
    batches.push({ startRow: i, endRow: i + batchSize });
  }

  // Tải đồng thời theo cụm 15 requests
  const concurrency = 15;
  for (let i = 0; i < batches.length; i += concurrency) {
    const slice = batches.slice(i, i + concurrency);
    const results = await Promise.all(slice.map(async ({ startRow, endRow }) => {
      try {
        const res = await fetch(ABEI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            startRow,
            endRow,
            sortModel: [{ colId: 'validFrom', sort: 'desc' }],
            filterModel: {
              platformCategoryCode: {
                type: 'contains',
                filterType: 'text',
                filter: categoryCode
              }
            }
          })
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data?.data || [];
      } catch (err) {
        return [];
      }
    }));

    let stop = false;
    for (const items of results) {
      if (items.length > 0) {
        allItems.push(...items);
      } else {
        stop = true;
      }
    }
    process.stdout.write(`\r[ABEI] Đã tải ${allItems.length} bản ghi ${categoryCode}...`);
    if (stop && allItems.length > 0) break;
  }
  console.log(`\n[ABEI] Hoàn tất tải ${allItems.length} giấy phép ${categoryCode}!`);
  return allItems;
}

async function main() {
  const startTime = Date.now();
  const [g1List, g234List] = await Promise.all([
    fetchLicenses('QD_GAME_G1', 4000),
    fetchLicenses('QD_GAME_G234', 18000)
  ]);

  const rawOut = {
    fetchedAt: new Date().toISOString(),
    totalG1: g1List.length,
    totalG234: g234List.length,
    g1: g1List.map(item => ({
      licenseNumber: item.licenseNumber,
      issueDate: item.issueDate,
      companyName: item.companyName,
      gameNameVietnam: item.licenseDetail?.gameNameVietnam || '',
      gameNameCopyright: item.licenseDetail?.gameNameCopyright || '',
      gameHomepage: item.licenseDetail?.gameHomepage || '',
      ageRating: item.licenseDetail?.ageRating || '',
      status: item.status || 'valid',
      type: 'G1'
    })),
    g234: g234List.map(item => ({
      licenseNumber: item.licenseNumber,
      issueDate: item.issueDate,
      companyName: item.companyName,
      gameNameVietnam: item.licenseDetail?.gameNameVietnam || '',
      gameNameCopyright: item.licenseDetail?.gameNameCopyright || '',
      gameHomepage: item.licenseDetail?.gameHomepage || '',
      ageRating: item.licenseDetail?.ageRating || '',
      status: item.status || 'valid',
      type: 'G234'
    }))
  };

  const outPath = path.join(__dirname, 'abei_database.json');
  fs.writeFileSync(outPath, JSON.stringify(rawOut, null, 2), 'utf8');
  console.log(`[ABEI] Đã lưu vào ${outPath} (${((Date.now() - startTime) / 1000).toFixed(2)}s)`);
}

main().catch(console.error);
