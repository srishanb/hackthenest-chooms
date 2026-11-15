# After-job report: tense music layer, climb-info toggle, UI locked to the canvas

- Agent: sonnet
- Branch and PR: sonnet/audio-tense-no-fuel, https://github.com/srishanb/hackthenest-chooms/pull/100
- Phase and plan: Srishan's requests via chat and the reviewer. No plan file. History on this branch: I first removed lantern fuel at Srishan's request, then Srishan reversed that (relayed by the reviewer); fuel is restored exactly as on main.
- Started and finished: 09:10 to 10:15 Eastern

## 1. What I believe is complete

| Request | Result | Confidence |
|---|---|---|
| Keep fuel exactly as main | All fuel files, HUD row, `lanternFuel01`, strings restored from `origin/main`; `git diff origin/main -- src` shows only audio, settings and UI-frame changes | High |
| Tense music (CC0 "Insistent" by yd), `musicTenseMix` enabled 0 to 0.8, level trim, credits | Done (see below) | High (licence, wiring), Medium (by ear: not heard) |
| Bottom-left HUD info panel hidden by default, shown only by a Settings toggle | New `hud.showClimbInfo` (default false), "Show climb info" checkbox; the wax pickup toast still shows | High |
| UI overlay locked to the canvas rectangle | `ui-frame.ts` sets `#ui` to the canvas rect; `cqw` units; two `position: fixed` pieces made relative | High at 1900x700 |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 75 files, 495 tests pass |
| Levels | `npm run check:levels` | all reachable |
| Build | `npm run build` | Succeeds |
| Wide window | Browser at 1900x700, Play | canvas and `#ui` both x 327 to 1571; stats, pause, checkpoint card, compass and the Controls button all inside; start menu and Settings sit inside the canvas |
| Climb info | Same page | Panel hidden by default; after ticking "Show climb info" it shows at x 509, just right of the portrait (edge 501), inside the canvas |
| Tense layer | Real engine harness `src/audio/__tests__/tense-browser.html` | bus gains quiet 0.336 to 0.104, tense 0 to 0.32; both loops load |

**Not verified:** anything by ear; the tense loop's seam; other window sizes (tall or phone portrait) and browsers; the stage editor (still full-window by design).

## 3. Problems, workarounds and dead ends

- `container-type: size` did not make `position: fixed` descendants relative to `#ui`, so the tutorial "Controls" button and the start menu (both `fixed`) ignored the frame; I changed them to `absolute`.
- The bottom-left panel used `100vw`/`100vh` arithmetic to find the canvas; replaced with `13.96cqw` (the portrait's share of the 960 px canvas).
- The settings checkbox label "Show climb info (stage, signal status, tips)" is long; shorten if it wraps badly.

## 4. Deviations

- None from the final request. Earlier removal of fuel was reverted by instruction.

## 5. Changes

- Audio: `asset-list.ts`, `music-layers.ts`, `index.ts`, `effects.config.ts`, `public/assets/audio/music/insistent.ogg`, inventory, CREDITS, README, licence evidence, INDEX, `run/audio-mix.mjs`, `tools/audio/tense-scaling.test.ts`, `src/audio/__tests__/tense-browser.html`.
- UI: `ui-frame.ts`, `registry.ts`, `layout.css`, `tokens.css`, `hud.css`, `hud.ts`, `main-menu.css`, `start-menu.css`, `settings-panel.ts`, `strings.ts`, `INDEX.md`, settings test.
- Contract: `Settings.hud.showClimbInfo` (`src/shared/contracts/settings.ts`), default false; older saved settings load with it off.
- Edits outside my lane: UI lane (Amrit), content (Neil's effects row and assets), shared contract.

## 6. Follow-ups and questions for humans

- [ ] A listening pass on the tense loop, its seam and the trim (1.74).
- [ ] Amrit: check other window shapes with the locked frame.

## 7. Can a teammate explain this?

The UI layer now tracks the game canvas's on-screen box instead of the window, so corner widgets stay inside the picture on wide screens. The bottom-left info card is off until you turn it on in Settings. The music crossfades to a second, darker loop as the signal rises.
