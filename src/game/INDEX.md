# src/game — public exports

Owner: Ali. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `Stores.worldView` (optional shared stream) | `scenes/climb-scene.ts` | Publishes the camera after rendering for world-aligned UI; never changes movement. |
| `layoutStorageKey(stages)` | `editor/layouts.ts` | Scopes browser previews to the bundled team layout so merged updates are visible. |
| `createGame(deps)` | `index.ts` | Creates the Phaser game. Everything it needs arrives in `GameDeps`. |
| `createWaxRewards`, `makeWaxDrops`, `WaxDrop`, `WAX_STORAGE_KEY` | `wax/rewards.ts` | Uncapped replenishing wax, one active drop, random respawn delay, bounded save state, temporary light bonus and pause/airborne stability. |
| `createWaxView` | `wax/view.ts` | Code-drawn wax droplets, reduced-motion-aware hover and pickup pulses. |
| `createKeyboardInput` | `keyboard-input.ts` | A/D and arrow movement, Space/Up jump, live remaps and buffered jump taps. |
| `BootScene`, `BOOT_SCENE_KEY`, `CLIMB_SCENE_KEY` | `scenes/boot-scene.ts` | First scene; P8 loads assets here. |
| `ClimbScene` | `scenes/climb-scene.ts` | Draws the world, runs fixed-step `stepPlayer`, emits `jump` and `precision_window`, feeds the darkness layer. |
| `stepPlayer`, `createPlayer`, `teleportPlayer` | `player/movement.ts` | Pure fixed-step physics: gravity, walk, charge jump, ascent steering, descent-only horizontal acceleration and bounded edge recovery, one-way platforms, side walls. Never reads the signal. |
| `charge01`, `launchVelocity`, `steeredVx` | `player/charge-jump.ts` | Charge and launch maths, air-steering cap. |
| `findLanding`, `findSupport`, `overlapsX`, `clampToWalls` | `player/collide.ts` | Swept one-way landing and wall clamp. |
| `sectionAt`, `lowestPlatformY` | `world/bounds.ts` | Which section a height belongs to (derived from platforms). |
| `landingEvents` | `world/fall-tracker.ts` | A landing becomes `land`, and past `minFallPxToOffer` also `fall { heightPx, big }`. Never resets or kills. |
| `bodyInArea`, `findFinish`, `altitude01` | `world/finish.ts` | Legacy draft area helpers and altitude to the final stage ledge. Runtime completion uses landing events. |
| `createPhaseController`, `PhaseController` | `world/phase-controller.ts` | Pause/resume (restores the earlier phase) and one-time finish; stepping only while `'playing'`. |
| `writeSnapshot`, `SnapshotPatch` | `scenes/snapshot-writer.ts` | Publishes `sectionId`, `altitude01` (the refuge controller owns `inRefuge`) only when a field changes. |
| `PlayerInput`, `PlayerState`, `PlatformBox`, `StepEvents` | `player/types.ts` | Plain data shared with the level checker (P4.2). |
| `targetFor`, `stepEffect`, `stepEffects`, `neutralFrame`, `EffectInput` | `effects/effects-engine.ts` | Pure maths: signal → capped, smoothed effect values. |
| `createDarkness`, `updateDarkness`, `minCoveringRadius` | `effects/darkness.ts` | The darkness sheet with a soft light hole (P0 spike). |
| `reachableLedges`, `outlineSegments`, `WorldBounds`, `Segment` | `world/reachable-ledges.ts` | Higher ledges a sampled real jump lands on (LAN-3), and the outline segments to draw. No signal. |
| `createCandleGenome`, `seededRandom`, `pickCandleSeed` | `candle/candle-genome.ts` | Seeded candle shape, colours, drips and flame rhythm; new seed each run, `?candleSeed=` in dev. |
| `stepPose`, `poseFrame`, `bodyShape`, `POSE_TIMING` | `candle/candle-pose.ts` | Ruby-matched pose choice and frame timing, plus how the body squashes and stretches. |
| `rasterCandle`, `grownSize` | `candle/candle-raster.ts` | Candle body, outline, drips and wick as art pixels. |
| `rasterFlame`, `flameHeight`, `flameSizeFromRadius`, `fallIntensity`, `flickerRate`, `OXIDISED` | `candle/flame.ts` | Procedural pixel flame sized by the light radius, flickering at 12 fps (none under reduced motion); while falling it flickers faster, stretches, turns blue at the base and sheds licks. |
| `waxGrowth`, `grownMovement` | `candle/growth.ts` | +2% size per wax; walk x growth, launch speeds x sqrt(growth). Wax count only, never the signal. |
| `groundShadow`, `GroundShadow`, `SHADOW_REACH_PX` | `candle/ground-shadow.ts` | The candle's shadow on the ledge straight below: largest when standing, smaller and fainter with height. |
| `coldBreath`, `BREATH_EVERY_MS`, `BREATH_MS`, `CandleLook.cold` | `candle/emotes.ts`, `candle/candle-view.ts` | A puff of breath in the snow. |
| `RARE_FLAME_ONE_IN` | `candle/candle-genome.ts` | About one candle in twelve burns with a blue, green or violet flame. |
| `flowNote`, `NOTE_EVERY_MS`, `NOTE_MS`, `CandleLook.flow`, `ExpressionInput.flow` | `candle/emotes.ts`, `candle/candle-view.ts`, `candle/expression.ts` | After four clean jumps in a row the candle hums: a note floats beside the flame and its cheeks colour. |
| `fullChargeTremble` | `candle/direction-cues.ts` | A one-pixel tremble at full charge, so the cap is visible. |
| `flameLean`, `wickLean`, `flightSparks`, `CueInput` | `candle/direction-cues.ts` | Jump-direction cues: aim lean while charging, trailing flame and sparks in flight; never bends the body. |
| `rasterPortrait`, `isGuttered`, `PORTRAIT_RADIUS` | `candle/portrait.ts` | Close-up of the player's candle by light strength: dims, staggers, smokes and gutters out near death. |
| `createPortraitView` | `candle/portrait-view.ts` | Draws the portrait in a gold-rimmed circle fixed at the bottom left (replaces the lantern strength bar). |
| `waxBallPixels`, `mountWaxBall`, `BALL_W`, `BALL_H` | `candle/wax-ball.ts` | Flaming wax ball for the compass centre (candle colours; tall flame while an ember is placed). Handed to the HUD by main.ts. |
| `createCandleView` | `candle/candle-view.ts` | Draws the candle in the scene (replaces the Ruby sprite view). |
| `createProtectedVisibility` | `effects/protected-visibility.ts` | Outline layer above the darkness: the ledge underfoot and reachable ledges' top edges, faded out at the edge of the light; cached per ledge. |
| `fadeAlpha`, `fadeSegments`, `FADE_START_FACTOR`, `FADE_END_FACTOR` | `effects/outline-fade.ts` | Outline alpha from distance to the lantern: full inside the radius, gone at 1.5x. |
| `createRefugeController` | `world/refuge.ts` | Rest-area entry/exit only. No automatic saves, markers or ember refills. |
| `createRecoveryEmber` | `ember/recovery.ts` | One manually placed reusable ember: E placement/pickup, unlimited R recovery, valid-time gate and labelled rescue. `restartAtAnchor()` handles the paused checkpoint action without consuming wax/anchor or resetting cooldown; cooldown freezes in pause/menu. |
| `parseSave`, `serializeSave`, `loadSave`, `writeSave`, `clearSave`, `createMemorySaveStorage`, `SAVE_KEY`, `EmberAnchor` | `save.ts` | Manual-anchor v2 persistence; old automatic-checkpoint saves are ignored. |
| `loadSections`, `LoadedWorld`, `WORLD_TOP_MARGIN_PX` | `world/section-loader.ts` | Validate IDs, geometry, types, floor and zones before play or reachability checks. |
| `getPlatformType`, `PlatformType` | `world/platform-types/registry.ts` | Platform capabilities, including whether a surface is a safe stationary anchor. |
| `STATIC_PLATFORM` | `world/platform-types/static.ts` | Stationary-platform capabilities. |
| `drawWorld` | `world/world-view.ts` | Render validated collision geometry and authored zones. |
| `platformsAt`, `windAt` | `world/environment.ts` | Deterministic moving-platform positions/deltas and local gusts, shared with the level checker. |
| `createStageProgress` | `world/stage-progress.ts` | Ordered one-time final-platform landings, resume at a manual ember and reset for a new run. No player movement or scene reloads. |
| `stageWeatherAt`, `lessonAt` | `world/stage-weather.ts` | Gradual biome presentation by height and original tutorial hints by ledge height. |

