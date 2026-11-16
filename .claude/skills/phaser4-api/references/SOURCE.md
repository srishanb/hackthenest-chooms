# Source of these reference files

| | |
|---|---|
| Repository | https://github.com/phaserjs/phaser |
| Folder | `skills/` |
| Commit | `02d8931b626d9764c133cbb3fbf99966c03c757c` (Phaser 4.2.1) |
| Fetched | 2026-11-16 |
| Licence | MIT, Copyright (c) 2026 Richard Davey, Phaser Studio Inc. (`LICENSE.md`, the upstream `LICENSE.md` unchanged) |
| Shipped in the game | No. Developer reference for agents only; nothing here is imported or bundled |

All 28 upstream skill folders are copied as they are, with these changes only:

1. Each folder's `SKILL.md` is renamed to `README.md`, so Claude Code does not register 28 extra
   skills. The `phaser4-api` skill (`../SKILL.md`) is the single entry point and routes to them.
   The YAML front matter at the top of each `README.md` is kept as upstream wrote it.
2. Every reference to `SKILL.md` inside these files now says `README.md`, so the cross-links between
   topics (`../scenes/README.md` and so on) still resolve.
3. Two links that were already broken upstream, `references/REFERENCE..//SKILL.md` in
   `cameras/README.md` and `sprites-and-images/README.md`, now point to `references/REFERENCE.md`.

To update: fetch the upstream `skills/` folder at the commit that matches the Phaser version in
`package.json`, repeat the three steps, and update this file and the row in `CREDITS.md`.
