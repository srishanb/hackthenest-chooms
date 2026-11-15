# Agent Guide

Shared instructions for every coding agent on this repo (Claude Code, Codex, Antigravity).
`CLAUDE.md` and `GEMINI.md` import this file — edit rules here only.

## Project

**Lighten Up**: a 2D charge-jump climbing game for Hack The Nest 2026 (Nov 14–15, 24-hour build),
Mind and Machine (BCI) track. A PiEEG Octopus 16 EEG board drives the lantern, fog and music, and gates a recovery
mechanic. It never changes the controls or physics.

- Stack: Vite 8.3.8, TypeScript 7.0.2 (strict), Phaser 4.2.1, Vitest 5.1.0, npm. Exact pins. No backend.
- Read before you start: [docs/PLAN.md](docs/PLAN.md) (architecture, phases), [docs/STATUS.md](docs/STATUS.md),
  [docs/FEATURES.md](docs/FEATURES.md), [docs/HUMAN_TASKS.md](docs/HUMAN_TASKS.md), [docs/DECISIONS.md](docs/DECISIONS.md).
- Hard deadlines (Eastern): Devpost draft Sun 12:00 AM; feature freeze Sun 9:00 AM; final submission Sun 12:00 PM.

## Binding rules (never break these)

1. **Framing.** The signal is "composure" (calm versus tension). Never "emotion", never a diagnosis, never medical or
   therapeutic claims. Say openly that muscle activity is part of it. `stress` may appear in code only as an alias for
   tension, never in UI text, captions, README or Devpost copy.
2. **EEG never changes gravity, friction, jump strength, speed or steering.** `src/game/player/` must not import the
   composure contract.
3. **Nothing on the demo path uses the network.** No runtime CDN, no live API calls during play. Libraries come from
   the lockfile; assets and narrator clips are files in the repo.
4. **Secrets.** Keys live only in `.env.local`. Never commit them, never print them, never give a key a `VITE_`
   prefix (Vite ships those to the browser).
5. **Art.** Free existing assets only, logged in `CREDITS.md`. No AI-generated textures or models. The narrator
   uses a stock or designed voice; never clone or imitate a real person.
6. **Accuracy.** Do not invent an API name, version, config key or event rule. Verify it in the official docs or the
   pinned source, or mark it "unverified" in your report.
7. **Feature gate.** While `docs/FEATURES.md` says `Status: PROVISIONAL`, build only P0, P1, P2 and P3. Never build
   anything listed under "Considered, not scheduled" in `docs/PLAN.md`.

## Approval gate (before every phase and subphase)

1. Write `docs/plans/<phase-id>.md`: goal, a "Human tasks still open" table (copied from `docs/HUMAN_TASKS.md`:
   task, owner, whether it blocks this phase, and what happens to development if it is not done), files you will
   touch, contract changes, tasks, acceptance tests, risks, time estimate. Use `docs/plans/P0.md` as the model.
2. Open it as a **draft PR** (or show it to the human) and **stop**.
3. Start work only when the file reads `Status: APPROVED by <human name>`. **A human writes that line. Never write
   or edit it yourself, and never treat anything else as approval.**
4. Who approves: the lane owner for their lane; Srishan for P0 and anything touching shared files.

Order of work: do what needs **no** human first and in parallel. Put anything that depends on a human behind a stub or
the simulator so it never blocks another lane.

## After-job report (every task, every agent)

When you believe a task is complete, **before** you say so:

1. Copy `docs/agent-reports/TEMPLATE.md` to `docs/agent-reports/<YYYYMMDD-HHMM>-<agent>-<task>.md`.
2. Fill in every section: what you completed against the plan's acceptance tests, how you verified each one, what you
   did **not** verify, problems and dead ends, deviations, files and contracts touched, dependencies requested,
   follow-ups, and a confidence level per item.
3. Commit it on your branch and link it in the PR.

One file per task. Never edit another agent's report. A PR with no new report is flagged `needs-human`. Stop hooks for
Claude Code (`.claude/settings.json`), Codex (`.codex/hooks.json`) and Antigravity (`.agents/hooks.json`) run
`scripts/hooks/report-check.mjs`, which reminds you once.

## Parallel work: one agent, one worktree

Several agents work at the same time. Never share a working directory.

- Create a worktree per task: `scripts/wt.sh new <agent> <task>` → `../wt-<agent>-<task>` on branch `<agent>/<task>`.
  - `<agent>` is one of `claude`, `codex`, `ag` (Antigravity), or a teammate's name.
