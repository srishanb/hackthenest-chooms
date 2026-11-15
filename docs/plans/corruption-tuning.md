# Snow palette and stronger corruption tuning

Requested by Neil: fix green snow backgrounds; stronger light/wax penalties and screen effects; use selected Clastic Artistic abstract textures; merge completed own PRs. Physics remains unchanged under Neil's explicit prior choice. PR78 claims the task. Existing PR76/77 already merged; no other open PR authored by Neil at pre-code inspection.

Baseline origin/main d516124 includes candle portrait. No duplicate fuel/weather system. Renderer reuses existing stage snow01 and forestCorruption; resource penalties use actual valid intensity, never the manual visual override.

Snow: grayscale/blue derivative of Ancient trunk-loop with exact original alpha/seam; paired trunk layers crossfade at the same anchors. Fully fade green canopy at full snow; pine crowns, sky, fog/leaves and spores use cold palettes. No additional biome/generation system.

Corruption: wax benefit smoothstep1→0 between actual intensity0.6 and0.95; full corruption grants no refill or temporary radius boost, but pickup count and respawn still work. Existing boosts are canceled at full suppression. Honest HUD toast describes blocked wax. Fuel full-burn duration240s calm/45s corrupted; base radius further contracts to55% at high actual corruption, with60px emergency minimum and in-flight hold retained. Invalid/fixed stays neutral and wax works normally. Manual visual preview never consumes rewards or causes these penalties.

Visual caps: darkness sheet0.96 at full corruption; shake8px/220ms bursts every1200ms; line shifts5px,RGB2px,dark grain7%; distant soft bolt700ms every8s, no full-screen white flash. Pause/reduced motion/strength0 disable motion and bolts. Selected Clastic Artistic texture25 cropped/downsampled/pixelated into256x144 at max12% overlay alpha. Publisher/source README CC0 and no-generative-AI declaration verified. No full-resolution pack import.

Files: visual/fuel configs, vertical forest/weather/forest world/screen, wax rewards and minimal scene benefit plumbing, HUD string/toast, focused tests, selected assets/notices and own report/docs. No shared contract or dependency changes. Human tasks: full live board and demo-device run remain open; do not claim those.

Validation: check/build, resource and wax suppression regression checks, unchanged movement diff, cold palette alpha/seam audit, actual browser calm snow and full corruption. Assigned temporary PORT3019; user requested live preview, so keep the dev server/tab available for review. Publish ready PR after checks, merge completed own PR per Neil's explicit instruction without deleting branches or rewriting history.
Live review found the historical forestHeight QA query could separate snowy scenery from grassy actual platforms. Removed all three runtime override readers entirely. stageWeatherAt always samples actual playerY; parallax uses actual camera scroll. Added return/descent regression. Historic screenshots made with diagnostic offsets are labeled accordingly.
