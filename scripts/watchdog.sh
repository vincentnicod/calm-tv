#!/bin/sh
# The service's watchdog, started by 10-cleanyourtv-home (one per boot, also while LG's Home is selected or showing). Every 10 seconds it
# asks the service (/api/version: answered by the service alone, so a busy app manager does not look like a dead service):
#   - a service that is not running is started again, unless bootstrap.sh is at work (a setup or an update stops it on purpose). The log of
#     the run that ended goes to cleanyourtv-helper.crash.log, of which the last 400 lines are kept. A service that stops again at once is
#     started less often (after 10, 20 ... up to 120 seconds).
#   - while our launcher is Home and the service stays unreachable for about a minute, LG's Home comes back until the next restart.
# The whole script is one block that ends in exit: the shell reads all of it first, so an update that copies a new watchdog.sh over this
# file does not confuse the running copy (bootstrap.sh stops it and the boot script starts the new one).
# Started on the idea of cleanyourtv-WebOS's watchdog (pull requests 66 and 70). The CYTV_ variables are for the tests; on the TV none is set.
{
  export PATH=${CYTV_BIN:+$CYTV_BIN:}/usr/bin:/usr/sbin:/bin:/sbin:$PATH
  L=${CYTV_DIR:-/media/developer/cleanyourtv}
  LOG=${CYTV_BOOT_LOG:-/tmp/cleanyourtv-boot.log}
  SLOG=${CYTV_SERVICE_LOG:-/tmp/cleanyourtv-helper.log}
  CRASH=${SLOG%.log}.crash.log
  MOUNTS=${CYTV_MOUNTS:-/proc/mounts}
  EVERY=${CYTV_WATCH_SECS:-10}
  H=/usr/palm/applications/com.webos.app.home
  up() { cut -d' ' -f1 /proc/uptime 2>/dev/null; }
  keep_log() {
    [ -s "$SLOG" ] || return 0
    { echo "=== the log of a run that ended (uptime $(up)) ==="; tail -n 200 "$SLOG"; } >>"$CRASH" 2>/dev/null
    n=$(wc -l <"$CRASH" 2>/dev/null)
    if [ "${n:-0}" -gt 400 ]; then tail -n 400 "$CRASH" >"$CRASH.tmp" && mv "$CRASH.tmp" "$CRASH"; fi
  }

  bad=0       # checks in a row without an answer
  gave_up=0   # LG's Home was brought back; a new answer arms this again
  fails=0     # starts in a row that did not bring the service back
  hold=0      # checks to wait before the next start
  while [ -f "$L/helper.js" ]; do
    sleep "$EVERY"
    if curl -s -m 3 -o /dev/null http://127.0.0.1:8765/api/version; then
      bad=0
      gave_up=0
      fails=0
      hold=0
      continue
    fi
    pgrep -f "[b]ootstrap.sh" >/dev/null && continue
    if ! pgrep -f "$L/helper.js" >/dev/null; then
      if [ $hold -gt 0 ]; then
        hold=$((hold - 1))
      else
        fails=$((fails + 1))
        hold=$((fails - 1))
        [ $hold -gt 11 ] && hold=11
        echo "$(up) watchdog: the service had stopped; starting it again (start $fails in a row)" >>"$LOG"
        keep_log
        (cd / && nohup node "$L/helper.js" >"$SLOG" 2>&1 </dev/null &)
      fi
    fi
    if [ $gave_up = 0 ] && grep -q " $H " "$MOUNTS"; then
      bad=$((bad + 1))
      if [ $bad -ge 6 ]; then
        echo "$(up) watchdog: no answer for a minute; LG's Home until the next restart" >>"$LOG"
        sh "$L/undo-home.sh" temp
        gave_up=1
      fi
    fi
  done
  exit 0
}
