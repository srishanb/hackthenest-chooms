# Public preview update

The normal game now includes a **Preview forest visuals** checkbox during gameplay in development and production. Enable it to reveal the visual-only slider; disable it or choose Restore normal input to resume normal signal-driven scenery. It is off by default, does not persist across reload, and does not change sensor readings, recovery or movement. Source labels remain visible. Legacy URL forestDemo remains development-only. This supersedes the development-only control descriptions below.

# Forest visual design

## Source and license

Lukya Forge: https://lukyaforge.itch.io/ancientforest . Ancient Forest 1.7 and Dark Forest 1.0 are both listed downloads under the page LICENSE. The author permits games/apps and modification, prohibits resale/sublicensing/rental/redistribution of the product and NFTs. Local Ancient License.txt preserved verbatim; selected assets are integrated game resources, not a redistributed pack. Source folders remain untouched. No audio or unused pack contents imported.

## Selected mappings

| Pack/source | Game resource | Dimensions | Crop (left, top, right, bottom) |
|---|---|---|---|
| Ancient Forest 1.7/Background/Deep Forest/Background 2.png | `assets/forest/trees-2.png` | 416 x 256 | none |
| Ancient Forest 1.7/Background/Deep Forest/Background 4.png | `assets/forest/trees-4.png` | 416 x 256 | none |
| Ancient Forest 1.7/Background/Blind Sky/front_blind.png | `assets/forest/mist.png` | 480 x 272 | none |
| Dark Forest 1.0/Backgrounds/Tree BG.png | `assets/dark-forest/tree-bg.png` | 416 x 240 | none |
| Dark Forest 1.0/Backgrounds/Back Forest.png | `assets/dark-forest/back-forest.png` | 416 x 224 | none |
| Ancient Forest 1.7/Tiles/Tiles 4.png | `assets/forest/terrain-left.png` | 16 x 16 | (0, 56, 16, 72) |
| Ancient Forest 1.7/Tiles/Tiles 4.png | `assets/forest/terrain-middle.png` | 16 x 16 | (32, 56, 48, 72) |
| Ancient Forest 1.7/Tiles/Tiles 4.png | `assets/forest/terrain-right.png` | 16 x 16 | (64, 56, 80, 72) |
| Ancient Forest 1.7/Tiles/Tiles 4.png | `assets/forest/mushrooms.png` | 64 x 32 | (192, 16, 256, 48) |
| Ancient Forest 1.7/Tiles/Tiles 4.png | `assets/forest/fern.png` | 32 x 32 | (240, 48, 272, 80) |
| Dark Forest 1.0/Tiles/Dark.png | `assets/dark-forest/mushrooms.png` | 64 x 92 | (0, 252, 64, 344) |
| Dark Forest 1.0/Tiles/Dark.png | `assets/dark-forest/thorns.png` | 64 x 44 | (32, 316, 96, 360) |
| Ancient Forest 1.7/Ruby V4 - Demo/Idle/ruby_idle-Sheet.png | `assets/forest/ruby-idle.png` | 640 x 48 | none |
| Ancient Forest 1.7/Ruby V4 - Demo/Run/run-Sheet.png | `assets/forest/ruby-run.png` | 640 x 48 | none |
| Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/jump_up-Sheet.png | `assets/forest/ruby-rise.png` | 192 x 48 | none |
| Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/fall-Sheet.png | `assets/forest/ruby-fall.png` | 192 x 48 | none |
| Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/start_jump-Sheet.png | `assets/forest/ruby-charge.png` | 384 x 48 | none |
| Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/end_jump-Sheet.png | `assets/forest/ruby-land.png` | 192 x 48 | none |

## Cached source inventory

The source PNG inventory was inspected once. Counts: Ancient 82, Dark 79. Selected mappings above are authoritative for this implementation; the complete filename/dimension inventory is cached in docs/forest-source-inventory.json (metadata only; source packs are not shipped).

## Rendering, animation and policy

- Terrain samples are cropped from the mossy top of Tiles 4 at the listed coordinates. Center surfaces repeat, and end caps use the same 2x source-pixel scale, clipped to the existing rectangle. Geometry and one-way collision boxes are untouched. Bright top rims persist; LAN-3's protected outline module is preserved above the darkness.
- Backgrounds use paired Ancient tree layers with identical anchors and parallax 0.12 / 0.28. They crossfade from cool-green to purple-tinted versions of the same geometry. Dark Forest canopy/leaves enrich the corrupted state at capped opacity. All scenery is behind terrain/player; no camera shake or signal-driven camera motion.
- Props are seeded from platform IDs, one pair at each edge, capped at 72 pairs. Healthy/corrupted plants share a baseline; corrupted artwork is fit to its healthy partner's height. Reveal uses continuous smoothstep ramps. No re-randomization as intensity changes.
- Exactly 24 screen-space spores are created once, with seeded positions/phases, restrained sinusoidal drift (12 px, 9 s period). Mist drifts slowly. Reduced motion freezes atmospheric animation; color transitions remain smooth. Pause freezes atmospheric time.
- Ruby V4 alone: 64x48 frames. Idle/run have 10 frames, rise/fall/landing 3, charge 6. Frame rate 9 fps except run 14 and landing 18. Feet anchor (0.5,46/48) is placed on the unchanged physics feet. Ruby's more detailed pixel resolution uses 1x to match the existing 24x36 collider; scenery uses 2x. Phaser nearest-neighbor rendering/rounding keeps both crisp. The original invisible rectangle remains the camera follow target; no body or movement timing is changed.
- New EffectsFrame key forestCorruption, mapped 0..1 from existing valid intensity by the same exponential engine (tau 2200 ms). Invalid signal, fixed mode, disabled row or strength zero target neutral 0.2, never full corruption. Existing lantern-radius airborne hold is untouched. Corruption tint is allowed while airborne because it does not change geometry or lighting radius. Reduced motion has scale 1 for this color-only row; renderer drift is separately frozen.
- Darkness opacity varies from 0.28 to 0.72 of the original sheet, maintaining atmosphere while preserving readability. Lantern radius calculation and recovery policy remain unchanged.
- UI uses existing tokens/components: forest ink panels, moss borders, parchment highlights, restrained serif headings and explicit focus states. No menu, remap, recovery or calibration flow is replaced. System fonts only.

