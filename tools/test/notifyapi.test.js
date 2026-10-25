// Notifications from the network (notifyapi.js): the token, and the short-lived page behind the manager's QR code.
const http = require('http');
const { ok, serve, req, memoryConfig, run } = require('./lib');
const nc = req('netcompat');

run(async () => {
  const free = await serve(() => {});
  const port = +free.url.split(':').pop();
  free.server.close();
  const conf = memoryConfig({ notifyApi: { enabled: false, port, token: '', allow: [] } });
  const napi = req('notifyapi').create({ notify: { handle: async () => {} }, config: conf });
  let info = napi.set({ page: true });
  ok(!info.pageUrl, 'no token page while notifications are off');
  info = napi.set({ enabled: true });
  ok(info.enabled && info.token.length >= 32 && info.listening, 'notifications on: a token is made and the listener runs');
  ok(conf.get().notifyApi.token === info.token, 'the token is saved in the settings');
  const get = p =>
    new Promise(res => {
      const rq = nc.get(http, 'http://127.0.0.1:' + port + p, { timeout: 4000 }, rs => {
        let b = '';
        rs.on('data', c => (b += c));
        rs.on('end', () => res({ code: rs.statusCode, body: b, type: rs.headers['content-type'] }));
      });
      rq.on('error', e => res({ code: 0, body: String(e) }));
    });
  process.env.CYTV_NOTIFY_PAGE_MS = '1500';
  info = napi.set({ page: true });
  const pagePath = info.pageUrl.replace(/^http:\/\/[^/]+/, '');
  ok(
    /^http:\/\/.*:\d+\/t\/[0-9a-f]{24}$/.test(info.pageUrl) && (info.pageSeconds === 2 || info.pageSeconds === 1),
    'the QR code points at a page with a random address'
  );
  let pg = await get(pagePath);
  ok(
    pg.code === 200 && /text\/html/.test(pg.type) && pg.body.indexOf(info.token) >= 0 && /Authorization: Bearer /.test(pg.body),
    'the page shows the address and the token'
  );
  ok(!/<script src|http:\/\/[^"' ]+\.js/.test(pg.body) && pg.body.indexOf('<') >= 0, 'the page is self-contained');
  pg = await get('/t/' + '0'.repeat(24));
  ok(pg.code === 401, 'a wrong page address is treated like a wrong token');
  pg = await get('/notify');
  ok(pg.code === 401, 'the notification address itself still needs the token');
  await new Promise(r => setTimeout(r, 1700));
  pg = await get(pagePath);
  ok(pg.code === 401, 'the page stops working after its time');
  info = napi.set({ page: true });
  conf.update('test', c => {
    c.notifyApi.allow = ['10.0.0.0/24'];
  });
  pg = await get('/t/' + info.pageUrl.split('/t/')[1]);
  ok(pg.code === 403, 'the allow list applies to the page too');
  napi.set({ enabled: false });
});
