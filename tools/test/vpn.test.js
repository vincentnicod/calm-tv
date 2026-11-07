// The VPN (vpn.js and scripts/vpn.sh): a provider's WireGuard file is read and checked, added from the pairing page, given to the tunnel
// over its control socket, kept up, paused for chosen apps; vpn.sh sets the routes, DNS and kill switch. Stand-ins for vpn.sh, for
// wireguard-go's control socket and for the TV's ip and iptables.
const fs = require('fs'),
  net = require('net'),
  http = require('http'),
  path = require('path'),
  cp = require('child_process');
const { root, tmp, ok, call, req, run, memoryConfig } = require('./lib');

const KEY_A = 'aGVsbG8gd29ybGQgaGVsbG8gd29ybGQgaGVsbG8gISE=', // 32 bytes
  KEY_B = 'c2VydmVyIHB1YmxpYyBrZXkgZm9yIHRoZSB0ZXN0cyE=';
const PROTON = `[Interface]
# Key for TV
# Bouncing = 3
# NetShield = 1
PrivateKey = ${KEY_A}
Address = 10.2.0.2/32
DNS = 10.2.0.1

[Peer]
# CH#12
PublicKey = ${KEY_B}
AllowedIPs = 0.0.0.0/0
Endpoint = 185.159.157.1:51820
`;

