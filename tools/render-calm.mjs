// Renders the launcher (app/index.html, as built) at 1920 x 1080 in headless Chrome or Brave, against a stand-in for the TV's service with a
// made-up but realistic set of apps and HDMI inputs, and saves one screenshot per state. For looking at the Calm layout without a TV.
//   node tools/render-calm.mjs [--out <folder>] [--theme <id>]     (Node 22+; CHROME=<path> when Chrome or Brave is not found)
// The icons are plain drawings, not the apps' real icons. Nothing is installed; port 8765 must be free.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url),
  ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2),
  opt = n => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const out = path.resolve(opt('--out') || path.join(os.tmpdir(), 'cytv-render')),
  themeId = opt('--theme') || 'classic';
const chromePath =
  process.env.CHROME ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find(p => fs.existsSync(p));
if (!chromePath) {
  console.error('Chrome was not found: set CHROME to its path');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const store = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-themes-'));
if (themeId !== 'classic') fs.cpSync(path.join(ROOT, 'themes', themeId), path.join(store, themeId), { recursive: true });
process.env.CYTV_THEMES = store;
const theme = require(path.join(ROOT, 'helper', 'theme.js')).create({
  config: require(path.join(ROOT, 'helper', 'config.js')).memory({ theme: { id: themeId } }),
  noStartup: true,
});

// [id, title, background, drawing]
const W = (txt, col, size, weight) =>
  `<text x="128" y="${128 + size * 0.35}" font-family="Helvetica,Arial,sans-serif" font-size="${size}" font-weight="${weight || 800}" text-anchor="middle" fill="${col}">${txt}</text>`;
const APPS = [
  [
    'youtube.leanback.v4',
    'YouTube AdFree',
    '#ff0000',
    '<path d="M128 70l34 104H94z" fill="#fff"/><rect x="84" y="170" width="88" height="14" rx="4" fill="#fff"/>',
  ],
  ['com.lgi.upcch', 'Sunrise TV', '#e5004f', W('sunrise', '#fff', 46) + '<circle cx="128" cy="80" r="16" fill="#fff"/>'],
  ['com.stzplayer.app', 'STZ Player', '#1d1f2b', W('STZ', '#59c3ff', 70)],
  ['netflix', 'Netflix', '#000000', W('N', '#e50914', 150, 900)],
  [
    'amazon',
    'Prime Video',
    '#1a98ff',
    '<text x="128" y="118" font-family="Helvetica" font-size="46" font-weight="700" text-anchor="middle" fill="#fff">prime</text><text x="128" y="164" font-family="Helvetica" font-size="40" font-weight="700" text-anchor="middle" fill="#fff">video</text>',
  ],
  ['com.disney.disneyplus-prod', 'Disney+', '#0e2a5c', W('Disney+', '#fff', 46, 600)],
  [
    'spotify-beehive',
    'Spotify',
    '#121212',
    '<circle cx="128" cy="128" r="62" fill="#1ed760"/><path d="M88 110q44-14 84 8M94 132q36-10 68 6M100 152q28-8 52 4" stroke="#121212" stroke-width="10" fill="none" stroke-linecap="round"/>',
  ],
  ['com.plexapp.plex', 'Plex', '#1f1f1f', W('plex', '#e5a00d', 64)],
  [
    'com.webos.app.discovery',
    'Apps',
    '#5a4bd6',
    '<rect x="78" y="78" width="44" height="44" rx="10" fill="#fff"/><rect x="134" y="78" width="44" height="44" rx="10" fill="#fff"/><rect x="78" y="134" width="44" height="44" rx="10" fill="#fff"/><rect x="134" y="134" width="44" height="44" rx="10" fill="#fff"/>',
  ],
  [
    'com.webos.app.browser',
    'Web Browser',
    '#0f6fd6',
    '<circle cx="128" cy="128" r="60" fill="none" stroke="#fff" stroke-width="12"/><path d="M68 128h120M128 68q-36 60 0 120M128 68q36 60 0 120" stroke="#fff" stroke-width="10" fill="none"/>',
  ],
  [
    'com.webos.app.photovideo',
    'Photo & Video',
    '#f4f4f6',
    '<circle cx="108" cy="112" r="34" fill="#ff5a5f"/><circle cx="148" cy="112" r="34" fill="#46c37b" opacity=".85"/><circle cx="128" cy="146" r="34" fill="#4c8dff" opacity=".85"/>',
  ],
  [
    'com.webos.app.music',
    'Music',
    '#ff4f6d',
    '<path d="M110 170V86l60-14v80" stroke="#fff" stroke-width="12" fill="none"/><circle cx="96" cy="170" r="18" fill="#fff"/><circle cx="156" cy="152" r="18" fill="#fff"/>',
  ],
  ['com.apple.appletv', 'Apple TV', '#000000', W('tv', '#fff', 90, 700)],
  ['com.canal.ch', 'RTS Play', '#c4141a', W('RTS', '#fff', 64)],
  ['org.homeassistant', 'Home Assistant', '#18bcf2', '<path d="M128 64l64 56v72H64v-72z" fill="#fff"/>'],
  ['com.webos.app.lgchannels', 'LG Channels', '#a50034', W('LG', '#fff', 80)],
  ['com.webos.app.sports', 'Sports', '#2a2a2a', '<circle cx="128" cy="128" r="56" fill="none" stroke="#fff" stroke-width="10"/>'],
];
const icon = a =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${a[2]}"/>${a[3]}</svg>`;
const INPUTS = [
  { id: 'HDMI_1', appId: 'com.webos.app.hdmi1', port: 1, label: 'UPC Boîtier décodeur /Box Internet', hdmiPlugIn: true, activate: false },
  { id: 'HDMI_2', appId: 'com.webos.app.hdmi2', port: 2, label: 'HDMI 2', hdmiPlugIn: false, activate: false },
  { id: 'HDMI_3', appId: 'com.webos.app.hdmi3', port: 3, label: 'PS4 Console de jeu', hdmiPlugIn: true, activate: false },
  { id: 'HDMI_4', appId: 'com.webos.app.hdmi4', port: 4, label: 'HDMI 4', hdmiPlugIn: true, activate: false },
];
const usage = Object.fromEntries(APPS.map((a, i) => [a[0], 100 - i]));
const page = fs
  .readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8')
  .replace('<script>', '<script>window.webOSSystem={launchParams:"{}",locale:"' + (opt('--locale') || 'fr-CH') + '"};', 1);
const body = req =>
  new Promise(res => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => {
      try {
        res(JSON.parse(b || '{}'));
      } catch (_) {
        res({});
      }
    });
  });
