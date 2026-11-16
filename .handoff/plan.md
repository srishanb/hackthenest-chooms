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

- [x] Phase 1: Hands-only boot and endless core  — completed 2026-11-16
- [x] Phase 2: Expressive, detailed candle (face, expressions, body detail)  — completed 2026-11-16
- [🔄] Phase 3: Iteration loop from `.handoff/backlog.md` (variety, juice, tuning, polish)  — current

## Change list

Phase 3 has no fixed change list. Each loop iteration takes the first open item in `.handoff/backlog.md`, builds it
with tests, checks it in a browser where it can be seen, commits and pushes. Phases 1 and 2 are recorded in
`docs/agent-reports/20261116-0525-claude-endless-core.md` and `docs/agent-reports/20261116-0545-claude-expressive-candle.md`.

## Test strategy

- Every new pure rule gets a test beside the others in `src/game/__tests__/`.
- Anything the generator can now produce (moving ledges, ice) must pass the route replay in `endless-generator.test.ts`.

## Verification plan

- `npm run check` — type check and all tests pass
- `npm run build` — production build succeeds
- Browser check with the dev server and the route bot (`?bot=1`), screenshot of the change, no console errors
