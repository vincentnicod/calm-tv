// The weather beside the clock (weather.js): only a known city is asked for, answers are kept 15 minutes, and a failed request falls back
// to the last answer. The launcher's settings for it, the idle screen and night mode are checked by apps.js.
const { ok, call, req, memoryConfig, run } = require('./lib');

run(async () => {
  let asked = [],
    fail = false,
    body = { current: { temperature_2m: 11.6, weather_code: 3, is_day: 1 } };
  const read = async url => {
    asked.push(url);
    if (fail) throw new Error('offline');
    return { body: Buffer.from(JSON.stringify(body)) };
  };
  const w = req('weather').create({ read });
  let r = await call(w, '/api/weather?city=paris');
  ok(r.code === 400 && asked.length === 0, 'a city that is not offered is refused, nothing is asked');
  r = await call(w, '/api/weather?city=lausanne');
  ok(
    r.j.temp === 12 &&
      r.j.code === 3 &&
      r.j.day === true &&
      asked.length === 1 &&
      /latitude=46\.5197&longitude=6\.6323/.test(asked[0]) &&
      /^https:\/\/api\.open-meteo\.com\//.test(asked[0]),
    "only that city's coordinates go to Open-Meteo, the temperature is rounded"
  );
  await call(w, '/api/weather?city=lausanne');
  ok(asked.length === 1, 'an answer is kept for a while: the next request does not ask again');
  fail = true;
  r = await call(w, '/api/weather?city=geneve');
  ok(
    r.code === 200 && /offline/.test(r.j.error) && typeof r.j.temp === 'undefined',
    'no network and nothing kept: an error, no made-up weather'
  );
  body = { current: {} };
  fail = false;
  r = await call(w, '/api/weather?city=sion');
  ok(r.j.error && typeof r.j.temp === 'undefined', 'an answer without the weather is not shown');

  // the launcher's settings
  const conf = memoryConfig({});
  const apps = req('apps').create({
    config: conf,
    luna: async () => ({ returnValue: true, apps: [] }),
    version: '1.7.0',
    feature: () => null,
  });
  await call(apps, '/api/config', 'POST', { idle: '10', night: 'off', weather: 'lausanne' });
  let c = conf.get();
  ok(c.idle === '10' && c.night === 'off' && c.weather === 'lausanne', 'the idle screen, night mode and the weather city are kept');
  await call(apps, '/api/config', 'POST', { idle: '7', night: 'maybe', weather: 'paris' });
  c = conf.get();
  ok(c.idle === undefined && c.night === undefined && c.weather === undefined, 'values that are not offered are dropped');
});