let conf = { theme: theme.resolved(), options: { liveTv: false } };
// Quick settings: the service's own module, over a stand-in for LG's settings with the lists an LG C4 (webOS 25) answers
const tvSet = { pictureMode: 'filmMaker', soundMode: 'aiSoundPlus', sleepTimer: 'off' };
const offer = (vis, hid) => vis.map(value => ({ visible: true, active: true, value })).concat(hid.map(value => ({ visible: false, active: true, value })));
const OFFER = {
  pictureMode: offer(['personalized', 'vivid', 'normal', 'eco', 'cinema', 'sports', 'game', 'filmMaker'], ['hdrCinema', 'hdrStandard']),
  soundMode: offer(['aiSoundPlus', 'aiSound', 'standard', 'movie', 'news', 'sports', 'music', 'game'], []),
  sleepTimer: offer(['off', '10', '20', '30', '60', '90', '120', '180', '240'], []),
};
const quick = require(path.join(ROOT, 'helper', 'quick.js')).create({
  luna: async (uri, p) => {
    if (/getSystemSettingDesc/.test(uri)) return { returnValue: true, results: [{ values: { arrayExt: OFFER[p.keys[0]] } }] };
    if (/getSystemSettings/.test(uri)) return { returnValue: true, settings: { [p.keys[0]]: tvSet[p.keys[0]] } };
    if (/setSystemSettings/.test(uri)) return Object.assign(tvSet, p.settings), { returnValue: true };
    return { returnValue: true, state: 'Active', running: [] };
  },
  inputhook: { hookInfo: () => ({ attached: false }) },
  feature: () => null,
});
const srv = http.createServer(async (q, r) => {
  const u = q.url.split('?')[0];
  r.setHeader('Access-Control-Allow-Origin', '*');
  r.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (q.method === 'OPTIONS') return r.writeHead(204), r.end();
  const j = o => (r.writeHead(200, { 'content-type': 'application/json' }), r.end(JSON.stringify(o)));
  if (u === '/home.html') return r.writeHead(200, { 'content-type': 'text/html' }), r.end(page);
  // the files that ship next to the page on the TV: the built-in background and the font
  const shipped = /^\/(scene-[a-z-]+\.jpg|font-[a-z-]+\.woff2)$/.exec(u);
  if (shipped)
    return (
      r.writeHead(200, { 'content-type': /jpg$/.test(u) ? 'image/jpeg' : 'font/woff2' }),
      r.end(fs.readFileSync(path.join(ROOT, 'app', shipped[1])))
    );
  // the Input key's picker is an overlay: here over a made-up picture, as it would be over a programme
  const panel = /[?&]panel=(quick|sleep)/.exec(q.url) ? RegExp.$1 : '';
  if (u === '/picker.html')
    return (
      r.writeHead(200, { 'content-type': 'text/html' }),
      r.end(
        fs
          .readFileSync(path.join(ROOT, 'picker', 'app', 'index.html'), 'utf8')
          .replace(
            '<script>',
            '<style>html{background:radial-gradient(ellipse at 30% 30%,#7a5a3a,#2a3a4a 60%,#0d1218)}</style><script>window.webOSSystem={launchParams:' +
              JSON.stringify(JSON.stringify(panel ? { panel } : {})) +
              ',locale:"fr-CH",hide:function(){},activate:function(){},platformBack:function(){},setInputRegion:function(){},setKeyMask:function(){}};',
            1
          )
      )
    );
  if (u.startsWith('/api/theme/')) return theme.handle(q, r, u, body);
  if (u === '/api/quick') return quick.handle(q, r, u, body);
  if (u === '/api/apps') return j({ apps: APPS.map(a => ({ id: a[0], title: a[1] })), config: conf, usage, version: '1.8.0' });
  if (u === '/api/inputs') return j({ returnValue: true, devices: INPUTS });
  if (u === '/api/weather') return j({ city: 'lausanne', temp: 12, code: 2, day: true });
  if (u === '/api/remap')
    return j({
      buttons: [
        { code: '435', app: 'com.lgi.upcch' },
        { code: '436', app: 'com.webos.app.hdmi1' },
      ],
      learning: q.method === 'POST' ? { state: 'waiting' } : null,
      attached: true,
    });
  if (u === '/api/config') {
    conf = Object.assign(await body(q), { theme: theme.resolved(), options: { liveTv: false } });
    return j({ returnValue: true });
  }
  const m = /^\/icon\/(.+)$/.exec(u),
    a = m && APPS.find(x => x[0] === decodeURIComponent(m[1]));
  if (a) return r.writeHead(200, { 'content-type': 'image/svg+xml' }), r.end(icon(a));
  j({ returnValue: true });
});
await new Promise((res, rej) => {
  srv.on('error', rej);
  srv.listen(8765, '127.0.0.1', res);
}).catch(e => {
  console.error('port 8765 is in use: ' + e.message);
  process.exit(2);
});

