// The remote's Input key (and the learned Voice and Guide keys): keeps the hook in LG's input processes and the key binds up to date
// (inputhook.js), keeps the Inputs picker ready where that works (picker.js), closes the picker when it asks, and writes the mode
// that scripts/inputkey.sh follows. GET /api/log?m=... is the picker's and the overlay apps' small diagnostics channel.
// Remote buttons given to apps (Customise > Remote buttons on Home), config.json "remap": {code: app id}:
//   GET /api/remap                     the buttons, whether the remote can be read, and the last learning
//   POST /api/remap {learn: <app id>}  wait (here, up to 45 s) for the next button press and give that button to the app. The launcher is
//                                      often gone by then: the button still does its own thing once (Netflix opens), so the service saves it
//   POST /api/remap {code, app}        give a button to another app       POST /api/remap {code, remove: true}  give it back to LG
//   POST /api/remap {cancel: true}     stop waiting
const fs = require('fs');
const P = require('./paths'),
  web = require('./web'),
  picker = require('./picker');

const PICKER = 'com.cleanyourtv.picker';

function create(ctx) {
  const { config, luna, profile } = ctx;
  const inputhook = ctx.inputhook || require('./inputhook');
  let pickerShownAt = 0;

  const keyCode = () => String(config.keys().input || '241');
  // the voice key belongs to us only while voice is installed and on; the Guide key only while Live TV is on and a key was learned
  const voiceKey = () => {
    const v = config.get().voice || {};
    const voice = ctx.feature('voice');
    return v.enabled && voice && voice.installed() ? String(config.keys().voice || '') : '';
  };
  const guideKey = () => (config.options().liveTv !== false ? String(config.keys().guide || '') : '');
  const remap = () => inputhook.cleanRemap(config.get().remap);
  // the buttons CleanYourTV already uses: they are never given to an app
  const ownKeys = () => [on() ? keyCode() : '', voiceKey(), guideKey()].filter(Boolean);
  const APP = /^[A-Za-z0-9][\w.\-]{0,119}$/;
  let learning = null; // {app, state: waiting | saved | taken | timeout | unsupported, code, at}
  /** @type {any} */
  let learnT = null;
  function remapState() {
    const r = remap();
    return {
      buttons: Object.keys(r).map(code => ({ code, app: r[code] })),
      learning: learning ? { app: learning.app, state: learning.state, code: learning.code || '' } : null,
      attached: !!(inputhook.hookInfo && inputhook.hookInfo().attached),
    };
  }
  function saveRemap(fn) {
    config.update('remote buttons', c => {
      c.remap = inputhook.cleanRemap(c.remap);
      fn(c.remap);
    });
    ensure();
  }
  function stopLearning(state) {
    clearInterval(learnT);
    learnT = null;
    if (learning && learning.state === 'waiting') learning.state = state;
  }
  function pollLearn() {
    if (!learning || learning.state !== 'waiting') return stopLearning('timeout');
    const s = inputhook.learnState();
    if (s.state === 'got') {
      const code = String(s.code);
      if (ownKeys().indexOf(code) >= 0 || (inputhook.RESERVED || []).indexOf(+code) >= 0) {
        learning.code = code;
        return stopLearning('taken');
      }
      const app = learning.app;
      saveRemap(r => {
        for (const k of Object.keys(r)) if (r[k] === app && k !== code) delete r[k]; // one button per app
        r[code] = app;
      });
      learning.code = code;
      console.log('remote buttons: button ' + code + ' now opens ' + app);
      return stopLearning('saved');
    }
    if (s.state === 'unsupported' || s.state === 'timeout') stopLearning(s.state);
  }
  // overlay, ondemand or launcher: the manager's choice, else this TV's default (tvprofile.js)
  const mode = () => picker.modeOf(config.get().picker || {}, profile.get().pickerMode);
  // with the launcher's list as the target, CleanYourTV has to be the Home: while LG's Home is chosen the key stays with LG
  const on = () => config.options().inputKey && !(mode() === 'launcher' && fs.existsSync(P.DISABLE));
  const syncMode = () => {
    try {
      fs.writeFileSync(P.PICKER_MODE, mode() + '\n');
    } catch (_) {}
  };
  const ensure = () => inputhook.ensure(on(), keyCode());

  // the on-demand picker asks to be closed when it is dismissed. Closing from the page does nothing on some builds, so the app
  // manager does it: closeByAppId works on webOS 6, plain close is the fallback
  async function closePicker() {
    const a = await luna('luna://com.webos.applicationManager/closeByAppId', { id: PICKER });
    if (a.returnValue === true) return;
    const b = await luna('luna://com.webos.applicationManager/close', { id: PICKER });
    if (b.returnValue !== true)
      console.error('picker: could not close it (' + (a.errorText || 'closeByAppId failed') + '; ' + (b.errorText || 'close failed') + ')');
  }

  async function handle(req, res, u, body) {
    if (u === '/api/remap') {
      if (req.method !== 'POST') return web.json(res, remapState());
      const b = (await body(req)) || {};
      if (b.cancel) {
        stopLearning('cancelled');
        learning = null;
      } else if (typeof b.learn === 'string') {
        if (!APP.test(b.learn)) return web.json(res, { error: 'bad app id' }, 400);
        if (!(inputhook.hookInfo && inputhook.hookInfo().attached))
          return web.json(res, Object.assign(remapState(), { error: 'unsupported' }));
        if (Object.keys(remap()).length >= 12 && Object.keys(remap()).every(k => remap()[k] !== b.learn))
          return web.json(res, Object.assign(remapState(), { error: 'full' }));
        clearInterval(learnT);
        learning = { app: b.learn, state: 'waiting', at: Date.now() };
        inputhook.startLearn('remap');
        learnT = setInterval(pollLearn, 400);
        setTimeout(() => stopLearning('timeout'), 46000);
      } else if (/^\d{1,4}$/.test(String(b.code || ''))) {
        const code = String(b.code);
        if (b.remove === true)
          saveRemap(r => {
            delete r[code];
          });
        else if (typeof b.app === 'string' && APP.test(b.app) && remap()[code])
          saveRemap(r => {
            r[code] = b.app;
          });
        else return web.json(res, { error: 'bad request' }, 400);
      } else return web.json(res, { error: 'bad request' }, 400);
      return web.json(res, remapState());
    }
    const m = decodeURIComponent(req.url.split('m=')[1] || '');
    if (/picker show/.test(m)) pickerShownAt = Date.now();
    if (/picker close/.test(m)) setTimeout(closePicker, 400);
    let up = '';
    try {
      up = fs.readFileSync(P.PROC + '/uptime', 'utf8').split(' ')[0];
    } catch (_) {}
    console.log(up + ' ' + m.slice(0, 300));
    web.json(res, {});
  }

  function start() {
    if (inputhook.setVoiceKey) inputhook.setVoiceKey(voiceKey);
    if (inputhook.setGuideKey) inputhook.setGuideKey(guideKey);
    if (inputhook.setRemap) inputhook.setRemap(remap);
    syncMode();
    // bind the key and keep the hook in LG's input processes (they restart now and then)
    setTimeout(ensure, 500);
    setInterval(ensure, 30000);
    // a hidden picker is only kept while the hook attached: without it the key cannot open the picker, which would only hold the remote
    const hookAttached = () => {
      try {
        return !!(inputhook.hookInfo && inputhook.hookInfo().attached);
      } catch (_) {
        return false;
      }
    };
    picker.start(luna, () => config.options().inputKey && mode() === 'overlay' && hookAttached(), {
      get: () => config.get().picker || {},
      set: v => {
        config.update('picker', c => {
          c.picker = v;
        });
        syncMode();
      },
    });
  }

  return {
    name: 'inputkey',
    paths: ['/api/log', '/api/remap'],
    handle,
    start,
    // for the manager
    mode,
    on,
    syncMode,
    ensure,
    pickerShownAt: () => pickerShownAt,
    keyCode,
  };
}

module.exports = { create };
