#!/usr/bin/env node
// Standalone updater for the CleanYourTV package, run as root by the manager app when the service is not running (for example before
// the setup, or when the setup failed). It does not need the service.
//   node selfupdate.js check      prints {installed, latest, updateTo} as JSON
//   node selfupdate.js install    downloads the latest package, checks its SHA-256, installs it; if the TV is already set up it also
//                                 restarts the service on the new files. Progress lines end with DONE or ERROR.
const fs = require('fs'),
  cp = require('child_process');
const P = require('./paths'),
  luna = require('./luna'),
  updates = require('./updates'),
  { cmp } = require('./version');

const TMP = '/tmp/cytv-self.ipk';
const say = m => console.log(m);
const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {
    return d;
  }
};
const installedVersion = () => {
  try {
    return (/const VERSION = '([^']+)'/.exec(fs.readFileSync(P.SERVICE_DIR + '/helper/helper.js', 'utf8')) || [])[1] || '0';
  } catch (_) {
    return '0';
  }
};
async function latest() {
  const r = await updates.latest(readJson(P.CONF, {}));
  if (!r.service) throw new Error('the latest release has no package with a checksum');
  return r;
}

async function check() {
  const inst = installedVersion();
  try {
    const l = await latest();
    console.log(JSON.stringify({ installed: inst, latest: l.service, updateTo: cmp(l.service, inst) > 0 ? l.service : null }));
  } catch (e) {
    console.log(JSON.stringify({ installed: inst, error: String(e.message || e) }));
  }
}
async function install() {
  try {
    const inst = installedVersion(),
      l = await latest();
    say('installed ' + inst + ', latest ' + l.service);
    if (cmp(l.service, inst) <= 0) return say('DONE already up to date');
    const name = 'com.cleanyourtv.manager_' + l.service + '_all.ipk';
    say('downloading ' + name);
    try {
      await updates.download(l, name, TMP);
    } catch (e) {
      throw new Error(e.message === 'checksum mismatch' ? 'the package does not match its checksum; nothing was installed' : e.message);
    }
    say('installing ' + l.service);
    const r = await luna(
      'luna://com.webos.appInstallService/dev/install',
      { id: 'com.cleanyourtv.manager', ipkUrl: TMP, subscribe: false },
      { timeout: 40000 }
    );
    if (!r.returnValue) throw new Error('the system refused the install');
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      await new Promise(r2 => setTimeout(r2, 3000));
      ok = installedVersion() === l.service && fs.existsSync(P.SERVICE_DIR + '/bootstrap.sh');
    }
    if (!ok) throw new Error('the install did not finish');
    try {
      fs.unlinkSync(TMP);
    } catch (_) {}
    if (fs.existsSync(P.D + '/helper.js') && fs.existsSync(P.INITD + '/10-cleanyourtv-home')) {
      say('restarting the service');
      // a synchronous child: spawnSync keeps its time limit itself (exec.js explains why the asynchronous one does not)
      const out = cp.spawnSync('sh', [P.SERVICE_DIR + '/bootstrap.sh', 'update', l.service], {
        env: P.ENV,
        encoding: 'utf8',
        timeout: 240000,
      });
      say(
        String(out.stdout || '')
          .trim()
          .split('\n')
          .slice(-3)
          .join('\n')
      );
      if (out.status !== 0) throw new Error('the new service did not start; the previous files were restored');
    }
    say('DONE updated to ' + l.service + '. Close CleanYourTV and open it again.');
  } catch (e) {
    say('ERROR ' + String(e.message || e));
    process.exitCode = 1;
  }
}

if (process.argv[2] === 'check') check();
else if (process.argv[2] === 'install') install();
else {
  console.log('usage: node selfupdate.js check|install');
  process.exit(2);
}
