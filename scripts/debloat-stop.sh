#!/bin/sh
# Stop LG telemetry/ad daemons and keep the on-demand ones from starting (RAM-only; a reboot restores them unless run from init.d).
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
L=/media/developer/cleanyourtv
for s in remotelogger service-logger contentminer nudge; do systemctl stop $s.service 2>&1 | sed "s/^/$s: /"; done
# luna dynamic services: bind a do-nothing stub over the binary so ls-hubd cannot start them
printf '#!/bin/sh\nexit 0\n' > $L/stub-noop; chmod +x $L/stub-noop
# not admanager: Disney+ and HBO Max wait for it at start. A stub left by an earlier version is lifted here
for m in $(awk '$2 ~ /\/usr\/sbin\/admanager$/ {print $2}' /proc/mounts | sort -r); do umount $m 2>/dev/null; done
for b in acr2 sportsalarm adoverlay-service; do
  [ -e /usr/sbin/$b ] || continue
  grep -q " /usr/sbin/$b " /proc/mounts || mount --bind $L/stub-noop /usr/sbin/$b
  pkill -9 -f "^/usr/sbin/$b"
done
# ad servers (resolved + verified as LG ad endpoints); the marker lets debloat-undo.sh remove them
add_hosts() {
  cat <<'H'
127.0.0.1 eic.ads.lgtvcommon.com nl.ad.lgsmartad.com nl.info.lgsmartad.com # cleanyourtv-debloat
::1 eic.ads.lgtvcommon.com nl.ad.lgsmartad.com nl.info.lgsmartad.com # cleanyourtv-debloat
H
}
if ! grep -q "# cleanyourtv-debloat" /etc/hosts; then
  if [ -w /etc/hosts ] && add_hosts >> /etc/hosts 2>/dev/null; then
    :
  else
    # on some TVs /etc/hosts is on the read-only system partition (issue 11): a copy in RAM is mounted over it until the next restart
    cp /etc/hosts /tmp/cleanyourtv-hosts && add_hosts >> /tmp/cleanyourtv-hosts && mount --bind /tmp/cleanyourtv-hosts /etc/hosts && touch /tmp/cleanyourtv-hosts.mounted \
      || echo "hosts: /etc/hosts cannot be changed on this TV; the ad servers are not blocked"
  fi
fi
