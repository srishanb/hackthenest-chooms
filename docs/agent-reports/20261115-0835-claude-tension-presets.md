# After-job report: tension-presets

- Agent: claude
- Branch and PR: claude/intelligent-napier-a52c14, https://github.com/srishanb/hackthenest-chooms/pull/84
- Phase and plan: queue-style task from Srishan ("replay presets in Settings"); short plan in the PR body
- Started and finished: about 08:05 to 08:40 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Built-in presets from simulator data, deterministic, committed with manifest under `public/recordings/presets/` | Pass (5 presets, byte-identical on every run, test compares to committed files) | High |
| Saved presets: save current signal, import/export .jsonl, delete; storage in try/catch | Pass in unit tests (memory store); IndexedDB path not exercised | Medium |
| Settings > Signal source: simulator, live board button, any preset, loop, delete; no reload, no game reset | Built and type-checked, not seen in a browser | Medium |
| Replay through the same pipeline; never writes ComposureState | Pass (preset frames go through `onFrame` -> `pipeline.ingest`; only calibration baselines are applied) | High |
| Tests and `run/signal-presets.mjs` | Pass | High |

## 2. How I verified it

| Check | Command | Result |
|---|---|---|
| Type check and all tests | `npm run check` | 70 files, 453 tests pass |
| Build ships presets | `npm run build`, `ls dist/recordings/presets` | built, 5 .jsonl plus manifest present |
| Determinism | `tools/presets/presets.test.ts` builds twice and compares to files on disk | pass |
| Trends through intensity-v2 | same test file | calm stays below 0.2, rising tension ends above 0.75, bursts swing, mixed climb calm/tense/calm with ember back |

**Not verified:** the Settings UI in a real browser (layout, focus trap, file picker), the IndexedDB store (no IndexedDB in Node tests), "Connect live board" from the Settings button (Web Bluetooth needs a click and a real board), and anything on the real Octopus 16 board.

## 3. Problems, workarounds and dead ends

- Data source: Srishan said to use real sample data only. No real EEG recording exists in the repo or on this machine; the guide lists g.tec's seven datasets (not for reposting) and PiEEG's simulated signals. Srishan chose "PiEEG simulator only". Every frame is the output of PiEEG's own SDK simulator (vendored pieeg.js) run on a virtual clock with a seeded random source; nothing is hand-drawn.
- I first added a made-up contact-quality overlay for a "Poor contact" preset. I removed it: the simulator's noisy pin never lowers contact quality (its check runs after the filters). The preset is now "Noisy pin" and the test says the reading stays valid. A preset that goes invalid from poor contact needs real or recorded board data.
- Another agent (sonnet) opened PR 85 for the same task three minutes after my claim (PR 84). Not resolved here.

## 4. Deviations from the plan

- "Poor contact" became "Noisy pin" (see above).
- URL `?source=replay` still plays once (loop default is off there); presets chosen in Settings loop by default.
- Saved presets made before the player has calibrated have no calibration in their header, so replaying them is not valid with intensity-v2. Presets made after calibrating carry the baselines.

## 5. Changes

- Files changed: `src/signal/index.ts`, `pipeline.ts`, `sources/recording-format.ts`, new `src/signal/presets/`, `tools/presets/`, `public/recordings/presets/`, `src/ui/components/signal-settings/`, `settings-panel.ts`, `strings.ts`, `run/signal-presets.mjs`, tests.
- Contract changes: `src/shared/contracts/signal-api.ts` gains `InputSelection`, `PresetInfo`, `PresetControl` and `SignalHandle.presets`. No other contract changed; no caller needed an update beyond the factory.
- New dependencies: None. `package.json` gains an `npm run presets` script.
- Edits outside my lane: Settings is Amrit's lane. I added a self-contained `signal-settings` folder and one mount line plus one destructured prop in `settings-panel.ts`. It is a sub-control of the Settings dialog (like the narrator voice control), not a separate registry component, so it shares the panel's focus trap. No menu restyling.
- `INDEX.md` updated: yes (`src/signal/INDEX.md`).

## 6. Follow-ups and questions for humans

- [ ] Open Settings in a browser and try every control, including save, reload, import and export (Srishan or Amrit).
- [ ] Record a real session from the Octopus 16 once the board has run, save it as a preset, and consider adding it as a built-in (Srishan).
- [ ] Decide between PR 84 and PR 85, which cover the same task (Srishan).

## 7. Can a teammate explain this?

A preset is a recorded stream of band-power frames. When you pick one in Settings, the game feeds those frames into the same signal processing a live board uses, so the light, fog and music react the same way. The built-in presets were produced by running PiEEG's own simulator through scripted events, and saved presets are your own recent signal stored in the browser.
