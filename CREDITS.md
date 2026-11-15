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
| _none yet_ | | | |

## Music and sound effects

| File | Author | Licence | Source |
|---|---|---|---|
| _none yet_ | | | |

## Narrator voice

| Voice | Provider | Notes |
|---|---|---|
| _not chosen yet (H-10)_ | ElevenLabs | Stock or designed voice only |

## P8.1 prepared local files (Neil Pawar)

These files are prepared for integration, not yet wired into gameplay or audio. Each is CC0-1.0. No AI-generated assets, Godot reference files or unverified standalone music are included. Original bytes are preserved; only filenames/paths were changed where noted. Exact metadata and SHA-256 values: `public/assets/inventory.json`.

| Repository file(s) | Author | License evidence | Original source |
|---|---|---|---|
| `public/assets/art/cold-corridors/back.png`, `far.png`, `middle.png`, `near.png`, `foreground.png`, `tileset.png`, `torch-sheet.png` (all in the same folder) | Luis Zuno (ansimuz) | [Original art CC0 PDF](public/assets/licenses/cold-corridors-CC0.pdf) | https://ansimuz.itch.io/gothicvania-cold-corridors — separate art ZIP |
| `public/assets/audio/footsteps/01-footstep.ogg` through `06-footstep.ogg` | GboxMikeFozzy | [Item-page CC0 evidence](public/assets/licenses/source-evidence.md) | https://opengameart.org/content/footsteps-0 — first file renamed from `01-footstep_0.ogg` |
| `public/assets/audio/interface/click_001.ogg`, `confirmation_001.ogg`, `back_001.ogg` | Kenney (www.kenney.nl) | [Original archive notice](public/assets/licenses/kenney-interface-License.txt) | https://opengameart.org/content/interface-sounds |
| `public/assets/audio/ember/fantasy-magic-button-1.mp3` | Almitory | [Item-page CC0 evidence](public/assets/licenses/source-evidence.md) | https://opengameart.org/content/fantasy-magic-spell — renamed from `fantasy_magic_button_1.mp3` |
| `public/assets/audio/music/cathedral-in-the-forest.ogg` | congusbongus | [Item-page CC0 evidence](public/assets/licenses/source-evidence.md) | https://opengameart.org/content/cathedral-in-the-forest-ambient-loop — renamed from `forest_2_0.ogg` |

The ambient loop is a single mixed bed, not calm/tense stems. Original `top-down-fantasy-1.ogg` remains excluded pending explicit terms. This section complements the independent license-review work in PR #10 and does not supersede its restrictions.
