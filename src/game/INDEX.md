# src/game — public exports

Owner: Ali. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createGame(deps)` | `index.ts` | Creates the Phaser game. Everything it needs arrives in `GameDeps`. |
| `createKeyboardInput` | `keyboard-input.ts` | A/D and arrow movement, Space/Up jump, live remaps and buffered jump taps. |
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
| `reachableLedges`, `outlineSegments`, `WorldBounds`, `Segment` | `world/reachable-ledges.ts` | Higher ledges a sampled real jump lands on (LAN-3), and the outline segments to draw. No signal. |
| `createProtectedVisibility` | `effects/protected-visibility.ts` | Outline layer above the darkness: the ledge underfoot and reachable ledges' top edges; cached per ledge. |
| `createRefugeController` | `world/refuge.ts` | Rest-area entry/exit only. No automatic saves, markers or ember refills. |
| `createRecoveryEmber` | `ember/recovery.ts` | One manually placed reusable ember: E placement/pickup, unlimited R recovery, valid-time gate and labelled rescue. |
| `parseSave`, `serializeSave`, `loadSave`, `writeSave`, `clearSave`, `createMemorySaveStorage`, `SAVE_KEY`, `EmberAnchor` | `save.ts` | Manual-anchor v2 persistence; old automatic-checkpoint saves are ignored. |
| `loadSections`, `LoadedWorld`, `WORLD_TOP_MARGIN_PX` | `world/section-loader.ts` | Validate IDs, geometry, types, floor and zones before play or reachability checks. |
| `getPlatformType`, `PlatformType` | `world/platform-types/registry.ts` | Platform capabilities, including whether a surface is a safe stationary anchor. |
| `STATIC_PLATFORM` | `world/platform-types/static.ts` | Stationary-platform capabilities. |
| `drawWorld` | `world/world-view.ts` | Render validated collision geometry and authored zones. |

`tools/levels/check-levels.ts` runs `checkReachability` from `tools/levels/reach.ts` using the same `stepPlayer` as gameplay.
Recovery keeps a marker placed after each return. Pickup is required before placing it elsewhere.
