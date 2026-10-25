// netcompat.js: what Node 8 lacks (http.get with an address and options, mkdir -p, URL, randomInt), against a local server.
const fs = require('fs'),
  path = require('path'),
  http = require('http');
const { tmp, ok, serve, req, run } = require('./lib');
const nc = req('netcompat');

run(async () => {
  const s = await serve((q, r) => {
    r.writeHead(200, { 'x-path': q.url, 'x-ua': q.headers['user-agent'] || '' });
    r.end(q.method);
  });
  const g = await new Promise((resolve, reject) =>
    nc
      .get(http, s.url + '/a/b?x=1#h', { headers: { 'User-Agent': 't' }, timeout: 3000 }, r => {
        let b = '';
        r.on('data', c => (b += c));
        r.on('end', () => resolve({ r, b }));
      })
      .on('error', reject)
  );
  ok(g.r.headers['x-path'] === '/a/b?x=1' && g.r.headers['x-ua'] === 't' && g.b === 'GET', 'http get with an address and options');
  s.server.close();
  const d = path.join(tmp, 'a', 'b', 'c');
  nc.mkdirp(d);
  nc.mkdirp(d);
  ok(fs.existsSync(d), 'mkdir -p');
  ok(
    new nc.URLSearchParams('a=1&b=x').get('b') === 'x' && new nc.URL('http://h/p?q=1').searchParams.get('q') === '1',
    'URL and URLSearchParams'
  );
  let lo = 1e9,
    hi = -1,
    all = true;
  for (let i = 0; i < 3000; i++) {
    const n = nc.randomInt(100000, 1000000);
    if (n < 100000 || n >= 1000000 || n !== Math.floor(n)) all = false;
    lo = Math.min(lo, n);
    hi = Math.max(hi, n);
  }
  ok(all && hi - lo > 800000, 'randomInt stays in range and spreads');
  const dice = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6000; i++) dice[nc.randomInt(0, 6)]++;
  ok(
    dice.every(c => c > 800 && c < 1200),
    'randomInt is evenly spread'
  );
});
