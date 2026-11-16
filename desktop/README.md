# Lighten Up (game-only) desktop app

The built game in an Electron window, with updates. The game itself is not changed: this folder only wraps the
Vite build (`dist/`) and adds the update check. It has its own `package.json`, so the game's `npm ci` and the
`ci` checks do not install Electron.

| File | What it does |
|---|---|
| `main.cjs` | Opens the window and serves the packaged game on an `app://` address. Cancels every outside request from the game window |
| `updater.cjs` | A few seconds after start, looks for a newer release and (Windows, Linux) installs it when the game is closed |
| `update-feed.cjs` | Pure rule: which release to update to. Tested in `tools/desktop/update-feed.test.ts` |
| `copy-game.cjs` | Copies `../dist` into this folder for packaging |
| `package.json` | Exact dependency pins and the packager's settings (`build`) |
| `icons/icon.png` | The app icon: the candle in its gold-rimmed circle, drawn by the game's own candle code. Redraw it with `npx tsx tools/desktop/make-icon.ts` from the repository root |

## How updating works

1. The app asks GitHub for this repository's list of releases. This is the only request it makes, it happens in
   Electron's main process, and the game window has no network access at all.
2. It keeps only releases tagged `game-only-v<version>`, newer than itself, that carry a build for this system.
   The repository also holds the EEG game's releases, which is why the app does not use the updater library's own
   "latest release" lookup.
3. **Windows and Linux (AppImage):** the update is downloaded in the background and installed when the game is
   closed. The window title says when one is ready.
   **macOS:** the app says a new version exists and offers its download page. macOS only lets an app replace itself
   if it is signed with an Apple Developer ID, and this one is not.
4. No network, no newer version or any error: the game runs as it is. `update.log` in the app's data folder says
   what happened.

Switch it off with `--no-update` on the command line or `LIGHTEN_NO_UPDATE=1`.

## Run and package it

In the repository root, build the game first:

```bash
npm run build
```

Then, in this folder:

```bash
npm ci
```

```bash
npm start
```

```bash
npm run dist
```

`npm run dist` packages for the system it runs on, into `release/`: an NSIS installer on Windows, an AppImage on
Linux, `.dmg` files on macOS. Releases are not made by hand: see "Releases" in `docs/GAME_ONLY.md`. The version
in `package.json` here is only what a local build is called; a release takes its version from its tag.

## Test hooks (development only)

| Variable | Effect |
|---|---|
| `LIGHTEN_SMOKE=1` | Loads the game, prints one `SMOKE {...}` line with what it found, exits 0 if all is well |
| `LIGHTEN_UPDATE_FEED=<address>` | Skips the GitHub lookup and updates from this folder address (it must hold the channel file and the installer) |
| `LIGHTEN_QUIT_AFTER_UPDATE_CHECK=1` | Closes the app when the update check is over, so installing on close can be watched |

An update can be tried without publishing anything: package version A, copy its AppImage somewhere, package version
B (`npm run dist -- -c.extraMetadata.version=B`), serve `release/` on a local port, and start A with
`LIGHTEN_UPDATE_FEED` pointing at it and `APPIMAGE` set to A's file. The release workflow does the same against the
real release.

## Not signed

None of the builds are code-signed. Windows SmartScreen and macOS Gatekeeper warn on first start. Signing needs
paid certificates; with an Apple Developer ID the Mac build could also update itself.
