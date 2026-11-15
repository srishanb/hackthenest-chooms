# Amrit

Read [README.md](README.md) first (task flow, commands, start prompts, hard rules).
## Your role

You own the **UI lane**, the **audio and narrator lane**, and the **Devpost submission**.

| Lane | Directories |
|---|---|
| UI | `src/ui/` (except `src/ui/components/debug-overlay/`, which is Srishan's), `src/config/ui.config.ts` |
| Audio and narrator | `src/audio/`, `src/config/audio.config.ts`, `tools/narrator/` |

## Phases you lead (from PLAN.md)

- **P2 UI shell**, Sat 10:15 PM to Sun 1:30 AM: tokens and strings, menus, HUD, captions. Needs no feature gate.
- **P7 Narrator** (code; Neil writes content), Sun 12:30 to 5:00 AM. Waits for the feature gate (H-01).
- **P5.4 adaptive audio** and part of **P6** (calibration screens), after the gate.
- **P9 Submission**: Devpost, demo video, final entry.

## Do first tonight (no feature gate needed)

1. Run the README "verify your setup" once P0 merges (H-08 for your laptop).
2. Use your agent to write the **P2 UI shell plan** (`docs/plans/P2.md`, sub-phase P2.1 first). Approve it when
   it reads right.
3. Attend the Devpost workshop, Sat 9:00 PM, Student Center 310AB. Start the Devpost draft; submit it by 11:30 PM
   (hard deadline Sun 12:00 AM).
4. Get the ElevenLabs event key and a Gemini key (H-09). Share privately; paste into `.env.local` only.
5. Ask the organisers what Best Beginner is judged on (H-06c, Sat 11:00 PM).
6. Walkthrough 1 at Sun 12:15 AM: be ready to explain your files.

## Human tasks you own

| ID | Task | Deadline |
|---|---|---|
| H-16 | Devpost draft | Sun 12:00 AM |
| H-09 | ElevenLabs event key and Gemini key | Sun 12:30 AM |
| H-06c | Ask organisers what Best Beginner is judged on | Sat 11:00 PM |
| H-10 | Narrator voice and personality (with Neil) | Sun 1:00 AM |
| H-17 | Demo video, 3 minutes or less, with one teammate (workshop 10:00 AM, Halle Library) | Sun 11:00 AM |
| H-24 | Final Devpost submission (Srishan checks it) | Sun 12:00 PM, aim for 11:30 AM |
Also yours: H-08, H-05, H-21 (every person), and approving plans in your lanes (H-15).

## Do NOT edit

`package.json`, `package-lock.json`, `src/shared/`, `src/main.ts`, `tsconfig.json`, `vite.config.ts`, `index.html`,
CI, `scripts/`, hook configs, `AGENTS.md`, `docs/PLAN.md`, `STATUS.md`, `DECISIONS.md`, `FEATURES.md`. Need a
dependency or contract change? Say so in the PR; Srishan does it.

## Tool preference
Claude Code (Opus 5.5, medium) for anything that touches the bus or settings contracts. Codex or Antigravity are
fine for components and captions. The humans may reassign.

## Ask your agent (first task)
```
Read AGENTS.md, docs/PLAN.md section 6 (P2), docs/STATUS.md and docs/plans/P0.md. Write docs/plans/P2.md for the
UI shell (P2.1 first), in the UI lane only. Open a draft PR and stop until I approve.
```

## Walkthroughs
Sun 12:15 AM (Walkthrough 1) and Sun 9:30 AM (Walkthrough 2).

## Rules that matter for you
Framing: composure, never emotion, stress or medical claims, in UI text, Devpost and README. EEG never changes
physics. No AI-generated art. The narrator voice is a stock or designed voice, never a clone. Never commit keys.
