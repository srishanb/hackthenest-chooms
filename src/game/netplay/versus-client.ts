/**
 * The two-player climb's game logic for one player, without any drawing: what the scene calls around each
 * physics step and once a frame. Tests drive two of these against each other over the memory transport.
 *
 * Around a step: `beforeStep` builds the other candle's body at the step's shared time (with how far it moved, so
 * a rider is carried, and anchored on this candle's head while it rides it), lets the contact arbiter apply
 * knocks and notice shoves, and returns what `stepWorld` needs; `afterStep` tells the other game about a crumbling
 * ledge this candle started. Once a frame: `update` sends this candle and reads what arrived; `takeWorld` hands
 * the scene the crumbling ledges to start, the wax to hide or show and the pickups it lost.
 * Each player keeps their own fuel, wax, composure and end of run; only the world and the bodies are shared.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { CrumbleState } from '../player/crumble';
import type { StepEnvironment } from '../player/movement';
import type { PlayerInput, PlayerState } from '../player/types';
import { headId, isHeadId, type OtherBody } from '../player/versus';
import { createContactArbiter, type ContactArbiter } from './contact-arbiter';
import type { BodyState, Role } from './protocol';
import { startRemoteCrumble } from './remote-crumble';
import type { NetplaySession } from './session';
import { createWaxClaims, type WaxClaims } from './wax-claims';

/** How quickly the drawing slides onto (or off) this candle's head when the other candle starts or stops riding it. */
const ANCHOR_BLEND_MS = 100;

/** What the scene adds to its own state for the report: things the physics state does not hold. */
export interface LocalLook { charge01: number; aim: -1 | 0 | 1; fuel01: number; out: boolean; candleSeed: number }

export interface WorldChanges {
  crumble: CrumbleState;
  /** Wax drops the other player took: hide them. */
  hide: string[];
  /** Wax drops the other player took in a run they have since left: show them again. */
  show: string[];
  /** This player's pickups that lost to an earlier claim: undo them. */
  revoke: string[];
}

export interface VersusClient {
  role: Role;
  session: NetplaySession;
  /** The other candle's body at shared time `atMs` for this candle's physics, or null while there is none. */
  otherBody(atMs: number, me: PlayerState): OtherBody | null;
  /** The other candle to draw at `atMs` (where it is felt, as a state), without moving anything forward. */
  shownBody(atMs: number, me: PlayerState): BodyState | null;
  /** Before a physics step: the candle to step and the extra environment for `stepWorld`. */
  beforeStep(state: PlayerState, atMs: number): { state: PlayerState; versus: Pick<StepEnvironment, 'others' | 'pushVx'> };
  /**
   * After a physics step: a shove when the step left this candle walking into the other one, and the crumbling
   * ledges this candle started, are sent to the other game.
   */
  afterStep(state: PlayerState, input: PlayerInput, crumbleBefore: CrumbleState, crumbleAfter: CrumbleState): void;
  /** Once a frame: send this candle, read what arrived. */
  update(state: PlayerState, look: LocalLook): void;
  /** Once a frame, after `update`: what the other player changed in this world. */
  takeWorld(crumble: CrumbleState): WorldChanges;
  /** This candle picked up a drop. */
  waxTaken(dropId: string): void;
  /** This player started a new run. */
  runStarted(): void;
  /** For tests and the dev readout. */
  knocksTaken(): number;
}

