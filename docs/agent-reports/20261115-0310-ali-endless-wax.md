# After-job report: replenishing single-visible wax

- Agent: codex for Ali
- Branch / PR: ali/endless-wax, https://github.com/srishanb/hackthenest-chooms/pull/69
- Plan: direct request to reference latest Git and remove the per-run wax count limit; short plan in draft PR.
- Timing: 15 Nov 2026, approximately 03:02–03:13 Eastern.

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| Remove the three-pickup / finite-location collection limit | Pass | High |
| At most one active/visible collectible, including initialization and replenishment | Pass | High |
| Random respawn delay, reusable ordinary ledges and running HUD count | Pass | High |
| Preserve light timing, pause/recovery, save compatibility and current candle growth cap | Pass | High |

## 2. How I verified it

`npm run check`: 58 files / 379 tests pass after merging main through 5ce8ce3. `npm run check:levels`: all five stages reachable. `npm run build`: passes with existing classic vendor-script warning. `git diff --check`: passes.

Wax tests collect 100 pieces using two ledges, keep unique event IDs, and verify one active drop and bounded save size. They cover randomized 8–14 second delays, spawn exclusion beneath the player, distant-drop retirement, old save migration, reload, pause/recovery/victory, restart and light stability. A view test verifies all drawing parts start hidden and only one drop can become visible. Candle growth at 100 pickups remains 1.06, preserving main's existing cap.

Browser: localhost:5188 Play → preserved guide → a running wax counter with a single visible drop, new candle and forest. Rechecked after merging the reference HUD: top-right Wax metric shows 0 without a finite denominator; the redesigned lantern, compass and menus remain.

**Not verified:** Full manual repeated-pickup route, hardware or other browsers. Stored respawn delay is written on spawn/pickup; reloading partway through a wait may extend it, never refresh the light bonus or bypass the wait. Collection has no gameplay cap; ordinary JavaScript numeric precision still applies.

## 3. Problems, workarounds and dead ends

Latest main added candle growth tied to the former maxPerRun field. Separated growthCapWax from collectible supply so unlimited collection cannot create runaway size/movement. Reused candidate locations and one active ID instead of accumulating objects or pickup history. Missed drops far behind are retired so the only spawn cannot strand later stages.

The reference HUD merged during implementation. Kept its metric layout and boost-only context line; the count metric already handles a null total, and pickup feedback omits the finite denominator.

Also merged the new candle direction indicator, preserving its input/aim handling while using the independent growth cap. No aim or movement behavior changed by this task.

## 4. Deviations from the plan

None. At most one collectible is active globally, a stronger guarantee than one per screen. Pickup pulses remain short cosmetic feedback and end before another collectible can spawn.

## 5. Changes

Wax controller/view/tests/config, small scene references to renamed growth cap, HUD count display and game/UI indexes. Optional wax snapshot/event total widened to number|null (null means uncapped), committed separately; existing numeric consumers still supported. FEATURES updated separately. No dependencies, assets, level geometry or signal changes. UI/shared edits are needed to represent the requested uncapped count.

## 6. Follow-ups and questions for humans

Ali can tune spawn range and the 8–14 second delay after playing. No blocking questions.

## 7. Can a teammate explain this?

Wax keeps coming back during the run, but only one piece exists at a time. After you collect it, the game waits and chooses another nearby ordinary ledge, including locations used before. The counter keeps rising while the existing bonuses stay capped.
