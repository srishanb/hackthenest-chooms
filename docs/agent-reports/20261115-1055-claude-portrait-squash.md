# After-job report: the portrait mirrors the hero's jump squash

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/portrait-squash, https://github.com/srishanb/hackthenest-chooms/pull/121
- Request (Srishan, in chat): "when the candle jumps repeat the squishing and unsquishing in the hero shot in the bottom left".
- Started and finished: 10:45 to 10:58 Eastern

## 1. What I believe is complete

| Check | Result | Confidence |
|---|---|---|
| The bottom-left portrait uses the hero candle's body shape each frame: squashed while charging and landing, stretched when rising and falling | Pass (unit; browser) | High |
| Without a shape (any other caller) it still breathes like the idle pose | Pass (existing tests unchanged) | High |
| The portrait's wick stays upright (the hero's wick tilt is not copied) | Done | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Tests and build | `npm run check`; `npm run build` | 512 tests pass; build passes |
| Unit | `candle-portrait.test.ts`: charge shape shorter, rise shape taller than rest | pass |
| Browser | Play, hold Space, release; zoom on the portrait at rest, mid-charge and just after launch | shorter and wider while charging, taller and thinner after launch; no console errors |

**Not verified:** the landing squash captured in a screenshot (it lasts 180 ms).

## 3. Problems, workarounds and dead ends

- None. The portrait reads the shape the hero drew on the previous frame (one frame behind, about 16 ms), so the scene change is one line.

## 4. Deviations

- None.

## 5. Changes

- `src/game/candle/portrait.ts` (optional `shape` input), `src/game/candle/portrait-view.ts` (passes it, redraws on change), `src/game/candle/candle-view.ts` (`shape()` getter), `src/game/scenes/climb-scene.ts` (one line), `src/game/__tests__/candle-portrait.test.ts`.
- Contracts, dependencies: None.

## 6. Follow-ups

- None.

## 7. Can a teammate explain this?

The close-up candle in the bottom-left corner now copies the shape of the candle you are playing: when you charge a jump it squashes down, when you launch it stretches up, and when you land it squashes again, just like the hero.
