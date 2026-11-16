---
name: phaser4-api
description: "Phaser 4.2.1 API reference for Lighten Up: the official Phaser documentation skills (vendored, MIT) plus the Phaser 3 to 4 traps that matter in this codebase. Use it BEFORE writing or changing any code that touches Phaser (scenes, game objects, images, tileSprites, graphics, tints, cameras, filters and shaders, canvas textures, tweens, timers, input, scale, loading), and whenever a Phaser call fails, renders wrong or does not exist. Phaser 4 is not Phaser 3: most answers online and from memory are v3 and silently wrong here. Not for the game's own rules (movement, generator, effects config): read src/game/INDEX.md for those."
---

# Phaser 4 API

The game uses Phaser **4.2.1** (`package.json`), WebGL, with `pixelArt: true` and `roundPixels: true`
(`src/game/index.ts`). Phaser 4 replaced the v3 renderer and several APIs. Code written from v3
memory often compiles (the types are loose in places) and then draws nothing or the wrong thing.
So: look the call up here first, then check it against the installed types.

## How to look something up

1. Find the topic in the table below and read that `references/<topic>/README.md` (and its
   `references/REFERENCE.md` when it has one, for full option tables).
2. Confirm the exact name and signature in the installed package: `node_modules/phaser/types/phaser.d.ts`
   (search the class or method) and the source under `node_modules/phaser/src/`. The pinned package is
   the authority (AGENTS.md rule 6: never invent an API name).
3. Find an existing use in `src/game/` with `rg` and follow its pattern.
4. Still unsure: the `library-docs` tool role in `.claude/skills/lighten-up-orchestrator/references/tools.md`
   (Context7) has the online Phaser docs; check its answer is for v4.

## Traps that matter in this codebase

| Topic | Phaser 3 habit | Phaser 4 here | Where this repo does it |
|---|---|---|---|
| Post-processing | `PostFXPipeline`, `preFX`/`postFX`, `setPipeline` | Filters: a `Phaser.Filters.Controller` plus a render node (`Renderer.WebGL.RenderNodes.BaseFilterShader`) registered with `renderer.renderNodes.addNodeConstructor`, added to `camera.filters.internal` or `.external`. Shader headers use `#pragma phaserTemplate(...)` | `src/game/forest/corruption-filter.ts` |
| Masks | `BitmapMask`, `setMask` | `filters.internal.addMask(...)`; `GeometryMask` is Canvas-only | not used yet |
| Tint | `setTintFill(c)` | `setTint(c).setTintMode(Phaser.TintModes.FILL)`; `setTint` alone multiplies. `setTintFill()` is still in the 4.2.1 types but "does nothing", so it compiles and silently fails | `setTint` throughout `src/game/forest/` |
| Pixel snapping | `roundPixels` defaulted to true | defaults to false (`pixelArt: true` turns it on); this game sets both, and per object `vertexRoundMode` decides | `src/game/index.ts` |
| TileSprite | crop, whole-texture repeat only | rewritten: no cropping; frames from atlases work; `tileRotation` exists | 16 `add.tileSprite` calls, mostly `src/game/forest/` |
| Render/Dynamic textures | drawing happened immediately | call `render()` to run the buffered commands | not used; canvas textures are (`textures.createCanvas`, then `texture.refresh()`), see `src/game/effects/darkness.ts` |
| Renderer | Canvas fallback was common | Canvas is deprecated and has no filters; `Phaser.AUTO` still allows it, so code that needs WebGL checks `renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer` and degrades | `createCorruptionFilter` returns `null` |
| Maths | `Math.TAU` was PI/2, `Math.PI2` | `Math.TAU` is 2·PI, `PI2` removed, `Math.PI_OVER_2` added | check any angle code |
| Geometry | `Geom.Point` | removed: `Math.Vector2` | |
| Data structures | `Phaser.Struct.Set/Map` | native `Set`/`Map` | |
| Shader game object | positional constructor, Shadertoy uniforms | config object, uniforms set by you (`setUniform`) | |
| Removed | `Mesh`, `Plane`, Camera3D, `Create.GenerateTexture` | gone; draw with Graphics or a canvas texture | |
| Direct WebGL | raw `gl` calls | breaks Phaser's state tracking; use an `Extern` game object | |

Other facts for this repo: there is no Phaser physics (movement is the game's own `stepPlayer` in
`src/game/player/`), scene life cycle hooks use `Phaser.Scenes.Events.SHUTDOWN` and `RENDER`, the
module is imported as `import * as Phaser from 'phaser'` (or `import type` when only types are
needed), and per-frame work belongs in the render loop (AGENTS.md "Performance").

## Topic map (`references/`)

| Topic | Read |
|---|---|
| What changed from v3, migration checklist | `references/v3-to-v4-migration/README.md` |
| New in v4 (filters, render nodes, lighting, new objects) | `references/v4-new-features/README.md` (+ `references/REFERENCE.md`) |
| Filters, post-processing, masks, custom shaders | `references/filters-and-postfx/README.md` |
| Game config, renderer type, pixelArt, roundPixels | `references/game-setup-and-config/README.md` |
| Scenes, life cycle, events, multiple scenes | `references/scenes/README.md` (+ `REFERENCE.md`) |
| Images, sprites, frames, flip, origin | `references/sprites-and-images/README.md` (+ `REFERENCE.md`) |
| Shared components: alpha, tint, depth, scroll factor, transform | `references/game-object-components/README.md` (+ `REFERENCE.md`) |
| Graphics and shapes (rectangle, ellipse, arc) | `references/graphics-and-shapes/README.md` |
| Containers, groups, layers | `references/groups-and-containers/README.md` |
| Cameras: scroll, follow, bounds, zoom, effects | `references/cameras/README.md` (+ `REFERENCE.md`) |
| Canvas, render and dynamic textures | `references/render-textures/README.md` |
| Loading assets, spritesheets | `references/loading-assets/README.md` (+ `REFERENCE.md`) |
| Animations | `references/animations/README.md` |
| Tweens | `references/tweens/README.md` |
| Timers and the clock | `references/time-and-timers/README.md` |
| Keyboard, pointer, touch | `references/input-keyboard-mouse-touch/README.md` (+ `REFERENCE.md`) |
| Scale manager, FIT, resize | `references/scale-and-responsive/README.md` |
| Events and emitters | `references/events-system/README.md` |
| Data manager | `references/data-manager/README.md` |
| Text and bitmap text | `references/text-and-bitmaptext/README.md` |
| Particles | `references/particles/README.md` (+ `REFERENCE.md`) |
| Geometry and maths | `references/geometry-and-math/README.md` |
| Curves and paths | `references/curves-and-paths/README.md` |
| Actions and utilities | `references/actions-and-utilities/README.md` |
| Audio | `references/audio-and-sound/README.md` (the game's music and sound use Web Audio in `src/audio/`, not Phaser sound) |
| Tilemaps | `references/tilemaps/README.md` |
| Arcade and Matter physics (not used here) | `references/physics-arcade/README.md`, `references/physics-matter/README.md` |

The reference files are the official Phaser skills, copied unchanged except for renamed files and
fixed links; see `references/SOURCE.md` and `references/LICENSE.md` (MIT).
