// Small helpers for the HTTP handlers of the service.
// json(res, object, status): a JSON reply
function json(res, o, code) {
  res.writeHead(code || 200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(o));
}
// the request body as JSON ({} when it is empty or not JSON); at most `max` bytes (default 1 MB), the rest is dropped
function body(req, max) {
  const limit = max || 1 << 20;
  return new Promise(resolve => {
    let b = '',
      big = false;
    req.on('data', c => {
      if (big) return;
      b += c;
      if (b.length > limit) big = true;
    });
    req.on('end', () => {
      if (big) return resolve({});
      try {
        resolve(JSON.parse(b || '{}'));
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}
const notFound = res => {
  res.writeHead(404);
  res.end();
};
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// the TV's address on the local network (for the short-lived pages: Live TV pairing, the notification token, Share log)
function lanIp() {
  const n = require('os').networkInterfaces();
  for (const k of Object.keys(n)) for (const a of n[k]) if (a.family === 'IPv4' && !a.internal) return a.address;
  return '';
}
module.exports = { json, body, notFound, esc, lanIp };
