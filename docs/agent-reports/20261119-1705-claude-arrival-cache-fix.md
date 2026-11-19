# After-job report: arrival cache fix and bounce streak

- Agent: claude
- Branch and PR: claude/arrival-cache-fix, no PR (not pushed)
- Phase and plan: QA round 2 rows 1 and 2 (`_agents_workspace/06_game-qa_ledge-kinds_round2.md`), no plan file
- Started and finished: 17:00 to 17:06 Eastern

## 1. What I believe is complete

| Acceptance test (from the brief) | Result | Confidence |
|---|---|---|
| A landing point timed for a crumbling ledge can never be stale | Pass: the cache is removed | High |
| Regression test: stored `arriveX` equals a fresh replay, and the step works after a 250 ms wait | Pass (failed before the fix) | High |
| A bounce breaks the flow streak only for a fall of at least `composure.fall.minPx` | Pass, pure function tested | Medium (scene wiring not run in a browser) |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Regression test before the fix | `npx vitest run src/game/__tests__/endless-arrival-cache.test.ts` | 2 failed: seed 717 e7:p8->e7:p9 lands at 625.0046, timed from 591.42 |
| Same after the fix | same | sweep (seeds s*7+3, s 1..60, chunks 6..20, plus 717/7) passes, about 8 s |
| Generation time before, two runs | `npx tsx tools/endless/chunk-map.ts --time` | mean 6.54 / 6.04 ms, 99th 29.7 / 27.3, worst 69.7 / 86.3 |
| Generation time after, two runs | same | mean 7.13 / 6.65 ms, 99th 32.9 / 32.5, worst 99.1 / 79.8 (mean about +9%, within the 15% limit) |
| Full check | `npm run check` | pass, 108 files, 800 tests |
| Build | `npm run build` | pass |
| Route map | `npx tsx tools/endless/chunk-map.ts --seed 717 --start 7` | printed, no error; the tool has no explicit verdict line |
| Bot sweep | `--bot 150 --start 6` on 717, 780, 829, 42 | 0 stalls each |

**Not verified:** the streak change was not played in a browser; the generation-time numbers are from a shared container, so noisy; I did not re-run QA's 6,000-chunk stale-read count (the cache no longer exists); the route map output was only read for errors.

## 3. Problems, workarounds and dead ends

- Root cause: the arrival cache key (`ledgeId|ledge count|column count|step count`) did not include the ledge's place, and ids are count-based, so a ledge from a discarded try and a later one shared a key.
- After the fix seed 717 chunk 7 has no stepped-off crumbling ledge any more (the choice a stale value steered changed), so its test only asserts the check passes; the pre-fix failure is the proof.
- No existing snapshot or hash test needed updating; the walls tests passed unchanged.

## 4. Deviations from the plan

- None. Dropped the cache (simplest) because the cost was under 15%. `arrivalNow` stays as a one-line wrapper to keep callers unchanged.

## 5. Changes

- `src/game/endless/pieces/kit.ts`: cache removed from `arrivalNow`.
- `src/game/endless/composure.ts`: new `bounceBreaksFlow`.
- `src/game/scenes/endless-scene.ts`: bounce resets `cleanJumps` only via `bounceBreaksFlow`.
- `src/game/__tests__/endless-arrival-cache.test.ts` (new), `src/game/__tests__/endless-rules.test.ts` (extended).
- `src/game/INDEX.md`, `docs/DECISIONS.md` (one sentence under D-36a).
- Contract or config-schema changes requested: None. New dependencies: None. Edits outside my lane: `docs/DECISIONS.md` addendum, as the brief asked.
- `INDEX.md` updated for new exports: yes.

## 6. Follow-ups and questions for humans

- [ ] Integrator: merge when ready; a quick play of a bounce route to see the streak survive a small cap drop.

## 7. Can a teammate explain this?

The generator remembered where the candle lands on a crumbling ledge, but the memory could hand one ledge another ledge's answer, so a step could be timed from the wrong spot. It now works the answer out fresh each time. A small drop onto a mushroom cap on the route no longer resets the flow streak; only a real fall does.
