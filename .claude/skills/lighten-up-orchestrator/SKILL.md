---
name: lighten-up-orchestrator
description: "Entry point for all work in the Lighten Up repo: invoke it before responding to any request here, including questions. It triages first (trivial or off-topic requests are answered directly and stop), and for real build or fix work it runs the team: a written brief, feature-builder (Opus) for new functionality or bug-fixer (Sonnet) for fixes and tuning, game-qa for review, then the lead verifies and integrates (npm run check, npm run build, screenshots, after-job report, git, draft PR). Use it for 'add...', 'build...', 'make it...', 'fix...', 'tweak...', 'tune...', 'change...', 'polish...', 're-run', 'run again', 'update', 'modify', 'improve the previous result', 'only the QA again', 'verify', 'check it', 'release', 'merge', 'open a PR', and any change to the game, the UI, audio, content, the desktop app or the tooling."
---

# Lighten Up orchestrator

Coordinates the work in this repository: who writes code, who reviews it, how it is verified and
how it reaches git. The rules in `AGENTS.md` stay in force throughout; this skill only adds the
team and the order of work.

## Execution mode: subagents

Agents are spawned with the `Agent` tool and report back through their return value plus files under
`_agents_workspace/`. No agent team is formed: the pattern is **producer, then reviewer** (build or fix,
then QA), and the agents never need to talk to each other mid-task. The lead (the session running this
skill) passes information between them.

## The rule on who writes code

**The lead session does not write code itself.** It writes the brief, reviews the result, verifies it
(runs the checks, looks at screenshots) and handles git. Coding goes to subagents by difficulty. The
owner, Srishan, asked for this on 16 Nov 2026: it keeps the lead's context for judgment and review,
puts the strongest model on the hard work and the cheaper one on fixes, and gives every change a second
pair of eyes. Small non-code edits the lead may make itself: plans, reports, briefs, docs registers it owns.

## Agents

| Agent | `subagent_type` | Model | Role | Skills and tool roles it uses | Output |
|---|---|---|---|---|---|
| `feature-builder` | `feature-builder` | Opus (`claude-opus-5-5`, set in its file) | New functionality and harder work | `phaser4-api` (framework-api), `play-verify`, `ethos-check` | Code in its working directory; `_agents_workspace/02_feature-builder_handoff.md` when asked |
| `bug-fixer` | `bug-fixer` | Sonnet (`claude-sonnet-5-5`, set in its file) | Fixes, tuning, easier adjustments, review feedback | `phaser4-api`, `play-verify` | Code in its working directory; `_agents_workspace/02_bug-fixer_handoff.md` when asked |
| `game-qa` | `general-purpose`, prompted to follow `.claude/agents/game-qa.md` | Opus (`claude-opus-5-5`) | Cross-boundary review, ethos check, checks, smoke test. Never edits code | `ethos-check`, `play-verify`, tool roles in `references/tools.md` | `_agents_workspace/03_game-qa_findings.md` |

`game-qa` uses the `general-purpose` type because QA must run commands (checks, builds, the browser),
which a read-only type cannot. Its role, method and report format live in its file; the spawn prompt
says "Read `.claude/agents/game-qa.md` first and follow it".

### Routing by difficulty

| The request | Goes to |
|---|---|
| A new mechanic, scene, component, generator rule, effect row, tool or script; anything touching several files or a renderer feature (filters, shaders) | `feature-builder` |
| A bug, failing test or build, wrong value, tuning numbers in `src/config/`, copy change, small visual adjustment, review feedback | `bug-fixer` |
| A fix that turns out to need new functionality | back to `feature-builder` (bug-fixer says so and stops) |
| Unsure | `feature-builder`: a wrong guess costs money, not quality |
| A release of the desktop app | the lead, following the `game-only-release` skill (no code agent unless `desktop/` code changes) |

## Data passing

- **Files** under `_agents_workspace/` (ignored by git) carry anything large, named
  `{phase}_{agent}_{artifact}.md`: `01_lead_brief.md`, `02_feature-builder_handoff.md`,
  `02_bug-fixer_handoff.md`, `03_game-qa_findings.md`, `04_lead_verification.md`. Screenshots go to
  `_agents_workspace/shots/`.
- **Return values** carry the summary: each agent's final message is short (what changed, how it was
  verified, what is not verified). The lead summarises it into the next brief rather than pasting it whole.
- Never copy a plan, queue entry, issue or PR text into the workspace: point to it by path or number.

## Workflow

