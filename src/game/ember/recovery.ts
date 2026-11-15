/** One reusable, player-placed ember: safe placement, pickup and unlimited returns. */
import type { ComposureState } from '../../shared/contracts/composure';
import type { EmberConfig, GameConfig } from '../../shared/contracts/config';
import type { SectionData } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import type { PlayerState } from '../player/types';
import { clearSave, createMemorySaveStorage, loadSave, writeSave } from '../save';
import type { EmberAnchor, SavedProgress, SaveStorage } from '../save';
import { getPlatformType } from '../world/platform-types/registry';

interface RecoveryDeps {
  sections: readonly SectionData[]; gameConfig: GameConfig; config: EmberConfig;
  bus: EventBus; snapshot: Store<GameSnapshot>; storage?: SaveStorage;
  now?: () => number;
}

export function createRecoveryEmber({ sections, gameConfig, config, bus, snapshot, storage = createMemorySaveStorage(), now = Date.now }: RecoveryDeps) {
  const first = sections[0];
  if (!first) throw new Error('Recovery needs a starting section');
  const platforms = sections.flatMap((section) => section.platforms);
  function safe(anchor: EmberAnchor): boolean {
    const platform = platforms.find((candidate) => candidate.id === anchor.platformId);
    const type = platform && getPlatformType(platform.type);
    return !!platform && !!type?.stationary && type.anchorSafe &&
      anchor.x >= platform.x - platform.width / 2 + gameConfig.player.width / 2 &&
      anchor.x <= platform.x + platform.width / 2 - gameConfig.player.width / 2 &&
      Math.abs(anchor.y - (platform.y - platform.height / 2 - gameConfig.player.height / 2)) < 0.01;
  }
  const loaded = loadSave(storage);
  let progress: SavedProgress = loaded && (!loaded.anchor || safe(loaded.anchor)) ? loaded : { v: 2, anchor: null };
  // A corrupt save or clock skew must not disable recovery for longer than one cooldown.
  if (progress.readyAtMs !== undefined) progress = { ...progress, readyAtMs: Math.min(progress.readyAtMs, now() + (config.cooldownMs ?? 5000)) };
  let elapsed = 0;
  let lastTick: number | null = null;
  let suspendedAt: number | null = null;
  const syncClock = (): void => {
    const frozen = snapshot.get().phase === 'paused' || snapshot.get().phase === 'menu';
    if (frozen && suspendedAt === null) suspendedAt = now();
    if (!frozen && suspendedAt !== null) {
      if (progress.readyAtMs) { progress = { ...progress, readyAtMs: progress.readyAtMs + Math.max(0, now() - suspendedAt) }; writeSave(storage, progress); }
      suspendedAt = null;
    }
  };
  const cooldownRemaining = (): number => Math.ceil(Math.max(0, (progress.readyAtMs ?? 0) - now()) / 1000) * 1000;
  const startingSection = sections.find((section) => section.platforms.some((p) => p.id === progress.anchor?.platformId)) ?? first;
  snapshot.set({ ...snapshot.get(), sectionId: startingSection.id, inRefuge: false,
    ember: { available: true, active: false, progress01: 0, canAssist: false, cooldownRemainingMs: cooldownRemaining() },
    promptKey: progress.anchor ? 'ember.placedHint' : 'ember.placeHint' });

  function publish(active: boolean): void {
    snapshot.set({ ...snapshot.get(), ember: {
      available: true, active, progress01: Math.min(1, elapsed / config.targetValidMs), canAssist: active,
      cooldownRemainingMs: cooldownRemaining(),
    } });
  }
  function recover(via: 'eeg' | 'assist'): EmberAnchor | null {
    if (snapshot.get().phase !== 'ember' || !progress.anchor || !safe(progress.anchor)) return null;
    const destination = { ...progress.anchor };
    progress = { ...progress, readyAtMs: now() + (config.cooldownMs ?? 5000) };
    writeSave(storage, progress);
    elapsed = 0; lastTick = null;
    snapshot.set({ ...snapshot.get(), phase: 'playing', promptKey: 'ember.pickupHint' });
    publish(false); bus.emit({ type: 'ember_returned', via });
    return destination;
  }
  function near(player: PlayerState): boolean {
    return !!progress.anchor && player.platformId === progress.anchor.platformId &&
      Math.abs(player.x - progress.anchor.x) <= gameConfig.player.width * 2;
  }
  return {
    spawn: progress.anchor ? { x: progress.anchor.x, y: progress.anchor.y } : { ...first.spawn },
    getAnchor: (): EmberAnchor | null => progress.anchor ? { ...progress.anchor } : null,
    placeOrPickup(player: PlayerState): boolean {
      if (snapshot.get().phase !== 'playing' || !player.grounded || player.charging || !player.platformId) return false;
      if (progress.anchor) {
        if (!near(player)) return false;
        progress = { ...progress, anchor: null };
        writeSave(storage, progress);
        snapshot.set({ ...snapshot.get(), promptKey: 'ember.placeHint' });
        return true;
      }
      const anchor = { platformId: player.platformId, x: player.x, y: player.y };
      if (!safe(anchor)) return false;
      progress = { ...progress, anchor }; writeSave(storage, progress);
      snapshot.set({ ...snapshot.get(), promptKey: 'ember.pickupHint' });
      return true;
    },
    request(player: PlayerState): boolean {
      if (cooldownRemaining() > 0) return false;
      if (snapshot.get().phase !== 'playing' || !player.grounded ||
        !progress.anchor || !safe(progress.anchor) || player.y <= progress.anchor.y + gameConfig.player.height) return false;
      elapsed = 0; lastTick = null;
      snapshot.set({ ...snapshot.get(), phase: 'ember', promptKey: 'ember.recoverHint' });
      publish(true); bus.emit({ type: 'ember_requested' });
      return true;
    },
    advance(signal: ComposureState, nowMs: number): EmberAnchor | null {
      syncClock();
      if (snapshot.get().phase !== 'ember') { lastTick = null; return null; }
      const dt = lastTick === null ? 0 : Math.max(0, Math.min(100, nowMs - lastTick)); lastTick = nowMs;
      // Check publishing time too: a frozen sample cannot keep advancing recovery.
      const age = Math.max(0, nowMs - signal.t) + signal.sampleAgeMs;
      if (signal.valid && signal.restingActive && Number.isFinite(age) && age <= SIGNAL_CONFIG.staleAfterMs) elapsed += dt;
      if (elapsed >= config.targetValidMs) return recover('eeg');
      publish(true); return null;
    },
    assist: (): EmberAnchor | null => recover('assist'),
    cancel(): void {
      if (snapshot.get().phase !== 'ember') return;
      elapsed = 0; lastTick = null;
      snapshot.set({ ...snapshot.get(), phase: 'playing', promptKey: 'ember.returnHint' });
      publish(false); bus.emit({ type: 'ember_cancelled' });
    },
    refreshPrompt(player: PlayerState): void {
      if (snapshot.get().phase !== 'playing') return;
      const promptKey = cooldownRemaining() > 0 ? 'ember.cooldownHint' : !progress.anchor ? 'ember.placeHint' : near(player) ? 'ember.pickupHint' :
        player.grounded && player.y > progress.anchor.y + gameConfig.player.height ? 'ember.returnHint' : 'ember.placedHint';
      if (snapshot.get().promptKey !== promptKey || snapshot.get().ember.cooldownRemainingMs !== cooldownRemaining()) {
        snapshot.set({ ...snapshot.get(), promptKey, ember: { ...snapshot.get().ember, cooldownRemainingMs: cooldownRemaining() } });
      }
    },
    restartAtAnchor(): EmberAnchor | null {
      if (snapshot.get().phase !== 'paused' || !progress.anchor || !safe(progress.anchor)) return null;
      elapsed = 0; lastTick = null;
      snapshot.set({ ...snapshot.get(), phase: 'playing', promptKey: 'ember.pickupHint' });
      syncClock();
      publish(false);
      return { ...progress.anchor };
    },
    clear(): void { clearSave(storage); },
    restart(): { x: number; y: number } {
      progress = { v: 2, anchor: null }; elapsed = 0; lastTick = null; clearSave(storage);
      snapshot.set({ ...snapshot.get(), phase: 'playing', inRefuge: false, promptKey: 'ember.placeHint' });
      publish(false); return { ...first.spawn };
    },
  };
}
