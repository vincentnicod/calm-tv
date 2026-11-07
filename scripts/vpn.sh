#!/bin/sh
# The VPN (Customise > VPN): the WireGuard tunnel cytv0, run by wireguard-go (userspace: the TV's kernel has no WireGuard), and the routes
# and firewall rules that send the TV's IPv4 traffic through it. Called by the service (helper/vpn.js), which gives the tunnel its keys
# over wireguard-go's control socket. All of it lives in RAM: a restart of the TV, or `vpn.sh down`, leaves nothing behind.
#   vpn.sh start                                   start wireguard-go if it is not running, wait for its control socket
#   vpn.sh net ADDR ENDPOINT PORT DNS MTU KILL     the tunnel's address, the routes, DNS through the tunnel, IPv6 blocked;
#                                                  KILL=1 also blocks any traffic that would leave outside the tunnel (kill switch)
#   vpn.sh check ENDPOINT                          put back what the TV's network manager may have dropped (routes, DNS order)
#   vpn.sh down                                    remove all of it and stop wireguard-go
#   vpn.sh status                                  "process=0|1 tunnel=0|1 routes=0|1 kill=0|1"
# This TV has no policy routing (ip rule) and no IPv6 firewall, so all of IPv4 goes to the tunnel with two half routes (0/1 and 128/1, more
# precise than the default route), the server itself keeps a route through the router, and global IPv6 is made unreachable instead.
[ -n "$CYTV_BIN" ] && PATH=$CYTV_BIN:$PATH
D=${CYTV_DIR:-/media/developer/cleanyourtv}
WG=${CYTV_WG:-$D/wireguard-go}
RUN=${CYTV_VPN_RUN:-/var/run/wireguard}
IF=cytv0
SOCK=$RUN/$IF.sock
EPFILE=${CYTV_VPN_EP:-/tmp/cleanyourtv-vpn.endpoint}
LOG=${CYTV_VPN_LOG:-/tmp/cleanyourtv-vpn.log}
# lifesgoodwithoutspying's DNS filter, when it runs, sends its own questions upstream from these source ports (its defaults); those are the
# ones to send through the tunnel, while every other DNS packet first goes through the filter
NOSPY_UDP=15354
NOSPY_TCP=15355:15483

running() { pgrep -f "[w]ireguard-go $IF" >/dev/null 2>&1; }

start() {
  if ! running; then
    rm -f "$SOCK"
    [ -x "$WG" ] || { echo "wireguard-go is missing" >&2; return 1; }
    # foreground mode, sent to the background here: the process outlives this script and the service (a service restart keeps the VPN)
    LOG_LEVEL=error GOMAXPROCS=2 WG_PROCESS_FOREGROUND=1 nohup "$WG" "$IF" </dev/null >>"$LOG" 2>&1 &
  fi
  i=0
  while [ $i -lt 50 ]; do
    [ -S "$SOCK" ] && return 0
    i=$((i + 1))
    sleep 0.1
  done
  echo "wireguard-go did not start" >&2
  return 1
}

