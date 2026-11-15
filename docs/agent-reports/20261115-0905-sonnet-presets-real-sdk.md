# After-job report: presets from the real SDK simulator

- Agent: sonnet
- Branch and PR: sonnet/presets-real-sdk, https://github.com/srishanb/hackthenest-chooms/pull/91
- Phase and plan: follow-up to tension-presets (#85) at Srishan's request: "I need to use the real simulator". No plan file.
- Started and finished: 08:46 to 09:10 Eastern

## 1. What I believe is complete

| Requirement | Result | Confidence |
|---|---|---|
| Built-in presets come from the real vendored PiEEG simulator (`public/vendor/pieeg.js`), not a synthetic spectrum | Pass: `tools/presets/sdk-sim.ts` runs the unmodified SDK on a virtual clock with a seeded `Math.random` | High |
| Output is identical on every build | Pass: test builds twice and compares; a second test compares to the committed files | High |
| Baselines also come from the SDK simulator | Pass: relaxed vs clench and eyes-open vs alpha boost through `calibrateBaseline` (active 1.53 to 2.48) | High |
| Same trends as before through the real pipeline | Pass: calm, rising, bursts and mixed pass with unchanged thresholds | High |
| Poor contact preset | Pass, with one scripted field (see below) | High (behaviour), n/a for realism |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 71 files, 472 tests pass |
| Build | `npm run build` | Succeeds |
| Generation time | `npm run presets:build` | about 1.3 s for five 60 s presets |
| Browser | Dev server, Settings > Signal | Poor contact shows "Check signal quality", quality 31%, composure "unavailable"; Mixed climb showed Lower, then Higher, then Lower; no external requests; page never reloaded |

**Not verified:** a real Octopus board; lantern, fog and music by eye or ear; other browsers.

## 3. Problems, workarounds and dead ends

- Why it works: the SDK only touches time and randomness through `setInterval`, `clearInterval`, `performance.now`, `Date.now` and `Math.random`. The file is evaluated as a plain script with virtual stand-ins passed in as function parameters, so no global is patched and the vendored file is unchanged.
- **Poor contact is partly scripted.** The simulator's noisy pin spoils one of sixteen pins, and the SDK's 1 to 40 Hz band-pass removes the 50 Hz noise, so the SDK always reports contact "good" (checked: contact 1, quality 1 even with the pin on). The frames are still the SDK's own; only `contactGood01` is set to 5/16 for this preset. The code comment, the test and this report say so.
- Frames before the FFT window fills are dropped (3 s warm-up), so each preset starts on settled data.
- "Rising tension" is built from jaw clenches that grow from none to continuous, because the simulator has no ramp control.
- Files grew to 5.7 MB total (the SDK spectrum has 129 bins). Not reduced.

## 4. Deviations from the request

- Poor contact is not a pure simulator recording (above). Everything else is.

## 5. Changes

- `tools/presets/sdk-sim.ts` (new), `tools/presets/presets.ts` (rewritten, async), `make-presets.ts`, `presets.test.ts`, `public/recordings/presets/*` (regenerated; same ids and manifest format, so the app code is unchanged).
- Contract changes: None. New dependencies: None. Edits outside my lane: None (tools and public data).
- `INDEX.md`: no new exports in the app.

## 6. Follow-ups and questions for humans

- [ ] Srishan: a real board recording saved as a preset (Settings > Signal) would give the realest Poor contact; use Export to share it.

## 7. Can a teammate explain this?

We run the board maker's own simulator code inside a fake clock and a fixed random seed, press its simulated jaw-clench and alpha buttons on a script, and save what it outputs. Because the clock and randomness are fixed, the files are the same every time, but they are the simulator's real numbers.
