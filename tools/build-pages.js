// Builds the pages the TV loads (one file each, as webOS expects) from their sources:
//   app/src/      -> app/index.html            the launcher
//   manager/src/  -> manager/app/index.html    the manager app
// A source folder has index.html with "@include <file>" lines, replaced by those files (CSS under css/, script under js/). Edit the
// sources, then run:
//   node tools/build-pages.js           writes the pages
//   node tools/build-pages.js --check   only checks that the pages match their sources (tools/check.sh runs this)
// The pages run on Chromium 68 (webOS 5): the script stays ES5 (tools/test/pages.test.js checks it). Runs on Node 8.
'use strict';
const fs = require('fs'),
  path = require('path');
const root = path.join(__dirname, '..');
const PAGES = [
  ['app/src', 'app/index.html'],
  ['manager/src', 'manager/app/index.html'],
];

function build(src) {
  const dir = path.join(root, src);
  return (
    fs
      .readFileSync(path.join(dir, 'index.html'), 'utf8')
      .replace(/\n$/, '')
      .split('\n')
      .map(line => {
        const m = /^@include (\S+)$/.exec(line);
        if (!m) return line;
        const f = path.join(dir, m[1]);
        if (f.indexOf(dir + path.sep) !== 0 || !fs.existsSync(f)) throw new Error(src + '/index.html includes a missing file: ' + m[1]);
        return fs.readFileSync(f, 'utf8').replace(/\n$/, '');
      })
      .join('\n') + '\n'
  );
}

if (require.main === module) {
  const check = process.argv.indexOf('--check') >= 0;
  let stale = 0;
  for (const p of PAGES) {
    const out = build(p[0]),
      file = path.join(root, p[1]);
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (out === cur) {
      console.log('ok   ' + p[1] + ' matches ' + p[0]);
      continue;
    }
    if (check) {
      stale++;
      console.log('FAIL ' + p[1] + ' does not match ' + p[0] + ' (run: node tools/build-pages.js)');
    } else {
      fs.writeFileSync(file, out);
      console.log('wrote ' + p[1]);
    }
  }
  process.exit(stale ? 1 : 0);
}
module.exports = { build, PAGES };
