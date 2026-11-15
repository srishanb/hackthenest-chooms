# After-job report: <task>

<!--
Copy this file to docs/agent-reports/<YYYYMMDD-HHMM>-<agent>-<task>.md (local time, 24-hour clock).
One file per task. Never edit another agent's report. Fill in every section; write "None" rather than deleting one.
Be honest: a judge may ask a teammate to explain this work, and "not verified" is far more useful than a guess.
-->

- Agent: <claude | codex | ag | name>
- Branch and PR: <agent>/<task>, <PR link>
- Phase and plan: <P1.2>, docs/plans/<id>.md (approved by <name>)
- Started and finished: <HH:MM> to <HH:MM> Eastern

## 1. What I believe is complete

Map each item to an acceptance test in the plan.

| Acceptance test (from the plan) | Result | Confidence |
|---|---|---|
| <test> | Pass / Fail / Partial / Not attempted | High / Medium / Low |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| <what> | `<command>` | <output summary, exit code> |

**Not verified:** <everything you could not or did not check, and why. Real hardware, other laptops, browsers…>

## 3. Problems, workarounds and dead ends

- <what went wrong, what you tried, what worked>

## 4. Deviations from the plan

- <what differs from the approved plan, and why. "None" if none.>

## 5. Changes

- Files changed: <list, or "see PR diff" plus the notable ones>
- Contract or config-schema changes requested: <None, or what and why. You do not make these yourself.>
- New dependencies requested: <None, or name, exact version, why>
- Edits outside my lane: <None, or file and reason>
- `INDEX.md` updated for new exports: <yes / no / not applicable>

## 6. Follow-ups and questions for humans

- [ ] <question or task, and who should answer it>

## 7. Can a teammate explain this?

Two or three plain sentences a beginner could say to a judge about what this code does and why.
