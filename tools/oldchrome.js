// Runs the launcher, the manager and the Inputs picker in the browser engines of older TVs: Chromium 68 (webOS 5) and Chromium 79
// (webOS 6), headless, against a stand-in for the TV's service on 127.0.0.1:8765. It fails when a page throws a script error or does
// not draw what it should (tiles, rows, inputs). A current Chrome hides such problems: these versions lack features it has.
//   node tools/oldchrome.js                 both engines
//   node tools/oldchrome.js --shots <dir>   also saves a screenshot of each page per engine
// The engines are Chromium snapshots from Google's storage, downloaded once (about 100 MB each), checked against pinned SHA-256 sums
// and kept in ~/.cache/cleanyourtv. Linux x64 and macOS (x64, or Apple silicon with Rosetta). Needs curl and unzip. Runs on Node 8.
'use strict';
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  http = require('http'),
  cp = require('child_process'),
  crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'cleanyourtv');
// [name, snapshot revision, sha256 of the zip per platform]
const ENGINES = [
  [
    'Chromium 68 (webOS 5)',
    '555668',
    {
      mac: '22374cff2109946143bdabd68b93730d0d09d02fc26e9dc9255008824b8ea13b',
      linux: '4cc31551f7c2d0e6fb37c4678448d2f62fbbf8bd2134f06128f54e21466d4b3c',
    },
  ],
  [
    'Chromium 79 (webOS 6)',
    '706915',
    {
      mac: 'e6b754d211e4ad264c163b5a9e2fda9b2c07ab014402e8ee29e97de620ccefe6',
      linux: '647c9f1a9be953a7bdbcb59ec52fece3ef192945a674443114572e98b56b7e59',
    },
  ],
];
const PLAT = process.platform === 'darwin' ? 'mac' : process.platform === 'linux' && process.arch === 'x64' ? 'linux' : '';
const args = process.argv.slice(2);
const shots = args.indexOf('--shots') >= 0 ? path.resolve(args[args.indexOf('--shots') + 1]) : '';

let failed = 0;
const ok = (c, name) => {
  console.log((c ? 'ok   ' : 'FAIL ') + name);
  if (!c) failed++;
};

function engine(rev, sums) {
  const dir = path.join(CACHE, 'chromium-' + PLAT + '-' + rev);
  const bin =
    PLAT === 'mac'
      ? path.join(dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
      : path.join(dir, 'chrome-linux', 'chrome');
  if (fs.existsSync(bin)) return bin;
  cp.spawnSync('mkdir', ['-p', dir]);
  const zip = path.join(CACHE, 'chrome-' + PLAT + '-' + rev + '.zip');
  if (!fs.existsSync(zip)) {
    const url =
      'https://storage.googleapis.com/chromium-browser-snapshots/' +
      (PLAT === 'mac' ? 'Mac' : 'Linux_x64') +
      '/' +
      rev +
      '/chrome-' +
      PLAT +
      '.zip';
    console.log('downloading ' + url);
    const r = cp.spawnSync('curl', ['-fsSL', url, '-o', zip + '.part'], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('download failed');
    fs.renameSync(zip + '.part', zip);
  }
  const sum = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
  if (sum !== sums[PLAT]) {
    fs.unlinkSync(zip);
    throw new Error('checksum mismatch for ' + zip);
  }
  if (cp.spawnSync('unzip', ['-qo', zip, '-d', dir], { stdio: 'inherit' }).status !== 0) throw new Error('unzip failed');
  if (PLAT === 'mac') cp.spawnSync('xattr', ['-dr', 'com.apple.quarantine', dir]);
  return bin;
}

// ---- the stand-in service: a few made-up apps, two inputs, the replies recorded in tools/test/golden/api.json ----
const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'test', 'golden', 'api.json'), 'utf8').replace(/<version>/g, '9.9.9'));
const NAMES = ['Streaming', 'Video', 'Music', 'Photos', 'Games', 'Browser', 'News', 'Weather', 'Sports', 'Movies', 'Kids', 'Radio'];
const apps = NAMES.map((n, i) => ({ id: 'app.' + i, title: n, hue: (i * 47) % 360 }));
const icon = a =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="hsl(' +
  a.hue +
  ',62%,46%)"/><circle cx="128" cy="116" r="54" fill="#fff"/></svg>';
