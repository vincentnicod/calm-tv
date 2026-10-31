// Behaviour checks of the Calm additions in a real browser: the launcher (app/index.html, as built) runs in headless Chrome or Brave against
// a stand-in for the TV's service, and the remote's keys are pressed. It checks the HDMI card (which input OK opens), the number and colour
// keys, hold OK, app looks, the favourites the dock starts with, French text, and that no script error happens.
//   node tools/calm-check.mjs        (Node 22+; CHROME=<path> when Chrome or Brave is not found; port 8765 must be free, or CYTV_CHECK_PORT=<port>)
// It uses a current engine: tools/oldchrome.js runs the launcher in Chromium 68 and 79 (CI).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
const require = createRequire(import.meta.url),
  ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
const theme = require(path.join(ROOT, 'helper', 'theme.js')).create({
  config: require(path.join(ROOT, 'helper', 'config.js')).memory({}),
  noStartup: true,
});
let failed = 0;
const ok = (c, name) => {
  console.log((c ? 'ok   ' : 'FAIL ') + name);
  if (!c) failed++;
};

// the pages call the service on 8765; another port (CYTV_CHECK_PORT) is written into the pages served here
const PORT = +process.env.CYTV_CHECK_PORT || 8765,
  BASE = 'http://127.0.0.1:' + PORT;
const toPort = html => html.split('http://127.0.0.1:8765').join(BASE);
// [id, title, removable]
const APPS = [
  ['youtube.leanback.v4', 'YouTube AdFree', true],
  ['ch.sunrise.tv', 'Sunrise TV', true],
  ['com.siptv.smartiptv', 'Smart IPTV', true],
  ['netflix', 'Netflix', true],
  ['amazon', 'Prime Video', true],
  ['spotify-beehive', 'Spotify - Music and Podcasts', true],
  ['com.webos.app.browser', 'Web Browser', false],
];
const dev = (port, label, on, act) => ({
  id: 'HDMI_' + port,
  appId: 'com.webos.app.hdmi' + port,
  port,
  label,
  hdmiPlugIn: on,
  activate: !!act,
});
// what the stand-in answers; each check changes it
const S = {
  config: {},
  inputs: [],
  launched: [],
  uninstalled: [],
  lgHome: 0,
  powerOff: 0,
  pinned: [],
  iconFail: false,
  saved: [],
  version: '1.9.0',
  locale: 'en-GB',
  remap: {},
  learning: null,
  remapCalls: [],
  quickCalls: [],
  quickOk: true,
  panel: '',
  realQuick: false,
  tv: {},
  tvCalls: [],
  refuse: false,
};
const page = () =>
  toPort(
    fs
      .readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8')
      .replace('<script>', '<script>window.webOSSystem={launchParams:"{}",locale:' + JSON.stringify(S.locale) + '};', 1)
  );
// the Input key's picker app, which also shows Quick settings and the sleep timer's warning: opened with the launch params of S.panel
const pickerPage = () =>
  toPort(
    fs
      .readFileSync(path.join(ROOT, 'picker', 'app', 'index.html'), 'utf8')
      .replace(
        '<script>',
        '<script>window.__hidden=0;window.webOSSystem={launchParams:' +
          JSON.stringify(JSON.stringify(S.panel ? { panel: S.panel } : {})) +
          ',locale:"en-GB",hide:function(){window.__hidden++},platformBack:function(){}};',
        1
      )
  );
// with S.realQuick the service's own Quick settings module answers, over a stand-in for LG's settings (S.tv, what an LG C4 offers)
const offer = (vis, hid) =>
  vis.map(value => ({ visible: true, active: true, value })).concat(hid.map(value => ({ visible: false, active: true, value })));
const OFFER = {
  pictureMode: offer(['personalized', 'vivid', 'normal', 'eco', 'cinema', 'sports', 'game', 'filmMaker'], ['hdrCinema', 'hdrStandard']),
  soundMode: offer(['aiSoundPlus', 'aiSound', 'standard', 'movie', 'news', 'sports', 'music', 'game'], []),
  sleepTimer: offer(['off', '10', '20', '30', '60', '90', '120', '180', '240'], []),
};
const quick = require(path.join(ROOT, 'helper', 'quick.js')).create({
  luna: async (uri, p) => {
    S.tvCalls.push(uri.split('/').pop() + (p.settings ? ' ' + JSON.stringify(p.settings) : ''));
    if (/getSystemSettingDesc/.test(uri)) return { returnValue: true, results: [{ values: { arrayExt: OFFER[p.keys[0]] } }] };
    if (/getSystemSettings/.test(uri)) return { returnValue: true, settings: { [p.keys[0]]: S.tv[p.keys[0]] } };
    if (/setSystemSettings/.test(uri))
      return S.refuse ? { returnValue: false, errorText: 'refused' } : (Object.assign(S.tv, p.settings), { returnValue: true });
    return { returnValue: true, state: 'Active', running: [] };
  },
  inputhook: { hookInfo: () => ({ attached: false }) },
  feature: () => null,
});
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
const srv = http.createServer(async (q, r) => {
  const u = q.url.split('?')[0];
  r.setHeader('Access-Control-Allow-Origin', '*');
  r.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (q.method === 'OPTIONS') return r.writeHead(204), r.end();
  const j = o => (r.writeHead(200, { 'content-type': 'application/json' }), r.end(JSON.stringify(o)));
  if (u === '/home.html') return r.writeHead(200, { 'content-type': 'text/html' }), r.end(page());
  // the files that ship next to the page on the TV: the backgrounds and the fonts (the pills are measured in the real typefaces)
  const shipped = /^\/(scene-[a-z-]+\.jpg|font-[a-z-]+\.woff2)$/.exec(u);
  if (shipped && fs.existsSync(path.join(ROOT, 'app', shipped[1])))
    return (
      r.writeHead(200, { 'content-type': /jpg$/.test(u) ? 'image/jpeg' : 'font/woff2' }),
      r.end(fs.readFileSync(path.join(ROOT, 'app', shipped[1])))
    );
  if (u.startsWith('/api/theme/')) return theme.handle(q, r, u, body);
  if (u === '/api/apps')
    return j({
      apps: APPS.map(a => ({ id: a[0], title: a[1], removable: a[2] })).concat(
        S.pinned.map(id => {
          const d = S.inputs.find(x => x.appId === id);
          return { id, title: d.label, input: d.port, off: !d.hdmiPlugIn };
        })
      ),
      config: Object.assign({}, S.config, { theme: theme.resolved(), options: { liveTv: false } }),
      usage: {},
      version: S.version,
    });
  if (u === '/api/inputs') return j({ returnValue: true, devices: S.inputs });
  if (u === '/api/weather') return j(Object.assign({ city: 'lausanne' }, S.weather || {}));
  // remote buttons: the stand-in records what the launcher asks; the checks play the button press
  if (u === '/api/remap') {
    if (q.method === 'POST') {
      const b = await body(q);
      S.remapCalls.push(b);
      if (b.learn) S.learning = { app: b.learn, state: 'waiting', code: '' };
      else if (b.cancel) S.learning = null;
      else if (b.remove) delete S.remap[b.code];
      else if (b.code && b.app) S.remap[b.code] = b.app;
    }
    return j({ buttons: Object.keys(S.remap).map(c => ({ code: c, app: S.remap[c] })), learning: S.learning, attached: true });
  }
  if (u === '/api/launch') return S.launched.push((await body(q)).id), j({ returnValue: true });
  if (u === '/api/uninstall') return S.uninstalled.push((await body(q)).id), j({ returnValue: true });
  if (u === '/api/lg-home') return S.lgHome++, j({ returnValue: true });
  if (u === '/api/power/off') return S.powerOff++, j({ returnValue: true });
  if (u === '/api/inputs/pin') {
    const b = await body(q);
    S.pinned = S.pinned.filter(i => i !== b.id).concat(b.on === false ? [] : [b.id]);
    return j({ returnValue: true, pinned: b.on !== false });
  }
  if (u === '/api/quick' && S.realQuick) return quick.handle(q, r, u, body);
  if (u === '/api/quick') return S.quickCalls.push(await body(q)), j(S.quickOk ? { ok: true } : { error: 'not installed' });
  if (u === '/picker.html') return r.writeHead(200, { 'content-type': 'text/html' }), r.end(pickerPage());
  if (u === '/api/config') {
    const b = await body(q);
    S.saved.push(b);
    S.config = b;
    return j({ returnValue: true });
  }
  if (u.startsWith('/icon/') && S.iconFail) return r.writeHead(404), r.end();
  if (u.startsWith('/icon/'))
    return (
      r.writeHead(200, { 'content-type': 'image/svg+xml' }),
      r.end(
        u === '/icon/netflix'
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#000"/><path d="M40 24h16l16 48V24h16v80H72L56 56v48H40z" fill="#e50914"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#357"/></svg>'
      )
    );
  j({ returnValue: true });
});
await new Promise((res, rej) => {
  srv.on('error', rej);
  srv.listen(PORT, '127.0.0.1', res);
}).catch(e => {
  console.error('port ' + PORT + ' is in use: ' + e.message);
  process.exit(2);
});

