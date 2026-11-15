# Ali

Read [README.md](README.md) first (task flow, commands, start prompts, hard rules).
## Your role

You own the **game lane**.

| Lane | Directories |
|---|---|
| Game | `src/game/`, `src/config/game.config.ts`, `src/config/ember.config.ts`, `tools/levels/` |

`src/game/player/` must never import the composure contract: EEG never changes gravity, friction, jump, speed or
steering. A test enforces it.

## Phases you lead (from PLAN.md)

- **P4 Game core**: movement, sections, falling, refuges, finish. Sat 10:15 PM to Sun 2:30 AM. **Blocked until
  `docs/FEATURES.md` says `Status: FINAL`** (feature gate).
- **P5 Lantern and atmosphere** (you render; Neil tunes; Amrit audio) and your part of **P6 ember**, after P4.2.
- P11 and P12 only if every Core item passes by Sun 6:00 AM.

## Do first tonight (no feature gate needed)

1. Finalise or confirm the feature list with the team (H-01): edit or confirm `docs/FEATURES.md`. Today it says
   `Status: PROVISIONAL`; a human changes it to `FINAL (<name>, <date>)` and Srishan adds a line to `DECISIONS.md`.
2. Read `docs/FEATURES.md` end to end, then PLAN.md section 6 (P4).
3. Use your agent to **draft the P4 plan** (`docs/plans/P4.md`). It may be written and approved now, but **no P4
   code may be built until FEATURES.md is FINAL**.
4. Ask g.tec (track lead) the judging criteria and whether a simulated or replayed signal counts if hardware
   fails (H-06b, Sat 11:00 PM).
5. Run the README "verify your setup" once P0 merges (H-08).
6. Walkthrough 1 at Sun 12:15 AM: be ready to explain your files.

## Human tasks you own

| ID | Task | Deadline |
|---|---|---|
| H-01 | Finalised feature list (whole team) | Sat 10:15 PM |
| H-06b | Ask g.tec: judging criteria, device choice, does a simulated signal count | Sat 11:00 PM |
| H-08 | Install Node 26 LTS, `gh`, Chrome or Edge | Sat 10:15 PM |
| H-05 | Pair the board over Web Bluetooth once | Sun 2:00 AM |
Also yours: H-21, and approving plans in your lane (H-15).

## Do NOT edit

`package.json`, `package-lock.json`, `src/shared/`, `src/main.ts`, `tsconfig.json`, `vite.config.ts`, `index.html`,
CI, `scripts/`, hook configs, `AGENTS.md`, `docs/PLAN.md`, `STATUS.md`, `DECISIONS.md`, `FEATURES.md` (a human
changes only its status line for H-01, with Srishan). Need a contract change? Say so in the PR.

## Tool preference
Claude Code (Opus 5.5, medium) for the ember state machine and anything near the composure contract. Codex or
Antigravity for platforms, sections and `check-levels`. The humans may reassign.

## Ask your agent (first task)
```
Read AGENTS.md, docs/PLAN.md section 6 (P4), docs/FEATURES.md and docs/STATUS.md. Write docs/plans/P4.md for the
game core in the game lane only. FEATURES.md is still PROVISIONAL, so write the plan but build nothing. Open a
draft PR and stop until I approve.
```

## Walkthroughs
Sun 12:15 AM (Walkthrough 1) and Sun 9:30 AM (Walkthrough 2).

## Rules that matter for you
Framing: composure, never emotion, stress or medical claims. EEG never changes physics. No AI-generated art. Never
commit keys. Falling has no death or lives.