## Development controls and launch

Run npm ci, then npm run dev in wt-codex-forest-overhaul. Assigned PORT is 3015. Open http://localhost:3015/?source=sim&forestDemo=0 to opt into the labeled DEV visual-only slider. Values 0/.25/.5/.75/1 are checkpoints on a continuous ramp, not presets. Restore normal input removes the override without changing signal state, calibration, source, recovery or other effect fields. ?forestPreview=1 opens diagnostics following normal input. In production both query switches and override events are ignored.

The normal source badge continues to identify simulator/live/replay/ordinary assistance. Diagnostic target values are renderer values, not numeric composure scores. No changes to signal-owned debug-overlay files. Tests verify other effects and input remain unchanged by the preview.

## Integration overlaps

Protected-visibility PR #51 merged during implementation; merged it normally and preserved its module/create/update hooks. Calibration-screen PR #52 merged and is preserved. Wax/tutorial PR #50 also merged during final QA. Its authored motion, wind, ice, lesson copy, wax rewards and collision code are preserved. Forest tile/cap/prop positions now follow the existing simulated platform boxes; moving/ice rims and wind cues remain authoritative. Final sync/check details are recorded in the task report. No level data, physics modules, saves, ember logic or signal algorithms are edited.

## Validation and screenshots

- Final integration baseline: origin/main 2b275c8, including protected visibility (#51), calibration (#52), replay clock (#54), and tutorial/wax rewards (#50). No changes relative to that baseline in movement, collisions, section data, saves, recovery or signal processing.
- `npm run check`: 42 test files / 277 tests pass, including five focused forest policy/determinism/frame-rate tests. `npm run build` passes. Existing vendor/pieeg.js non-module warning remains. `npm run check:levels`: all five current tutorial sections reachable.
- SHA-256 inventory audit passes for all 18 imported PNGs (155,235 bytes). Resources load from local assets; no new runtime network integration or dependencies.
- Browser QA at 1280x720: real keyboard walk/charge/jump/fall/land, E placement/pickup, R return to an ember on a ledge, and reload restoring its saved position. Controls tutorial, pause/resume, settings focus and sliders work. At 390x844 the settings fit with keyboard controls intact; the dev panel hides behind menus/dialogs to avoid overlap.
- Effect-strength zero returns the visual row to neutral 0.2. Reduced motion stops atmospheric drift and preserves smooth color interpolation. Restoring normal input visibly removes the override. Unit checks cover invalid/fixed/zero-strength policy, independent preview behavior, 30/60/144 Hz recovery and alternating-target smoothing.
- Available-machine observed FPS: 119.8–120.3 at calm/full corruption (roughly 8.3 ms frame cadence). This is Phaser's loop FPS, not a GPU timing/profile or target-hardware guarantee. Scenery is bounded at 72 prop pairs and 24 spores; textures load once.
- Screenshots in `docs/screenshots/forest/`: calm, quarter, half, three-quarter, corrupted share the spawn/camera location; a moving ledge may occupy different points on its authored cycle. Pause, settings, mobile-settings and tutorial document existing UI flows. Ember-return shows the successful ledge recovery/reload before the tutorial/wax integration; those recovery modules are unchanged.

## Known limits

No live PiEEG/headset session, other GPU/browser, full timed climb, audio listening pass, or target demo laptop was tested. The current title/start flow remains the existing one; no new title/death screen was invented. Selected Dark Forest plants use compatible height fitting rather than exact paired animation sheets. Ruby uses one coherent Ancient set. Existing later-level layouts and physics remain the team's responsibility; the level reachability script checks the currently active tutorial set.

Production preview verified locally with ?forestDemo=1: no diagnostic panel, no DEV canvas attributes, no browser errors; the query is ignored. Both temporary 3015 servers were stopped after QA. No deployment performed.

## Automatic stage atmosphere update

Current local implementation supersedes the original whole-plate parallax/prop-count descriptions: see docs/plans/stage-atmosphere.md. Wind/snow select themselves through existing stageWeatherAt; no extra weather sliders. Sequence: tutorial → forest → windy → snowy → combined. Source textures, frame sizes, derivations and licenses are in CREDITS and assets/atmosphere-inventory.json. Existing corruption preview affects both weather and forest; Restore normal input remains authoritative.

Local QA: npm run dev on PORT3017. DEV-only ?forestHeight=4000 offsets scenery/weather sampling so snow can be inspected without skipping gameplay; 2600 previews wind, 5200 combined, 20000 high background. It does not teleport or change the camera; HUD still reports actual Tutorial. This is excluded from production. No force/collision/difficulty modulation by the renderer. Overlay count is three, trunks fourteen, canopy slots ten, plants capped at72 pairs. Production controls remain the prior public corruption checkbox/slider.

Validation: 342 tests/55 files and build pass; all five reordered stages reachable. Observed loop FPS 114.3 combined/corrupted, 119.8 wind (available machine only). See docs/agent-reports/20261115-0313-codex-stage-atmosphere.md for limits and screenshots in docs/screenshots/atmosphere. Canopy uses an irregular elliptical alpha silhouette (original pixels), trunks reflect source rows with matching RGBA endpoints. No full manual stage traversal or hardware verification claimed.
