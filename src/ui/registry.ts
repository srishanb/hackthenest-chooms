/**
 * The one place every UI component is registered, and the function that mounts them.
 *
 * To add a component: create src/ui/components/<id>/<id>.ts, add it to COMPONENTS, and
 * add its id to UiComponentId and src/config/ui.config.ts (the last two need the integrator).
 * To hide or move one: edit src/config/ui.config.ts. No code changes.
 *
 * A component that throws while mounting is logged and skipped: the UI must never be
 * able to break the game.
 */
import type { UiConfig, UiSlot } from '../shared/contracts/config';
import type { GamePhase } from '../shared/contracts/game-state';
import { calibration } from './components/calibration/calibration';
import { captions } from './components/captions/captions';
import { debugOverlay } from './components/debug-overlay/debug-overlay';
import { emberPrompt } from './components/ember-prompt/ember-prompt';
import { finishScreen } from './components/finish-screen/finish-screen';
import { hud } from './components/hud/hud';
import { mainMenu } from './components/main-menu/main-menu';
import { pauseMenu } from './components/pause-menu/pause-menu';
import { settingsPanel } from './components/settings-panel/settings-panel';
import { startMenu } from './components/start-menu/start-menu';
import { sourceBadge } from './components/source-badge/source-badge';
import './theme/fonts.css';
import './theme/tokens.css';
import './theme/layout.css';
import './theme/glass.css';
import type { UiComponent, UiDeps } from './types';
import { createUiActions } from './ui-actions';
import { lockUiToCanvas } from './ui-frame';

export const COMPONENTS: readonly UiComponent[] = [
  startMenu,
  mainMenu,
  pauseMenu,
  settingsPanel,
  hud,
  sourceBadge,
  captions,
  calibration,
  emberPrompt,
  finishScreen,
  debugOverlay,
];

const SLOTS: readonly UiSlot[] = ['full', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-center'];

/** Mount every enabled component into its slot. Returns a function that removes them all. */
export function mountUi(root: HTMLElement, deps: UiDeps, config: UiConfig): () => void {
  const componentDeps = { ...deps, actions: deps.actions ?? createUiActions(config.components['settings-panel'].enabled, config.components.calibration.enabled, config.components['main-menu'].enabled) };
  const slots = new Map<UiSlot, HTMLElement>();
  for (const slot of SLOTS) {
    const element = document.createElement('div');
    element.className = 'ui-slot';
    element.dataset.slot = slot;
    root.append(element);
    slots.set(slot, element);
  }

  const cleanups: Array<() => void> = [lockUiToCanvas(root)];
  const phaseAware: Array<{ wrapper: HTMLElement; visibleIn: readonly GamePhase[] }> = [];

  for (const component of COMPONENTS) {
    const placement = config.components[component.id];
    const slot = slots.get(placement.slot);
    if (!placement.enabled || !slot) continue;

    const wrapper = document.createElement('div');
    wrapper.dataset.component = component.id;
    slot.append(wrapper);
    try {
      cleanups.push(component.mount(wrapper, componentDeps));
    } catch (error) {
      console.error(`[ui] component "${component.id}" failed to mount`, error);
      wrapper.remove();
      continue;
    }
    if (component.visibleIn !== 'always') phaseAware.push({ wrapper, visibleIn: component.visibleIn });
  }

  const applyPhase = (phase: GamePhase): void => {
    root.dataset.phase = phase;
    for (const { wrapper, visibleIn } of phaseAware) wrapper.hidden = !visibleIn.includes(phase);
  };
  applyPhase(deps.stores.snapshot.get().phase);
  cleanups.push(deps.stores.snapshot.subscribe((snapshot) => applyPhase(snapshot.phase)));

  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const slot of slots.values()) slot.remove();
  };
}
