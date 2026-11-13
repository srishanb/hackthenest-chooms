# Agent Guide

Shared instructions for every coding agent on this repo (Claude Code, Codex, Antigravity).
`CLAUDE.md` and `GEMINI.md` import this file — edit rules here only.

## Project

Hack The Nest 2026 (Nov 14–15, 24h build). Idea and stack: **TBD** — update this section once decided.

## Parallel work: one agent, one worktree

Several agents work at the same time. Never share a working directory.

- Create a worktree per task: `scripts/wt.sh new <agent> <task>` → `../wt-<agent>-<task>` on branch `<agent>/<task>`.
  - `<agent>` is one of `claude`, `codex`, `ag` (Antigravity), or a teammate's name.
- Work, commit, and push **only** inside your own worktree. Do not edit files in other `wt-*` folders or in `codebase/` (main).
- Before starting a new task: `scripts/wt.sh sync` (rebases onto `origin/main`).
- Finish with a PR into `main`. Keep branches small and short-lived (merge within a few hours).
- Use the `PORT` in your worktree's `.env.local` for any dev server.

## Lanes (avoid overlapping edits)

Assign each agent a directory, not a cross-cutting feature. Stay inside your lane; if you must touch
another lane, keep the change minimal and say so in the PR.

| Lane | Directory | Owner |
|------|-----------|-------|
| _TBD_ | _TBD_ | _TBD_ |

## Shared files (single owner)

Highest collision risk. Only the integrator (whoever is on `main`) changes these, in their own small PR:

- Dependency manifests and lockfiles (`package.json`, `pnpm-lock.yaml`, `pyproject.toml`, `uv.lock`, …)
- Shared types / API contracts / schemas
- Root config, CI, and this file

Need a new dependency or contract change? Ask in the PR description or stop and report it — do not add it yourself.

## Conventions

- Conventional Commits, lowercase imperative: `feat(web): add map view`, `fix(api): handle empty query`.
- Small atomic commits. No secrets in code — use `.env.local` (gitignored) and keep `.env.example` updated.
- Strict typing (TypeScript strict / Python type hints).
- Don't run long-lived watchers or servers unless asked.
