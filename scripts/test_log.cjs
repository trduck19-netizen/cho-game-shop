const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--window-size=1024,768',
    '--no-sandbox',
    'https://codegame.shop'
  ]);

  console.log('Chrome started with PID:', chrome.pid);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const page = targets.find(t => t.type === 'page' && t.url.includes('codegame.shop'));
  if (!page) {
    console.error('Page target not found:', targets);
    chrome.kill();
    return;
  }

  console.log('Connecting to page:', page.webSocketDebuggerUrl);
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
  console.log('WebSocket connected');

  await send('Page.enable');
  await send('Runtime.enable');

  // Inject monitoring script into the page
  const monitorScript = `
    (() => {
      window.__jitterLog = [];
      window.__layoutShifts = [];

      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__layoutShifts.push({
              value: entry.value,
              hadRecentInput: entry.hadRecentInput,
              sources: entry.sources ? entry.sources.map(s => ({
                node: s.node ? (s.node.tagName + (s.node.className ? '.' + (typeof s.node.className === 'string' ? s.node.className.slice(0, 30) : '') : '')) : 'unknown',
                currentRect: s.currentRect,
                previousRect: s.previousRect
              })) : []
            });
          }
        });
        po.observe({ type: 'layout-shift', buffered: true });
      } catch(e) {
        window.__layoutShifts.push({ error: e.message });
      }

      let prevWidth = document.documentElement.clientWidth;
      let prevBodyWidth = document.body ? document.body.clientWidth : 0;
      let startTime = Date.now();

      const timer = setInterval(() => {
        const doc = document.documentElement;
        const body = document.body;
        const cw = doc.clientWidth;
        const sw = doc.scrollWidth;
        const bw = body ? body.clientWidth : 0;
        const bsw = body ? body.scrollWidth : 0;

        if (cw !== prevWidth || bw !== prevBodyWidth) {
          const overflowing = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > cw + 1) {
              overflowing.push({
                tag: el.tagName,
                class: el.className ? (typeof el.className === 'string' ? el.className.slice(0, 50) : '') : '',
                right: r.right,
                width: r.width
              });
            }
          });

          window.__jitterLog.push({
            t: Date.now() - startTime,
            prevCw: prevWidth,
            newCw: cw,
            sw,
            bw,
            bsw,
            overflowingCount: overflowing.length,
            overflowSample: overflowing.slice(0, 3)
          });
          prevWidth = cw;
          prevBodyWidth = bw;
        }
      }, 50);

      window.__stopJitterMonitor = () => clearInterval(timer);
    })();
  `;

  await send('Runtime.evaluate', { expression: monitorScript });
  console.log('Monitoring script injected, watching for 6 seconds...');

  await new Promise(r => setTimeout(r, 6000));

  const result = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({ log: window.__jitterLog, shifts: window.__layoutShifts })',
    returnByValue: true
  });

  const parsed = JSON.parse(result.result.value);
  console.log('=== JITTER LOGS ===', JSON.stringify(parsed.log, null, 2)); /*
  console.log('Width change events count:', parsed.log.length);
  parsed.log.forEach(l => console.log(JSON.stringify(l, null, 2)));

  console.log('=== LAYOUT SHIFTS (CLS) ===');
  console.log('Total layout shift events:', parsed.shifts.length);
  parsed.shifts.forEach((s, idx) => {
    console.log('Shift #' + (idx+1) + ' (score: ' + s.value + '):');
    if (s.sources) {
      s.sources.forEach(src => {
        console.log('  Source: ' + src.node);
        console.log('    prevRect:', src.previousRect);
        console.log('    currRect:', src.currentRect);
      });
    }
  });

  */ ws.close();
  chrome.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
