# After-job report: lighting pass (candle glow and colour grade)

- Agent: claude
- Branch and PR: claude/peaceful-albattani-sif53x, https://github.com/srishanb/lighten-up/pull/152
- Phase and plan: not a queue task; requested by Srishan in chat. Short plan is in the PR body (no plan file).
- Started and finished: 15:45 to 16:20 Eastern, 16 Nov 2026

## 1. What I believe is complete

| Acceptance test (from the PR plan) | Result | Confidence |
|---|---|---|
| Candle halo blends additively so it lights the scenery | Pass | High |
| One-pass colour grade camera filter, config-driven, can be switched off | Pass | High |
| `npm run check` and `npm run build` pass | Pass | High |
| Before/after screenshots | Pass (endless scene only) | Medium |
| Draw calls and JS time measured before and after | Pass | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Types and tests | `npm run check` | 96 files, 676 tests pass (includes the new color-grade test) |
| Build | `npm run build` | builds |
| Draw calls | Playwright + wrapped WebGL calls, 60 frames, headless Chromium (SwiftShader) | 54 off -> 56 on per frame |
| JS cost | CDP profiler, 5 s of walking, 3 runs each | bundle JS 5.5/7.4/6.8 ms off vs 6.1/7.6/6.4 ms on: within noise |
| Look | screenshots `docs/screenshots/lighting/grade-off.png`, `grade-on.png` | warm halo around the candle, cooler shadows, darker corners; HUD and ledges stay readable |

**Not verified:** a real GPU (only SwiftShader), the classic climb scene (`?climb=classic`) in a screenshot, the corruption state with the grade on top, mobile, the canvas renderer fallback (code returns null there).

## 3. Problems, workarounds and dead ends

- Phaser's `RenderNodeManager.addNodeConstructor` throws if a name is registered twice. Guarded with `hasNode`. `corruption-filter.ts` has no such guard; harmless today because no scene restarts, but it would throw on a future `scene.restart()`.
- The first values were too subtle to justify a full-screen pass; raised them once (see config).
- Performance: profiled before starting. The game's own code is about 2.6% of frame time and the main thread is about 86% idle, so I made no speed-only changes.

## 4. Deviations from the plan

- Also raised `FUEL_VISIBILITY_CONFIG.normalGlowAlpha` 0.12 -> 0.3 so the additive halo is visible.

## 5. Changes

- Files changed: `src/game/forest/color-grade.ts` (new), `src/config/color-grade.config.ts` (new), `src/game/forest/forest-world.ts` (creates the grade), `src/game/forest/candle-lighting.ts` (ADD blend), `src/config/fuel-visibility.config.ts` (glow alpha), `src/game/__tests__/color-grade.test.ts` (new), both `INDEX.md` files, screenshots.
- Contract or config-schema changes requested: None
- New dependencies requested: None
- Edits outside my lane: game lane (Ali) and a config value; requested by Srishan.
- `INDEX.md` updated for new exports: yes

## 6. Follow-ups and questions for humans

- [ ] Ali or Srishan: tune the grade numbers on a real screen; set `enabled: false` to compare.
- [ ] Game-only session: the pixel-grid (integer scaling) idea was sent there; the grade works the same at any internal resolution.

## 7. Can a teammate explain this?

After the whole scene is drawn, one small shader pass nudges dark colours toward blue and bright colours toward gold and darkens the corners, so every part of the forest shares one mood. The candle's glow is now added light, so it brightens the leaves around it instead of covering them. None of it reads the signal or changes how the candle moves.
