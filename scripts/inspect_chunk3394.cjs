const fs = require('fs');

async function inspectChunk3394() {
  const res = await fetch('https://giayphep.abei.gov.vn/_next/static/chunks/3394-fc2caccb97c19978.js');
  const code = await res.text();
  fs.writeFileSync('chunk_3394.js', code);

  // Search around gpttdt-api.abei.gov.vn
  const idx = code.indexOf('https://gpttdt-api.abei.gov.vn');
  if (idx !== -1) {
    console.log('Context around API base URL:');
    console.log(code.slice(Math.max(0, idx - 200), Math.min(code.length, idx + 1500)));
  }
}

inspectChunk3394();