// a PNG screenshot as {w, h, px(x, y) -> [r, g, b]}: 8-bit RGB or RGBA, not interlaced, which is what Chrome writes
function png(buf) {
  let o = 8,
    w = 0,
    h = 0,
    ch = 4;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o),
      type = buf.toString('latin1', o + 4, o + 8),
      data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') (w = data.readUInt32BE(0)), (h = data.readUInt32BE(4)), (ch = data[9] === 6 ? 4 : 3);
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)),
    stride = w * ch,
    out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)],
      row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0,
        b = y ? out[(y - 1) * stride + x] : 0,
        c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0;
      const pr = () => {
        const p = a + b - c,
          pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      };
      out[y * stride + x] = (row[x] + [0, a, b, (a + b) >> 1, pr()][f]) & 255;
    }
  }
  return { w, h, px: (x, y) => [out[y * stride + x * ch], out[y * stride + x * ch + 1], out[y * stride + x * ch + 2]] };
}
// Where the ink of a pill's content lies inside the pill: the pixels that differ from the pill's own colour (its most common colour),
// inside its rounded outline. The gaps to the four sides, in screen pixels
function inkGaps(img, radius) {
  const count = {};
  let best = '',
    bg = null;
  for (let y = 0; y < img.h; y += 2)
    for (let x = 0; x < img.w; x += 2) {
      const k = img
        .px(x, y)
        .map(v => v >> 3)
        .join();
      count[k] = (count[k] || 0) + 1;
      if (!best || count[k] > count[best]) best = k;
    }
  bg = best.split(',').map(v => (+v << 3) + 4);
  const r = Math.min(radius, img.h / 2) + 2;
  const inside = (x, y) => {
    const cx = x < r ? r : x > img.w - 1 - r ? img.w - 1 - r : x,
      cy = y < r ? r : y > img.h - 1 - r ? img.h - 1 - r : y;
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= (r - 2) * (r - 2) && x > 2 && y > 2 && x < img.w - 3 && y < img.h - 3;
  };
  let x0 = img.w,
    x1 = -1,
    y0 = img.h,
    y1 = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (!inside(x, y)) continue;
      const p = img.px(x, y);
      if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) < 120) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  return x1 < 0 ? null : { left: x0, right: img.w - 1 - x1, top: y0, bottom: img.h - 1 - y1 };
}

