/**
 * Captions: shows the text of a narrator line while it plays.
 *
 * Why: the narrator publishes `narrator_line { text, durationMs }` on the bus and this component only
 * listens, so removing it never affects the game. It follows the Settings store live (on/off and size),
 * keeps one caption at a time (a new line replaces the old one and restarts the timer), and clears its
 * timer and listeners when unmounted. In dev, `?captionDemo` plays sample lines so it can be seen
 * before a narrator exists; `window.lightenCaption(text?)` plays one on demand.
 */
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { captionDurationMs, captionText } from './captions-state';
import './captions.css';

const DEMO_KEYS = ['captions.demo.1', 'captions.demo.2', 'captions.demo.3'] as const;
const DEMO_INTERVAL_MS = 5000;
const DEMO_DURATION_MS = 3500;

export const captions: UiComponent = {
  id: 'captions',
  visibleIn: ['playing', 'ember'],
  mount(root, { bus, stores }) {
    const box = document.createElement('div');
    box.className = 'captions';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-label', t('captions.title'));
    box.hidden = true;
    root.append(box);

    let current: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const render = (): void => {
      const { enabled, scale } = stores.settings.get().captions;
      box.style.setProperty('--caption-scale', String(scale));
      box.textContent = current ?? '';
      box.hidden = !enabled || current === null;
    };
    const clear = (): void => {
      clearTimeout(timer);
      current = null;
      render();
    };

    const offLine = bus.on('narrator_line', (event) => {
      const text = captionText(event.text);
      clearTimeout(timer);
      if (text === null) return clear();
      current = text;
      render();
      timer = setTimeout(clear, captionDurationMs(event.durationMs, text));
    });
    // A finished or restarted run should not leave a stale caption behind.
    const offFinish = bus.on('finish', clear);
    const offRestart = bus.on('run_restart', clear);
    const offSettings = stores.settings.subscribe(render);
    render();

    const cleanups = [offLine, offFinish, offRestart, offSettings];
    if (import.meta.env.DEV) cleanups.push(mountDemo((text) => bus.emit({ type: 'narrator_line', lineId: 'demo', text, durationMs: DEMO_DURATION_MS })));
    return () => {
      clearTimeout(timer);
      for (const cleanup of cleanups) cleanup();
      box.remove();
    };
  },
};

/** Dev only: the `window.lightenCaption` helper and the `?captionDemo` loop. Returns a cleanup. */
function mountDemo(play: (text: string) => void): () => void {
  const scope = window as unknown as { lightenCaption?: (text?: string) => void };
  scope.lightenCaption = (text = t(DEMO_KEYS[0])) => play(text);
  if (!new URLSearchParams(window.location.search).has('captionDemo')) {
    return () => { delete scope.lightenCaption; };
  }
  let index = 0;
  const tick = (): void => play(t(DEMO_KEYS[index++ % DEMO_KEYS.length]!));
  tick();
  const interval = setInterval(tick, DEMO_INTERVAL_MS);
  return () => { clearInterval(interval); delete scope.lightenCaption; };
}
