// Updates (updates.js through the manager's API): the stable release or a test build, against a stand-in for the GitHub API.
const fs = require('fs'),
  path = require('path');
const { ok, call, serve, req, memoryConfig, run } = require('./lib');
const { cmp } = req('version');

run(async () => {
  ok(
    cmp('1.5.10', '1.5.9') > 0 && cmp('1.5.3', '1.5.3') === 0 && cmp('1.4.9', '1.5.0') < 0 && cmp('v1.6.0', '1.5.99') > 0,
    'version compare'
  );

  const rel = (tag, ver, fe, body, pre) => ({
    tag_name: tag,
    name: pre ? 'Test build: ' + tag.replace(/^test-/, '') : tag,
    prerelease: !!pre,
    body,
    published_at: '2026-10-23T10:00:00Z',
    assets: [].concat.apply(
      [],
      ['com.cleanyourtv.manager_' + ver + '_all.ipk', 'frontend-' + fe + '.tgz'].map(n => [
        { name: n, browser_download_url: 'http://x/' + n },
        { name: n + '.sha256', browser_download_url: 'http://x/' + n + '.sha256' },
      ])
    ),
  });
  const api = await serve((q, r) => {
    const send = o => {
      r.writeHead(o ? 200 : 404, { 'content-type': 'application/json' });
      r.end(JSON.stringify(o || {}));
    };
    if (q.url === '/repos/o/r/releases/latest') return send(rel('v1.5.3', '1.5.3', '1.4.5', 'stable'));
    if (q.url === '/repos/o/r/releases/tags/test-foo-bar')
      return send(rel('test-foo-bar', '1.5.4', '1.4.6', 'build: abc1234\nbranch: foo/bar', true));
    if (q.url === '/repos/o/r/releases?per_page=40')
      return send([
        rel('test-foo-bar', '1.5.4', '1.4.6', 'build: abc1234\nbranch: foo/bar', true),
        rel('v1.5.3', '1.5.3', '1.4.5', 'stable'),
        rel('test-main', '9.9.9', '9.9.9', 'x', false),
      ]);
    send(null);
  });
  process.env.CYTV_API = api.url;
  const D = process.env.CYTV_DIR;
  fs.writeFileSync(path.join(D, 'source'), 'o/r main\n');
  const manager = req('manager');
  let m; // the service reads its own version when it starts, so each case starts one
  const start = v => {
    m = manager.create({
      version: v,
      config: memoryConfig(),
      luna: async () => ({}),
      feature: () => null,
      inputhook: { status: () => ({}), ensure() {} },
    });
  };
  const ask = (act, method, body) => call(m, '/api/manager/' + act, method, body);
  const bf = path.join(D, 'BUILD');
  start('1.5.2');
  let r = await ask('check', 'POST');
  ok(r.j.service.updateTo === '1.5.3' && r.j.channel === '', 'stable: offers the newer release');
  start('1.5.3');
  r = await ask('check', 'POST');
  ok(r.j.service.updateTo === null, 'stable: nothing to offer at the same version');
  r = await ask('tests', 'GET');
  ok(
    r.j.builds.length === 1 &&
      r.j.builds[0].tag === 'test-foo-bar' &&
      r.j.builds[0].build === 'abc1234' &&
      r.j.builds[0].service === '1.5.4',
    'the list holds pre-releases named test-* only'
  );
  r = await ask('channel', 'POST', { tag: 'test-../x' });
  ok(r.code === 400, 'a bad channel name is refused');
  r = await ask('channel', 'POST', { tag: 'test-foo-bar' });
  ok(
    r.j.channel === 'test-foo-bar' && r.j.service.updateTo === '1.5.4' && r.j.release.test === true,
    'a test channel offers the test build'
  );
  start('1.5.4');
  fs.writeFileSync(bf, 'abc1234\n');
  r = await ask('check', 'POST');
  ok(r.j.service.updateTo === null && r.j.service.build === 'abc1234', 'the same build is not offered again');
  fs.writeFileSync(bf, 'def5678\n');
  r = await ask('check', 'POST');
  ok(r.j.service.updateTo === '1.5.4', 'another commit of the same version is offered');
  r = await ask('channel', 'POST', { tag: '' });
  ok(
    r.j.channel === '' && r.j.service.updateTo === '1.5.3',
    'back on stable after a test build offers the stable release, even an older one'
  );
  fs.unlinkSync(bf);
  start('1.5.3');
  r = await ask('check', 'POST');
  ok(r.j.service.updateTo === null, 'stable without a test build installed: no offer at the same version');
  api.server.close();

  // a connection that drops after the headers ends the update check with an error, never a hang (issue 5)
  const drop = await serve((q, r) => {
    r.writeHead(200, { 'content-type': 'application/json', 'content-length': '100000' });
    r.write('{"tag_name": "v9.9.9", "assets": [');
    setTimeout(() => r.socket.destroy(), 150);
  });
  process.env.CYTV_API = drop.url;
  start('1.5.3');
  const t0 = Date.now();
  r = await ask('check', 'POST');
  ok(
    Date.now() - t0 < 6000 && r.j.checkError && r.j.checking === false,
    'an update check on a connection that drops mid-answer ends with an error (' + r.j.checkError + ')'
  );
  drop.server.close();
});
