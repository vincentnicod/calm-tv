// Screenshots designs.html (#d=1..5&f=focus) at 1920x1080 in headless Brave.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots'); fs.mkdirSync(out, { recursive: true });
const shots = process.argv.slice(2).length ? process.argv.slice(2) : ['1-0', '1-2', '2-0', '2-2', '3-0', '3-2', '4-0', '4-2', '5-0', '5-2'];
const port = 9800 + Math.floor(Math.random() * 100), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-d-'));
const chrome = spawn('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', ['--headless=new', '--hide-scrollbars', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 80; i++) { try { tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); if (tabs.find(t => t.type === 'page')) break; } catch (_) {} await sleep(250); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let n = 0; const pend = new Map(), errs = [];
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(d.params.exceptionDetails).slice(0, 300)); });
const send = (method, params = {}) => new Promise(r => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
for (const s of shots) {
  const [d, f] = s.split('-');
  await send('Page.navigate', { url: 'file://' + path.join(dir, 'designs.html') + '?d=' + d + '&f=' + f + '&t=' + Date.now() });
  await sleep(300);
  for (let i = 0; i < 60; i++) { const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true }); if (r.result.result.value === 'ready') break; await sleep(200); }
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, s + '.png'), Buffer.from(r.result.data, 'base64')); console.log(s);
}
if (errs.length) console.log('errors', errs);
ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300);
