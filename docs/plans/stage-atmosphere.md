# Stage atmosphere implementation

Neil explicitly requested implementation after the planning document, then simplified scope: automatic stage visuals rather than new weather sliders. Local commits only; no pushes/PR/publication. Based on main 2042e84 (Ali's five stages).

## Scope
Preserve Ancient/Dark identity, physics and corruption engine. Replace wrapping complete forest images with continuous bark columns and finite canopy clusters. Add selected local weather sheets and winter platform/prop assets. Reuse stageWeatherAt for automatic wind/snow. Keep existing public corruption preview unchanged. No glitch.

Order requested by Neil: tutorial, normal forest, windy, snowy, combined. Swap the authored windy/snow stage blocks and their firstY anchors only; preserve their ledge arrays, rise, ice and wind settings. This is an explicit narrow content-order change, not a geometry redesign.

## Interfaces
ForestWorld.setEnvironment accepts renderer-only VisualEnvironment. world-view samples existing height-dependent stageWeatherAt and forwards its snow01/wind01. createAtmosphere owns three fixed TileSprite overlays (snow/leaves/fog) and one subtle winter-grade rectangle. Corruption remains frame.forestCorruption; weather colors blend continuously with it. No new signal fields, detector, store or physics inputs. Appearance strength uses existing setting; pause/reduced motion freeze overlay animation/drift. Enabled appearance fades with a 700ms time constant. No new UI controls.

Vertical background uses two parallax layers of seven continuous trunks and five canopy slots. Trunk-loop pixels derive from Ancient trees-2 x176..239, y148..223, followed by reflected rows, yielding identical top/bottom RGBA endpoints; horizontal alpha feather avoids rectangular crop boundaries. Finite canopy derives from source x0..415,y0..143 with feathered edges. Whole scenes/crowns no longer vertically tile. Stable chunk IDs and seed-based canopy anchors reproduce on descent. Altitude gradually opens the forest; sky covers viewport. This fixes whole-image resets, but a small bark strip still repeats its texture and cannot provide hand-authored infinite variety. Readability and same pixel scale retained.

Asset register: environment-assets.config maps forest/winter skins. Snow stages select snowy dirt left/mid/right repeated skins and fir/ice-crystal props; each authored platform retains exact boxes. One decoration pair per ledge keeps every stage within existing 72-pair budget.

## Validation
Typecheck/tests/build, five-stage reachability, pixel equality at trunk loop join. Browser QA uses ordinary controls and explicit DEV forestHeight query to offset background and weather sampling only; it never moves the camera or player or changes stage progression. Thus HUD remains Tutorial in offset screenshots. Production excludes the height override. Capture spawn, wind/snow/combined, multiple heights and corruption extrema, reduced motion/settings, errors/FPS. No claim of full live traversal or hardware validation.

Human tasks still open: demo-laptop full traversal and live sensor session (team), neither blocks local renderer work. Required report records actual results. No push until Neil resumes it.