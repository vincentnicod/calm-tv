// Quick settings (quick.js): what is offered comes from the TV (the lists below are what an LG C4 on webOS 25 answers), only an offered
// value is set, the sleep timer is LG's own and the warning shows once a minute before it ends, and a turned-off screen comes back on
// at the next button.
const { ok, call, req, run, sleep } = require('./lib');
const quick = req('quick');

const ext = (vis, hid) =>
  vis.map(v => ({ visible: true, active: true, value: v })).concat((hid || []).map(v => ({ visible: false, active: true, value: v })));
const DESC = {
  pictureMode: ext(
    ['personalized', 'vivid', 'normal', 'eco', 'cinema', 'sports', 'game', 'filmMaker'],
    // prettier-ignore
    ['hdrPersonalized', 'dolbyHdrPersonalized', 'hdrVivid', 'hdrStandard', 'hdrEco', 'hdrCinemaBright', 'hdrCinema', 'photo', 'hdrGame',
      'hdrFilmMaker', 'dolbyHdrVivid', 'dolbyHdrStandard', 'dolbyHdrCinemaBright', 'dolbyHdrCinema', 'dolbyHdrGame']
  ),
  soundMode: ext(['aiSoundPlus', 'aiSound', 'standard', 'movie', 'news', 'sports', 'music', 'game'], ['game_rts', 'custom']),
  sleepTimer: ext(['off', '10', '20', '30', '60', '90', '120', '180', '240']),
};