`tools/levels/check-levels.ts` runs `checkReachability` from `tools/levels/reach.ts` using the same `stepPlayer` as gameplay.
Recovery keeps a marker placed after each return. Pickup is required before placing it elsewhere.

## Forest presentation exports

| Export | File | What it does |
|---|---|---|
| `preloadForest`, forest texture mappings | `forest/textures.ts` | Boot-only local image and Ruby sheet loading. |
| `createForestWorld` | `forest/forest-world.ts` | Decorative scenery, platform skins and bounded particles; no collision writes. |
| `createRubyView` | `forest/ruby-view.ts` | Legacy: the Ruby sprite view. No longer used by the scene; `createCandleView` replaced it. |
| `stepForestEffects` | `forest/forest-effects.ts` | Existing engine plus optional visual-only forest field preview. |
| `stableUnit`, `reveal`, `mixColor`, `fitPropScale` | `forest/presentation.ts` | Deterministic seeds, continuous visual mapping, corrupted-prop scale fitting. |
| `createAtmosphere` | `forest/atmosphere.ts` | Weather and corruption atmosphere; renderer-only. |
| `createVerticalForest` | `forest/vertical-forest.ts` | Continuous background composition by height (layout helpers in `forest/vertical-layout.ts`). |
| `createBackdropGardens` | `forest/backdrop-gardens.ts` | Pooled, seeded, non-collidable parallax garden ledges. |
| `createCorruptionScreen`, `createCorruptionFilter` | `forest/corruption-screen.ts`, `forest/corruption-filter.ts` | Bounded visual-only corruption motion and Phaser filter. |
| `createLanternFuel`, `burnFuel` | `forest/lantern-fuel.ts` | Candle fuel: drains with playing time, refilled by wax, scales light radius only. |

