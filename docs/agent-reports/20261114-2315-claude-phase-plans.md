# After-job report: plans for every remaining phase

- Agent: claude (Fable 5.2 orchestrator; four Opus 5.5 subagents wrote the plan files; the orchestrator wrote the index)
- Branch and PR: `claude/phase-plans`, PR 22
- Phase and plan: none. Srishan asked in chat: "generate plans for every step and subplans, we can mass review these
  plans instead of waiting for them to be generated."
- Started and finished: 22:56 to 23:30 Eastern, Sat 14 Nov 2026

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| A plan file for every remaining phase: P4, P5, P5.4, P6, P6.1, P7, P8 (P8.2 to P8.6), P9, P10, P11, P12 | Done; all `Status: PROPOSED` | High that they exist and follow the format; Medium on their estimates |
| `docs/plans/README.md`: how to approve, the table of plans, approval order, every contract change requested, open decisions | Done | High |
| P2 and P8.1 not duplicated | Done: their owners claimed them (PR 20, PR 18) | High |
| No approval line written by an agent | Done | High |

## 2. How I verified it

| Check | How | Result |
|---|---|---|
| Format | Line 3 of every new plan equals `Status: PROPOSED` (script) | All eleven pass |
| Length | `wc -l`: each plan is at most 171 lines | Pass; a few lines exceed 120 characters |
| Framing | Read every line mentioning "emotion" or "stress" | They only state the rule or test for it |
| Consistency | Each writer cross-read the other plans; one writer was sent back to remove FAL-2 from P4, P6 and P8; I removed it from P7 and the index | No plan builds the removed feature |
| Spot read | I read the first 75 lines of P4 and every plan's contract section | Matches the contracts on `main` |

**Not verified:** I did not read every plan end to end. No plan has been tried by an agent yet. Time estimates are
the writers' judgement. API names the plans mark "unverified" (Web Audio, the Gemini and ElevenLabs SDKs, some Phaser
filter behaviour) are still unverified.

## 3. Problems, workarounds and dead ends

- The final feature list silently dropped FAL-2 (bounded progress loss); a writer noticed that the id no longer
  existed. P4, P6, P7 and P8 were revised so a fall is never reset, and the ember is the only way back up.
- The writers ran before Decision D-18. Several plans say a contract change needs "one integrator PR (Srishan)";
  the index explains that a lane agent may now make the change in its own PR.
- `docs/FEATURES.md` still carries a stale count line ("48 rows, 37 Core") after FAL-2 was removed. Not edited here:
  it is a shared file and a person finalised it.

## 4. Deviations from the plan

- P3 has no plan file: its tasks are queue tasks (Q-01, Q-04, Q-06), already approved.
- P5 is split by lane: P5.md (game, Ali) and P5.4.md (audio, Amrit). P6 likewise: P6.md (Ali) and P6.1.md (Amrit).
  Each file has exactly one approver.
- P4 proposes its own fixed-step physics instead of Phaser Arcade. That is a design choice for Ali to confirm.

## 5. Changes

- Files: `docs/plans/P4.md`, `P5.md`, `P5.4.md`, `P6.md`, `P6.1.md`, `P7.md`, `P8.md`, `P9.md`, `P10.md`, `P11.md`,
  `P12.md`, `docs/plans/README.md`, this report.
- Contract or config changes requested: none made here; all requests are listed in `docs/plans/README.md`.
- New dependencies requested: `@google/genai` and `@elevenlabs/elevenlabs-js` (P7, dev only, with a no-dependency
  fallback).
- Edits outside my lane: none. `INDEX.md`: not applicable.

## 6. Follow-ups and questions for humans

- [ ] Ali: approve P4 first (critical path), then P6 and P5. Decide the questions listed under your name in the index.
- [ ] Amrit: approve P2, P6.1, P5.4, P7. Pick one caption seam for P2.4 and P7.
- [ ] Neil: approve P8.1 and P8. Change the `shadowDepth` row before P5.3 starts.
- [ ] Srishan: approve P9 by Sunday 8:00 AM; decide the eyes-closed question (P6, P10) and whether the board can
      reach the ballroom.

## 7. Can a teammate explain this?

These files are the to-do lists for every part of the game that is not built yet, written so each person can read
theirs, change one line to approve it, and hand its small tasks to an agent. The index page shows who approves what,
in which order, and which shared types several plans want to change.
