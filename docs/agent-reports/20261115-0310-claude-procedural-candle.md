# After-job report: procedural candle player, pixel flame, wax growth, camera slide

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/procedural-candle, https://github.com/srishanb/hackthenest-chooms/pull/67
- Request (Srishan, in chat): a procedurally generated candle sprite, unique every time, with the current animations; a procedural pixel-art flame that gets bigger and smaller; each wax makes the candle slightly bigger with movement scaling with size, a very small incremental buff; the camera slides down to the start on Play again. Choices he made: +2% per wax, flame follows the lantern light, a new candle every run, wire after PR #60.
- Started and finished: 02:50 to 03:12 Eastern

## 1. What I believe is complete

| Check | Result | Confidence |
|---|---|---|
| Unique candle per seed, same candle for the same seed, bounded sizes | Pass (unit: 40 seeds all different, 200 in bounds) | High |
| Same six poses, priority and frame rates as the Ruby sprite | Pass (unit), visible in the gallery and in the game (rise pose mid-jump) | High |
| Flame grows with the light, flickers at 12 fps, no flicker under reduced motion | Pass (unit), visible in the gallery | High |
| Wax growth: +2% per wax, max +6%; walking and jump height and reach grow by the same factor; gravity and body box unchanged | Pass (unit) | High |
| The candle replaces Ruby in the game, no console errors | Pass (browser) | High |
| Play again: new candle and a camera slide to the start, player held until it ends | Built; not seen in a browser | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | exit 0, 360 tests |
| Build | `npm run build` | exit 0 |
| Levels | `npm run check:levels` | all five stages reachable (uses the base, unbuffed config) |
| Run files | `node run.mjs selftest` | passed (25 files) |
| Gallery | `src/game/__tests__/candle-gallery.html` on the dev server | six distinct candles; all six poses; flame at three light sizes |
| Game | `?algo=passthrough-v0&candleSeed=40`, Play, walk, charge, jump | candle stands on the floor, stretches mid-jump, no console errors |

**Not verified:** the Play-again camera slide and the new candle after a restart (needs climbing all five stages to the summit; the slide uses Phaser's `camera.pan`, checked in `phaser.d.ts`). Collecting wax in the browser and seeing the growth. Frame cost on a slow laptop (the candle redraws only when its picture changes: a few hundred small squares).

## 3. Problems, workarounds and dead ends

- A per-row body lean for running made a one-pixel step halfway up the candle that read as broken; the body now stays straight and only the wick tilts, while the flame trails behind the movement.
- Jump height grows with the square of launch speed, so launch speeds scale by sqrt(growth); otherwise +6% speed would give about +12% height.

## 4. Deviations

- The collision box stays 24 x 36 px; only the drawing grows (about 1 art pixel after 3 wax). The LAN-3 outlines and the level checker keep the base config, so a buff can only make a ledge easier.
- The Ruby sprite files stay loaded by BootScene and credited; `forest/ruby-view.ts` is no longer used by the scene.

## 5. Changes

- New: `src/game/candle/` (genome, pose, raster, flame, growth, view), `src/game/__tests__/candle.test.ts`, `src/game/__tests__/candle-gallery.html`, `run/game-candle.mjs`.
- Changed: `src/game/scenes/climb-scene.ts` (candle instead of Ruby, grown movement config into `stepPlayer`, new candle and camera slide on `run_restart`, old lantern dot hidden), `src/config/wax.config.ts` (`growthPerWax: 0.02`), `src/game/INDEX.md`.
- Contract or config-schema changes: None. New dependencies: None. Art: code-drawn pixel art, no image files and nothing AI-generated (binding rule 5).
- Edits outside my lane: game lane (Ali's), at Srishan's request, after Ali's #60 merged.

## 6. Follow-ups and questions for humans

- [ ] Srishan or Ali: try Play again at the summit and confirm the slide speed (`slideCameraTo`, 600 to 2200 ms).
- [ ] Neil: wax colour palette and flame palettes are lists at the top of `candle-genome.ts`.
- [ ] Optional: remove the unused Ruby files and loader once nobody wants to switch back.

## 7. Can a teammate explain this?

The player is now a candle drawn square by square by code. A random number picked at the start of each run decides its height, colour, drips and how its flame flickers, so no two runs look alike. The flame grows when the lantern light is big and shrinks when it is small; each piece of wax makes the candle a tiny bit bigger and lets it walk and jump about 2% further, and the brain signal never touches that.
