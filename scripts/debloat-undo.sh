#!/bin/sh
# Undo debloat-stop.sh: restart the systemd daemons, remove the stubs and the hosts lines (dynamic services start on demand again).
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
for b in acr2 admanager sportsalarm adoverlay-service; do
  for m in $(awk -v b="/usr/sbin/$b" 'substr($2,length($2)-length(b)+1)==b {print $2}' /proc/mounts | sort -r); do umount $m 2>/dev/null; done
done
for s in remotelogger service-logger contentminer nudge; do systemctl start $s.service; done
# the copy in RAM that debloat-stop.sh mounts where /etc/hosts is read-only; otherwise the marked lines in /etc/hosts itself
if [ -e /tmp/cleanyourtv-hosts.mounted ]; then umount /etc/hosts 2>/dev/null && rm -f /tmp/cleanyourtv-hosts /tmp/cleanyourtv-hosts.mounted; fi
if grep -q "# cleanyourtv-debloat" /etc/hosts; then
  grep -v "# cleanyourtv-debloat" /etc/hosts > /tmp/hosts.new && cat /tmp/hosts.new > /etc/hosts; rm -f /tmp/hosts.new
fi
