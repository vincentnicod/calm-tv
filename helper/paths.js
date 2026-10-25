// Every place on the TV the service reads or writes. The environment variables point them elsewhere for the tests on a computer
// (tools/test); on the TV none of them is set.
const path = require('path');
const env = process.env;

const D = env.CYTV_DIR || '/media/developer/cleanyourtv';
const SERVICE_DIR = env.CYTV_SERVICE_DIR || '/media/developer/apps/usr/palm/services/com.cleanyourtv.manager.service';

module.exports = {
  D, // the service's own folder: helper files, config.json, the launcher (app/), Live TV data, themes
  SERVICE_DIR, // the installed package (the manager app's service folder)
  CONF: D + '/config.json',
  USAGE: D + '/usage.json',
  TV: D + '/tv.json', // what tvprofile.js found out about this TV
  DISABLE: D + '/DISABLE', // present while LG's Home is chosen
  PICKER_MODE: D + '/picker-mode', // read by scripts/inputkey.sh
  CHANNEL: D + '/channel', // the update channel (a test build tag)
  SOURCE: D + '/source', // "owner/repo [branch]": another repository, for testing
  LIVE: env.CYTV_LIVE_DIR || D + '/live',
  THEMES: env.CYTV_THEMES || path.join(__dirname, 'themes'),
  VOICE: D + '/voice',
  HOOK: D + '/inputhook',
  APP: D + '/app',
  COMPAT: [D + '/compat.json', SERVICE_DIR + '/compat.json'],
  INITD: '/var/lib/webosbrew/init.d',
  SETUP_LOG: '/media/developer/cytv-setup.log',
  SERVICE_LOG: '/tmp/cleanyourtv-helper.log',
  RUNFILE: env.CYTV_RUNFILE || '/tmp/cytv-run.json',
  HOOK_CFG: '/home/root/.config/lginputhook',
  HOOK_LOG: '/tmp/lginput-hook-lginput2.log',
  LASTAPP: '/var/luna/preferences/bootd_last_foreground_app_id.json',
  PROC: env.CYTV_PROC || '/proc',
  HOME_APP: '/usr/palm/applications/com.webos.app.home',
  FULLHOME_APP: '/usr/palm/applications/com.webos.app.fullhome',
  // child processes find the system tools first, as in a login shell on the TV
  ENV: Object.assign({}, env, { PATH: '/usr/bin:/usr/sbin:/bin:/sbin:' + (env.PATH || '') }),
};
