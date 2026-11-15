/** Replenishing wax rewards: one active drop, an uncapped run counter and a short light bonus. */
import { WAX_CONFIG } from '../../config/wax.config';
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';
import { createMemorySaveStorage } from '../save';
import type { SaveStorage } from '../save';
import { getPlatformType } from '../world/platform-types/registry';

export const WAX_STORAGE_KEY = 'lighten.wax.v3';
const LEGACY_KEY = 'lighten.wax.v2';
export interface WaxDrop { id: string; x: number; y: number }

/** Safe stationary ledges, including ice, hold wax. Reuse this bounded list each pickup. */
export function makeWaxDrops(platforms: readonly PlatformData[], gameConfig: GameConfig): WaxDrop[] {
  const lowestY = Math.max(...platforms.map((platform) => platform.y));
  const seen = new Set<string>();
  return platforms.flatMap((platform) => {
    const type = getPlatformType(platform.type);
    const key = `${platform.x}:${platform.y}:${platform.width}:${platform.height}`;
    if (!type?.anchorSafe || seen.has(key) || platform.width < gameConfig.player.width ||
      (platform.y === lowestY && platform.width >= gameConfig.view.width)) return [];
    seen.add(key);
    return [{ id: `wax:${platform.id}`, x: platform.x,
      y: platform.y - platform.height / 2 - gameConfig.player.height / 2 - WAX_CONFIG.hoverPx }];
  });
}

export function createWaxRewards({ platforms, gameConfig, bus, snapshot, storage = createMemorySaveStorage(), config = WAX_CONFIG, random = Math.random }: {
  platforms: readonly PlatformData[]; gameConfig: GameConfig; bus: EventBus; snapshot: Store<GameSnapshot>;
  storage?: SaveStorage; config?: typeof WAX_CONFIG; random?: () => number;
}) {
  const drops = makeWaxDrops(platforms, gameConfig);
  const known = new Set(drops.map((drop) => drop.id));
  let collected = 0;
  let activeId: string | null = null;
  let waitMs = 0;
  let boostMs = 0;
  let heldRadius: number | null = null;
  const unit = (): number => Math.max(0, Math.min(0.999999, random()));
  const delay = (): number => config.respawnMinMs + unit() * (config.respawnMaxMs - config.respawnMinMs);
  try {
    const current = storage.getItem(WAX_STORAGE_KEY);
    const saved: unknown = JSON.parse(current ?? storage.getItem(LEGACY_KEY) ?? 'null');
    if (saved && typeof saved === 'object' && 'collected' in saved) {
      if (current !== null && typeof saved.collected === 'number' && Number.isSafeInteger(saved.collected) && saved.collected >= 0 &&
        'activeId' in saved && (saved.activeId === null || typeof saved.activeId === 'string' && known.has(saved.activeId)) &&
        'waitMs' in saved && typeof saved.waitMs === 'number' && Number.isFinite(saved.waitMs) && saved.waitMs >= 0 && saved.waitMs <= config.respawnMaxMs) {
        collected = saved.collected; activeId = saved.activeId; waitMs = saved.waitMs;
      } else if (current === null && Array.isArray(saved.collected) && 'selected' in saved && Array.isArray(saved.selected)) {
        const oldCollected = new Set(saved.collected.filter((id): id is string => typeof id === 'string' && known.has(id)));
        collected = oldCollected.size;
        activeId = saved.selected.find((id): id is string => typeof id === 'string' && known.has(id) && !oldCollected.has(id)) ?? null;
        waitMs = activeId ? 0 : config.respawnMinMs;
      }
    }
  } catch { /* Optional storage: keep playing in memory. Never restore an old temporary boost. */ }
  function save(): void {
    try {
      storage.setItem(WAX_STORAGE_KEY, JSON.stringify({ collected, activeId, waitMs }));
      storage.removeItem(LEGACY_KEY);
    } catch { /* Continue in memory. */ }
  }
  function publish(): void {
    const wax = { collected, total: null, boostRemainingMs: Math.ceil(boostMs / 1000) * 1000 };
    const previous = snapshot.get().wax;
    if (previous?.collected !== wax.collected || previous?.total !== wax.total || previous?.boostRemainingMs !== wax.boostRemainingMs) snapshot.set({ ...snapshot.get(), wax });
  }
  const overlaps = (player: { x: number; y: number }, drop: WaxDrop): boolean =>
    Math.abs(player.x - drop.x) <= gameConfig.player.width / 2 + config.pickupRadiusPx &&
    Math.abs(player.y - drop.y) <= gameConfig.player.height / 2 + config.pickupRadiusPx;
  // World y grows downward. Use collision feet, not the animated/growing candle art.
  const atOrAboveFeet = (player: { y: number }, drop: WaxDrop): boolean => drop.y <= player.y + gameConfig.player.height / 2;
  let validateRestoredDrop = true;
  save(); publish();
  return {
    drops,
    isActive: (id: string): boolean => id === activeId,
    update(player: { x: number; y: number }, dtMs: number, benefit01 = 1): void {
      if (snapshot.get().phase !== 'playing') return;
      const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
      boostMs = Math.max(0, boostMs - dt);
      const benefit = Number.isFinite(benefit01) ? Math.max(0, Math.min(1, benefit01)) : 1;
      if (benefit === 0) boostMs = 0;
      if (validateRestoredDrop) {
        const restored = drops.find((drop) => drop.id === activeId);
        if (restored && !atOrAboveFeet(player, restored)) { activeId = null; save(); }
        validateRestoredDrop = false;
      }
      const active = drops.find((drop) => drop.id === activeId);
      if (active && overlaps(player, active)) {
        collected++; activeId = null; waitMs = delay(); boostMs = config.boostMs * benefit;
        save();
        bus.emit({ type: 'wax_collected', id: `${active.id}:${collected}`, x: active.x, y: active.y, collected, total: null });
      } else if (active && Math.abs(active.y - player.y) > config.retireRangePx) {
        // A missed drop far behind must not strand the only spawn in an earlier stage.
        activeId = null; waitMs = delay(); save();
      } else if (!active) {
        waitMs = Math.max(0, waitMs - dt);
        if (waitMs === 0) {
          const nearby = drops.filter((drop) => atOrAboveFeet(player, drop) &&
            Math.abs(drop.y - player.y) <= config.spawnRangePx && !overlaps(player, drop));
          activeId = nearby.length ? nearby[Math.floor(unit() * nearby.length)]!.id : null;
          if (activeId) save();
        }
      }
      publish();
    },
    /** Collecting/expiring wax in flight cannot change the held lantern radius. */
    lightRadius(base: number, airborne: boolean, benefit01 = 1): number {
      const boost = boostMs > 0 ? Math.max(base, Math.min(config.maxLightRadiusPx, base * config.lightMultiplier)) : base;
      const desired = base + (boost - base) * Math.max(0, Math.min(1, benefit01));
      if (!airborne || heldRadius === null) heldRadius = desired;
      return heldRadius;
    },
    reset(): void { collected = 0; activeId = null; waitMs = 0; boostMs = 0; heldRadius = null; save(); publish(); },
    finish(): void { for (const key of [WAX_STORAGE_KEY, LEGACY_KEY]) try { storage.removeItem(key); } catch { /* Continue in memory. */ } },
  };
}