const port = 9700 + Math.floor(Math.random() * 200),
  sleep = ms => new Promise(r => setTimeout(r, ms));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-chrome-'));
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + prof,
    '--window-size=1920,1080',
    'about:blank',
  ],
  { stdio: 'ignore' }
);
const done = code => {
  try {
    chrome.kill();
  } catch (_) {}
  srv.close();
  fs.rmSync(store, { recursive: true, force: true });
  setTimeout(() => {
    fs.rmSync(prof, { recursive: true, force: true });
    process.exit(code);
  }, 500);
};
try {
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
  const pend = new Map(),
    errors = [];
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) pend.get(d.id)(d), pend.delete(d.id);
    if (d.method === 'Runtime.exceptionThrown')
      errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  });
  const send = (method, params = {}) =>
    new Promise(r => {
      const i = ++n;
      pend.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const js = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/home.html' });
  await sleep(500);
  await js("localStorage.clear(); localStorage.setItem('cytv.hdmi.last','1'); location.reload(); 0");
  await sleep(3000);
  const shot = async name => {
    await sleep(800);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const f = path.join(out, name + '.png');
    fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
    console.log(f);
  };
  const key = async (code, name) => {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: code, key: name });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: code, key: name });
    await sleep(300);
  };
  await shot('1-home');
  await key(39, 'ArrowRight');
  await key(39, 'ArrowRight');
  await shot('2-youtube');
  await key(40, 'ArrowDown');
  await shot('3-all-apps');
  await key(40, 'ArrowDown');
  await shot('4-all-apps-row2');
  await key(38, 'ArrowUp');
  await key(38, 'ArrowUp');
  await key(37, 'ArrowLeft');
  await key(37, 'ArrowLeft');
  await key(38, 'ArrowUp');
  await key(39, 'ArrowRight');
  await shot('5-settings-button');
  await key(40, 'ArrowDown');
  await js('appMenu(tiles.__hdmi._a); 0');
  await shot('6-hdmi-options');
  await js("closeMenus(); showInputs(inputs, t('Which input?')); 0");
  await shot('7-which-input');
  await js("closeMenus(); appMenu(tiles['com.stzplayer.app']._a); stack[0].idx = 4; drawMenu(); 0");
  await shot('8-app-options');
  await js("closeMenus(); looksMenu(tiles['com.stzplayer.app']._a); 0");
  await shot('9-icon-and-name');
  await js('closeMenus(); styleMenu(); 0');
  await shot('11-style');
  await js('closeMenus(); RB.open(); 0');
  await shot('12-remote-buttons');
  await js("RB.teach('youtube.leanback.v4'); 0");
  await shot('13-press-a-button');
  await js("clearInterval(RB.poll); RB.mode = 'done'; RB.app = 'youtube.leanback.v4'; RB.draw(); 0");
  await shot('14-button-done');
  await js('RB.close(); 0');
  await js("cfg.weather = 'lausanne'; refreshWeather(true); 0");
  await shot('15-weather');
  await js('idleAt = Date.now() - 4 * 60000; idleCheck(); 0');
  await sleep(2800);
  await shot('16-idle');
  await js('wake(); 0');
  await js('closeMenus(); 0');
  const state = await js(
    "JSON.stringify({dock: dockIds(), caps: [].map.call(document.querySelectorAll('#dock .cap'), function (e) { return e.textContent; })})"
  );
  console.log('state ' + state);
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/picker.html' });
  await sleep(2500);
  await shot('10-input-key-picker');
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/picker.html?panel=quick' });
  await sleep(1500);
  await shot('17-quick-settings');
  await key(40, 'ArrowDown');
  await key(40, 'ArrowDown');
  await key(39, 'ArrowRight');
  await key(39, 'ArrowRight');
  await key(39, 'ArrowRight');
  await sleep(1500);
  await shot('18-quick-sleep-timer');
  const quickState = await js("JSON.stringify({sent: q.data && q.data.sleep, focus: q.i, text: document.getElementById('qs').innerText})");
  console.log('quick ' + quickState);
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/picker.html?panel=sleep' });
  await sleep(1200);
  await shot('19-sleep-warning');
  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  ws.close();
  done(errors.length ? 1 : 0);
} catch (e) {
  console.error(e.message || e);
  done(1);
}
