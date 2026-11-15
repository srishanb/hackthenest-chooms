# Credits

Every third-party asset and library in this repo, with its licence. Owner: Neil (assets), integrator (libraries).
**No AI-generated textures or models.** Add a row before you commit an asset.

## Inspiration

- The charge-jump climb is in the style of *Jump King* (Nexile). No code, levels or assets are reused.
- The narrator's tone is in the spirit of *Getting Over It with Bennett Foddy*. No voice, lines or assets are reused,
  and the voice is not a clone or imitation of any real person.

## Libraries

| Library | Version | Licence | Source |
|---|---|---|---|
| Phaser | 4.2.1 | MIT | https://www.npmjs.com/package/phaser |
| pieeg.js (vendored in `public/vendor/`) | 1.3.0-octopus | MIT | https://github.com/pieeg-club/hello_world_octopus_16 |

Build tools (Vite, TypeScript, Vitest, tsx) are listed in `package.json`.

## Art

| File or pack | Author | Licence | Source |
|---|---|---|---|
| Gothicvania Cold Corridors (`Cold Corridors Files.zip`): tileset, background layers, torch | Luis Zuno (ansimuz) | CC0; verified in bundled [public license](docs/licenses/cold-corridors/art-CC0.pdf) | [Asset page](https://ansimuz.itch.io/gothicvania-cold-corridors) |

## Music and sound effects

The five SFX entries below record the original selections; the P8.1 table records the imported subset and final filenames. CC0 was checked on each original item page. Entries without an imported-file row remain candidates. Cure Magic and fire crackling are excluded.

| File | Author | Licence | Source |
|---|---|---|---|
| `Footsteps_Stone.wav` — stone walking | Galbenshire | CC0 | [Freesound item](https://freesound.org/people/Galbenshire/sounds/464520/) |
| Footsteps (`01-footstep.ogg` through `06-footstep.ogg`) — corridor walking | GboxMikeFozzy | CC0 | [OpenGameArt item](https://opengameart.org/content/footsteps-0) |
| GUI Sound Effects (`GUI_Sound_Effects_by_Lokif.7z`) — menu selection and confirmation; individual files TBD | Lokif (LokiF) | CC0 | [OpenGameArt item](https://opengameart.org/content/gui-sound-effects) |
| Interface Sounds (`kenney_interfaceSounds.zip`) — additional menu clicks; individual files TBD | Kenney | CC0 | [OpenGameArt item](https://opengameart.org/content/interface-sounds) |
| `fantasy_magic_button_1.mp3` — recovery ember activation candidate | Almitory | CC0 | [OpenGameArt item](https://opengameart.org/content/fantasy-magic-spell) |
| `top-down-fantasy-1.ogg` (downloaded candidate; not integrated) | Distributed by ansimuz; composer not verified | **Unverified: do not integrate or redistribute until explicit music terms are confirmed.** The art ZIP license does not explicitly cover this separate download. | [Download page](https://ansimuz.itch.io/gothicvania-cold-corridors) |

## Narrator voice

| Voice | Provider | Notes |
|---|---|---|
| _not chosen yet (H-10)_ | ElevenLabs | Stock or designed voice only |

## Downloaded reference project

| File | Author | Licence | Source |
|---|---|---|---|
| `GodotProject.zip` (reference only; not integrated) | Luis Zuno (ansimuz) | Custom bundled [license](docs/licenses/cold-corridors/godot-project-license.pdf): personal/commercial project use and modification allowed; standalone asset redistribution/resale prohibited. Do not treat this archive as CC0. | [Asset page](https://ansimuz.itch.io/gothicvania-cold-corridors) |

License evidence checked against the downloaded archives on 2026-11-14. The reference project and unverified standalone music were not integrated; the imported art/audio subset is recorded below.
## P8.1 prepared local files (Neil Pawar)

These files were prepared in P8.1. The listed music and selected SFX are now used by the local audio engine; the Cold Corridors art remains available while current scenery uses the forest assets below. Each P8.1 file is CC0-1.0. No AI-generated assets, Godot reference files or unverified standalone music are included. Original bytes are preserved; only filenames/paths were changed where noted. Exact metadata and SHA-256 values: `public/assets/inventory.json`.

| Repository file(s) | Author | License evidence | Original source |
|---|---|---|---|
| `public/assets/art/cold-corridors/back.png`, `far.png`, `middle.png`, `near.png`, `foreground.png`, `tileset.png`, `torch-sheet.png` (all in the same folder) | Luis Zuno (ansimuz) | [Original art CC0 PDF](public/assets/licenses/cold-corridors-CC0.pdf) | https://ansimuz.itch.io/gothicvania-cold-corridors — separate art ZIP |
| `public/assets/audio/footsteps/01-footstep.ogg` through `06-footstep.ogg` | GboxMikeFozzy | [Item-page CC0 evidence](public/assets/licenses/source-evidence.md) | https://opengameart.org/content/footsteps-0 — first file renamed from `01-footstep_0.ogg` |
| `public/assets/audio/interface/click_001.ogg`, `confirmation_001.ogg`, `back_001.ogg` | Kenney (www.kenney.nl) | [Original archive notice](public/assets/licenses/kenney-interface-License.txt) | https://opengameart.org/content/interface-sounds |
| `public/assets/audio/ember/fantasy-magic-button-1.mp3` | Almitory | [Item-page CC0 evidence](public/assets/licenses/source-evidence.md) | https://opengameart.org/content/fantasy-magic-spell — renamed from `fantasy_magic_button_1.mp3` |
| `public/assets/audio/music/cathedral-in-the-forest.ogg` | congusbongus | [Item-page CC0 evidence](public/assets/licenses/source-evidence.md) | https://opengameart.org/content/cathedral-in-the-forest-ambient-loop — renamed from `forest_2_0.ogg` |

The ambient loop is a single mixed bed, not calm/tense stems. Original `top-down-fantasy-1.ogg` remains excluded pending explicit terms. This section complements the independent license-review work in PR #10 and does not supersede its restrictions.


## Forest overhaul: Lukya Forge

Selected resources from Ancient Forest 1.7 and Dark Forest 1.0, used inside Lighten Up only. Custom project-use license, **not CC0**: permits personal/commercial games and modification; prohibits redistributing/reselling the standalone product and NFTs. Original notice: [forest/License.txt](public/assets/forest/License.txt). Both packs are listed under the publisher LICENSE at https://lukyaforge.itch.io/ancientforest (checked 2026-11-15). No audio imported. Downloads originals untouched.

| Exact used game file | Original pack/file | Modification |
|---|---|---|
| `public/assets/forest/trees-2.png` | Ancient Forest 1.7/Background/Deep Forest/Background 2.png | Unmodified PNG |
| `public/assets/forest/trees-4.png` | Ancient Forest 1.7/Background/Deep Forest/Background 4.png | Unmodified PNG |
| `public/assets/forest/mist.png` | Ancient Forest 1.7/Background/Blind Sky/front_blind.png | Unmodified PNG |
| `public/assets/dark-forest/tree-bg.png` | Dark Forest 1.0/Backgrounds/Tree BG.png | Unmodified PNG |
| `public/assets/dark-forest/back-forest.png` | Dark Forest 1.0/Backgrounds/Back Forest.png | Unmodified PNG |
| `public/assets/forest/terrain-left.png` | Ancient Forest 1.7/Tiles/Tiles 4.png | Cropped [0, 56, 16, 72] |
| `public/assets/forest/terrain-middle.png` | Ancient Forest 1.7/Tiles/Tiles 4.png | Cropped [32, 56, 48, 72] |
| `public/assets/forest/terrain-right.png` | Ancient Forest 1.7/Tiles/Tiles 4.png | Cropped [64, 56, 80, 72] |
| `public/assets/forest/mushrooms.png` | Ancient Forest 1.7/Tiles/Tiles 4.png | Cropped [192, 16, 256, 48] |
| `public/assets/forest/fern.png` | Ancient Forest 1.7/Tiles/Tiles 4.png | Cropped [240, 48, 272, 80] |
| `public/assets/dark-forest/mushrooms.png` | Dark Forest 1.0/Tiles/Dark.png | Cropped [0, 252, 64, 344] |
| `public/assets/dark-forest/thorns.png` | Dark Forest 1.0/Tiles/Dark.png | Cropped [32, 316, 96, 360] |
| `public/assets/forest/ruby-idle.png` | Ancient Forest 1.7/Ruby V4 - Demo/Idle/ruby_idle-Sheet.png | Unmodified PNG |
| `public/assets/forest/ruby-run.png` | Ancient Forest 1.7/Ruby V4 - Demo/Run/run-Sheet.png | Unmodified PNG |
| `public/assets/forest/ruby-rise.png` | Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/jump_up-Sheet.png | Unmodified PNG |
| `public/assets/forest/ruby-fall.png` | Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/fall-Sheet.png | Unmodified PNG |
| `public/assets/forest/ruby-charge.png` | Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/start_jump-Sheet.png | Unmodified PNG |
| `public/assets/forest/ruby-land.png` | Ancient Forest 1.7/Ruby V4 - Demo/Jump/Sheet/end_jump-Sheet.png | Unmodified PNG |

Author: Lukya Forge (lukyaforge). Runtime tinting/opacity and animation are applied by the game, not the source files. Full dimensions/frame mappings and SHA-256 inventory: docs/visual-design.md and public/assets/forest/inventory.json. These files are game resources, not a standalone pack distribution.

## UI typography
- Pixelify Sans by Stefie Justprince, SIL Open Font License 1.1. Source: https://github.com/google/fonts/tree/main/ofl/pixelifysans. Bundled locally in `src/ui/theme/fonts/`, including OFL.txt. No runtime font requests.
