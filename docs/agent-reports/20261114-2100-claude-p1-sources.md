# After-job report: P1.1 sources

- Agent: claude (Sonnet 5.5), agent A in `docs/plans/P1.md`
- Branch and PR: `claude/p1-sources`, see the PR this file is part of
- Phase and plan: P1.1, `docs/plans/P1.md` (approved by Srishan; the approval line is on `main`)
- Started and finished: 20:50 to 21:00 Eastern, Sat 14 Nov 2026

## 1. What I believe is complete

| Acceptance test (P1.1) | Result | Confidence |
|---|---|---|
| Simulator frames arrive at about 12 Hz | Pass, against the real vendored SDK in Node: 15 to 45 frames in 2.5 s, each with a spectrum and contact quality. **Not checked in a browser** (the overlay is wired in P1.4). | High |
| The alpha boost changes the bands | Pass in Node: alpha share rose at least 20 % within 3.5 s of `triggerSimEvent('alpha', true)` | High |
| Replay is fast and headless | Pass: 10 s at 12 Hz (120 frames) delivered in order, timestamps preserved, well under 1 s | High |
| No device code outside the lane | Pass: `rg PiEEG src` outside `src/signal/` finds one comment; the global is read in one function | High |
| Lane-boundary test | Pass | High |

## 2. How I verified it

| Check | Command | Result |
|---|---|---|
| Type check, all tests | `npm run check` | exit 0; 7 files, 41 tests |
| Production build | `npm run build` | built |
| Real SDK integration | `vitest run src/signal/__tests__/real-sdk.test.ts` | pass in about 6 s. The vendored file is evaluated as a plain script (`new Function('window', source)`) because the repo is `"type": "module"` |

**Not verified:** the simulator in a real browser tab; `connectBLE` on a board (P3.1); that Space or other game keys never reach the simulator when focus is in a text field (there is no text field yet); Windows.

## 3. Problems and workarounds

- First attempt to load the SDK in Node with `require` failed, because the repo's `"type": "module"` makes Node treat `pieeg.js` as ESM and its export guard breaks. Fixed by evaluating it as a plain script in the test.
- The SDK's own `updateHz` default is 15; we pass 12 from config, and the test confirms about 12.

## 4. Deviations from the plan

- **Replay frames keep their recorded timestamps** (as planned) but `source` is rewritten to `REPLAY`. The pipeline (P1.4) must therefore treat a replay frame's own `t` as "now" when judging freshness, otherwise every replayed frame looks stale. Noted for P1.2 and P1.4.
- **Recording format** was specified as `header` plus `frame` lines; I made unknown line types skippable so P1.5's `state` and `event` lines will not break older readers.
- **Extra test file** `real-sdk.test.ts` (not in the plan) because the fake SDK cannot catch a changed SDK shape.
- Added `simKeyLegend(config)` for the P1.6 overlay.

## 5. Changes

- Files: `src/signal/vendor/pieeg-types.ts`, `src/signal/sources/{pieeg-adapter,sim-source,replay-source,recording-format}.ts`, `src/signal/__tests__/{sources,real-sdk}.test.ts`, `src/signal/INDEX.md`, this report.
- Contract or config changes requested: none. Dependencies: none.
- Edits outside my lane: none. `src/signal/index.ts` is still the P0 stub on purpose; P1.4 replaces it.
- `INDEX.md` updated: yes.

## 6. Follow-ups

- [ ] Agent B (Codex, P1.2/P1.3): replay frames use the recording clock, so freshness must take `nowMs` as a parameter (the plan already does).
- [ ] Agent C (Antigravity, P1.5/P1.6) can start now: `BandFrame`, `parseRecording`, `serializeRecording` and `createReplaySource` are available once this PR merges.
- [ ] Me, next: P1.4 (registry, pipeline, URL params, `index.ts`) once P1.2 and P1.3 from agent B have merged.

## 7. Can a teammate explain this?

This adds the two ways of feeding the pipeline without a person wearing the board: the PiEEG library's built-in fake board that we drive with the 1 to 4 keys, and a player that replays a saved recording. Both hand the pipeline the same small "frame" object the real board will produce later.
