**Lighten Up (game-only)** as a desktop app that keeps itself up to date, for Windows, Linux and macOS. The game is the same as in v0.1.0; what is new is the app around it.

This is a pre-release, and the installers are **not code-signed**, so Windows and macOS warn the first time you open them. No person has run the Windows or macOS build yet.

## Install

| System | Download | Then |
|---|---|---|
| Windows 10 or 11 (x64) | `Lighten-Up-Game-Only-Setup-0.2.0.exe` | Run it. SmartScreen says "Windows protected your PC": choose **More info**, then **Run anyway**. It installs for your user and starts the game |
| Linux (x64) | `Lighten-Up-Game-Only-0.2.0.AppImage` | Make it executable (`chmod +x`), then run it. Keep the file somewhere you can write to: it replaces itself when it updates |
| macOS, Apple silicon | `Lighten-Up-Game-Only-0.2.0-arm64.dmg` | Open it and drag the app to Applications. The first start is refused because the app is not from a registered developer: open **System Settings, Privacy & Security** and choose **Open Anyway** (on older macOS: Control-click the app, then **Open**) |
| macOS, Intel | `Lighten-Up-Game-Only-0.2.0-x64.dmg` | The same |
| Any, in a browser | `lighten-up-game-only-v0.2.0.zip` | Unzip and serve the folder with any static file server, as in v0.1.0 |

Controls: left and right arrows or A and D to move; hold Space or Up, aim, and release to jump; Esc to pause.

## How it updates

- A few seconds after it starts, the app asks GitHub for this repository's list of releases and looks for a newer `game-only-v…` release with a build for your system.
- **Windows and Linux:** a newer version is downloaded in the background and installed when you close the game. The window title says when one is ready. There is nothing to click.
- **macOS:** the app tells you a new version exists and offers its download page. macOS only lets an app replace itself if it is signed with an Apple Developer ID, and this one is not.
- That one request is the app's only use of the network, and it happens outside the game: the game window has no network access. Without a connection the game simply runs. To switch the check off, start the app with `--no-update`.
- `update.log` in the app's data folder records what the check did.

`latest.yml`, `latest-linux.yml` and the `.blockmap` file below are read by the updater. You do not need to download them.

## State of this build

- The game: type check, 667 tests in 93 files and the production build pass. It is unchanged from v0.1.0 apart from this app.
- Linux app, on a build machine: it starts and loads the game with outside requests blocked, and an installed older copy was seen to find a newer version, download it and replace itself on closing.
- The workflow that publishes this release repeats those two checks against this release itself: it starts the packaged Linux app, then builds an older copy and requires it to become this version. A failed check shows as a failed run of `release-game-only`.
- Not verified: the Windows installer and its update on a Windows machine; the macOS build on a Mac, including the first-start steps above; any of it by a person. The Windows update uses the same library and feed as the Linux one, but nobody has watched it happen.
- The app shows the default Electron icon.

This is a game, not a medical or wellness tool, and it makes no health claims.
