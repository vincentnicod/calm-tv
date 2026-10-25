// Quick settings: the panel over any app (picker/app, panel "quick"), opened by Home's Quick settings button or a remote button given to
// it in Customise > Remote buttons. LG's own picture mode, sound mode and sleep timer, read and set through LG's settings service, and
// the screen turned off while the sound plays on. Nothing is changed but what the panel is asked to change.
//   GET  /api/quick                               {picture, sound, sleep}: each {value, values} with the values this TV offers now;
//                                                 sleep also has endsAt (ms) when the timer was set from here
//   POST /api/quick {picture|sound|sleep: value}  set it (only a value from that list)
//   POST /api/quick {sleep: 'more'}               20 more minutes (the warning's button)
//   POST /api/quick {screen: 'off'}               screen off; the next button turns it on again
//   POST /api/quick {open: 'quick'}               show the panel over what is playing
// The sleep timer is LG's own, so the TV turns itself off (and the box with it, over SIMPLINK) even if this service stops. The service only
// remembers when it was set, to show when the TV turns off and to put a warning over the picture a minute before.
const web = require('./web');

const SET = 'luna://com.webos.settingsservice/',
  POWER = 'luna://com.webos.service.tvpower/power/',
  PICKER = 'com.cleanyourtv.picker';
const KINDS = {
  picture: ['picture', 'pictureMode'],
  sound: ['sound', 'soundMode'],
  sleep: ['time', 'sleepTimer'],
};
const VALUE = /^[\w.\-]{1,40}$/;
const WARN_MS = 60000, // the warning shows this long before the TV turns off
  MORE = '20', // minutes the warning's button adds
  SCREEN_WATCH_MS = 6 * 3600 * 1000;
// buttons that leave a turned-off screen off: mute, volume, power (LG lets them through too)
const SCREEN_KEEP = [113, 114, 115, 116];

// The picture modes to offer. LG lists every mode for every kind of picture and marks the ones for a normal (SDR) picture as visible; during
// HDR or Dolby Vision the current mode is one of the others (hdrCinema, dolbyHdrGame), and the offer is that family.
function pictureChoices(list, cur) {
  const ok = (list || []).filter(v => v && VALUE.test(v.value) && v.active !== false);
  const fam = /^(dolbyHdr|hdr)[A-Z]/.exec(cur || '');
  let out = fam
    ? ok.filter(v => v.value.indexOf(fam[1]) === 0 && /^[A-Z]/.test(v.value.slice(fam[1].length))).map(v => v.value)
    : ok.filter(v => v.visible !== false).map(v => v.value);
  if (cur && VALUE.test(cur) && out.indexOf(cur) < 0) out = [cur].concat(out);
  return out;
}
function plainChoices(list, cur) {
  let out = (list || []).filter(v => v && VALUE.test(v.value) && v.active !== false && v.visible !== false).map(v => v.value);
  if (cur && VALUE.test(cur) && out.indexOf(cur) < 0) out = [cur].concat(out);
  return out;
}