Atmosphere: createAtmosphere (forest/atmosphere.ts) consumes existing corruption and renderer-only stage weather; createVerticalForest and vertical-layout helpers provide bounded continuous background composition. ForestWorld.setEnvironment is the level integration point; no signal/physics import.

createBackdropGardens (forest/backdrop-gardens.ts): five pooled, seeded non-collidable parallax garden ledges; no physics or bright landing rims.

fitPropScale (forest/presentation.ts) fits corrupted decorations to their partner's displayed height with a 48 px cap, preventing oversized winter crystals.

createCorruptionScreen / createCorruptionFilter (forest/): bounded high-corruption visual-only motion/filter. createLanternFuel / burnFuel (forest/lantern-fuel.ts): actual playing-time resource with wax refill and held airborne light radius; never reads preview values.

Stage authoring: `createStageCanvas` (`editor/canvas.ts`) reuses the forest/platform renderer with draggable handles. `readLayouts`, `writeLayouts`, `validateLayouts` (`editor/layouts.ts`) validate browser-local overrides with the existing section loader.

Wax reward update/lightRadius accept optional benefit01 (default 1); real corruption suppresses benefit via waxBenefit01 in config/lantern-fuel.config.ts, while counts/respawns persist.

createLandingPuff (forest/landing-puff.ts): bounded landing-only soil/snow flecks, paused with game and disabled by Reduced Motion.

## Helpers and types not listed above

