// Paints a scene of scenes.html in headless Chrome or Brave and saves it as app/scene-<name>.jpg (1920 x 1080), the launcher's built-in
// background for the theme setting effects.scene.   node design/scenes/bake.mjs lac
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.join(dir, '..', '..'),
  name = process.argv.slice(2).filter(a => a[0] !== '-')[0] || 'lac';
const bin =
  process.env.CHROME ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find(p =>
    fs.existsSync(p)
  );
const port = 9900 + Math.floor(Math.random() * 90),
  prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-bake-'));
const chrome = spawn(
  bin,
  [
    '--headless=new',
    '--hide-scrollbars',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + prof,
    '--window-size=1920,1080',
    'about:blank',
  ],
  { stdio: 'ignore' }
);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 80; i++) {
  try {
    tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
    if (tabs.find(t => t.type === 'page')) break;
  } catch (_) {}
  await sleep(250);
}
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let n = 0;
const pend = new Map();
ws.addEventListener('message', m => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) {
    pend.get(d.id)(d);
    pend.delete(d.id);
  }
});
const send = (method, params = {}) =>
  new Promise(r => {
    const i = ++n;
    pend.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file://' + path.join(dir, 'scenes.html') + '?' + name });
for (let i = 0; i < 50; i++) {
  const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
  if (r.result.result.value === 'ready') break;
  await sleep(200);
}
const save = async (expression, file) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  const out = path.join(root, 'app', file);
  fs.writeFileSync(out, Buffer.from(r.result.result.value.split(',')[1], 'base64'));
  console.log(out, fs.statSync(out).size);
};
await save("document.getElementById('bg').toDataURL('image/jpeg', 0.86)", 'scene-' + name + '.jpg');
// --glass: a blurred copy for glass tiles (dock.style "glass"), shown in place of a live blur, which the TV's GPU cannot afford
if (process.argv.indexOf('--glass') > 0)
  await save(
    "(function(){var s=document.getElementById('bg'),c=document.createElement('canvas');c.width=1920;c.height=1080;var g=c.getContext('2d');g.filter='blur(44px)';g.drawImage(s,-70,-70,2060,1220);return c.toDataURL('image/jpeg',0.8)})()",
    'scene-' + name + '-glass.jpg'
  );
ws.close();
chrome.kill();
setTimeout(() => {
  fs.rmSync(prof, { recursive: true, force: true });
  process.exit(0);
}, 300);
