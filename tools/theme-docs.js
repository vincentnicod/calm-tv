// Generates the table of theme settings for docs/themes.md from SCHEMA in helper/themeschema.js, so the two cannot drift apart.
//   node tools/theme-docs.js          rewrites the table between the markers in docs/themes.md
const fs = require('fs'),
  path = require('path');
const { SCHEMA } = require('../helper/themeschema.js');
const show = v => (v === null ? 'empty' : typeof v === 'string' && v === '' ? 'none' : '`' + v + '`');
function table() {
  const rows = ['| Key | Values | Default | |', '|---|---|---|---|'];
  let group = '';
  for (const [key, type, spec, def, doc] of SCHEMA) {
    const g = key.split('.')[0];
    if (g !== group) {
      group = g;
      rows.push('| **' + g + '** | | | |');
    }
    const values =
      type === 'color'
        ? '`#rrggbb`'
        : type === 'color?'
          ? '`#rrggbb` or empty'
          : type === 'bool'
            ? '`true` or `false`'
            : type === 'enum'
              ? spec.map(x => '`' + x + '`').join(', ')
              : type === 'file'
                ? 'a file name'
                : (type === 'auto' ? 'px, ' : '') + spec[0] + ' to ' + spec[1] + (type === 'int' || type === 'auto' ? '' : '');
    rows.push('| `' + key + '` | ' + values + ' | ' + show(def) + ' | ' + doc.replace(/\|/g, '\\|') + ' |');
  }
  return '<!-- schema:start -->\n' + rows.join('\n') + '\n<!-- schema:end -->';
}
module.exports = { table };
if (require.main === module) {
  const f = path.join(__dirname, '..', 'docs', 'themes.md'),
    s = fs.readFileSync(f, 'utf8');
  const a = s.indexOf('<!-- schema:start -->'),
    b = s.indexOf('<!-- schema:end -->');
  if (a < 0 || b < 0) {
    console.error('markers missing in docs/themes.md');
    process.exit(1);
  }
  fs.writeFileSync(f, s.slice(0, a) + table() + s.slice(b + '<!-- schema:end -->'.length));
  console.log('docs/themes.md updated');
}
