// Switching the debloat on and off while the TV runs (the boot script 15-cleanyourtv-debloat applies it at every start). What it
// stops and blocks is in scripts/debloat-stop.sh; scripts/debloat-undo.sh reverses it.
const P = require('./paths'),
  exec = require('./exec');

function apply(on) {
  const link = P.INITD + '/15-cleanyourtv-debloat';
  if (on) return exec.sh('ln -sf ' + P.D + '/15-cleanyourtv-debloat ' + link + '; sh ' + P.D + '/debloat-stop.sh', 60000);
  return exec.sh('rm -f ' + link + '; sh ' + P.D + '/debloat-undo.sh', 60000);
}

module.exports = { apply };
