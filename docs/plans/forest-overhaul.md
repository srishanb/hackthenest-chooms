# Forest visual overhaul

Status: implementation requested by Neil Pawar, 2026-11-15. Cross-lane approval is not asserted; current D-22 makes approval guidance rather than a gate.

## Goal and scope
Replace placeholder presentation with Ancient Forest 1.7 / Dark Forest pixel art. Preserve all movement, collision geometry, level coordinates, camera follow, recovery, persistence and signal processing.

## Pre-code check and overlaps
Main at 0963990: world-view draws rectangles; BootScene loads no art; player is a rectangle. Existing effects engine already provides bounded exponential smoothing. UI menus exist. P8.1 media is present, no forest art yet. PR #51 owns protected-visibility outlines and #50 owns wax rewards: keep their modules authoritative, add a separate presentation object and minimal scene hooks, merge their work before final verification. No debug-overlay edits: development-only visual controls live beside the existing source badge, with a renderer-only browser event defined in config. No second signal pipeline.

## Files and contracts
- New src/game/forest/: texture preload, scenery, platform skins, deterministic props and character visuals.
- Minimal boot-scene preload, world-view replacement and ClimbScene visual hooks; pixelArt flag in game/index.
- New src/config/forest.config.ts for visuals and development event; effects.config row and one forestCorruption EffectId.
- UI source-badge diagnostic control helper; forest palette in existing tokens/menu rules, no flow rewrite.
- Selected public/assets/forest and dark-forest files, exact notices and CREDITS entries; docs/visual-design.md.
- Focused tests: validity/fixed/strength/reduced-motion policy, smoothing and seeded reveals.

## Asset and licensing plan
Ancient license permits modified assets inside games, prohibits standalone pack redistribution. Publisher's https://lukyaforge.itch.io/ancientforest lists Dark Forest 1.0 alongside Ancient Forest under its LICENSE (project use allowed; redistributing the product prohibited). Preserve Ancient exact local license plus dated publisher evidence. Import only selected render textures, not packs, enemies, source sheets, music or HUD art not used. Both sources credited to Lukya Forge. UI stays CSS; use one Ruby V4 character set with inspected 64x48 frames, no mixing versions.

## Human tasks still open
| Task | Owner | Blocks this implementation? | Consequence |
|---|---|---|---|
| H-07 art/license selection | Neil | Covered by explicit forest-pack request; verify exact imports | Exclude any unverified file |
| H-12 playtest four heads/stranger | Team | No | Do not claim target-machine or hardware validation |
| H-02/03/04/19 board/session/checkpoint | Neil/Srishan | No | Test via labeled simulator and visual-only dev controls |
| H-10 voice/lines | Neil/Amrit | No | Audio replacement excluded |

## Implementation
1. Cache pack inventory/dimensions and compact contact sheets; map selected textures and animations.
2. Preload local selected files once; separate renderer uses scene/camera/player read-only state only.
3. Add forestCorruption 0..1 row to existing effects engine, neutral fallback .2, smooth reversible transitions; no changes to lantern/physics policies. Reduced motion stops atmospheric drift; color changes remain gentle.
4. Layer calm/dark scenery with aligned anchors and parallax; stable seeded props; capped particles; tile platform surfaces without geometry changes; animate Ruby from existing state.
5. Dev-only explicit target sweep and return-to-input; isolated from signal/recovery, correctly labeled.
6. Theme existing menus/HUD through tokens and styles, preserve focus/responsiveness/settings.

## Acceptance and validation
npm run check, build, check:levels. Confirm local asset success, screenshots at 0/.25/.5/.75/1 and return sweep at same location, invalid/fixed/strength/reduced motion, controls, recovery, resize, UI focus, pixel anchors. Measure available-machine FPS; no claim of real-sensor testing. Stop temporary PORT=3015 server after browser QA. Report limitations and integration overlaps; no self-merge, force push, deleted branches or history rewrite.
