#!/bin/sh
# Timings from a TV, read-only, from the lines the launcher, the Inputs picker and the Input key write to the service log:
#   sh tools/perf-tv.sh <tv-ip>
# - launcher: milliseconds from the page load to the first drawing from the saved layout ("cached") and to the drawing with the
#   service's answer ("ready"), each time Home was opened;
# - Input key: from the key press (scripts/inputkey.sh) to the picker's first painted frame ("painted"), in milliseconds;
# - Live TV: milliseconds from choosing a channel to moving picture, with the try that played (src or typed HLS).
# Use the TV for a while first (open Home a few times, press the Input key, switch channels): the log is in RAM and starts again at boot.
# Changes nothing on the TV. Needs SSH as root with a key.
IP="$1"
[ -n "$IP" ] || { echo "usage: sh tools/perf-tv.sh <tv-ip>" >&2; exit 2; }
ssh -o BatchMode=yes -o ConnectTimeout=8 "root@$IP" 'cat /tmp/cleanyourtv-helper.log' | awk '
  # lines look like "<uptime> perf launcher ready 412" or "<uptime> picker painted"
  $2 == "perf" && $3 == "launcher" { L[$4] = L[$4] " " $5; n[$4]++ }
  $2 == "perf" && $3 == "key" { key = $5; mode = $4 }
  $2 == "picker" && $3 == "painted" && key != "" { K = K " " int(($1 - key) * 1000) "(" mode ")"; key = "" }
  $2 == "perf" && $3 == "live" && $4 == "playing" { V = V " " $5 "(" $8 " try " $7 ")" }
  END {
    print "launcher, page load to first drawing from the saved layout (ms):" (L["cached"] == "" ? " none yet" : L["cached"])
    print "launcher, page load to drawing with the service answer (ms):" (L["ready"] == "" ? " none yet" : L["ready"])
    print "Input key, key press to the picker on screen (ms, mode):" (K == "" ? " none yet" : K)
    print "Live TV, channel chosen to moving picture (ms):" (V == "" ? " none yet" : V)
  }'