### Phase 0: intake and triage (always first)

This skill runs for every prompt, so triage before anything else.

- **Trivial, conversational, or outside this repo's work** (a question about the code, an explanation,
  "what does X do", a status question, a one-line answer): answer it directly and stop. Form no team,
  open no workspace.
- **Real build or fix work**: run the context check, then continue.

**Context check:**

- `_agents_workspace/` absent: initial run. Go to phase 1.
- `_agents_workspace/` present and the request changes part of the previous result ("only the QA again",
  "fix what QA found", "make the flame brighter instead"): partial re-run. Re-run only the affected agent,
  pass it the path of its previous output, and overwrite only that output.
- `_agents_workspace/` present and the request is new work: move the old folder to
  `_agents_workspace/archive/<YYYYMMDD_HHMMSS>/` (create `archive/` if needed), then go to phase 1.

### Phase 1: prepare

1. **Pre-code check** (AGENTS.md "Before you write code"): `git fetch origin --prune`; look on the target
   branch for what you are about to build (`rg` for the names you expect, the lane's `INDEX.md`,
   `git log --oneline -20`); look at other people's work (`gh pr list --state all --search "<keywords>"`,
   `git ls-remote --heads origin`, the newest files in `docs/agent-reports/`). Already done: say so and
   stop. In progress: it is taken. Partly done: build only the missing part, extending what exists.
2. **Target branch.** New work goes to `game-only` and reaches `main` by pull request (`docs/GAME_ONLY.md`,
   Decision D-31); the repository's settings allow squash merges only, and after a merge `origin/main` is
   merged back into `game-only`. Follow the owner if they name another branch.
3. **Claim** (AGENTS.md "Task queue and claims"): for a queue task in `docs/QUEUE.md`, an empty
   `chore(claim): <agent> starts <task>` commit pushed with the branch name and a draft PR titled
   `[claim] <task>: <title>`. Other work still benefits from a plan file in `docs/plans/` (advice since
   Decision D-22, not a gate); a plan in another person's lane is approved only by that person.
4. **Lane and files.** Name the lane (AGENTS.md "Lanes") and the files to read and touch. Lanes import
   only `src/shared/` and `src/config/`. Shared files (manifests, `src/shared/`, root config, CI, hooks,
   `scripts/`, registers) are for the integrator: if the work needs one, say so in the brief.
5. **Route** using the table above.
6. Create `_agents_workspace/` and write `01_lead_brief.md`.

### Phase 2: build or fix

Spawn one agent with a **self-contained brief**: it starts with no memory of this conversation. A good
brief contains:

- **Goal**: one or two sentences, and what "done" looks like in the game.
- **Files to read first**: `AGENTS.md`, the lane's `INDEX.md`, the exact source and config files, any plan.
- **Constraints**: lane, files it must not touch, the binding rules that matter here (composure never
  touches controls or physics; no network; no generative-AI art; effects are rows in
  `src/config/effects.config.ts`; text in `src/ui/strings.ts`), "use the `phaser4-api` skill before
  writing Phaser code".
- **How to verify**: `npm run check`, `npm run build`, and for anything visible the `play-verify` smoke
  run with a fixed query (for example `?bot=1&seed=42`) and the seconds to screenshot.
- **What to report**: the files changed, the real check results, what it did not verify, anything the
  integrator must do; and whether to write `_agents_workspace/02_<agent>_handoff.md`.
- **Git**: either "leave changes uncommitted" or "commit on your worktree branch in small conventional
  commits; do not push". Agents never push, merge or open pull requests.

**One agent per working directory.** Never let two agents edit the same folder. For parallel work,
give each agent its own worktree: `scripts/wt.sh new <agent> <task>` (with `BASE_BRANCH=game-only`
for work aimed at `game-only`), or the `Agent` tool's worktree isolation option (worktrees under
`.claude/worktrees/`, ignored by git). Run independent agents in one message with
`run_in_background: true` and collect their results; run dependent ones in order.

Example spawn (feature): `Agent(subagent_type: "feature-builder", description: "Add ice sparkle", prompt:
<the brief>)`. The agent file sets the model; do not override it.

### Phase 3: QA

Spawn `game-qa` (`subagent_type: "general-purpose"`, `model: "claude-opus-5-5"`) with: the path of the
working directory or branch, the base to diff against, the brief's path, the files changed, and the
smoke-run query to use. It reads `.claude/agents/game-qa.md`, reviews, and writes
`_agents_workspace/03_game-qa_findings.md`.

