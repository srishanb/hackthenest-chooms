# After-job report: netplay fix round 2 (QA findings 1, 2, 3, 9, 11)

- Agent: claude
- Branch and PR: claude/netplay-fix2 (cut from game-only a10800e), no PR opened (not asked)
- Phase and plan: two-player phase A, D-38 / D-38a; the integrator's brief for round 2 (no plan file)
- Started and finished: about 19:30 to 20:05 Eastern

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| Finding 1 (hold): wax ids from the other player bounded; no spread of unbounded data; every collection fed by messages bounded | Pass | High for the wax sets (tests fail before, pass after); Medium for the per-frame cost of a flood (not profiled) |
| Finding 2: "a new field cannot skip the limits table" made true | Pass | High (tried to break it on a scratch copy, see section 2) |
| Finding 3: a pause under 1 s leaves moving ledges in step | Pass | High in the sim; Medium for a real hidden tab (not driven) |
| Finding 9: comments on `contactWindowMs`, `maxEventAgeMs` | Done | High |
| Finding 11: host `hello` resend test, pair check inside `knockBetween` test | Done | High |
| Findings 4 to 8 and 10 | Left alone, as told | n/a |

### Finding 1: root cause and fix

Root cause: `wax-claims.ts` `theirs` and `endless-wax.ts` `elsewhere` took any string id from a `wax` or `sync` event (up to
1,024 per `sync`, and every message had a fresh event id), and nothing removed them until that player's run number went up. A
`run_reset` or a new guest then spread every freed id into `changes.show.push(...)`, which throws `RangeError: Maximum call stack
size exceeded` above about 120,000 arguments and stops the host's game for good.

Fix, so it cannot recur by construction:
- `protocol.ts`: a wax id (in a `wax` event and in each `sync` item) must match what the generator makes, `e<chunk>:wax-<letters><digits>`
  (`generator.ts` lines 351 to 382), and its chunk goes through the limits table (new rows `event.wax.dropId.chunk`,
  `event.sync.wax.id.chunk`, 0 to about 1,041,666, the chunk of the highest `state.body.y` the table allows). A message with an id
  that is no drop id is refused whole. A drop in a chunk this game has not built is still accepted (the other player may be far above), so an honest far claim stands.
- `wax-claims.ts`: `theirs` and `mine` capped at `maxRemoteWax` (4,096, `netplay.config.ts`), oldest forgotten; `localClaims()` sends the newest 1,024 (the `sync` limit, now `MAX_SYNC_WAX`).
- `endless-wax.ts`: `elsewhere` capped the same way (oldest forgotten), also for `revoke`.
- `versus-client.ts` `takeWorld`: no spread anywhere (`showAll` appends one by one); a per-frame budget of `maxRemoteWax` wax ids read from received messages, the rest of a flood is skipped.
- Searched `push(...`, `Math.max(...`, `Math.min(...`, `.apply(`, `concat(` in `src/game/netplay/`, `endless-wax.ts`, `endless-scene.ts`: the three spreads in `versus-client.ts` were the only ones on received data. The remaining `[...map]` spreads are of capped maps into arrays.

Protocol version not bumped: no message changed shape; only validation tightened, and two builds that differ in wax-id format already refuse each other by build id.

### Every collection fed by received messages, and its bound

| Collection | Fed by | Bound |
|---|---|---|
| `wax-claims` `theirs` | `wax`, `sync` | `maxRemoteWax` 4,096, oldest forgotten (`wax-claims.ts` `trim`); ids must be drop ids |
| `wax-claims` `mine` | this player's own pickups (and revoke removes) | same cap; own play only |
| `endless-wax` `elsewhere` | `changes.hide`, `revoke` | `maxRemoteWax`, oldest forgotten (`hideElsewhere`) |
| `WorldChanges.hide/show/revoke` (per frame) | the above | at most `maxRemoteWax` received ids per frame (`waxBudget`) plus at most one reset's worth (4,096 each) |
| crumble map (`startRemoteCrumble`) | `crumble`, `sync.crumble` | `maxCrumbling` 128 (`remote-crumble.ts`); names that are no ledge are dropped by `stepCrumble` every step anyway |
| broadcast transport inbox | every message on the room | newest `maxQueuedMessages` 256 (`broadcast-transport.ts`) |
| session `inbox` (events) | `event` | newest `maxQueuedMessages` 256, drained each frame (`session.ts`) |
| reliable-events `seen` / `seenOrder` | event ids | `SEEN_LIMIT` 2,048 (existing, `reliable-events.ts`) |
| reliable-events `acks` | event ids | newest 2,048 (new; before, never drained while the session was `left`) |
| reliable-events `outbox` | this game's own events | `giveUpMs` 8 s, local rate only (existing) |
| contact-arbiter `waiting` (knocks) | `knock` | newest 16 (`MAX_WAITING`, new; it grew while no step ran) |
| contact-arbiter `push`, `paired` | `shove` | single values |
| remote-candle `samples` | `state` | `KEEP` 40 (existing) |
| session per-peer records (`peer`, `remoteLook`, clock `samples`) | handshake, pongs | single peer; clock samples 8 (existing); a new peer replaces the old |
| `fuelByDrop` (scene-link) | this player's own pickups | cleared each run; own play only |
| memory transport queues | tests only | not bounded (test harness, never in the game) |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Flood test fails before the fix | `npx vitest run src/game/__tests__/netplay-flood.test.ts` on commit 72c8824 (test plus observability only) | 7 of 11 failed: `expected 153600 to be less than or equal to 4096`, `expected 20000 to be less than or equal to 4096`, and `RangeError: Maximum call stack size exceeded` for the new-guest case (output kept in scratchpad `flood-baseline.txt`) |
| Flood test after | same on 00ca51b and later | 12 of 12 pass |
| Honest race and far claim after a flood | in the same file | pass: one winner (`e1:wax-p1`), `e900:wax-s2` hidden on the host |
| Finding 2 on a scratch copy | copied the tree to the scratchpad, (A) added optional `BodyState.heat?: number` read with a raw `typeof value.heat === 'number'`; (A2) also gave the sample a `heat` value; (B) added event kind `emote` with a number and no table row | A: `tsc` error "Property 'heat' is missing in type ... required in type Required<BodyState>" and the raw-read test failed. A2: "every number has a row", "reads a number in one place" and "each field" all failed. B: `tsc` error "Property 'emote' is missing" and the same tests failed. (B was tried on top of A2, so its test failures mix the two; its `tsc` error is its own.) Logs in scratchpad `fix2/mut-attempt-*.log` |
| Finding 3 before | pause test on the unfixed clock | 5 of 5 failed: ledge 17 / 43 / 66 / 59 / 52 px off one step after pauses of 100 / 300 / 600 / 900 / 990 ms |
| Finding 3 after | `netplay-pause-resume.test.ts` | pass: both sides under 3 px within one step, 5 pauses x host and guest x 3 seeds; a candle on the ledge is not dropped, 5 pauses x 2 sides x 6 seeds; the small-drift nudge unchanged |
| Whole suite | `npm run check` | typecheck clean, 121 files, 921 tests pass (includes the pinned `versus-identity` fingerprint, unchanged) |
| Build | `npm run build` | built, no errors |
| Browser, two pages (dev port 3057, `?mp=host&room=f2&seed=42` and `?mp=join&room=f2`) | headless Chromium, one context | both `playing`, status `connected`, 0 console or page errors |
| Browser flood | third page posted 200 forged `sync` messages of 1,024 ids (half drop-shaped, half junk) to `lighten-up-mp:f1`, then a forged `run_reset` | no page error; host heap 98 MB; the host's candle moved x 480 to 249 holding left for 1.5 s (game running) |

