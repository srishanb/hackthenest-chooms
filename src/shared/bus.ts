/**
 * A tiny typed event bus.
 *
 * Why: gameplay publishes moments (a fall, a landing, a finish) without knowing who
 * listens. The narrator, recorder and HUD subscribe, so they can be added or removed
 * without touching game code. A listener that throws never breaks the others.
 */
import type { EventBus, GameEvent, GameEventOf, GameEventType } from './contracts/events';

type AnyListener = (event: GameEvent, tMs: number) => void;

/** @param now clock in ms; pass a fake in tests. */
export function createEventBus(now: () => number = () => performance.now()): EventBus {
  const byType = new Map<GameEventType, Set<AnyListener>>();
  const any = new Set<AnyListener>();

  function call(listener: AnyListener, event: GameEvent, tMs: number): void {
    try {
      listener(event, tMs);
    } catch (error) {
      console.error(`[bus] listener for "${event.type}" threw`, error);
    }
  }

  return {
    emit(event) {
      const tMs = now();
      // Snapshots: a listener added during this emit waits for the next event.
      const typed = [...(byType.get(event.type) ?? [])];
      const anyNow = [...any];
      for (const listener of typed) call(listener, event, tMs);
      for (const listener of anyNow) call(listener, event, tMs);
    },

    on<T extends GameEventType>(type: T, listener: (event: GameEventOf<T>, tMs: number) => void) {
      const set = byType.get(type) ?? new Set<AnyListener>();
      byType.set(type, set);
      // Safe: this listener is only ever called with events whose type is `type`.
      const wrapped = listener as AnyListener;
      set.add(wrapped);
      return () => set.delete(wrapped);
    },

    onAny(listener) {
      any.add(listener);
      return () => any.delete(listener);
    },
  };
}
