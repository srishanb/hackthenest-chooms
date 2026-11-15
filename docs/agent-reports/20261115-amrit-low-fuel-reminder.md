# After-job report: low-fuel voice reminder

- Agent: Amrit / Codex
- Branch and PR: amrit/narrator-game-moments, https://github.com/srishanb/hackthenest-chooms/pull/96
- Phase and plan: P7.3 follow-up, reminder requested by Amrit in chat.
- Started and finished: Nov 15, this session.

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| Actual fuel below 25% requests a voiced reminder | Pass | High |
| Once per depletion; refill above 50% rearms | Pass | High |
| Pause, empty, missing/nonfinite data do not cause misleading reminders | Pass | High |
| Waits for existing speech and cooldown; refill cancels queued warning | Pass | High |
| Same selected voice, bundled local clip, no runtime API | Pass | High |

## 2. How I verified it

- Generator downloaded only the new baseline low-fuel MP3; reused all six approved existing clips. The selected bank now has seven clips, total 19 with legacy banks.
- npm run check: typecheck and 508 tests / 78 files passed.
- npm run build: passed with existing native-config/vendor warnings.
- New regressions cover strict 25%/50% boundaries, missing/NaN/infinite/negative/empty fuel, pause/resume, restart, queue delay and refill cancellation.
- node --check tools/narrator/build.mjs and git diff --check passed.

**Not verified:** full real-game fuel depletion, subjective listening approval of this new line, other devices/browsers. Actual fuel snapshot and generator are used; the trigger is verified using real bus/stores with mocked audio time.

## 3. Problems, workarounds and dead ends

Collected wax count is not the burning resource. The line says "Your candle is running low. Keep an eye out for wax, and keep going—one ledge at a time." It reads lanternFuel01 only, never wax collected or biosignal values.

## 4. Deviations from the plan

Added a seventh original reminder at Amrit's request; the six transcript excerpts are unchanged. Additional motivational moments are suggestions only, not generated or installed.

## 5. Changes

- Audio config, moment watcher/player/tests, supplied clip bank/manifest, generation pack/tool, README/credits and this report.
- Contract: add low-fuel to optional NarratorMoment union; backwards compatible.
- Dependencies: None.
- Outside lane: optional shared content type plus generated content/assets/credits, required for the new line.
- INDEX: existing watcher covers this behavior; no new export.

## 6. Follow-ups and questions for humans

- [ ] Amrit: choose any further motivational moments before generating more lines.

## 7. Can a teammate explain this?

The game warns once when actual candle fuel gets low. It waits politely for the narrator to finish, and forgets the warning if the player has already refilled. It needs no internet during play.
