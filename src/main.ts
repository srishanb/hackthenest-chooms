/**
 * Composition root: the ONLY file that knows every lane.
 *
 * It creates the shared objects (event bus, stores), then hands each lane exactly what it
 * needs. Lanes never import each other, so reading this file top to bottom shows how the
 * whole game is wired: signal -> game -> UI and audio.
 */
import { readLayouts, writeLayouts, STAGE_LAYOUT_KEY, STAGE_DRAFT_KEY } from './game/editor/layouts';
import { createStageCanvas } from './game/editor/canvas';
import { mountStageEditor } from './ui/components/stage-editor/stage-editor';
import { menuButton } from './ui/menu-dom';
import { t } from './ui/strings';
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

const query = new URLSearchParams(location.search);
const draftStorage = getLocalStorage({ get localStorage() { return window.sessionStorage; } });
const testing = query.has('editorTest');
const persistedStages = readLayouts(browserStorage, STAGE_LAYOUT_KEY, SECTIONS);
const runtimeStages = testing ? readLayouts(draftStorage, STAGE_DRAFT_KEY, persistedStages) : persistedStages;
const testIndex = Math.max(0, Math.min(runtimeStages.length - 1, Number(query.get('editorTest')) || 0));
function gameBoot(): void {
const bus = createEventBus();

const stores: Stores = {
  // With the start menu on, the game waits in 'menu' until Play; with it off, the climb starts at once.
  snapshot: createStore({ ...INITIAL_GAME_SNAPSHOT, phase: testing ? 'playing' : UI_CONFIG.components['start-menu'].enabled ? 'menu' : 'playing' }),
  effects: createStore(neutralFrame(EFFECTS_TABLE)),
  settings: createSettingsStore(browserStorage ?? createMemoryStorage()),
};

// The signal lane is the only one that will ever touch a device.
const signal = createSignal(bus, SIGNAL_CONFIG, { storage: browserStorage });

// The game gets the read-only signal, never the control surface or a device.
createGame({
  parent: requireElement('game'),
  bus,
  stores,
  composure: signal.reader,
  sections: runtimeStages,
  gameConfig: GAME_CONFIG,
  effectsTable: EFFECTS_TABLE,
  emberConfig: EMBER_CONFIG,
  storage: testing ? createMemoryStorage() : browserStorage,
  startAt: testing ? { ...runtimeStages[testIndex]!.spawn, platformId: runtimeStages[testIndex]!.platforms[0]!.id } : undefined,
});

mountUi(requireElement('ui'), { bus, stores, signal }, UI_CONFIG);

createAudio({ bus, stores, config: AUDIO_CONFIG, narratorLines: NARRATOR_LINES });
}
const route = (editor: boolean): void => { const url = new URL(location.href); url.searchParams.delete('editorTest'); url.searchParams.delete('editorDraft'); if (editor && testing) url.searchParams.set('editorDraft', '1'); if (editor) url.searchParams.set('editor','1'); else url.searchParams.delete('editor'); location.assign(url.href); };
if (query.has('editor')) {
  mountStageEditor(requireElement('app'), {
    stages: query.has('editorDraft') ? readLayouts(draftStorage, STAGE_DRAFT_KEY, persistedStages) : persistedStages, originals: SECTIONS,
    render: createStageCanvas,
    save(stages) {
      writeLayouts(browserStorage, STAGE_LAYOUT_KEY, stages, SECTIONS);
      try { draftStorage?.removeItem(STAGE_DRAFT_KEY); } catch { /* The persistent save already succeeded. */ }
    },
    test(stages, index) { writeLayouts(draftStorage, STAGE_DRAFT_KEY, stages, SECTIONS); const url = new URL(location.href); url.searchParams.delete('editor'); url.searchParams.delete('editorDraft'); url.searchParams.set('editorTest',String(index)); location.assign(url.href); },
    back: () => route(false),
  });
} else {
  gameBoot();
  if (testing) {
    const back = menuButton(t('editor.return'), () => route(true));
    back.style.cssText = 'position:fixed;top:12px;left:40%;z-index:100;padding:12px'; document.body.append(back);
  }
}
