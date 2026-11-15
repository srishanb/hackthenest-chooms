# src/game — public exports

Owner: Ali. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createGame(deps)` | `index.ts` | Creates the Phaser game. Everything it needs arrives in `GameDeps`. |
| `BootScene`, `BOOT_SCENE_KEY`, `CLIMB_SCENE_KEY` | `scenes/boot-scene.ts` | First scene; P8 loads assets here. |
| `ClimbScene` | `scenes/climb-scene.ts` | Draws the world, runs fixed-step `stepPlayer`, emits `jump` and `precision_window`, feeds the darkness layer. |
| `stepPlayer`, `createPlayer`, `teleportPlayer` | `player/movement.ts` | Pure fixed-step physics: gravity, walk, charge jump, air steering, one-way platforms, side walls. Never reads the signal. |
| `charge01`, `launchVelocity`, `steeredVx` | `player/charge-jump.ts` | Charge and launch maths, air-steering cap. |
| `findLanding`, `findSupport`, `overlapsX`, `clampToWalls` | `player/collide.ts` | Swept one-way landing and wall clamp. |
| `sectionAt`, `lowestPlatformY` | `world/bounds.ts` | Which section a height belongs to (derived from platforms). |
| `landingEvents` | `world/fall-tracker.ts` | A landing becomes `land`, and past `minFallPxToOffer` also `fall { heightPx, big }`. Never resets or kills. |
| `bodyInArea`, `findFinish`, `altitude01` | `world/finish.ts` | Area tests, the finish zone, and altitude (section 1 spawn 0, finish 1). |
| `createPhaseController`, `PhaseController` | `world/phase-controller.ts` | Pause/resume (restores the earlier phase) and one-time finish; stepping only while `'playing'`. |
| `writeSnapshot`, `SnapshotPatch` | `scenes/snapshot-writer.ts` | Publishes `sectionId`, `altitude01` (the refuge controller owns `inRefuge`) only when a field changes. |
| `PlayerInput`, `PlayerState`, `PlatformBox`, `StepEvents` | `player/types.ts` | Plain data shared with the level checker (P4.2). |
| `targetFor`, `stepEffect`, `stepEffects`, `neutralFrame`, `EffectInput` | `effects/effects-engine.ts` | Pure maths: signal → capped, smoothed effect values. |
| `createDarkness`, `updateDarkness`, `minCoveringRadius` | `effects/darkness.ts` | The darkness sheet with a soft light hole (P0 spike). |
| `createRefugeController` | `world/refuge.ts` | Entry saves, reload spawn, one-time ember refill, shared refuge state. |
| `parseSave`, `serializeSave`, `loadSave`, `writeSave`, `clearSave`, `createMemorySaveStorage`, `SAVE_KEY` | `save.ts` | Versioned progress; safe fallback when browser storage is unavailable. |

Not built yet: section loading and reachability (P4.2), finish (P4.5), and `ember/` (P6).
