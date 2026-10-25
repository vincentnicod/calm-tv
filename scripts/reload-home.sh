#!/bin/sh
# Reload the page of Home. Where the Home renderer can be found (webOS 7 and newer) it is killed and Home is launched
# again. On webOS 6 (Node 8) WebAppMgr keeps the replaced page alive and a relaunch only brings the old page back, so
# there webapp-mgr is restarted. Other versions are never restarted this way.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
if pgrep -f "[a]pp-id=com.webos.app.home" >/dev/null; then
  pkill -f "[a]pp-id=com.webos.app.home"; sleep 2
else
  nm=$(node -p 'parseInt(process.versions.node, 10)' 2>/dev/null)
  if [ "${nm:-99}" -lt 10 ] && systemctl cat webapp-mgr.service >/dev/null 2>&1; then
    systemctl restart webapp-mgr
    for i in $(seq 1 30); do systemctl is-active webapp-mgr >/dev/null && break; sleep 1; done
    sleep 3
  fi
fi
luna-send -n 1 -w 10000 -f luna://com.webos.applicationManager/launch '{"id":"com.webos.app.home"}' </dev/null >/dev/null