const theme = require(path.join(ROOT, 'helper', 'theme.js')).create({
  config: require(path.join(ROOT, 'helper', 'config.js')).memory({}),
  noStartup: true,
});
// in front of the page's own script: report script errors on <html data-errors>, and the TV's webOSSystem with the page's launch parameters.
// Near the end of the page time the page also posts its own DOM to the stand-in (/__dom): headless Chromium 79 now and then fails its
// --dump-dom ("Failed to serialize document: Uncaught") on a page that rendered fine, and this copy does not go through that step
const PROBE = (params, report) =>
  '<script>window.onerror=function(m,s,l){var h=document.documentElement;h.setAttribute("data-errors",(h.getAttribute("data-errors")||"")+m+" (line "+l+"); ")};' +
  'window.webOSSystem={launchParams:' +
  JSON.stringify(JSON.stringify(params || {})) +
  ',locale:"en-GB",hide:function(){},activate:function(){},platformBack:function(){},setInputRegion:function(){},setKeyMask:function(){}};' +
  'setTimeout(function(){try{var x=new XMLHttpRequest();x.open("POST","/__dom");x.send(document.documentElement.outerHTML)}catch(e){}},' +
  report +
  ');</script>';
const page = (f, params, budget) =>
  fs.readFileSync(path.join(ROOT, f), 'utf8').replace('<script>', PROBE(params, Math.round((budget || 8000) * 0.75)) + '<script>');
let posted = ''; // the DOM the page posted itself (PROBE)
// [name, file, what it draws, how many at least, milliseconds of page time to wait, launch parameters]
const PAGES = [
  ['launcher', 'app/index.html', /class="tile[ "]/g, 8, 8000],
  // no saved dock: the favourites found by name (YouTube AdFree, an IPTV player) and the HDMI card with its port, drawn as glyphs
  ['launcher-favourites', 'app/index.html', /class="(?:tile gl gl-|chip on)/g, 4, 8000],
  ['manager', 'manager/app/index.html', /class="row[ "]/g, 5, 8000],
  ['picker', 'picker/app/index.html', /class="chip[ "]/g, 2, 3000],
  // the same app as Quick settings: four rows filled from the service
  ['picker-quick', 'picker/app/index.html', /class="qr[ "]/g, 4, 3000, { panel: 'quick' }],
];
// apps the Calm favourites find by their names
const FAVOURITES = [
  { id: 'youtube.leanback.v4', title: 'YouTube AdFree', hue: 0 },
  { id: 'com.siptv.smartiptv', title: 'Smart IPTV', hue: 250 },
];
let current = ''; // the page being run: the stand-in answers per page
const marks = []; // what the pages log (perf lines: tools/perf-tv.sh reads the same on a TV)
function serve() {
  const srv = http.createServer((q, r) => {
    const u = q.url.split('?')[0];
    r.setHeader('Access-Control-Allow-Origin', '*');
    r.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (q.method === 'OPTIONS') return r.writeHead(204), r.end();
    const json = o => (r.writeHead(200, { 'content-type': 'application/json' }), r.end(JSON.stringify(o)));
    if (u === '/__dom' && q.method === 'POST') {
      let b = '';
      q.on('data', d => (b += d));
      q.on('end', () => {
        posted = b;
        json({});
      });
      return;
    }
    const p = PAGES.filter(x => '/' + x[0] + '.html' === u)[0];
    if (p) return r.writeHead(200, { 'content-type': 'text/html' }), r.end(page(p[1], p[5], p[4]));
    if (u === '/qrcode.js')
      return (
        r.writeHead(200, { 'content-type': 'text/javascript' }),
        r.end(fs.readFileSync(path.join(ROOT, 'third-party', 'qrcode-generator', 'qrcode.js')))
      );
    if (u.indexOf('/api/theme/') === 0) return theme.handle(q, r, u, async () => ({}));
    if (u === '/api/apps')
      return json(
        current === 'launcher-favourites'
          ? {
              apps: apps.concat(FAVOURITES).map(a => ({ id: a.id, title: a.title })),
              config: { theme: theme.resolved() },
              usage: {},
              version: '9.9.9',
            }
          : {
              apps: apps.map(a => ({ id: a.id, title: a.title })),
              config: { dock: apps.slice(0, 4).map(a => a.id), theme: theme.resolved() },
              usage: {},
              version: '9.9.9',
            }
      );
    if (u === '/api/inputs')
      return json({
        devices: [
          { id: 'HDMI_1', appId: 'com.webos.app.hdmi1', port: 1, label: 'Game console', connected: true, hdmiPlugIn: true },
          { id: 'HDMI_2', appId: 'com.webos.app.hdmi2', port: 2, label: 'HDMI 2', connected: false, hdmiPlugIn: false },
        ],
      });
    if (u === '/api/manager/status') return json(golden['manager status'].body);
    if (u === '/api/quick')
      return json({
        picture: { value: 'cinema', values: ['vivid', 'normal', 'cinema', 'filmMaker'] },
        sound: { value: 'aiSoundPlus', values: ['aiSoundPlus', 'standard', 'movie'] },
        sleep: { value: '30', values: ['off', '10', '20', '30', '60'], endsAt: Date.now() + 1800000 },
      });
    if (u === '/api/log') {
      marks.push(decodeURIComponent(q.url.split('m=')[1] || ''));
      return json({});
    }
    const m = /^\/icon\/(app\.\d+)$/.exec(u);
    if (m) return r.writeHead(200, { 'content-type': 'image/svg+xml' }), r.end(icon(apps[+m[1].split('.')[1]]));
    const fav = FAVOURITES.filter(a => '/icon/' + a.id === u)[0];
    if (fav) return r.writeHead(200, { 'content-type': 'image/svg+xml' }), r.end(icon(fav));
    json({ returnValue: true });
  });
  return new Promise((res, rej) => {
    srv.on('error', rej);
    srv.listen(8765, '127.0.0.1', () => res(srv));
  });
}