function create(ctx) {
  const luna = ctx.luna,
    now = ctx.now || Date.now;
  const inputhook = ctx.inputhook || require('./inputhook');
  const offered = {}; // what each setting can be, from LG; read once
  let timer = null; // the sleep timer set from here: {value, at, warned}
  /** @type {any} */
  let screenT = null;

  async function read(kind) {
    const k = KINDS[kind];
    const r = await luna(SET + 'getSystemSettings', { category: k[0], keys: [k[1]] });
    const v = r && r.settings && r.settings[k[1]];
    return typeof v === 'string' ? v : '';
  }
  async function values(kind) {
    if (offered[kind]) return offered[kind];
    const k = KINDS[kind];
    const r = await luna(SET + 'getSystemSettingDesc', { category: k[0], keys: [k[1]] });
    const d = r && Array.isArray(r.results) && r.results[0];
    const list = d && d.values && Array.isArray(d.values.arrayExt) ? d.values.arrayExt : [];
    if (list.length) offered[kind] = list;
    return list;
  }
  async function one(kind) {
    const cur = await read(kind),
      list = await values(kind);
    if (kind === 'picture') return { value: cur, values: pictureChoices(list, cur) };
    const out = { value: cur, values: plainChoices(list, cur) };
    if (kind === 'sleep') {
      const end = endsAt(cur);
      if (end) out.endsAt = end;
    }
    return out;
  }
  async function state() {
    const r = await Promise.all([one('picture'), one('sound'), one('sleep')]);
    return { picture: r[0], sound: r[1], sleep: r[2] };
  }
  // when the timer set from here ends; forgotten when the timer was changed elsewhere (LG's menu) or is long over
  function endsAt(cur) {
    if (!timer) return 0;
    const end = timer.at + +timer.value * 60000;
    if (cur !== timer.value || now() > end + 120000) {
      timer = null;
      return 0;
    }
    return end;
  }
  async function write(kind, v) {
    const k = KINDS[kind],
      settings = {};
    settings[k[1]] = v;
    const r = await luna(SET + 'setSystemSettings', { category: k[0], settings });
    if (r.returnValue !== true) throw new Error(r.errorText || 'the TV did not take it');
  }
  async function setSleep(v) {
    // through off, so the countdown starts again from now even when the value is the same
    await write('sleep', 'off');
    timer = null;
    if (v === 'off') return;
    await write('sleep', v);
    timer = { value: v, at: now(), warned: false };
  }

  // the panel over what is playing: the Inputs picker app. Where it is kept running hidden (overlay mode) it only wakes; anywhere else
  // it is started for this and closes itself after use, so nothing hidden is left holding the remote
  async function open(panel) {
    const ik = ctx.feature && ctx.feature('inputkey');
    let warm = false;
    if (ik && ik.mode() === 'overlay') {
      const run = await luna('luna://com.webos.applicationManager/running', {});
      warm = Array.isArray(run.running) && run.running.some(a => (a.id || a.appId) === PICKER);
    }
    return luna('luna://com.webos.applicationManager/launch', { id: PICKER, params: warm ? { panel } : { panel, ondemand: true } });
  }

  // Screen off. LG turns the screen on again at the next button on its own; in case this firmware does not, the service watches the
  // remote (the hook's log) and turns it on at the next button that is not mute, volume or power
  async function screenOff() {
    const r = await luna(POWER + 'turnOffScreen', {});
    if (r.returnValue !== true) throw new Error(r.errorText || 'the TV did not turn the screen off');
    clearInterval(screenT);
    screenT = null;
    if (!(inputhook.hookInfo && inputhook.hookInfo().attached)) return;
    const from = inputhook.logSize(),
      at = now();
    screenT = setInterval(async () => {
      const keys = inputhook.pressesSince(from);
      if (keys.indexOf(116) >= 0 || now() - at > SCREEN_WATCH_MS) return stopWatch();
      if (!keys.some(k => SCREEN_KEEP.indexOf(k) < 0)) return;
      stopWatch();
      const pw = await luna(POWER + 'getPowerState', {});
      if (/standby|suspend|power ?off/i.test(pw.state || '')) return; // the TV went off meanwhile: leave it
      await luna(POWER + 'turnOnScreen', {});
    }, 600);
  }
  function stopWatch() {
    clearInterval(screenT);
    screenT = null;
  }

  // a minute before the timer set from here ends: the warning over the picture, if the TV is on and the timer still runs
  async function tick() {
    if (!timer || timer.warned) return;
    const end = timer.at + +timer.value * 60000;
    if (now() < end - WARN_MS) return;
    timer.warned = true;
    if (now() > end - 10000) return;
    if ((await read('sleep')) !== timer.value) {
      timer = null;
      return;
    }
    const pw = await luna(POWER + 'getPowerState', {});
    if (pw.state && pw.state !== 'Active') return;
    await open('sleep');
  }

  async function handle(req, res, u, body) {
    if (req.method !== 'POST') return web.json(res, await state());
    const b = (await body(req)) || {};
    try {
      if (b.open === 'quick') {
        const r = await open('quick');
        return web.json(res, r.returnValue === true ? { ok: true } : { error: r.errorText || 'could not open the panel' });
      }
      if (b.screen === 'off') {
        await screenOff();
        console.log('quick settings: screen off');
        return web.json(res, { ok: true });
      }
      if (b.sleep === 'more') {
        const s = await one('sleep');
        const v = s.values.indexOf(MORE) >= 0 ? MORE : s.values.filter(x => x !== 'off')[0];
        if (!v) return web.json(res, { error: 'no sleep timer on this TV' }, 400);
        await setSleep(v);
        console.log('quick settings: sleep timer ' + v + ' more minutes');
        return web.json(res, await state());
      }
      for (const kind of Object.keys(KINDS)) {
        if (typeof b[kind] !== 'string') continue;
        const s = await one(kind);
        if (s.values.indexOf(b[kind]) < 0) return web.json(res, { error: 'not offered: ' + kind + ' ' + b[kind].slice(0, 40) }, 400);
        if (kind === 'sleep') await setSleep(b[kind]);
        else await write(kind, b[kind]);
        console.log('quick settings: ' + kind + ' ' + b[kind]);
        return web.json(res, await state());
      }
    } catch (e) {
      console.error('quick settings: ' + e.message);
      return web.json(res, { error: e.message });
    }
    web.json(res, { error: 'bad request' }, 400);
  }

  return {
    name: 'quick',
    paths: ['/api/quick'],
    handle,
    start: () => setInterval(() => tick().catch(e => console.error('sleep timer: ' + e.message)), 5000),
    tick,
  };
}

module.exports = { create, pictureChoices, plainChoices };