const port = 9700 + Math.floor(Math.random() * 200),
  sleep = ms => new Promise(r => setTimeout(r, ms));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-chrome-'));
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
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
    if (d.method === 'Runtime.exceptionThrown') {
      const x = d.params.exceptionDetails;
      errors.push((x.exception && x.exception.description) || x.text);
    }
  });
  const send = (method, params = {}) =>
    new Promise(r => {
      const i = ++n;
      pend.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const js = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const down = c => send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: c, nativeVirtualKeyCode: c });
  const up = c => send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: c, nativeVirtualKeyCode: c });
  const key = async (c, wait) => {
    await down(c);
    await up(c);
    await sleep(wait || 250);
  };
  const OK = 13,
    RIGHT = 39,
    LEFT = 37,
    DOWN = 40;
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  // a fresh Home: no saved settings, nothing remembered, focus on the first dock card
  const fresh = async (wait = 1500) => {
    S.saved = [];
    S.config = {};
    await send('Page.navigate', { url: BASE + '/home.html' });
    await sleep(400);
    await js('localStorage.clear(); 0');
    await send('Page.navigate', { url: BASE + '/home.html' });
    await sleep(wait);
    S.launched = [];
  };
  const caps = () => js("[].map.call(document.querySelectorAll('#dock .cap'), function (e) { return e.textContent; }).join('|')");
  const focusId = () => js('rows[r][c]._a ? rows[r][c]._a.id : ""');
  const menuTitle = () => js('stack.length ? stack[stack.length - 1].title : ""');
  const toastText = () => js("$('toast').classList.contains('on') ? $('toast').textContent : ''");

  // ---- the favourites the dock starts with ----
  S.inputs = [dev(1, 'Apple TV', true, true), dev(2, 'HDMI 2', false), dev(3, 'PlayStation 5', false)];
  await fresh();
  ok(
    (await js('dockIds().join()')) === '__hdmi,ch.sunrise.tv,youtube.leanback.v4,com.siptv.smartiptv,netflix',
    'with no saved dock: the HDMI card, the TV app, YouTube and the IPTV player, found by their names, then Netflix (Paysage has five)'
  );
  ok(
    (await caps()) === 'Apple TV|Sunrise TV|YouTube|IPTV|Netflix',
    'the cards are named Apple TV (the device on HDMI), Sunrise TV, YouTube, IPTV'
  );
  ok(
    (await js("document.querySelectorAll('#dock .gl-youtube, #dock .gl-iptv, #dock .gl-hdmi').length")) === 3,
    'YouTube AdFree, the IPTV player and the HDMI card get drawn icons'
  );
  ok(
    (await js("(document.querySelector('#dock .chip.on') || {}).textContent")) === 'HDMI 1',
    'the HDMI card shows its port with a green dot'
  );
  ok((await focusId()) === '__hdmi', 'Home opens with the focus on the first card');
  ok(
    ((await js('document.documentElement.outerHTML')).match(/class="(?:tile gl gl-|chip on)/g) || []).length === 5,
    'the markup tools/oldchrome.js counts in Chromium 68 and 79 is there (three drawn cards, Spotify drawn in All apps, a green port)'
  );
  ok(
    JSON.stringify((S.saved[0] || {}).dock) === '["__hdmi","ch.sunrise.tv","youtube.leanback.v4","com.siptv.smartiptv","netflix"]' &&
      JSON.stringify((S.saved[0] || {}).tiles) ===
        '{"youtube.leanback.v4":{"label":"YouTube","icon":"youtube"},"com.siptv.smartiptv":{"label":"IPTV","icon":"iptv"}}' &&
      S.saved.length === 1,
    'the starting favourites and their looks are saved once, so the Input key shows them too'
  );
  // ---- Paysage, the default style: white logos made from the icons ----
  ok((await js("document.body.getAttribute('data-dockstyle')")) === 'logo', 'Paysage is the default style: the dock is a line of logos');
  await sleep(600);
  ok(
    (await js("!!tiles.netflix.querySelector('.mono img.mw') && !!tiles.netflix.querySelector('.mono img.mk')")) &&
      (await js("getComputedStyle(tiles.netflix.querySelector('.mono .mw')).display")) === 'block',
    'a logo on a plain background becomes a white logo (and a dark one for the focused pill)'
  );
  ok(
    (await js("(tiles['ch.sunrise.tv'].querySelector('.mono .mt') || {}).textContent")) === 'Sunrise TV',
    'an icon that is only a background shows the app name instead'
  );
  ok(
    (await js("JSON.parse(localStorage.getItem('cytv.mono.v1') || '{}').netflix.w.indexOf('data:image/png')")) === 0,
    'the white logo is remembered, so it is made only once'
  );
  ok(
    /scene-lac(-aube|-jour|-nuit)?\.jpg/.test(await js('getComputedStyle(document.body).backgroundImage')),
    'the lake is the background (at the time of day of the check)'
  );
  await key(RIGHT);
  await key(RIGHT);
  await key(RIGHT);
  await key(RIGHT);
  ok(
    (await focusId()) === 'netflix' &&
      (await js("getComputedStyle(tiles.netflix.querySelector('.mono .mk')).display")) === 'block' &&
      (await js("getComputedStyle(tiles.netflix.querySelector('.mono .mw')).display")) === 'none',
    'the focused logo turns dark in its white pill'
  );
  await key(37);
  await key(37);
  await key(37);
  await key(37);

  // ---- OK on the HDMI card ----
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi1', 'one device on: OK opens its input at once');
  ok((await js("localStorage.getItem('cytv.hdmi.last')")) === '1', 'the input opened is remembered');

  S.inputs = [dev(1, 'Apple TV', true), dev(2, 'HDMI 2', false), dev(3, 'PlayStation 5', true)];
  await fresh();
  await key(OK);
  await sleep(300);
  ok(S.launched.length === 0 && (await menuTitle()) === 'Which input?', 'two devices on and none chosen before: the list asks which');
  ok(
    (await js('stack[0].items.map(function (i) { return i.label; }).join()')) === 'Apple TV,PlayStation 5,HDMI 2',
    'the list has the devices that are on first'
  );
  await key(40);
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi3' && !(await js('stack.length')), 'the chosen input opens and the list closes');
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi3,com.webos.app.hdmi3', 'the next OK opens the same input directly');
  ok((await caps()).split('|')[0] === 'PlayStation 5', 'and the card is named after it');

  S.inputs = [dev(1, 'Apple TV', true), dev(3, 'PlayStation 5', true, true)];
  await fresh();
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi3', 'two devices on, none chosen before: the one the TV marks active');

  // what an LG C4 reported (read while an app was showing): three ports plugged, no signal, none active
  const c4 = () => [
    Object.assign(dev(1, 'UPC Boîtier décodeur /Box Internet', true), { hdmiSignalExist: false, connected: true }),
    Object.assign(dev(2, 'HDMI 2', false), { hdmiSignalExist: false, connected: true }),
    Object.assign(dev(3, 'PS4 Console de jeu', true), { hdmiSignalExist: false, connected: true }),
    Object.assign(dev(4, 'HDMI 4', true), { hdmiSignalExist: false, connected: true }),
  ];
  S.inputs = c4();
  await fresh();
  ok((await caps()).split('|')[0] === 'HDMI', 'C4 inputs: nothing chosen yet, the card is called HDMI');
  await key(OK);
  await sleep(300);
  ok(
    S.launched.length === 0 &&
      (await js('stack[0].items.map(function (i) { return i.label; }).join("|")')) ===
        'UPC Boîtier décodeur /Box Internet|PS4 Console de jeu|HDMI 4|HDMI 2',
    'C4 inputs: the first OK asks, plugged-in devices first, with their full names'
  );
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi1', 'C4 inputs: choosing the set-top box opens HDMI 1');
  ok((await caps()).split('|')[0] === 'UPC Boîtier décodeur', "C4 inputs: the card takes the box's name without LG's second part");
  S.launched = [];
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi1', 'C4 inputs: from then on OK goes straight to the box');
  S.inputs = c4();
  S.inputs[2].hdmiSignalExist = true;
  await fresh();
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi3', 'a firmware that reports a picture on one input: OK opens that one');

  S.inputs = [];
  await fresh();
  await key(OK);
  await sleep(300);
  ok(S.launched.length === 0 && /No HDMI inputs/.test(await toastText()), 'no inputs: a message, nothing opens');

  // ---- hold OK on the HDMI card: always one port ----
  S.inputs = [dev(1, 'Apple TV', true), dev(2, 'HDMI 2', false)];
  await fresh();
  await down(OK);
  await sleep(900);
  await up(OK);
  await sleep(300);
  ok((await menuTitle()) === 'Apple TV', 'hold OK on the HDMI card opens its options');
  const labels = await js('stack[0].items.map(function (i) { return i.label; }).join("|")');
  ok(
    /Automatic \(the device that is on\)\|Always HDMI 1\|Always HDMI 2\|All inputs/.test(labels),
    'the options: automatic, each port, all inputs'
  );
  await key(DOWN);
  await key(DOWN);
  await key(DOWN);
  await key(OK);
  await sleep(300);
  ok(S.saved.length && S.saved[S.saved.length - 1].hdmi === '2', '"Always HDMI 2" is saved');
  ok((await caps()).split('|')[0] === 'HDMI 2', 'the card is renamed at once');
  S.launched = [];
  await key(OK);
  await sleep(300);
  ok(S.launched.join() === 'com.webos.app.hdmi2', 'then OK opens HDMI 2 even with nothing on it');
  ok((await caps()).split('|')[0] === 'HDMI 2', 'and the card is named HDMI 2');
  S.config = {};

  // ---- number and colour keys ----
  S.inputs = [dev(1, 'Apple TV', true)];
  await fresh();
  await key(51);
  await sleep(300);
  ok(
    S.launched.join() === 'youtube.leanback.v4' && (await focusId()) === 'youtube.leanback.v4',
    'key 3 opens the third card and moves the focus there'
  );
  await key(52);
  await sleep(300);
  ok(S.launched[1] === 'com.siptv.smartiptv', 'key 4 opens the IPTV player');
  await key(403);
  await sleep(300);
  ok(S.launched[2] === 'com.webos.app.hdmi1', 'the red key opens the first card (HDMI)');
  await key(57);
  await sleep(300);
  ok(S.launched.length === 3, 'a number without a card does nothing');

  // ---- app looks ----
  await fresh();
  await key(RIGHT);
  await down(OK);
  await sleep(900);
  await up(OK);
  await sleep(300);
  const items = await js('stack[0].items.map(function (i) { return i.label; })');
  ok((await menuTitle()) === 'Sunrise TV' && items.indexOf('Icon and name...') >= 0, 'hold OK on an app offers Icon and name');
  await js("stack[0].idx = stack[0].items.map(function (i) { return i.label; }).indexOf('Icon and name...'); drawMenu(); 0");
  await key(OK);
  ok((await menuTitle()) === 'Icon and name', 'it lists the icons');
  // the app's own icon, YouTube, Spotify, IPTV, then TV
  await key(DOWN);
  await key(DOWN);
  await key(DOWN);
  await key(DOWN);
  await key(OK);
  await sleep(300);
  const sv = S.saved[S.saved.length - 1] || {};
  ok(sv.tiles && JSON.stringify(sv.tiles['ch.sunrise.tv']) === '{"icon":"tv","label":"TV"}', 'choosing TV saves the look');
  ok((await caps()).split('|')[1] === 'TV' && (await js("!!document.querySelector('#dock .gl-tv')")), 'the card is redrawn as TV at once');
  ok((await focusId()) === 'ch.sunrise.tv', 'the focus stays on it');
  await key(RIGHT);
  await down(OK);
  await sleep(900);
  await up(OK);
  await sleep(300);
  await js("stack[0].idx = stack[0].items.map(function (i) { return i.label; }).indexOf('Icon and name...'); drawMenu(); 0");
  await key(OK);
  await key(OK);
  await sleep(300);
  ok(
    (await caps()).split('|')[2] === 'YouTube AdFree' && !(await js("!!tiles['youtube.leanback.v4'].querySelector('svg.glyph')")),
    '"The app\'s own icon" brings back the app\'s icon and name'
  );
  await key(LEFT);
  await key(LEFT);
  await sleep(200);
  ok((await focusId()) === '__hdmi', 'moving left reaches the HDMI card');
  S.config = {};

  // ---- Spotify drawn as its mark; Uninstall on removable apps, also when the first paint came from an older saved list ----
  await fresh();
  S.config = { dock: ['spotify-beehive', 'netflix', 'com.webos.app.browser'] };
  await send('Page.navigate', { url: BASE + '/home.html' });
  await sleep(1500);
  ok(
    (await caps()).split('|')[0] === 'Spotify' && (await js("tiles['spotify-beehive'].classList.contains('gl-spotify')")),
    'Spotify shows its drawn mark and the plain name Spotify'
  );
  // the list saved by a launcher from before removable existed: the first paint builds the tiles from it, the fresh list reuses them
  await js(
    'var c = JSON.parse(localStorage.getItem(CACHE_KEY)); c.apps = c.apps.map(function (a) { return { id: a.id, title: a.title }; }); localStorage.setItem(CACHE_KEY, JSON.stringify(c)); 0'
  );
  await send('Page.navigate', { url: BASE + '/home.html' });
  await sleep(1500);
  const holdLabels = async () => {
    await down(OK);
    await sleep(900);
    await up(OK);
    await sleep(300);
    return js('stack.length ? stack[0].items.map(function (i) { return i.label; }) : []');
  };
  ok(
    (await focusId()) === 'spotify-beehive' && (await holdLabels()).indexOf('Uninstall...') >= 0,
    'hold OK on a removable app offers Uninstall, also after a first paint from an older saved list'
  );
  await js('closeMenus(); 0');
  await key(RIGHT);
  await key(RIGHT);
  ok(
    (await focusId()) === 'com.webos.app.browser' && (await holdLabels()).indexOf('Uninstall...') < 0,
    'an app the TV does not let you remove has no Uninstall'
  );
  await js('closeMenus(); 0');
  await key(LEFT);
  await holdLabels();
  await js("stack[0].idx = stack[0].items.map(function (i) { return i.label; }).indexOf('Uninstall...'); drawMenu(); 0");
  await key(OK);
  ok(
    (await menuTitle()) === 'Uninstall this app?' && (await js('stack[stack.length - 1].idx')) === 0,
    'Uninstall asks first, with Cancel focused'
  );
  await key(DOWN);
  await key(OK, 600);
  ok(S.uninstalled.join() === 'netflix' && !(await js("dockIds().indexOf('netflix') >= 0")), 'Yes uninstalls the app and its card goes');

  // ---- LG Home for now: in Customise directly, and as a top button ----
  await js('closeMenus(); customizeMenu(); 0');
  const customItems = await js('stack[0].items.map(function (i) { return i.label; })');
  ok(customItems.indexOf('LG Home') >= 0 && customItems.indexOf('LG Home') < 8, 'Customise offers LG Home without scrolling');
  await js("stack[0].idx = stack[0].items.map(function (i) { return i.label; }).indexOf('LG Home'); drawMenu(); 0");
  await key(OK);
  ok((await menuTitle()) === 'Switch to LG Home?' && (await js('stack[stack.length - 1].idx')) === 0, 'it asks first, with Cancel focused');
  await key(DOWN);
  await key(OK, 600);
  ok(S.lgHome === 1, 'Switch now asks the service for LG Home');
  await js('closeMenus(); 0');
  S.config = {};

  // ---- a warning before uninstalling the privacy blocks ----
  await js("uninstallMenu({ id: 'ooo.lew.lifesgoodwithoutspying', title: 'lifesgoodwithoutspying' }); 0");
  await key(DOWN);
  ok(
    (await js('stack[stack.length - 1].items[1].sub')) === 'Its privacy blocks stop working',
    'uninstalling lifesgoodwithoutspying warns first'
  );
  await js('closeMenus(); 0');

  // ---- Power off: a top button to add, asked first ----
  await fresh();
  ok(
    (await js('PRESETS.map(function (p) { return barLabel(p); }).join()')).indexOf('Power off') >= 0,
    'Power off can be added as a top button'
  );
  await js('powerOffMenu(); 0');
  ok(
    (await menuTitle()) === 'Power off completely?' &&
      (await js('stack[stack.length - 1].items[stack[stack.length - 1].idx].label')) === 'Cancel',
    'Power off asks first, with Cancel focused'
  );
  await key(OK, 400);
  ok(S.powerOff === 0, 'Cancel does nothing');
  await js('closeMenus(); powerOffMenu(); 0');
  await key(DOWN);
  await key(OK, 600);
  ok(S.powerOff === 1, 'Yes asks the service to power off');

  // ---- inputs on Home: hold OK in the Inputs list, or Customise; a tile like an app ----
  S.inputs = [dev(1, 'UPC', true, true), dev(3, 'PS4', false)];
  S.pinned = [];
  await fresh();
  await js('inputsMenu(); 0');
  await sleep(400);
  await key(OK, 500);
  ok(S.launched[0] === 'com.webos.app.hdmi1' && !(await menuTitle()), 'a short OK on an input still opens it');
  await js('inputsMenu(); 0');
  await sleep(400);
  await down(OK);
  await sleep(900);
  await up(OK);
  await sleep(300);
  ok((await menuTitle()) === 'UPC', 'hold OK on an input opens its options');
  await key(DOWN);
  await key(OK, 900);
  ok(S.pinned.join() === 'com.webos.app.hdmi1' && !!(await js("!!tiles['com.webos.app.hdmi1']")), 'Add to Home makes it a tile at once');
  ok(
    await js(
      "tiles['com.webos.app.hdmi1'].classList.contains('gl-hdmi') && tiles['com.webos.app.hdmi1'].querySelector('.cap').textContent === 'UPC'"
    ),
    "the tile is drawn with the HDMI symbol and the input's name"
  );
  S.launched = [];
  await js("act(tiles['com.webos.app.hdmi1']); 0");
  await sleep(300);
  ok(
    S.launched[0] === 'com.webos.app.hdmi1' && (await js("localStorage.getItem('cytv.hdmi.last')")) === '1',
    'OK on the tile opens the input and remembers it'
  );
  await js("closeMenus(); appMenu(tiles['com.webos.app.hdmi1']._a); 0");
  const pinOpts = await js('stack[0].items.map(function (i) { return i.label; })');
  ok(
    pinOpts.indexOf('Remove from Home') >= 0 && pinOpts.indexOf('Hide app') < 0 && pinOpts.indexOf('Uninstall...') < 0,
    'its options: Remove from Home, not Hide or Uninstall'
  );
  await js('closeMenus(); customizeMenu(); 0');
  ok(
    (await js('stack[0].items.map(function (i) { return i.label; })')).slice(0, 8).indexOf('Inputs on Home') >= 0,
    'Customise offers Inputs on Home without scrolling'
  );
  await js('closeMenus(); pinMenu(); 0');
  await sleep(400);
  await key(DOWN);
  ok((await menuTitle()) === 'Inputs on Home', 'it lists the inputs');
  await key(OK, 900);
  ok(
    S.pinned.length === 2 && (await js("tiles['com.webos.app.hdmi3'].classList.contains('nosignal')")),
    'an input with nothing connected is dimmed'
  );
  S.pinned = [];

  // ---- icons that failed: the dock's white logos and the grid come back once the service answers ----
  S.config = {};
  S.iconFail = true;
  await fresh();
  ok(await js("!!tiles.netflix.querySelector('.mono .mt')"), 'with no icon the white logo shows the name');
  S.iconFail = false;
  await js('load(); 0');
  await sleep(900);
  ok(
    await js("!!tiles.netflix.querySelector('.mono img') && !tiles.netflix.querySelector('.mono .mt')"),
    'the logo comes back when the next app list arrives'
  );

  // ---- Quick settings: a button at the top of Home, between Inputs and Settings; the service opens the panel over the screen ----
  await js('RB.close(); closeMenus(); 0');
  await fresh();
  const barTexts = () => js("[].map.call($('bar').children, function (e) { return e.textContent; }).join('|')");
  ok(/^Inputs\|Quick settings\|Settings/.test(await barTexts()), 'Quick settings sits at the top of Home, between Inputs and Settings');
  S.quickCalls = [];
  const pressQuick = () => js("act([].filter.call($('bar').children, function (e) { return e.textContent === 'Quick settings'; })[0]); 0");
  await pressQuick();
  await sleep(400);
  ok(JSON.stringify(S.quickCalls) === '[{"open":"quick"}]' && !(await toastText()), 'OK on it asks the service to show the panel');
  S.quickOk = false;
  await pressQuick();
  await sleep(400);
  ok((await toastText()) === 'Quick settings are not available', 'when the service cannot show it, Home says so');
  S.quickOk = true;

  // ---- French, and an older service ----
  S.locale = 'fr-CH';
  S.version = '1.6.4';
  await fresh(2000);
  ok((await js("$('more').textContent")) === 'Toutes les apps', 'French: "Toutes les apps"');
  ok(/older than this launcher needs/.test(await toastText()), 'an older service is reported');
  ok((await caps()).split('|')[2] === 'YouTube', 'with an older service the automatic looks still apply');
  S.locale = 'en-GB';
  S.version = '1.9.0';

  // ---- the grid opens one press down ----
  await fresh();
  await key(DOWN, 500);
  ok(
    (await js("document.body.classList.contains('grid-open')")) && (await js("getComputedStyle($('more')).opacity")) === '0',
    'Down opens the app grid and hides "All apps"'
  );
  ok((await js("getComputedStyle(rows[r][c].querySelector('.cap')).opacity")) === '1', 'the focused app in the grid shows its name');
  await key(8, 500);
  ok(!(await js("document.body.classList.contains('grid-open')")), 'Back closes the grid');

  // ---- Style: Customise > Style switches at once, and back ----
  await fresh();
  await js('styleMenu(); 0');
  ok(
    (await menuTitle()) === 'Style' &&
      (await js('stack[0].items.map(function (i) { return i.label + i.sub; }).join()')) ===
        'Paysage\u2713,Verre,\u00c9ditorial,Lin,Aurore,Calm,Original',
    'Style lists the seven styles, Paysage current'
  );
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(OK, 1500);
  ok(
    (await js("document.body.getAttribute('data-dockstyle')")) === 'card' && (await js('cfg.theme.name')) === 'Calm',
    'choosing Calm changes the home screen at once'
  );
  // every style draws its dock, with no script error
  for (const [id, ds, n] of [
    ['verre', 'glass', 5],
    ['editorial', 'word', 4],
    ['lin', 'paper', 4],
    ['aurore', 'glass', 5],
    ['original', 'tile', 4],
  ]) {
    await js("setStyle('" + id + "'); 0");
    await sleep(1500);
    ok(
      (await js("document.body.getAttribute('data-dockstyle')")) === ds &&
        (await js("document.querySelectorAll('#dock .tile').length")) === n,
      id + ': its ' + ds + ' dock of ' + n
    );
  }
  ok(
    (await js('tiles.netflix.style.backgroundPosition')) === '' && (await js("tiles['ch.sunrise.tv'].style.backgroundPosition")) === '',
    'leaving a glass style takes the glass position away'
  );
  await js("setStyle('verre'); 0");
  await sleep(1500);
  ok(
    /^0px 0px, -\d+px -\d+px$/.test(await js("tiles['ch.sunrise.tv'].style.backgroundPosition")),
    'Verre: each glass tile shows the blurred scene behind it'
  );
  await js("setStyle('calm'); 0");
  await sleep(1500);
  await js('styleMenu(); 0');
  await key(OK, 1500);
  ok((await js("document.body.getAttribute('data-dockstyle')")) === 'logo', 'and Paysage comes back');

  // ---- the top buttons: in every style the focused pill holds its word in the middle, measured on the pixels. Left and right on the
  // word as written; up and down on capitals only (HHH), since accents and descenders are not what the eye centres on ----
  const shot = async rect =>
    png(
      Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip: Object.assign({ scale: 1 }, rect) })).result.data, 'base64')
    );
  const pillRect = i =>
    js(
      "(function () { var b = $('bar').children[" +
        i +
        "].getBoundingClientRect(); return JSON.stringify({ x: Math.round(b.left), y: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height), r: parseFloat(getComputedStyle($('bar').children[" +
        i +
        ']).borderTopLeftRadius) }); })()'
    );
  const off = [];
  let worstX = 0,
    worstY = 0;
  for (const id of ['classic', 'verre', 'editorial', 'lin', 'aurore', 'calm', 'original']) {
    await js("setStyle('" + id + "'); 0");
    await sleep(1600);
    const n = await js("$('bar').children.length");
    for (let i = 0; i < n; i++) {
      await js("[].forEach.call($('bar').children, function (e, j) { e.classList.toggle('f', j === " + i + '); }); 0');
      await sleep(350);
      let b = JSON.parse(await pillRect(i));
      const g = inkGaps(await shot(b), b.r);
      await js(
        "(function () { var s = $('bar').children[" +
          i +
          "].querySelector('span'); s.setAttribute('data-was', s.textContent); s.textContent = 'HHH'; })(); 0"
      );
      await sleep(150);
      b = JSON.parse(await pillRect(i));
      const v = inkGaps(await shot(b), b.r);
      const name = await js(
        "(function () { var s = $('bar').children[" +
          i +
          "].querySelector('span'); s.textContent = s.getAttribute('data-was'); return s.textContent; })()"
      );
      if (g && v) (worstX = Math.max(worstX, Math.abs(g.left - g.right) / 2)), (worstY = Math.max(worstY, Math.abs(v.top - v.bottom) / 2));
      if (!g || !v) off.push(id + ' "' + name + '": no ink found');
      else if (Math.abs(g.left - g.right) > 2 || Math.abs(v.top - v.bottom) > 2)
        off.push(id + ' "' + name + '": ' + g.left + ' left / ' + g.right + ' right, ' + v.top + ' above / ' + v.bottom + ' below');
    }
    await js("[].forEach.call($('bar').children, function (e) { e.classList.remove('f'); }); 0");
  }
  ok(
    !off.length,
    'the top buttons: the word sits in the middle of its pill in every style (furthest from the middle: ' +
      worstX +
      ' px sideways, ' +
      worstY +
      ' px up or down)' +
      (off.length ? ':\n  ' + off.join('\n  ') : '')
  );
  await js("setStyle('classic'); 0");
  await sleep(1500);
  await key(DOWN, 500);
  ok((await js("getComputedStyle($('clock')).opacity")) === '0', 'Paysage: the clock at the bottom steps aside while the app grid is open');
  await key(8, 500);
  ok((await js("getComputedStyle($('clock')).opacity")) === '1', 'and comes back with the grid closed');

  // ---- Remote buttons: the screen (Customise > Remote buttons) ----
  S.inputs = [dev(1, 'Apple TV', true)];
  S.remap = {};
  S.learning = null;
  await fresh();
  await js('RB.open(); 0');
  await sleep(400);
  const rbCards = () =>
    js(
      "[].map.call(document.querySelectorAll('#rb .rb-card'), function (c) { return c.textContent + (c.classList.contains('f') ? '*' : ''); }).join('|')"
    );
  ok(
    (await js("!!document.querySelector('#rb .rb-remote')")) && (await rbCards()) === 'Teach a button...*',
    'Remote buttons: a screen with a drawing of the remote, and one card to teach a button'
  );
  await key(OK, 400);
  ok(
    (await menuTitle()) === 'Which app should it open?' &&
      (await js('stack[stack.length - 1].items.slice(0, 6).map(function (i) { return i.label; }).join()')) ===
        'Quick settings,Sunrise TV,YouTube,IPTV,Netflix,Apple TV',
    'the choices start with Quick settings and the dock apps, then the HDMI inputs by their device'
  );
  await key(DOWN, 200);
  await key(OK, 600);
  ok(
    JSON.stringify(S.remapCalls[S.remapCalls.length - 1]) === '{"learn":"ch.sunrise.tv"}' &&
      !(await js('stack.length')) &&
      (await js("document.getElementById('rb').className")) === 'teach' &&
      (await js("document.querySelector('#rb h2').textContent")) === 'Press the button',
    "choosing Sunrise TV: the service waits for the button, the screen says to press it and the remote's app buttons pulse"
  );
  S.learning = { app: 'ch.sunrise.tv', state: 'saved', code: '435' };
  S.remap = { 435: 'ch.sunrise.tv' };
  await sleep(1200);
  ok(
    (await js("document.getElementById('rb').className")) === 'done' &&
      /now opens Sunrise TV/.test(await js("document.querySelector('#rb .rb-p').textContent")),
    'once the button is pressed: a confirmation'
  );
  await sleep(2800);
  ok((await rbCards()) === 'Sunrise TVButton 1*|Teach a button...', 'then the list, with the button and its app');
  await key(OK, 400);
  await key(OK, 400);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(DOWN, 200);
  await key(OK, 900);
  ok(
    S.remap['435'] === 'com.webos.app.hdmi1' && /Apple TV · HDMI 1/.test(await rbCards()),
    'OK on the button: it can open an HDMI input instead'
  );
  await key(OK, 400);
  await key(OK, 400);
  await key(OK, 900);
  ok(S.remap['435'] === '__quick' && /^Quick settingsButton 1/.test(await rbCards()), 'or the Quick settings panel, named so on its card');
  await key(OK, 400);
  await key(DOWN, 200);
  await key(OK, 900);
  ok(!S.remap['435'] && (await rbCards()) === 'Teach a button...*', 'or be given back to LG');
  await js("RB.teach('youtube.leanback.v4'); 0");
  await sleep(400);
  S.learning = { app: 'youtube.leanback.v4', state: 'taken', code: '241' };
  await sleep(1200);
  ok(
    /kept for its own use/.test(await toastText()) && (await js("document.getElementById('rb').className")) === 'list',
    'a button CleanYourTV already uses is refused, with a message'
  );
  await key(8, 400);
  ok(!(await js("!!document.getElementById('rb')")) && !(await js('RB.on')), 'Back leaves the screen');

  // ---- the HDMI card's name ----
  await js("setHdmiName('Set-top box'); 0");
  await sleep(300);
  ok((await caps()).split('|')[0] === 'Set-top box', 'the HDMI card can be given a name of its own');
  await js("setHdmiName(''); 0");
  await sleep(300);
  ok((await caps()).split('|')[0] === 'Apple TV', "and take its device's name again");

  // ---- idle screen, night mode ----
  await js('idleAt = Date.now() - 4 * 60000; idleCheck(); 0');
  await sleep(1300);
  ok(
    (await js("document.body.classList.contains('idle')")) && (await js("getComputedStyle($('view')).opacity")) !== '1',
    'after 3 minutes without a key, Home fades to the clock'
  );
  S.launched = [];
  await key(OK, 400);
  ok(!(await js("document.body.classList.contains('idle')")) && S.launched.length === 0, 'the first key only wakes it');
  await js("cfg.idle = 'off'; idleAt = Date.now() - 60 * 60000; idleCheck(); 0");
  ok(!(await js("document.body.classList.contains('idle')")), 'the idle screen can be switched off');
  await js("cfg.idle = '3'; 0");
  const nightAt = async h =>
    js(
      '(function () { var D = Date; Date = function () { var d = new D(); d.setHours(' +
        h +
        '); return d; }; Date.now = D.now; nightCheck(); var on = document.body.classList.contains("night"); Date = D; return on; })()'
    );
  ok((await nightAt(23)) && !(await nightAt(14)) && (await nightAt(3)), 'night mode from 22:00 to 6:00');

  // ---- weather beside the date ----
  S.weather = { temp: 12, code: 3, day: true };
  await js("cfg.weather = 'lausanne'; refreshWeather(true); 0");
  await sleep(500);
  ok(/ · 12° overcast$/.test(await js("$('date').textContent")), 'the weather shows beside the date');
  await js("cfg.weather = 'off'; refreshWeather(true); 0");
  await sleep(300);
  ok(!/°/.test(await js("$('date').textContent")), 'and goes when switched off');

  // ---- the scene follows the time of day (Paysage) ----
  const wallAt = async h =>
    js(
      '(function () { var D = Date; Date = function () { var d = new D(); d.setHours(' +
        h +
        '); return d; }; Date.now = D.now; scene.period = "x"; sceneCheck(); var w = getComputedStyle(document.documentElement).getPropertyValue("--wall"); Date = D; return w; })()'
    );
  ok(
    /scene-lac-aube\.jpg/.test(await wallAt(7)) &&
      /scene-lac-jour\.jpg/.test(await wallAt(12)) &&
      /scene-lac\.jpg/.test(await wallAt(19)) &&
      /scene-lac-nuit\.jpg/.test(await wallAt(23)),
    'Paysage: dawn, day, dusk and night lakes through the day'
  );
  // with a city the lake follows the sun instead of the clock
  await js("cfg.place = 'lausanne'; sunKept.key = ''; 0");
  const wallSun = async mins =>
    js(
      '(function () { var D = Date, s = sunToday(new D()), T = s.set + (' +
        mins +
        ') * 60000; Date = function (a) { return a === undefined ? new D(T) : new D(a); }; Date.UTC = D.UTC; Date.now = function () { return T; }; scene.period = "x"; sceneCheck(); var w = getComputedStyle(document.documentElement).getPropertyValue("--wall"); Date = D; return w; })()'
    );
  ok(
    /scene-lac-jour\.jpg/.test(await wallSun(-200)) &&
      /scene-lac\.jpg/.test(await wallSun(-60)) &&
      /scene-lac\.jpg/.test(await wallSun(30)) &&
      /scene-lac-nuit\.jpg/.test(await wallSun(60)),
    "with a city: day, then the dusk lake from 90 minutes before that day's sunset to 40 after, then night"
  );

  // ---- the city in Customise: the sun's times, and the weather on that city ----
  await js("cfg.place = undefined; cfg.weather = 'off'; sunKept.key = ''; closeMenus(); customizeMenu(); 0");
  const custom = async () => JSON.parse(await js("JSON.stringify(stack[0].items.map(function (i) { return [i.label, i.sub || '']; }))"));
  const pick = (menu, label) =>
    js('stack[' + menu + '].items.filter(function (i) { return i.label === ' + JSON.stringify(label) + '; })[0].fn(); 0');
  let cu = await custom();
  const row = l => (cu.filter(i => i[0] === l)[0] || [])[1];
  ok(
    row('City') === 'None (fixed hours)' && row('Weather') === 'Disabled' && row('Night mode') === '22:00–6:00',
    'Customise: no city yet, so fixed hours, no weather and night mode until 6:00'
  );
  await pick(0, 'Weather');
  ok((await menuTitle()) === 'Which city?', 'turning the weather on without a city asks for one');
  await pick('stack.length - 1', 'Lausanne');
  await sleep(400);
  ok(S.config.place === 'lausanne' && S.config.weather === 'lausanne', 'choosing Lausanne sets the city, with the weather on it');
  await js('closeMenus(); customizeMenu(); 0');
  cu = await custom();
  ok(
    /^Lausanne · ☀ \d+:\d\d–\d+:\d\d$/.test(row('City')) && row('Weather') === 'Enabled' && row('Night mode') === '22:00 to sunrise',
    "the City row shows today's sunrise and sunset; night mode lasts until sunrise"
  );
  await js('placeMenu(); 0');
  await pick('stack.length - 1', 'Zurich');
  await sleep(400);
  ok(S.config.place === 'zurich' && S.config.weather === 'zurich', 'another city: the weather follows it');
  await js('closeMenus(); customizeMenu(); 0');
  await pick(0, 'Weather');
  await sleep(400);
  ok(S.config.weather === 'off' && S.config.place === 'zurich', 'the weather off keeps the city for the sun');
  await js("closeMenus(); cfg.place = undefined; cfg.weather = 'off'; sunKept.key = ''; 0");

  // ---- Quick settings over the screen: the picker app's panel, with the service's own module behind it ----
  S.realQuick = true;
  S.tv = { pictureMode: 'filmMaker', soundMode: 'aiSoundPlus', sleepTimer: 'off' };
  const BACK = 461;
  const openPicker = async (panel, wait = 1200) => {
    S.panel = panel;
    S.tvCalls = [];
    await send('Page.navigate', { url: BASE + '/picker.html' });
    await sleep(wait);
  };
  const rows = () =>
    js(
      "[].map.call(document.querySelectorAll('#qs .qr'), function (e) { return e.innerText.replace(/\\n/g, ' ') + (e.classList.contains('f') ? '*' : ''); }).join('|')"
    );
  const sets = () => S.tvCalls.filter(c => /^setSystemSettings/.test(c)).map(c => c.slice(18));
  await openPicker('quick');
  ok(
    (await js('document.body.className')) === 'on v-quick' &&
      (await rows()) === 'Picture Filmmaker*|Sound AI Sound Pro|Sleep timer Off|Screen · the sound plays on Turn off',
    "Quick settings: the TV's picture and sound modes, the sleep timer and the screen, read from the TV"
  );
  await key(RIGHT, 1100);
  ok(
    S.tv.pictureMode === 'personalized' && /^Picture Personalised\*/.test(await rows()),
    'Right: the next picture mode (round from the last), set on the TV'
  );
  await key(DOWN, 100);
  await key(RIGHT, 80);
  await key(RIGHT, 80);
  await key(RIGHT, 1100);
  ok(
    S.tv.soundMode === 'movie' && sets().filter(c => /soundMode/.test(c)).length === 1,
    'quick presses show each mode but only the one it rests on is sent'
  );
  await key(DOWN, 100);
  await key(LEFT, 300);
  ok(/Sleep timer Off\*/.test(await rows()) && !sets().some(c => /sleepTimer/.test(c)), 'the sleep timer stops at Off');
  await key(RIGHT, 80);
  await key(RIGHT, 1200);
  ok(
    S.tv.sleepTimer === '20' && /Sleep timer · off at \d+:\d\d 20 min\*/.test(await rows()),
    'two steps: 20 minutes, and when the TV will turn off'
  );
  await key(RIGHT, 80);
  await key(BACK, 900);
  ok(
    S.tv.sleepTimer === '30' && (await js('document.body.className')) === '' && (await js('window.__hidden')) > 0,
    'Back closes the panel, and a change still waiting is sent all the same'
  );
  await openPicker('quick');
  S.refuse = true;
  await key(RIGHT, 1200);
  ok(
    /did not take it/.test(await js("document.querySelector('#qs .qf').textContent")) && /^Picture Personalised\*/.test(await rows()),
    'a change the TV refuses is said, and the panel shows the mode the TV kept'
  );
  S.refuse = false;
  await js("webOSSystem.launchParams = JSON.stringify({ panel: 'inputs' }); document.dispatchEvent(new Event('webOSRelaunch')); 0");
  await sleep(300);
  ok((await js('document.body.className')) === 'on v-inputs', 'the Input key over the panel shows the Inputs');
  await js("webOSSystem.launchParams = JSON.stringify({ panel: 'quick' }); document.dispatchEvent(new Event('webOSRelaunch')); 0");
  await sleep(900);
  await js("webOSSystem.launchParams = JSON.stringify({ panel: 'quick' }); document.dispatchEvent(new Event('webOSRelaunch')); 0");
  await sleep(300);
  ok((await js('document.body.className')) === '', 'its own button pressed again closes it');
  await openPicker('quick');
  await key(DOWN, 80);
  await key(DOWN, 80);
  await key(DOWN, 80);
  await key(OK, 600);
  ok(
    S.tvCalls.includes('turnOffScreen') && (await js('document.body.className')) === '',
    'Turn off: the screen goes off and the panel closes'
  );
  // the warning a minute before the sleep timer ends (the timer was changed elsewhere, so the page counts the minute itself)
  S.tv.sleepTimer = '10';
  await openPicker('sleep');
  ok(
    (await js("document.getElementById('sw').innerText.replace(/\\n/g, ' ')")).indexOf('The TV turns off soon') === 0 &&
      /in (59|60) s/.test(await js("$('swIn').textContent")),
    'the sleep warning: the TV turns off in a minute'
  );
  await key(OK, 900);
  ok(S.tv.sleepTimer === '20' && (await js('document.body.className')) === '', '20 more minutes: the timer starts again, the warning goes');
  await openPicker('sleep');
  await key(RIGHT, 100);
  S.tvCalls = [];
  await key(OK, 500);
  ok(!sets().length && (await js('document.body.className')) === '', 'or it is left to turn the TV off');
  S.realQuick = false;

  ok(!errors.length, 'no script errors' + (errors.length ? ':\n  ' + errors.join('\n  ') : ''));
  ws.close();
  console.log(failed ? failed + ' check(s) failed' : 'all Calm checks passed');
  done(failed ? 1 : 0);
} catch (e) {
  console.error(e.stack || e);
  done(1);
}
