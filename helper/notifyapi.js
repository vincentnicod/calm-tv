// Picture notifications from the local network: POST /notify with "Authorization: Bearer <token>" on a port of the TV
// (default 8767). Off until switched on in the manager app. It exposes the notification call only, nothing else of the
// service. Wrong tokens lock an address out for ten minutes; an optional "allow" list in config.json restricts addresses.
const http = require('http'),
  crypto = require('crypto');
const web = require('./web');
const DEFAULTS = { enabled: false, port: 8767, token: '', allow: [] };
const MAX_BODY = 32 * 1024,
  PER_MINUTE = 20;
const pageMs = () => +process.env.CYTV_NOTIFY_PAGE_MS || 10 * 60 * 1000; // how long the page behind the QR code works
const esc = web.esc,
  lanIp = web.lanIp;

function create(ctx) {
  const { config } = ctx;
  const notify = ctx.notify || ctx.feature('notify');
  let srv = null,
    port = 0,
    tokenPage = null; // tokenPage: { path, until }, a page that shows the token, for a phone that scans the QR code in the manager
  const fails = new Map(),
    hits = new Map();
  const cfg = () => Object.assign({}, DEFAULTS, config.get().notifyApi || {});
  const save = n =>
    config.update('notifications', c => {
      c.notifyApi = n;
    });
  const ipOk = (ip, allow) =>
    allow.some(a => {
      // exact address or a /8, /16, /24 prefix such as 192.168.1.0/24
      const m = /^(\d+\.\d+\.\d+\.\d+)(?:\/(8|16|24))?$/.exec(String(a));
      if (!m) return false;
      if (!m[2]) return ip === m[1];
      const k = Number(m[2]) / 8;
      return ip.split('.').slice(0, k).join('.') === m[1].split('.').slice(0, k).join('.');
    });
  const stop = () => {
    if (srv) {
      try {
        srv.close();
      } catch (_) {}
      srv = null;
      port = 0;
    }
    tokenPage = null;
  };

  function handler(req, res) {
    const ip = (req.socket.remoteAddress || '').replace('::ffff:', '');
    const send = (c, o) => {
      res.writeHead(c, { 'content-type': 'application/json' });
      res.end(JSON.stringify(o));
    };
    const n = cfg();
    if (n.allow.length && !ipOk(ip, n.allow)) return send(403, { error: 'address not allowed' });
    // the page behind the QR code: GET /t/<random>, valid for ten minutes, shows the address and the token
    if (req.method === 'GET' && tokenPage && Date.now() < tokenPage.until && req.url.split('?')[0] === '/t/' + tokenPage.path) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(tokenHtml(n, lanIp()));
    }
    const now = Date.now(),
      f = fails.get(ip) || { n: 0, t: now };
    if (now - f.t > 600000) {
      f.n = 0;
      f.t = now;
    }
    if (f.n >= 10) return send(429, { error: 'too many wrong tokens; wait ten minutes' });
    const h = String(req.headers.authorization || ''),
      tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    const a = Buffer.from(tok),
      b = Buffer.from(n.token || '');
    if (!n.token || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      f.n++;
      fails.set(ip, f);
      return send(401, { error: 'bad or missing token' });
    }
    const r = hits.get(ip) || { n: 0, t: now };
    if (now - r.t > 60000) {
      r.n = 0;
      r.t = now;
    }
    r.n++;
    hits.set(ip, r);
    if (r.n > PER_MINUTE) return send(429, { error: 'too many notifications; at most ' + PER_MINUTE + ' a minute' });
    if (req.method !== 'POST' || req.url.split('?')[0] !== '/notify') return send(404, { error: 'POST /notify with a JSON body' });
    let body = '',
      big = false;
    req.on('data', c => {
      body += c;
      if (body.length > MAX_BODY) {
        big = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (big) return;
      let parsed;
      try {
        parsed = JSON.parse(body || '{}');
      } catch (_) {
        return send(400, { error: 'the body must be JSON' });
      }
      req.url = '/api/notify';
      notify.handle(req, res, '/api/notify', () => Promise.resolve(parsed)).catch(e => send(500, { error: String(e.message || e) }));
    });
  }
  function tokenHtml(n, ip) {
    const addr = 'http://' + ip + ':' + n.port + '/notify',
      t = esc(n.token),
      a = esc(addr);
    return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>CleanYourTV notifications</title>
<style>:root{color-scheme:light dark}*{box-sizing:border-box}body{font:18px/1.45 system-ui,sans-serif;max-width:640px;margin:28px auto;padding:0 18px}h1{font-size:24px;margin:0 0 4px}small,p{color:#777}
.box{border:1px solid #8884;border-radius:12px;padding:12px 14px;margin:6px 0 14px;word-break:break-all;font:16px/1.4 ui-monospace,Menlo,monospace;user-select:all}button{font:inherit;padding:8px 14px;border-radius:10px;border:1px solid #8886;background:#8882;color:inherit}
label{display:block;margin-top:16px;font-weight:600}</style>
<h1>CleanYourTV notifications</h1><p>Your TV accepts picture notifications at this address. The token is a secret: anyone who has it can show cards on the TV.</p>
<label>Address (POST)</label><div class=box id=a>${a}</div><button onclick="cp('a')">Copy</button>
<label>Token</label><div class=box id=t>${t}</div><button onclick="cp('t')">Copy</button>
<label>Header to send</label><div class=box id=h>Authorization: Bearer ${t}</div><button onclick="cp('h')">Copy</button>
<p><small>This page works for ten minutes after the code was shown on the TV. Send a POST with a JSON body such as {"title":"Front door","text":"Someone is at the door","seconds":15}.</small></p>
<script>function cp(i){var e=document.getElementById(i),r=document.createRange();r.selectNodeContents(e);var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy')}catch(x){}}</script>`;
  }
  function start(p) {
    srv = http.createServer(handler);
    srv.setTimeout(10000);
    srv.on('error', e => {
      console.error('notification api:', e.message);
      srv = null;
      port = 0;
    });
    srv.listen(p, '0.0.0.0');
    port = p;
  }
  // make the listener match the settings: call at start and after every change
  function sync() {
    const n = cfg();
    if (!n.enabled) return stop();
    if (!n.token) {
      n.token = crypto.randomBytes(24).toString('hex');
      save(n);
    }
    if (srv && port === n.port) return;
    stop();
    start(n.port);
  }
  const info = () => {
    const n = cfg();
    return { enabled: !!n.enabled, port: n.port, token: n.token, ip: lanIp(), allow: n.allow, listening: !!srv };
  };
  function set(o) {
    const n = cfg();
    if (typeof o.enabled === 'boolean') n.enabled = o.enabled;
    if (o.regenerate || (n.enabled && !n.token)) n.token = crypto.randomBytes(24).toString('hex');
    save(n);
    sync();
    if (o.page && n.enabled && srv) {
      tokenPage = { path: crypto.randomBytes(12).toString('hex'), until: Date.now() + pageMs() };
      return Object.assign(info(), {
        pageUrl: 'http://' + lanIp() + ':' + n.port + '/t/' + tokenPage.path,
        pageSeconds: Math.round(pageMs() / 1000),
      });
    }
    return info();
  }
  return { name: 'notifyapi', start: sync, sync, info, set };
}
module.exports = { create };
