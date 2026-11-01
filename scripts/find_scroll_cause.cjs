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
      window.__scrollLogs = [];
      let startTime = Date.now();
      let prevSh = 0;
      let prevBw = 0;

      const timer = setInterval(() => {
        const doc = document.documentElement;
        const body = document.body;
        const sh = doc.scrollHeight;
        const ih = window.innerHeight;
        const bw = body ? body.clientWidth : 0;
        const cw = doc.clientWidth;

        if (sh !== prevSh || bw !== prevBw) {
          window.__scrollLogs.push({
            t: Date.now() - startTime,
            sh,
            ih,
            isScrollable: sh > ih,
            bw,
            cw
          });
          prevSh = sh;
          prevBw = bw;
        }
      }, 30);
    })();
  `;

  await send('Runtime.evaluate', { expression: monitorScript });
  await new Promise(r => setTimeout(r, 5000));

  const result = await send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__scrollLogs)',
    returnByValue: true
  });

  console.log('Scroll logs:', JSON.parse(result.result.value));
  ws.close();
  chrome.kill();
}

main().catch(console.error);
