async function searchGame(name) {
  const body = {
    startRow: 0,
    endRow: 5,
    sortModel: [{ sort: "desc", colId: "validFrom" }],
    filterModel: {
      platformCategoryCode: {
        type: "in",
        filterType: "set",
        values: ["QD_GAME_G1", "QD_GAME_G234"]
      },
      ftsValue: {
        type: "contains",
        filterType: "text",
        filter: name
      }
    }
  };

  const res = await fetch("https://gpttdt-api.abei.gov.vn/services/mcrlmtp/api/license/pivotPaging", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Origin": "https://giayphep.abei.gov.vn",
      "Referer": "https://giayphep.abei.gov.vn/"
    },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  const rows = json.data?.data || [];
  console.log(`Results for "${name}":`, rows.length);
  rows.forEach(r => {
    console.log(`- ${r.licenseDetail?.gameNameVietnam || r.licenseDetail?.gameNameCopyright} | Số GP: ${r.licenseNumber} | Ngày cấp: ${r.issueDate} | NPH: ${r.companyName}`);
  });
}

async function run() {
  await searchGame("Liên Quân");
  await searchGame("Huyền Thoại Hải Tặc");
  await searchGame("Genshin Impact");
}

run().catch(console.error);