run(async () => {
  let clock = 1e9,
    calls = [],
    tv,
    power = 'Active',
    running = [],
    attached = true,
    keys = [],
    refuse = false;
  const reset = () => {
    tv = { pictureMode: 'filmMaker', soundMode: 'aiSoundPlus', sleepTimer: 'off' };
    calls = [];
    power = 'Active';
  };
  reset();
  const luna = async (uri, p) => {
    calls.push([uri.replace(/^luna:\/\/[^/]+\//, ''), p]);
    if (/getSystemSettingDesc/.test(uri)) return { returnValue: true, results: [{ values: { arrayExt: DESC[p.keys[0]] } }] };
    if (/getSystemSettings/.test(uri)) {
      const s = {};
      s[p.keys[0]] = tv[p.keys[0]];
      return { returnValue: true, settings: s };
    }
    if (/setSystemSettings/.test(uri)) {
      if (refuse) return { returnValue: false, errorText: 'refused' };
      Object.assign(tv, p.settings);
      return { returnValue: true };
    }
    if (/getPowerState/.test(uri)) return { returnValue: true, state: power };
    if (/running/.test(uri)) return { returnValue: true, running };
    return { returnValue: true };
  };
  const inputhook = {
    hookInfo: () => ({ attached }),
    logSize: () => 0,
    pressesSince: () => keys,
  };
  let mode = 'ondemand';
  const q = quick.create({ luna, now: () => clock, inputhook, feature: n => (n === 'inputkey' ? { mode: () => mode } : null) });
  const sets = () => calls.filter(c => c[0] === 'setSystemSettings').map(c => JSON.stringify(c[1].settings));
  const launches = () => calls.filter(c => c[0] === 'launch').map(c => c[1]);

  let r = await call(q, '/api/quick');
  ok(
    r.j.picture.value === 'filmMaker' &&
      r.j.picture.values.join() === 'personalized,vivid,normal,eco,cinema,sports,game,filmMaker' &&
      r.j.sound.values.join() === 'aiSoundPlus,aiSound,standard,movie,news,sports,music,game' &&
      r.j.sleep.values[0] === 'off' &&
      r.j.sleep.endsAt === undefined,
    "the TV's own lists: the picture modes for a normal picture, the sound modes it shows, the sleep times"
  );
  tv.pictureMode = 'hdrCinema';
  r = await call(q, '/api/quick');
  ok(
    r.j.picture.values.join() === 'hdrPersonalized,hdrVivid,hdrStandard,hdrEco,hdrCinemaBright,hdrCinema,hdrGame,hdrFilmMaker',
    'during HDR the HDR modes are offered, not the normal ones nor Dolby Vision'
  );
  tv.pictureMode = 'dolbyHdrGame';
  r = await call(q, '/api/quick');
  ok(
    r.j.picture.values.every(v => /^dolbyHdr[A-Z]/.test(v)) && r.j.picture.values.length === 6,
    'during Dolby Vision, the Dolby Vision modes'
  );
  ok(
    quick.pictureChoices([{ visible: true, value: 'normal' }], 'isfExpert1').join() === 'isfExpert1,normal',
    'a mode the TV is in but does not list is offered too, so the panel can show it'
  );

  reset();
  r = await call(q, '/api/quick', 'POST', { picture: 'cinema' });
  ok(r.j.picture.value === 'cinema' && sets().join() === '{"pictureMode":"cinema"}', "a picture mode is set through LG's settings");
  calls = [];
  const bad = [
    await call(q, '/api/quick', 'POST', { picture: 'hdrVivid' }),
    await call(q, '/api/quick', 'POST', { sound: 'game_rts' }),
    await call(q, '/api/quick', 'POST', { sleep: '45' }),
    await call(q, '/api/quick', 'POST', { picture: 'x";reboot' }),
    await call(q, '/api/quick', 'POST', { volume: '100' }),
  ];
  ok(
    bad.every(x => x.code === 400) && sets().length === 0,
    'a value the TV does not offer now, or another setting, is refused and nothing is set'
  );
  refuse = true;
  r = await call(q, '/api/quick', 'POST', { sound: 'movie' });
  ok(r.j.error === 'refused' && tv.soundMode === 'aiSoundPlus', 'when the TV refuses, the panel is told');
  refuse = false;

  // the sleep timer
  reset();
  r = await call(q, '/api/quick', 'POST', { sleep: '30' });
  ok(
    sets().join() === '{"sleepTimer":"off"},{"sleepTimer":"30"}' && r.j.sleep.value === '30' && r.j.sleep.endsAt === clock + 30 * 60000,
    "the sleep timer is LG's own, started afresh (through off), and the panel learns when the TV turns off"
  );
  clock += 28 * 60000;
  await q.tick();
  ok(launches().length === 0, 'no warning two minutes before');
  clock += 75000;
  await q.tick();
  await q.tick();
  ok(
    launches().length === 1 &&
      launches()[0].id === 'com.cleanyourtv.picker' &&
      launches()[0].params.panel === 'sleep' &&
      launches()[0].params.ondemand === true,
    'a minute before: the warning over the picture, once, in a picker that closes itself after'
  );
  r = await call(q, '/api/quick', 'POST', { sleep: 'more' });
  ok(
    sets().slice(-2).join() === '{"sleepTimer":"off"},{"sleepTimer":"20"}' && r.j.sleep.endsAt === clock + 20 * 60000,
    "the warning's button: 20 more minutes from now"
  );
  tv.sleepTimer = '60'; // changed in LG's own menu
  calls = [];
  clock += 19.5 * 60000;
  await q.tick();
  r = await call(q, '/api/quick');
  ok(
    launches().length === 0 && r.j.sleep.value === '60' && r.j.sleep.endsAt === undefined,
    "a timer changed in LG's menu: no warning, no made-up end time"
  );

  reset();
  await call(q, '/api/quick', 'POST', { sleep: '10' });
  power = 'Screen Off';
  clock += 9.2 * 60000;
  await q.tick();
  ok(launches().length === 0, 'no warning over a turned-off screen');
  r = await call(q, '/api/quick', 'POST', { sleep: 'off' });
  ok(tv.sleepTimer === 'off' && r.j.sleep.endsAt === undefined, 'the timer can be switched off');

  // opening the panel
  calls = [];
  mode = 'overlay';
  running = [{ id: 'com.cleanyourtv.picker' }];
  await call(q, '/api/quick', 'POST', { open: 'quick' });
  running = [];
  await call(q, '/api/quick', 'POST', { open: 'quick' });
  const l = launches();
  ok(
    JSON.stringify(l[0].params) === '{"panel":"quick"}' && l[1].params.ondemand === true,
    'the panel opens in the picker kept ready, or in one started for it that closes itself'
  );

  // screen off
  calls = [];
  keys = [];
  r = await call(q, '/api/quick', 'POST', { screen: 'off' });
  const turned = () => calls.filter(c => /turn(On|Off)Screen/.test(c[0])).map(c => c[0].replace('power/', ''));
  ok(r.j.ok && turned().join() === 'turnOffScreen', 'the screen is turned off');
  keys = [115, 114, 113];
  await sleep(700);
  ok(turned().length === 1, 'volume and mute leave it off');
  keys = [115, 28];
  await sleep(700);
  await sleep(700);
  ok(turned().join() === 'turnOffScreen,turnOnScreen', 'the next other button turns it on again, once');
  calls = [];
  keys = [];
  await call(q, '/api/quick', 'POST', { screen: 'off' });
  keys = [116];
  await sleep(700);
  keys = [116, 28];
  await sleep(700);
  ok(turned().join() === 'turnOffScreen', 'after the power button the service leaves the screen alone');
  attached = false;
  calls = [];
  keys = [28];
  await call(q, '/api/quick', 'POST', { screen: 'off' });
  await sleep(700);
  ok(turned().join() === 'turnOffScreen', 'without the hook the TV is left to turn it on itself');
});
