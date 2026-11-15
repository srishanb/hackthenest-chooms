/** Optional, once-per-run wax rewards: collect a droplet for a short, non-stacking light boost. */
import { WAX_CONFIG } from '../../config/wax.config';
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';
import { createMemorySaveStorage } from '../save';
import type { SaveStorage } from '../save';
import { getPlatformType } from '../world/platform-types/registry';

export const WAX_STORAGE_KEY = 'lighten.wax.v1';
export interface WaxDrop { id: string; x: number; y: number }

/** Co-located section-boundary ledges share one collectible. The starting floor gets none. */
export function makeWaxDrops(platforms: readonly PlatformData[], gameConfig: GameConfig): WaxDrop[] {
  const lowestY = Math.max(...platforms.map((platform) => platform.y));
  const seen = new Set<string>();
  return platforms.flatMap((platform) => {
    const type = getPlatformType(platform.type);
    const key = `${platform.x}:${platform.y}:${platform.width}:${platform.height}`;
    if (!type?.stationary || seen.has(key) || platform.width < gameConfig.player.width ||
      (platform.y === lowestY && platform.width >= gameConfig.view.width)) return [];
    seen.add(key);
    return [{ id: `wax:${platform.id}`, x: platform.x,
      y: platform.y - platform.height / 2 - gameConfig.player.height / 2 - WAX_CONFIG.hoverPx }];
  });
}

export function createWaxRewards({ platforms, gameConfig, bus, snapshot, storage = createMemorySaveStorage(), config = WAX_CONFIG }: {
  platforms: readonly PlatformData[]; gameConfig: GameConfig; bus: EventBus; snapshot: Store<GameSnapshot>;
  storage?: SaveStorage; config?: typeof WAX_CONFIG;
}) {
  const drops = makeWaxDrops(platforms, gameConfig);
  const known = new Set(drops.map((drop) => drop.id));
  let collected = new Set<string>();
  try {
    const saved: unknown = JSON.parse(storage.getItem(WAX_STORAGE_KEY) ?? '[]');
    if (Array.isArray(saved)) collected = new Set(saved.filter((id): id is string => typeof id === 'string' && known.has(id)));
  } catch { /* Storage is optional; keep rewards playable in memory. */ }
  let boostMs = 0;
  let heldRadius: number | null = null;
  function publish(): void {
    const wax = { collected: collected.size, total: drops.length, boostRemainingMs: Math.ceil(boostMs / 1000) * 1000 };
    const previous = snapshot.get().wax;
    if (previous?.collected !== wax.collected || previous?.total !== wax.total || previous?.boostRemainingMs !== wax.boostRemainingMs) {
      snapshot.set({ ...snapshot.get(), wax });
    }
  }
  function clearSaved(): void {
    try { storage.removeItem(WAX_STORAGE_KEY); } catch { /* Continue in memory. */ }
  }
  publish();
  return {
    drops,
    isCollected: (id: string): boolean => collected.has(id),
    update(player: { x: number; y: number }, dtMs: number): void {
      if (snapshot.get().phase !== 'playing') return;
      if (Number.isFinite(dtMs) && dtMs > 0) boostMs = Math.max(0, boostMs - dtMs);
      for (const drop of drops) {
        if (collected.has(drop.id) || Math.abs(player.x - drop.x) > gameConfig.player.width / 2 + config.pickupRadiusPx ||
          Math.abs(player.y - drop.y) > gameConfig.player.height / 2 + config.pickupRadiusPx) continue;
        collected.add(drop.id); boostMs = config.boostMs;
        try { storage.setItem(WAX_STORAGE_KEY, JSON.stringify([...collected])); } catch { /* Continue in memory. */ }
        bus.emit({ type: 'wax_collected', id: drop.id, x: drop.x, y: drop.y, collected: collected.size, total: drops.length });
      }
      publish();
    },
    /** A boost expiring or being collected in flight cannot change the light until landing. */
    lightRadius(base: number, airborne: boolean): number {
      const desired = boostMs > 0 ? Math.max(base, Math.min(config.maxLightRadiusPx, base * config.lightMultiplier)) : base;
      if (!airborne || heldRadius === null) heldRadius = desired;
      return heldRadius;
    },
    reset(): void { collected.clear(); boostMs = 0; heldRadius = null; clearSaved(); publish(); },
    finish(): void { clearSaved(); },
  };
}
