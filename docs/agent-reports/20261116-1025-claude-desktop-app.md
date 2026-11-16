# After-job report: desktop app that updates itself (game-only variant)

- Agent: claude
- Branch and PR: `game-only`, https://github.com/srishanb/lighten-up/pull/151 (a variant branch, not for `main`)
- Phase and plan: asked for by Srishan in the session ("can you make it an electron app that can automatically update"); no plan file
- Started and finished: 10:02 to 10:25 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| The built game runs in an Electron window, with outside requests from the game window blocked | Pass | High |
| Windows and Linux apps find a newer release of this app, download it and install it on closing | Pass on Linux; Windows not run | High (Linux), Medium (Windows) |
| The app only follows its own releases (`game-only-v*`), not the EEG game's | Pass | High |
| macOS (unsigned) says a new version exists and offers its page | Not run | Low |
| The release workflow builds and attaches the apps for all three systems | Pass | High |
| Every release checks that an older Linux copy updates itself to it | Pass | High |
| The update check can be switched off and never blocks play | Pass (off switch and no-network paths by reading and by the unpackaged run) | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 93 files, 667 tests pass (9 new in `tools/desktop/update-feed.test.ts`) |
| App starts, unpackaged | `LIGHTEN_SMOKE=1 xvfb-run -a electron . --no-sandbox` in `desktop/` | canvas and menu present, own file reached, `https://example.com` blocked, exit 0 |
| App starts, packaged | the same on `release/linux-unpacked/lighten-up-game-only` | the same, exit 0 |
| Update, on this machine | installed 0.2.0 AppImage, local feed with 0.2.1, `LIGHTEN_UPDATE_FEED`, `LIGHTEN_QUIT_AFTER_UPDATE_CHECK=1` | log shows found, downloaded, install on quit; the installed file's SHA-256 became the 0.2.1 file's |
| Real release list | `curl` of the GitHub releases list fed to `newestUpdate` | before v0.2.0: nothing to update to, as intended |
| Packaging rehearsal | run 2 of `release-game-only` (nothing to release) | Windows NSIS installer, Linux AppImage, macOS arm64 and x64 disk images all built; Linux app started |
| Release v0.2.0 | run 3 of `release-game-only` | all jobs green; nine files attached; `verify` printed "Updated through the app's own lookup." (an older copy, version 0.0.1, asked GitHub, picked v0.2.0, downloaded it and replaced itself) and the lookup returned v0.2.0 for win32, linux and darwin |

**Not verified:** the Windows installer and its update on a Windows machine; the macOS build on a Mac (first start through Gatekeeper, the "new version" message); anything by a person; the app behind a proxy that needs sign-in; what the tense music sounds like in the app. The Linux update ends with the library starting the new AppImage once; on machines without FUSE (this one and the build machine) that last step prints an error after the file has already been replaced.

## 3. Problems, workarounds and dead ends

- The updater library's own GitHub lookup follows the repository's "Latest" release, which is the EEG game. The app therefore reads the release list itself and gives the library the chosen release's download folder as a plain feed.
- macOS refuses self-installing updates from apps without an Apple Developer ID signature. The Mac build is signed ad hoc (so it can start on Apple silicon) and only announces updates.
- Tags cannot be pushed from the build session, so releases are cut by the workflow from a notes file. To avoid spending a version on a broken workflow, the workflow rehearses packaging on all three systems when it changes and there is nothing to release.

## 4. Deviations from the plan

- Binding rule 3 ("nothing on the demo path uses the network"): the desktop app makes one request to GitHub at start, outside the game window, and it can be switched off. Srishan asked for automatic updates, which cannot work without it. The game itself still never uses the network.

## 5. Changes

- Files changed: new `desktop/` (its own `package.json` and lockfile, `main.cjs`, `updater.cjs`, `update-feed.cjs`, `copy-game.cjs`, `README.md`), `tools/desktop/update-feed.test.ts`, `.github/workflows/release-game-only.yml`, `.gitignore`, `docs/GAME_ONLY.md`, `docs/releases/game-only-v0.2.0.md`.
- Contract or config-schema changes requested: None
- New dependencies requested: in `desktop/package.json` only (the game's own manifest is untouched): `electron` 45.3.2 and `electron-builder` 26.18.0 (the versions the EEG game's wrapper branch used), `electron-updater` 6.8.11.
- Edits outside my lane: this variant crosses lanes on purpose; it is not for `main`.
- `INDEX.md` updated for new exports: not applicable (nothing under `src/`)

## 6. Follow-ups and questions for humans

- [ ] Srishan: install v0.2.0 on your machine and say whether it opens (Gatekeeper or SmartScreen will warn once).
- [ ] An app icon (the default Electron icon is used).
- [ ] True self-updating on macOS needs an Apple Developer ID certificate; signing would also remove the Windows warning.

## 7. Can a teammate explain this?

The desktop app is the same built game inside an Electron window. When it starts it asks GitHub which releases exist, picks the newest one made for this app, and on Windows and Linux downloads it quietly and swaps itself when you close the game. Every release is tested by building an old copy and watching it update to the new one.
