# After-job report: review-policy

- Agent: claude (Sonnet 5.5 subagent; design by the orchestrator at Srishan's instruction)
- Branch and PR: claude/review-policy, https://github.com/srishanb/hackthenest-chooms/pull/25
- Phase and plan: none (no plan file; integrator change on the owner's instruction, D-18)
- Started and finished: see commit times

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| AGENTS.md has the "Review and merge: the reviewer agent" section and edits b to e | Pass | High |
| ai-review.yml has only the `check` job, `contents: read`, trimmed trigger types | Pass | High |
| PR template, README, onboarding README, D-18, H-15 updated | Pass | High |
| Old-policy grep (`needs-human`, `never auto-merge`, `a human merges`) clean | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Diff scope | `git diff --stat origin/main` | only the listed files |
| Workflow shape | `node -e` regex on `jobs:` and job names | only `check:` |
| Old policy text | `grep -n` over AGENTS.md, README.md, PR template, onboarding README | no matches |
| Checks | `npm ci; npm run check` | type check and 104 tests pass |

**Not verified:** the trimmed workflow has not run on GitHub beyond this PR's own run; the reviewer agent's behaviour
is not tested by this PR. `npm run build` was not run separately.

## 3. Problems, workarounds and dead ends

- None.

## 4. Deviations from the plan

- No plan file. This PR changes the repo's review rules at the owner's instruction; the plan approval gate is
  unchanged. With the Action's review job removed, a PR is merged only while the reviewer session is running
  (fallback: merge by hand).

## 5. Changes

- Files changed: AGENTS.md, .github/workflows/ai-review.yml, .github/pull_request_template.md, README.md,
  docs/onboarding/README.md, docs/DECISIONS.md, docs/HUMAN_TASKS.md, this report.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: all are shared or integrator files, by instruction.
- `INDEX.md` updated for new exports: not applicable.

## 6. Follow-ups and questions for humans

- [ ] Srishan: start the reviewer session (Opus 5.5, Remote Control on) before relying on automatic merges.

## 7. Can a teammate explain this?

Pull requests no longer wait for a person. A Claude Opus 5.5 reviewer session reads each ready PR, runs the checks,
and merges it or tells Srishan what is wrong. The GitHub Action now only runs the checks.