// asynchronous on purpose: the stand-in service runs in this process and must keep answering while the browser loads the page
function run(bin, url, extra, budget) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-chromium-'));
  const argv = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--user-data-dir=' + dir,
    '--window-size=1920,1080',
    '--virtual-time-budget=' + (budget || 8000),
  ];
  return new Promise(resolve => {
    cp.execFile(bin, argv.concat(extra, [url]), { encoding: 'utf8', timeout: 45000, maxBuffer: 32 << 20 }, (e, stdout, stderr) => {
      cp.spawnSync('rm', ['-rf', dir]);
      resolve({ status: e ? e.code || 1 : 0, error: e && e.killed ? 'timed out' : '', stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

(async () => {
  if (!PLAT) {
    console.log('skipped: old Chromium builds are fetched for Linux x64 and macOS only');
    return;
  }
  const srv = await serve().catch(e => {
    console.error('port 8765 is in use: ' + e.message);
    process.exit(2);
  });
  if (shots) cp.spawnSync('mkdir', ['-p', shots]);
  try {
    for (const e of ENGINES) {
      const bin = engine(e[1], e[2]);
      for (const p of PAGES) {
        const url = 'http://127.0.0.1:8765/' + p[0] + '.html';
        current = p[0];
        // headless Chromium 79 on Linux now and then fails to hand over the page ("Failed to serialize document") or hangs, and Chromium 68
        // now and then hands over an empty document (<html><head></head><body></body></html>) instead of the page: try again until the
        // dump holds the page itself (the stand-in's webOSSystem script is in every page). When the dump fails, the DOM the page posted
        // itself (PROBE) stands in for it, so a failed dump alone does not cost a try
        let r = null,
          tries = 0,
          fromPage = false;
        for (; tries < 8; tries++) {
          if (tries) await new Promise(res => setTimeout(res, 1000));
          posted = '';
          r = await run(bin, url, ['--dump-dom'], p[4]);
          if (r.status === 0 && (r.stdout || '').indexOf('webOSSystem') >= 0) break;
          if (posted.indexOf('webOSSystem') >= 0) {
            r = { status: 0, stdout: posted, stderr: r.stderr, error: '' };
            fromPage = true;
            break;
          }
        }
        if (tries || fromPage)
          console.log(
            '     ' +
              e[0] +
              ': ' +
              p[0] +
              (fromPage ? ' read from the page itself (the dump failed)' : '') +
              (tries ? ', ' + (tries + 1) + ' tries' : '')
          );
        const dom = r.stdout || '';
        const errs = (/data-errors="([^"]*)"/.exec(dom) || [])[1] || '';
        const n = (dom.match(p[2]) || []).length;
        ok(
          r.status === 0 && dom.indexOf('<body') >= 0,
          e[0] + ': ' + p[0] + ' loads' + (r.status ? ' (' + (r.error || r.stderr.slice(-300)) + ')' : '')
        );
        ok(!errs, e[0] + ': ' + p[0] + ' runs without script errors' + (errs ? ': ' + errs : ''));
        ok(
          n >= p[3],
          e[0] +
            ': ' +
            p[0] +
            ' draws its content (' +
            n +
            ' found, ' +
            p[3] +
            ' expected)' +
            (n >= p[3]
              ? ''
              : '\n  page: ' +
                dom.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').slice(0, 600) +
                '\n  browser: ' +
                (r.stderr || '').slice(-600))
        );
        const ready = marks.filter(m => /^perf launcher ready /.test(m)).pop();
        if (p[0] === 'launcher' && ready)
          console.log('     ' + e[0] + ': launcher ready ' + ready.split(' ').pop() + ' ms after the page load (this computer, not a TV)');
        marks.length = 0;
        if (shots) await run(bin, url, ['--screenshot=' + path.join(shots, e[1] + '-' + p[0] + '.png')], p[4]);
      }
    }
  } catch (err) {
    ok(false, String(err.message || err));
  }
  srv.close();
  console.log(failed ? failed + ' check(s) failed in old Chromium' : 'the pages work in Chromium 68 and 79');
  process.exit(failed ? 1 : 0);
})();
