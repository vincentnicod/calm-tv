// Weather beside the launcher's clock (Customise > Weather): the temperature and the sky now, for a city chosen in the launcher, from
// Open-Meteo (open-meteo.com: no account, no key). Only that city's coordinates are sent, at most every 15 minutes; off until a city is
// chosen.   GET /api/weather?city=lausanne  ->  {city, temp, code (WMO weather code), day}
const fetch = require('./fetch'),
  web = require('./web');

// the cities the launcher offers, [latitude, longitude]
const CITIES = {
  geneve: [46.2044, 6.1432],
  lausanne: [46.5197, 6.6323],
  neuchatel: [46.99, 6.9293],
  fribourg: [46.8065, 7.162],
  sion: [46.2331, 7.3606],
  berne: [46.948, 7.4474],
  bale: [47.5596, 7.5886],
  lucerne: [47.0502, 8.3093],
  zurich: [47.3769, 8.5417],
  lugano: [46.0037, 8.9511],
};
const KEEP = 15 * 60 * 1000;

function create(ctx) {
  const cache = {},
    get = (ctx && ctx.read) || fetch.read;
  async function now(city) {
    const c = CITIES[city],
      hit = cache[city];
    if (hit && Date.now() - hit.at < KEEP) return hit.data;
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      c[0] +
      '&longitude=' +
      c[1] +
      '&current=temperature_2m,weather_code,is_day&timezone=auto';
    const r = await get(url, { headers: { 'User-Agent': 'cleanyourtv' }, maxBytes: 64 * 1024, totalMs: 10000, idleMs: 8000, redirects: 2 });
    const cur = JSON.parse(r.body.toString('utf8')).current || {};
    if (typeof cur.temperature_2m !== 'number' || typeof cur.weather_code !== 'number') throw new Error('no current weather in the answer');
    const data = { temp: Math.round(cur.temperature_2m), code: cur.weather_code, day: cur.is_day !== 0 };
    cache[city] = { at: Date.now(), data };
    return data;
  }
  async function handle(req, res) {
    const city = (/[?&]city=([a-z]{1,20})(?:&|$)/.exec(req.url) || [])[1] || '';
    if (!Object.prototype.hasOwnProperty.call(CITIES, city)) return web.json(res, { error: 'unknown city' }, 400);
    try {
      web.json(res, Object.assign({ city }, await now(city)));
    } catch (e) {
      // the last answer, a while old, is better than nothing while the network is away
      const hit = cache[city];
      web.json(res, hit ? Object.assign({ city, stale: true }, hit.data) : { city, error: String((e && e.message) || e) });
    }
  }
  return { name: 'weather', paths: ['/api/weather'], handle };
}

module.exports = { create, CITIES };
