async function checkTamQuoc() {
  const res = await fetch('https://codemoi.net/games/tam-quoc-tu-thoi-ca/');
  console.log('Status:', res.status);
  if (res.status === 200) {
    const html = await res.text();
    const copyCodes = [...html.matchAll(/aria-label="Copy code ([^"]+)"/g)].map(m => m[1]);
    console.log('Active codes on codemoi.net for Tam Quoc Tu Thoi Ca:', copyCodes);
    const expIdx = html.toLowerCase().indexOf('hết hạn');
    if (expIdx !== -1) {
      const expSlice = html.slice(expIdx, expIdx + 1500);
      const expCodes = [...expSlice.matchAll(/<code[^>]*>([^<]+)<\/code>/g)].map(m => m[1]);
      console.log('Expired codes:', expCodes);
    }
  }
}
checkTamQuoc();
