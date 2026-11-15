# After-job report: tension-presets

- Agent: sonnet
- Branch and PR: sonnet/tension-presets, https://github.com/srishanb/hackthenest-chooms/pull/85
- Phase and plan: no plan file; task from Srishan via the reviewer ("go tension presets"). #84 held only an empty claim; I commented there and took it over.
- Started and finished: 08:20 to 08:45 Eastern

## 1. What I believe is complete

| Requirement | Result | Confidence |
|---|---|---|
| 1. Built-in presets (calm, rising, jaw clench bursts, mixed, poor contact), deterministic, in `public/recordings/presets/` with a manifest, work offline | Pass: `npm run presets:build`, test proves two builds are byte-identical | High |
| 2. Save current signal as a named preset in browser storage; import/export `.jsonl` | Pass in unit tests and in the browser (save, replay, delete). Export/import file dialogs not clicked through | Medium |
| 3. Settings > Signal: Simulator, Live board, any preset, loop toggle, delete; no reload, no climb reset | Pass in the browser (page marker survived every switch); Live board not tried | Medium |
| 4. Replay goes through the same pipeline | Pass: presets are frames fed to `pipeline.ingest`; nothing writes `ComposureState` directly | High |
| 5. Tests and `run/signal-presets.mjs` | Pass (26 preset tests, 2 wording tests, url param tests) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and all tests | `npm run check` | 70 files, 469 tests pass |
| Build | `npm run build` | Succeeds; presets are in `dist/recordings/presets/` |
| Each preset's trend through intensity-v2 | `tools/presets/presets.test.ts` | Calm stays under 0.3 and valid; rising goes under 0.3 to over 0.75; bursts swing; mixed rises then falls; poor contact is invalid and near neutral |
| Browser | Dev server; Settings, Signal source; chose Rising tension for 45 s | HUD line went Lower, Midrange, Higher; badge "Recorded replay"; manifest and preset fetched from localhost only; saved, replayed and deleted a preset; back to Simulator; no reload |
| Lane check | `rg -n composure src/game/player` | Prints nothing |

**Not verified:** the real Octopus board and the Bluetooth picker from the Live board button; file-picker import and download export in a browser; lantern, fog and music by eye or ear (I read the HUD state, not the visuals); other browsers; presets compared against real brainwave recordings.

## 3. Problems, workarounds and dead ends

- The generator uses the same synthetic spectrum builder as `recordings/sim-fixture.jsonl`, not the SDK simulator on a virtual clock: the SDK runs in real time and cannot be made deterministic cheaply. The values are shaped like the simulator's output, not recorded from it.
- Without calibration the pipeline reports invalid, so a preset would do nothing. Each preset therefore carries its own baselines (a `baselines` line, ignored by old readers); saved presets store the baselines in force when saved. The previous baselines return when you leave a preset.
- Replay frames are moved onto the current clock so the pipeline never sees time go backwards when switching sources.
- Saved presets keep the newest 60 s, at most 4, in localStorage (about 0.6 MB each). IndexedDB was not needed for that size.
- `tsx` needs the sandbox disabled (IPC socket); `presets:build` was run that way.
- The preset test moved to `tools/presets/` because the lane test forbids `src/signal` tests importing `tools/`.

## 4. Deviations from the brief

- Built-in presets are generated from the shared synthetic spectrum model, not from a live SDK simulator run (see above).
- The Settings section is a function mounted by the settings panel (like the narrator voice control) rather than a registry component, so it lives inside the existing dialog.

## 5. Changes

- Signal: `src/signal/presets/{controller,preset-file,preset-store}.ts`, `src/signal/index.ts`, `src/signal/pipeline.ts` (`getBaselines`, `setBaselines`), `src/signal/url-params.ts` (`?preset=`), INDEX.md.
- Tools and data: `tools/presets/{presets,make-presets,presets.test}.ts`, `public/recordings/presets/*` (2.7 MB), `package.json` script `presets:build`.
- Contract (small, own change): `src/shared/contracts/signal-api.ts` adds `PresetInfo`, `SourceChoice`, `SignalPresets` and `SignalHandle.presets`. `src/main.ts` passes `storage` to `createSignal`.
- Edits outside my lane (UI, Amrit): new `src/ui/components/signal-presets/` (ts and css), `src/ui/strings.ts` (`signal.*`), two lines in `settings-panel.ts`, `src/ui/__tests__/signal-presets.test.ts`. No menu restyling.
- Not touched: `src/game/`, the candle work, `src/game/player/`.
- `INDEX.md` updated: yes (signal).

## 6. Follow-ups and questions for humans

- [ ] Srishan: try Live board and Calibrate with a real Octopus (H-task); presets use fixed baselines and do not stand in for calibration.
- [ ] Amrit: check how the section looks beside PR 66's redesign.
- [ ] Neil: the effects table decides how Lower/Midrange/Higher look; tune against these presets.

## 7. Can a teammate explain this?

A preset is a short recording of band powers, plus the baselines that say what "low" and "high" mean for it. Settings lets you switch the signal source at runtime; choosing a preset feeds its frames into the same pipeline a real board uses, so the game reacts the same way. You can also save the last minute of your own signal as a preset and replay or export it.
