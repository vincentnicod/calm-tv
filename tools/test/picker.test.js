// The Inputs picker (picker.js): kept ready where that works, switched off for good when the TV keeps closing it (issues 5 and 6), and
// the default mode per TV (tvprofile.js).
const { ok, req, run } = require('./lib');
const picker = req('picker');

run(async () => {
  let clock = 1000,
    launches = 0,
    running = [],
    saved = {};
  const luna = async uri => {
    if (/getPowerState/.test(uri)) return { state: 'Active' };
    if (/running/.test(uri)) return { running };
    if (/getAppInfo/.test(uri)) return { returnValue: true };
    if (/launch/.test(uri)) {
      launches++;
      return { returnValue: true };
    }
    return {};
  };
  const make = () => {
    launches = 0;
    saved = {};
    clock = 1000;
    return picker.make(
      luna,
      () => true,
      { get: () => saved, set: v => (saved = v) },
      () => clock
    );
  };
  let tick = make();
  await tick();
  ok(launches === 1, 'the picker is started once when it is not running');
  clock += 5000;
  await tick();
  ok(launches === 1, 'it is not started again while it is still starting');
  clock += 25000;
  await tick();
  clock += 30000;
  await tick();
  ok(launches === 3 && saved.prewarm === undefined, 'a picker that vanishes is started again');
  clock += 30000;
  const r10 = await tick();
  ok(
    launches === 3 && saved.prewarm === false && r10 === true && /keeps closing/.test(saved.reason),
    'three starts in ten minutes: prewarming is switched off and saved'
  );
  clock += 60000;
  await tick();
  await tick();
  ok(launches === 3, 'it is never started again while switched off');
  tick = make();
  await tick(); // it is listed as running for a moment after every start, then closed: that still counts
  for (let i = 0; i < 4; i++) {
    running = [{ id: 'com.cleanyourtv.picker' }];
    clock += 5000;
    await tick();
    running = [];
    clock += 40000;
    await tick();
  }
  ok(saved.prewarm === false && launches === 3, 'a picker that is listed once after each start but then closed still ends up switched off');
  tick = make();
  running = [{ appId: 'com.cleanyourtv.picker' }];
  await tick();
  clock += 3600000;
  await tick();
  await tick();
  ok(launches === 0 && saved.prewarm === undefined, 'a picker that stays running (listed by id or appId) is never started');
  tick = make();
  running = [];
  for (let i = 0; i < 4; i++) {
    if (i) clock += 15 * 60000;
    await tick();
  }
  ok(launches === 4 && saved.prewarm === undefined, 'a start every quarter of an hour (standby, wake) is normal and stays on');
  tick = make();
  saved = { prewarm: true };
  await tick();
  ok(launches === 1, 'switching it back on in the manager starts it again');
  tick = make();
  running = [];
  for (let i = 0; i < 4; i++) {
    if (i) clock += 40000;
    await tick();
  }
  ok(saved.mode === 'ondemand' && saved.prewarm === false, 'when the system keeps closing the picker it is started when pressed instead');

  ok(
    picker.modeOf({}, 10) === 'overlay' && picker.modeOf({}, 6) === 'ondemand' && picker.modeOf({}, 0) === 'ondemand',
    'by SDK version: kept ready on webOS 25 (SDK 10), started when pressed before that'
  );
  ok(
    picker.modeOf({}, 11) === 'ondemand' && picker.modeOf({}, 12) === 'ondemand',
    'SDK 11 and newer, where the hidden picker has not been tried, start it when pressed (issue 6)'
  );
  ok(picker.modeOf({}, 'ondemand') === 'ondemand' && picker.modeOf({}, 'overlay') === 'overlay', "the TV profile's default is used");
  ok(
    picker.modeOf({ mode: 'overlay' }, 6) === 'overlay' &&
      picker.modeOf({ mode: 'launcher' }, 10) === 'launcher' &&
      picker.modeOf({ mode: 'ondemand' }, 'overlay') === 'ondemand' &&
      picker.modeOf({ mode: 'x' }, 6) === 'ondemand',
    'a saved choice wins over the default'
  );
});
