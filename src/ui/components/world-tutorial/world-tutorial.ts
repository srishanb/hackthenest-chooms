/** Transparent control reminders, projected through the game camera without capturing input. */
import type { UiComponent } from '../../types';
import { t } from '../../strings';
import { controlKeys, reminderPosition, showWorldTutorial, worldTransform } from './layout';
import './world-tutorial.css';
const ACTIONS = ['move', 'jump', 'ember', 'return', 'pause'] as const;
export const worldTutorial: UiComponent = {
  id: 'world-tutorial', visibleIn: ['playing', 'ember'],
  mount(root, { stores, tutorialSections = [], worldCanvas }) {
    if (!stores.worldView || !worldCanvas) return () => {};
    const viewport = document.createElement('section'); viewport.className = 'world-tutorial';
    viewport.setAttribute('aria-label', t('worldTutorial.label'));
    const world = document.createElement('div'); world.className = 'world-tutorial__world';
    const reminder = document.createElement('dl'); reminder.className = 'world-tutorial__controls';
    const keys = ACTIONS.map(action => {
      const key = document.createElement('dt'), label = document.createElement('dd');
      label.textContent = t(`worldTutorial.control.${action}`); reminder.append(key, label); return key;
    });
    world.append(reminder); viewport.append(world); root.append(viewport);
    let bounds = worldCanvas.getBoundingClientRect();
    const render = (): void => {
      const view = stores.worldView!.get();
      viewport.hidden = !view || !showWorldTutorial(stores.snapshot.get(), tutorialSections);
      if (!view) return;
      world.style.transform = worldTransform(view, bounds.width);
      const position = reminderPosition(view);
      reminder.style.left = `${position.x}px`; reminder.style.top = `${position.y}px`;
    };
    const measure = (): void => {
      bounds = worldCanvas.getBoundingClientRect();
      Object.assign(viewport.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` }); render();
    };
    const refreshText = (): void => {
      const labels = controlKeys(stores.settings.get().keys);
      keys.forEach((key, index) => { key.textContent = labels[index]!; });
    };
    const observer = new ResizeObserver(measure); observer.observe(worldCanvas);
    window.addEventListener('resize', measure);
    const cleanups = [stores.worldView.subscribe(render), stores.snapshot.subscribe(render), stores.settings.subscribe(refreshText)];
    refreshText(); measure();
    return () => { for (const stop of cleanups) stop(); observer.disconnect(); window.removeEventListener('resize', measure); viewport.remove(); };
  },
};
