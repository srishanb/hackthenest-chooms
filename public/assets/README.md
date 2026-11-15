# Lighten Up asset inventory

Owner: Neil Pawar. P8.1 prepares files; it does not change the game/audio loaders.

## Integration status

This README began as a P8.1 handoff, when every media file was prepared but not wired. As of Sun 15 Nov the game loads the forest art and the local music, sound effects and narrator clips (see `src/game/forest/textures.ts` and `src/audio/asset-list.ts`); the handoff notes below describe the original plan. `inventory.json` records exact paths (relative to this folder), authors, source URLs, CC0 license evidence, file sizes, SHA-256 hashes, PNG dimensions and Ogg durations. Runtime URLs start with `assets/`; use the project's relative base rather than a CDN or a hard-coded hostname.

### Art handoff: Ali

| Path under `art/cold-corridors/` | Dimensions | Suggested role |
|---|---|---|
| back.png | 32 x 224 | Back layer; repeat horizontally |
| far.png | 32 x 224 | Distant parallax layer |
| middle.png | 80 x 224 | Mid-distance parallax layer |
| near.png | 224 x 224 | Near scenery |
| foreground.png | 224 x 224 | Foreground decoration; never hide reachable edges |
| tileset.png | 48 x 42 | Terrain atlas; inspect tile boundaries before slicing |
| torch-sheet.png | 128 x 32 | Four 32 x 32 frames in one row; suggested decorative flame |

These are the original PNGs with unchanged pixels. The publisher describes a 240-pixel scene, but these actual layers are 224 pixels tall: use measured dimensions. Do not infer tile cell sizes from the atlas dimensions. Keep pixel-art sampling crisp. Lantern/gameplay visibility rules remain binding.

The torch is decorative artwork, not a complete player character. Character animation is not supplied by this pack. Loader changes and scene placement belong to Ali; content data should be passed through the composition root, not imported across lanes.

### Audio handoff: Amrit

- `audio/footsteps/01-footstep.ogg` through `06-footstep.ogg`: alternate short stone-like walking cues; avoid overlapping playback each frame.
- `audio/interface/click_001.ogg`: menu navigation.
- `audio/interface/confirmation_001.ogg`: confirmation.
- `audio/interface/back_001.ogg`: back/cancel.
- `audio/ember/fantasy-magic-button-1.mp3`: recovery activation candidate. MP3 duration has not been measured.
- `audio/music/cathedral-in-the-forest.ogg`: 136.974-second ambient loop by congusbongus, a license-verified replacement candidate for the unverified standalone fantasy track.
- `audio/music/insistent.ogg`: 128.693-second dark loop by yd (CC0), the tense layer the music crossfades to as the signal rises. Level-matched in code (`MUSIC_LEVEL_TRIM`); the two loops are different lengths and are not tempo-synchronised, which is fine for an equal-power crossfade of ambient beds.

All audio files are original bytes, with descriptive renaming only. The ambient loop is one mixed track, **not synchronized calm/tense stems**. Adaptive layered music remains an audio-lane follow-up; do not represent this pack as completing it. Loop seams, subjective volume balance, MP3 decoding and in-game playback still need a listening pass. Do not turn footsteps/UI sounds into looping tracks.

## License evidence

- `licenses/cold-corridors-CC0.pdf`: original license from the separate Cold Corridors art ZIP.
- `licenses/kenney-interface-License.txt`: original notice from Kenney's Interface Sounds ZIP.
- `licenses/source-evidence.md`: item-page CC0 evidence for footsteps, ember and ambient loop.
- `CREDITS.md` at repository root maps every shipped path to its author and source.

Excluded: all Godot reference-project files, the unverified `top-down-fantasy-1.ogg`, source editor files, archive metadata, promotional PDFs, and unselected audio packs. PR #10 remains the separate license review; its files are not overwritten here.
