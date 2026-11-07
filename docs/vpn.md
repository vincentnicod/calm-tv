# VPN

The TV's internet traffic can go through a WireGuard VPN server: a VPN provider's server (Proton VPN, Mullvad, IVPN and others give
WireGuard files) or your own. It is set up and switched in **Customise > VPN** on Home; it is off until you turn it on.

## Adding a server

1. Get a WireGuard file for one server. With **Proton VPN**: sign in at account.proton.me, open **Downloads > WireGuard
   configuration**, give the key a name (for example "TV"), choose **Router** or **Linux**, pick a server (a Swiss one keeps Swiss
   services working) and download the `.conf` file. A paid plan is not needed for the free servers.
2. On the TV: **Customise > VPN > Add a server**. The TV shows an address on your home network and a code.
3. Open that address on the phone or computer that has the file, enter the code, choose the file (or paste its text) and give it a
   name. The page closes by itself after ten minutes.

The first server added is the one used. Add more (other countries) the same way and pick one under **Server**.

## Using it

| In Customise > VPN | What it does |
|---|---|
| **Turn on** / **Turn off** | The tunnel starts in a second or two. The date on Home then ends with **· VPN** (**· VPN…** while it waits for the server). It stays on after a restart of the TV. |
| **Server** | The server in use; a change reconnects at once. |
| **Block the internet if the VPN drops** | The kill switch: while the VPN is on, nothing leaves the TV outside the tunnel, so a server that stops answering cuts the internet instead of sending traffic the normal way. The home network (casting, Home Assistant, SSH) still works. |
| **Pause for apps** | Lists the apps that pause the VPN. Choose them in an app's menu (hold OK on it): **Pause the VPN while open**. While that app is in front the VPN is off (and so is the kill switch); it comes back when you go to Home or another app. Use it for an app that wants your own address, such as your TV provider's app. |
| **Remove a server** | Forgets the server and deletes its file. Removing the last one turns the VPN off. |

## What goes through it

- **All of the TV's IPv4 traffic**, the TV's own internet check and its DNS questions included: DNS goes to the server's DNS (Proton's
  `10.2.0.1`), so the name lookups do not go to your internet provider either. lifesgoodwithoutspying's DNS filter keeps working; its
  answers come from the VPN's DNS server.
- **IPv6 does not go through it.** This TV's kernel has no IPv6 firewall, so while the VPN is on, IPv6 addresses outside your home
  network are made unreachable. Apps then use IPv4, which goes through the tunnel.
- **Your home network** (other devices, the router) is reached directly, as before.

Streaming services often refuse VPN addresses or show another country's catalogue; that depends on the service and the server. Your
TV provider's app may need your own connection: pause the VPN for it (above).

## How it works

`wireguard-go` (the official userspace WireGuard, MIT; the TV's kernel has no WireGuard) runs as the tunnel `cytv0`. The service
(`helper/vpn.js`) reads the file, gives the tunnel its keys over wireguard-go's control socket and checks it every 30 seconds (a stopped
tunnel is started again, routes the network manager dropped are put back). `scripts/vpn.sh` sets the rest, all in RAM: two half routes
(`0.0.0.0/1`, `128.0.0.0/1`) through the tunnel, the server itself through the router, the DNS redirect (`iptables -t nat`, chain
`CYTV_VPN_DNS`), the kill switch (chain `CYTV_VPN`) and the unreachable IPv6 routes. This TV has no policy routing (`ip rule`), which
is why it is done with routes rather than the way `wg-quick` does it.

The files with the private keys are kept in `/media/developer/cleanyourtv/vpn/`, for root only. They are never logged, shown or put in
a report; Share log and `tools/diagnose.sh` show only the VPN's state with addresses hidden. The setup page is on your home network
only, needs the code shown on the TV, closes after ten minutes or five wrong codes, and is plain HTTP like the Live TV setup page:
add servers at home, not on a shared network.

## Checking it

```sh
ssh root@<tv-ip> 'sh /media/developer/cleanyourtv/vpn.sh status; curl -s localhost:8765/api/vpn'
```

`process=1 tunnel=1 routes=1` and `"state":"connected"` mean it works. The tunnel's own errors are in `/tmp/cleanyourtv-vpn.log`.
To take it all down by hand: `sh /media/developer/cleanyourtv/vpn.sh down` (the setting stays on, so the service brings it back within
30 seconds; turn it off in Customise for good). A restart of the TV with the VPN off leaves nothing of it behind; the uninstall removes it.
