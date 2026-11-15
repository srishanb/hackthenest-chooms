# Neil

Read [README.md](README.md) first (task flow, commands, start prompts, hard rules).
## Your role

You own the **content and tuning lane**, and the **EEG hardware**.

| Lane | Directories |
|---|---|
| Content and tuning | `src/content/`, `src/config/effects.config.ts`, `public/assets/`, `CREDITS.md` |

## Phases you lead (from PLAN.md)

- **P8 Content and presentation**, Sat 10:15 PM to Sun 6:00 AM: assets (P8.1) can start now; sections (P8.2) need
  Ali's P4.2.
- **P3 Real hardware bring-up** with Srishan: the board, then the midnight checkpoint.
- **P7 Narrator content** (Amrit writes the code) and **P5 tuning** of `effects.config.ts`, after the feature gate.
- Playtest and tuning, Sun 6:00 to 9:00 AM.

## Do first tonight (no feature gate needed)

1. Borrow an Octopus 16 (H-02) by 9:00 PM: Halle Library help desk or the track Discord. Ask if we can keep it
   through the 2:15 PM demo.
2. Flash it at `octobridge.pieeg.com/flash` (desktop Chrome or Edge, USB-C data cable), check 16 live channels at
   `cloud.pieeg.com`, then disconnect there (H-03). Fit it at Pz.
3. Have a charged 5 V power bank (H-04). On a head, power the board only from the power bank.
4. Choose free art, music layers and SFX (H-07): Kenney and Poly Haven are CC0; check each Freesound and
   OpenGameArt item. Log every item in `CREDITS.md`. No AI-generated art.
5. Draft the narrator personality and ten sample lines with Amrit (H-10). Lines needle the climb and the fall,
   never the player.
6. Run the README "verify your setup" once P0 merges (H-08).

## Human tasks you own

| ID | Task | Deadline |
|---|---|---|
| H-02 | Borrow a board | Sat 9:00 PM |
| H-03 | Flash and fit the board (with Srishan) | Sat 10:30 PM |
| H-04 | Charged 5 V power bank | Sat 10:30 PM |
| H-07 | Free assets, logged in `CREDITS.md` | Sun 12:00 AM |
| H-10 | Narrator voice and personality (with Amrit) | Sun 1:00 AM |
| H-19 | Midnight checkpoint: eyes-closed rise, twice, saved under `recordings/` (with Srishan) | Sun 12:00 AM |
| H-18 | Return the board | Sun 2:15 PM |
Also yours: H-08, H-05, H-21 (every person), and approving plans in your lane (H-15).

## Do NOT edit

`package.json`, `package-lock.json`, `src/shared/`, `src/main.ts`, `tsconfig.json`, `vite.config.ts`, `index.html`,
CI, `scripts/`, hook configs, `AGENTS.md`, `docs/PLAN.md`, `STATUS.md`, `DECISIONS.md`, `FEATURES.md`. Need a
dependency or contract change? Say so in the PR.

## Tool preference
Codex or Antigravity for content files and `CREDITS.md` entries; Claude Code (Opus 5.5, medium) if a change
touches `effects.config.ts` types or anything shared. The humans may reassign.

## Ask your agent (first task)
```
Read AGENTS.md, docs/PLAN.md section 6 (P8.1) and docs/HUMAN_TASKS.md. Write docs/plans/P8.1.md for choosing and
logging free assets in CREDITS.md and public/assets/. CC0 or clearly licensed only, no AI-generated art. Open a
draft PR and stop until I approve.
```

## Walkthroughs
Sun 12:15 AM (Walkthrough 1) and Sun 9:30 AM (Walkthrough 2).

## Rules that matter for you
Framing: composure, never emotion, stress or medical claims. EEG never changes physics. No AI-generated art. Board
on a head: power bank only. Borrowed hardware goes back. Never commit keys.
