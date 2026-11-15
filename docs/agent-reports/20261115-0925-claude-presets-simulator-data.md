# After-job report: presets-simulator-data

- Agent: claude
- Branch and PR: claude/presets-simulator-data (PR linked in the PR list; replaces #84)
- Phase and plan: follow-up to #85 on Srishan's instruction: use the official PiEEG simulation method only
- Started and finished: about 09:10 to 09:25 Eastern

## 1. What I believe is complete

| Requirement | Result | Confidence |
|---|---|---|
| Built-in presets come from PiEEG's own simulator, not a synthetic builder | Pass: frames are the vendored `pieeg.js` output (`connectSimulator({device:'octopus-16'})`, `triggerSimEvent` alpha/clench/blink/noisy_pin, `onBandPowers`, `getContactQuality`, `getStats`) | High |
| Deterministic | Pass: virtual clock plus seeded random; test rebuilds twice and compares with committed files | High |
| Same runtime, Settings UI and pipeline as #85 | Unchanged | High |
| Trend per preset through intensity-v2 | Pass with main's existing windows | High |

## 2. How I verified it

| Check | Command | Result |
|---|---|---|
| Type check and tests | `npm run check` | 70 files, 470 tests pass |
| Build | `npm run build` | passes; 2.8 MB of presets |
| Regenerate | `npm run presets:build` | 5 presets plus manifest |

**Not verified:** the Settings screen in a browser with the new files (the UI code is #85's, unchanged), the real board, other browsers.

## 3. Problems, workarounds and dead ends

- The simulator's noisy pin never lowers `getContactQuality` (its check runs after the filters), so the old "Poor contact" preset, which needed faked contact, is replaced by "Noisy pin": the reading stays valid. A preset that goes invalid needs real or recorded board data.
- Preset durations are 60 s each, as before; calm and bursts were re-shaped to what the simulator can do (clench bursts and alpha toggles, no gradual ramp, so "Rising tension" builds with denser bursts).
- The data in #85 was built with `makeSequence` (the synthetic fixture builder). This PR removes that path from the built-in presets.

## 4. Deviations from the plan

- "Poor contact" removed, "Noisy pin" added (see above).

## 5. Changes

- Files changed: `tools/presets/` (`presets.ts` now async, new `simulate.ts`, `timelines.ts`, `shrink-frame.ts`, `make-presets.ts`, tests), `public/recordings/presets/*`, `run/signal-presets.mjs`, `src/signal/INDEX.md`.
- Contract or config-schema changes: None.
- New dependencies: None.
- Edits outside my lane: None.
- `INDEX.md` updated: yes.

## 6. Follow-ups and questions for humans

- [ ] Click through Settings with the new presets in a browser (Srishan or Amrit).
- [ ] Record a real Octopus 16 session, save it as a preset and consider adding it as a built-in (Srishan).

## 7. Can a teammate explain this?

The built-in presets are what PiEEG's own simulator produces when we press its sim buttons (relax, jaw clench, noisy pin) on a fixed script. We run that simulator on a fake clock so the files come out identical every time, then the game replays them through the same signal processing as a real board.
