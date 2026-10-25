// Runs the tests in tools/test (each *.test.js on its own, in a fresh process) and prints a summary.
//   node tools/test.js                 all tests with this Node
//   node tools/test.js live theme      only these
//   node tools/test.js --quiet         print only failures and the summary
// tools/check.sh runs this with Node 8.12 (webOS 5 and 6) and with the current Node. Runs on Node 8.
'use strict';
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const dir = path.join(__dirname, 'test');
const args = process.argv.slice(2);
const quiet = args.indexOf('--quiet') >= 0;
const only = args.filter(a => a.indexOf('--') !== 0);
const files = fs
  .readdirSync(dir)
  .filter(f => /\.test\.js$/.test(f))
  .filter(f => !only.length || only.indexOf(f.replace(/\.test\.js$/, '')) >= 0)
  .sort();
let failedFiles = [],
  checks = 0;
const t0 = Date.now();
for (const f of files) {
  const r = cp.spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.status !== 0 && r.stderr ? r.stderr : '');
  const lines = out.split('\n').filter(Boolean);
  const okN = lines.filter(l => /^ok {3}/.test(l)).length,
    failN = lines.filter(l => /^FAIL /.test(l)).length;
  checks += okN + failN;
  const good = r.status === 0 && failN === 0;
  if (!good) failedFiles.push(f);
  console.log(
    (good ? 'ok   ' : 'FAIL ') +
      f +
      ' (' +
      okN +
      ' checks' +
      (failN ? ', ' + failN + ' failed' : '') +
      (r.error ? ', ' + r.error.message : '') +
      ')'
  );
  if (!quiet || !good) for (const l of lines) if (!quiet || !/^ok {3}/.test(l)) console.log('     ' + l);
}
console.log(
  '\n' +
    (failedFiles.length
      ? failedFiles.length + ' test file(s) failed: ' + failedFiles.join(', ')
      : 'all ' + checks + ' checks in ' + files.length + ' files passed') +
    ' on Node ' +
    process.version +
    ' (' +
    Math.round((Date.now() - t0) / 1000) +
    ' s)'
);
process.exit(failedFiles.length ? 1 : 0);
