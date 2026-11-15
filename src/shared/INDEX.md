# src/shared — public exports

Owner: integrator (Srishan). **Frozen after P0:** changes go through an integrator PR.

| Export | File | What it is |
|---|---|---|
| `ComposureState`, `ComposureReader`, `InputSourceKind`, `SignalMode` | `contracts/composure.ts` | The one signal contract the game reads. |
| `SignalHandle`, `SignalControl`, `SignalDiagnostics`, `CalibrationStep`, `CalibrationResult` | `contracts/signal-api.ts` | What the UI may ask of the signal lane. Never given to the game. |
| `BandFrame`, `BandPowers`, `Source`, `Features`, `Baseline(s)`, `Scores`, stage types, `Algorithm` | `contracts/signal-internal.ts` | Pipeline shapes for the signal lane and its tools. |
| `GameEvent`, `GameEventType`, `GameEventOf`, `EventBus` | `contracts/events.ts` | Every game moment and the bus interface. |
| `GameSnapshot`, `GamePhase`, `EmberSnapshot`, `INITIAL_GAME_SNAPSHOT` | `contracts/game-state.ts` | The game's public state. |
| `EffectId`, `EFFECT_IDS`, `EffectRule`, `EffectsFrame` | `contracts/effects.ts` | Effects as data. |
| `Settings`, `KeyBindings`, `Volumes`, `DEFAULT_SETTINGS` | `contracts/settings.ts` | Player settings schema and defaults. |
| `SignalConfig`, `GameConfig`, `EmberConfig`, `UiConfig`, `UiComponentId`, `UiSlot`, `AudioConfig` | `contracts/config.ts` | Types of the files in `src/config/`. |
| `SectionData` (with `refuge`, `finish`), `PlatformData`, `AreaData`, `NarratorLine` | `contracts/content.ts` | Authored content shapes (starting shape). |
| `Stores` | `contracts/app.ts` | The three stores `main.ts` creates. |
| `createEventBus(now?)` | `bus.ts` | Typed event bus. |
| `createStore(initial)`, `Store<T>` | `store.ts` | Observable value. |

`__tests__/lane-boundaries.test.ts` fails the build if a lane imports another lane.
