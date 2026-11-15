# src/signal — public exports

Owner: Srishan. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createSignal(bus, config)` | `index.ts` | Returns the `SignalHandle` (reader, control, diagnostics). **Still the P0 stub** (sine wave); P1.4 replaces it with the real pipeline. |
| `getPiEEGConstructor()`, `PiEEG*` types | `vendor/pieeg-types.ts` | Typed subset of the vendored SDK. The only place the global `PiEEG` is read. |
| `createPiEEGAdapter(config, callbacks)`, `toBandFrame(...)` | `sources/pieeg-adapter.ts` | SDK to `BandFrame`. `connect('simulator')` needs no click; `connect('ble')` must run in a click handler. |
| `createSimSource(deps)`, `simKeyLegend(config)` | `sources/sim-source.ts` | `Source` over the SDK simulator, keyboard-driven (keys from `simKeys` config). |
| `createReplaySource(deps)` | `sources/replay-source.ts` | `Source` that plays recorded frames at 1x, faster, or `Infinity` (headless). Frames keep their timestamps; `source` becomes `REPLAY`. |
| `createHeader`, `serializeRecording`, `parseRecording`, `Recording`, `RecordingHeader` | `sources/recording-format.ts` | JSONL recording format (`header` + `frame` lines; unknown types skipped). |

Tests: `__tests__/sources.test.ts` (fake SDK), `__tests__/real-sdk.test.ts` (the real vendored simulator in Node, about 6 s).

Not built yet: `PiEEGSource` for the real board (P3.1), stages (P1.2, P1.3), pipeline and registry (P1.4), recorder (P1.5).
