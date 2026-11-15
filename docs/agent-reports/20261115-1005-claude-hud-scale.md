# After-job report: one size and spacing scale for the gameplay HUD

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/hud-scale (PR linked in its body); built on #108 (claude/hud-in-frame) at Srishan's choice, so it merges after #108.
- Request (Srishan, in chat): "standardize the UI size on the regular gameplay screen ... relative size and positioning differences, but I want them to look more intentional".
- Started and finished: 09:50 to 10:08 Eastern (after the 9:00 AM freeze; Srishan's request)

## 1. What I believe is complete

| Check | Result | Confidence |
|---|---|---|
| One unit: 1u = 1/54 of the game frame's height (10 game px); HUD sizes are whole units, so proportions hold at any window size | Done | High |
| Every corner element 2u from the frame edges (measured 18 px on an 864 x 486 frame): Controls, source badge, stats, pause, ember panel, compass, portrait | Pass (measured) | High |
| Size tiers: Controls and badge 3u tall, pause 4.4u, stats card 22u wide with 3u rows, ember panel 6u, compass 9u, portrait 12u | Pass (measured: 27, 27, 40, 198, 54, 81, 108 px) | High |
| Type scale 1.2u / 1.5u / 1.8u with readable minimums | Done | High |
| Ember panel bottom-aligned with the compass; Controls button on the top line, no longer covering the controls list (list moved to 6u) | Pass (screenshot) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Tests and build | `npm run check`; `npm run build` | 501 tests pass; build passes |
| Browser | worktree dev server, Play, measure every element's distance to the frame and size | figures above; before/after screenshots in hackathon/hud-scale/ |

**Not verified:** very small windows (the old fixed-pixel small-screen overrides were replaced by the unit scale with minimum font sizes); the ember phase layout; Amrit's UI-size sliders at non-default values (they still scale the cards from their corners).

## 3. Problems, workarounds and dead ends

- #108 and #109 both rewrite the same HUD CSS; Srishan chose to build on #108. #109 still overlaps #108 and needs reconciling by whoever lands second.
- The candle portrait is drawn in the canvas, so its margin is set in game pixels (20 = 2u) to match the CSS edge.

## 4. Deviations

- None.

## 5. Changes

- `src/ui/theme/tokens.css` (`--hud-u`, `--hud-corner`, `--hud-gap`, `--hud-text-s/m/l`), `src/ui/components/hud/hud.css`, `src/ui/components/main-menu/main-menu.css` (Controls button), `src/ui/components/source-badge/source-badge.css`, `src/ui/components/world-tutorial/layout.ts` and its test (list position), `src/game/candle/portrait-view.ts` (margin 20).
- Contracts, config schema, dependencies: None.

## 6. Follow-ups

- [ ] Whoever merges second of #108/#109 reconciles the frame CSS.
- [ ] The centre narrator caption and the "UI size" disclosure were not put on the scale.

## 7. Can a teammate explain this?

Every piece of the gameplay HUD is now measured in one unit tied to the game's height, sits the same distance from the edges, and comes in a few deliberate sizes: the candle portrait biggest, then the compass, then cards and buttons. It looks planned, and it grows and shrinks together with the window.
