/**
 * Who gets a wax drop when both players reach for it: the first claim wins.
 *
 * Each game grants its own pickup at once (no waiting on the other side) and tells the other game, stamped with
 * the shared clock. When both claimed the same drop, the earlier stamp wins (the host on an exact tie), and both
 * games reach the same verdict from the same two stamps. The loser's pickup is undone: its wax count goes back
 * down and the fuel it gave is taken back (the scene does that), and the drop stays gone for both.
 * A drop the other player took is hidden for this player until that player starts a new run (`run_reset`), since
 * each run hands out its own wax. After every (re)connection each game sends its claims again (`sync`), so a player
 * who joins late, or comes back after a silence, cannot take a drop the other already has.
 */
import type { Role } from './protocol';

export type RemoteClaimVerdict = 'hide' | 'revoke' | 'ignore';

export interface WaxClaims {
  /** This player took `dropId` at shared time `atMs`. */
  claimLocal(dropId: string, atMs: number): void;
  /** The other player says it took `dropId` at `atMs` in its run `run`: what to do here. */
  onRemote(dropId: string, atMs: number, run: number): RemoteClaimVerdict;
  /** The other player started run `run`: the drops it took before are free again (returns their ids). */
  onRemoteReset(run: number): string[];
  /** This player started a new run: its own claims are gone. */
  resetLocal(): void;
  /** This player's claims in its run, for the `sync` sent after every (re)connection. */
  localClaims(): { id: string; atMs: number }[];
  /** A new other player (a reload): the drops the last one took are free again (returns their ids). */
  clearRemote(): string[];
}

export function createWaxClaims(role: Role): WaxClaims {
  const mine = new Map<string, number>();
  const theirs = new Map<string, number>();
  const remoteWins = (remoteAt: number, localAt: number): boolean => remoteAt < localAt || (remoteAt === localAt && role === 'guest');

  return {
    claimLocal(dropId, atMs) { if (!mine.has(dropId)) mine.set(dropId, atMs); },
    onRemote(dropId, atMs, run) {
      const localAt = mine.get(dropId);
      if (localAt !== undefined && !remoteWins(atMs, localAt)) return 'ignore';
      theirs.set(dropId, run);
      if (localAt === undefined) return 'hide';
      mine.delete(dropId);
      return 'revoke';
    },
    onRemoteReset(run) {
      const freed: string[] = [];
      for (const [id, claimRun] of theirs) if (claimRun < run) { theirs.delete(id); if (!mine.has(id)) freed.push(id); }
      return freed;
    },
    resetLocal() { mine.clear(); },
    localClaims: () => [...mine].map(([id, atMs]) => ({ id, atMs })),
    clearRemote() {
      const freed = [...theirs.keys()].filter((id) => !mine.has(id));
      theirs.clear();
      return freed;
    },
  };
}
