// The launcher's own API: the list of apps with their icons, how often each is used, the inputs, launching, and the launcher's
// settings (dock, hidden apps, sort order, clock, top buttons), and uninstalling an app.
//   GET /api/apps  GET /api/inputs  GET /api/foreground  POST /api/launch {id, params}  POST /api/config {...}  GET /icon/<app id>
//   POST /api/uninstall {id}  POST /api/power/off  POST /api/inputs/pin {id, on}
// An input pinned to Home is listed with the apps ({id: its input app, title, input: <port>, off: <nothing connected>}); config.json keeps
// them in pinnedInputs, apart from the launcher's own keys. The idea and first version are ibexes' (cleanyourtv-WebOS, pull request 25).
const fs = require('fs'),
  path = require('path');
const P = require('./paths'),
  web = require('./web'),
  exec = require('./exec'),
  { LAUNCHER_KEYS } = require('./config');

const HALF_LIFE = 30 * 24 * 3600 * 1000; // usage counts halve every 30 days
// the drawn icons the launcher has (app/src/js/calm.js, GLYPHS); '' is the app's own icon
const GLYPHS = ['', 'youtube', 'iptv', 'spotify', 'tv', 'hdmi', 'film', 'music', 'sport'];
const APP_ID = /^[\w.\-]{1,120}$/;
const HOME = 'com.webos.app.home';
// never offered for uninstalling even when the TV allows it: the Homebrew Channel keeps root and runs the boot scripts, safeupdate and
// appupdateblocker keep LG's firmware updates away (an update can remove root), and ours would remove the launcher
const KEEP = /^(com\.webos\.app\.home|org\.webosbrew\.(hbchannel|safeupdate|appupdateblocker)|com\.cleanyourtv\..*)$/;
// apps installed in developer mode (Homebrew Channel, ares) are removed through appInstallService's dev/ methods
const DEV_DIR = '/media/developer/apps/';
const isDev = a => String(a.folder || '').indexOf(DEV_DIR) === 0;

