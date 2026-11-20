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
| `bounceSpeed`, `BOUNCE_TYPE` | `player/bounce.ts` | Bounce caps (D-36): the launch speed from a landing speed. `stepPlayer` throws the candle instead of landing. |
| `updraftAt`, `updraftVy`, `updraftHolds`, `terminalVy` | `player/updraft.ts` | Updraft columns (D-36): half gravity while rising fast, a fall eased to the column's sink or rise speed; never catches a fall (`updraftHolds`, D-36a). |
| `stepCrumble`, `solidLedges`, `crumbleWarn01`, `NO_CRUMBLE`, `CRUMBLING_TYPE`, `CrumbleState` | `player/crumble.ts` | Crumbling ledges (D-36): per-ledge timers in the world, not the player; what is solid now. |
| `WALL_TYPE`, `wallsIn`, `wallBeside`, `touchingWall`, `blockX`, `bumpHead`, `gripHolds`, `slideVy`, `kickVelocity`, `isSliding` | `player/wall.ts` | Walls (D-37, prototype behind `?walls=1`): platforms of type `wall` with solid sides and underside; slide and kick rules, grip only within `gripBelowTakeoffPx` of the last takeoff or kick (never catches a fall). `StepEvents.wallKicked`, `PlayerState.kickWallId`, `wallLockMs` and `standBottomY` (where the candle last stood before its kicks; a landing's fall is measured from it) exist only in a world with walls. |
| `stepWorld`, `WorldStep` | `player/world-step.ts` | One step of the candle and the crumble timers, in that order; the endless scene and the route replay both call it. |
| `StepEnvironment`, `UpdraftBox` | `player/movement.ts`, `player/types.ts` | What `stepPlayer` gets besides ledges: wind and updraft columns. |
| `sectionAt`, `lowestPlatformY` | `world/bounds.ts` | Which section a height belongs to (derived from platforms). |
| `landingEvents`, `bounceEvents` | `world/fall-tracker.ts` | A landing becomes `land`, and past `minFallPxToOffer` also `fall { heightPx, big }`. Never resets or kills. A fall ending on a bounce cap gives the same `fall` (`bounceEvents`, no `land`). |
| `bodyInArea`, `findFinish`, `altitude01` | `world/finish.ts` | Legacy draft area helpers and altitude to the final stage ledge. Runtime completion uses landing events. |
| `createPhaseController`, `PhaseController` | `world/phase-controller.ts` | Pause/resume (restores the earlier phase) and one-time finish; stepping only while `'playing'`. |
| `writeSnapshot`, `SnapshotPatch` | `scenes/snapshot-writer.ts` | Publishes `sectionId`, `altitude01` (the refuge controller owns `inRefuge`) only when a field changes. |
| `PlayerInput`, `PlayerState`, `PlatformBox`, `StepEvents` | `player/types.ts` | Plain data shared with the level checker (P4.2). |
| `targetFor`, `stepEffect`, `stepEffects`, `neutralFrame`, `EffectInput` | `effects/effects-engine.ts` | Pure maths: signal → capped, smoothed effect values. |
| `createDarkness`, `updateDarkness`, `minCoveringRadius` | `effects/darkness.ts` | The darkness sheet with a soft light hole (P0 spike). |
| `reachableLedges`, `outlineSegments`, `WorldBounds`, `Segment`, `KickSample` | `world/reachable-ledges.ts` | Higher ledges (and, with `lowerPx`, ledges up to that far lower: the endless climb) a sampled real jump lands on (LAN-3), and the outline segments to draw. No signal. Takes the updraft columns too (endless climb), so ledges reached through one count; with walls (D-37) also samples kicking flights and the route's own wall steps (`KickSample`). |
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
| `makeAnchor`, `toWorld`, `stepShed`, `pinPerCycle`, `wickSmokePuffs` | `candle/detached.ts`, `candle/flame.ts` | Droplets, breath, smoke and flight sparks stay where they were shed instead of following the candle. |
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
| `stableUnit`, `reveal`, `mixColor`, `pickFitting`, `pickPartner`, `DrawnSize` | `forest/presentation.ts` | Deterministic seeds, continuous visual mapping, and picking a ledge prop (and its decayed partner) by what fits instead of scaling it. |
| `createAtmosphere` | `forest/atmosphere.ts` | Weather and corruption atmosphere; renderer-only. |
| `createVerticalForest` | `forest/vertical-forest.ts` | Continuous background composition by height (layout helpers in `forest/vertical-layout.ts`). |
| `createBackdropGardens` | `forest/backdrop-gardens.ts` | Pooled, seeded, non-collidable parallax garden ledges. |
| `createCorruptionScreen`, `createCorruptionFilter` | `forest/corruption-screen.ts`, `forest/corruption-filter.ts` | Bounded visual-only corruption motion and Phaser filter. |
| `createLanternFuel`, `burnFuel` | `forest/lantern-fuel.ts` | Candle fuel: drains with playing time, refilled by wax, scales light radius only. |

Atmosphere: createAtmosphere (forest/atmosphere.ts) consumes existing corruption and renderer-only stage weather; createVerticalForest and vertical-layout helpers provide bounded continuous background composition. ForestWorld.setEnvironment is the level integration point; no signal/physics import.

createBackdropGardens (forest/backdrop-gardens.ts): five pooled, seeded non-collidable parallax garden ledges; no physics or bright landing rims.

pickPartner (forest/presentation.ts) chooses a decayed partner no taller than its healthy prop, so no oversized decoration grows over a landing; nothing is scaled to fit (Decision D-34).

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
| `createEndlessGenerator`, `replayStep`, `difficultyAt`, `EndlessChunk`, `RouteStep`, `WaxSpot`, `EndlessGenerator`, `PieceSpan` | `endless/generator.ts` | Seeded, random-access chunks, each starting on an anchor ledge (`floor(index)`; only chunk 0's is full width). Each chunk is a seeded run of set pieces then an approach ladder onto the next anchor (D-35); `chunk.pieces` lists them, `chunk.altRoute` holds a fork's other way. Every ledge is reachable by construction and its jump or drop is replayed before it is kept. `isBuilt(index)` tells the stream which chunks are already built; the pieces of a chunk stop after `pieceWorkSteps` replayed physics steps (a count, never the clock). |
| `EndlessChunk.sideRoute`, `WaxSpot.ledgeId`, `WaxSpot.ledgeX` | `endless/generator.ts` | The jump to each optional side ledge; wax on a moving side ledge knows which ledge it rides. |
| `replayWork`, `replayStep`, `flyStep`, `standMsBefore`, `stepsHold`, `chargeDriftPx`, `createRouteChecker`, `kickedAsStored`, `wallStepVariants`, `wallInTheWay`, `RouteStep`, `Flight`, `RouteChecker`, `StepBox` | `endless/route-replay.ts` | Replays a route step (a jump, or a drop: walk off the edge) with `stepPlayer`, through updraft columns and bounce caps, and from a crumbling ledge with the crumble timer running (D-36); a wall step (`kicks`, `walls`, D-37) presses its kicks and must kick exactly its walls, from every shifted takeoff, every early or late press, and the two combined (`walls.crossShiftPx`, `crossOffsetSteps`); a step whose ledge or takeoff a wall cuts into is refused (`wallInTheWay`); checks a set of steps with every moving ledge at both ends of its travel; remembers each step's swept region so a new ledge, column or wall only re-checks steps it could change. |
| `createKickPolicy`, `KickPolicy` | `endless/wall-kicks.ts` | The keys a wall step presses after takeoff (hold toward the wall, press a set time after reaching it, hold the other way), shared by the replay, the route bot and the night outlines (D-37). |
| `Piece`, `PieceKit`, `PieceRun`, `JumpSpec`, `DropSpec`, `FlightSpec`, `Candidate`, `PieceFeature` | `endless/pieces/types.ts` | The set-piece interface: a piece lays a short run of ledges from an entry ledge using the kit. Add a piece with one file and a registry line. |
| `createPieceKit`, `emptyRun`, `traceDrop`, `keepsClear`, `apexLimitTop`, `GeneratorKit`, `Committed` | `endless/pieces/kit.ts` | The tools pieces build with: sampled jumps and drops under real arcs, and the one `accept` check (walls, chunk bounds, clearance, peak height, full replay); `keepsClear` takes the room a wall must leave over a ledge (`wallHeadroomPx`, D-37); for D-36 also `placeCap`, `addColumn`, `makeCrumbling` and `fly` (a traced flight through caps and columns, the ledge put where it comes down). |
| `PIECES`, `PieceEntry` | `endless/pieces/registry.ts` | Every set piece with its weight, unlock chunk, whether it is demanding, and the features it needs. |
| `choosePiece`, `allowedPieces`, `PacingState` | `endless/pieces/pacing.ts` | Seeded choice of the next piece: never the same twice in a row, calm after demanding, unlock by chunk, fade-in. |
| `featuresAt` | `endless/pieces/features.ts` | Which piece features a chunk has (snow, moving ledges, bounce caps, crumbling ledges, updrafts, and walls only with the `?walls=1` switch). |
| `GeneratorOptions` | `endless/generator.ts` | Switches of a climb: `walls` (D-37 prototype). Off, every chunk is as before. |
| `LADDER`, `STAIRCASE`, `TRAVERSE`, `ZIGZAG`, `DETOUR`, `PILLARS`, `BIG_LEAP`, `FORK`, `ICE_RUN`, `MOVING_CROSSING`, `MUSHROOM_LAUNCH`, `CRUMBLING_RUN`, `UPDRAFT_RISE`, `UPDRAFT_CROSSING` | `endless/pieces/*.ts` | The fourteen set pieces, one file each; the header of each says what the shape is and why it plays well. |
| `WALL_KICK`, `CHIMNEY` | `endless/pieces/wall-kick.ts`, `endless/pieces/chimney.ts` | The wall pieces (D-37, only with `?walls=1`): a wall beside a gap to kick off up to a ledge no jump reaches, and two facing walls climbed by alternating kicks. Kit: `addWall`, `wallId`, `plainApexPx`, `wallFloorPx`; `fly` takes a probe with `kicks`. |
| `wallAt`, `standSpan`, `firm` | `endless/pieces/walls.ts` | The wall pieces' shared helpers: a wall on the 2x grid, where the body can stand on a ledge, which ledges a wall piece may start from. |
| `besideColumn` | `endless/pieces/columns.ts` | The two updraft pieces' shared step: a column beside the entry ledge, then a traced flight through it. |
| `lastLedge`, `roomier`, `eitherWay` | `endless/pieces/shared.ts` | Small helpers the pieces share. |
| `createChunkStream`, `ChunkStream`, `StreamChange` | `endless/chunk-stream.ts` | Keeps a fixed window of chunks alive around the player, always including the chunk below and every chunk a fast fall can reach before the next update. `prefetch` builds at most one chunk ahead of need per frame (4 below, 1 above). |
| `freshFlame`, `stepFlame`, `addWax`, `burnPerSecond`, `isLit`, `FlameState` | `endless/flame-fuel.ts` | Fuel burns with time, wax refills it, a grace time before the run ends. |
| `moodIntensity` | `endless/mood.ts` | Composure and fuel to the 0..1 intensity fed to the effects table (the mood follows the candle). |
| `steadyComposure`, `shake`, `steady`, `stepComposure`, `isSteadying`, `fallShake`, `bounceBreaksFlow`, `burnScale`, `Composure` | `endless/composure.ts` | The candle's composure from play: falls shake it, standing still steadies it; drives the forest's corruption and a faster burn. Never movement. |
| `createEndlessWax` | `endless/endless-wax.ts` | One-time wax pickups at generated spots; same snapshot field and bus event as the classic wax. |
| `createWaxDropsView` | `endless/wax-drops-view.ts` | Draws the live wax drops; marks come and go with the chunks. |
| `createRunScore`, `RunScore`, `rememberSeededBest`, `SEEDED_BESTS_KEPT` | `endless/run-score.ts` | Height of the run (ledges stood on) and the best height on this device; seeded climbs keep their own best, the latest 30 of them. |
| `biomeOf`, `snowAt`, `chunkOfPlatform`, `Biome` | `endless/biome.ts` | Forest and snow bands by height: platform skin per chunk and snowfall that fades in and out. Presentation only. |
| `nightAt`, `sightRadius`, `candleRadius`, `nightShadowAlpha` | `endless/night.ts` | Night falls with height; in the dark the view is the candle's own circle, sized by its fuel. Presentation only. |
| `createRouteBot`, `heldStepsFor`, `chooseHold`, `BotWorld` | `endless/route-bot.ts` | Development-only player that follows the generated route (`?bot=1`), for automated browser checks; walks off the edge for a drop, and when wax has grown the candle checks its hold by replaying the jump (`flyStep`), tries neighbouring holds, and never repeats a hold that landed elsewhere. |
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
| `createPerchingBirds` | `forest/perching-birds.ts` | A pool of three small birds (birb.png at the one pixel size) seated on ledges above the view. |
| `createAmbientLife` | `forest/ambient-life.ts` | A far flock now and then, fireflies and spores, single falling leaves that redden with corruption. |
| `createGrassTufts` | `forest/grass-tufts.ts` | Swaying grass on forest ledges; withers with corruption. |
| `snapToGrid`, `snapInside`, `PIXEL_GRID` | `forest/pixel-grid-snap.ts` | The one art grid (Decision D-34): rounds a drawn position to a multiple of `FOREST_CONFIG.pixelScale`; `snapInside` keeps it within bounds. Only drawing snaps; physics stays exact. |
| `createGridCamera`, `GridCamera` | `scenes/grid-camera.ts` | Follows the candle with the same easing as `startFollow(player, true, 0.12, 0.12)`, but hands the camera a scroll on the art grid each frame. |
| `createLedgeKindsView`, `LedgeKindsView`, `LedgeKindsFrame` | `forest/ledge-kinds-view.ts` | Draws bounce caps, crumbling ledges (cracks, shake, falling bits) and updraft streaks by code on the art grid, with accents above the darkness (D-36); and walls through `drawWall`. |
| `drawWall` | `forest/wall-view.ts` | A wall (D-37) as a grey stone pillar of block courses, mossy or snow-capped, with dashed lavender face lines above the darkness. |
| `PROP_ART`, `DECAYED_ART`, `FOREST_PROPS`, `WINTER_PROPS`, `FOREST_DECAY`, `WINTER_DECAY`, `PropArt`, `drawnSize`, `addPropFrames` | `forest/prop-art.ts` | The ledge props as whole pieces at the one pixel size; crops of the multi-sprite sheets (single mushroom, thorn bush and so on) added as frames. |
| `ensureParticleTexture`, `PARTICLE_TEXTURE`, `leafPose`, `leafFrame`, `LEAF_COLOURS`, `LeafColour`, `LeafFrame` | `forest/pixel-particles.ts` | Fireflies, spores and falling leaves as a few code-drawn art pixels, painted once into one texture; leaves turn by three drawn poses and flips instead of free rotation. |
| `ForestWorld.setCandle` | `forest/forest-world.ts` | The scenes tell the scenery where the candle is. Read by the birds only. |

Far garden ledges (`forest/backdrop-gardens.ts`) now sometimes spill a waterfall, which freezes in the snow.

## Generated backdrop (`backdrop/`)

The scenery behind the endless climb is painted from the run's seed. Back to front: a gradient sky, a horizon layer
of far ridges (snowy peaks, rolling hills, jungle table mountains), then far, middle and near forest layers, with mist
bands between them and animated water over the painted waterfalls. Each forest flavour has a recipe in
`config/backdrop.config.ts` (crown styles, tree kinds, lianas, waterfalls, petals). `__tests__/backdrop-gallery.html`
is a dev page that shows it at several heights (`?seed=`, `?heights=`, `?zoom=`, `?layer=`, `?flavour=`, `?falls=1`).

| Export | File | What it does |
|---|---|---|
| `TONE`, `TONE_COUNT`, `PixelGrid`, `createGrid`, `put`, `hash`, `noise1`, `subSeed`, `pickWeighted` | `backdrop/pixel-grid.ts` | A grid of colour slots to paint into, repeatable seeded numbers, and a weighted pick. |
| `Surface`, `plot`, `misses`, `rowsOf` | `backdrop/surface.ts` | The surface painters draw on, in whole-forest coordinates. |
| `BackdropBiome`, `ChunkRequest`, `Waterfall` | `backdrop/chunk-types.ts` | Shared types (also re-exported from `paint-chunk.ts`). |
| `paintClump`, `paintPads`, `paintWeeping`, `paintSparse`, `paintCrown`, `paintPetals` | `backdrop/foliage.ts` | Crown styles: lumpy clump, cedar tiers, umbrella, willow, column, airy twigs; petals or falling leaves. |
| `paintFronds`, `paintBigLeaves`, `paintBoughs` | `backdrop/foliage-shapes.ts` | Palm fronds and broad jungle leaves; drooping snow-laden boughs. |
| `crownStyleAt` | `backdrop/crowns.ts` | The crown style for a biome and seed (the cold's styles more often the colder it is). |
| `paintLimb`, `paintBroadleaf`, `paintPine`, `paintMushroom`, `paintPalm`, `paintShelfFungus`, `paintSmallMushroom`, `paintFern` | `backdrop/trees.ts` | Trees and the small things that grow on islands and trunks. |
| `paintIsland`, `islandColumn`, `paintCrag`, `cragColumn` | `backdrop/terrain.ts` | A grassy island with roots and vines; a rock crag with strata and snowy ledges. |
| `paintWaterfall`, `isFrozen`, `fallMistRows` | `backdrop/water.ts` | A painted fall: pool and mossy lip, water (or ice), mist at its foot. |
| `islandsBetween`, `chunkWaterfalls`, `longestFall`, `recipeOf`, `IslandPlan` | `backdrop/layout.ts` | Where islands are and which spill a fall, from the seed and height only. The painter and the view share it. |
| `paintIslands` | `backdrop/islands.ts` | Paints island plans: ground or crag, trees by recipe, plants, then the fall. |
| `trunkLanes`, `paintTrunk`, `paintLedgePines`, `TrunkLane` | `backdrop/trunks.ts` | Full-height trunks; rocky lanes become stepped cliffs with snowy ledges in the cold. |
| `paintBranches`, `paintVine` | `backdrop/branches.ts` | Branches with recipe crowns, vines, petals, and shelf fungi on the trunk. |
| `paintLianas` | `backdrop/lianas.ts` | Lianas sagging between trunks (loops at the edges in the near layer). |
| `paintMist`, `ditherAt` | `backdrop/mist.ts` | See-through mist bands in a layer's empty air; a 4 by 4 ordered dither. |
| `paintHorizon`, `horizonRangeAt`, `horizonFarBiome`, `rangeKindOf` | `backdrop/horizon.ts` | The horizon layer's ranges, two ridge lines each, coloured per range by its own biome. |
| `paintChunk`, `renderChunk`, `chunkFarBiome` | `backdrop/paint-chunk.ts` | One chunk of one layer, and paint + colour + waterfall list in one call. Chunks join exactly. |
| `colourChunk`, `waterColour` | `backdrop/palette.ts` | Slots to colours, row by row: flavour palette mixed toward the cold one, then toward the fog by the layer's fog. |
| `skyAt`, `mixRgb` | `backdrop/sky.ts` | Top and fog colour of the sky for a biome. |
| `createSkyGradient` | `backdrop/sky-view.ts` | The banded gradient sky (Phaser). |
| `createWaterfallStrips`, `StripPlacement` | `backdrop/waterfall-view.ts` | A fixed pool of animated water strips over painted falls (Phaser, the waterfall sheets in CREDITS.md). |
| `createBackdrop`, `BackdropSource` | `backdrop/backdrop-view.ts` | Keeps a few painted chunks per layer on canvas textures and scrolls them with the camera; `update(corruption, clockMs, skyCorruption)`, `fogAtCamera()`. |
| `backdropBiomeAt`, `flavourOfBand` | `endless/backdrop-biome.ts` | How cold a height is (smooth, following the snow bands) and each forest band's seeded flavour. |
| `createForestWorld(scene, world, backdrop?)`, `ForestWorld.reseedBackdrop` | `forest/forest-world.ts` | With a `backdrop` the generated forest replaces the repeating trunks and far garden ledges. |

