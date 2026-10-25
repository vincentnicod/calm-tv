// Small compatibility layer so the service also runs on the older Node.js of webOS 6 (Node 8): no global URL /
// URLSearchParams, crypto.randomInt, http(s).get(url, options, cb) and mkdirSync({recursive}) do not exist there. Works unchanged on newer Node.
const url = require('url'),
  fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
const { URL, URLSearchParams } = url;

// http(s) options from an address plus extra options (the address form with options came with Node 10.9)
const withUrl = (u, opts) => {
  const x = u instanceof URL ? u : new URL(String(u));
  const o = { protocol: x.protocol, hostname: x.hostname.replace(/^\[|\]$/g, ''), path: x.pathname + x.search };
  if (x.port) o.port = x.port;
  if (x.username) o.auth = decodeURIComponent(x.username) + ':' + decodeURIComponent(x.password);
  return Object.assign(o, opts);
};
const get = (lib, u, opts, cb) => lib.get(withUrl(u, opts), cb);
const request = (lib, u, opts, cb) => lib.request(withUrl(u, opts), cb);

// mkdir -p
const mkdirp = d => {
  try {
    fs.mkdirSync(d);
  } catch (e) {
    if (e.code === 'ENOENT') {
      mkdirp(path.dirname(d));
      fs.mkdirSync(d);
    } else if (e.code !== 'EEXIST') throw e;
  }
};

// crypto.randomInt (Node 14.10 / 12.19): an unbiased random integer in [min, max)
const randomInt = (min, max) => {
  if (crypto.randomInt) return crypto.randomInt(min, max);
  const range = max - min,
    limit = Math.floor(0x100000000 / range) * range;
  let x;
  do {
    x = crypto.randomBytes(4).readUInt32BE(0);
  } while (x >= limit); // reject the uneven top so every value is equally likely
  return min + (x % range);
};

module.exports = { URL, URLSearchParams, get, request, mkdirp, randomInt };
