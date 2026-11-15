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
| D-08 | 14 Nov 2026 | Srishan | Working project name is **lighten**. It is temporary (H-11). Superseded by D-23. |
| D-09 | 14 Nov 2026 | Srishan | The climb is two authored sections, about two minutes for a stranger. |
| D-10 | 14 Nov 2026 | Srishan | Approvals: each lane owner approves plans in their own lane; Srishan approves P0 and anything touching shared files. |
| D-11 | 14 Nov 2026 | Srishan | The Stop hook blocks once when a branch has work but no after-job report, then allows the agent to stop. |
| D-12 | 14 Nov 2026 | Srishan | `docs/plans/P0.md` approved in chat at about 7:55 PM. At his instruction the agent recorded the approval line and merged the architecture PR (#3). One-off; the approval-gate rule is unchanged. |
| D-13 | 14 Nov 2026 | Team | `docs/FEATURES.md` set to FINAL at 10:31 PM (commit f4415d9 on main, GitHub user avinculado). The feature gate is lifted: P4 onward may be built once each plan is approved. |
| D-14 | 14 Nov 2026 | Srishan | The g.tec Unicorn headset is removed from the project: it is no longer borrowable. Hardware is the Octopus 16 plus test data (simulator and recordings). |
| D-15 | 14 Nov 2026 | Srishan | Current priority: reach a state where we can build and test on a real Octopus 16. |
| D-16 | 14 Nov 2026 | Srishan | One continuous Sonnet 5.5 builder session works through `docs/QUEUE.md` task by task. Queue tasks are approved by the human merge of the queue PR. Every agent claims a task with an empty commit, a pushed branch and a draft PR before building. |
| D-17 | 14 Nov 2026 | Srishan | Never delete git history: no force pushes, no rebasing pushed commits, no deleting branches or tags. The most important rule in the repo; enforced by a pre-push hook, a Claude Code hook, a workflow and the watcher. GitHub's "delete head branches on merge" setting was turned off. |
| D-18 | 14 Nov 2026 | Srishan | No manual review for pull requests. Anyone may push to their own branch and open a PR. A reviewer agent (Claude Opus 5.5 session, Remote Control on) reviews and squash-merges every ready PR, comments when it finds issues and notifies Srishan's phone. The GitHub Action no longer reviews or merges; it only runs the checks. Plan approval lines stay human. If the reviewer is down, any teammate may merge by hand after the check passes. |
| D-19 | 14 Nov 2026 | Srishan | A Sonnet 5.5 bug-hunter session looks for bugs on `main` and fixes each in its own small, tested PR. It is queue task Q-07, a standing task claimed per bug. No features, refactors or rule changes. |
| D-20 | 14 Nov 2026 | Srishan | The approval gate is relaxed ("Relax it"): a plan's approver may tell their own agent to record `Status: APPROVED by <name>`, with an approval note, in a commit from the approver's own GitHub account. Agents still never approve on their own initiative or for another person's lane. Lane owners approve their own plans, including ones that ask for a small contract change. |
| D-21 | 15 Nov 2026 | Srishan | Owner override on P2 ("change the plan and force approve p2.3"): one approval of `docs/plans/P2.md` now covers P2.1 to P2.4, and `docs/plans/P2.3.md` is approved by Srishan. Amrit still owns the UI lane. Srishan may approve any plan as repo owner; each override gets a row here. |
| D-22 | 15 Nov 2026 | Srishan | "let people commit whatever they want provided its not breaking or goes against the ethos of the game." The reviewer holds a pull request for only two reasons: it breaks something (check, build, or a bug that breaks the game or another person's work), or it goes against the ethos (the binding rules and never deleting git history). Lanes, plans and approvals, the feature list, claims, pre-code checks and after-job reports are advice, not gates. |
| D-23 | 15 Nov 2026 | Srishan | The game is named **Lighten Up** ("rename the game to lighten up"). Player-facing text and docs use it; storage keys, the recording format id and the npm package name keep `lighten` so saves and recordings still load. Closes H-11 for the name. |
| D-24 | 15 Nov 2026 | Srishan | Owner decision: the feature freeze moves from Sun 9:00 AM to a strict Sun 10:00 AM so all features can be finished. Wrap-up starts now: full builds and smoke tests of the built game run alongside feature work. After 10:00 AM only fixes, build and smoke-test work, and submission material. |

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
