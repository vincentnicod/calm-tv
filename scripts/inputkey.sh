#!/bin/sh
# Run by the inputhook when the remote's Input button is pressed: show the Inputs picker over the current app.
# The service writes how in picker-mode: overlay = the picker app that was started hidden at boot (instant), ondemand = start the picker app
# now and let it close itself after use (older webOS, where a hidden overlay kept the remote), launcher = the launcher's own Inputs list.
# If the picker app is missing, open the launcher's Inputs list instead.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
read UP _ < /proc/uptime   # when the key was pressed, for tools/perf-tv.sh (logged after the work is done)
mark() { (curl -s -m 2 "http://127.0.0.1:8765/api/log?m=perf%20key%20$1%20$UP" </dev/null >/dev/null 2>&1 &); }
M=$(cat /media/developer/cleanyourtv/picker-mode 2>/dev/null)
HOME_INPUTS='{"id":"com.webos.app.home","params":{"inputs":true}}'
if [ "$M" = launcher ]; then
  luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch "$HOME_INPUTS" </dev/null >/dev/null 2>&1
  mark launcher
  exit 0
fi
# the panel is named every time: the same app also shows Quick settings (helper/quick.js)
if [ "$M" = ondemand ]; then P='{"id":"com.cleanyourtv.picker","params":{"panel":"inputs","ondemand":true}}'; else P='{"id":"com.cleanyourtv.picker","params":{"panel":"inputs"}}'; fi
r=$(luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch "$P" </dev/null 2>/dev/null)
case "$r" in *'"returnValue":true'*) mark "$M"; exit 0 ;; esac
luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch "$HOME_INPUTS" </dev/null >/dev/null 2>&1
