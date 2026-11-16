# After-job report: pixel-grid (one pixel size, one grid)

- Agent: claude
- Branch and PR: claude/pixel-grid, no PR (the lead merges the branch)
- Phase and plan: lead's brief (Decision D-34), no plan file
- Started and finished: 16:40 to 18:10 Eastern

## 1. What I believe is complete

| Acceptance test (from the brief) | Result | Confidence |
|---|---|---|
| All gameplay and scenery art in the game lane drawn at `pixelScale` (2x), no fractional scales, nothing at 1x | Pass, except the allowlisted soft effects and the generated backdrop (not mine to edit) | High |
| Drawn positions on the 2 px grid: camera scroll, candle, ledge art, moving ledges, birds, particles, parallax, wax | Pass | High |
| Game plays as before (physics, resolution, scale mode, `src/game/player/` untouched) | Pass | High |
| Guard test against new fractional scales and free rotation | Pass | High |
| Canvas shown with nearest-neighbour scaling | Already so (`image-rendering: pixelated`, from `pixelArt: true`); no change | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 98 files, 706 tests pass |
| Build | `npm run build` | Passes |
| Grid share, gameplay art only (backdrop, soft light, weather, glows and HUD portrait hidden), 1920x1080 | Playwright script, same frame per mode | Before: forest 66 / 58 %, snow 47 / 41 %, classic 71 / 70 % of content 4x4 blocks uniform. After: 99.8 to 99.9 % everywhere |
| Grid share, whole screen | same | Forest 83.4 / 84.7 -> 87.7 / 85.8 %; snow 78.5 / 83.2 -> 83.2 / 80.8 %; classic 64.3 / 64.3 -> 92.4 / 92.4 % (6 s / 14 s; classic 5 s / 9 s). The endless numbers are held down by the generated backdrop (`src/game/backdrop/`, another agent's task) and the light gradients |
| Frame rate, two runs each, dev server | `smoke.cjs` at 6 and 14 s | Before: classic 27.5 to 28.3, forest 24.0 to 25.4, snow 17.9 to 19.8. After: classic 25.8 to 28.3, forest 23.9 to 24.8, snow 18.6 to 20.9 |
| Camera and candle on the grid while playing | 400 frames of the bot run, sampled each frame | 0 off-grid values; in 3 of 184 moving frames the candle stepped one art pixel against its motion on screen |
| Page errors | every run | None |

**Not verified:** real browsers and screens other than headless Chromium; window sizes that are not a whole multiple of 960x540 (they still scale by a fraction, by design).

## 3. Problems, workarounds and dead ends

- Phaser eases the camera and draws it in the same call (`Camera.preRender`), so the scroll cannot be rounded after follow. A small `grid-camera.ts` does the same easing on an exact float on `POST_UPDATE` and hands the camera the snapped value.
- Hiding layers for the measurement needed the game object; the script patched `src/main.ts` only in the test browser's network route.

## 4. Deviations from the plan

- The big tree and the pine are no longer ledge props (160 and 220 px tall at 2x). The snowy crown is drawn at 2x, not 4x, and is half its old size. Wind gusts are half their old size (the art has 8 texture px per art pixel). The big ledge bird is replaced by birb.png.

## 5. Changes

- Files changed: see the branch; new `src/game/forest/pixel-grid-snap.ts`, `prop-art.ts`, `pixel-particles.ts`, `src/game/scenes/grid-camera.ts`, `src/game/__tests__/pixel-grid.test.ts`.
- Contract or config-schema changes: `BirdClip` in `src/config/wildlife.config.ts` is now `{ cells }` (game-only users); `flock.scale` removed.
- New dependencies requested: None
- Edits outside my lane: `docs/DECISIONS.md` (D-34), `docs/GAME_ONLY.md` (one row), at the lead's request.
- `INDEX.md` updated for new exports: yes

## 6. Follow-ups and questions for humans

- [ ] Lead: accept birb.png as the ledge bird (bird.png at 2x is 64x42, taller than the candle).
- [ ] Backdrop owner: the generated backdrop is now the main off-grid layer on screen.

## 7. Can a teammate explain this?

Every piece of art is drawn with each of its pixels as a 2x2 square on the 960x540 canvas, and everything that moves
is drawn at even coordinates, so all pixels line up on one grid like in Celeste. Physics still uses exact positions;
only the drawing is rounded.
