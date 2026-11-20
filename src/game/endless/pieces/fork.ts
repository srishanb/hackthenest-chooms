/**
 * Fork: two ways up that meet again. The safe way is three ordinary jumps; the risky way is two big
 * jumps through one narrow ledge, and that ledge holds wax.
 *
 * Why it is interesting: it is a choice. A careful climber takes the long way; a confident one saves
 * time and earns the wax on the narrow ledge, at the risk of a fall. Both ways are replayed with the
 * real physics; the main route (the one the bot follows) is the safe one.
 */
import type { Piece } from './types';
import { roomier } from './shared';

export const FORK: Piece = {
  id: 'fork',
  label: 'fork: a safe long way and a risky short way that rejoin',
  build(kit, entry, run) {
    const tuning = kit.tuning.fork;
    const direction = roomier(kit, entry);
    const height = Math.round(kit.between(tuning.rejoinPx));
    // The risky way: a big jump onto a narrow ledge, then a big jump back over onto the rejoin ledge.
    const firstRise = Math.min(kit.maxRisePx, height - kit.config.rise.minPx);
    const risky = kit.place(run, entry, () => ({
      risePx: [firstRise * 0.8, firstRise], direction, widthPx: tuning.riskyWidthPx, kind: 'a',
    }), true);
    if (!risky) return false;
    const rest = height - ((entry.y - entry.height / 2) - (risky.y - risky.height / 2));
    const rejoin = kit.place(run, risky, () => ({
      risePx: [Math.max(kit.config.rise.minPx, rest - 16), Math.max(kit.config.rise.minPx, rest + 16)],
      direction: -direction as -1 | 1, widthPx: kit.ledgeWidth(),
    }), true);
    if (!rejoin) return false;
    run.waxOn.push(risky.id);
    // The safe way: ordinary jumps on the other side, then a jump onto the rejoin ledge.
    const jumps = kit.count(tuning.safeJumps);
    const total = (entry.y - entry.height / 2) - (rejoin.y - rejoin.height / 2);
    for (let tries = 0; tries < 3; tries++) {
      const ledges = run.ledges.length;
      let from = entry;
      let ok = true;
      for (let i = 0; i < jumps - 1 && ok; i++) {
        const riseLeft = total - ((entry.y - entry.height / 2) - (from.y - from.height / 2));
        const share = riseLeft / (jumps - i);
        const next = kit.place(run, from, () => ({
          risePx: [Math.max(kit.config.rise.minPx, share - 20), Math.max(kit.config.rise.minPx, share + 12)],
          direction: i === 0 ? (-direction as -1 | 1) : (kit.random() < 0.5 ? 0 : direction), widthPx: kit.ledgeWidth(),
        }));
        if (next) from = next; else ok = false;
      }
      if (ok && kit.link(run, from, rejoin)) return true;
      // Take the safe way back and try it again.
      const kept = new Set(run.ledges.slice(0, ledges).map((ledge) => ledge.id));
      run.ledges.length = ledges;
      run.steps = run.steps.filter((step) => kept.has(step.toId) && step.toId !== rejoin.id);
    }
    return false;
  },
};
