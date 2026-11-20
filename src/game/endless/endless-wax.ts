/**
 * Wax in endless mode: every drop sits at a generated spot and can be picked up once per run.
 *
 * Why not the classic wax rewards: those keep one drop alive on a fixed list of ledges and respawn
 * it on a timer. Here drops come and go with the chunks, so this keeps only the set of collected
 * ids (a chunk that is rebuilt after a fall must not hand its wax out again) and tells the scene
 * what was picked up. It publishes the same `wax` snapshot field and `wax_collected` event the HUD
 * and audio already listen to.
 */
import { NETPLAY_CONFIG } from '../../config/netplay.config';
import { WAX_CONFIG } from '../../config/wax.config';
import type { GameConfig } from '../../shared/contracts/config';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';
import type { WaxSpot } from './generator';

export function createEndlessWax({ gameConfig, bus, snapshot }: { gameConfig: GameConfig; bus: EventBus; snapshot: Store<GameSnapshot> }) {
  const collected = new Set<string>();
  /**
   * Two-player climb: drops the other player took. Hidden and out of reach here, but not counted as this player's.
   * At most `maxRemoteWax` of them (the oldest is forgotten past it): the other window's messages are untrusted.
   */
  const elsewhere = new Set<string>();
  const hideElsewhere = (id: string): void => {
    elsewhere.add(id);
    for (const old of elsewhere) { if (elsewhere.size <= NETPLAY_CONFIG.maxRemoteWax) break; elsewhere.delete(old); }
  };
  function publish(): void {
    const current = snapshot.get();
    if (current.wax?.collected === collected.size && current.wax.total === null) return;
    snapshot.set({ ...current, wax: { collected: collected.size, total: null, boostRemainingMs: 0 } });
  }
  publish();
  return {
    count: (): number => collected.size,
    isCollected: (id: string): boolean => collected.has(id) || elsewhere.has(id),
    /** Pick up every live drop the body touches. Returns the drops taken this step. */
    update(player: { x: number; y: number }, drops: readonly WaxSpot[]): WaxSpot[] {
      const taken: WaxSpot[] = [];
      for (const drop of drops) {
        if (collected.has(drop.id) || elsewhere.has(drop.id)) continue;
        if (Math.abs(player.x - drop.x) > gameConfig.player.width / 2 + WAX_CONFIG.pickupRadiusPx ||
          Math.abs(player.y - drop.y) > gameConfig.player.height / 2 + WAX_CONFIG.pickupRadiusPx) continue;
        collected.add(drop.id);
        taken.push(drop);
        bus.emit({ type: 'wax_collected', id: drop.id, x: drop.x, y: drop.y, collected: collected.size, total: null });
      }
      if (taken.length) publish();
      return taken;
    },
    reset(): void { collected.clear(); publish(); },
    /** Two-player climb: the other player took this drop (hide it), or it is free again (show it). */
    takenElsewhere(id: string, taken: boolean): void { if (taken) hideElsewhere(id); else elsewhere.delete(id); },
    /** Two-player climb: this player's pickup lost to an earlier claim; it no longer counts. True if it was counted. */
    revoke(id: string): boolean { const had = collected.delete(id); hideElsewhere(id); if (had) publish(); return had; },
  };
}
