# Lighten Up, hands-only: endless climb and an expressive candle

> Created: 2026-11-16
> Author: plan skill

## Background

Srishan asked for a version of Lighten Up with no EEG ("non mind control"), on its own branch, with procedurally
generated platforms, an endless mode, and a more expressive and detailed candle. The work then continues in an
unattended loop. The branch is `claude/keen-keller-my69oo`; it is a long-lived variant and is **not** meant to merge
into `main` (the pull request stays a draft with `no-automerge`).

Decisions made without asking (low-maintenance request), each easy to reverse:

1. **One codebase, no fork.** The signal lane stays in the repo but is not booted. `main.ts` hands the game and UI a
   "still" signal: a constant reader in `fixed` mode. Nothing reads a device.
2. **Endless is the default mode.** The authored five-stage climb stays reachable with `?climb=classic`.
3. **The run ends when the flame goes out.** Fuel burns with playing time, wax refills it, and falls cost time. A full
   width landing at the start of every chunk bounds any fall to one chunk. No death on a fall (FAL-1 kept).
4. **The world's mood follows the flame.** With no signal, low fuel drives the existing corruption visuals and tense
   music through the existing effects table. It never changes controls or physics (binding rule 2 kept in spirit).
5. **Score is height and a local personal best only.** No ranking, no percentage of anything (binding rule 7).

## Phases

- [🔄] Phase 1: Hands-only boot and endless core  — current
- [ ] Phase 2: Expressive, detailed candle (face, expressions, body detail)
- [ ] Phase 3: Iteration loop from `.handoff/backlog.md` (variety, juice, tuning, polish)

## Change list

### `src/signal/still-signal.ts` — Create

`createStillSignal(): SignalHandle`. Constant `ComposureState` (`mode: 'fixed'`, `valid: false`, `calibrated: false`,
`source: 'SIMULATED'`), no-op control, empty presets. Lets every existing consumer keep its typed dependency while no
device, simulator or pipeline runs.

### `src/main.ts` — Modify

Boot the still signal instead of `createSignal`; pick `endless` unless `?climb=classic`; pass the run seed
(`?seed=` or random) to the game.

- **Risk**: medium — composition root, every lane is wired here
- **Side effects**: none
- **Blast radius**: the game does not boot
- **Rollback**: `git revert`

### `src/config/ui.config.ts` — Modify

Turn off `source-badge`, `calibration` and `debug-overlay` (signal-only components).

### `src/config/endless.config.ts` — Create

Typed, unit-labelled numbers: chunk height, platform widths by height, rise and charge ranges, wax frequency, fuel
burn and refill, flame-out grace, mood curve.

### `src/game/endless/jump-arcs.ts` — Create

Sample jump arcs traced with the real `stepPlayer` (one per charge level and direction). The generator places ledges
on these arcs, so reachability comes from the game's own physics, not duplicated maths.

### `src/game/endless/generator.ts` — Create

`generateChunk(seed, index)`: pure and random-access (a chunk depends only on seed and index, so a lower chunk can be
rebuilt after a fall). Each chunk starts with a full-width landing, climbs by constructed jumps to within reach of
the next landing, adds optional side ledges with wax, and returns its `route` (the exact inputs that climb it).

### `src/game/endless/chunk-stream.ts` — Create

Keeps the chunks around the player alive; reports added and removed platforms and wax drops.

### `src/game/endless/flame-fuel.ts`, `src/game/endless/endless-wax.ts`, `src/game/endless/mood.ts` — Create

Pure rules: fuel burn and refill with a flame-out grace; one-time wax pickups; fuel to mood intensity.

### `src/game/forest/platform-skin.ts` — Create, `src/game/forest/forest-world.ts` — Modify

Extract the per-platform skin so platforms can be added and removed while playing (`addPlatform`, `removePlatform`).
The classic climb keeps its exact look.

- **Risk**: medium — shared renderer used by the classic climb and the stage editor
- **Side effects**: none
- **Blast radius**: platform art in the classic climb and editor
- **Rollback**: `git revert`

### `src/game/effects/protected-visibility.ts` — Modify

Accept a platform getter so outlines work on a streamed world.

### `src/game/scenes/endless-scene.ts` — Create, `src/game/index.ts` — Modify

The endless scene: same input, `stepPlayer`, candle, portrait, darkness and forest as the climb scene, on streamed
chunks. `createGame` picks the scene from `deps.endless`.

### `src/shared/contracts/game-state.ts` — Modify

Optional `run?: { mode: 'endless'; seed: number; heightPx: number; bestPx: number }` on `GameSnapshot`, so the finish
screen can show the result without importing the game.

- **Risk**: medium — frozen contract (one optional field, no caller changes)
- **Affected callers**: none (optional)
- **Rollback**: `git revert`

### `src/ui/strings.ts`, `src/ui/components/finish-screen/*`, `src/ui/components/start-menu/start-menu.ts`, `src/ui/components/hud/hud.ts` — Modify

Endless wording on the finish screen (height, best, seed), no signal status line on the menu, no signal rows and no
ember compass in the HUD when the still signal is in use.

### `src/game/INDEX.md`, `docs/agent-reports/<stamp>-claude-endless-core.md` — Modify / Create

New exports listed; after-job report.

## Test strategy

- `src/game/__tests__/endless-generator.test.ts` — determinism per seed; every platform inside the walls; no
  overlapping ledges; **route replay over many seeds and chunks with the real `stepPlayer` reaches the next landing**.
- `src/game/__tests__/endless-stream.test.ts` — bounded live platform count; rebuilding a chunk gives identical data.
- `src/game/__tests__/endless-rules.test.ts` — fuel burn, refill, grace and flame-out; wax collected once; mood curve
  bounded and monotonic.
- `src/signal/__tests__/still-signal.test.ts` — constant state, fixed mode, no throw on control calls.
- Existing suites stay green (forest, candle, movement, UI).

## Verification plan

- `npm run check` — type check and all tests pass
- `npm run build` — production build succeeds
- Browser smoke test with the pre-installed Playwright: boot, press Play, climb with the generated route for a few
  ledges, screenshot; no console errors.
