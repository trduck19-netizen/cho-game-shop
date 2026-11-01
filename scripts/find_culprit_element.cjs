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
      // Find what changes when document.documentElement.scrollHeight changes
      window.__elementDiffs = [];
      let prevSnap = null;

      function snapshot() {
        const snap = new Map();
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          // identify element
          const id = el.id ? '#' + el.id : (el.className ? '.' + String(el.className).slice(0, 40) : el.tagName);
          snap.set(el, { id, height: r.height, top: r.top, bottom: r.bottom });
        });
        return snap;
      }

      let lastSh = document.documentElement.scrollHeight;
      setInterval(() => {
        const curSh = document.documentElement.scrollHeight;
        if (curSh !== lastSh) {
          const curSnap = snapshot();
          if (prevSnap) {
            const changed = [];
            for (let [el, prev] of prevSnap.entries()) {
              const cur = curSnap.get(el);
              if (cur && (Math.abs(cur.height - prev.height) > 1 || Math.abs(cur.bottom - prev.bottom) > 1)) {
                changed.push({
                  id: cur.id,
                  prevH: prev.height,
                  curH: cur.height,
                  prevBottom: prev.bottom,
                  curBottom: cur.bottom,
                  diffH: cur.height - prev.height
                });
              }
            }
            window.__elementDiffs.push({
              oldSh: lastSh,
              newSh: curSh,
              diffSh: curSh - lastSh,
              changedElements: changed.slice(0, 10)
            });
          }
          prevSnap = curSnap;
          lastSh = curSh;
        } else {
          if (!prevSnap) prevSnap = snapshot();
        }
      }, 50);
    })();
  `;

  await send('Runtime.evaluate', { expression: monitorScript });
  await new Promise(r => setTimeout(r, 4000));

  const result = await send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__elementDiffs)',
    returnByValue: true
  });

  const diffs = JSON.parse(result.result.value);
  console.log('=== ELEMENT HEIGHT DIFFS ===');
  diffs.forEach((d, idx) => {
    console.log(`\nChange #${idx+1}: oldSh=${d.oldSh} -> newSh=${d.newSh} (diff: ${d.diffSh})`);
    d.changedElements.forEach(el => console.log(`  ${el.id}: H ${el.prevH} -> ${el.curH} (diffH: ${el.diffH}) | Bottom ${el.prevBottom} -> ${el.curBottom}`));
  });

  ws.close();
  chrome.kill();
}

main().catch(console.error);