# the router: "default via GW dev IFACE ..."
gateway() {
  set -- $(ip -4 route show default 2>/dev/null | head -1)
  GW=""
  DEV=""
  while [ $# -gt 0 ]; do
    case $1 in
      via) GW=$2; shift ;;
      dev) DEV=$2; shift ;;
    esac
    shift
  done
}
endpoint_route() {
  gateway
  [ -n "$GW" ] && ip route replace "$1/32" via "$GW" dev "$DEV"
}
# The network manager keeps host routes through the router for its DNS servers and its internet check; they are more precise than the
# half routes, so they go into the tunnel too (DNS is redirected anyway; the internet check must not be refused by the kill switch).
host_routes() {
  gateway
  [ -n "$GW" ] || return 0
  ep=$(cat "$EPFILE" 2>/dev/null)
  ip -4 route show 2>/dev/null | while read -r dst via gw rest; do
    [ "$via" = via ] && [ "$gw" = "$GW" ] || continue
    case $dst in
      default | */* | "$ep") continue ;;
    esac
    ip route replace "$dst/32" dev $IF
  done
}
routes() {
  ip route replace 0.0.0.0/1 dev $IF && ip route replace 128.0.0.0/1 dev $IF || return 1
  host_routes
  ip -6 route replace unreachable ::/1 2>/dev/null
  ip -6 route replace unreachable 8000::/1 2>/dev/null
  return 0
}

dns_off() {
  while iptables -t nat -D OUTPUT -p udp --sport $NOSPY_UDP --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  while iptables -t nat -D OUTPUT -p tcp --sport $NOSPY_TCP --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  while iptables -t nat -D OUTPUT -p udp --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  while iptables -t nat -D OUTPUT -p tcp --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  iptables -t nat -F CYTV_VPN_DNS 2>/dev/null
  iptables -t nat -X CYTV_VPN_DNS 2>/dev/null
  return 0
}
# The jumps: the DNS filter's own upstream questions first (before its rule that lets them pass), everything else last (after its rule
# that diverts DNS to the filter), so the filter keeps working and its answers come from the VPN's DNS server.
dns_jumps() {
  iptables -t nat -I OUTPUT 1 -p udp --sport $NOSPY_UDP --dport 53 -j CYTV_VPN_DNS
  iptables -t nat -I OUTPUT 2 -p tcp --sport $NOSPY_TCP --dport 53 -j CYTV_VPN_DNS
  iptables -t nat -A OUTPUT -p udp --dport 53 -j CYTV_VPN_DNS
  iptables -t nat -A OUTPUT -p tcp --dport 53 -j CYTV_VPN_DNS
}
dns_on() {
  dns_off
  [ -n "$1" ] || return 0
  iptables -t nat -N CYTV_VPN_DNS || return 1
  iptables -t nat -A CYTV_VPN_DNS -d 127.0.0.0/8 -j RETURN
  iptables -t nat -A CYTV_VPN_DNS -p udp -j DNAT --to-destination "$1:53"
  iptables -t nat -A CYTV_VPN_DNS -p tcp -j DNAT --to-destination "$1:53"
  dns_jumps
}
# another tool that adds its DNS rules after ours (the DNS filter starting later) would come after the last jump: put the jumps back
dns_order() {
  iptables -t nat -S CYTV_VPN_DNS >/dev/null 2>&1 || return 0
  last=$(iptables -t nat -S OUTPUT 2>/dev/null | tail -1)
  case $last in
    *CYTV_VPN_DNS*) return 0 ;;
  esac
  while iptables -t nat -D OUTPUT -p udp --sport $NOSPY_UDP --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  while iptables -t nat -D OUTPUT -p tcp --sport $NOSPY_TCP --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  while iptables -t nat -D OUTPUT -p udp --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  while iptables -t nat -D OUTPUT -p tcp --dport 53 -j CYTV_VPN_DNS 2>/dev/null; do :; done
  dns_jumps
}

kill_off() {
  while iptables -D OUTPUT -j CYTV_VPN 2>/dev/null; do :; done
  iptables -F CYTV_VPN 2>/dev/null
  iptables -X CYTV_VPN 2>/dev/null
  return 0
}
# the kill switch: what leaves the TV goes through the tunnel, stays on the home network, or is the tunnel itself; the rest is refused
kill_on() {
  kill_off
  iptables -N CYTV_VPN || return 1
  iptables -A CYTV_VPN -o lo -j RETURN
  iptables -A CYTV_VPN -o $IF -j RETURN
  for n in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 224.0.0.0/4 255.255.255.255/32; do
    iptables -A CYTV_VPN -d $n -j RETURN
  done
  iptables -A CYTV_VPN -p udp -d "$1" --dport "$2" -j RETURN
  iptables -A CYTV_VPN -j REJECT
  iptables -I OUTPUT 1 -j CYTV_VPN
}

net() {
  [ $# -eq 6 ] || { echo "usage: vpn.sh net ADDR ENDPOINT PORT DNS MTU KILL" >&2; return 2; }
  ip link show $IF >/dev/null 2>&1 || { echo "the tunnel is not up" >&2; return 1; }
  ip -4 addr flush dev $IF
  ip -4 addr add "$1" dev $IF || return 1
  ip link set $IF mtu "$5" up || return 1
  old=$(cat "$EPFILE" 2>/dev/null)
  [ -n "$old" ] && [ "$old" != "$2" ] && ip route del "$old/32" 2>/dev/null
  echo "$2" >"$EPFILE"
  endpoint_route "$2"
  routes || return 1
  dns_on "$4" || return 1
  if [ "$6" = 1 ]; then kill_on "$2" "$3" || return 1; else kill_off; fi
  return 0
}

check() {
  ip link show $IF >/dev/null 2>&1 || return 1
  [ -n "$(ip route show "$1/32" 2>/dev/null)" ] || endpoint_route "$1"
  [ -n "$(ip route show 0.0.0.0/1 2>/dev/null)" ] || routes
  host_routes
  dns_order
  return 0
}

down() {
  kill_off
  dns_off
  ip route del 0.0.0.0/1 dev $IF 2>/dev/null
  ip route del 128.0.0.0/1 dev $IF 2>/dev/null
  ip -6 route del unreachable ::/1 2>/dev/null
  ip -6 route del unreachable 8000::/1 2>/dev/null
  ep=$(cat "$EPFILE" 2>/dev/null)
  [ -n "$ep" ] && ip route del "$ep/32" 2>/dev/null
  rm -f "$EPFILE"
  if running; then
    pkill -f "[w]ireguard-go $IF"
    i=0
    while running && [ $i -lt 30 ]; do
      i=$((i + 1))
      sleep 0.1
    done
    running && pkill -9 -f "[w]ireguard-go $IF"
  fi
  ip link del $IF 2>/dev/null
  rm -f "$SOCK"
  return 0
}

status() {
  p=0; t=0; r=0; k=0
  running && p=1
  ip link show $IF >/dev/null 2>&1 && t=1
  [ -n "$(ip route show 0.0.0.0/1 dev $IF 2>/dev/null)" ] && r=1
  iptables -S CYTV_VPN >/dev/null 2>&1 && k=1
  echo "process=$p tunnel=$t routes=$r kill=$k"
}

cmd=$1
[ $# -gt 0 ] && shift
case $cmd in
  start) start ;;
  net) net "$@" ;;
  check) check "$@" ;;
  down) down ;;
  status) status ;;
  *) echo "usage: vpn.sh start|net|check|down|status" >&2; exit 2 ;;
esac
