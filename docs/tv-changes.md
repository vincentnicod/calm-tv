# What it changes on the TV

Only the takeover of Home and the debloat's `/etc/hosts` lines are applied in RAM at boot, as mounts. Everything else is stored in
the writable partitions listed below and stays after a reboot until you uninstall. Nothing under `/usr`, `/etc` or the firmware
is modified on disk, and a reboot without the boot scripts brings LG's Home back.

The optional voice download (about 80 MB) is stored in `/media/developer/cleanyourtv/voice` and stays until **Remove voice** or the
uninstall. Optional features contact other services only when you switch them on; see [Security](security.md).

## Files

| Where | What |
|---|---|
| `/media/developer/cleanyourtv/` | The service (`helper.js` and modules), the launcher (`app/`), scripts, `config.json`, `usage.json`, the backup of the original state in `backup/`, downloaded themes in `themes/`, Live TV data in `live/`, the optional voice download in `voice/` |
| `/media/developer/apps/usr/palm/applications/` | The apps `com.cleanyourtv.manager`, `.picker` and `.notify` |
| `/media/developer/apps/usr/palm/services/com.cleanyourtv.manager.service/` | The installed package contents |
| `/var/lib/webosbrew/init.d/` | Boot scripts `10-cleanyourtv-home` and, with debloat on, `15-cleanyourtv-debloat` (links into the folder above) |
| `/home/root/.config/lginputhook/keybinds.json` | Our binds for the Input key, the voice and Guide keys and the remote buttons given to apps or to Quick settings (Customise > Remote buttons, run `appkey.sh`); other binds are left alone, and the uninstall removes ours |
| `/media/developer/cytv-setup.log` | The setup log |

## At boot

1. The Homebrew Channel runs the boot scripts in `/var/lib/webosbrew/init.d/`.
2. `10-cleanyourtv-home` starts the service and, unless `/media/developer/cleanyourtv/DISABLE` exists, **bind-mounts** a directory
   holding the launcher over LG's Home app (`/usr/palm/applications/com.webos.app.home`). The directory's `appinfo.json` is derived
   from this TV's own stock Home, so nothing of LG's is shipped.
3. About a minute later the debloat runs, if it is on.

The bind mount lives in RAM. A reboot without the boot scripts, or the Homebrew Channel's failsafe mode, leaves LG's Home as it was.

## Processes and ports

| What | Port |
|---|---|
| The service (`node helper.js`), running as root | `127.0.0.1:8765` |
| The input hook, injected into LG's input service (`lginput2`; other input processes only on firmware without it) | none |
| Short-lived pages (Live TV pairing, share log, voice setup) and the optional notification endpoint | [Security](security.md#what-this-changes-on-a-tv) |

## What the uninstall removes

The apps, the boot scripts, the Input-key and voice-key binds, the debloat changes and the folder
`/media/developer/cleanyourtv` (with `--keep-config`, the settings and usage history stay). The TV then restarts with LG's Home.
