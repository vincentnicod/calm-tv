// The VPN (Customise > VPN): the TV's internet traffic through a WireGuard server (a provider's config file, such as Proton VPN's). The
// tunnel is run by wireguard-go and set up by scripts/vpn.sh (routes, DNS, kill switch); this part keeps the servers, gives the tunnel
// its keys over wireguard-go's control socket, keeps it up, and pauses it while an app chosen by the viewer is open (a TV app that wants
// a Swiss address, say). Off until the viewer turns it on.
//   GET  /api/vpn                          {on, kill, server, servers: [{id, name, cc}], pauseFor, state, handshake, rx, tx, error,
//                                          paused, pairing}; state: none | off | starting | connected | waiting | paused | error
//   POST /api/vpn {on, kill, server}        any of them
//   POST /api/vpn/pause-for {id, on}        pause the VPN while this app is in front
//   POST /api/vpn/remove {id}               forget a server (its file is deleted)
//   POST /api/vpn/pair                      a short-lived page on the home network to add a server's config file from a phone or computer
// The config files hold the private key: they are kept in vpn/ (root only) and never logged or put in a report.
const fs = require('fs'),
  net = require('net'),
  dns = require('dns'),
  http = require('http'),
  path = require('path');
const nc = require('./netcompat'),
  { URLSearchParams } = nc;
const P = require('./paths'),
  exec = require('./exec'),
  web = require('./web');

const DIR = P.VPN,
  LIST = DIR + '/servers.json',
  SCRIPT = process.env.CYTV_VPN_SH || P.D + '/vpn.sh',
  SOCK = process.env.CYTV_VPN_SOCK || '/var/run/wireguard/cytv0.sock';
const PAIR_PORT = 8770,
  PAIR_MS = 10 * 60 * 1000,
  CHECK_MS = 30 * 1000,
  FRESH_S = 180; // WireGuard renews its session every 2 minutes while traffic flows: a handshake older than this means no answer
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/,
  APP = /^[\w.\-]{1,100}$/,
  IP4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  HOST = /^[a-z0-9]([a-z0-9-]{0,62}\.)*[a-z0-9-]{1,63}$/i;

