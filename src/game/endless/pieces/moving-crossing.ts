/**
 * Moving crossing: a sideways crossing over a ledge that slides left and right.
 *
 * Why it is interesting: it is the first time the main path itself moves. You must time the jump onto
 * it, ride it, and jump off while it carries you. The kit checks the landing and the takeoff at both
 * ends of the ledge's travel, and with the most the ledge can carry you while you charge.
 */
import type { Piece } from './types';
import { roomier } from './shared';

export const MOVING_CROSSING: Piece = {
  id: 'moving-crossing',
  label: 'moving crossing: over a sliding ledge',
  build(kit, entry, run) {
    const tuning = kit.tuning.movingCrossing;
    const direction = roomier(kit, entry);
    const width = Math.round(kit.ledgeWidth());
    const distance = Math.min(kit.between(tuning.distancePx), width / 2 - kit.game.player.width - 8);
    if (distance < tuning.distancePx[0]) return false;
    const mover = kit.place(run, entry, () => ({ risePx: tuning.risePx, direction, widthPx: width, jitter01: 0 }));
    if (!mover) return false;
    const moving = kit.makeMoving(run, mover, distance, kit.between(tuning.periodMs));
    if (!moving) return false;
    // Lower charges off the mover: a short hold means it carries you less far.
    return kit.place(run, moving, () => ({
      risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), levels: [kit.config.minChargeLevel, 8], jitter01: 0.3,
    })) !== null;
  },
};
