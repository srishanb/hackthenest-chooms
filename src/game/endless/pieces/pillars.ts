/**
 * Pillar hops: a row of very narrow ledges at nearly one height, three or four hops long.
 *
 * Why it is hard: each pillar is narrower than any ordinary ledge, so the charge has to be right to
 * a few pixels, and you land with no room to walk. It is precision instead of height.
 */
import type { Piece } from './types';
import { lastLedge, roomier } from './shared';

export const PILLARS: Piece = {
  id: 'pillars',
  label: 'pillar hops: a row of very narrow ledges',
  build(kit, entry, run) {
    const tuning = kit.tuning.pillars;
    const hops = kit.count(tuning.hops);
    const direction = roomier(kit, entry);
    for (let i = 0; i < hops; i++) {
      const from = lastLedge(run, entry);
      const ledge = kit.place(run, from, () => ({
        risePx: tuning.risePx, direction, widthPx: tuning.widthPx, minDxPx: tuning.minHopPx, jitter01: 0.5,
      }));
      if (!ledge) break;
    }
    return run.steps.length >= tuning.hops[0];
  },
};
