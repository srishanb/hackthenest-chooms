/**
 * Publishes the game's public state (`GameSnapshot`) for the UI and audio.
 *
 * Why only changed fields: every `store.set` wakes every subscriber, so writing 60 times a second
 * would redraw the HUD for nothing. This replaces the snapshot only when a field really differs,
 * and leaves `phase`, `ember` and `promptKey` (owned elsewhere) untouched.
 */
import type { Store } from '../../shared/store';
import type { GameSnapshot } from '../../shared/contracts/game-state';

export type SnapshotPatch = Partial<Pick<GameSnapshot, 'sectionId' | 'inRefuge' | 'altitude01' | 'navigation'>>;

/** Altitude changes smaller than this are not worth a store update. */
const ALTITUDE_EPSILON = 0.005;

export function writeSnapshot(store: Store<GameSnapshot>, patch: SnapshotPatch): void {
  const current = store.get();
  const changed =
    (patch.navigation !== undefined && JSON.stringify(patch.navigation) !== JSON.stringify(current.navigation)) ||
    (patch.sectionId !== undefined && patch.sectionId !== current.sectionId) ||
    (patch.inRefuge !== undefined && patch.inRefuge !== current.inRefuge) ||
    (patch.altitude01 !== undefined && Math.abs(patch.altitude01 - current.altitude01) >= ALTITUDE_EPSILON);
  if (changed) store.set({ ...current, ...patch });
}
