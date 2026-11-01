const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--window-size=1024,768',
    '--no-sandbox',
    'https://codegame.shop'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const targets = await new Promise((res, rej) => http.get('http://127.0.0.1:9222/json', r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }));
  const page = targets.find(t => t.type === 'page' && t.url.includes('codegame.shop'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise(r => {
    const curId = id++;
    const h = (data) => { const m = JSON.parse(data); if (m.id === curId) { ws.removeListener('message', h); r(m.result); } };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, curId, method, params }));
  });
  await new Promise(r => ws.on('open', r));
  await send('Page.enable');
  await send('Runtime.enable');

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const doc = document.documentElement;
      const b = document.body;
      const docStyle = window.getComputedStyle(doc);
      const bStyle = window.getComputedStyle(b);
      return {
        docOverflowX: docStyle.overflowX,
        docOverflowY: docStyle.overflowY,
        bodyOverflowX: bStyle.overflowX,
        bodyOverflowY: bStyle.overflowY,
        docWidth: doc.clientWidth,
        bodyWidth: b.clientWidth,
        windowInnerWidth: window.innerWidth,
        docScrollWidth: doc.scrollWidth,
        bodyScrollWidth: b.scrollWidth
      };
    })()`,
    returnByValue: true
  });
  console.log('Computed styles & widths:', evalRes.result.value);
  ws.close();
  chrome.kill();
}
main().catch(console.error);
