// The release files (ipk/build.py, built into a temporary folder): what the TV gets, and what it must not get.
const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  cp = require('child_process');
const { root, tmp, ok, run } = require('./lib');

// the file names in a .tar.gz
function tarNames(buf) {
  const t = zlib.gunzipSync(buf),
    out = [];
  for (let o = 0; o + 512 <= t.length; ) {
    const name = t.toString('utf8', o, o + 100).replace(/\0.*$/, '');
    if (!name) break;
    const size = parseInt(
      t
        .toString('utf8', o + 124, o + 136)
        .replace(/\0.*$/, '')
        .trim() || '0',
      8
    );
    out.push(name.replace(/^\.\//, ''));
    o += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}
// the members of an .ipk (an ar archive)
function arMembers(buf) {
  const out = {};
  for (let o = 8; o + 60 <= buf.length; ) {
    const name = buf
        .toString('utf8', o, o + 16)
        .trim()
        .replace(/\/$/, ''),
      size = parseInt(buf.toString('utf8', o + 48, o + 58).trim(), 10);
    out[name] = buf.slice(o + 60, o + 60 + size);
    o += 60 + size + (size % 2);
  }
  return out;
}

run(async () => {
  if (cp.spawnSync('python3', ['--version']).status !== 0) return ok(true, 'skipped: python3 is not installed');
  const dist = path.join(tmp, 'dist');
  const b = cp.spawnSync('python3', [path.join(root, 'ipk', 'build.py')], {
    cwd: root,
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CYTV_DIST: dist }),
  });
  ok(b.status === 0, 'the package builds' + (b.status ? ': ' + b.stderr : ''));
  if (b.status) return;
  const files = fs.readdirSync(dist);
  const fe = files.filter(f => /^frontend-.*\.tgz$/.test(f))[0],
    ipk = files.filter(f => /\.ipk$/.test(f))[0];
  ok(
    fe && ipk && files.indexOf(fe + '.sha256') >= 0 && files.indexOf(ipk + '.sha256') >= 0,
    'the launcher, the package and their .sha256 files'
  );
  const feNames = tarNames(fs.readFileSync(path.join(dist, fe)));
  ok(feNames.indexOf('app/index.html') >= 0 && feNames.indexOf('app/version.json') >= 0, 'the launcher download holds the built page');
  ok(!feNames.some(n => /^app\/src\//.test(n)), "the launcher's source files are not shipped (they are built into index.html)");
  ok(
    ['app/scene-lac.jpg', 'app/font-manrope.woff2', 'app/font-manrope-OFL.txt'].every(n => feNames.indexOf(n) >= 0) &&
      !feNames.some(n => /^app\/[^/]+\/./.test(n) && !/^app\/src\//.test(n)),
    'the background, the font and its licence ship in the launcher, as files directly in app/ (stage-home.sh copies app/* without folders)'
  );
  const data = tarNames(arMembers(fs.readFileSync(path.join(dist, ipk)))['data.tar.gz']);
  const svc = data.filter(n => /services\/com\.cleanyourtv\.manager\.service\//.test(n));
  ok(
    svc.some(n => /\/helper\/helper\.js$/.test(n)) &&
      svc.some(n => /\/helper\/tvprofile\.js$/.test(n)) &&
      svc.some(n => /\/bootstrap\.sh$/.test(n)),
    'the package holds the service and the setup'
  );
  ok(
    !data.some(n => /payload\/app\/src\//.test(n)),
    "the package's launcher has no source files either (the setup warned: omitting directory)"
  );
  ok(!data.some(n => /node_modules|\.lint-pages|\/tools\//.test(n)), 'no development files in the package');
  // the manager's launcher update reloads Home the way that also works on webOS 6 (issue 9)
  const upd = fs.readFileSync(path.join(root, 'helper', 'updates.js'), 'utf8');
  ok(
    /reload-home\.sh/.test(upd) && !/pkill -f "\[a\]pp-id=com\.webos\.app\.home"/.test(upd),
    'a launcher update reloads Home with reload-home.sh (webOS 6 restarts webapp-mgr)'
  );
});
