# Terrain seams and lush decorations

Neil reported gaps between soil blocks and approved lush plants, hanging greenery and winter variety. Round column boundaries outward and overlap by1px to cover fractional rendering seams. Existing collision geometry unchanged. Add seeded3/4 plant clusters, raise bounded prop cap280, winter bush/crystal/stone/pine variety, hanging vines on moving/static platforms and pooled background gardens, five background plant slots. Uses two licensed Vol.4 sprites, credited in CREDITS; no new source pack/license. No shared contracts/dependencies/physics changes.

Acceptance: continuous soil cover, bounded deterministic decorations following moving platforms, seasonal background plants. Checks/build required. Manual browser visual/climb review not performed; subjective density and seams at different display scales remain for user review. Confidence high in overlapping geometry and static typing, medium in visual fit/performance until playtest. Hardware tasks don't block. Files: forest config, texture registry, forest-world, backdrop-gardens, two art files/CREDITS. No abandoned approach. Cross-lane renderer integration minimal.

Validation: TypeScript,483 tests/74 files and production build pass; existing Vite and pieeg.js warnings remain.
