# After-job report: build and smoke test of the built game

- Agent: claude
- Branch and PR: claude/smoke-test, report-only PR (no code fixes were needed)
- Phase and plan: wrap-up, no plan file (requested directly by Srishan)
- Started and finished: 08:50 to 09:00 Eastern, Sun 15 Nov 2026

Commit tested: `343238208a664c43b3d495f7c4e11e6a94d96fcd` (origin/main, "fix(ui): keep the emblem candle inside a bigger orange ring (#92)").

## 1. What I believe is complete

| Step | Result | Confidence |
|---|---|---|
| 1. `node run.mjs doctor` | Pass ("This computer is ready"; notes only: no .env.local, use Chrome or Edge) | High |
| 2. `npm run check` | Pass: type check clean, 71 test files, 471 tests | High |
| 3. `npm run build` and `node run.mjs build` | Pass (see sizes below) | High |
| 4. dist/ has every referenced asset | Pass (static compare plus runtime network log) | High |
| 5. Offline rule, URLs in dist/ | Pass: no runtime fetch or CDN | High |
| 6. Serve build, curl assets | Pass: all 138 files in dist/ return 200 with correct type; no 404 | High |
| 7. Browser: console, start menu, Play | Pass: no console errors; start menu, Play, tutorial card, skip tutorial, gameplay HUD all appear | Medium (short session, no full playthrough) |
| 8. `node run.mjs all` | Pass: 25 passed, 0 failed, 1 with nothing to run (game-ember) | High |
| 9. `?source=live` | Pass: loads to the start menu, no console errors, footer reads "Octopus 16: waiting for usable signal". Hardware not tested | High for load, none for hardware |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Doctor | `node run.mjs doctor` | Node 26.13.0, npm 11.20.0, deps, pieeg.js, history guard all ok |
| Check | `npm run check` | tsc clean; 71 files, 471 tests passed, 22 s |
| Plain build | `npm run build` | dist/index.html 0.72 kB; index JS 1,538.82 kB (415.67 kB gzip); CSS 29.15 kB; 3 fonts 79 to 276 kB. Only warning: `<script src="./vendor/pieeg.js"> can't be bundled without type="module"` (expected: the vendored SDK is a classic script and is kept in index.html and copied to dist/vendor) |
| Full build | `node run.mjs build` | preflight, typecheck, tests, levels (5 levels all reachable), bundle, recordings, offline audit, stamp all ok. 137 files, 11.46 MB; largest: cathedral-in-the-forest.ogg 2.81 MB, index JS 1.47 MB, recordings/sim-fixture.jsonl 821.7 kB. Wrote dist/build-info.json (this makes 138 files on disk) |
| Assets | grep of quoted asset paths in src/ against dist/ and dist/assets/ | Every runtime path exists. Unmatched strings were test fixtures only (`jump.ogg`, `missing.ogg`, `test.ogg`, `other.ogg` in src/audio/__tests__) and the two font imports, which Vite hashes into dist/assets/*.ttf. dist/recordings/presets/ holds manifest.json plus 5 presets (calm-climb, rising-tension, jaw-clench-bursts, mixed-climb, poor-contact); all 12 narrator mp3 (bill and chris) and the manifests present |
| Offline | grep for `https?://` in dist/ (js, html, css, plus listing of other files) | See URL list below |
| Serve | `vite preview --port 4179` (sandbox disabled for port bind), node script fetching every file in dist/ | 138 files checked, 0 non-200, 0 HTML-fallback responses for non-HTML files. `/`, `/?source=live`, `/recordings/presets/manifest.json`, `/vendor/pieeg.js` all 200 |
| Browser | Built-in browser pane at http://localhost:4179/ | Network log: about 110 requests to localhost, all 200 (plus Phaser blob: URLs), nothing external. Console: only the Phaser banner log, no errors or warnings. Clicked Play, tutorial card "Move" appeared, Skip tutorial, gameplay with HUD, candle, narrator caption shown |
| All features | `node run.mjs all` | signal-* (9), game-* (7 passed, game-levels "2 checks not in the repo yet"), game-ember "nothing to run yet", ui-* (5), audio-mix, narrator ("1 check not in the repo yet"), process-guards, demo-offline: 25 passed, 0 failed |

Every `http(s)://` string in dist/ (none is a runtime request):

| URL | File | What it is |
|---|---|---|
| `https://phaser.io/` + version | assets/index-*.js | Phaser's default `gameURL` config string and a console banner link; never fetched |
| `http://www.w3.org/2000/svg` (2) | assets/index-*.js | SVG XML namespace for createElementNS and Phaser's DOM-to-SVG helper; not a request |
| `http://www.w3.org/1999/xhtml` | assets/index-*.js | XML namespace in Phaser's DOM-element rasteriser; not a request |
| `https://github.com/pieeg-club/PiEEG-server`, `https://docs.pieeg.com/hardware/devices/Octopus_16` | vendor/pieeg.js | `@see` links in the SDK licence header comment |
| URLs in licence and source notes | assets/**/license-source.md, source-evidence.md, kenney License.txt, CC0 files, inventory.json, font .ttf metadata | Documentation and embedded font licence text; never loaded by the page |

**Not verified:** a physical Wi-Fi-off reload (the browser network log showed localhost only, and `node run.mjs all` demo-offline passed); audio playback and audibility (requests were 200, but I did not listen); a full playthrough past the first screen, the stage editor, credits, Settings, replay presets in the UI; the real Octopus 16 board over Bluetooth; Safari and Firefox; a fresh machine; running from `file://` or a sub-path.

## 3. Problems, workarounds and dead ends

- `git fetch` over ssh and `tsx` (levels step of `run.mjs build`) failed in the sandbox with network and EPERM errors; both worked with the sandbox disabled. Not a repo problem.
- A local branch `claude/smoke-test` already existed at the same commit as origin/main (no remote copy); I used it instead of creating it.
- Vite preview serves its HTML fallback with status 200 for unknown paths, so a 404 cannot be detected by status alone; my fetch script also checked the content type.

## 4. Deviations from the plan

- None. No fixes were made because nothing broke the build, the tests or the offline game.

## 5. Changes

- Files changed: this report only.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: None.
- `INDEX.md` updated for new exports: not applicable.

## 6. Follow-ups and questions for humans

Findings, none blocking:

- [ ] `src/signal/presets/controller.ts` line 16 uses the absolute path `PRESET_BASE_URL = '/recordings/presets'`, while vite uses `base: './'` and every other asset path is relative. It works when the build is served from the site root (as `vite preview` does, and as the demo plan says) but would 404 from a sub-path or `file://`. Owner: Srishan (signal lane). Fix is one word if the demo will not be served from the root.
- [ ] `src/ui/components/start-menu/start-menu.css` (lines 13 and 76) uses absolute `url('/assets/...')` for the launch-screen backgrounds. Vite leaves these as written (they resolve against public/ at the site root); same root-only caveat. Owner: Amrit (UI lane).
- [ ] `game-levels` ("2 checks not in the repo yet"), `narrator` ("1 check not in the repo yet") and `game-ember` ("nothing to run yet") are stale run-file labels, not failures (docs say labels can lag).
- [ ] The main bundle is 1.47 MB (Phaser). Loading is from local disk so this is fine for the offline demo.
- [ ] Someone should still do a hands-on pass: audio audible, a full climb, Settings presets, and the live board.

## 7. Can a teammate explain this?

We built the game for production, started the built version on a local server, and checked every file the game asks for. We confirmed nothing talks to the internet and the start menu and first level run without errors. The automated tests all pass, but real hardware and listening to the audio were not checked.
