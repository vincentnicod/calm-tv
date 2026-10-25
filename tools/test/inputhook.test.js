// The input hook (inputhook.js): which of LG's processes it goes into (issue 23: hooked into micomservice, HDMI-CEC control of
// other devices and eARC stopped working).
const fs = require('fs'),
  path = require('path');
const { ok, req, run, call, sleep, memoryConfig } = require('./lib');

const PROC = process.env.CYTV_PROC;
const proc = (pid, name) => {
  fs.mkdirSync(path.join(PROC, String(pid)));
  fs.writeFileSync(path.join(PROC, String(pid), 'comm'), name + '\n');
};

run(async () => {
  const hook = req('inputhook');
  proc(100, 'micomservice');
  proc(200, 'lginput2');
  proc(300, 'tvservice');
  proc(400, 'bash');
  let p = hook.procs();
  ok(
    p.length === 1 && p[0].name === 'lginput2',
    "where LG's input service runs, the hook goes only into lginput2, never into micomservice"
  );
  fs.unlinkSync(path.join(PROC, '200', 'comm'));
  fs.rmdirSync(path.join(PROC, '200'));
  p = hook.procs();
  ok(
    p
      .map(x => x.name)
      .sort()
      .join() === 'micomservice,tvservice',
    'firmware without lginput2: the other input processes, as before'
  );

  // ---- remote buttons given to apps (Customise > Remote buttons) ----
  const A = hook.APP_COMMAND;
  const cur = {
    400: { action: 'exec', command: 'sh /somewhere/else.sh' },
    435: { action: 'exec', command: A + 'old.app' },
    999: { action: 'exec', command: A + 'gone.app' },
  };
  const b = hook.binds(cur, true, '241', '', '', {
    435: 'com.lgi.upcch',
    437: 'com.webos.app.hdmi1',
    241: 'x.y',
    114: 'z.z',
    abc: 'q.q',
    500: 'bad id!',
  });
  ok(
    b[400].command === 'sh /somewhere/else.sh' &&
      b[435].command === A + 'com.lgi.upcch' &&
      b[437].command === A + 'com.webos.app.hdmi1' &&
      !b[999] &&
      !b[114] &&
      !b[500] &&
      !b.abc &&
      /inputkey\.sh$/.test(b[241].command),
    "binds: a button opens its app; anyone else's bind is kept; a reserved button (volume), the Input key and a bad id are refused"
  );
  ok(
    JSON.stringify(hook.binds(b, true, '241', '', '', {})) === JSON.stringify({ 400: cur[400], 241: b[241] }),
    'binds: no buttons left, none of ours stay'
  );
  ok(
    Object.keys(
      hook.cleanRemap({ 1: 'a.a', 2: 'b.b', 3: 'c.c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h', 9: 'i', 10: 'j', 11: 'k', 12: 'l', 13: 'm' })
    ).length === 12 && JSON.stringify(hook.cleanRemap(['x'])) === '{}',
    'at most twelve buttons, and only from an object'
  );

  // the API, with a stand-in for the hook
  let attached = false,
    press = null,
    ensured = 0;
  const fakeHook = {
    cleanRemap: hook.cleanRemap,
    RESERVED: hook.RESERVED,
    hookInfo: () => ({ attached }),
    startLearn() {
      press = null;
    },
    learnState: () => (press ? { state: 'got', code: press } : { state: 'waiting' }),
    ensure() {
      ensured++;
    },
    setVoiceKey() {},
    setGuideKey() {},
    setRemap() {},
  };
  const conf = memoryConfig({ options: { inputKey: true }, keys: { input: '241' }, dock: ['x'] });
  const ik = req('inputkey').create({
    config: conf,
    luna: async () => ({ returnValue: true }),
    profile: { get: () => ({ pickerMode: 'overlay' }) },
    feature: () => null,
    inputhook: fakeHook,
  });
  const post = bd => call(ik, '/api/remap', 'POST', bd);
  let r = await post({ learn: 'bad id!' });
  ok(r.code === 400, 'a bad app id is refused');
  r = await post({ learn: 'com.lgi.upcch' });
  ok(r.j.error === 'unsupported' && !r.j.learning, "without the hook in LG's input service, nothing waits for a button");
  attached = true;
  r = await post({ learn: 'com.lgi.upcch' });
  ok(r.j.learning.state === 'waiting' && r.j.learning.app === 'com.lgi.upcch', 'learning: waiting for the button');
  press = '435';
  await sleep(600);
  r = await call(ik, '/api/remap');
  ok(
    r.j.learning.state === 'saved' &&
      r.j.learning.code === '435' &&
      JSON.stringify(r.j.buttons) === '[{"code":"435","app":"com.lgi.upcch"}]' &&
      ensured > 0,
    'the button pressed is saved by the service itself and the binds are written'
  );
  await post({ learn: 'com.lgi.upcch' });
  press = '436';
  await sleep(600);
  ok(
    JSON.stringify(conf.get().remap) === '{"436":"com.lgi.upcch"}',
    'teaching another button to the same app moves it (one button per app)'
  );
  await post({ learn: 'youtube.leanback.v4' });
  press = '241';
  await sleep(600);
  r = await call(ik, '/api/remap');
  ok(r.j.learning.state === 'taken' && !conf.get().remap['241'], 'the Input key is never given to an app');
  await post({ learn: 'youtube.leanback.v4' });
  press = '115';
  await sleep(600);
  r = await call(ik, '/api/remap');
  ok(r.j.learning.state === 'taken' && !conf.get().remap['115'], 'nor is volume');
  r = await post({ code: '436', app: 'com.webos.app.hdmi1' });
  ok(
    JSON.stringify(r.j.buttons) === '[{"code":"436","app":"com.webos.app.hdmi1"}]',
    'a button can be given to another app (here an HDMI input)'
  );
  r = await post({ code: '777', app: 'com.webos.app.hdmi1' });
  ok(r.code === 400, 'only a button already taught can be changed');
  r = await post({ code: '436', remove: true });
  ok(
    r.j.buttons.length === 0 && conf.get().dock[0] === 'x' && conf.get().options.inputKey === true,
    'removing gives the button back to LG; other settings stay'
  );
  await post({ learn: 'com.lgi.upcch' });
  r = await post({ cancel: true });
  ok(r.j.learning === null, 'learning can be cancelled');
});