export function createVersusClient(session: NetplaySession, gameConfig: GameConfig): VersusClient {
  const role = session.role;
  const otherRole: Role = role === 'host' ? 'guest' : 'host';
  const body = gameConfig.player;
  const stepMs = 1000 / gameConfig.stepHz;
  const arbiter: ContactArbiter | null = gameConfig.versus
    ? createContactArbiter(gameConfig.versus, body, gameConfig.walkSpeed, stepMs) : null;
  const claims: WaxClaims = createWaxClaims(role);
  let run = 0;
  let last: { x: number; y: number } | null = null;
  let anchor01 = 0, anchorAtMs = Number.NEGATIVE_INFINITY;
  /** The other candle's centre x at the latest step, so this candle's report can say where on its head it stands. */
  let headX: number | null = null;
  /** The other body of the latest step, for the shove check after it. */
  let stepOther: OtherBody | null = null;
  let stepAtMs = 0;
  const myHead = headId(role);

  /** The other body at `atMs`; `commit` (physics steps only) moves the blend and the carry forward. */
  function bodyAt(atMs: number, me: PlayerState, commit: boolean): { other: OtherBody; shown: BodyState } | null {
    const shown = session.status() === 'connected' ? session.remote(atMs) : null;
    if (!shown) { if (commit) { last = null; headX = null; } return null; }
    const b = shown.body;
    // While it rides this candle, it is drawn and felt on this candle's real head, not where it saw the head.
    const rides = b.platformId === myHead;
    const dt = Math.max(0, atMs - anchorAtMs);
    const blend = Math.max(0, Math.min(1, anchor01 + (rides ? 1 : -1) * Math.min(1, dt / ANCHOR_BLEND_MS)));
    const anchoredX = me.x + (b.rideOffsetX ?? 0), anchoredY = me.y - body.height;
    const x = b.x + (anchoredX - b.x) * blend, y = b.y + (anchoredY - b.y) * blend;
    const moved = last ? { dx: x - last.x, dy: y - last.y } : { dx: 0, dy: 0 };
    if (commit) { anchor01 = blend; anchorAtMs = atMs; last = { x, y }; headX = x; }
    return { other: { id: otherRole, x, y, vx: b.vx, vy: b.vy, width: body.width, height: body.height, grounded: b.grounded,
      ...moved, ridesMe: rides, tieSide: role === 'host' ? -1 : 1 }, shown: { ...b, x, y } };
  }
  const otherBody = (atMs: number, me: PlayerState): OtherBody | null => bodyAt(atMs, me, true)?.other ?? null;

  return {
    role,
    session,
    otherBody,
    shownBody: (atMs, me) => bodyAt(atMs, me, false)?.shown ?? null,
    beforeStep(state, atMs) {
      const other = otherBody(atMs, state);
      stepOther = other; stepAtMs = atMs;
      if (!arbiter) return { state, versus: other ? { others: [other] } : {} };
      const out = arbiter.beforeStep(state, other, atMs);
      for (const event of out.send) session.sendEvent(event);
      return { state: out.state, versus: { ...(other ? { others: [other] } : {}), ...(out.pushVx ? { pushVx: out.pushVx } : {}) } };
    },
    afterStep(state, input, before, after) {
      if (arbiter) for (const event of arbiter.afterStep(state, input, stepOther, stepAtMs)) session.sendEvent(event);
      if (after === before) return;
      for (const [id, timer] of after) if (!before.has(id) && timer.goneMs === null) session.sendEvent({ kind: 'crumble', ledgeId: id });
    },
    update(state, look) {
      const report: BodyState = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, grounded: state.grounded, platformId: state.platformId,
        charging: state.charging, charge01: look.charge01, aim: look.aim, fuel01: look.fuel01, out: look.out, candleSeed: look.candleSeed, run,
        ...(isHeadId(state.platformId) && headX !== null ? { rideOffsetX: state.x - headX } : {}) };
      session.update(report);
    },
    takeWorld(crumble) {
      const changes: WorldChanges = { crumble, hide: [], show: [], revoke: [] };
      const now = session.nowMs();
      for (const { atMs, event } of session.takeEvents()) {
        switch (event.kind) {
          case 'shove': case 'knock': arbiter?.receive(event, atMs, now); break;
          case 'crumble':
            if (gameConfig.ledgeKinds) changes.crumble = startRemoteCrumble(changes.crumble, event.ledgeId, now - atMs, gameConfig.ledgeKinds.crumble);
            break;
          case 'wax': {
            const verdict = claims.onRemote(event.dropId, atMs, event.run);
            if (verdict === 'hide') changes.hide.push(event.dropId);
            else if (verdict === 'revoke') { changes.hide.push(event.dropId); changes.revoke.push(event.dropId); }
            break;
          }
          case 'run_reset': changes.show.push(...claims.onRemoteReset(event.run)); break;
        }
      }
      return changes;
    },
    waxTaken(dropId) {
      const atMs = session.nowMs();
      claims.claimLocal(dropId, atMs);
      session.sendEvent({ kind: 'wax', dropId, run }, atMs);
    },
    runStarted() {
      run++;
      claims.resetLocal();
      session.sendEvent({ kind: 'run_reset', run });
    },
    knocksTaken: () => arbiter?.knocksTaken() ?? 0,
  };
}
