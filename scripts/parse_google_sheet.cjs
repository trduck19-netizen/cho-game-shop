const fs = require('fs');
const path = require('path');

const SHEET_ID = '1l5PazEUQW4KJy8wT_uf-aXGDg8GOdFoNT7xXbCnP05w';

async function main() {
  console.log('Fetching Google Sheet htmlview to discover tabs...');
  const htmlUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;
  const res = await fetch(htmlUrl);
  const html = await res.text();

  const tabMatches = [...html.matchAll(/<li id="sheet-button-([^"]+)"[^>]*><a[^>]*>([^<]+)<\/a>/g)];
  console.log(`Found ${tabMatches.length} sheet tabs:`);
  for (const t of tabMatches) {
    console.log(` - ID: ${t[1]}, Name: ${t[2]}`);
  }

  // Also fetch default CSV
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
  const csvRes = await fetch(csvUrl);
  const csvText = await csvRes.text();
  fs.writeFileSync(path.resolve(__dirname, 'downloaded_sheet.csv'), csvText, 'utf8');
  console.log(`Saved default sheet CSV (${csvText.length} bytes) to scripts/downloaded_sheet.csv`);

  // If there are other tabs with gid, let's list their gids
  const gidMatches = [...html.matchAll(/gid=([0-9]+)/g)];
  const uniqueGids = [...new Set(gidMatches.map(m => m[1]))];
  console.log('Unique GIDs found in HTML:', uniqueGids);

  for (const gid of uniqueGids) {
    const tabCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    try {
      const tabRes = await fetch(tabCsvUrl);
      if (tabRes.ok) {
        const tabText = await tabRes.text();
        fs.writeFileSync(path.resolve(__dirname, `sheet_gid_${gid}.csv`), tabText, 'utf8');
        console.log(`Saved gid ${gid} (${tabText.length} bytes) to scripts/sheet_gid_${gid}.csv`);
      }
    } catch (e) {
      console.warn(`Failed to fetch gid ${gid}:`, e.message);
    }
  }
}

main().catch(console.error);
