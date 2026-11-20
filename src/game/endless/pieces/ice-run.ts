/**
 * Ice run (snow bands only): hops between icy ledges, each jump taken from the far edge of the ice.
 *
 * Why it is hard: ice changes walking, not jumping. You land, and the takeoff is near the far edge,
 * so you must walk across the ice and stop in time; too much speed and you slide off the end.
 */
import type { Piece } from './types';
import { lastLedge, roomier } from './shared';

export const ICE_RUN: Piece = {
  id: 'ice-run',
  label: 'ice run: icy ledges, each jump from the far edge',
  build(kit, entry, run) {
    const tuning = kit.tuning.iceRun;
    const hops = kit.count(tuning.hops);
    const direction = roomier(kit, entry);
    for (let i = 0; i < hops; i++) {
      const from = lastLedge(run, entry);
      const ledge = kit.place(run, from, () => ({
        risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), takeoff: 'front',
      }));
      if (!ledge) break;
      // Ice only changes walking; every stored jump starts standing still, so it still lands.
      const ice01 = Math.round(kit.between(tuning.ice01) * 100) / 100;
      run.ledges[run.ledges.indexOf(ledge)] = { ...ledge, type: 'slippery', ice01 };
    }
    return run.steps.length >= tuning.hops[0];
  },
};
