/**
 * Falling has no death (FAL-1): a fall just ends when you land. This turns a landing into events.
 *
 * Every landing emits `land`. A landing at least `minFallPxToOffer` below the takeoff ledge also
 * emits `fall`, with `big` when it is at least `bigFallPx`. A fall that ends on a bounce cap emits the same
 * `fall` (`bounceEvents`), with no `land`. Nothing here resets the player, takes
 * health or emits `section_reset`: the recovery ember (P6) is the only way back up.
 */
import type { EmberConfig } from '../../shared/contracts/config';
import type { GameEvent } from '../../shared/contracts/events';
import type { StepEvents } from '../player/types';

/**
 * A fall that ended on a bounce cap: the candle never lands there, so no `land`, but the fall counts with its
 * full height exactly as a landing's would (`fall`, and `big` from `bigFallPx`).
 */
export function bounceEvents(bounced: NonNullable<StepEvents['bounced']>, config: EmberConfig): GameEvent[] {
  return landingEvents({ platformId: bounced.platformId, fallHeightPx: bounced.fallHeightPx }, config).filter((event) => event.type !== 'land');
}

export function landingEvents(landed: NonNullable<StepEvents['landed']>, config: EmberConfig): GameEvent[] {
  const events: GameEvent[] = [{ type: 'land', platformId: landed.platformId, fallHeightPx: landed.fallHeightPx }];
  if (landed.fallHeightPx >= config.minFallPxToOffer) {
    events.push({ type: 'fall', heightPx: landed.fallHeightPx, big: landed.fallHeightPx >= config.bigFallPx });
  }
  return events;
}
