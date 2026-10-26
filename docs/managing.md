# Updating and uninstalling

## Updating

Open **CleanYourTV**. The **launcher** (the home screen) and the **service** (the background part) update separately from the
latest GitHub release, each checked against its SHA-256 file.

- A launcher that does not start is replaced by the previous one, and a service that does not start by the previous files.
- **Go back to launcher** returns to the previous launcher version after an update.
- Before the setup, the app offers a newer package by itself.
- Running the [install command](install.md#1-install-the-manager-app) again also updates.

## Update channel

**Update channel** in the manager app chooses where updates come from.

| Channel | What it follows |
|---|---|
| **Stable releases** | The latest published release. This is the default. |
| **Test: *branch*** | A test build of a branch, made for people who are asked to try a change. |

### Test builds

When a change needs to be tried on a TV the maintainer does not have, it is put on a branch. Every push to a branch other than
`main` builds the package (`.github/workflows/test-build.yml`) and publishes it as a **pre-release** named `test-<branch>`.
The stable updater never sees pre-releases.

| | |
|---|---|
| Choose a test build | **Update channel** lists the test builds (branch, commit, date). Pick one, then install it with the **Launcher** and **Service** rows. |
| Back to the stable releases | **Update channel** > **Stable releases**. The stable release is offered again, also when it is older than the test build. |
| Install from scratch | `ssh root@<tv-ip> 'curl -fsSL https://raw.githubusercontent.com/vincentnicod/calm-tv/<branch>/install.sh \| CYTV_BRANCH=<branch> sh'`. The manager then follows that branch. |
| Same version number | A test build records its commit in a `BUILD` file, so a newer push of the same version is still offered. |

!!! warning "A test build can be less finished than a release"
    It is checked against its SHA-256 file like any release, but nobody has signed it. See [Security](security.md#test-builds).

## Switching between LG's Home and the launcher

Switching restarts the TV (about a minute).

| Action | How |
|---|---|
| LG's Home for now | The launcher's **LG Home** top button (add it in Customise > **Top buttons**). No restart, about a minute with a black screen; the launcher stays the Home the TV starts with, and the debloat is lifted while LG's Home shows. |
| Back from LG's Home for now | **Back to CleanYourTV** in the manager app (from LG's app list), or restart the TV. |
| Use LG's Home | **CleanYourTV as Home** off in the manager app. |
| Use the launcher again | **CleanYourTV as Home** on, from LG's app list. |
| Over SSH | `touch /media/developer/cleanyourtv/DISABLE; reboot` for LG's Home, `rm /media/developer/cleanyourtv/DISABLE; reboot` for ours. |
| Failed boot | The Homebrew Channel's failsafe mode skips all boot scripts; reboot again. |

While LG's Home is selected the service still runs, so the manager app and the Input key keep working.

## Uninstalling

**Uninstall** in the manager app, or over SSH:

```sh
sh /media/developer/cleanyourtv/uninstall.sh
```

`--keep-config` keeps your settings and usage history, and `--no-reboot` restores LG's Home right away instead of restarting the TV. Uninstalling removes the apps, boot scripts and Input-key bind and
restarts the TV, which then starts with LG's Home. See [What it changes on the TV](tv-changes.md) for what is removed.
