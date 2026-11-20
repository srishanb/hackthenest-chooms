# MP: online two-player climb

Status: DRAFT (not yet approved as a whole)

Owner's choices so far, given in the lead session's chat on 20 Nov 2026 (Decision D-38): play is **online**, each
player on their own laptop with **their own camera**, and the two candles are **solid and can shove each other**.
Still open: which service connects the two laptops (phase B below). Phase A uses no network and has started.

- Lane: game (Ali's lane; asked for by the owner, Srishan), with small typed changes in `src/shared/contracts/`,
  one line in `src/main.ts`, and a few strings in the UI lane.
- Agents: `claude` (lead), a feature-builder per phase, game-qa after each phase.
- Target branch: `game-only`, behind a URL switch, off by default.

## Human tasks still open

| Task | Owner | Blocks | If it is not done |
|---|---|---|---|
| Choose how two laptops find each other (phase B: public signalling service, own relay, or both) | Srishan | Phase B only | Phase A still lands: two windows on one machine can play together. No play between two laptops. |
| Confirm the wording of the exception to binding rule 3 in `AGENTS.md` (online play uses the network; solo play never does) | Srishan | Phase B merge | Phase B stays on its branch: the reviewer holds network code while the rule has no exception. |
| Play it with a second person on a second laptop and a real connection | Srishan and a teammate | Turning it on for everyone | It stays behind the switch. The container the agents work in cannot test a real connection between two machines. |
| A lobby screen (host, join, room code) in the game's menu | Amrit (UI lane) or the owner's go-ahead for an agent | Turning it on for everyone | Play starts from a link with `?mp=host` or `?mp=join&room=CODE`. |

## Goal

Two people climb the same generated forest at the same time, each seeing their own candle in the middle of their
own screen and the other player's candle where it really is. The candles are solid to each other: one can stand on
the other's head and jump from it, walk into the other and push them (off a ledge too), and knock them in the air.
Solo play does not change at all.

## Approach

**Each laptop owns its own candle.** A client runs its own candle with the real `stepPlayer`, exactly as today, and
sends that candle's state (position, speed, pose) many times a second. The other candle is drawn from what arrives,
a few frames in the past, and is a solid body in the local world. A shove or a knock is an event sent to the player
it lands on, who applies it to their own candle. Reasons: the controls stay instant at any latency (the game is
about precise jumps), nothing needs two browsers to compute identical numbers, and a lost packet costs one update.
The cost: each player sees the other slightly late, so a collision can look a little different on the two screens.
Lockstep or rollback (both laptops simulate both candles from inputs) was considered and set aside for now: it
needs bit-identical maths across browsers and a rewind of the whole world, for a gain that matters in a fighting
game more than in a climb.

**The world is the same on both laptops.** The host picks the seed and the options and sends them when the guest
joins; the generator already gives the same climb for the same seed. Things that change over time are tied to a
shared clock or sent as events: moving ledges (shared clock), crumbling ledges and wax pickups (events).

**The connection is a small interface.** The game talks to a `Transport` (send bytes, receive bytes, connected or
not). Phase A ships two that use no network: an in-process pair with adjustable delay, jitter and loss (tests), and
a `BroadcastChannel` pair (two windows of one browser on one machine). Phase B adds the real one.

## Phase A: the shared climb, no network (started)

1. Player-against-player rules as pure functions in `src/game/player/` (solid sides, standable head that carries,
   shove on the ground, knock in the air), tuned in `game.config.ts`; with no other candle present every number is
   as before.
2. `src/game/netplay/`: the transport interface, a versioned message format, the session handshake (seed, options,
   version), the buffer that turns received states into a smooth remote candle, the shared clock, shove and world
   events, and the two network-free transports.
3. The endless scene draws the second candle (a different candle look), keeps the camera on the local candle, shows
   a small marker for the other player when they are off screen, and carries on alone if the other player leaves.
4. Switch: `?mp=host&room=NAME` and `?mp=join&room=NAME`, in production builds too. A multiplayer run never saves a
   best height (a head is a step up).

Acceptance tests:
- With the switch off, every chunk and the classic climb are unchanged (hash comparison against the base).
- Unit tests of the rules: stand on a head and be carried, jump from a head, push a standing candle off a ledge,
  a head-on hit in the air.
- Two simulated clients over the in-process transport at 0, 80 and 200 ms delay with jitter and 5% loss: the remote
  candle stays within a stated distance of the truth, a shove moves the other candle on both screens, nobody is
  pushed through a ledge, and nothing oscillates.
- Two browser pages over `BroadcastChannel`, driven headless: both reach `playing`, each sees the other move, no
  console errors; screenshots of both views.
- `npm run check`, `npm run build`, the ethos check, then game-qa.

## Phase B: two laptops (waits for the owner's choice)

Options for how the laptops find each other and exchange data. Names of services and libraries here are
**unverified** until the phase B builder checks them against their official documentation (binding rule 6).

| Option | What it needs | Works on | Notes |
|---|---|---|---|
| 1. Direct connection (WebRTC data channel), found through a free public signalling service | A new dependency; no account | Most home networks; can fail on strict networks (some campus and office Wi-Fi) because there is no relay | Lowest delay; depends on a service we do not run |
| 2. Our own small relay (a WebSocket room server on a free hosting tier) | The owner's account on a host, a deploy, a URL in the build | Every network that allows HTTPS | A little more delay; about a hundred lines of server code in the repo; the only option that always connects |
| 3. Both: direct first, relay as the fallback | Everything in 1 and 2 | Every network | Most work |

Lead's recommendation: option 1 first (it can be tried the same day, with no account), option 2 added if a real
pair of networks fails to connect.

Phase B also adds: the room code flow, reconnection, a version check, and the `AGENTS.md` exception text.

## Files

- New: `src/game/netplay/*`, `src/game/player/versus.ts` (or similar), tests under `src/game/__tests__/`.
- Changed: `src/game/player/movement.ts`, `types.ts`, `src/game/scenes/endless-scene.ts`, `src/game/index.ts`,
  `src/config/game.config.ts`, `src/game/INDEX.md`, `src/config/INDEX.md`.
- Shared files (small, typed, each in its own commit): `src/shared/contracts/config.ts` (a `GameConfig` field for
  the rules), `src/main.ts` (reads the switch), `src/ui/strings.ts` (status lines).
- No new dependency in phase A. Phase B adds at most one.

## Risks

- **The two screens disagree about a collision.** Each sees the other late. Mitigation: events carry the shove, the
  receiver applies it once; tests at 200 ms.
- **Standing on a head that is itself moving** can jitter. Mitigation: the remote candle is smoothed, and carries
  the rider like a moving ledge.
- **Merge conflicts with the wall fixes**, which touch the same player and scene files. Mitigation: wall fixes
  merge first; the multiplayer branch merges `game-only` in (never a rebase).
- **A real connection cannot be tested by the agents.** Phase B's last check is two people on two laptops.
- **Rule 3** (nothing on the play path uses the network): phase B needs the exception written into `AGENTS.md`.

## Time estimate

Phase A: one long builder session plus QA. Phase B: one builder session plus a test by two people.