Test data note: three existing test files used made-up wax ids (`e1:w1`, `e2:w1`, `e1:d5`, `d`) that no generator makes; I changed them to drop-shaped ids (`e1:wax-p1`, `e2:wax-p1`, `e1:wax-s5`, `e1:wax-p0`). No assertion was weakened.

**Not verified:**
- Per-frame cost of a sustained flood: the worst case per frame is 256 messages of 1,024 ids to check (about 260k regex tests), not profiled. A page that floods the room can still cost some frame time; it can no longer freeze the game or grow memory.
- The resume rule in a real hidden tab or a real pause menu (the sim stops stepping, which is what the scene does; the scene glue is a two-line change in `scene-link.ts`).
- Two real people, two laptops (phase B).
- `maxQueuedMessages` dropping honest messages in a tab hidden for more than about 12 s: states are redundant and events are resent or re-agreed by `sync`, but not driven in a real browser.
- A claim older than the newest 1,024 of a very long run is not in a later `sync` (a reloaded guest could take such a drop again); that is far below the chunk a reload would be near.

## 3. Problems, workarounds and dead ends

- `rsync` is not installed; the scratch copy for finding 2 is made with `tar`. My first attempt's edits did not run (the `&&` chain stopped), so I checked the worktree was clean before continuing.
- Two of my new tests (knocks while no step runs, crumble through the room) passed on the old code as well, because the age filter and the next physics step hide the growth. I replaced the crumble one with a direct `startRemoteCrumble` test that fails before; the knock-cap test stays as a sanity check only (the cap is for memory, not behaviour).

## 4. Deviations from the plan

- None to a plan. The per-frame wax budget and the queue caps go a little beyond the brief's list (a, b, c) because the table in (c) asked for every collection.

## 5. Changes

- Files changed: `src/game/netplay/{protocol,wax-claims,versus-client,remote-crumble,contact-arbiter,reliable-events,broadcast-transport,session,shared-clock,scene-link}.ts`, `src/game/endless/endless-wax.ts`, `src/config/netplay.config.ts` (new `maxRemoteWax`, `maxCrumbling`, `maxQueuedMessages`, `worldTimeResumeGapMs`), `src/config/game.config.ts` (comments only), `src/game/__tests__/{netplay-flood,netplay-pause-resume,netplay-round2-small}.test.ts` (new), `netplay-qa-round.test.ts`, `netplay-two-players.test.ts`, `netplay-sim.ts` (the sim uses the same world clock), `src/game/INDEX.md`, `docs/GAME_ONLY.md`.
- Contract or config-schema changes requested: None (`NetplayConfig` is the game lane's file; it gained four fields).
- New dependencies requested: None
- Edits outside my lane: None
- `INDEX.md` updated for new exports: yes

## 6. Follow-ups and questions for humans

- [ ] Integrator: the protocol version stays 2 (validation tightened only). If you prefer old and new builds refuse each other, bump it.
- [ ] Phase B will need the same caps behind a real network transport (the room transport cap is in `broadcast-transport.ts` only).

## 7. Can a teammate explain this?

The other window's messages are untrusted, so anything they can fill now has a size limit, and a wax id has to look like a real drop id before it is remembered; a flood fills the limit and stops. When your own game resumes from a pause it sets the moving-ledge clock to the shared clock straight away instead of creeping toward it, so both players see the same ledge position again at once.
