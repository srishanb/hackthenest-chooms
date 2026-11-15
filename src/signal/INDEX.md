# src/signal — public exports

Owner: Srishan. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createSignal(bus, config, deps?)` | `index.ts` | Returns the `SignalHandle` (reader, control, diagnostics): the real pipeline, fed by a sim or replay source chosen from the URL params, published at 12 Hz. `deps` (`search`, `now`, `fetchText`, `live`) is for tests. |
| `getPiEEGConstructor()`, `PiEEG*` types | `vendor/pieeg-types.ts` | Typed subset of the vendored SDK. The only place the global `PiEEG` is read. |
| `createPiEEGAdapter(config, callbacks)`, `toBandFrame(...)` | `sources/pieeg-adapter.ts` | SDK to `BandFrame`. `connect('simulator')` needs no click; `connect('ble')` must run in a click handler. |
| `createPiEEGSource(deps)` | `sources/pieeg-source.ts` | `Source` for the real board over `connect('ble')`. Starts in the click handler; readable errors for no Web Bluetooth or a cancelled picker; an SDK error or disconnect ends it once. |
| `createSimSource(deps)`, `simKeyLegend(config)` | `sources/sim-source.ts` | `Source` over the SDK simulator, keyboard-driven (keys from `simKeys` config). |
| `createReplaySource(deps)` | `sources/replay-source.ts` | `Source` that plays recorded frames at 1x, faster, or `Infinity` (headless). Frames keep their timestamps; `source` becomes `REPLAY`. |
| `createHeader`, `serializeRecording`, `parseRecording`, `Recording`, `RecordingHeader` | `sources/recording-format.ts` | JSONL recording format (`header` + `frame` lines; unknown types skipped). |
| `createPipeline(deps)`, `Pipeline`, `PipelineDeps` | `pipeline.ts` | Wires preprocess, features, quality, scorer, gates and smoother into `ingest(frame, now)` / `step(now)`; also calibration and mode control. |
| `ALGORITHMS`, `resolveAlgorithm`, `listAlgorithmIds`, `AlgorithmEntry` | `algorithms/registry.ts` | Algorithm id to entry map. Unknown id falls back to the default with a console warning. `needsCalibration` lets an algorithm be valid uncalibrated. |
| `intensityV1`, `intensityV2`, `passthroughV0` | `algorithms/intensity-v1.ts`, `algorithms/intensity-v2.ts`, `algorithms/passthrough-v0.ts` | v1: beta share (cannot separate clench on the simulator). v2 (default): log absolute 13-30 Hz power, mostly muscle. passthrough: raw, no calibration. |
| `parseSignalUrlParams` | `url-params.ts` | Reads `?source`, `?algo`, `?mode=fixed`, `?replay`, `?preset`. |
| `createPresetController` | `presets/controller.ts` | Runtime source switch (simulator, live, replay preset), loop, save/import/export/delete. Returned as `SignalHandle.presets`. |
| `parsePreset`, `serializePreset`, `compactFrames`, `shiftFrames` | `presets/preset-file.ts` | Recording plus a `baselines` line; moves frames onto the current clock. |
| `createPresetStore` | `presets/preset-store.ts` | Saved presets in browser storage (`lighten.presets.v1`, at most 4). |
| `buildPresets`, `presetBaselines` | `tools/presets/presets.ts` | The deterministic built-in presets in `public/recordings/presets/` (`npm run presets:build`). |
| `Pipeline.getBaselines`, `setBaselines` | `pipeline.ts` | A preset brings its own baselines and the old ones return when you leave it. |
| `smooth` | `stages/smoother.ts` | Time-based exponential smoothing. |
| `normalise`, `scoreWithBaselines` | `stages/scorer.ts` | Feature to 0..1 against a baseline; neutral defaults before calibration. |
| `isValid`, `nextRestingActive`, `targetsFor` | `stages/gates.ts` | Validity gate, resting hysteresis, and intensity/resting targets per mode. |
| `preprocess`, `isValidBandFrame` | `stages/preprocess.ts` | Frame sanity checks and cleanup (P1.2). |
| `extractFeatures` | `stages/features.ts` | `BandFrame` to features (P1.2). |
| `estimateQuality` | `stages/quality.ts` | Signal quality 0..1 (P1.2). |
| `calibrateBaseline`, `createCalibrationCollector`, `stepCalibrationCollector`, `quantile` | `stages/calibration.ts` | Baseline calibration windows and the quantile helper (P1.3). |

Tests: `__tests__/sources.test.ts` (fake SDK), `__tests__/real-sdk.test.ts` (the real vendored simulator in Node, about 6 s), `__tests__/stages-p14.test.ts` (scorer, smoother, gates, registry, url params), `__tests__/pipeline.test.ts`, `__tests__/signal-index.test.ts` (createSignal end to end with fake timers), plus the P1.2/P1.3 stage tests.

Not built yet: `PiEEGSource` for the real board (P3.1), recorder (P1.5), overlay sim legend and Calibrate buttons (P1.6).
