# src/game — public exports

Owner: Ali. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createGame(deps)` | `index.ts` | Creates the Phaser game. Everything it needs arrives in `GameDeps`. |
| `BootScene`, `BOOT_SCENE_KEY`, `CLIMB_SCENE_KEY` | `scenes/boot-scene.ts` | First scene; P8 loads assets here. |
| `ClimbScene` | `scenes/climb-scene.ts` | **P0 stub:** box, platforms, darkness layer. |
| `targetFor`, `stepEffect`, `stepEffects`, `neutralFrame`, `EffectInput` | `effects/effects-engine.ts` | Pure maths: signal → capped, smoothed effect values. |
| `createDarkness`, `updateDarkness`, `minCoveringRadius` | `effects/darkness.ts` | The darkness sheet with a soft light hole (P0 spike). |

Not built yet: `player/` (movement, P4.1; must never import the signal contracts), `world/`, `ember/`, `save.ts`.
