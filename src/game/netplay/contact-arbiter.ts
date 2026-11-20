/**
 * Who applies a shove or a knock, so one contact moves each candle once on both screens, whatever the delay.
 *
 * Each game sees its own candle as it really is and the other one slightly in the past, so the two games may
 * notice the same contact at different moments, or only one of them may notice it. The rules:
 *   - Shove (both standing, one walks into the other): only the pusher's game notices it (`shoveDirection`), and it
 *     sends a shove to the pushed player every `shoveRepeatMs` while the contact lasts. The pushed player's game
 *     pushes its own candle at `shoveSpeed01` of walking speed until `shoveHoldMs` after the latest shove arrived.
 *     The pusher stays blocked by the other candle and follows it as its new place arrives, so both screens agree.
 *     A repeat of the same shove only renews the same window: it can never push twice as far.
 *   - Knock (they meet fast, one in the air): the first game to notice applies its own half at once and sends the
 *     other half. A game that has taken a knock (its own or a received one) ignores every other knock for
 *     `contactWindowMs`, so when both notice the same contact, each candle still changes speed once.
 *   - A shove or knock older than `maxEventAgeMs` when it arrives is dropped: late is worse than never here.
 * The pure physics are in src/game/player/versus.ts; this file only keeps the timing.
 */
import type { VersusConfig } from '../../shared/contracts/config';
import { applyKnock, knockBetween, shoveDirection, type OtherBody } from '../player/versus';
import type { PlayerInput, PlayerState } from '../player/types';
import type { NetEvent } from './protocol';

type Outgoing = Extract<NetEvent, { kind: 'shove' } | { kind: 'knock' }>;

export interface ContactArbiter {
  /**
   * Before a physics step at shared time `nowMs`: apply knocks that arrived, notice a new knock or a shove against
   * `other`. Returns the candle to step, the shove speed for this step, and the events to send.
   */
  beforeStep(state: PlayerState, input: PlayerInput, other: OtherBody | null, nowMs: number): { state: PlayerState; pushVx: number; send: Outgoing[] };
  /** A shove or knock from the other game, sent at shared time `sentMs`, arrived at `nowMs`. */
  receive(event: Outgoing, sentMs: number, nowMs: number): void;
  /** How many knocks this candle has taken (for tests and the dev readout). */
  knocksTaken(): number;
}

export function createContactArbiter(rules: VersusConfig, body: { width: number; height: number }, walkSpeed: number, stepMs: number): ContactArbiter {
  let lastKnockMs = Number.NEGATIVE_INFINITY;
  let lastShoveSentMs = Number.NEGATIVE_INFINITY;
  let push: { vx: number; untilMs: number } = { vx: 0, untilMs: Number.NEGATIVE_INFINITY };
  let waiting: { dvx: number; dvy: number }[] = [];
  let taken = 0;

  const inWindow = (nowMs: number): boolean => nowMs - lastKnockMs < rules.knock.contactWindowMs;
  /** Apply a knock to this candle: a standing candle knocked sideways slides instead. */
  const knock = (state: PlayerState, change: { dvx: number; dvy: number }, nowMs: number): PlayerState => {
    const out = applyKnock(state, change, body.height);
    if (out.slideVx !== 0) push = { vx: out.slideVx, untilMs: nowMs + rules.knock.groundSlideMs };
    lastKnockMs = nowMs;
    taken++;
    return out.state;
  };

  return {
    beforeStep(state, input, other, nowMs) {
      let next = state;
      const send: Outgoing[] = [];
      for (const change of waiting) if (!inWindow(nowMs)) next = knock(next, change, nowMs);
      waiting = [];
      if (other && !inWindow(nowMs)) {
        const hit = knockBetween(next, other, body, rules, stepMs / 1000);
        if (hit) {
          next = knock(next, hit.mine, nowMs);
          send.push({ kind: 'knock', dvx: hit.theirs.dvx, dvy: hit.theirs.dvy });
        }
      }
      const dir = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;
      const shove = other ? shoveDirection(next, dir, other, body) : 0;
      if (shove !== 0 && nowMs - lastShoveSentMs >= rules.shoveRepeatMs) {
        lastShoveSentMs = nowMs;
        send.push({ kind: 'shove', dir: shove });
      }
      return { state: next, pushVx: nowMs < push.untilMs ? push.vx : 0, send };
    },
    receive(event, sentMs, nowMs) {
      if (nowMs - sentMs > rules.maxEventAgeMs) return;
      if (event.kind === 'shove') push = { vx: event.dir * rules.shoveSpeed01 * walkSpeed, untilMs: nowMs + rules.shoveHoldMs };
      else waiting.push({ dvx: event.dvx, dvy: event.dvy });
    },
    knocksTaken: () => taken,
  };
}
