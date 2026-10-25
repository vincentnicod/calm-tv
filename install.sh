#!/bin/sh
# CleanYourTV for LG webOS: installs the manager app only. Run ON the TV, as root (see the README and https://github.com/vincentnicod/calm-tv/blob/main/docs/install.md). It downloads the latest
# release package (an .ipk), checks its SHA-256 and installs it. The setup itself (replacing LG's Home, the Input key,
# the debloat) is done afterwards in the CleanYourTV app on the TV: open it and choose "Set up now".
#
#   ssh root@<tv-ip> 'curl -fsSL https://raw.githubusercontent.com/vincentnicod/calm-tv/main/install.sh | CYTV_BRANCH=main sh'
#
# Environment: CYTV_REPO=owner/name (default vincentnicod/calm-tv)  CYTV_IPK=/path/to/package.ipk (use a local package)
#   CYTV_BRANCH=<branch>  install the test build of that branch (a pre-release test-<branch>) and keep following it; the manager app
#   can switch back to the stable releases (Update channel)
#   CYTV_REF=<branch>  with CYTV_REPO: the branch themes are read from (default: CYTV_BRANCH, else main); both are saved in
#   /media/developer/cleanyourtv/source so the manager keeps following that repository

main() {
  REPO="${CYTV_REPO:-vincentnicod/calm-tv}"
  ID=com.cleanyourtv.manager
  export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
  say() { echo "[cleanyourtv] $*"; }
  die() { echo "[cleanyourtv] ERROR: $*" >&2; exit 1; }
  case "$1" in -h|--help) sed -n '2,8p' "$0" 2>/dev/null | sed 's/^# \{0,1\}//'; return 0 ;; "") ;; *) die "unknown option: $1" ;; esac

  [ "$(id -u)" = 0 ] || die "run as root (ssh root@<tv-ip>)"
  command -v luna-send >/dev/null || die "this does not look like webOS (no luna-send)"
  [ -d /var/lib/webosbrew/init.d ] || die "/var/lib/webosbrew/init.d not found: root with the Homebrew Channel is required (https://rootmy.tv)"
  for t in curl node; do command -v $t >/dev/null || die "missing tool: $t"; done

  command -v systemctl >/dev/null && node -e '(()=>1)()' >/dev/null 2>&1 || die "this TV is too old (webOS 4 or earlier: no systemd, old Node.js). CleanYourTV needs webOS 5 or newer."
  T=$(mktemp -d /tmp/cytv.XXXXXX) || die "mktemp failed"
  trap 'rm -rf "$T"' EXIT
  if [ -n "$CYTV_IPK" ]; then
    [ -f "$CYTV_IPK" ] || die "$CYTV_IPK not found"
    IPK="$CYTV_IPK"
  else
    API="https://api.github.com/repos/$REPO/releases/latest"
    if [ -n "$CYTV_BRANCH" ]; then
      SLUG=$(printf '%s' "$CYTV_BRANCH" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-60)
      [ -n "$SLUG" ] || die "CYTV_BRANCH is not a usable branch name"
      API="https://api.github.com/repos/$REPO/releases/tags/test-$SLUG"
      say "looking for the test build of the branch $CYTV_BRANCH in $REPO"
    else
      say "looking for the latest release of $REPO"
    fi
    curl -fsSL -H 'User-Agent: cleanyourtv-installer' "$API" > $T/release.json || die "could not read the release list (is there a release yet? for a branch: has its build finished?)"
    node -e 'var j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")),a={};(j.assets||[]).forEach(function(x){a[x.name]=x.browser_download_url});var k=Object.keys(a).filter(function(n){return /^com\.cleanyourtv\.manager_.*_all\.ipk$/.test(n)&&a[n+".sha256"]})[0];if(!k)process.exit(1);console.log(a[k]);console.log(a[k+".sha256"])' $T/release.json > $T/assets.txt || die "the release has no package (com.cleanyourtv.manager_<version>_all.ipk with a .sha256 file)"
    IPKURL=$(sed -n 1p $T/assets.txt); SHAURL=$(sed -n 2p $T/assets.txt)
    say "downloading $(basename "$IPKURL")"
    curl -fsSL "$IPKURL" -o $T/pkg.ipk || die "download failed"
    want=$(curl -fsSL "$SHAURL" | awk '{print $1}')
    got=$(node -e 'console.log(require("crypto").createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"))' $T/pkg.ipk)
    [ -n "$want" ] && [ "$want" = "$got" ] || die "the package does not match its checksum; nothing was installed"
    IPK=$T/pkg.ipk
  fi

  # right after a system app manager restart an install can be silently dropped, so check and retry
  cp "$IPK" /tmp/cytv-manager.ipk
  n=0; ok=0
  while [ $n -lt 4 ]; do
    luna-send -n 1 -w 30000 -f luna://com.webos.appInstallService/dev/install "{\"id\":\"$ID\",\"ipkUrl\":\"/tmp/cytv-manager.ipk\",\"subscribe\":false}" </dev/null >/dev/null 2>&1
    for i in 1 2 3 4 5 6 7 8; do
      sleep 3
      [ -f /media/developer/apps/usr/palm/services/$ID.service/bootstrap.sh ] && luna-send -n 1 -w 5000 -f luna://com.webos.applicationManager/getAppInfo "{\"id\":\"$ID\"}" </dev/null 2>/dev/null | grep -q '"returnValue": true' && { ok=1; break; }
    done
    [ $ok = 1 ] && break
    n=$((n+1))
  done
  rm -f /tmp/cytv-manager.ipk
  [ $ok = 1 ] || die "the package did not install (see Troubleshooting in the documentation: https://github.com/vincentnicod/calm-tv/blob/main/docs/troubleshooting.md)"
  if [ -n "$SLUG" ]; then mkdir -p /media/developer/cleanyourtv && echo "test-$SLUG" > /media/developer/cleanyourtv/channel; say "the manager app now follows the test builds of $CYTV_BRANCH (Update channel in the manager switches back to the stable releases)."; fi
  # another repository (a fork): remember it, so updates and themes keep coming from it and not from the default repository
  if [ -n "$CYTV_REPO" ]; then
    REF="${CYTV_REF:-${CYTV_BRANCH:-main}}"
    printf '%s' "$CYTV_REPO" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || die "CYTV_REPO must look like owner/name"
    printf '%s' "$REF" | grep -Eq '^[A-Za-z0-9_./-]{1,60}$' || die "CYTV_REF is not a usable branch name"
    mkdir -p /media/developer/cleanyourtv && echo "$CYTV_REPO $REF" > /media/developer/cleanyourtv/source
    say "updates and themes now come from $CYTV_REPO ($REF)."
  fi
  say "the CleanYourTV app is installed."
  if [ -f /media/developer/cleanyourtv/helper.js ] && [ -e /var/lib/webosbrew/init.d/10-cleanyourtv-home ]; then
    # already set up: this is an update, so bring the running service to the new version
    sh /media/developer/apps/usr/palm/services/$ID.service/bootstrap.sh update "$(sed -n "s/^const VERSION = '\(.*\)';/\1/p" /media/developer/apps/usr/palm/services/$ID.service/helper/helper.js | head -1)"
  else
    say "Next, on the TV: open CleanYourTV in the app list and choose 'Set up now'."
  fi
}
main "$@"