| Export | File | What it does |
|---|---|---|
| `platformTop(platform)` | `player/collide.ts` | Y of a platform's top surface. |
| `ClimbSceneDeps` | `scenes/climb-scene.ts` | What `ClimbScene` receives from `createGame`. |
| `ProtectedVisibility` | `effects/protected-visibility.ts` | Type returned by `createProtectedVisibility`. |
| `PIECE_PX`, `FadedPiece` | `effects/outline-fade.ts` | Length in px of one faded outline piece, and its type. |
| `SaveStorage`, `SavedProgress` | `save.ts` | Storage shape used by the save functions, and the saved progress record. |
| `STAGE_LAYOUT_KEY`, `STAGE_DRAFT_KEY` | `editor/layouts.ts` | Browser storage keys for stage layout overrides and the editor draft. |
| `createCandleLighting` | `forest/candle-lighting.ts` | Faint candle halo and soft falloff, even at full fuel. Visual only. |
| `fuelVisibilityRadius` | `forest/fuel-visibility.ts` | Fuel-driven sight radius; only corruption narrows it. |
| `FOREST_IMAGES`, `RUBY_FRAMES` | `forest/textures.ts` | Texture key to file map and Ruby sheet frame counts for boot loading. |
| `wrap`, `visibleChunks`, `crownLayout` | `forest/vertical-layout.ts` | Stable background chunk layout that works scrolling either way. |
| `emblemMoment`, `emblemPixels`, `mountCandleEmblem`, `EMBLEM_W`, `EMBLEM_H`, `EmblemPixel` | `candle/emblem.ts` | Animated menu candle emblem; `main.ts` hands `mountCandleEmblem` to the UI as a callback. |
| `CandleGenome`, `Drip`, `scaleColor` | `candle/candle-genome.ts` | Genome types and RGB channel scaling. |
| `Pixel`, `CandleRaster` | `candle/candle-raster.ts` | Art-pixel types for the candle raster. |
| `CandlePoseName`, `PoseInput`, `PoseTracker`, `INITIAL_POSE`, `BodyShape` | `candle/candle-pose.ts` | Pose types, starting pose and body squash shape. |
| `Aim` | `candle/direction-cues.ts` | Jump aim direction: -1, 0 or 1. |
| `FLAME_FPS`, `FLAME_MIN_HEIGHT`, `FLAME_MAX_HEIGHT`, `FlameInput` | `candle/flame.ts` | Flame frame rate, height bounds and input type. |
| `BallPixel` | `candle/wax-ball.ts` | Pixel type for the wax ball. |
| `Portrait`, `PortraitPixel`, `PortraitInput`, `SMOKE_BELOW`, `GUTTER_BELOW`, `BLUE_BELOW` | `candle/portrait.ts` | Portrait types and the light-strength thresholds for smoke, guttering and blue flame. |
| `PortraitLook` | `candle/portrait-view.ts` | Input type of the portrait view. |
| `CandleLook` | `candle/candle-view.ts` | Light, growth and settings the candle draws from each frame. |

## Endless mode (game-only variant)