function create(ctx) {
  const { config, luna } = ctx;

  // ---- the installed apps. The app manager takes a moment to answer (a luna-send each time), and Home is opened often: after the first
  // answer the list is given at once from memory and asked again in the background when it is older than 5 seconds, so an app installed
  // a moment ago shows up on the next opening of Home ----
  let appCache = null,
    appCacheAt = 0,
    asking = null;
  function askApps() {
    if (!asking)
      asking = luna('luna://com.webos.applicationManager/listApps', {}).then(r => {
        asking = null;
        if (!Array.isArray(r.apps)) return appCache || [];
        appCache = r.apps
          .filter(a => a.visible !== false && a.id !== HOME)
          .map(a => ({
            id: a.id,
            title: a.title,
            icon: a.largeIcon || a.icon,
            folder: a.folderPath,
            type: a.type,
            removable: a.removable === true && !KEEP.test(a.id),
          }));
        appCacheAt = Date.now();
        return appCache;
      });
    return asking;
  }
  async function installed() {
    if (!appCache) return askApps();
    if (Date.now() - appCacheAt > 5000) askApps();
    return appCache;
  }

  // ---- the inputs, read like the apps: the last answer at once, asked again in the background when older than 5 seconds ----
  let inputCache = null,
    inputCacheAt = 0,
    askingInputs = null;
  function askInputs() {
    if (!askingInputs)
      askingInputs = luna('luna://com.webos.service.eim/getAllInputStatus', {}).then(r => {
        askingInputs = null;
        if (Array.isArray(r.devices)) {
          inputCache = r.devices;
          inputCacheAt = Date.now();
        }
        return r;
      });
    return askingInputs;
  }
  function knownInputs() {
    if (!inputCache || Date.now() - inputCacheAt > 5000) askInputs();
    return inputCache || [];
  }
  // the inputs on Home, with the name and state the TV reports now, else what was saved when pinned. Nothing is asked when there are none
  function pinned() {
    const list = (config.get().pinnedInputs || []).filter(p => p && typeof p.id === 'string');
    if (!list.length) return [];
    const now = {};
    for (const d of knownInputs()) if (d.appId) now[d.appId] = d;
    return list.map(p => {
      const d = now[p.id];
      return {
        id: p.id,
        title: (d && d.label) || p.label || 'HDMI ' + p.port,
        input: (d && d.port) || p.port || 0,
        off: d ? !d.hdmiPlugIn : false,
      };
    });
  }
  async function apps() {
    return (await installed()).concat(pinned());
  }
  async function pin(b) {
    const id = String(b.id || ''),
      on = b.on !== false,
      r = await askInputs(),
      d = (r.devices || inputCache || []).find(x => x.appId === id);
    if (on && !d) return [{ error: 'not an input of this TV' }, 404];
    config.update('launcher', c => {
      const list = (c.pinnedInputs || []).filter(p => p && p.id !== id);
      if (on) list.push({ id, label: d.label || '', port: d.port });
      c.pinnedInputs = list.slice(0, 20);
      if (!on && Array.isArray(c.dock)) c.dock = c.dock.filter(i => i !== id);
    });
    return [{ returnValue: true, pinned: on }, 200];
  }

  // ---- usage: which apps get used (foreground changes), with a 30-day half-life ----
  let usage = {};
  try {
    usage = JSON.parse(fs.readFileSync(P.USAGE, 'utf8'));
  } catch (_) {}
  const decayed = (u, now) => u.s * Math.pow(0.5, (now - u.t) / HALF_LIFE);
  function usageScores() {
    const now = Date.now(),
      out = {};
    for (const id in usage) out[id] = Math.round(decayed(usage[id], now) * 1000) / 1000;
    return out;
  }
  let saveTimer = null;
  function bump(id) {
    const now = Date.now(),
      u = usage[id];
    usage[id] = { s: (u ? decayed(u, now) : 0) + 1, t: now };
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        fs.writeFileSync(P.USAGE + '.tmp', JSON.stringify(usage));
        fs.renameSync(P.USAGE + '.tmp', P.USAGE);
      } catch (_) {}
    }, 15000);
  }
  // an app counts as used once it stayed in the foreground for two polls in a row; going back to Home arms it again
  let cand = null,
    streak = 0,
    counted = null;
  async function onForeground(id) {
    if (id === HOME) {
      counted = null;
      cand = id;
      streak = 1;
      return;
    }
    if (!id) return;
    if (id === cand) streak++;
    else {
      cand = id;
      streak = 1;
    }
    if (streak >= 2 && id !== counted) {
      counted = id;
      if ((await apps()).some(a => a.id === id)) bump(id);
    }
  }
  // poll every few seconds: a subscription's output is block-buffered by luna-send, so it would arrive late
  function pollForeground() {
    exec.execFile(
      'luna-send',
      ['-n', '1', '-w', '3000', '-f', 'luna://com.webos.applicationManager/getForegroundAppInfo', '{}'],
      { timeout: 6000 },
      (e, out) => {
        try {
          const o = JSON.parse(out);
          if (o.returnValue !== false) onForeground(o.appId || '');
        } catch (_) {}
      }
    );
  }

  // ---- the launcher's settings: only its own keys are replaced; options, keys, theme and the rest stay as they are ----
  function saveLauncherConfig(b) {
    const strs = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 200) : undefined);
    const out = {};
    if (strs(b.dock)) out.dock = strs(b.dock).slice(0, 8);
    if (strs(b.hidden)) out.hidden = strs(b.hidden);
    if (b.sort === 'usage' || b.sort === 'alpha') out.sort = b.sort;
    if (['auto', '24', '12'].includes(b.clock)) out.clock = b.clock;
    if (Array.isArray(b.topbar))
      out.topbar = b.topbar
        .slice(0, 12)
        .filter(o => o && typeof o.label === 'string')
        .map(o => {
          const t = { label: o.label.slice(0, 40), icon: String(o.icon || 'grid').slice(0, 20) };
          if (typeof o.action === 'string') t.action = o.action;
          if (typeof o.app === 'string') t.app = o.app;
          if (o.params && typeof o.params === 'object') t.params = o.params;
          return t;
        });
    // how an app looks: {<app id>: {label, icon}}, a name and a drawn icon chosen in the launcher
    if (b.tiles && typeof b.tiles === 'object' && !Array.isArray(b.tiles)) {
      const tiles = {};
      for (const id of Object.keys(b.tiles).slice(0, 100)) {
        const v = b.tiles[id],
          o = {};
        if (!APP_ID.test(id) || !v || typeof v !== 'object') continue;
        if (typeof v.label === 'string' && v.label.trim()) o.label = v.label.trim().slice(0, 40);
        if (typeof v.icon === 'string' && GLYPHS.indexOf(v.icon) >= 0) o.icon = v.icon;
        if (Object.keys(o).length) tiles[id] = o;
      }
      out.tiles = tiles;
    }
    // the HDMI card: 'auto' (the device that is on) or always one port
    if (b.hdmi === 'auto' || /^[1-8]$/.test(String(b.hdmi))) out.hdmi = String(b.hdmi);
    // the idle screen after 3 or 10 minutes, or off; night mode on or off; the weather's city, or off; the city for the sun's times, or none
    if (['3', '10', 'off'].indexOf(b.idle) >= 0) out.idle = b.idle;
    if (b.night === 'on' || b.night === 'off') out.night = b.night;
    if (b.weather === 'off' || Object.prototype.hasOwnProperty.call(require('./weather').CITIES, b.weather)) out.weather = b.weather;
    if (b.place === 'none' || Object.prototype.hasOwnProperty.call(require('./weather').CITIES, b.place)) out.place = b.place;
    config.update('launcher', c => {
      for (const k of LAUNCHER_KEYS) delete c[k];
      return Object.assign(c, out);
    });
  }

  // what the launcher gets: its settings and the resolved theme, not the secrets (voice, notification token)
  function launcherConfig() {
    const c = config.get();
    delete c.voice;
    delete c.notifyApi;
    delete c.theme;
    const theme = ctx.feature('theme');
    return theme ? Object.assign(c, { theme: theme.resolved() }) : c;
  }

  // LG's own uninstall (what LG's Home does when you delete an app); only apps the TV marks removable, never the ones in KEEP.
  // Resolves [reply, status] for web.json.
  async function uninstall(id) {
    if (!APP_ID.test(id || '')) return [{ error: 'bad id' }, 400];
    const a = (await apps()).find(x => x.id === id);
    if (!a) return [{ error: 'not installed' }, 404];
    if (!a.removable) return [{ error: 'not removable' }, 403];
    const uri = 'luna://com.webos.appInstallService/' + (isDev(a) ? 'dev/remove' : 'remove');
    const r = await luna(uri, { id, subscribe: false }, { wait: 20000 });
    if (r.returnValue === false) return [{ error: r.errorText || 'refused by the TV' }, 502];
    // the app manager lists it for a moment longer: drop it now so Home does not show it again
    if (appCache) appCache = appCache.filter(x => x.id !== id);
    return [{ returnValue: true }, 200];
  }

  async function handle(req, res, u, body) {
    if (u === '/api/apps')
      return web.json(res, { apps: await apps(), config: launcherConfig(), usage: usageScores(), version: ctx.version });
    if (u === '/api/inputs') return web.json(res, await askInputs());
    if (u === '/api/inputs/pin' && req.method === 'POST') return web.json(res, ...(await pin(await body(req))));
    // the TV off completely (a cold start next time, no Wake-on-LAN), not the remote's standby. A TV going down may never answer
    if (u === '/api/power/off' && req.method === 'POST') {
      const r = await luna('luna://com.webos.service.tvpower/power/shutDown', { reason: 'remoteKey' });
      if (r.returnValue === false && r.errorCode !== undefined) return web.json(res, { error: r.errorText || 'refused by the TV' }, 502);
      return web.json(res, { returnValue: true });
    }
    if (u === '/api/foreground') return web.json(res, await luna('luna://com.webos.applicationManager/getForegroundAppInfo', {}));
    if (u === '/api/launch' && req.method === 'POST') {
      const b = await body(req);
      if (!/^[\w.\-]+$/.test(b.id || '')) return web.json(res, { error: 'bad id' }, 400);
      return web.json(res, await luna('luna://com.webos.applicationManager/launch', { id: b.id, params: b.params || {} }));
    }
    if (u === '/api/config' && req.method === 'POST') {
      saveLauncherConfig(await body(req));
      return web.json(res, { returnValue: true });
    }
    if (u === '/api/uninstall' && req.method === 'POST') return web.json(res, ...(await uninstall((await body(req)).id)));
    const m = u.match(/^\/icon\/([\w.\-]+)$/);
    if (m) {
      const a = (await apps()).find(x => x.id === m[1]);
      const f = a && a.icon && path.join(a.folder, a.icon);
      if (!f || !path.resolve(f).startsWith(path.resolve(a.folder)) || !fs.existsSync(f)) return web.notFound(res);
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=3600' });
      return fs.createReadStream(f).pipe(res);
    }
    web.notFound(res);
  }

  return {
    name: 'apps',
    paths: [
      '/api/apps',
      '/api/inputs',
      '/api/inputs/pin',
      '/api/foreground',
      '/api/launch',
      '/api/config',
      '/api/uninstall',
      '/api/power/off',
    ],
    prefix: '/icon/',
    handle,
    start: () => setInterval(pollForeground, 4000),
    apps: installed,
  };
}

module.exports = { create };
