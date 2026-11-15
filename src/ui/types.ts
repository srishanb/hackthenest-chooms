/**
 * What every UI component looks like to the registry.
 *
 * Why: a component is self-contained. It gets a root element and typed dependencies,
 * subscribes to stores and the bus, and returns a function that removes it again.
 * It never reaches into the game, and the game never reaches into it.
 */
import type { Stores } from '../shared/contracts/app';
import type { UiComponentId } from '../shared/contracts/config';
import type { EventBus } from '../shared/contracts/events';
import type { GamePhase } from '../shared/contracts/game-state';
import type { SignalHandle } from '../shared/contracts/signal-api';

export interface UiDeps {
  bus: EventBus;
  stores: Stores;
  signal: SignalHandle;
}

export interface UiComponent {
  id: UiComponentId;
  /** Phases in which the component is shown, or 'always'. */
  visibleIn: readonly GamePhase[] | 'always';
  /** Build the component inside `root`. Returns a function that cleans up listeners. */
  mount(root: HTMLElement, deps: UiDeps): () => void;
}
