# After-job report: tutorial course variation

- Agent: codex acting for Ali
- Branch and PR: ali/wax-rewards, https://github.com/srishanb/hackthenest-chooms/pull/50
- Phase and plan: P4 tutorial extension, explicitly requested by Ali; draft PR #50 contains files and acceptance checks. Existing P4 plan approved by Ali.
- Started and finished: approximately 01:40 to 01:52 Eastern, 15 Nov 2026.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Preserve the climb as a tutorial with a gentle introduction to later mechanics | Pass | Medium |
| Moving shuttle carries riders, including while charging | Pass | High |
| Distinct ice retains drift; charging stops it | Pass | High |
| Visible wind gives bounded airborne drift independent of EEG | Pass | High |
| All course ledges and finish are reachable with actual environment simulation | Pass | High |
| Concise contextual instruction and visible hazard cues | Pass | Medium |
| No automatic checkpoints; ember cannot be placed on moving or icy ledges | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Integrated types/tests | `npm run check` after merging main through e83b64b | 41 files, 272 tests passed |
| Authored course | `npm run check:levels` | basics, moving, ice, wind and finish all reachable |
| Production | `npm run build` | Pass; existing vendor-script bundling warning |
| Physics regression cases | environment.test.ts | Carry, vertical motion/landing, ice, bounded/local wind and invalid data covered |
| Visibility regression | moving-visibility.test.ts | Outlines track live geometry on ground/in air and skip unchanged redraws |
| UI inspection | localhost:5186 preview | First-jump lesson and sparse wax count present; moving shuttle visible in screenshot |

**Not verified:** Full human traversal of all hazards, real hardware, other browsers, mobile play or perceived difficulty. Reachability is a conservative sampled search, not proof of all possible routes. Protected-visibility candidate selection retains the upstream cached static reach heuristic; this PR updates drawn edge positions and makes essential hazard cues readable. It does not add a future-motion predictor to that heuristic.

## 3. Problems, workarounds and dead ends

- The level checker previously used static geometry. It now shares moving-platform and wind functions and samples four starting cycle phases.
- A test initially imported runtime content across lanes. Replaced it with a local typed fixture; the lane boundary check passes.
- Protected visibility merged during development. Merged main without rewriting history, then adjusted its rendering to follow live moving geometry and added a regression test.

## 4. Deviations from the plan

- Adds small tutorial previews of the requested expansion mechanics now; later full courses remain expansion work. No disappearing platforms added.
- Respects reduced motion for decorative arrows; functional platform movement remains, because removing it changes the level.

## 5. Changes

- Files: player movement/collision/types, platform registry, new world/environment.ts, world view and section validator, climb scene, level checker, tutorial content, HUD/strings, game config, shared contracts, tests, indexes, FEATURES. See PR diff.
- Contracts: optional authored motion, wind zones, lesson IDs, environmental config and snapshot lesson key. Backward-compatible for existing static fixtures; schema changes committed separately.
- Dependencies requested: None.
- Outside game lane: authored tutorial content and UI hints fulfill Ali's explicit request; small shared types and FEATURES changes explained in PR. No queue/rule edits.
- INDEX.md updated: Yes, game and content exports.

## 6. Follow-ups and questions for humans

- Ali: tune difficulty after a hands-on run, especially ice drift and wind strength. No input blocks development.
- Forest visuals PR #53 remains separate; preserve these collision surfaces, hazard cues and wax/ember mechanics when integrating its scenery.

## 7. Can a teammate explain this?

The first climb teaches one new thing at a time: a moving ledge, a slippery shelf, then a little wind. Their rules are authored and predictable, so the EEG cannot change how a jump works. Missing a jump loses height rather than ending the run.
