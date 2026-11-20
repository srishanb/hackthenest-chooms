/**
 * Who applies a shove or a knock, so one contact moves each candle once on both screens, whatever the delay.
 *
 * Each game sees its own candle as it really is and the other one slightly in the past, so the two games may
 * notice the same contact at different moments, or only one of them may notice it. The rules:
 *   - Shove (both standing, one walks into the other): only the pusher's game notices it, after a physics step
 *     that left its candle pressed against the other (`shoveDirection`), and it sends a shove to the pushed player
 *     every `shoveRepeatMs` while the contact lasts. The pushed player's game pushes its own candle at `shoveSpeed01`
 *     of walking speed until `shoveHoldMs` after the latest shove arrived. The pusher stays blocked by the other
 *     candle and follows it as its new place arrives, so both screens agree. A repeat of the same shove only renews
 *     the same window: it can never push twice as far. A shove older than `maxEventAgeMs` on arrival is dropped.
 *   - Knock (they meet fast, one in the air): the first game to notice applies its own half at once and sends the
 *     other half, stamped with the contact's shared time. Contacts are told apart by that time, not by when a message
 *     arrives: a knock whose contact lies within `sameContactMs` of the contact this candle last took a knock for is
 *     the same contact, and is ignored; so is a new local notice within that time. `sameContactMs` covers the most
 *     the two games can disagree about when a contact happened (the knock window plus the longest playback delay).
 *     A received knock is applied however late it arrives (up to `maxEventAgeMs + sameContactMs` after the contact,
 *     which covers several resends at long delays), so the other candle is never knocked alone. Its size is clamped
 *     to `knock.maxImpulse` again here.
 *   - A rider and the candle it stands on never knock each other (`riding`): from the moment one stands on the
 *     other's head until this candle stands somewhere else (or `PAIR_MAX_MS` after they last touched as a pair),
 *     no knock between them is noticed or applied. So a carrier can jump with a rider on its head (the rider falls),
 *     and a rider's jump from a head is an ordinary jump.
 * The pure physics are in src/game/player/versus.ts; this file only keeps the timing.
 */
import type { VersusConfig } from '../../shared/contracts/config';
import { applyKnock, knockBetween, riding, shoveDirection, type Knock, type OtherBody } from '../player/versus';
import type { PlayerInput, PlayerState } from '../player/types';
import type { NetEvent } from './protocol';

type Outgoing = Extract<NetEvent, { kind: 'shove' } | { kind: 'knock' }>;

/** A rider and its carrier stay a pair (no knocks between them) at most this long after they last touched as one (ms). */
const PAIR_MAX_MS = 3000;

export interface ContactArbiter {
  /**
   * Before a physics step at shared time `nowMs`: apply knocks that arrived and notice a new knock against `other`.
   * Returns the candle to step, the shove speed for this step, and the events to send (a knock's contact time is
   * `nowMs`).
   */
  beforeStep(state: PlayerState, other: OtherBody | null, nowMs: number): { state: PlayerState; pushVx: number; send: Outgoing[] };
  /** After the step: a shove to send when the step left this candle walking into the standing `other`. */
  afterStep(state: PlayerState, input: PlayerInput, other: OtherBody | null, nowMs: number): Outgoing[];
  /** A shove or knock from the other game, stamped `sentMs` (a knock: its contact time), arrived at `nowMs`. */
  receive(event: Outgoing, sentMs: number, nowMs: number): void;
  /** How many knocks this candle has taken (for tests and the dev readout). */
  knocksTaken(): number;
}

/** A knock's change of speed, clamped to `maxImpulse` in length. */
function clampKnock(change: Knock, maxImpulse: number): Knock {
  const size = Math.hypot(change.dvx, change.dvy);
  if (!(size > maxImpulse)) return change;
  return { dvx: (change.dvx / size) * maxImpulse, dvy: (change.dvy / size) * maxImpulse };
}

export function createContactArbiter(rules: VersusConfig, body: { width: number; height: number }, walkSpeed: number, stepMs: number,
  sameContactMs: number = rules.knock.contactWindowMs): ContactArbiter {
  let lastContactMs = Number.NEGATIVE_INFINITY;
  let lastShoveSentMs = Number.NEGATIVE_INFINITY;
  let push: { vx: number; untilMs: number } = { vx: 0, untilMs: Number.NEGATIVE_INFINITY };
  let waiting: { change: Knock; contactMs: number }[] = [];
  let paired = false;
  let pairedSeenMs = Number.NEGATIVE_INFINITY;
  let taken = 0;

  /** True when a contact at `contactMs` is the one this candle already took a knock for. */
  const sameContact = (contactMs: number): boolean => Math.abs(contactMs - lastContactMs) < sameContactMs;
  /** Apply a knock to this candle: a standing candle knocked sideways slides instead. */
  const knock = (state: PlayerState, change: Knock, contactMs: number, nowMs: number): PlayerState => {
    const out = applyKnock(state, clampKnock(change, rules.knock.maxImpulse), body.height);
    if (out.slideVx !== 0) push = { vx: out.slideVx, untilMs: nowMs + rules.knock.groundSlideMs };
    lastContactMs = contactMs;
    taken++;
    return out.state;
  };

  return {
    beforeStep(state, other, nowMs) {
      if (other && riding(state, other)) { paired = true; pairedSeenMs = nowMs; }
      else if (paired && (state.grounded || nowMs - pairedSeenMs > PAIR_MAX_MS)) paired = false;
      let next = state;
      const send: Outgoing[] = [];
      for (const { change, contactMs } of waiting) {
        if (paired || sameContact(contactMs) || nowMs - contactMs > rules.maxEventAgeMs + sameContactMs) continue;
        next = knock(next, change, contactMs, nowMs);
      }
      waiting = [];
      if (other && !paired && !sameContact(nowMs)) {
        const hit = knockBetween(next, other, body, rules, stepMs / 1000);
        if (hit) {
          next = knock(next, hit.mine, nowMs, nowMs);
          send.push({ kind: 'knock', dvx: hit.theirs.dvx, dvy: hit.theirs.dvy });
        }
      }
      return { state: next, pushVx: nowMs < push.untilMs ? push.vx : 0, send };
    },
    afterStep(state, input, other, nowMs) {
      const dir = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;
      const shove = other ? shoveDirection(state, dir, other, body) : 0;
      if (shove === 0 || nowMs - lastShoveSentMs < rules.shoveRepeatMs) return [];
      lastShoveSentMs = nowMs;
      return [{ kind: 'shove', dir: shove }];
    },
    receive(event, sentMs, nowMs) {
      if (event.kind === 'shove') {
        if (nowMs - sentMs > rules.maxEventAgeMs) return;
        push = { vx: event.dir * rules.shoveSpeed01 * walkSpeed, untilMs: nowMs + rules.shoveHoldMs };
      } else waiting.push({ change: { dvx: event.dvx, dvy: event.dvy }, contactMs: Math.min(sentMs, nowMs) });
    },
    knocksTaken: () => taken,
  };
}
