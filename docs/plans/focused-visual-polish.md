# Focused visual polish (local only)

Neil requested implementation from the attached polish prompt, then clarified: skip additional biome systems; keep existing levels and add assets, including supplied Winter Forest for snow/ice and wind visuals. No push authorization. Work stays on existing local visuals branch to preserve current review build.

Priorities: integrate the existing corruption preview into Settings; improve wind readability with licensed weather assets; improve grassy platform surfaces/undersides; preserve composed Ancient forest. No physics, camera, levels, signal algorithm or ice mechanic changes.

Current selected new resources: CC0 Grassland from Multi Platformer Free (only Grassland is included). Exact local ReadMe preserved. Three 16x16 top crops at x0/16/32,y0 plus soil crop x16,y16 from Grassland_Terrain_47Tiles.png; Bush, Stone_1 and Cloud_1 native files. Repeated surfaces and a narrow inset decorative underside keep collision geometry intact; plant scale capped at48px. Existing winter registry remains until supplied Winter Forest license/source identified.

Wind uses existing licensed Willosuna leaves/fog, increased bounded opacity/drift, twelve sparse directional streaks and three softly blended Grassland clouds. Snow inherits visual wind direction, corruption tint and existing stage blending. No new weather UI.

Corruption: move the same mountForestPreview helper from collapsed source-badge details into the existing Settings dialog, with explicit Preview corruption label. Existing event/forestCorruption/strength/reduced-motion/neutral handling unchanged. Remove CSS hiding the control in its own modal. Honest source badge stays visible. No duplicated preview instances or shared schema additions.

Licensing: TinyForest, wind/W401 and supplied Winter Forest folders contain no notice in inspected inventory. Do not infer rights from similar pack names or search results. Ask Neil for original download-page links. Continue licensed work; do not copy unverified packs or fabricate author/license. Glitch remains excluded.

Acceptance: check/build; real Settings -> enable preview -> full corruption -> return -> restore sequence; inspect wind and Grassland in actual browser. Record screenshots, exact used assets and unresolved license dependencies. Commit locally only.
Updated source verification: Neil supplied https://kauzz.itch.io/kpwf and https://nyknck.itch.io/wind. Publisher permissions recorded in CREDITS/license-source files. Winter Forest selected Enviroment.png crops now replace snow-stage surfaces/plants and blend sparse pine crowns into the original background. Wind/W401 animation added alongside leaves/fog. TinyForest remains unused. Latest polish request: taper dirt underside into nine seeded stepped columns; exact landing surface/colliders stay unchanged. No new biome/generation system.

