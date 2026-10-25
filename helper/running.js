// The launcher's Running apps menu (Back on Home, issue 16, as suggested and first built by Steefzar): the apps that are open now, to
// close them, as LG's own Home does with its Recents panel on a second Back.
//   GET /api/running                               {apps: [{id, title}]}
//   POST /api/running/close {id} or {all: true}    {returnValue, closed: [ids]}
// Only apps the launcher knows are listed (the apps of listApps), never Home and never CleanYourTV's own apps (the manager, and the
// picker and notify apps that are meant to stay up). Only listed apps can be closed. Closing also drops the app from LG's recents, as
// LG's panel does.
const web = require('./web');

const HOME = 'com.webos.app.home',
  OWN = /^com\.cleanyourtv\./,
  AM = 'luna://com.webos.applicationManager/';

// running: the list of applicationManager/running; apps: the launcher's apps ({id, title})
function pick(running, apps) {
  const title = {},
    seen = {},
    out = [];
  (apps || []).forEach(a => {
    title[a.id] = a.title || a.id;
  });
  (running || []).forEach(r => {
    const id = r && (r.id || r.appId);
    if (!id || seen[id] || id === HOME || OWN.test(id) || !Object.prototype.hasOwnProperty.call(title, id)) return;
    seen[id] = true;
    out.push({ id, title: title[id] });
  });
  return out;
}

function create(ctx) {
  const { luna } = ctx;
  const apps = () => {
    const a = ctx.feature('apps');
    return a ? a.apps() : Promise.resolve([]);
  };
  async function list() {
    const r = await luna(AM + 'running', {});
    if (!Array.isArray(r.running)) return { apps: [], error: r.errorText || 'the app manager did not answer' };
    return { apps: pick(r.running, await apps()) };
  }
  // closeByAppId is the call that works on webOS 6, plain close the fallback (as for the picker in inputkey.js)
  async function close(id) {
    let r = await luna(AM + 'closeByAppId', { id });
    if (r.returnValue !== true) r = await luna(AM + 'close', { id });
    if (r.returnValue !== true) return false;
    await luna('luna://com.webos.service.recent/removeRecent', { appId: id }); // not on every webOS; the app is closed either way
    return true;
  }
  async function handle(req, res, u, body) {
    if (u === '/api/running') return web.json(res, await list());
    if (u === '/api/running/close' && req.method === 'POST') {
      const b = await body(req);
      const ids = (await list()).apps.map(a => a.id).filter(id => b.all === true || id === b.id);
      if (!ids.length) return web.json(res, { returnValue: false, errorText: b.all ? 'nothing is running' : 'not a running app' });
      const closed = [];
      for (const id of ids) if (await close(id)) closed.push(id);
      return web.json(res, { returnValue: closed.length === ids.length, closed });
    }
    web.notFound(res);
  }
  return { name: 'running', paths: ['/api/running', '/api/running/close'], handle, list, close };
}

module.exports = { create, pick };
