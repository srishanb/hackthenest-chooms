# After-job report: netplay core (online two-player climb, phase A)

- Agent: claude (feature builder, run by the lead session)
- Branch and PR: claude/netplay-core, no PR (the brief said not to push or open one)
- Phase and plan: MP phase A, docs/plans/MP-online-two-player.md (Status: DRAFT; phase A started at the owner's request, Decision D-38)
- Started and finished: about 12:10 to 12:51 Eastern (container clock 17:10 to 17:51)

## 1. What I believe is complete

| Acceptance test (from the plan and the brief) | Result | Confidence |
|---|---|---|
| With the switch off, every chunk and the classic climb are unchanged (hash comparison against the base) | Pass: four sha256 hashes (generator 40 seeds x 10 chunks, the same with walls, 6 x 20,000 random endless steps, random runs on every authored section) equal on `git archive 7f2a567` and on the branch. A cheaper fingerprint (no walls) is pinned in `versus-identity.test.ts` | High |
| Rules: stand on a head and be carried, jump from a head, head moves away and the rider falls, push a standing candle (and off a ledge), a head-on hit in the air, an overlap separated without passing through a ledge or wall | Pass (`versus-rules.test.ts`, 12 tests) | High |
| Two simulated clients at 0, 80 and 200 ms delay with 30 ms jitter and 5% loss: the remote candle stays within a stated distance of the truth (10 px at the shown time; measured worst 7 to 9 px) | Pass | High |
| ...a shove moves the other candle on both sides, applied once; off a ledge; no oscillation; nobody pushed through a ledge | Pass | High |
| ...a knock is taken once per candle | Pass (each side's `knocksTaken() === 1`) | High |
| ...a head landing seen on both screens; a wax pickup has one winner; a crumbling ledge falls on both sides; the session survives the other side going silent; moving ledges keep the same world time | Pass | High |
| Message format: version mismatch refused politely with a reason; a repeated event ignored; a third player refused | Pass (`netplay-protocol.test.ts`) | High |
| Two browser pages over `BroadcastChannel` (dev server): both reach `playing`, each sees the other, they meet (shove on the ground, one stands on the other's head), 0 console or page errors, screenshots | Pass | High |
| The same on a production build (`vite preview`) | Pass: both reach `playing`, status line shown, 0 errors. The dev readout is stripped in production, so the meeting itself was checked on dev only | Medium |
| One solo run without the switch (`?bot=1&seed=42`, dev) with 0 errors | Pass | High |
| `npm run check`, `npm run build` | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 113 files, 853 tests pass; the new five files run in about 1.5 s |
| Build | `npm run build` | built, no errors |
| Hash comparison | scratch `hash.mts` with `ROOT=<git archive 7f2a567>` and `ROOT=<worktree>` | identical: generator `16063d94…`, generator with walls `57c5e947…`, endless runs `d4f92e02…`, classic runs `99a757dd…` |
| Two pages, dev | scratch `two.cjs` on port 3020: `?mp=host&room=t1&seed=42` and `?mp=join&room=t1`, Enter on both | connected; guest walked into the host and pushed it 33 to 44 px; the host hopped onto the guest's head (`on: head:guest` on the host, the guest sees `on: head:guest`); closing the guest window shows "The other player left. Climb on alone." on the host; errors `[]`. Screenshots `mp-dev-*.png` in the session scratchpad `shots/` |
| Off-screen marker | scratch `marker.cjs` (host with dev-only `startChunk=1`) | guest screen shows the arrow at the top edge; errors `[]` (`mp-dev-guest-marker.png`) |
| Guest reload rejoins | scratch `reload.cjs` | host status `left > connected` in about 4.3 s, errors `[]` |
| Production | `npm run build`, `npx vite preview --port 3021`, `two.cjs --prod` | both `playing`, status lines shown, errors `[]` (`mp-prod-*.png`) |
| Solo | play-verify `smoke.cjs --query "?bot=1&seed=42"` | bot climbs 501 px in 15 s, errors `[]` |
| No network in phase A | read every file in `src/game/netplay/` | only `BroadcastChannel` and the in-process link; no `fetch`, `WebSocket`, WebRTC or URL request |

**Not verified:** two laptops (phase A has no network); two real people playing (feel of shove speed, knock strength, playback delay); browsers other than headless Chromium; frame rate (the headless machine renders at 6 to 15 fps, so the browser runs checked behaviour, not smoothness); a knock between two browser pages (tested only in the simulation); a wax race and a crumbling ledge in the browser (simulation only); a pause on one side during contact in the browser; the wall prototype together with two players (`?walls=1` is carried in the handshake, not played).

## 3. Problems, workarounds and dead ends

- The first shove detection ran before the physics step and missed a moving contact (the other candle moved away by more than the touch tolerance each step), so a push came in stops and starts. It now runs after the step that left the pusher pressed against the other body.
- The remote candle's playback delay was set before the first state arrived (latency unknown), so at 200 ms it extrapolated for two seconds. The delay is now set from the first state.
- The identity test first used the authored sections from `src/content/`, which the lane test forbids; it now uses an authored-style world built in the test, and the full classic check stays in the scratch hash comparison.
- At 0 ms delay the guest's clock is off by about one step (the test link answers a frame later), which is why a wax tie at 0 ms goes to the host; the tests say so.

## 4. Deviations from the plan

- The playback delay is a configured base (100 ms) plus the measured travel time and spread, eased slowly, not one fixed number: with a fixed 100 ms the remote candle would only be guessed ahead at 200 ms delay.
- A head can be stood on only while its candle stands. If it jumps, the rider falls (and the two may knock), instead of being glued to a flying head.
- The commit trailer names the model given in this session's system attribution (not the one in the brief), and the brief's trailer format otherwise; the integrator may want to check which is wanted.

## 5. Changes

- Files changed: new `src/game/player/versus.ts`, `src/game/netplay/*` (15 files), `src/config/netplay.config.ts`, `src/ui/components/netplay-status/*`, five test files plus `netplay-sim.ts` under `src/game/__tests__/`; changed `src/game/player/movement.ts` (6 small insertions, all inside `if (others)` / `if (push)`), `src/game/player/world-step.ts` (an optional argument), `src/game/scenes/endless-scene.ts` (a few lines plus one private method), `src/game/index.ts`, `src/game/endless/endless-wax.ts`, `src/game/candle/candle-view.ts` (`setAlpha`), `src/config/game.config.ts` (`versus`), docs (`docs/GAME_ONLY.md`, three `INDEX.md` files and `src/ui/INDEX.md`).
- Contract or config-schema changes: `GameConfig.versus` and `VersusConfig` (optional), `GameSnapshot.netplayKey` (optional), `UiComponentId` gains `netplay-status`. Each in its own commit.
- New dependencies requested: None.
- Edits outside my lane: `src/main.ts` (reads the switch; own commit); UI lane: `src/ui/strings.ts` (five `netplay.*` lines), `src/ui/registry.ts` (one line), `src/config/ui.config.ts` (one entry), the new component folder, `src/ui/INDEX.md` (one line).
- `INDEX.md` updated for new exports: yes.

## 6. Follow-ups and questions for humans

- [ ] Phase B: the owner's choice of how two laptops find each other, and the rule-3 exception text in `AGENTS.md` (Srishan).
- [ ] Feel: shove speed (0.6 of walking), knock (restitution 0.6, cap 520 px/s, threshold 180 px/s) and the 100 ms playback delay need two people to judge (Srishan, Ali).
- [ ] Amrit: the status line's wording and its place (top centre); a lobby screen instead of the URL.
- [ ] `WORLD_REVISION` in `netplay/build-id.ts` must be bumped by hand when generator code changes chunks without a config change; consider tying it to the generator's own version if one appears.
- [ ] The other candle's flame casts no light at night (the darkness is one image with one hole); a second hole would need a change to `effects/darkness.ts`.

## 7. Can a teammate explain this?

Each laptop runs only its own candle with the normal physics and sends where it is twenty times a second; the other
candle is drawn a moment in the past from those messages and is solid, with a head you can stand on. When you walk
into the other candle or hit it in the air, your game sends it a message and their game moves their own candle once,
so both screens end up agreeing. The world is the same on both because the host sends the seed, and anything that
changes over time (moving ledges, crumbling ledges, wax) follows a shared clock or a message.
