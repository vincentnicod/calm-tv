// Renders the launcher's home screen with a theme, in headless Chrome, with made-up apps. Use it to look at a theme while you write it and to
// make themes/<id>/preview.jpg.
//   node tools/theme-preview.mjs <id> [--out <folder>] [--write]
// <id> is a folder in themes/ (or "classic"). It writes <out>/rest.png (the home screen), <out>/grid.png (the focus moved down into the app
// grid) and <out>/menu.png (the Customise menu), 1920 x 1080. With --write it also writes themes/<id>/preview.jpg (800 x 450, the screenshot
// the TV shows). Needs Node.js 22 or newer and Google Chrome (set CHROME to its path when it is not found); nothing is installed.
// The page talks to a small stand-in for the TV's service on 127.0.0.1:8765, so stop anything else that uses that port.
import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn, spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), id = args.find(a => /^[a-z0-9-]{1,30}$/.test(a) && args[args.indexOf(a) - 1] !== '--out');
const out = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : path.join(os.tmpdir(), 'cytv-theme-preview'), write = args.includes('--write');
if (!id) { console.error('usage: node tools/theme-preview.mjs <theme id> [--out <folder>] [--write]'); process.exit(2); }
if (id !== 'classic' && !fs.existsSync(path.join(ROOT, 'themes', id, 'theme.json'))) { console.error('there is no themes/' + id + '/theme.json'); process.exit(2); }
if (typeof WebSocket === 'undefined') { console.error('this needs Node.js 22 or newer (WebSocket)'); process.exit(2); }
const chromePath = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
if (!chromePath) { console.error('Chrome was not found: set CHROME to its path'); process.exit(2); }

// the theme module reads themes from a folder: give it a copy of this theme
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-themes-')); fs.mkdirSync(out, { recursive: true });
if (id !== 'classic') fs.cpSync(path.join(ROOT, 'themes', id), path.join(store, id), { recursive: true });
let base = null; const baseId = id !== 'classic' ? (JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', id, 'theme.json'), 'utf8')).extends || '') : '';
if (baseId && baseId !== 'classic' && fs.existsSync(path.join(ROOT, 'themes', baseId))) fs.cpSync(path.join(ROOT, 'themes', baseId), path.join(store, baseId), { recursive: true });
process.env.CYTV_THEMES = store;
const theme = require(path.join(ROOT, 'helper', 'theme.js')).create({ config: require(path.join(ROOT, 'helper', 'config.js')).memory({ theme: { id } }), noStartup: true });

// made-up apps with plain coloured icons
const NAMES = ['Streaming', 'Video', 'Music', 'Photos', 'Games', 'Browser', 'News', 'Weather', 'Sports', 'Movies', 'Kids', 'Radio', 'Podcasts', 'Maps', 'Cooking', 'Fitness', 'Calendar', 'Notes', 'Files', 'Camera', 'Settings', 'Store'];
const apps = NAMES.map((n, i) => ({ id: 'app.' + i, title: n, hue: (i * 47) % 360 }));
const svg = a => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="hsl(${a.hue},62%,46%)"/><circle cx="128" cy="116" r="54" fill="rgba(255,255,255,.88)"/><text x="128" y="205" font-family="Helvetica,Arial,sans-serif" font-size="40" font-weight="700" text-anchor="middle" fill="#fff">${a.title.slice(0, 6)}</text></svg>`;
const page = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8').replace('<script>', '<script>window.webOSSystem={launchParams:"{}"};', 1);
const body = req => new Promise(res => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { res(JSON.parse(b || '{}')); } catch (_) { res({}); } }); });
const srv = http.createServer(async (q, r) => {
  const u = q.url.split('?')[0]; r.setHeader('Access-Control-Allow-Origin', '*'); r.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (q.method === 'OPTIONS') { r.writeHead(204); return r.end(); }
  const j = o => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (u === '/home.html') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(page); }
  if (u.startsWith('/api/theme/')) return theme.handle(q, r, u, body);
  if (u === '/api/apps') return j({ apps: apps.map(a => ({ id: a.id, title: a.title })), config: { dock: apps.slice(0, 6).map(a => a.id), theme: theme.resolved() }, usage: Object.fromEntries(apps.map((a, i) => [a.id, 1000 - i])), version: '9.9.9' });
  if (u === '/api/inputs') return j({ devices: [{ hdmiPlugIn: true, label: 'Game console', port: 1, appId: 'hdmi1', activate: false }, { hdmiPlugIn: false, label: 'HDMI 2', port: 2, appId: 'hdmi2', activate: false }] });
  const m = /^\/icon\/(app\.\d+)$/.exec(u), a = m && apps.find(x => x.id === m[1]);
  if (a) { r.writeHead(200, { 'content-type': 'image/svg+xml' }); return r.end(svg(a)); }
  j({ returnValue: true });
});
await new Promise((res, rej) => { srv.on('error', rej); srv.listen(8765, '127.0.0.1', res); }).catch(e => { console.error('port 8765 is in use: ' + e.message); process.exit(2); });

const port = 9700 + Math.floor(Math.random() * 200), sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + port, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-chrome-')), '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
const done = code => { try { chrome.kill(); } catch (_) {} srv.close(); fs.rmSync(store, { recursive: true, force: true }); process.exit(code); };
try {
  let tabs; for (let i = 0; i < 80; i++) { try { tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); if (tabs.find(t => t.type === 'page')) break; } catch (_) {} await sleep(250); }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let n = 0; const pend = new Map(); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/home.html' }); await sleep(3000);
  const shot = async name => { await sleep(700); const r = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(out, name + '.png'); fs.writeFileSync(f, Buffer.from(r.result.data, 'base64')); console.log(f); return f; };
  const key = async (code, name) => { await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: code, key: name }); await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: code, key: name }); await sleep(350); };
  const restFile = await shot('rest');
  await key(40, 'ArrowDown'); await shot('grid'); await key(38, 'ArrowUp');
  await send('Runtime.evaluate', { expression: "openMenu('Customise',[{label:'Edit the top buttons'},{label:'Add a button'},{label:'Hidden apps',sub:'2'}]);0" }); await shot('menu');
  if (write) {
    const dest = path.join(ROOT, 'themes', id, 'preview.jpg');
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', restFile, '-vf', 'scale=800:450', '-q:v', '4', dest]);
    if (r.status === 0) console.log(dest); else console.error('ffmpeg is needed for --write (or convert rest.png to an 800 x 450 preview.jpg yourself)');
  }
  ws.close(); done(0);
} catch (e) { console.error(e.message || e); done(1); }
