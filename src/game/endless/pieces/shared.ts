/**
 * Small helpers several set pieces share: the ledge a piece is standing on now, and which way has room.
 *
 * Why: each piece reads "the last ledge of my main path" and "which side of the screen is open" the
 * same way; one copy keeps them from drifting apart.
 */
import type { PlatformData } from '../../../shared/contracts/content';
import type { PieceKit, PieceRun } from './types';

/** The ledge at the end of the run's main path, or the entry ledge when the run is empty. */
export function lastLedge(run: PieceRun, entry: PlatformData): PlatformData {
  const step = run.steps.at(-1);
  return step ? run.ledges.find((ledge) => ledge.id === step.toId) ?? entry : entry;
}

/** The side of `ledge` with more open screen, -1 (left) or 1 (right). */
export function roomier(kit: PieceKit, ledge: PlatformData): -1 | 1 {
  return ledge.x < kit.worldWidth / 2 ? 1 : -1;
}

/** A random direction, -1 or 1. */
export function eitherWay(kit: PieceKit): -1 | 1 {
  return kit.random() < 0.5 ? -1 : 1;
}
