# After-job report: commit freely unless it breaks something or goes against the ethos

- Agent: claude (Fable 5.2 orchestrator, integrator rule change)
- Branch and PR: `claude/commit-freely`, see the PR this file is part of
- Phase and plan: none. Srishan said in chat: "let people commit whatever they want provided its not breaking or goes
  against the ethos of the game".
- Started and finished: 01:15 to 01:22 Eastern, Sun 15 Nov 2026

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| `AGENTS.md`, "Review and merge": the reviewer holds a PR for only two reasons (it breaks something; it goes against the ethos) | Done | High |
| `AGENTS.md`: the approval gate is now guidance; binding rule 7 keeps only the "stays off" items | Done | High |
| Decision D-22; `docs/plans/README.md` wording | Done | High |

## 2. How I verified it

Read the diff: three files, docs only. Pre-code check: no other PR changes the review rule.

**Not verified:** how the reviewer session applies the new rule. "Ethos" is defined here as the binding rules plus
rule one; that reading is mine, not Srishan's wording.

## 3. Problems, workarounds and dead ends

None.

## 4. Deviations from the plan

- "Ethos" had to be pinned to something checkable. I mapped it to the existing binding rules (composure framing, the
  signal never changes controls or physics, nothing on the demo path uses the network, no secrets, no AI-generated
  art, the three "stays off" items) and to never deleting git history.
- Lanes, plans, approvals, the feature list, claims, pre-code checks and after-job reports are kept as advice. They
  are still described, because they prevent duplicate work, but none of them blocks a merge now.

## 5. Changes

- Files: `AGENTS.md`, `docs/DECISIONS.md`, `docs/plans/README.md`, this report. No code.

## 6. Follow-ups and questions for humans

- [ ] Srishan: if "ethos" should mean more or less than the binding rules, say so and the definition changes.

## 7. Can a teammate explain this?

Anyone can now merge anything through the reviewer, as long as the tests and build still pass and it does not break
the game's promises: honest wording about the signal, controls the signal never touches, no internet needed at the
demo, no AI art, and never deleting git history.
