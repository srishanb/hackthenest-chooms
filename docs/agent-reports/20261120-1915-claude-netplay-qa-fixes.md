# After-job report: netplay QA fixes (two-player climb, phase A, QA round 1)

- Agent: claude (feature builder, run by the lead session)
- Branch and PR: claude/netplay-qa-fixes (from game-only d13f2b7), no PR (the brief said not to push or open one)
- Phase and plan: MP phase A, docs/plans/MP-online-two-player.md; findings in `_agents_workspace/04_game-qa_netplay_findings.md`
- Started and finished: about 13:20 to 14:15 Eastern (container clock 18:20 to 19:15)

## 1. What I believe is complete

| Finding (QA) | Root cause (where it differs from QA's reading, said so) | Fix | Result | Confidence |
|---|---|---|---|---|
| 1 hold: rider carried into a wall | As QA read it: the carry was added to x before the start of the step's sideways check, so `blockX` started from inside the wall. Also true for a moving ledge carrying a candle under a low wall | `stepPlayer` keeps the body's x from before any carry (`startX`) and checks walls and the other candle from there, so a carry is blocked like a walk; the world's edge clamp already covered it | Pass | High |
| 2 hold: unbounded carry | As QA read it (`versus-client.ts` `moved`) | `carryLimitPx(config)` (twice the fastest a candle moves on its own, per step: 13 px); a bigger head move is a teleport and carries nothing, so the rider stays and falls | Pass (QA probe p2: largest one-frame move 5 px, was 489) | High |
| 3 hold: carrier knocks its rider | As QA read it, plus a second cause found on the way: the interpolated other candle counted as standing (and so as a head) for up to half an update after it had left the ground, which carried a rider up about 12 px | `knockBetween` never knocks a rider and its carrier; the arbiter keeps the pair until both stand somewhere else (or 3 s); the interpolated candle is standing only while its body is on the ground it stands on, with that ground's id | Pass: search of 432 press pairs at 0, 80, 200 ms, 0 knocks, largest gain 250.04 px against a bound of 253.29 (head 36 + full jump 217.29); pinned in a test with the same grid | High |
| 14 hold: unbounded received knock | As QA read it, and more widely: only finiteness was checked anywhere | Protocol 2: one table `messageLimits(gameConfig)` with a row for every number (and list length) in every message, keyed by its place; parse clamps every number to it and drops non-finite values; the arbiter clamps a knock's length to `maxImpulse` again. The test walks a sample of every message and fails on a number without a row | Pass | High |
| 4 should-fix: two knocks or one-sided | As QA read it (window by arrival time, age limit shorter than the window), plus: a game that saw the pair stack (not meet) dropped the other game's knock | A knock carries its contact's shared time; contacts within the knock window plus the longest playback delay (900 ms) are one contact; a received knock lands however late (up to 1.5 s) and whatever the local pairing | Pass: QA's p6 sweep now 1/1 or 0/0 in all 360 trials up to 400 ms (was up to 2/2, 0/1); own test 0 to 400 ms with 20% loss, reorder, duplicates | High |
| 7 should-fix: pause drops a candle off a moving ledge | As QA read it | `nextWorldTime` returns the real change of world time; the scene (and the test harness) pass it to `platformsAt`, so a ledge carries by its real displacement (through hold 1's blocking). Covers note 9 (vertical ledge with a nudge) | Pass (6 pause lengths, and a guest on a vertical lift) | High |
| 8 should-fix: a silence ends the session | As QA read it; also both sides stopped sending, so neither could hear the other again | `left` after a silence keeps the peer and keeps sending states (a heartbeat); hearing the same peer again resumes: candle cleared (no blend, no carry) and faded in, status "The other player is back.", `connectionId` changes and each game sends a `sync` (its wax claims and crumbling ledges) | Pass | High |
| 12 should-fix: lost welcome | As QA read it | Host resends `hello` until `welcome`; guest re-`join`s and answers every hello; host connected on welcome, guest only on the host's first state, so both connect or neither; 15 s timeout: guest `refused/timeout` with a status line, host forgets the guest | Pass | High |
| 13 should-fix: reload refused; wax re-taken | As QA read it | A join replaces a guest not heard for 1.5 s; `refuse{full}` no longer ends a guest's asking; a new peer frees the old guest's drops, and `sync` tells the new guest the host's claims | Pass | High |

Notes fixed: 9 (with 7), 16 (acks split into chunks of 256), 17 (the guest sends states only once its clock is set; a state is stamped with the time of its own physics step), 18 (test title, re-pin comment), 20 (tests for the knock window, the event age limit, the crumble timing and each finding). Also improved on the way: the other candle is interpolated with both states' speeds (Hermite) and traced with gravity across a landing or takeoff, and a late state that fills a gap is used as is (QA's p11: 80 ms max 4.6 px, was 9.6; 200 ms with 20% loss and reordering max 22 px, was 88).

Notes left alone: 5 (no mid-air knock at 80 ms and more in some geometries: inherent to playing the other back in the past), 6 (gap after a shove: feel), 10 (at 400 ms the playback delay caps and the candle is guessed ahead: phase B), 11 (clock asymmetry: any ping clock), 15 (spoofing by a same-origin page: phase B should take identity from the connection), 19 (telling the candles apart, height counted on a head: UI and owner).

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| New tests on the base | the new test file (and harness, with the base's world-time stepping) in `git archive d13f2b7` | 23 of 26 fail: rider 460 px past the wall face, 74 px into a wall on a moving ledge, 360 px drag on restart, carrier jump 27 px (needs > 213), 2 knocks, 33 numbers without a limit, one-sided and double knocks, off the ledge after a pause (and off the lift), `left` after silence, 1 welcome sent of 3, `waiting` instead of `refused`, a new guest refused; 3 pass on the base (shove age limit and crumble timing: present behaviour QA asked to cover; and the late duplicate knock, which the base dropped for being old) |
| New tests on the branch | `npx vitest run src/game/__tests__/netplay-qa-round.test.ts` | 26 pass, about 2 s |
| Type check and tests | `npm run check` | 118 files, 892 tests pass (52 s on this machine) |
| Build | `npm run build` | built |
| Solo identity | scratch `hash.mts` against `git archive d13f2b7` | identical: generator `16063d94…`, generator with walls `2f30e130…`, endless random runs `d4f92e02…`, endless random runs with walls `6b7a2430…`, authored sections `a1537db4…`; QA's own p16 identity probe gives identical output on both |
| Hold 3 search | scratch `search.mts`: charges 150/300/450/600 ms on each side, guest release offset -8 to +8 steps, at 0, 80, 200 ms (432 runs) | 0 knocks, largest gain 250.04 px (guest, 80 ms, host 450 ms, guest 600 ms, -2 steps); with 400 ms added (576 runs): 4 knocks at 400 ms, largest gain still 250.04 |
| QA probes | p1, p2, p6, p8, p9, p11, p17, p18, p19 on the branch | p1 0 px inside the wall; p2 5 px; p6 1/1 or 0/0 only; p8 250 px at 0/80/200; p9 no knock; p17 one winner in every race, the reloaded guest hides d5; p18 connected/connected; p19 0 problems. p13 re-implements the old scene loop itself, so it still shows the old drop; the scene path is covered by the new test |
| Browser, dev (port 3006) | scratch `two2.cjs`, rooms q2 and w3 (`&walls=1` on the host) | both `playing`; host hopped onto the guest's head (`head:guest` on both pages); the guest (carrier) jumped with the host on its head: carrier rose at least 166 px (polled every 100 ms at about 10 fps), rider stayed at head height and fell to the floor, knocks 0/0; host paused 5 s and resumed: guest stayed connected, both connected after; 0 console or page errors; screenshots `mp2-*.png` |
| Browser, solo | play-verify `smoke.cjs ?bot=1&seed=42` | bot climbs 519 px in 10 s, 0 errors |
| Browser, production | `vite preview --port 3008`, two pages | both `playing`, status lines, 0 errors |

**Not verified:** a carrier walking a rider up to a wall in the browser (the generator keeps walls clear of ledges; the nearest spots are chimney walls about 57 px over a ledge in chunk 1, which I could not reach by driving keys headless; my attempt to walk a rider to the world's edge ended with the guest landing on a ledge instead of the head). The wall case is covered by two tests (head carry and moving ledge). A backgrounded tab in a real browser (silence and resume are tested in the simulation only). A wax race, a crumbling ledge and a knock with delay in the browser. Two laptops, two people, other browsers, smoothness (headless runs at 10 to 20 fps).

## 3. Problems, workarounds and dead ends

- The tracking test failed at 10.8 px after my changes. Measuring against the host's clock was a wrong idea (the guest plays states by their own stamps), so I reverted that; the real cause was linear blending across a landing with a lost update. Hermite blending alone did not help; tracing the flight with gravity across a landing or takeoff did.
- The first pairing rule (a pair ends when this candle stands somewhere else) let the carrier's game end the pair while the rider was still in the air, so a jump-together gave a knock on one side. Ending it only when both stand elsewhere fixed it; then the other candle's interpolated `grounded` flag (true with an airborne ledge id) ended it early again, fixed by keeping the flag and the ledge id together.
- At 400 ms one game could see a stack where the other saw a meeting, which dropped a knock on one side; received knocks now ignore local pairing.

## 4. Deviations from the plan

- The knock event age limit no longer applies to knocks (only to shoves): a knock lands up to `maxEventAgeMs + sameContactMs` (1.5 s) after its contact, because "one contact, one knock per candle" at 400 ms with 20% loss needs resends to land.
- The interpolation of the other candle changed (Hermite, gravity across landings), and a correction offset is only kept when it replaces a guess ahead. Not a feel number, but it changes how the other candle moves on screen.
- No `docs/DECISIONS.md` edit (as asked): the lead's rule on riders is described in `docs/GAME_ONLY.md` as the lead's call, reversible by the owner.

## 5. Changes

- Files changed (game lane): `src/game/player/movement.ts` (carry checked from the start of the step), `src/game/player/versus.ts` (no rider/carrier knock, `carryLimitPx`, `riding`), `src/game/netplay/{protocol,session,contact-arbiter,versus-client,remote-candle,shared-clock,scene-link,wax-claims,memory-transport}.ts`, `src/game/scenes/endless-scene.ts` (world-time delta), `src/game/index.ts` (limits), `src/config/netplay.config.ts` (`replaceSilentGuestMs`, `handshakeTimeoutMs`), tests: new `netplay-qa-round.test.ts`, harness `netplay-sim.ts`, small updates to `netplay-protocol.test.ts` (sample x inside the world; the arbiter test follows the new late-knock rule), `netplay-two-players.test.ts` (title, clock bound), `versus-identity.test.ts` (comment).
- Contract or config-schema changes: none in `src/shared/`. Protocol version 2 (old and new builds refuse each other). `WORLD_REVISION` unchanged (no chunk changed).
- New dependencies: none.
- Edits outside my lane: UI lane `src/ui/strings.ts` (`netplay.back`, `netplay.refused.timeout`, the full-room line now says it keeps asking).
- `INDEX.md` updated: `src/game/INDEX.md`, `src/config/INDEX.md`.

## 6. Follow-ups and questions for humans

- [ ] Lead: add to D-38 (see the hand-back for the wording): the rider rule, coming back after a silence, rejoin on reload, protocol 2 bounds.
- [ ] Owner: the rider rule (no knock between a rider and its carrier) is reversible; the 900 ms "same contact" time and the 1.5 s late-knock limit come from the existing knock window and playback cap.
- [ ] Phase B: identity from the connection (note 15), playback at 400 ms (note 10), a transport `connecting` state.

## 7. Can a teammate explain this?

Every number the other window sends is checked against our own limits before the game sees it. A candle riding on
another is carried only as far as a candle can really move, and walls stop it like walking; a rider and the candle
under it never knock each other, so jumping together gives no boost. The two games now agree on each knock by when
it happened, find each other again after a silence or a reload, and keep repeating the handshake until both are in.
