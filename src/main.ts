/**
 * Composition root: the ONLY file that knows every lane.
 *
 * It creates the shared objects (event bus, stores), then hands each lane exactly what it
 * needs. Lanes never import each other, so reading this file top to bottom shows how the
 * whole game is wired: signal -> game -> UI and audio.
 *
 * Hands-only variant: there is no EEG. The signal is the "still" one (always neutral), and the
 * game plays the endless, generated climb unless the URL says `?climb=classic`.
 */
import { readLayouts, writeLayouts, validateLayouts, layoutStorageKey, STAGE_LAYOUT_KEY, STAGE_DRAFT_KEY } from './game/editor/layouts';
import { publishLayout } from './ui/components/stage-editor/publish-layout';
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
import { PUBLISHED_LAYOUTS } from './content/sections/published-layouts';
import { neutralFrame } from './game/effects/effects-engine';
import { pickCandleSeed } from './game/candle/candle-genome';
import { mountCandleEmblem } from './game/candle/emblem';
import { mountWaxBall } from './game/candle/wax-ball';
import { mountRunCandle } from './game/candle/run-candle';
import { createGame } from './game/index';
import { createEventBus } from './shared/bus';
import type { Stores } from './shared/contracts/app';
import type { WorldViewSnapshot } from './shared/contracts/world-view';
import { INITIAL_GAME_SNAPSHOT } from './shared/contracts/game-state';
import { createMemoryStorage, getLocalStorage } from './shared/safe-storage';
import { createStore } from './shared/store';
import { createStillSignal } from './signal/still-signal';
import { ENDLESS_CONFIG } from './config/endless.config';
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
const layoutKey = layoutStorageKey(SECTIONS);
const persistedStages = readLayouts(browserStorage, layoutKey, SECTIONS);
const runtimeStages = testing ? readLayouts(draftStorage, STAGE_DRAFT_KEY, persistedStages) : persistedStages;
const testIndex = Math.max(0, Math.min(runtimeStages.length - 1, Number(query.get('editorTest')) || 0));
function gameBoot(): void {
const frame = document.documentElement.style;
frame.setProperty('--game-width', String(GAME_CONFIG.view.width));
frame.setProperty('--game-height', String(GAME_CONFIG.view.height));
const bus = createEventBus();

const stores: Stores = {
  worldView: createStore<WorldViewSnapshot | null>(null),
  // With the start menu on, the game waits in 'menu' until Play; with it off, the climb starts at once.
  snapshot: createStore({ ...INITIAL_GAME_SNAPSHOT, phase: testing ? 'playing' : UI_CONFIG.components['start-menu'].enabled ? 'menu' : 'playing' }),
  effects: createStore(neutralFrame(EFFECTS_TABLE)),
  settings: createSettingsStore(browserStorage ?? createMemoryStorage()),
};

// No device, simulator or recording in this variant: a constant, neutral signal.
const signal = createStillSignal(SIGNAL_CONFIG.neutralIntensity);

// Endless is the default. `?seed=<number>` replays one climb; `?bot=1` (development only) lets the route bot play.
const classic = testing || query.get('climb') === 'classic';
const seedText = query.get('seed');
const fixedSeed = seedText !== null && /^\d{1,10}$/.test(seedText);
const endless = classic ? undefined : {
  config: ENDLESS_CONFIG,
  seed: fixedSeed ? Number(seedText) >>> 0 : pickCandleSeed('', false),
  fixedSeed,
  bot: import.meta.env.DEV && query.has('bot'),
  // Development only: `?startChunk=4` starts higher up, to look at a later part of the climb.
  // Development only: `?fuel=0.05` starts the first run nearly out of fuel, to look at the flame going out.
  startFuel: import.meta.env.DEV && query.has('fuel') ? Math.max(0, Math.min(1, Number(query.get('fuel')) || 0)) : undefined,
  startChunk: import.meta.env.DEV ? Math.max(0, Math.min(500, Math.floor(Number(query.get('startChunk')) || 0))) : 0,
};

// One candle seed for the first run: the menu emblem and the player are the same candle.
const candleSeed = pickCandleSeed(window.location.search, import.meta.env.DEV);

// The game gets the read-only signal, never the control surface or a device.
const game = createGame({
  parent: requireElement('game'),
  bus,
  stores,
  composure: signal.reader,
  sections: runtimeStages,
  gameConfig: GAME_CONFIG,
  effectsTable: EFFECTS_TABLE,
  emberConfig: EMBER_CONFIG,
  storage: testing ? createMemoryStorage() : browserStorage,
  candleSeed,
  endless,
  startAt: testing ? { ...runtimeStages[testIndex]!.spawn, platformId: runtimeStages[testIndex]!.platforms[0]!.id } : undefined,
});

mountUi(requireElement('ui'), {
  tutorialSections: runtimeStages,
  worldCanvas: game.canvas,
  bus, stores, signal,
  drawEmblem: (canvas) => mountCandleEmblem(canvas, candleSeed, () => stores.settings.get().reducedMotion),
  drawRunCandle: (canvas, seed) => mountRunCandle(canvas, seed, () => stores.settings.get().reducedMotion),
  drawWaxBall: (canvas) => mountWaxBall(canvas, candleSeed,
    () => (stores.snapshot.get().navigation?.checkpoints.length ?? 0) > 0, () => stores.settings.get().reducedMotion),
}, UI_CONFIG);

// The recorded welcome explains the ember and the signal, and the stage and finish lines talk about
// stages and a summit. None of those exist in the endless climb, so it keeps only the lines that fit.
const narratorLines = endless
  ? NARRATOR_LINES.filter((line) => line.moment === undefined || ['fall', 'height', 'low-fuel'].includes(line.moment))
  : NARRATOR_LINES;
createAudio({ bus, stores, config: AUDIO_CONFIG, narratorLines });
}
const route = (editor: boolean): void => { const url = new URL(location.href); url.searchParams.delete('editorTest'); url.searchParams.delete('editorDraft'); if (editor && testing) url.searchParams.set('editorDraft', '1'); if (editor) url.searchParams.set('editor','1'); else url.searchParams.delete('editor'); location.assign(url.href); };
if (query.has('editor')) {
  mountStageEditor(requireElement('app'), {
    stages: query.has('editorDraft') ? readLayouts(draftStorage, STAGE_DRAFT_KEY, persistedStages)
      : readLayouts(browserStorage, layoutKey, PUBLISHED_LAYOUTS ? SECTIONS : readLayouts(browserStorage, STAGE_LAYOUT_KEY, SECTIONS)), originals: SECTIONS,
    render: createStageCanvas,
    async save(stages) {
      const snapshot = validateLayouts(stages, SECTIONS);
      const url = await publishLayout(snapshot);
      // Browser persistence is a convenience after publication, never a condition for GitHub success.
      try { writeLayouts(browserStorage, layoutKey, snapshot, SECTIONS); browserStorage?.removeItem(STAGE_LAYOUT_KEY); } catch { /* Publishing already succeeded. */ }
      try { draftStorage?.removeItem(STAGE_DRAFT_KEY); } catch { /* The persistent save already succeeded. */ }
      return url;
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
