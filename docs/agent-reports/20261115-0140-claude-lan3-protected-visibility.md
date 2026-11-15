# After-job report: LAN-3 protected visibility

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/lan3-protected-visibility, https://github.com/srishanb/hackthenest-chooms/pull/51
- Phase and plan: P5.2 (protected-visibility part), docs/plans/P5.md (PROPOSED). Srishan asked for this directly in his game-dev agent chat ("option 1 is good"); under D-22 the plan is advice.
- Started and finished: 01:31 to 01:42 Eastern

## 1. What I believe is complete

| Acceptance test (P5.md, P5.2) | Result | Confidence |
|---|---|---|
| Reach is conservative: a ledge in range is listed, one far out of range is not | Pass (unit: next ledge up listed; ledge 2000 px up not) | High |
| Current platform excluded from the reachable list | Pass (unit) | High |
| Next ledge readable (LAN-3) | Pass in the browser at the normal radius: the ledge underfoot is outlined and the reachable ledges' top edges show | Medium |
| Darkness still matters: out-of-reach platforms show no outline | Pass (unit: no segment for an unreachable ledge; browser: high-a stayed dark) | High |
| The light never goes out | Unchanged (already enforced by `lanternRadius.min`) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | exit 0, 38 files, 251 tests |
| New tests alone | `npx vitest run src/game/__tests__/reachable-ledges.test.ts` | 6 passed, 162 ms (the reach search is fast) |
| Build | `npm run build` | exit 0 |
| Levels | `npm run check:levels` | both test sections reachable |
| Run file | `node run.mjs selftest`; `node run/game-lantern.mjs --tests-only` | passed; 16 tests passed |
| Browser | Worktree served on port 3080, `?algo=passthrough-v0`, skipped the tutorial, jumped onto the first ledge | Floor outlined across its whole width, including where it is fully dark; after landing on `low-a` its outline moved there and `low-b`/`low-c` showed top edges; `high-a` stayed dark. No console errors. |

**Not verified:** the outlines at the minimum light radius (90 px) in a screenshot: the clench key did not shrink the light under `passthrough-v0` in the time I tried. That the layer draws above the darkness is shown by the floor outline staying visible in the fully dark corners. The Canvas renderer (if `Phaser.AUTO` falls back) is not checked. Real sections (Neil's drafts) are not wired in yet, so only the test climb was tried. A stranger playtest was not done.

## 3. Problems, workarounds and dead ends

- `preview_start` reads `.claude/launch.json` from the main checkout, so it started main's server on 5173, not this worktree. I stopped it and served the worktree with `npx vite --port 3080` instead.
- Git writes from the worktree need to run outside the sandbox (the shared `.git/worktrees` folder is read-only inside it).

## 4. Deviations from the plan

- P5.md suggested an envelope estimate first; I used the real `stepPlayer` search straight away, because P4.2's checker already proved the sampling and it costs about a millisecond per ledge, once (cached).
- Only ledges strictly higher than the current one are outlined. Falling is always possible and lighting every lower ledge would undo the darkness.
- No `depths.ts`: the scene's existing `DEPTH.alwaysReadable` (200) is reused, to keep the scene edit to a few lines while Ali's wax PR (#50) changes the same file.
- Hazards: Core has none, so nothing is drawn for them.

## 5. Changes

- Files changed: new `src/game/world/reachable-ledges.ts`, `src/game/effects/protected-visibility.ts`, `src/game/__tests__/reachable-ledges.test.ts`; `src/game/scenes/climb-scene.ts` (+5 lines); `src/game/INDEX.md`; `run/game-lantern.mjs`.
- Contract or config-schema changes requested: None. Outline colours and width are header constants (the deviation P5.md already names).
- New dependencies requested: None.
- Edits outside my lane: the whole change is in the game lane (Ali's), at Srishan's request.
- `INDEX.md` updated for new exports: yes.

## 6. Follow-ups and questions for humans

- [ ] `tools/levels/reach.ts` and `reachable-ledges.ts` share the same sampling; Ali may want the checker to call `reachableLedges` later (not done, to avoid colliding with active work).
- [ ] Once Neil's sections are wired in, check the outlines on the narrower upper ledges.
- [ ] Neil: if outlines read too bright or too faint, the colours are the constants at the top of `protected-visibility.ts`.

## 7. Can a teammate explain this?

When you land on a ledge, the game fires a few dozen pretend jumps from it using the exact same physics as the real player and notes which higher ledges they land on. It then draws a thin line over the darkness on the ledge you stand on and on the top edge of those ledges, so a tense player with a small lantern can still see where to go. The signal never changes which ledges are outlined.