run(async () => {
  const w = path.join(tmp, 'vpn'),
    calls = path.join(w, 'calls'),
    sock = path.join(w, 'wg.sock');
  fs.mkdirSync(w);
  // vpn.sh: every call is noted; `status` answers from a file; a file fail-<cmd> makes that command fail
  const sh = path.join(w, 'vpn.sh');
  fs.writeFileSync(
    sh,
    'echo "$*" >> ' +
      calls +
      '\n' +
      '[ -f ' +
      w +
      '/fail-$1 ] && { echo "it broke" >&2; exit 1; }\n' +
      '[ "$1" = status ] && cat ' +
      w +
      '/status\nexit 0\n'
  );
  fs.writeFileSync(path.join(w, 'status'), 'process=1 tunnel=1 routes=1 kill=0\n');
  process.env.CYTV_VPN_SH = sh;
  const sets = [];
  let handshake = Math.floor(Date.now() / 1000) - 5;
  const uapiSrv = net.createServer(s => {
    let b = '';
    s.on('data', d => {
      b += d;
      if (!/\n\n$/.test(b)) return;
      if (/^set=1/.test(b)) {
        sets.push(b);
        s.end('errno=0\n\n');
      } else s.end('last_handshake_time_sec=' + handshake + '\nrx_bytes=1200\ntx_bytes=300\nerrno=0\n\n');
    });
  });
  await new Promise(r => uapiSrv.listen(sock, r));

  const vm = req('vpn');
  // ---- the file ----
  const c = vm.parse(PROTON);
  ok(
    c.address === '10.2.0.2/32' && c.dns === '10.2.0.1' && c.host === '185.159.157.1' && c.port === 51820 && c.mtu === 1420,
    "a Proton VPN file: the tunnel's address, the DNS server, the server and the default MTU"
  );
  ok(
    c.privateKey === Buffer.from(KEY_A, 'base64').toString('hex') &&
      c.publicKey.length === 64 &&
      c.presharedKey === '' &&
      c.keepalive === 25,
    'its keys as the hex the control socket wants, a keepalive so the session stays open'
  );
  const bad = text => {
    try {
      vm.parse(text);
      return '';
    } catch (e) {
      return e.message;
    }
  };
  ok(/WireGuard config/.test(bad('hello')), 'a file that is not WireGuard is refused');
  ok(/all traffic/.test(bad(PROTON.replace('0.0.0.0/0', '10.0.0.0/8'))), 'a tunnel for a few addresses only is refused');
  ok(/more than one server/.test(bad(PROTON + '\n[Peer]\nPublicKey = ' + KEY_B + '\n')), 'a file with two servers is refused');
  ok(/not a WireGuard key/.test(bad(PROTON.replace(KEY_A, 'short'))), 'a broken key is refused');
  ok(vm.parse(PROTON.replace('185.159.157.1:51820', 'ch-12.protonvpn.net:51820')).host === 'ch-12.protonvpn.net', 'a server by name');
  ok(
    vm.naming('TV-CH-12.conf').cc === 'CH' && vm.naming('wg-US-NY-3').cc === 'US' && vm.naming('My server').cc === '',
    'the country code in a file name'
  );
  const set = vm.setRequest(c, '185.159.157.1');
  ok(
    /^set=1\nprivate_key=[0-9a-f]{64}\nreplace_peers=true\npublic_key=[0-9a-f]{64}\nendpoint=185\.159\.157\.1:51820\npersistent_keepalive_interval=25\nreplace_allowed_ips=true\nallowed_ip=0\.0\.0\.0\/0$/.test(
      set
    ),
    "the control socket's settings"
  );

  // ---- the service part ----
  const logs = [];
  const conf = memoryConfig({});
  const v = vm.create({ config: conf, socket: sock, log: m => logs.push(m), lookup: (h, cb) => cb(null, '185.159.157.9') });
  let r = await call(v, '/api/vpn');
  ok(r.j.state === 'none' && r.j.on === false, 'no server yet');
  r = await call(v, '/api/vpn', 'POST', { on: true });
  ok(r.code === 409, 'it cannot be turned on without a server');

  // the pairing page: the code shown on the TV, then the file
  r = await call(v, '/api/vpn/pair', 'POST');
  const code = r.j.code;
  const post = form =>
    new Promise(res => {
      const body = Object.keys(form)
        .map(k => k + '=' + encodeURIComponent(form[k]))
        .join('&');
      const q = http.request({ host: '127.0.0.1', port: 8770, path: '/add', method: 'POST' }, a => {
        let t = '';
        a.on('data', d => (t += d));
        a.on('end', () => res({ code: a.statusCode, t }));
      });
      q.end(body);
    });
  let p = await post({ code: 'nope', conf: PROTON });
  ok(p.code === 403, 'the pairing page wants the code shown on the TV');
  p = await post({ code, conf: 'not a file', name: 'x' });
  ok(p.code === 400 && /WireGuard/.test(p.t), 'a bad file is refused with the reason');
  p = await post({ code, conf: PROTON, name: 'TV-CH-12' });
  ok(p.code === 200, 'a good file is added');
  r = await call(v, '/api/vpn');
  const files = fs.readdirSync(path.join(process.env.CYTV_DIR, 'vpn'));
  ok(
    r.j.servers.length === 1 &&
      r.j.servers[0].name === 'TV-CH-12' &&
      r.j.servers[0].cc === 'CH' &&
      r.j.server === 'tv-ch-12' &&
      r.j.state === 'off',
    'the server is listed, chosen, and the VPN stays off until it is turned on'
  );
  ok(
    (fs.statSync(path.join(process.env.CYTV_DIR, 'vpn', 'tv-ch-12.conf')).mode & 0o077) === 0 && files.indexOf('servers.json') >= 0,
    'its file is for root only'
  );

  // on: the tunnel is started, given its keys, then its routes
  fs.writeFileSync(calls, '');
  r = await call(v, '/api/vpn', 'POST', { on: true });
  ok(
    fs.readFileSync(calls, 'utf8') === 'start\nnet 10.2.0.2/32 185.159.157.1 51820 10.2.0.1 1420 0\n' &&
      sets.length === 1 &&
      /endpoint=185\.159\.157\.1:51820/.test(sets[0]),
    'turned on: wireguard-go starts, gets its keys, then the routes and DNS (no kill switch)'
  );
  ok(r.j.state === 'connected' && r.j.handshake <= 6 && r.j.rx === 1200, 'connected: a fresh handshake, the traffic');
  ok(JSON.stringify(r.j).indexOf(KEY_A) < 0 && JSON.stringify(r.j).indexOf(c.privateKey) < 0, 'the private key never leaves the service');
  handshake = Math.floor(Date.now() / 1000) - 600;
  ok((await call(v, '/api/vpn')).j.state === 'waiting', 'no handshake for minutes: waiting for the server');
  handshake = Math.floor(Date.now() / 1000);

  fs.writeFileSync(calls, '');
  await call(v, '/api/vpn', 'POST', { kill: true });
  ok(
    /net 10\.2\.0\.2\/32 185\.159\.157\.1 51820 10\.2\.0\.1 1420 1\n$/.test(fs.readFileSync(calls, 'utf8')),
    'the kill switch is set at once'
  );

  // the app in front: paused for a chosen app, our own overlays change nothing, back on for any other app
  r = await call(v, '/api/vpn/pause-for', 'POST', { id: 'com.lgi.upcch', on: true });
  ok(r.j.pauseFor.join() === 'com.lgi.upcch', 'an app is chosen to pause the VPN');
  fs.writeFileSync(calls, '');
  v.foreground('com.lgi.upcch');
  await v.apply();
  r = await call(v, '/api/vpn');
  ok(fs.readFileSync(calls, 'utf8') === 'down\n' && r.j.state === 'paused' && r.j.paused === 'com.lgi.upcch', 'that app in front: paused');
  v.foreground('com.cleanyourtv.picker');
  v.foreground('');
  await v.apply();
  ok(fs.readFileSync(calls, 'utf8') === 'down\n', 'the Inputs list over it does not bring the VPN back');
  v.foreground('com.webos.app.home');
  await v.apply();
  ok(
    /start\nnet .* 1\n$/.test(fs.readFileSync(calls, 'utf8')) && (await call(v, '/api/vpn')).j.state === 'connected',
    'Home in front: on again'
  );

  // kept up: a stopped wireguard-go is started again; otherwise the routes are checked
  fs.writeFileSync(calls, '');
  await v.keep();
  ok(fs.readFileSync(calls, 'utf8') === 'status\ncheck 185.159.157.1\n', 'every half minute: the status, then the routes');
  fs.writeFileSync(path.join(w, 'status'), 'process=0 tunnel=0 routes=0 kill=1\n');
  fs.writeFileSync(calls, '');
  await v.keep();
  ok(/^status\nstart\nnet /.test(fs.readFileSync(calls, 'utf8')) && logs.some(l => /stopped/.test(l)), 'a stopped tunnel is started again');
  fs.writeFileSync(path.join(w, 'status'), 'process=1 tunnel=1 routes=1 kill=1\n');

  // a failure is shown and leaves nothing half-done
  fs.writeFileSync(path.join(w, 'fail-net'), '');
  await call(v, '/api/vpn', 'POST', { kill: false });
  r = await call(v, '/api/vpn');
  ok(
    r.j.state === 'error' && r.j.error === 'it broke' && /down\n$/.test(fs.readFileSync(calls, 'utf8')),
    'a failure: shown, and the tunnel is taken down'
  );
  fs.unlinkSync(path.join(w, 'fail-net'));

  // a server by name is looked up
  conf.update('t', x => {
    x.vpn.on = false;
  });
  await v.apply();
  v.addServer(PROTON.replace('185.159.157.1:51820', 'ch-12.example.net:1194'), 'Second');
  fs.writeFileSync(calls, '');
  await call(v, '/api/vpn', 'POST', { on: true, server: 'second' });
  ok(/net 10\.2\.0\.2\/32 185\.159\.157\.9 1194 /.test(fs.readFileSync(calls, 'utf8')), 'a server by name: its address is looked up');

  // removing the last servers turns the VPN off
  await call(v, '/api/vpn/remove', 'POST', { id: 'second' });
  r = await call(v, '/api/vpn/remove', 'POST', { id: 'tv-ch-12' });
  ok(r.j.state === 'none' && r.j.on === false && /down\n$/.test(fs.readFileSync(calls, 'utf8')), 'no server left: off, the tunnel down');
  ok((await call(v, '/api/vpn/remove', 'POST', { id: '../x' })).code === 404, 'only a listed server can be removed');
  v.stop();
  uapiSrv.close();

  // ---- scripts/vpn.sh with stand-ins for ip, iptables and the process tools ----
  {
    const fb = path.join(w, 'bin'),
      log = path.join(w, 'sh.log');
    fs.mkdirSync(fb);
    const tool = (n, s) => fs.writeFileSync(path.join(fb, n), '#!/bin/sh\n' + s + '\n', { mode: 0o755 });
    tool(
      'ip',
      'echo "ip $*" >> ' +
        log +
        '\n' +
        'case "$*" in\n' +
        '  "-4 route show default") echo "default via 192.168.1.1 dev wlan0" ;;\n' +
        '  "-4 route show") printf "default via 192.168.1.1 dev wlan0\\n203.0.113.7 via 192.168.1.1 dev wlan0\\n185.159.157.1 via 192.168.1.1 dev wlan0\\n192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.20\\n" ;;\n' +
        '  "link show cytv0") [ -f ' +
        w +
        '/up ]; exit $? ;;\n' +
        'esac\nexit 0'
    );
    tool('iptables', 'echo "iptables $*" >> ' + log + '\ncase "$*" in *" -D "*|"-D "*) exit 1 ;; esac\nexit 0');
    tool('pgrep', '[ -f ' + w + '/wg-running ]');
    tool('pkill', 'echo "pkill $*" >> ' + log + '; rm -f ' + w + '/wg-running');
    tool('sleep', 'exit 0');
    const wg = path.join(w, 'wireguard-go');
    fs.writeFileSync(
      wg,
      '#!/bin/sh\necho "wg $*" >> ' +
        log +
        '\ntouch ' +
        w +
        '/wg-running ' +
        w +
        '/up\nmkdir -p ' +
        w +
        '/run\n: > ' +
        w +
        '/run/cytv0.sock\n',
      { mode: 0o755 }
    );
    const env = Object.assign({}, process.env, {
      CYTV_BIN: fb,
      CYTV_WG: wg,
      CYTV_VPN_RUN: path.join(w, 'run'),
      CYTV_VPN_EP: path.join(w, 'endpoint'),
      CYTV_VPN_LOG: path.join(w, 'wg.log'),
    });
    const vsh = (args, sock) => {
      fs.writeFileSync(log, '');
      const r = cp.spawnSync('sh', [path.join(root, 'scripts', 'vpn.sh')].concat(args), { env, encoding: 'utf8' });
      return { code: r.status, err: r.stderr, log: fs.readFileSync(log, 'utf8') };
    };
    // a socket file stands in for wireguard-go's; `test -S` needs a real one, so the stand-in makes one with Node first
    const s2 = net.createServer();
    fs.mkdirSync(path.join(w, 'run'));
    await new Promise(r => s2.listen(path.join(w, 'run', 'cytv0.sock'), r));
    fs.writeFileSync(path.join(w, 'wg-running'), '');
    let x = vsh(['start']);
    ok(x.code === 0 && x.log.indexOf('wg ') < 0, 'start: a running wireguard-go is left alone');
    fs.writeFileSync(path.join(w, 'up'), '');
    x = vsh(['net', '10.2.0.2/32', '185.159.157.1', '51820', '10.2.0.1', '1420', '1']);
    const L = x.log;
    ok(x.code === 0, 'net runs' + (x.code ? ': ' + x.err : ''));
    ok(
      L.indexOf('ip -4 addr add 10.2.0.2/32 dev cytv0') >= 0 &&
        L.indexOf('ip link set cytv0 mtu 1420 up') >= 0 &&
        L.indexOf('ip route replace 185.159.157.1/32 via 192.168.1.1 dev wlan0') >= 0 &&
        L.indexOf('ip route replace 0.0.0.0/1 dev cytv0') >= 0 &&
        L.indexOf('ip route replace 128.0.0.0/1 dev cytv0') >= 0,
      'net: the address, the server through the router, all of IPv4 through the tunnel'
    );
    ok(
      L.indexOf('ip route replace 203.0.113.7/32 dev cytv0') >= 0 && L.indexOf('ip route replace 185.159.157.1/32 dev cytv0') < 0,
      "the network manager's host routes go through the tunnel, the server's own does not"
    );
    ok(
      L.indexOf('ip -6 route replace unreachable ::/1') >= 0 && L.indexOf('ip -6 route replace unreachable 8000::/1') >= 0,
      'global IPv6 is made unreachable (the TV has no IPv6 firewall)'
    );
    ok(
      /iptables -t nat -A CYTV_VPN_DNS -d 127\.0\.0\.0\/8 -j RETURN\niptables -t nat -A CYTV_VPN_DNS -p udp -j DNAT --to-destination 10\.2\.0\.1:53/.test(
        L
      ) &&
        /iptables -t nat -I OUTPUT 1 -p udp --sport 15354 --dport 53 -j CYTV_VPN_DNS/.test(L) &&
        /iptables -t nat -A OUTPUT -p udp --dport 53 -j CYTV_VPN_DNS/.test(L),
      "DNS goes to the VPN's server: the DNS filter's own questions first, every other one after the filter's rules"
    );
    ok(
      /iptables -A CYTV_VPN -o cytv0 -j RETURN/.test(L) &&
        /iptables -A CYTV_VPN -d 192\.168\.0\.0\/16 -j RETURN/.test(L) &&
        /iptables -A CYTV_VPN -p udp -d 185\.159\.157\.1 --dport 51820 -j RETURN\niptables -A CYTV_VPN -j REJECT\niptables -I OUTPUT 1 -j CYTV_VPN/.test(
          L
        ),
      'the kill switch: the tunnel, the home network and the server pass, the rest is refused'
    );
    ok(fs.readFileSync(path.join(w, 'endpoint'), 'utf8').trim() === '185.159.157.1', 'the server is noted for down');
    x = vsh(['net', '10.2.0.2/32', '185.159.157.1', '51820', '10.2.0.1', '1420', '0']);
    ok(x.log.indexOf('iptables -N CYTV_VPN\n') < 0 && x.log.indexOf('iptables -F CYTV_VPN') >= 0, 'without the kill switch its rules go');
    x = vsh(['down']);
    ok(
      x.code === 0 &&
        x.log.indexOf('ip route del 0.0.0.0/1 dev cytv0') >= 0 &&
        x.log.indexOf('ip route del 185.159.157.1/32') >= 0 &&
        x.log.indexOf('ip -6 route del unreachable ::/1') >= 0 &&
        x.log.indexOf('iptables -t nat -X CYTV_VPN_DNS') >= 0 &&
        x.log.indexOf('pkill -f [w]ireguard-go cytv0') >= 0 &&
        x.log.indexOf('ip link del cytv0') >= 0 &&
        !fs.existsSync(path.join(w, 'endpoint')),
      'down: routes, DNS, kill switch and the tunnel all go'
    );
    fs.unlinkSync(path.join(w, 'up'));
    x = vsh(['net', '10.2.0.2/32', '185.159.157.1', '51820', '10.2.0.1', '1420', '0']);
    ok(x.code === 1 && /not up/.test(x.err), 'net without a tunnel fails');
    x = vsh(['status']);
    ok(x.code === 0, 'status runs');
    s2.close();
  }
});
