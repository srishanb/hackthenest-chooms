The desktop app gets its own icon: the candle in its gold-rimmed circle, as the game shows it in the corner of the screen. It replaces the default Electron icon. The icon is drawn by the game's own candle code, not made by hand or by an image generator.

The game itself is unchanged from v0.2.0.

## Getting it

- **You have v0.2.0 on Windows or Linux:** do nothing. Start the app, let it run for a moment, and close it: it downloads this version in the background and installs it as it closes. The next start is v0.2.1.
- **You have v0.2.0 on macOS:** the app tells you this version exists and offers this page. Download the `.dmg` for your Mac below and replace the app.
- **New install:** as in v0.2.0.

| System | Download |
|---|---|
| Windows 10 or 11 (x64) | `Lighten-Up-Game-Only-Setup-0.2.1.exe` (SmartScreen: **More info**, then **Run anyway**) |
| Linux (x64) | `Lighten-Up-Game-Only-0.2.1.AppImage` (`chmod +x`, then run) |
| macOS, Apple silicon | `Lighten-Up-Game-Only-0.2.1-arm64.dmg` (first start: **System Settings, Privacy & Security, Open Anyway**) |
| macOS, Intel | `Lighten-Up-Game-Only-0.2.1-x64.dmg` |
| Any, in a browser | `lighten-up-game-only-v0.2.1.zip` |

The installers are still not code-signed, so Windows and macOS warn on first start.

## State of this build

- Type check, 668 tests in 94 files, and the production build pass.
- Linux: the packaged app carries the new icon, starts and loads the game. The workflow that publishes this release builds an older copy and requires it to update itself to this version.
- Not verified: how the icon looks in the Windows taskbar and the macOS Dock; the Windows installer and its update on a Windows machine; the macOS build on a Mac; any of it by a person.

This is a game, not a medical or wellness tool, and it makes no health claims.