const ip4 = s => {
  const m = IP4.exec(s || '');
  return !!m && m.slice(1).every(n => +n <= 255);
};
// a WireGuard key (base64, 32 bytes) as the hex the control socket wants
function key(s, what) {
  const b = Buffer.from(String(s || '').trim(), 'base64');
  if (b.length !== 32 || !/^[A-Za-z0-9+/]{43}=$/.test(String(s || '').trim())) throw new Error('the ' + what + ' is not a WireGuard key');
  return b.toString('hex');
}
// A WireGuard config file ([Interface] and one [Peer]) -> what the tunnel needs. Only a tunnel for all traffic (AllowedIPs 0.0.0.0/0) is
// taken: that is what a VPN provider's file is, and the routes are made for it.
function parse(text) {
  const sec = { interface: {}, peer: {} };
  let cur = null,
    peers = 0;
  String(text || '')
    .split(/\r?\n/)
    .forEach(line => {
      const l = line.replace(/[#;].*$/, '').trim();
      if (!l) return;
      const h = /^\[(\w+)\]$/.exec(l);
      if (h) {
        cur = h[1].toLowerCase();
        if (cur === 'peer') peers++;
        return;
      }
      const kv = /^(\w+)\s*=\s*(.*)$/.exec(l);
      if (kv && cur && sec[cur] && peers <= 1) sec[cur][kv[1].toLowerCase()] = kv[2].trim();
    });
  const i = sec.interface,
    p = sec.peer;
  if (!i.privatekey) throw new Error('no [Interface] with a PrivateKey: is this a WireGuard config file?');
  if (!p.publickey) throw new Error('no [Peer] with a PublicKey');
  if (peers > 1) throw new Error('the file has more than one server ([Peer]); take a file for one server');
  const list = s =>
    (s || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  const addr = list(i.address).filter(a => /^[\d.]+\/\d{1,2}$/.test(a) && ip4(a.split('/')[0]))[0];
  if (!addr) throw new Error('no IPv4 Address in [Interface]');
  const dnsIp = list(i.dns).filter(ip4)[0] || '';
  const allowed = list(p.allowedips);
  if (allowed.indexOf('0.0.0.0/0') < 0) throw new Error('only a VPN for all traffic is supported (AllowedIPs = 0.0.0.0/0)');
  const ep = /^(?:\[([^\]]+)\]|([^:]+)):(\d{1,5})$/.exec(p.endpoint || '');
  if (!ep || (ep[1] && !ip4(ep[1]))) throw new Error('no IPv4 Endpoint (host:port) in [Peer]');
  const host = ep[1] || ep[2],
    port = +ep[3];
  if (!(port > 0 && port < 65536) || !(ip4(host) || HOST.test(host))) throw new Error('the Endpoint is not a host and port');
  const mtu = parseInt(i.mtu, 10);
  return {
    privateKey: key(i.privatekey, 'PrivateKey'),
    publicKey: key(p.publickey, 'PublicKey'),
    presharedKey: p.presharedkey ? key(p.presharedkey, 'PresharedKey') : '',
    address: addr,
    dns: dnsIp,
    mtu: mtu >= 1280 && mtu <= 1500 ? mtu : 1420,
    host,
    port,
    keepalive: Math.min(Math.max(parseInt(p.persistentkeepalive, 10) || 25, 10), 120),
  };
}
// A name for the list from the file name or the text the viewer gave (Proton's look like "TV-CH-12" or "wg-CH-ZH-12"), and the country
// code in it, if any.
function naming(name) {
  const n = String(name || '')
    .replace(/\.conf$/i, '')
    .replace(/[^\w .#+-]/g, '')
    .trim()
    .slice(0, 40);
  // the first two-letter part ("CH" in TV-CH-12, CH#12 or CH12), not a device word the viewer gave the key
  const cc =
    n
      .split(/[-_ #]+/)
      .map(p => (/^([A-Z]{2})\d*$/.exec(p) || [])[1])
      .filter(p => p && ['TV', 'WG', 'PC', 'LG'].indexOf(p) < 0)[0] || '';
  return { name: n || 'VPN server', cc };
}

// the text protocol of wireguard-go's control socket (the cross-platform userspace API documented by WireGuard)
function uapi(req, sock) {
  return new Promise((resolve, reject) => {
    const s = net.connect(sock || SOCK);
    let out = '';
    const t = setTimeout(() => {
      s.destroy();
      reject(new Error('the tunnel did not answer'));
    }, 5000);
    s.on('data', d => {
      out += d;
      if (/\n\n$/.test(out)) s.end();
    });
    s.on('error', e => {
      clearTimeout(t);
      reject(e);
    });
    s.on('close', () => {
      clearTimeout(t);
      const o = {};
      out.split('\n').forEach(l => {
        const i = l.indexOf('=');
        if (i > 0) o[l.slice(0, i)] = l.slice(i + 1);
      });
      if (o.errno && o.errno !== '0') return reject(new Error('the tunnel refused the settings (errno ' + o.errno + ')'));
      resolve(o);
    });
    s.write(req + '\n\n');
  });
}
const setRequest = (c, ip) =>
  [
    'set=1',
    'private_key=' + c.privateKey,
    'replace_peers=true',
    'public_key=' + c.publicKey,
    c.presharedKey ? 'preshared_key=' + c.presharedKey : '',
    'endpoint=' + ip + ':' + c.port,
    'persistent_keepalive_interval=' + c.keepalive,
    'replace_allowed_ips=true',
    'allowed_ip=0.0.0.0/0',
  ]
    .filter(Boolean)
    .join('\n');

function create(ctx) {
  const config = ctx.config,
    run = ctx.run || exec.run,
    sock = ctx.socket || SOCK,
    lookup = ctx.lookup || ((h, cb) => dns.lookup(h, { family: 4 }, cb)),
    log = ctx.log || (m => console.log(m));
  try {
    nc.mkdirp(DIR);
    fs.chmodSync(DIR, 0o700);
  } catch (_) {}
  const settings = () => {
    const v = config.get().vpn || {};
    return {
      on: v.on === true,
      kill: v.kill === true,
      server: typeof v.server === 'string' ? v.server : '',
      pauseFor: Array.isArray(v.pauseFor) ? v.pauseFor.filter(a => typeof a === 'string' && APP.test(a)).slice(0, 20) : [],
    };
  };
  const servers = () => {
    try {
      const l = JSON.parse(fs.readFileSync(LIST, 'utf8'));
      return Array.isArray(l) ? l.filter(s => s && ID.test(s.id)) : [];
    } catch (_) {
      return [];
    }
  };
  const saveList = l => {
    fs.writeFileSync(LIST + '.tmp', JSON.stringify(l), { mode: 0o600 });
    fs.renameSync(LIST + '.tmp', LIST);
  };
  const confFile = id => path.join(DIR, id + '.conf');

  // what the tunnel is doing: up (the server and address it was given), paused (the app in front), the last error
  let up = null,
    paused = '',
    error = '',
    starting = false,
    clean = false, // down was run since the last start: nothing to take down
    busy = Promise.resolve(),
    timer = null;
  const script = async (args, ms) => {
    const r = await run('/bin/sh', [SCRIPT].concat(args), { timeout: ms || 20000 });
    if (!r.ok) throw new Error((r.err || r.out || r.error || 'vpn.sh ' + args[0] + ' failed').trim().split('\n').pop());
    return r.out;
  };
  const resolveHost = h =>
    ip4(h)
      ? Promise.resolve(h)
      : new Promise((ok, no) => lookup(h, (e, a) => (e || !ip4(a) ? no(new Error('the server ' + h + ' was not found')) : ok(a))));

  async function bringUp(id) {
    const c = parse(fs.readFileSync(confFile(id), 'utf8'));
    const ip = await resolveHost(c.host);
    const k = settings().kill ? '1' : '0';
    clean = false;
    await script(['start']);
    await uapi(setRequest(c, ip), sock);
    await script(['net', c.address, ip, String(c.port), c.dns, String(c.mtu), k]);
    up = { id, ip, port: c.port, kill: k };
  }
  async function bringDown() {
    await script(['down']);
    up = null;
    clean = true;
  }
  // Make the tunnel what the settings and the app in front ask for. One change at a time; a failure is kept for the launcher to show and
  // leaves nothing half-done (the routes go with the tunnel).
  function apply() {
    busy = busy.then(async () => {
      const s = settings(),
        want = s.on && s.server && servers().some(x => x.id === s.server) && !paused;
      try {
        if (want && (!up || up.id !== s.server || up.kill !== (s.kill ? '1' : '0'))) {
          starting = true;
          await bringUp(s.server);
          error = '';
          log('vpn: up (' + s.server + ')');
        } else if (!want && (up || !clean)) {
          if (up) log('vpn: down' + (paused ? ' while ' + paused + ' is open' : ''));
          await bringDown();
          if (!s.on) error = '';
        }
      } catch (e) {
        error = String(e.message || e);
        log('vpn: ' + error);
        try {
          await bringDown();
        } catch (_) {}
      }
      starting = false;
    });
    return busy;
  }
  // every half minute while it is on: a stopped wireguard-go is started again, and routes the network manager dropped are put back
  async function keep() {
    if (!up) return settings().on && !paused && !starting ? apply() : undefined;
    const st = await run('/bin/sh', [SCRIPT, 'status'], { timeout: 10000 });
    if (!/process=1 tunnel=1/.test(st.out)) {
      log('vpn: the tunnel stopped; starting it again');
      up = null;
      return apply();
    }
    await run('/bin/sh', [SCRIPT, 'check', up.ip], { timeout: 15000 });
  }
  async function readings() {
    if (!up) return {};
    try {
      const o = await uapi('get=1', sock);
      const hs = +o.last_handshake_time_sec || 0;
      return { handshake: hs ? Math.max(0, Math.round(Date.now() / 1000 - hs)) : -1, rx: +o.rx_bytes || 0, tx: +o.tx_bytes || 0 };
    } catch (_) {
      return { handshake: -1 };
    }
  }
  async function status() {
    const s = settings(),
      list = servers(),
      r = await readings();
    let state = 'off';
    if (!list.length) state = 'none';
    else if (paused && s.on) state = 'paused';
    else if (starting) state = 'starting';
    else if (error && s.on) state = 'error';
    else if (up) state = r.handshake >= 0 && r.handshake <= FRESH_S ? 'connected' : 'waiting';
    return Object.assign(
      {
        on: s.on,
        kill: s.kill,
        server: s.server,
        servers: list.map(x => ({ id: x.id, name: x.name, cc: x.cc })),
        pauseFor: s.pauseFor,
        state,
        error,
        paused,
        pairing: pair ? { url: pair.url, code: pair.code } : null,
      },
      r
    );
  }

  function addServer(text, name) {
    parse(text); // refused before anything is kept
    const nm = naming(name),
      list = servers();
    let base =
        nm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 30) || 'server',
      id = base,
      n = 2;
    while (list.some(x => x.id === id)) id = base + '-' + n++;
    fs.writeFileSync(confFile(id), String(text), { mode: 0o600 });
    list.push({ id, name: nm.name, cc: nm.cc, added: Date.now() });
    saveList(list);
    config.update('vpn', c => {
      c.vpn = Object.assign({}, c.vpn);
      if (!c.vpn.server) c.vpn.server = id; // the first server is the one used
    });
    log('vpn: server added (' + id + ')');
    return id;
  }
  function removeServer(id) {
    const list = servers();
    if (!list.some(x => x.id === id)) return false;
    saveList(list.filter(x => x.id !== id));
    try {
      fs.unlinkSync(confFile(id));
    } catch (_) {}
    config.update('vpn', c => {
      c.vpn = Object.assign({}, c.vpn);
      if (c.vpn.server === id) {
        const next = servers()[0];
        c.vpn.server = next ? next.id : '';
        if (!next) c.vpn.on = false;
      }
    });
    log('vpn: server removed (' + id + ')');
    return true;
  }

  // ---- the app in front: the VPN pauses while one of the chosen apps is open, and comes back when another one is ----
  // our own overlays (the Inputs list, notifications, quick settings) come in front of the app for a moment: they change nothing
  function foreground(id) {
    if (!id || /^com\.cleanyourtv\./.test(id)) return;
    const s = settings();
    const next = s.on && s.pauseFor.indexOf(id) >= 0 ? id : '';
    if (next === paused) return;
    paused = next;
    apply();
  }

  // ---- the page to add a server from a phone (home network, short-lived, needs the code shown on the TV), as for Live TV ----
  let pair = null;
  const page = (msg, done) => `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>VPN setup</title>
<style>body{font:18px system-ui,sans-serif;background:#111;color:#eee;max-width:560px;margin:40px auto;padding:0 18px}input,textarea,button{font:inherit;width:100%;box-sizing:border-box;padding:12px;margin:6px 0 14px;border-radius:10px;border:1px solid #444;background:#1b1b1b;color:#eee}textarea{height:9em;font:13px ui-monospace,monospace}button{background:#f5f6f8;color:#111;font-weight:600;border:0}.m{padding:12px;border-radius:10px;background:${done ? '#14361f' : '#3a1717'}}small{color:#999}</style>
<h2>VPN setup</h2>${msg ? `<p class=m>${web.esc(msg)}</p>` : ''}${
    done
      ? ''
      : `<p><small>Proton VPN: account.proton.me &rsaquo; Downloads &rsaquo; WireGuard configuration. Choose a server, platform "Router" or "Linux",
then download the file. Any WireGuard file for all traffic works.</small></p>
<form method=post action=/add>
<label>Code shown on the TV</label><input name=code inputmode=numeric autocomplete=off required>
<label>WireGuard file (.conf)</label><input type=file accept=".conf,text/plain" id=f>
<label>or its text</label><textarea name=conf id=t placeholder="[Interface]&#10;PrivateKey = ..." required></textarea>
<label>Name on the TV</label><input name=name id=n placeholder="e.g. Switzerland" maxlength=40>
<button>Add</button></form>
<script>document.getElementById('f').onchange=function(){var x=this.files[0];if(!x)return;var r=new FileReader();r.onload=function(){document.getElementById('t').value=r.result;var n=document.getElementById('n');if(!n.value)n.value=x.name.replace(/\\.conf$/i,'')};r.readAsText(x)}</script>`
  }`;
  function startPairing() {
    stopPairing();
    const code = String(nc.randomInt(100000, 1000000));
    let bad = 0;
    const srv = http.createServer((req, res) => {
      const send = (c, html) => {
        res.writeHead(c, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
      };
      if (req.method === 'GET') return send(200, page('', false));
      if (req.method !== 'POST' || req.url !== '/add') return send(404, page('Not found', false));
      let b = '';
      req.on('data', c => {
        b += c;
        if (b.length > 32768) req.destroy();
      });
      req.on('end', () => {
        const f = new URLSearchParams(b);
        if (f.get('code') !== code) {
          if (++bad >= 5) stopPairing();
          return send(403, page('Wrong code.', false));
        }
        try {
          addServer(f.get('conf') || '', f.get('name') || '');
        } catch (e) {
          return send(400, page(String(e.message || e), false));
        }
        send(200, page('Added. Turn the VPN on in Customise > VPN on the TV; you can close this page.', true));
        setTimeout(stopPairing, 2000);
      });
    });
    srv.on('error', () => {
      pair = null;
    });
    srv.listen(PAIR_PORT, '0.0.0.0');
    pair = { code, srv, url: 'http://' + web.lanIp() + ':' + PAIR_PORT, timer: setTimeout(stopPairing, PAIR_MS) };
    return { url: pair.url, code, seconds: PAIR_MS / 1000 };
  }
  function stopPairing() {
    if (!pair) return;
    clearTimeout(pair.timer);
    try {
      pair.srv.close();
    } catch (_) {}
    pair = null;
  }

  async function handle(req, res, u, body) {
    if (u === '/api/vpn' && req.method === 'GET') return web.json(res, await status());
    if (req.method !== 'POST') return web.notFound(res);
    const b = await body(req);
    if (u === '/api/vpn') {
      const list = servers();
      if (b.server !== undefined && !list.some(x => x.id === b.server)) return web.json(res, { error: 'no such server' }, 404);
      if (b.on === true && !list.length) return web.json(res, { error: 'add a server first' }, 409);
      config.update('launcher', c => {
        c.vpn = Object.assign({}, c.vpn);
        if (typeof b.on === 'boolean') c.vpn.on = b.on;
        if (typeof b.kill === 'boolean') c.vpn.kill = b.kill;
        if (typeof b.server === 'string') c.vpn.server = b.server;
        if (!list.some(x => x.id === c.vpn.server)) c.vpn.server = list.length ? list[0].id : '';
      });
      if (typeof b.on === 'boolean') log('vpn: turned ' + (b.on ? 'on' : 'off') + ' (launcher)');
      if (b.on === false) paused = '';
      await apply();
      return web.json(res, await status());
    }
    if (u === '/api/vpn/pause-for') {
      if (typeof b.id !== 'string' || !APP.test(b.id)) return web.json(res, { error: 'bad app id' }, 400);
      config.update('launcher', c => {
        c.vpn = Object.assign({}, c.vpn);
        const l = (Array.isArray(c.vpn.pauseFor) ? c.vpn.pauseFor : []).filter(a => a !== b.id);
        if (b.on === true) l.push(b.id);
        c.vpn.pauseFor = l.slice(-20);
      });
      return web.json(res, { returnValue: true, pauseFor: settings().pauseFor });
    }
    if (u === '/api/vpn/remove') {
      if (typeof b.id !== 'string' || !ID.test(b.id) || !removeServer(b.id)) return web.json(res, { error: 'no such server' }, 404);
      await apply();
      return web.json(res, await status());
    }
    if (u === '/api/vpn/pair') return web.json(res, startPairing());
    if (u === '/api/vpn/pair/stop') {
      stopPairing();
      return web.json(res, { returnValue: true });
    }
    web.notFound(res);
  }
  function start() {
    const a = ctx.feature && ctx.feature('apps');
    if (a && a.watchForeground) a.watchForeground(foreground);
    if (settings().on) apply();
    timer = setInterval(() => {
      keep().catch(() => {});
    }, CHECK_MS);
    if (timer.unref) timer.unref();
  }
  return {
    name: 'vpn',
    paths: ['/api/vpn', '/api/vpn/pause-for', '/api/vpn/remove', '/api/vpn/pair', '/api/vpn/pair/stop'],
    handle,
    start,
    status,
    apply,
    keep,
    foreground,
    addServer,
    stop: () => clearInterval(timer),
  };
}

module.exports = { create, parse, naming, setRequest, uapi };
