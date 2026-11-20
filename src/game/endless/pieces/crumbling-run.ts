/**
 * Crumbling run: two to four crumbling ledges in a row, each a small hop from the last (Decision D-36).
 *
 * Why it is hard: each ledge falls 400 ms after you land on it, which is time for a small charge and no
 * more, so you must decide the next hop before you land and cannot stop to think. The kit holds every
 * step from a crumbling ledge to that time, counting the walk from where you land to the takeoff, and the
 * replay runs the ledge's own timer (route-replay.ts). The run ends with a small hop onto a firm ledge.
 */
import type { Piece } from './types';
import { lastLedge, roomier } from './shared';

export const CRUMBLING_RUN: Piece = {
  id: 'crumbling-run',
  label: 'crumbling run: small hops across ledges that fall as you land',
  build(kit, entry, run) {
    const tuning = kit.tuning.crumblingRun;
    const count = kit.count(tuning.ledges);
    let direction = roomier(kit, entry);
    let laid = 0;
    const hop = (): ReturnType<typeof kit.place> => {
      const from = lastLedge(run, entry);
      const spec = () => ({
        risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(tuning.widthScale), levels: tuning.levels,
        minDxPx: tuning.minHopPx, jitter01: 0.5,
      });
      let ledge = kit.place(run, from, spec);
      // Out of room that way (a wall): turn back once.
      if (!ledge) { direction = -direction as -1 | 1; ledge = kit.place(run, from, spec); }
      return ledge;
    };
    for (let i = 0; i < count; i++) {
      const ledge = hop();
      if (!ledge) break;
      if (!kit.makeCrumbling(run, ledge)) return false;
      laid++;
    }
    // The run ends on firm ground: one more small hop onto an ordinary ledge, so what follows starts from rest.
    return laid >= tuning.ledges[0] && hop() !== null;
  },
};
