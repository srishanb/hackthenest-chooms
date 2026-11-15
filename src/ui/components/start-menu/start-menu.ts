/** Dedicated launch screen over the existing menu phase. Navigation stays entirely in the UI lane. */
import { menuButton, trapMenuFocus } from '../../menu-dom';
import { icon } from '../../icons';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { createUiActions } from '../../ui-actions';
import { canContinue, menuSelection, startsOnKey } from './start-menu-state';
import { createCredits } from './credits';
import '../../theme/menus.css';
import './start-menu.css';

export const startMenu: UiComponent = {
  id: 'start-menu', visibleIn: ['menu'],
  mount(root, { stores, signal, bus, actions = createUiActions() }) {
    const screen = document.createElement('section'); screen.className = 'launch-screen';
    screen.hidden = stores.snapshot.get().phase !== 'menu';
    screen.setAttribute('aria-label', t('start.label'));
    const scenery = document.createElement('div'); scenery.className = 'launch-scenery'; scenery.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 14; index++) {
      const ember = document.createElement('i'); ember.style.setProperty('--ember-x', `${(index * 37 + 11) % 100}%`);
      ember.style.setProperty('--ember-delay', `${-index * 1.7}s`); scenery.append(ember);
    }
    const hero = document.createElement('div'); hero.className = 'launch-hero';
    const copy = document.createElement('div'); copy.className = 'launch-copy';
    const emblem = document.createElement('div'); emblem.className = 'launch-emblem'; emblem.setAttribute('aria-hidden', 'true'); emblem.append(icon('flame'));
    const eyebrow = document.createElement('p'); eyebrow.className = 'launch-eyebrow'; eyebrow.textContent = t('start.eyebrow');
    const title = document.createElement('h1'); title.textContent = t('start.title');
    const subtitle = document.createElement('p'); subtitle.className = 'launch-subtitle'; subtitle.textContent = t('start.journey');
    const stages = document.createElement('p'); stages.className = 'launch-stages'; stages.textContent = t('start.stages');
    copy.append(emblem, eyebrow, title, subtitle, stages);
    const nav = document.createElement('nav'); nav.className = 'menu-panel launch-actions'; nav.setAttribute('aria-label', t('start.navigation'));
    let pending = false; let timer: ReturnType<typeof setTimeout> | undefined; let played = false;
    let listening = false; let alive = true; let focusReturn: HTMLButtonElement | null = null;
    let offSignal = () => {};
    const status = document.createElement('p'); status.className = 'launch-source'; status.setAttribute('role', 'status');
    const start = (): void => {
      if (pending || stores.snapshot.get().phase !== 'menu' || actions.settingsOpen.get() || actions.tutorialOpen.get() || !credits.hidden) return;
      pending = true; screen.dataset.leaving = 'true';
      for (const button of buttons) button.disabled = true;
      timer = setTimeout(() => {
        if (alive && stores.snapshot.get().phase === 'menu') bus.emit({ type: 'start' });
      }, stores.settings.get().reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
    };
    const play = menuButton(t('start.play'), start); play.className = 'menu-primary'; play.prepend(icon('play'));
    const settings = menuButton(t('menu.settings'), () => { if (!pending) { focusReturn = settings; actions.settingsOpen.set(true); } });
    settings.prepend(icon('settings')); settings.hidden = !actions.settingsAvailable;
    const how = menuButton(t('start.how'), () => { if (!pending) { focusReturn = how; actions.tutorialOpen.set(true); } });
    how.hidden = !actions.tutorialAvailable;
    const creditsButton = menuButton(t('start.credits'), () => {
      if (pending) return; focusReturn = creditsButton; credits.hidden = false; render();
      credits.querySelector<HTMLButtonElement>('button')?.focus();
    });
    const editor = menuButton(t('editor.title'), () => {
      if (pending) return; pending = true;
      const url = new URL(location.href); url.searchParams.delete('editorTest'); url.searchParams.delete('editorDraft'); url.searchParams.set('editor', '1'); location.assign(url.href);
    });
    const buttons = [play, settings, how, creditsButton, editor];
    nav.append(...buttons);
    const hint = document.createElement('p'); hint.className = 'launch-key-hint'; hint.textContent = t('start.keyHint'); nav.append(hint);
    hero.append(copy, nav);
    const credits = createCredits(() => { credits.hidden = true; render(); creditsButton.focus(); });
    const footer = document.createElement('footer'); footer.className = 'launch-footer';
    const event = document.createElement('span'); event.textContent = t('start.event'); footer.append(status, event);
    screen.append(scenery, hero, credits, footer); root.append(screen);

    function renderSource(): void {
      const state = signal.reader.getState();
      const label = state.source === 'SIMULATED' ? 'start.signal.sim' : state.source === 'REPLAY' ? 'start.signal.replay' : state.valid ? 'start.signal.live' : 'start.signal.waiting';
      const value = t(label);
      if (status.textContent !== value) status.textContent = value;
      status.dataset.ready = String(state.source !== 'LIVE_EEG' || state.valid);
    }
    function render(): void {
      const snapshot = stores.snapshot.get(); const inMenu = snapshot.phase === 'menu';
      if (snapshot.phase === 'playing') played = true;
      if (!inMenu && !listening) return;
      screen.hidden = !inMenu;
      screen.dataset.reducedMotion = String(stores.settings.get().reducedMotion);
      // The screen can be revisited through the existing pause menu; no game state is reset.
      if (!inMenu) {
        clearTimeout(timer); pending = false; delete screen.dataset.leaving;
        if (listening) { window.removeEventListener('keydown', onKey); listening = false; offSignal(); }
        return;
      }
      if (!listening) {
        window.addEventListener('keydown', onKey); listening = true;
        renderSource(); offSignal = signal.reader.subscribe(renderSource);
        screen.scrollTop = 0;
        queueMicrotask(() => { if (alive && !hero.hidden && !screen.hidden) play.focus({ preventScroll: true }); });
      }
      const iconElement = play.querySelector('svg');
      const label = t(canContinue(snapshot, played) ? 'start.continue' : 'start.play');
      if (play.dataset.label !== label) { play.replaceChildren(...(iconElement ? [iconElement] : []), document.createTextNode(label)); play.dataset.label = label; }
      for (const button of buttons) button.disabled = pending;
      hero.hidden = actions.settingsOpen.get() || actions.tutorialOpen.get() || actions.calibrationFrom.get() !== null || !credits.hidden;
      if (focusReturn && !hero.hidden) {
        const target = focusReturn; focusReturn = null;
        queueMicrotask(() => { if (alive && !hero.hidden && !screen.hidden) target.focus(); });
      }
    }
    function onKey(event: KeyboardEvent): void {
      if (stores.snapshot.get().phase !== 'menu' || pending || event.defaultPrevented || actions.settingsOpen.get() || actions.tutorialOpen.get() || actions.calibrationFrom.get() !== null) return;
      if (!credits.hidden) {
        if (event.code === 'Escape') { event.preventDefault(); credits.hidden = true; render(); creditsButton.focus(); }
        else trapMenuFocus(credits, event);
        return;
      }
      const focus = document.activeElement;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code)) {
        event.preventDefault();
        const available = buttons.filter((button) => !button.hidden && !button.disabled);
        available[menuSelection(available.indexOf(focus as HTMLButtonElement), available.length, event.code)]?.focus();
        return;
      }
      if (event.code === 'Escape') { event.preventDefault(); play.focus(); return; }
      if (event.repeat && ['Enter', 'NumpadEnter', 'Space'].includes(event.code)) { event.preventDefault(); return; }
      trapMenuFocus(nav, event);
      if (startsOnKey({ code: event.code, repeat: event.repeat, phase: 'menu', settingsOpen: false,
        focusOnControl: focus instanceof HTMLElement && !!focus.closest('button, input, select, textarea') })) {
        event.preventDefault(); start();
      }
    }
    const cleanups = [stores.snapshot.subscribe(render), stores.settings.subscribe(render), actions.settingsOpen.subscribe(render),
      actions.tutorialOpen.subscribe(render), actions.calibrationFrom.subscribe(render)];
    render();
    return () => {
      alive = false; clearTimeout(timer); offSignal(); window.removeEventListener('keydown', onKey);
      for (const cleanup of cleanups) cleanup(); screen.remove();
    };
  },
};
