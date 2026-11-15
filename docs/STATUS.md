# Status

Normally only the integrator edits this file, to avoid merge conflicts. Statuses: Proposed, In progress, Built, Done,
Cut. **Built** means merged to `main` and covered by tests, but not yet checked on a real EEG board or by a person
playing on the demo laptop. **Done** is used only where nothing more is needed.

Last updated: Sun 15 Nov 2026, 8:30 AM Eastern, from `origin/main` at commit `ff068bb` (PR #73) and the merged-PR list.
Feature freeze is 9:00 AM; final submission is 12:00 PM.

Rows were rebuilt from `git log origin/main`, merged PRs and `docs/agent-reports/`. Phase boundaries are approximate:
several PRs (forest, wax, corruption, candle) were added outside the original phase plan under Decision D-22.

## Hardware caveat

**Nothing in this repo has been run against a real PiEEG Octopus 16.** Every signal row below was verified on the
simulator, on recordings or against a fake SDK. `recordings/` holds only `sim-fixture.jsonl`. Tasks H-02, H-03, H-19
(midnight checkpoint) and queue task Q-06 are open. Follow [OCTOPUS_TEST.md](OCTOPUS_TEST.md) on the board.

## Phases

| Phase | Goal | Owner | Status | Merged PRs | Notes |
|---|---|---|---|---|---|
| Architecture | Master plan and repo preparation | Srishan | Done | #3 | [PLAN.md](PLAN.md) |
| P0 | Foundation | Srishan | Done | #4 | [plans/P0.md](plans/P0.md) |
| P1 | Signal core on the simulator | Srishan | Done | #7, #8, #9, #11, #13, #15 | Sources, stages, calibration, pipeline, recorder, eval tool, debug overlay. `intensity-v2` is the default algorithm. [plans/P1.md](plans/P1.md) |
| P2 | UI shell | Amrit | Built | #20, #24, #34, #43, #47, #49, #58, #64, #65, #66, #72, #73 | Tokens, strings, settings, pause and settings menus, HUD, captions, start menu, finish screen. [plans/P2.md](plans/P2.md) |
| P3 | Real hardware bring-up | Srishan, Neil | In progress, **unverified** | #17, #19, #29 | Live board source and test kit are merged. Not run on a real board. Q-06 and H-19 are open |
| Feature gate | Finalised list | Team | Closed | n/a | [FEATURES.md](FEATURES.md) FINAL at 10:31 PM Sat (D-13) |
| P4 | Game core | Ali | Built | #35, #36, #37, #38, #39, #40, #41, #45, #50, #51, #57, #60, #67, #68, #69, #71, #74, #75, #79 | Charge-jump movement, falling with no death, five-stage continuous climb, landing finish, wax rewards, procedural candle player and portrait, level checker, simple authored stage editor. [plans/P4.md](plans/P4.md) |
| P5 | Lantern and atmosphere | Ali, Neil | Built, partly **unverified** | #51, #57, #77, #80, #81 | Light radius, protected visibility, lantern fuel, corruption effects. Fixed-light fallback exists. Poor-signal behaviour (P5.5) tested only with simulated signal loss |
| P5.4 | Adaptive audio | Amrit | Built | #26, #59, #61 | Mix rules, gesture-unlocked music engine, event sound effects. One ambient loop; there is no separate tense music stem |
| P6 | Recovery ember | Ali | Built | #37, #45 | One reusable player-placed ember, R recovery, five-second cooldown, four-second valid-signal gate. The gate has not been exercised with a real signal |
| P6.1 | Calibration flow and screens | Amrit | Built, **unverified** | #30, #52 | Resting and active calibration screens, fallback choice. Not run with a real signal |
| P7 | Narrator | Amrit, Neil | Partly built | #64, #82, #83 | Captions, twelve original intro clips (six lines in each of two stock voices) generated offline, human listening review not recorded, stock-voice choice with preview. The full event-driven narrator director (P7.3) is not built; clips play as run intros only |
| P8 | Content and presentation | Neil | Built | #18, #27, #53, #56, #62, #76, #78 | Licensed art and audio, forest world, stage content, weather, corruption, Lighten Up rename. Asset licences in [../CREDITS.md](../CREDITS.md) |
| P9 | Submission | Srishan, Amrit | In progress | n/a | README refreshed. Devpost, video, public repo, history ruleset and the "what worked" note are open: see [HUMAN_TASKS.md](HUMAN_TASKS.md) |
| P10 | BCI option: eyes-closed ember | n/a | Not started | n/a | Only after every Core item. No code on `main` |
| P11 | Expansion platforming | Ali | Partly built | #50, #60, #76 | Moving shuttle (tutorial), wind and ice stages exist as part of the stage content. Disappearing platforms (PLT-4) are not built |
| P12 | Polish: landing shake | n/a | Not started | n/a | A `landingShake` setting exists in the settings contract but nothing reads it |

## Open pull requests

| PR | Title | State |
|---|---|---|
| #55 | docs(plans): P13 dev-only level editor over a step generator | Draft plan only. A simple stage editor merged separately as #79 |
| #12 | refactor: rename project to lighten up and add team credits | Draft. The rename itself merged as #56 |

## Open human tasks that gate the demo

| ID | What | Why it matters |
|---|---|---|
| H-02, H-03, H-04 | Borrow, flash and power the Octopus 16 | No live signal until done |
| H-19 | Midnight checkpoint recordings under `recordings/` | The core claim (eyes-closed rise) is unproven until a real recording exists |
| H-12, H-13 | Playtest on four heads and a stranger; offline preview test | Thresholds and the offline demo are untested |
| H-16, H-17, H-24 | Devpost draft, demo video, final submission | Deadlines Sun 12:00 AM (draft) and Sun 12:00 PM (final) |
| H-23, H-25 | Make the repo public and add the branch-protection ruleset | Required for submission |

See [HUMAN_TASKS.md](HUMAN_TASKS.md) for the full list and [agent-reports/](agent-reports/) for every task's
verification notes.