| Export | File | What it does |
|---|---|---|
| `EndlessScene`, `EndlessSceneDeps` | `scenes/endless-scene.ts` | The generated climb: same input, `stepPlayer`, candle and forest as the climb scene, on streamed chunks. Fuel ends the run; no signal. |
| `traceArc`, `buildArcTable`, `descentAt`, `launch`, `standOn`, `chargeStepsFor`, `JumpArc`, `ArcPoint` | `endless/jump-arcs.ts` | Sample jump arcs traced with the real `stepPlayer`; the generator places ledges under them. |
| `createEndlessGenerator`, `replayStep`, `difficultyAt`, `EndlessChunk`, `RouteStep`, `WaxSpot`, `EndlessGenerator` | `endless/generator.ts` | Seeded, random-access chunks, each starting on an anchor ledge (`floor(index)`; only chunk 0's is full width). Every ledge is reachable by construction and its jump is replayed before it is kept. |
| `EndlessChunk.sideRoute`, `WaxSpot.ledgeId`, `WaxSpot.ledgeX` | `endless/generator.ts` | The jump to each optional side ledge; wax on a moving side ledge knows which ledge it rides. |
| `createChunkStream`, `ChunkStream`, `StreamChange` | `endless/chunk-stream.ts` | Keeps a fixed window of chunks alive around the player, always including the chunk below and every chunk a fast fall can reach before the next update. |
| `freshFlame`, `stepFlame`, `addWax`, `burnPerSecond`, `isLit`, `FlameState` | `endless/flame-fuel.ts` | Fuel burns with time, wax refills it, a grace time before the run ends. |
| `moodIntensity` | `endless/mood.ts` | Composure and fuel to the 0..1 intensity fed to the effects table (the mood follows the candle). |
| `steadyComposure`, `shake`, `steady`, `stepComposure`, `isSteadying`, `fallShake`, `burnScale`, `Composure` | `endless/composure.ts` | The candle's composure from play: falls shake it, standing still steadies it; drives the forest's corruption and a faster burn. Never movement. |
| `createEndlessWax` | `endless/endless-wax.ts` | One-time wax pickups at generated spots; same snapshot field and bus event as the classic wax. |
| `createWaxDropsView` | `endless/wax-drops-view.ts` | Draws the live wax drops; marks come and go with the chunks. |
| `createRunScore`, `RunScore`, `rememberSeededBest`, `SEEDED_BESTS_KEPT` | `endless/run-score.ts` | Height of the run (ledges stood on) and the best height on this device; seeded climbs keep their own best, the latest 30 of them. |
| `biomeOf`, `snowAt`, `chunkOfPlatform`, `Biome` | `endless/biome.ts` | Forest and snow bands by height: platform skin per chunk and snowfall that fades in and out. Presentation only. |
| `nightAt`, `sightRadius`, `candleRadius`, `nightShadowAlpha` | `endless/night.ts` | Night falls with height; in the dark the view is the candle's own circle, sized by its fuel. Presentation only. |
| `createRouteBot` | `endless/route-bot.ts` | Development-only player that follows the generated route (`?bot=1`), for automated browser checks. |
| `ForestWorld.addPlatform`, `ForestWorld.removePlatform` | `forest/forest-world.ts` | Platform art added and removed while playing. |

## Candle expression

| Export | File | What it does |
|---|---|---|
| `stepExpression`, `faceFor`, `isBlinking`, `idleGlance`, `INITIAL_EXPRESSION`, `EXPRESSION_TIMING`, `CandleMood`, `CandleFace`, `EyeShape`, `MouthShape`, `ExpressionInput`, `ExpressionEvents`, `ExpressionTracker` | `candle/expression.ts` | One mood at a time from the body's state and short events (wax, hard landing, new best); seeded blink and glance. Pure, visual only. |
| `ExpressionEvents.relit`, mood `relieved`, `createCandleView().relit()` | `candle/expression.ts`, `candle/candle-view.ts` | Wax that relights a glowing wick: a breath out with the eyes shut, then a grateful smile, with a puff of breath beside the flame. |
| `surroundings`, `AWARENESS`, `Surroundings`, `LookTarget` | `candle/awareness.ts` | What the candle notices: the nearest wax in reach, the edge of its ledge, ice underfoot. The eyes follow it; mood `uneasy` while sliding. |
| `idleLookUp` | `candle/expression.ts` | An idle candle looks up at its own flame now and then. |
| `EMBLEM_LOOP_MS`, `EmblemMoment` | `candle/emblem.ts` | The menu candle waits, gathers, hops, lands and looks pleased, on a 5.2 s loop. |
| `SWIRL_ONE_IN`, `createCandleView().melting()`, `CloseUpInput.melt01`, `.bead01` | `candle/candle-genome.ts`, `candle/candle-view.ts`, `candle/close-up.ts` | The rare swirl candle's odds; the portrait shows the hero's melted drips and running bead. |
| `CandleGenome.trait`, `CandleTrait` | `candle/candle-genome.ts` | One distinguishing trait per candle: a coloured band, a dipped base, a tuft of wax, the rare swirl, or none. Drawn by the hero raster and the close-up. |
| `createCandleView().reactions()`, `CloseUpInput.flame` | `candle/candle-view.ts`, `candle/close-up.ts` | The portrait's flame leaps, ducks and gathers with the hero's. |
| `mountRunCandle`, `spentCandle` | `candle/run-candle.ts` | The finished run's candle, flame out, for the end screen; main.ts hands `mountRunCandle` to the UI. |
| `facePixels`, `FaceBox` | `candle/face.ts` | Eyes, mouth, blush and a bead of wax as art pixels on the body. |
| `BodyLook` | `candle/candle-raster.ts` | Optional face and flame glow for `rasterCandle` (rounded shoulders, melt pool, four tones, drip beads are always drawn). |
| `createCandleView().cheer()`, `.celebrate()`, `.face()` | `candle/candle-view.ts` | The scene reports wax and a new best; the portrait reads the current face. |
| `CandleGenome.face` | `candle/candle-genome.ts` | Per-candle features: eye row, eye and mouth colour, rosy cheeks. |

| `landingDroplets`, `DROPLET_MS` | `candle/emotes.ts` | Beads of wax knocked off by a hard landing. |
| `emotePixels`, `EMOTE_MS` | `candle/emotes.ts` | Pixel signs beside the flame for strong moments: sparkles, an exclamation mark, stars, a flying bead, z's. |
| `slumpShape`, `CandleLook.spent01`, `ExpressionInput.spent` | `candle/candle-pose.ts`, `candle/candle-view.ts`, `candle/expression.ts` | The last moment of a run: the spent candle sinks a little and its eyes close while the scene's veil darkens the world. |
| `landingImpact` | `candle/candle-pose.ts` | 0..1 how hard a landing was; the landing squash and the flame's duck scale with it. |
| `wickSmoke`, `FlameInput.flare01`, `.duck01`, `.gather01` | `candle/flame.ts` | Smoke off a dead wick; the flame leaps on a happy moment, is pressed down by a landing and gathers on a charge. |
| `BodyLook.melt01`, `BodyLook.bead01`, `CandleLook.melt01` | `candle/candle-raster.ts`, `candle/candle-view.ts` | Drips grow as the candle burns through a run, and a bead of wax runs down the longest one now and then. |
| `NightLight` (wax beacons) | `endless/wax-drops-view.ts` | At night wax glows a little beyond the edge of the light. |
| `BodyLook.warmth01` | `candle/candle-raster.ts` | The wax dims and turns bluish as the fuel runs out. |

| `rasterCloseUp`, `CLOSE_UP_RADIUS`, `CloseUpInput` | `candle/close-up.ts` | The portrait's detailed bust: the same candle at three times the resolution, with eyes that glint, lids, brows, teeth, cheeks and a bead of wax. Follows portrait.ts's light rules. |
| `FlameInput.scale` | `candle/flame.ts` | Draws the flame larger for the close-up. |

`createPortraitView` now paints the close-up into a canvas texture only when the picture changes.
`__tests__/candle-close-up.html` draws the close-up for every mood. `__tests__/candle-faces.html` is a dev page that draws every mood for six seeds.

| `stepBird`, `birdFrame`, `perchedBird`, `isAirborne`, `Bird`, `BirdAct` | `forest/bird-behaviour.ts` | What a bird on a ledge does: stands, pecks, chirps, looks around, and flies off when the candle comes near or the forest turns. Pure, decoration only. |
| `createPerchingBirds` | `forest/perching-birds.ts` | A pool of three bird sprites seated on ledges above the view. |
| `createAmbientLife` | `forest/ambient-life.ts` | A far flock now and then, fireflies and spores, single falling leaves that redden with corruption. |
| `createGrassTufts` | `forest/grass-tufts.ts` | Swaying grass on forest ledges; withers with corruption. |
| `ForestWorld.setCandle` | `forest/forest-world.ts` | The scenes tell the scenery where the candle is. Read by the birds only. |

Far garden ledges (`forest/backdrop-gardens.ts`) now sometimes spill a waterfall, which freezes in the snow.

## Generated backdrop (`backdrop/`)

The forest behind the endless climb is painted from the run's seed. `__tests__/backdrop-gallery.html` is a dev page
that shows it at several heights (`?seed=`, `?heights=`, `?zoom=`, `?layer=`).

| Export | File | What it does |
|---|---|---|
| `TONE`, `TONE_COUNT`, `PixelGrid`, `createGrid`, `put`, `hash`, `noise1`, `subSeed` | `backdrop/pixel-grid.ts` | A grid of colour slots to paint into, and repeatable seeded numbers. |
| `paintClump`, `paintLimb`, `paintBroadleaf`, `paintPine`, `paintMushroom`, `paintIsland`, `Surface` | `backdrop/shapes.ts` | The pieces: leaves, limbs, three kinds of tree and a floating island, as pixel art from a seed. |
| `paintChunk`, `trunkLanes`, `ChunkRequest`, `BackdropBiome`, `TrunkLane` | `backdrop/paint-chunk.ts` | One chunk of one layer: full-height trunks, islands with trees, branches and vines, the forest floor. Chunks join exactly. |
| `colourChunk` | `backdrop/palette.ts` | Slots to colours, row by row: the flavour's palette mixed toward the cold one by height, then toward the sky by the layer's fog. |
| `createBackdrop`, `BackdropSource` | `backdrop/backdrop-view.ts` | Keeps a few painted chunks per layer on canvas textures and scrolls them with the camera. |
| `backdropBiomeAt`, `flavourOfBand` | `endless/backdrop-biome.ts` | How cold a height is (smooth, following the snow bands) and each forest band's seeded flavour. |
| `createForestWorld(scene, world, backdrop?)`, `ForestWorld.reseedBackdrop` | `forest/forest-world.ts` | With a `backdrop` the generated forest replaces the repeating trunks and far garden ledges. |

