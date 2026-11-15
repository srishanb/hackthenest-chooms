# After-job report: alpha-exe

- Agent: claude (Fable 5.2 orchestrating and verifying; build run by an Opus 5.5 subagent)
- Branch and PR: claude/alpha-exe, no PR (a build record only; the packaging itself is PR #127)
- Phase and plan: none. Srishan asked for "an installer built and attached to that alpha release".
- Started and finished: 10:40 to 10:50 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| A Windows installer is built from exactly the `v0.1.0-alpha` game code | Pass | High |
| It is attached to the `v0.1.0-alpha` GitHub release | Pass | High |
| It installs and runs on Windows | Not attempted | None: no Windows machine |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Source is the tag | `git describe --tags --exact-match`; `git diff v0.1.0-alpha -- src public index.html` | `v0.1.0-alpha`; empty diff (run by me) |
| Packaging matches #127 | `cmp` of `package.json` and `electron/main.cjs` against `wt-claude-baseline-exe` | Identical (run by me) |
| File type | `file release/Lighten-Up-Setup-0.1.0-alpha-x64.exe` | PE32 executable, Nullsoft Installer self-extracting archive (run by me) |
| Size and checksum | `ls -la`, `shasum -a 256` | 143,591,746 bytes; `eb96130328c028b8bed1e3c90050afeb5f6f5b06602a71cff105ec5254ec5134` (run by me) |
| Upload | `gh release view v0.1.0-alpha` | Asset listed, state `uploaded`, same size (run by me) |
| Packaged app smoke run | Subagent ran the shipping `app.asar` with Electron 45.3.2 on macOS and `LIGHTEN_SMOKE=1` | Title "Lighten Up", secure context, canvas present, Web Bluetooth API present, presets manifest and `calm-climb.jsonl` loaded, a narrator MP3 loaded, two fonts loaded, external fetch blocked. I did not repeat this. |
| asar contents | Subagent listed `app.asar` | `dist/index.html`, 147 asset entries, five presets and the manifest present. I did not repeat this. |

**Not verified:** the installer was never run. Installing and launching on Windows, SmartScreen behaviour, Web
Bluetooth with a real Octopus 16 on Windows, and the chooser with several boards are all unchecked. The smoke run is a
scripted page check on macOS, not a playthrough. The installer is unsigned and uses the default Electron icon.

## 3. Problems, workarounds and dead ends

- `electron-builder` could not run in the Bash sandbox: first a refused connection to github.com, then makensis
  could not create a temporary file. The packaging step and the Electron smoke run were run outside the sandbox. The
  smoke run wrote normal Electron profile data to `~/Library/Application Support/lighten`.
- `npm run dist:win` was not run end to end. Its vite build succeeded in the sandbox; the electron-builder step was
  then run by itself on that `dist/`.
- `node_modules` is an APFS clone of the baseline-exe worktree's, which has the same lockfile. Nothing was downloaded
  from npm.

## 4. Deviations from the plan

- The built file is named `Lighten-Up-Setup-0.1.0-x64.exe` by electron-builder and was renamed to
  `Lighten-Up-Setup-0.1.0-alpha-x64.exe`. The version inside the installer is still 0.1.0.

## 5. Changes

- Files changed: the packaging commit `cd189e9` from `claude/baseline-exe` applied to the alpha tag: `.gitignore`,
  `CREDITS.md`, `README.md`, `package.json`, `package-lock.json`, `electron/main.cjs`. No file under `src/` or
  `public/` differs from the tag.
- Contract or config-schema changes requested: None.
- New dependencies requested: electron 45.3.2 and electron-builder 26.18.0 (dev only), the same as #127.
- Edits outside my lane: root config and manifests are the integrator's (Srishan's) files.
- `INDEX.md` updated for new exports: not applicable.

## 6. Follow-ups and questions for humans

- [ ] Anyone with a Windows laptop: install it, launch it, play the tutorial, and try a real board over Bluetooth.
- [ ] Srishan: this branch is a record of how the alpha installer was built. It does not need to merge; #127 carries
      the same packaging for main.

## 7. Can a teammate explain this?

The game is a web page. This wraps the alpha version of that page in Electron, which is a small browser that ships
with the game, and packs it into one Windows installer. The game inside is exactly the code at the alpha tag.