- Run it **as each module lands**, not only at the end: after every builder hand-off that changes a
  contract, a config type, an effect row or a renderer path.
- Findings with severity "hold" go back to the same builder (bug-fixer for small ones) as a new brief
  that quotes file, line and evidence. Then QA again on the changed files.
- **At most two fix rounds.** If holds remain after the second, stop and take them to the owner with the
  findings file; do not loop.

### Phase 4: integrate (the lead)

1. **Review the diff yourself** (`git diff <base>...HEAD`). QA's pass does not replace reading it.
2. **Verify**: `npm run check` and `npm run build` must pass; for visible changes, run `play-verify` and
   look at the screenshots; run the `ethos-check` skill's commands. Write the results to
   `_agents_workspace/04_lead_verification.md`.
3. **After-job report**: copy `docs/agent-reports/TEMPLATE.md` to
   `docs/agent-reports/<YYYYMMDD-HHMM>-<agent>-<task>.md` and fill in every section honestly, including
   what was not verified. One file per task; never edit another agent's report.
4. **Commit** in small Conventional Commits (`feat(game): ...`, `fix(ui): ...`), lowercase imperative,
   with the attribution lines the session gives.
5. **Push with the branch name**: `git push -u origin <agent>/<task>`, never a bare `git push`.
6. **Pull request**: open it as a draft (or move the claim PR along), into the target branch; body with
   the `Pre-code check:` line, a short plan, the checks run, and a link to the report. Mark it ready when
   done; the reviewer agent merges.

**Never:** force push (`--force`, `-f`, `--force-with-lease`, `+refspec`), rebase or `pull --rebase`,
delete a pushed branch or tag, `--no-verify`, or edit the history guards (`.githooks/`, `scripts/hooks/`,
`.claude/settings.json`). A rejected push is fixed with `git fetch origin` and `git merge`. If history
seems to need rewriting (a committed secret), stop and tell Srishan.

### Phase 5: finish

1. Tell the owner, in plain language: what changed and where it shows in the game, how it was verified
   (with the screenshot paths), what was **not** verified, the branch and PR, and anything only a person
   can do.
2. Keep `_agents_workspace/` (it is the audit trail for a re-run; it is ignored by git).
3. Offer once: "Anything to improve in the result or in how the team worked?" If the answer is about
   the harness itself, record a row in the change-history table in `CLAUDE.md` when you change it.

## Error handling

| Situation | What to do |
|---|---|
| An agent fails, times out or returns nothing useful | Retry once with a sharper brief (name the failure). On a second failure, continue without that result, note the gap in the report and the summary, and tell the owner |
| Most agents fail, or the checks fail for reasons outside the task | Stop and ask the owner before going further |
| A builder's work conflicts with QA or with another agent's work | Never delete either. Record both in `_agents_workspace/` with their sources (agent, file, line) and decide in review, or ask the owner |
| A tool is missing (MCP not approved, no Playwright) | Use the alternative in `references/tools.md` and say so |
| The work needs a shared file or another lane | Keep the change minimal, explain it in the PR body and report, or hand it to the integrator |
| A merge conflict with the target branch | `scripts/wt.sh sync` (merge), resolve, re-run the checks; never rebase |

## Test scenarios

**Normal.** "Make the candle's flame flicker faster when it is shaken." Triage: real work. No workspace,
so initial run. Pre-code check finds nothing on `game-only`. Route: tuning in the game lane, `bug-fixer`.
Brief names `src/game/candle/flame.ts`, the composure config, the never-rule (flame look only, no physics),
and a smoke run with `?bot=1&seed=42&shaken=0.9` at 3 and 8 seconds. bug-fixer changes one constant and
reports. game-qa reads the diff with its callers, runs the ethos check, `npm run check`, `npm run build`
and the smoke run: pass. The lead reviews, re-runs the checks, looks at the screenshots, writes the
report, commits, pushes `claude/flame-flicker`, opens a draft PR into `game-only`, and summarises.

**Builder fails.** "Add a wind gust that pushes falling leaves." Routed to `feature-builder`, which
returns with `npm run check` failing in a test it did not touch. Retry once with a brief naming the
failing test and "find the root cause first". It fails again (the test depends on a seed changed on
`game-only` the same hour). The lead stops the build, keeps both attempts' hand-offs in
`_agents_workspace/`, writes the report with the gap and the failing test, does not open a ready PR, and
tells the owner what blocks it and the two ways forward.
