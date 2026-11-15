# After-job report: candle portrait replaces the lantern strength bar

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/candle-portrait, https://github.com/srishanb/hackthenest-chooms/pull/74
- Request (Srishan, in chat): replace the lantern strength UI with a live, procedural shot of the candle in a circle at the bottom left; as the light gets smaller it shows in that hero image, expressively, close to dying out.
- Started and finished: 04:02 to 04:27 Eastern

## 1. What I believe is complete

| Check | Result | Confidence |
|---|---|---|
| A gold-rimmed circle at the bottom left shows a close-up of the player's own candle (same seed) | Pass (browser) | High |
| Strength from the same light radius as the darkness (wax bonus included) | Pass (wired from the scene's radius) | High |
| Strong: bright wax, big flame, warm halo, no smoke | Pass (unit, gallery) | High |
| Weakening: wax dims, flame shrinks and staggers, halo fades; below 45% smoke curls off, thicker as it weakens | Pass (unit, gallery) | High |
| Near death: below 30% the flame gutters out in some frames (red ember on the wick); below 25% what is left burns a dim blue | Pass (unit, gallery) | High |
| Reduced motion: no guttering, stagger or drifting smoke; size, dimming and glow still show strength | Pass (unit) | High |
| The old lantern strength bar is removed; the bottom-left hint panel starts right of the circle with its right edge unchanged | Pass (browser) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Tests, build, run files | `npm run check`; `npm run build`; `node run.mjs selftest` | 390 tests pass; build and selftest pass |
| Gallery | `/src/game/__tests__/portrait-gallery.html` (strength 1, 0.7, 0.45, 0.25, 0.1, 0.02; two seeds) | each stage reads distinctly; guttering, ember, blue flame and smoke visible at the low end |
| Game | `?algo=passthrough-v0&candleSeed=40`, Play | circle at the bottom left with the same candle as the hero; no lantern bar; hint panel beside the circle; hero visible; no console errors |

**Not verified:** the portrait reacting live to a real signal swing in the browser (the gallery shows every stage; the game wiring passes the same radius the darkness uses). Very narrow or very tall windows (the hint panel offset is computed for the canvas's FIT scaling).

## 3. Problems, workarounds and dead ends

- The UI lane may not import game code, and the candle is game code, so the portrait is drawn inside the canvas (scroll factor 0, depth 300) rather than in the HTML HUD.
- The neutral light maps to about 53% strength; smoke was first set to start at 60%, which made a calm candle smoke, so it now starts at 45%.

## 4. Deviations

- The portrait is an idle close-up (gentle breathing), not a mirror of the hero's run or jump poses: it is a status image.

## 5. Changes

- New: `src/game/candle/portrait.ts`, `src/game/candle/portrait-view.ts`, `src/game/__tests__/candle-portrait.test.ts`, `src/game/__tests__/portrait-gallery.html`.
- Changed: `src/game/scenes/climb-scene.ts` (create and update the portrait), `src/game/candle/candle-view.ts` (`genome()` getter), `src/game/candle/candle-genome.ts` (export `scaleColor`), `src/ui/components/hud/hud.ts` and `hud.css` (lantern bar removed; hint panel offset), `src/game/INDEX.md`, `src/ui/INDEX.md`, `run/game-candle.mjs`.
- Edits outside my lane: UI lane (Amrit's), minimal: removing the replaced bar and moving one panel. Amrit's open #70 and #73 restyle the top-right stats in the same two files; the overlap is small.
- Contracts, config schema, dependencies: None. `HUD_LANTERN_FULL_RADIUS_PX` stays in ui.config.ts but the HUD no longer reads it; the `hud.lantern` string is unused.

## 6. Follow-ups

- [ ] Amrit: confirm the hint panel position on very narrow windows.
- [ ] Neil or Srishan: thresholds (smoke 45%, gutter 30%, blue 25%) are constants at the top of `portrait.ts`.

## 7. Can a teammate explain this?

The circle in the bottom-left corner is a close-up of your own candle. When the light is strong it burns bright with a warm glow; as the light shrinks the wax dims, the flame gets small and shaky and starts smoking, and right at the end it turns blue and keeps going out to a glowing ember. It replaces the old lantern strength bar, and it is drawn by code from the same seed as your candle.
