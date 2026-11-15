# Status

Normally only the integrator edits this file, to avoid merge conflicts. Statuses: Proposed, In progress, Built, Done,
Cut. **Built** means merged to `main` and covered by tests, but not yet checked on a real EEG board or by a person
playing on the demo laptop. **Done** is used only where nothing more is needed.

Last updated: Sun 15 Nov 2026, about 11:30 AM Eastern, from `origin/main` at commit `93915b4` (PR #130) and the merged-PR list.
The feature freeze (10:00 AM, D-24) has passed. Only fixes, documentation, build and smoke-test work, and submission
material are allowed now. Final submission is 12:00 PM.

Rows were rebuilt from `git log origin/main`, merged PRs and `docs/agent-reports/`. Phase boundaries are approximate:
several PRs (forest, wax, corruption, candle, fuel) were added outside the original phase plan under Decision D-22.

## Hardware caveat

**Nothing in this repo has been run against a real PiEEG Octopus 16.** Every signal row below was verified on the
simulator, on recordings or against a fake SDK. `recordings/` holds only `sim-fixture.jsonl`, and no file under `docs/agent-reports/` records a real-board run.
Tasks H-02, H-03, H-19 (midnight checkpoint) and queue task Q-06 are open in the registers. Patches to the board
connection code may still land: treat the live source as untested until a recording exists. Follow [OCTOPUS_TEST.md](OCTOPUS_TEST.md) on the board.

## Phases

| Phase | Goal | Owner | Status | Merged PRs | Notes |
|---|---|---|---|---|---|
| Architecture | Master plan and repo preparation | Srishan | Done | #3 | [PLAN.md](PLAN.md) |
| P0 | Foundation | Srishan | Done | #4 | [plans/P0.md](plans/P0.md) |
| P1 | Signal core on the simulator | Srishan | Done | #7, #8, #9, #11, #13, #15 | Sources, stages, calibration, pipeline, recorder, eval tool, debug overlay. `intensity-v2` is the default algorithm. [plans/P1.md](plans/P1.md) |
| P2 | UI shell | Amrit | Built | #20, #24, #34, #43, #47, #49, #58, #64, #65, #66, #72, #73, #85, #86, #89, #92, #108, #111, #115, #119, #125, #126 | Tokens, strings, settings, pause and settings menus, HUD with flame compass, captions (including in-game captions), start menu with animated candle emblem, finish screen, minimal tutorial controls, replay presets in Settings. [plans/P2.md](plans/P2.md) |
| P3 | Real hardware bring-up | Srishan, Neil | In progress, **unverified** | #17, #19, #29, #123 | Live board source, test kit and crash and NaN guards from the stress audit are merged. Not run on a real board. Q-06 and H-19 are open. A draft PR (#90) for a calibrated gesture input manager is not merged |
| Feature gate | Finalised list | Team | Closed | n/a | [FEATURES.md](FEATURES.md) FINAL at 10:31 PM Sat (D-13) |
| P4 | Game core | Ali | Built | #35, #36, #37, #38, #39, #40, #41, #45, #50, #51, #57, #60, #67, #68, #69, #71, #74, #75, #79, #93, #101, #117, #120, #121 | Charge-jump movement, falling with no death, five-stage continuous climb that gets harder, landing finish (an emptied-fuel ember must be relit to finish), wax rewards, procedural candle player and portrait, level checker, authored stage editor with published stage layouts, six extra moving ledges. [plans/P4.md](plans/P4.md) |
| P5 | Lantern and atmosphere | Ali, Neil | Built, partly **unverified** | #51, #57, #77, #80, #81, #98, #102, #104, #110, #114, #116, #129, #130 | Light radius, protected visibility, lantern fuel (visibility follows fuel in both worlds; fuel drains faster at maximum corruption), corruption effects, active calibration drives corruption on its own, live corruption reacts to smaller spikes. Fixed-light fallback exists. Poor-signal behaviour (P5.5) tested only with simulated signal loss. Tuning has not been checked against a real signal |
| P5.4 | Adaptive audio | Amrit | Built | #26, #59, #61, #100, #103, #122, #128 | Mix rules, gesture-unlocked music engine, event sound effects, a tense music layer that follows the signal, an adaptive soundtrack for the corrupted world. Narration keeps playing through jumps and recovery. Not heard on a real signal |
| P6 | Recovery ember | Ali | Built | #37, #45 | One reusable player-placed ember, R recovery, five-second cooldown, four-second valid-signal gate. The gate has not been exercised with a real signal |
| P6.1 | Calibration flow and screens | Amrit | Built, **unverified** | #30, #52 | Resting and active calibration screens, fallback choice. Not run with a real signal |
| P7 | Narrator | Amrit, Neil | Built, partly **unverified** | #64, #82, #83, #103, #128 | Captions, original offline clips in two stock voices, human listening review not recorded, stock-voice choice with preview. `src/audio/narrator/moments.ts` turns game events (height steps, low fuel) into sparse narration requests. A fuller scripted narrator director (P7.3) is not built |
| P8 | Content and presentation | Neil | Built | #18, #27, #53, #56, #62, #76, #78, #105, #106, #118 | Licensed art and audio, forest world, stage content, weather, corruption, Lighten Up rename. Asset licences in [../CREDITS.md](../CREDITS.md) |
| P9 | Submission | Srishan, Amrit | In progress | #87, #88, #99 | README refreshed, MIT licence added, built game deployed to GitHub Pages by `.github/workflows/pages.yml`. The repo is public. Devpost, video, history ruleset and the "what worked" note are tracked in [HUMAN_TASKS.md](HUMAN_TASKS.md) |
| P10 | BCI option: eyes-closed ember | n/a | Not started | n/a | Only after every Core item. No code on `main` |
| P11 | Expansion platforming | Ali | Partly built | #50, #60, #76, #120 | Moving shuttle (tutorial), moving ledges, wind and ice stages exist as part of the stage content. Disappearing platforms (PLT-4) are not built |
| P12 | Polish: landing shake | n/a | Not started | n/a | A `landingShake` setting exists in the settings contract but nothing reads it |

## Open pull requests

All three are drafts.

| PR | Title | State |
|---|---|---|
| #127 | feat(release): windows installer for the baseline | Draft |
| #90 | [claim] octopus input manager: calibrated gestures and alpha events | Draft claim. Not merged |
| #55 | docs(plans): P13 dev-only level editor over a step generator | Draft plan only. A simple stage editor merged separately as #79 and #101 |

## Open human tasks that gate the demo

| ID | What | Why it matters |
|---|---|---|
| H-02, H-03, H-04 | Borrow, flash and power the Octopus 16 | No live signal until done |
| H-19 | Midnight checkpoint recordings under `recordings/` | The core claim (eyes-closed rise) is unproven until a real recording exists |
| H-12, H-13 | Playtest on four heads and a stranger; offline preview test | Thresholds and the offline demo are untested |
| H-16, H-17, H-24 | Devpost draft, demo video, final submission | Deadlines Sun 12:00 AM (draft) and Sun 12:00 PM (final) |
| H-25 | Add the branch-protection ruleset | The repo is now public (H-23's visibility step is done: `gh repo view` reports PUBLIC) and the game is live on GitHub Pages. The ruleset is unverified |

See [HUMAN_TASKS.md](HUMAN_TASKS.md) for the full list and [agent-reports/](agent-reports/) for every task's
verification notes.
