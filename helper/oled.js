// OLED care, read only: how long the panel has been on, when it last ran its short compensation (after about four hours of use, in
// standby) and the long Pixel Refresher (about every 2,000 hours), how many of each it has done, and whether one failed. Shown in the
// hidden System panel. Nothing is changed on the TV. Where the counters are, and their units, as documented by the Glasshouse project
// (MIT, github.com/rorygallagher2024/glasshouse) for webOS 9 and later: the usage counter counts 10-minute units, the files count hours.
//   GET /api/oled  ->  {} on a TV without these counters, or any of {hours, refreshEvery, refreshIn, lastRefreshAt, lastShortAt,
//                      shortCount, refreshCount, failures}
const fs = require('fs');
const P = require('./paths'),
  web = require('./web');

const KEEP = 60 * 1000; // the counters move every ten minutes: one reading a minute is plenty
const num = f => {
  try {
    const m = /^\s*(\d{1,9})\b/.exec(fs.readFileSync(P.PNWASH + '/' + f, 'utf8'));
    return m ? +m[1] : null;
  } catch (_) {
    return null;
  }
};
// usage: the service's counter in 10-minute units (null without one); files: the numbers read from the panel's own folder
function figures(usage, files) {
  const o = {},
    set = (k, v) => {
      if (typeof v === 'number' && v === v && v >= 0) o[k] = v;
    };
  if (typeof usage === 'number' && usage > 0) set('hours', Math.floor(usage / 6));
  set('lastShortAt', files.autoOffRsLastTime);
  set('lastRefreshAt', files.autoJbLastTime);
  set('refreshEvery', files.autoJbInterval);
  set('shortCount', files.completedOffRsCount);
  set('refreshCount', files.completedJbCount);
  set('failures', files.failAlertCount);
  // hours of use left before the next Pixel Refresher; a counter that is behind its last run (a replaced board) gives none
  if (o.hours !== undefined && o.refreshEvery > 0 && o.lastRefreshAt !== undefined && o.hours >= o.lastRefreshAt)
    o.refreshIn = Math.max(0, o.refreshEvery - (o.hours - o.lastRefreshAt));
  return o;
}

function create(ctx) {
  let kept = null,
    at = 0;
  async function read() {
    if (kept && Date.now() - at < KEEP) return kept;
    const files = {};
    for (const f of ['autoOffRsLastTime', 'autoJbLastTime', 'autoJbInterval', 'completedOffRsCount', 'completedJbCount', 'failAlertCount'])
      files[f] = num(f);
    let usage = null;
    try {
      const r = await ctx.luna('luna://com.webos.service.panelcontroller/getPanelUsageTime', {});
      if (r && typeof r.panelUsageTime === 'number') usage = r.panelUsageTime;
    } catch (_) {}
    kept = figures(usage, files);
    at = Date.now();
    return kept;
  }
  return { name: 'oled', paths: ['/api/oled'], handle: async (req, res) => web.json(res, await read()), read };
}

module.exports = { create, figures };
