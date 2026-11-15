# Decisions

One line per decision. Only the integrator edits this file. A **Decision** was confirmed by a human; a
**Recommendation** is in force until a human overrules it; **Open** still needs an answer.

## Decisions

| ID | Date | Decided by | Decision |
|---|---|---|---|
| D-01 | 14 Nov 2026 | Team (brief) | Framing is binding: the signal is called composure (calm versus tension), never emotion and never a diagnosis; muscle activity is openly part of it; the game is composure practice and an experimental prototype, not a medical device. `stress` may appear in code only as an alias for tension, never in UI or Devpost text. |
| D-02 | 14 Nov 2026 | Team (feature spec) | The provisional feature spec replaces the earlier feature list: authored sections, the recovery ember, EEG never changes physics, finish by climbing. Its "lower-priority" table is not scheduled. |
| D-03 | 14 Nov 2026 | Team rule | Midnight checkpoint (a clear eyes-closed rise on a real board, or everything else pauses) and a 9:00 AM Sunday feature freeze. |
| D-04 | 14 Nov 2026 | Srishan | Stack: Vite 8.3.8, TypeScript 7.0.2 strict, Phaser 4.2.1, exact pins. Fallbacks (Phaser 3.90.0, TypeScript 6.x) are decided inside P0 if the spike or the type check fails. |
| D-05 | 14 Nov 2026 | Srishan | No backend server. Node scripts in `tools/` read keys from `.env.local` at build time only. |
| D-06 | 14 Nov 2026 | Srishan | UI is an HTML/CSS layer over the canvas in plain TypeScript, no framework. |
| D-07 | 14 Nov 2026 | Srishan | No data prize for now; it is listed under "Considered, not scheduled". |
| D-08 | 14 Nov 2026 | Srishan | Working project name is **lighten**. It is temporary (H-11). |
| D-09 | 14 Nov 2026 | Srishan | The climb is two authored sections, about two minutes for a stranger. |
| D-10 | 14 Nov 2026 | Srishan | Approvals: each lane owner approves plans in their own lane; Srishan approves P0 and anything touching shared files. |
| D-11 | 14 Nov 2026 | Srishan | The Stop hook blocks once when a branch has work but no after-job report, then allows the agent to stop. |
| D-12 | 14 Nov 2026 | Srishan | `docs/plans/P0.md` approved in chat at about 7:55 PM. At his instruction the agent recorded the approval line and merged the architecture PR (#3). One-off; the approval-gate rule is unchanged. |
| D-13 | 14 Nov 2026 | Team | `docs/FEATURES.md` set to FINAL at 10:31 PM (commit f4415d9 on main, GitHub user avinculado). The feature gate is lifted: P4 onward may be built once each plan is approved. |
| D-14 | 14 Nov 2026 | Srishan | The g.tec Unicorn headset is removed from the project: it is no longer borrowable. Hardware is the Octopus 16 plus test data (simulator and recordings). |
| D-15 | 14 Nov 2026 | Srishan | Current priority: reach a state where we can build and test on a real Octopus 16. |
| D-16 | 14 Nov 2026 | Srishan | One continuous Sonnet 5.5 builder session works through `docs/QUEUE.md` task by task. Queue tasks are approved by the human merge of the queue PR. Every agent claims a task with an empty commit, a pushed branch and a draft PR before building. |
| D-17 | 14 Nov 2026 | Srishan | Never delete git history: no force pushes, no rebasing pushed commits, no deleting branches or tags. The most important rule in the repo; enforced by a pre-push hook, a Claude Code hook, a workflow and the watcher. GitHub's "delete head branches on merge" setting was turned off. |

## Recommendations in force (overrule by adding a Decision row)

| ID | Date | Recommendation | Reason |
|---|---|---|---|
| R-01 | 14 Nov 2026 | The contract field is `intensity` (plus `resting`, `restingActive`, `quality`, `valid`, `sampleAgeMs`), replacing the brief's `C`, `settle`, `tension` | The feature spec asks for two separately calibrated outputs and a separate quality value. |
| R-02 | 14 Nov 2026 | npm, not pnpm | Ships with Node; one less install on four laptops. |
| R-03 | 14 Nov 2026 | Vendor `pieeg.js` 1.3.0-octopus from the starter repo at commit `7ea7891` into `public/vendor/` | It has the simulator and contact-quality API; no CDN at runtime. |
| R-04 | 14 Nov 2026 | No ESLint; TypeScript strict is the lint | One less toolchain overnight. |
| R-05 | 14 Nov 2026 | Lanes and owners as in `AGENTS.md`; types in `src/shared/` (integrator), tunable values in `src/config/` (lane owners) | Tuning never waits on the integrator. |
| R-06 | 14 Nov 2026 | Simulator keys are not Space, A or C; they come from `signal.config.ts` | The starter binds Space to a blink, which is our jump key. |
| R-07 | 14 Nov 2026 | Walkthrough 2 at 9:30 AM, not 10:00 AM | 10:00 AM collides with the demo-video workshop. |
| R-09 | 14 Nov 2026 | Levels are typed data files checked by a reachability script; no Tiled | No extra file format or loader tonight. |

## Open

| ID | Question | Owner | Needed by |
|---|---|---|---|
| O-02 | The final project name (H-11) | Team | Sun 9:00 AM |
| O-03 | Whether a simulated or replayed signal counts if hardware fails (H-06b) | Ali | Sat 11:00 PM |
| O-04 | Whether to trim Core at the feature gate: key remapping, separate volumes, persistence between sessions, Gemini drafting | Team | With O-01 |
