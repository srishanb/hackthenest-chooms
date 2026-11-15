/**
 * Composition root: the ONLY file that knows every lane.
 *
 * It creates the shared objects (event bus, stores), then hands each lane exactly what it
 * needs. Lanes never import each other, so reading this file top to bottom shows how the
 * whole game is wired: signal -> game -> UI and audio.
 */
import { createAudio } from './audio/index';
import { AUDIO_CONFIG } from './config/audio.config';
import { EMBER_CONFIG } from './config/ember.config';
import { EFFECTS_TABLE } from './config/effects.config';
import { GAME_CONFIG } from './config/game.config';
import { SIGNAL_CONFIG } from './config/signal.config';
import { UI_CONFIG } from './config/ui.config';
import { NARRATOR_LINES } from './content/narrator/lines';
import { SECTIONS } from './content/sections/index';
import { neutralFrame } from './game/effects/effects-engine';
import { createGame } from './game/index';
import { createEventBus } from './shared/bus';
import type { Stores } from './shared/contracts/app';
import { INITIAL_GAME_SNAPSHOT } from './shared/contracts/game-state';
import { createMemoryStorage, getLocalStorage } from './shared/safe-storage';
import { createStore } from './shared/store';
import { createSignal } from './signal/index';
import { mountUi } from './ui/registry';
import { createSettingsStore } from './ui/settings-store';

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`index.html is missing #${id}`);
  return element;
}

// Reading localStorage can throw when the browser blocks storage; fall back to memory then.
const browserStorage = getLocalStorage(window);

const bus = createEventBus();

const stores: Stores = {
  // With the start menu on, the game waits in 'menu' until Play; with it off, the climb starts at once.
  snapshot: createStore({ ...INITIAL_GAME_SNAPSHOT, phase: UI_CONFIG.components['start-menu'].enabled ? 'menu' : 'playing' }),
  effects: createStore(neutralFrame(EFFECTS_TABLE)),
  settings: createSettingsStore(browserStorage ?? createMemoryStorage()),
};

// The signal lane is the only one that will ever touch a device.
const signal = createSignal(bus, SIGNAL_CONFIG);

// The game gets the read-only signal, never the control surface or a device.
createGame({
  parent: requireElement('game'),
  bus,
  stores,
  composure: signal.reader,
  sections: SECTIONS,
  gameConfig: GAME_CONFIG,
  effectsTable: EFFECTS_TABLE,
  emberConfig: EMBER_CONFIG,
  storage: browserStorage,
});

mountUi(requireElement('ui'), { bus, stores, signal }, UI_CONFIG);

createAudio({ bus, stores, config: AUDIO_CONFIG, narratorLines: NARRATOR_LINES });