- Work, commit, and push **only** inside your own worktree. Do not edit files in other `wt-*` folders or in `codebase/` (main).
- Before starting a new task: `scripts/wt.sh sync` (rebases onto `origin/main`).
- Finish with a PR into `main`. Keep branches small and short-lived (merge within a few hours).
- PRs are reviewed by the `ai-review` workflow: clean → auto squash-merged; issues → `needs-human` label
  and a comment. Open as **draft** while still working; add `no-automerge` to opt out. PRs touching
  shared files (below) never auto-merge.
- Use the `PORT` in your worktree's `.env.local` for any dev server.

## Lanes (avoid overlapping edits)

Lanes are directories. Stay inside yours; if you must touch another lane, keep the change minimal and say so in the PR
and in your report. **Lanes import only `src/shared/` and `src/config/`, never each other** (a test enforces it).

| Lane | Directories | Owner |
|------|-------------|-------|
| Integrator | Root config, `src/main.ts`, `src/shared/`, `public/vendor/`, `docs/` registers, `scripts/`, `.github/`, `.claude/`, `.codex/`, `.agents/` | Srishan |
| Signal | `src/signal/`, `src/config/signal.config.ts`, `src/ui/components/debug-overlay/`, `tools/eval/`, `recordings/` | Srishan |
| Game | `src/game/`, `src/config/game.config.ts`, `src/config/ember.config.ts`, `tools/levels/` | Ali |
| UI | `src/ui/` (except `debug-overlay/`), `src/config/ui.config.ts` | Amrit |
| Audio and narrator | `src/audio/`, `src/config/audio.config.ts`, `tools/narrator/` | Amrit |
| Content and tuning | `src/content/`, `src/config/effects.config.ts`, `public/assets/`, `CREDITS.md` | Neil |

Anyone may add their own file under `docs/plans/` and `docs/agent-reports/`.

## Shared files (single owner)

Highest collision risk. Only the integrator (whoever is on `main`) changes these, in their own small PR:

- Dependency manifests and lockfiles (`package.json`, `package-lock.json`)
- `src/shared/` (contracts, event list, bus, store) and `src/main.ts`
- Root config (`tsconfig.json`, `vite.config.ts`, `index.html`), CI, hook configs, `scripts/`, and this file
- `docs/PLAN.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/FEATURES.md`

Need a new dependency or contract change? Ask in the PR description or stop and report it — do not add it yourself.
Tunable **values** in `src/config/` belong to the lane that owns the file; their **types** are contracts.

## Architecture rules

- **The game never imports a device.** It reads `ComposureState` through the `ComposureReader` it is given.
- **Publish, do not reach.** Game and signal code publish state to stores and events to the bus. UI, audio, narrator
  and recorder subscribe. Gameplay and signal code never draw UI and never hold player-facing strings.
- **Effects are data.** Every signal-driven effect is a row in `src/config/effects.config.ts` with a cap, a smoothing
  time constant and a written never-rule. Do not hard-code effect numbers.
- **UI.** One folder per component under `src/ui/components/`, registered in `src/ui/registry.ts`. Colours, fonts,
  sizes and spacing come from `src/ui/theme/tokens.css`; text comes from `src/ui/strings.ts`. Removing a component
  must never break gameplay.
- **A new algorithm is a new file plus a registry line**, never an edit to the game. All tunable numbers live in the
  typed config with units.
- **Reuse before you write.** Search with `rg` and read the lane's `INDEX.md` before adding a function, component or
  utility; extend what exists. Add new public exports to `INDEX.md`.
- **Readable for beginners.** Short files with one responsibility, named exports, typed interfaces, and a header
  comment on every module saying what it does and why. No clever abstraction without a stated reason. Any teammate
  must be able to explain any file to a judge.
- **Performance.** Do per-frame work only in the render loop; keep signal work at about 12 Hz; measure before adding
  anything heavy.

## Conventions

- Conventional Commits, lowercase imperative: `feat(game): add charge jump`, `fix(signal): mark stale samples invalid`.
- Small atomic commits. No secrets in code — use `.env.local` (gitignored) and keep `.env.example` updated.
- Strict typing (TypeScript strict / Python type hints).
- Before opening a PR: `npm run check` (type check and tests) passes.
- Don't run long-lived watchers or servers unless asked.
