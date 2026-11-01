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

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const page = targets.find(t => t.type === 'page' && t.url.includes('codegame.shop'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.removeListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.on('open', r));
  await send('Page.enable');
  await send('Runtime.enable');

  const monitorScript = `
    (() => {
      window.__mainDiffs = [];
      const main = document.querySelector('main');
      if (!main) return;

      function snapshot() {
        const snap = new Map();
        main.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          const desc = el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).slice(0, 30) : '');
          snap.set(el, { desc, h: r.height, top: r.top, bottom: r.bottom, text: (el.children.length === 0 ? el.textContent.slice(0, 30) : '') });
        });
        return snap;
      }

      let lastH = main.getBoundingClientRect().height;
      let prevSnap = snapshot();

      setInterval(() => {
        const curH = main.getBoundingClientRect().height;
        if (Math.abs(curH - lastH) > 5) {
          const curSnap = snapshot();
          const changed = [];
          for (let [el, prev] of prevSnap.entries()) {
            const cur = curSnap.get(el);
            if (cur && Math.abs(cur.h - prev.h) > 5) {
              changed.push({
                desc: cur.desc,
                prevH: prev.h,
                curH: cur.h,
                diffH: cur.h - prev.h,
                text: cur.text
              });
            }
          }
          window.__mainDiffs.push({
            oldMainH: lastH,
            newMainH: curH,
            diffMainH: curH - lastH,
            changed
          });
          lastH = curH;
          prevSnap = curSnap;
        } else {
          prevSnap = snapshot();
        }
      }, 50);
    })();
  `;

  await new Promise(r => setTimeout(r, 3000));
  await send('Runtime.evaluate', { expression: monitorScript });
  console.log('Monitoring layout for 6 seconds...');
  await new Promise(r => setTimeout(r, 6000));

  const result = await send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__mainDiffs)',
    returnByValue: true
  });

  const diffs = JSON.parse(result.result.value);
  console.log('=== MAIN DIFFS ===');
  diffs.forEach(d => console.log(JSON.stringify(d, null, 2)));

  ws.close();
  chrome.kill();
}

main().catch(console.error);
