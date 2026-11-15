# Team onboarding

Four people, several AI agents, one repo. Read this page, then your own file: [amrit.md](amrit.md),
[neil.md](neil.md), [ali.md](ali.md). Srishan is the integrator (root config, `src/shared/`, signal lane).
Rules every agent follows are in [AGENTS.md](../../AGENTS.md); the schedule and phases are in
[PLAN.md](../PLAN.md); open human jobs are in [HUMAN_TASKS.md](../HUMAN_TASKS.md).

## How a task flows

1. Your agent writes `docs/plans/<phase-id>.md` (model: [P0.md](../plans/P0.md)) and opens a **draft PR**. It then stops.
2. You read the plan. If it is right, **you** change its status line to `Status: APPROVED by <your name>`.
   Or tell your own agent "approve plan P<n>" and it records the line with a note. No other agent may approve it.
3. The agent builds, runs `npm run check`, and writes an after-job report in `docs/agent-reports/`.
4. The PR is marked ready. The reviewer agent (an Opus 5.5 session) reviews it, runs the checks, and squash-merges it or comments with what to fix. No human review is needed.

You approve plans for your own lane. Pull requests need no human review: the reviewer agent merges them. Since
Decision D-22 a plan and its approval are guidance, not a gate: a pull request is held only if it breaks something or
goes against the game's rules (see [AGENTS.md](../../AGENTS.md)).

## Commands (Git Bash on Windows)

| Command | Does |
|---|---|
| `scripts/wt.sh new <agent> <task>` | New worktree `../wt-<agent>-<task>`, branch `<agent>/<task>`. `<agent>` = `claude`, `codex`, `ag`, or your name |
| `scripts/wt.sh sync` | Merge `origin/main` into your branch (never a rebase). Run before a new task |
| `scripts/wt.sh ls` / `rm <agent> <task>` | List or remove worktrees |
| `npm ci` | Install exact dependencies (once per worktree) |
| `npm run check` | Type check and unit tests. Must pass before a PR |
| `npm run dev` | Dev server on the `PORT` in your worktree's `.env.local` |

One agent, one worktree. Never edit another `wt-*` folder or `codebase/`. Put keys only in `.env.local`.

## Which agent reads which file

| Tool | Reads automatically |
|---|---|
| Claude Code | `CLAUDE.md` (which imports `AGENTS.md`) |
| Codex | `AGENTS.md` |
| Antigravity | `AGENTS.md` and `GEMINI.md` (which points to `AGENTS.md`) |

Pick whichever tool is free. Check [STATUS.md](../STATUS.md) and the open pull requests first so you do not duplicate work.

## Start prompts (copy, fill in the angle brackets)

These prompts take the careful path (plan, then wait for approval). Since Decision D-22 the wait is optional: if you
want the agent to build straight away, delete the "STOP" sentence.

Claude Code:
```
Read AGENTS.md, docs/PLAN.md, docs/STATUS.md and docs/plans/<plan-file>.md. My task: <task>. Create a worktree
with scripts/wt.sh new claude <task>. Write docs/plans/<phase-id>.md using docs/plans/P0.md as the model, open a
draft PR, then STOP. Do not build anything until I change the plan's status line to "Status: APPROVED by <my name>".
Never write that line yourself.
```

Codex:
```
Read AGENTS.md, docs/PLAN.md, docs/STATUS.md and docs/plans/<plan-file>.md. My task: <task>. Create a worktree
with scripts/wt.sh new codex <task>. Write docs/plans/<phase-id>.md using docs/plans/P0.md as the model, open a
draft PR, then STOP. Do not build anything until I change the plan's status line to "Status: APPROVED by <my name>".
Never write that line yourself.
```

Antigravity:
```
Read AGENTS.md, docs/PLAN.md, docs/STATUS.md and docs/plans/<plan-file>.md. My task: <task>. Create a worktree
with scripts/wt.sh new ag <task>. Write docs/plans/<phase-id>.md using docs/plans/P0.md as the model, open a
draft PR, then STOP. Do not build anything until I change the plan's status line to "Status: APPROVED by <my name>".
Never write that line yourself.
```

## Hard rules (all of AGENTS.md applies; these four bite most)

- **Framing:** the signal is "composure" (calm versus tension). Never "emotion", "stress" (in text players or judges
  see), diagnosis, or medical claims. Say muscle activity is part of it.
- **EEG never changes physics:** gravity, friction, jump, speed and steering are fixed.
- **No AI-generated art.** Free existing assets only, each logged in `CREDITS.md`.
- **Never commit keys.** `.env.local` only, never a `VITE_` prefix.
