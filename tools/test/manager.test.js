// The manager's options and keys (manager.js, inputkey.js, config.js): what is stored, what is logged, and how the Input key follows.
const fs = require('fs'),
  path = require('path');
const { ok, call, req, run } = require('./lib');
const config = req('config');

run(async () => {
  const lines = [];
  const conf = config.memory({}, l => lines.push(l));
  let ensured = 0,
    keyOn = null,
    mode = 'overlay',
    synced = 0;
  const inputkey = {
    mode: () => (conf.get().picker || {}).mode || mode,
    on: () => conf.options().inputKey && mode !== 'released',
    syncMode: () => synced++,
    pickerShownAt: () => 0,
  };
  const features = { inputkey };
  const m = req('manager').create({
    version: '1.6.0',
    config: conf,
    luna: async () => ({}),
    feature: n => features[n] || null,
    inputhook: {
      status: () => ({}),
      ensure(on) {
        ensured++;
        keyOn = on;
      },
      learnState: () => ({ state: 'got', name: 'guide', code: '362' }),
      markSaved() {},
      startLearn() {},
    },
  });
  const ask = (act, method, body) => call(m, '/api/manager/' + act, method, body);

  let r = await ask('status', 'GET');
  ok(
    r.j.options.liveTv === true && r.j.options.inputKey === true && r.j.options.debloat === true && r.j.keys.guide === '',
    'options are on by default and no Guide key is learned'
  );
  r = await ask('options', 'POST', { liveTv: false });
  ok(
    r.j.options.liveTv === false && conf.get().options.liveTv === false && ensured > 0,
    'switching Live TV off is stored and refreshes the key binds'
  );
  ok(
    lines.some(l => /options\.liveTv true -> false \(manager\)/.test(l)),
    'the change is logged with its source: ' + lines.join(' | ')
  );
  r = await ask('options', 'POST', { liveTv: 'no' });
  ok(r.j.options.liveTv === false, 'only a boolean changes an option');
  r = await ask('options', 'POST', { inputKey: false });
  ok(r.j.options.inputKey === false && r.j.options.liveTv === false, 'one option does not reset another');

  r = await ask('options', 'POST', { pickerMode: 'overlay' });
  ok(
    r.j.picker.mode === 'overlay' && conf.get().picker.prewarm === true && synced > 0,
    'choosing the overlay is saved and the Input key script is told'
  );
  r = await ask('options', 'POST', { pickerMode: 'ondemand' });
  ok(r.j.picker.mode === 'ondemand', 'choosing the on-demand picker');
  r = await ask('options', 'POST', { pickerMode: 'launcher' });
  ok(r.j.picker.mode === 'launcher', "choosing the launcher's list");
  r = await ask('options', 'POST', { pickerMode: 'sideways' });
  ok(r.j.picker.mode === 'launcher', 'an unknown mode is ignored');
  r = await ask('options', 'POST', { inputKey: true });
  mode = 'released';
  r = await ask('options', 'POST', { liveTv: true });
  ok(
    keyOn === false && r.j.picker.released === true,
    "the Input key is released to LG when its target needs CleanYourTV as Home and LG's Home is selected"
  );

  r = await ask('learn-state', 'GET');
  ok(conf.keys().guide === '362' && conf.keys().input === '241', 'a learned key is saved with the default Input key');
  r = await ask('clear-key', 'POST', { name: 'guide' });
  ok(conf.keys().guide === '', 'a learned key can be cleared');
  r = await ask('keys-done', 'POST');
  ok(conf.keys().learned === true, 'the end of the Input key steps is saved');
  ok(
    lines.some(l => /keys\.guide "" -> "362"|keys\.guide undefined -> "362"/.test(l)),
    'learned keys are logged too'
  );
  // LG's Home for a while (the launcher's button) and back (the manager), without a restart and without touching DISABLE
  const exec = req('exec'),
    detachedWas = exec.detached,
    started = [];
  exec.detached = s => started.push(s);
  const mounts = path.join(process.env.CYTV_PROC, 'mounts'),
    disable = path.join(process.env.CYTV_DIR, 'DISABLE');
  fs.writeFileSync(mounts, '/dev/x /usr/palm/applications/com.webos.app.home none bind 0 0\n');
  r = await call(m, '/api/lg-home', 'POST');
  ok(
    r.j.returnValue === true && started.length === 1 && /undo-home\.sh temp$/.test(started[0]) && !fs.existsSync(disable),
    'the LG Home button runs the temporary undo and leaves CleanYourTV as the Home of the next start'
  );
  r = await ask('back-home', 'POST');
  ok(r.code === 409 && started.length === 1, 'going back is refused while our Home is still mounted');
  fs.writeFileSync(mounts, '/dev/root / ext4 ro 0 0\n');
  r = await call(m, '/api/lg-home', 'POST');
  ok(r.code === 409 && started.length === 1, "the LG Home button does nothing when LG's Home is already on");
  fs.writeFileSync(disable, '');
  r = await ask('back-home', 'POST');
  ok(r.code === 409 && started.length === 1, "going back is refused when LG's Home is the chosen Home");
  fs.unlinkSync(disable);
  r = await ask('back-home', 'POST');
  ok(
    r.j.returnValue === true &&
      started.length === 2 &&
      /10-cleanyourtv-home;.*15-cleanyourtv-debloat.*DISABLE-DEBLOAT.*debloat-stop\.sh$/.test(started[1]),
    'going back mounts our Home again, then the debloat by its boot rules'
  );
  r = await ask('status', 'GET');
  ok(r.j.home.enabled === true && r.j.home.ours === false, "the status says CleanYourTV is chosen but LG's Home is showing");
  exec.detached = detachedWas;

  r = await ask('nope', 'POST');
  ok(r.code === 404, 'an unknown action');
  r = await ask('options', 'GET');
  ok(r.code === 405, 'a change needs POST');

  // the settings file: one read-modify-write at a time, written atomically, the launcher's part replaced without touching the rest
  const file = path.join(process.env.CYTV_DIR, 'config.json');
  const c = config.create(file, { log: () => {} });
  c.update('setup', x => {
    x.options = { inputKey: false };
    x.dock = ['a'];
  });
  c.update('launcher', x => {
    delete x.dock;
    x.dock = ['b'];
  });
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(
    back.options.inputKey === false && back.dock.join() === 'b' && (fs.statSync(file).mode & 0o777) === 0o600,
    'config.json keeps every section, is replaced atomically and readable by root only'
  );
  fs.writeFileSync(file, '[1,2]');
  ok(JSON.stringify(c.get()) === '{}' && c.options().inputKey === true, 'a broken config.json reads as empty, with the defaults');
});
