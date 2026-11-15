/**
 * Falling has no death (FAL-1): a fall just ends when you land. This turns a landing into events.
 *
 * Every landing emits `land`. A landing at least `minFallPxToOffer` below the takeoff ledge also
 * emits `fall`, with `big` when it is at least `bigFallPx`. Nothing here resets the player, takes
 * health or emits `section_reset`: the recovery ember (P6) is the only way back up.
 */
import type { EmberConfig } from '../../shared/contracts/config';
import type { GameEvent } from '../../shared/contracts/events';
import type { StepEvents } from '../player/types';

export function landingEvents(landed: NonNullable<StepEvents['landed']>, config: EmberConfig): GameEvent[] {
  const events: GameEvent[] = [{ type: 'land', platformId: landed.platformId, fallHeightPx: landed.fallHeightPx }];
  if (landed.fallHeightPx >= config.minFallPxToOffer) {
    events.push({ type: 'fall', heightPx: landed.fallHeightPx, big: landed.fallHeightPx >= config.bigFallPx });
  }
  return events;
}
