#!/bin/sh
# Restore LG's stock Home. "temp": until next reboot only; no arg: also create DISABLE so reboots keep stock Home.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
[ "$1" = temp ] || touch /media/developer/cleanyourtv/DISABLE /media/developer/cleanyourtv/DISABLE-DEBLOAT
# our apps must not be what the TV tries to come back to: close them and point the boot's "last app" at LG's Home
for id in com.cleanyourtv.manager com.cleanyourtv.picker com.cleanyourtv.notify; do
  luna-send -n 1 -w 3000 luna://com.webos.applicationManager/closeByAppId "{\"id\":\"$id\"}" </dev/null >/dev/null 2>&1
done
LASTAPP=/var/luna/preferences/bootd_last_foreground_app_id.json
grep -q cleanyourtv $LASTAPP 2>/dev/null && echo '{"lastAppId":"com.webos.app.home"}' > $LASTAPP
# LG's own Home needs the ad services the debloat blocks (it fails to start without them), so lift the debloat first
[ -f /media/developer/cleanyourtv/debloat-undo.sh ] && sh /media/developer/cleanyourtv/debloat-undo.sh </dev/null >/dev/null 2>&1
# close our page before its files go: the web engine is not restarted with sam, and a page still open would load index.html again from
# the unmounted folder and show "file not found" (-6) until LG's Home wins
luna-send -n 1 -w 3000 luna://com.webos.applicationManager/closeByAppId '{"id":"com.webos.app.home"}' </dev/null >/dev/null 2>&1
for i in 1 2 3 4 5; do pgrep -f "[a]pp-id=com.webos.app.home" >/dev/null || break; sleep 1; done
for m in $(awk '$2 ~ /applications\/com.webos.app.home$/ {print $2}' /proc/mounts | sort -r); do umount $m 2>/dev/null; done
# an airplay child of sam makes the stop wait ~90 s; kill it once the stop has begun
(sleep 3; pkill -9 -f /usr/palm/applications/airplay/LunaExecutable) </dev/null >/dev/null 2>&1 &
systemctl restart sam
for i in $(seq 1 60); do systemctl is-active sam >/dev/null && break; sleep 2; done
sleep 5
# the old web renderer for Home would keep showing the launcher; retry until the stock flutter Home is up
for t in 1 2 3 4; do
  pkill -f "[a]pp-id=com.webos.app.home"
  sleep 3
  luna-send -n 1 -w 10000 -f luna://com.webos.applicationManager/launch '{"id":"com.webos.app.home"}' </dev/null
  sleep 8
  pgrep -f "[f]lutter-client -i com.webos.app.home" >/dev/null && ! pgrep -f "[a]pp-id=com.webos.app.home" >/dev/null && break
done
echo "stock Home restored; rm /media/developer/cleanyourtv/DISABLE to re-enable at next boot"
