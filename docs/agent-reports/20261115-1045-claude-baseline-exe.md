# After-job report: Windows installer for the baseline

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/baseline-exe (from 78eaccf, tag baseline-2026-11-15); PR linked in its body
- Request (Srishan, relayed by the reviewer session, ~11:10): build a Windows .exe installer from the baseline 78eaccf, attach it to release baseline-2026-11-15, and make every way the game talks to the Octopus work in the .exe.
- Started and finished: 10:20 to 10:50 Eastern

## 1. What I believe is complete

| Check | Result | Confidence |
|---|---|---|
| Game code is exactly 78eaccf (`git diff 78eaccf -- src public index.html vite.config.ts tsconfig.json` is empty) | Pass | High |
| Electron 45.3.2 wrapper serving dist/ from a secure `app://` scheme (absolute /recordings and /assets paths work) | Pass (smoke run of the shipping app.asar) | High |
| Web Bluetooth: `select-bluetooth-device` handler (4 s scan; one board picked, several -> chooser, none or Cancel -> cancel), pairing handler, permission check limited to the app's own origin; the request still starts from the in-game click | Built; APIs checked in electron@45.3.2 electron.d.ts | Medium (no board) |
| Offline: replay presets, narrator MP3, fonts load; any http(s) request is blocked | Pass (smoke run) | High |
| NSIS x64 installer built on macOS (unsigned, `signAndEditExecutable: false`) | Pass: Lighten-Up-Setup-0.1.0-x64.exe, 145 MB, SHA-256 7a9a2712...0a94 | High |
| Installer attached to release baseline-2026-11-15, with install and connect steps in the notes | Done after Srishan approved (asset size 144,928,525 bytes, same as the local build) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Baseline identity | `git diff --stat 78eaccf -- src public ...` | empty |
| Smoke run of the shipping archive | dev Electron 45.3.2 on macOS running `release/win-unpacked/resources/app.asar` with `LIGHTEN_SMOKE=1` | title "Lighten Up", secure context, canvas, `navigator.bluetooth.requestDevice` is a function, preset manifest 1277 B, preset 1.1 MB, narrator MP3 96 KB, fonts loaded, external fetch blocked |
| Installer build | `npx electron-builder --win nsis --x64 --publish never` | exit 0 |

**Not verified:** the installer run on Windows; a real Octopus over Bluetooth on Windows; the multi-board chooser; the recorder download dialog; SmartScreen behaviour. A macOS packed build exited silently on launch (unsigned app), so the macOS app itself is not a supported target.

## 3. Problems, workarounds and dead ends

- The first smoke run failed with ERR_BLOCKED_BY_CLIENT: the "no network" request filter also blocked the protocol handler's reads of dist/; file: URLs inside dist/ are now allowed.
- npm held back Electron's install script; the binary was fetched with `node node_modules/electron/install.js` for local testing. electron-builder downloads the Windows Electron itself.

## 4. Deviations

- No GitHub Actions workflow was needed: the NSIS installer cross-built on macOS.

## 5. Changes

- New: `electron/main.cjs`. Changed: `package.json` (main, `app` and `dist:win` scripts, `build` config, devDeps electron 45.3.2 and electron-builder 26.18.0, exact), `package-lock.json`, `.gitignore` (`release/`), `README.md`, `CREDITS.md`.
- No game code, contracts or workflows changed.

## 6. Manual test for Srishan (Windows laptop + Octopus 16)

1. Download `Lighten-Up-Setup-0.1.0-x64.exe` from the release, run it; on SmartScreen click More info, Run anyway; install and open Lighten Up.
2. Turn on Windows Bluetooth, power the board from the 5 V power bank, and close cloud.pieeg.com or any other app connected to it.
3. Press Play, open the signal panel with the backtick key, and click Connect Octopus 16.
4. Within about 4 seconds the board connects (or a "Choose your board" window lists nearby boards; pick yours). The source badge shows LIVE EEG and the values move.
5. Click Disconnect, then Connect again, and once press Cancel in the chooser (or connect with the board off): the game must keep running and show a readable message, not hang.

## 7. Can a teammate explain this?

The Windows installer wraps the exact baseline game in Electron, a small built-in Chrome, so it runs offline from the Start menu. When you press Connect, Electron's Bluetooth chooser finds the Octopus and hands it to the same code the web version uses.
