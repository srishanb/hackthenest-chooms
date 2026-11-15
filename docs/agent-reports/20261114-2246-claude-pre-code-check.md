# After-job report: pre-code-check

- Agent: claude (Sonnet 5.5 subagent; wording written by the orchestrator at Srishan's request: "add it to agents that a pre generating code hook is to check the repo to make sure the task is not already done")
- Branch and PR: claude/pre-code-check, see the PR
- Phase and plan: none (integrator docs change requested in chat, no plan file)
- Started and finished: not recorded

## 1. What I believe is complete

| Acceptance test (from the plan) | Result | Confidence |
|---|---|---|
| AGENTS.md has the "Before you write code" section before "Task queue and claims" | Pass | High |
| Claim bullet starts with "Do the pre-code check above first." | Pass | High |
| PR template has the pre-code check item after the plan-approved item | Pass | High |
| docs/QUEUE.md step 1 starts with "Do the pre-code check in AGENTS.md. Then " | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Only intended files changed | `git diff --stat` | AGENTS.md, pull_request_template.md, QUEUE.md |

**Not verified:** no agent has run the check yet, so it is untested in practice.

## 3. Problems, workarounds and dead ends

- None.

## 4. Deviations from the plan

- This is a written rule plus a PR-template checkbox, not an automatic tool hook. An automatic hook cannot tell whether a task is already done.
- The section was inserted verbatim, so two of its lines are over 120 characters.

## 5. Changes

- Files changed: AGENTS.md, .github/pull_request_template.md, docs/QUEUE.md
- Contract or config-schema changes requested: None
- New dependencies requested: None
- Edits outside my lane: shared files (AGENTS.md, .github) by request of the integrator
- `INDEX.md` updated for new exports: not applicable

## 6. Follow-ups and questions for humans

- [ ] Srishan: watch whether agents actually write the "Pre-code check:" line in PR bodies.

## 7. Can a teammate explain this?

Before writing code, every agent now checks main, open PRs and branches to see whether the task already exists. The PR template makes them record the result.
