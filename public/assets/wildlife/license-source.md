# Wildlife assets: licence and human-made evidence

Checked on 2026-11-16 by fetching each asset page and reading the downloaded archives. Every page below carries
itch.io's own content disclosure **"No generative AI was used"**, which AGENTS.md rule 5 asks for. Only the files
the game uses are in this folder (see `inventory.json` for names, sizes and SHA-256); all are unmodified copies.

| Files here | Pack and author | Page | Licence, as stated | Human-made evidence |
|---|---|---|---|---|
| `bird.png` | Bird, Small, by inmenus | https://inmenus.itch.io/bird-small | Page text: "CC0. Credit not required." | Page field: "Content: No generative AI was used" |
| `birb.png` | lil birb, by Casual Garage Coder | https://casual-garage-coder.itch.io/lil-birb | Page text: "CC0." | Page field: "Content: No generative AI was used" |
| `firefly.png`, `spore.png`, `leaf-green-1.png`, `leaf-green-2.png`, `leaf-autumn-orange-1.png`, `leaf-autumn-red-1.png` | Pixel Weather & Nature FX 1.0, by reodesuxz | https://reodesuxz.itch.io/free-pixel-weather-nature-fx-63-assets | Bundled `LICENSE.txt`, kept here as `reodesuxz-LICENSE.txt`: use and modification in personal and commercial projects, no attribution required; no reselling or redistributing the files as assets, no AI training | Page field: "Content: No generative AI was used" |
| `grass-1.png`, `grass-3.png`, `waterfall-top.png`, `waterfall-middle.png`, `waterfall-bottom.png` | Critters - Lazy River Tileset 1.0, commissioned from Baldur, distributed by Foozle | https://foozlecc.itch.io/critters-lazy-river | Bundled `Readme.txt`, kept here as `foozle-Readme.txt`: "License: (Creative Commons Zero, CC0)"; page field "Asset license: Creative Commons Zero v1.0 Universal" | Page field: "Content: No generative AI was used"; the readme names the commissioned artist |

Notes:

- The reodesuxz files are game resources of Lighten Up, not a pack distribution: six of the pack's 63 assets are
  here, renamed from `snake_case` to `kebab-case` with unchanged bytes.
- Sheet layouts. `bird.png`: 10 columns by 9 rows of 32 x 21 px; rows from the top are Death, Idle Hop, Idle Stand,
  Idle Peck, Chirp, Hop, Take Off, Fly/Flap, Land (from the page). `birb.png`: a 4 by 4 grid of 8 x 8 px; the flight
  cycle is cells 8, 9, 8, 7 (from the pack's `birb.json`). `grass-*.png`: 8 frames of 16 x 32 px.
  `waterfall-*.png`: 8 frames of 16 x 16 px.
- Runtime tint, opacity, scale and movement are applied by the game; the source pixels are not edited.
