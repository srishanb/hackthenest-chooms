/** Live, keyboard-accessible controls for the existing settings schema; no gameplay writes. */
import type { Settings, KeyBindings } from '../../../shared/contracts/settings';
import { mountForestPreview } from '../source-badge/forest-preview';
import '../source-badge/source-badge.css';
import { menuButton, trapMenuFocus } from '../../menu-dom';
import { CAPTION_SCALE_RANGE, validateSettings } from '../../settings-store';
import { t, type StringKey } from '../../strings';
import type { UiComponent } from '../../types';
import { createUiActions } from '../../ui-actions';
import { remapKey } from './settings-editor';
import '../../theme/menus.css';
export const settingsPanel: UiComponent = {
  id: 'settings-panel', visibleIn: ['paused', 'menu'],
  mount(root, { stores, actions = createUiActions() }) {
    const panel = document.createElement('section'); panel.className = 'menu-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', t('menu.settings'));
    const title = document.createElement('h2'); title.textContent = t('menu.settings'); panel.append(title);
    const renders: Array<(settings: Settings) => void> = [];
    const update = (transform: (settings: Settings) => Settings): void => stores.settings.set(validateSettings(transform(stores.settings.get())));
    function range(labelKey: StringKey, min: number, max: number, step: number,
      read: (s: Settings) => number, write: (s: Settings, value: number) => Settings): void {
      const label = document.createElement('label'); label.className = 'menu-row';
      const name = document.createElement('span'); name.textContent = t(labelKey);
      const input = document.createElement('input'); input.type = 'range';
      input.min = String(min); input.max = String(max); input.step = String(step);
      const output = document.createElement('output');
      label.append(name, input, output); panel.append(label);
      input.addEventListener('input', () => update((s) => write(s, input.valueAsNumber)));
      renders.push((s) => { input.value = String(read(s)); output.textContent = String(Math.round(read(s) * 100)) + '%'; });
    }
    for (const key of ['master', 'music', 'sfx', 'narrator'] as const) {
      range(`settings.volume.${key}`, 0, 1, 0.05, (s) => s.volumes[key], (s, value) => ({ ...s, volumes: { ...s.volumes, [key]: value } }));
    }
    range('settings.captionSize', CAPTION_SCALE_RANGE.min, CAPTION_SCALE_RANGE.max, 0.05,
      (s) => s.captions.scale, (s, scale) => ({ ...s, captions: { ...s.captions, scale } }));
    const removeForestPreview = mountForestPreview(panel);
    range('settings.effects', 0, 1, 0.05, (s) => s.effectStrength, (s, effectStrength) => ({ ...s, effectStrength }));
    function checkbox(labelKey: StringKey, read: (s: Settings) => boolean, write: (s: Settings, value: boolean) => Settings): void {
      const label = document.createElement('label'); label.className = 'menu-row';
      const input = document.createElement('input'); input.type = 'checkbox';
      label.append(input, document.createTextNode(t(labelKey))); panel.append(label);
      input.addEventListener('change', () => update((s) => write(s, input.checked)));
      renders.push((s) => { input.checked = read(s); });
    }
    checkbox('settings.captions', (s) => s.captions.enabled, (s, enabled) => ({ ...s, captions: { ...s.captions, enabled } }));
    checkbox('settings.reducedMotion', (s) => s.reducedMotion, (s, reducedMotion) => ({ ...s, reducedMotion }));
    for (const key of ['showSignal', 'showEmber', 'showStatus'] as const) {
      checkbox(`settings.${key}`, (s) => s.hud[key], (s, value) => ({ ...s, hud: { ...s.hud, [key]: value } }));
    }
    let listening: keyof KeyBindings | null = null;
    const hint = document.createElement('p'); hint.setAttribute('role', 'status');
    const bindings = document.createElement('fieldset');
    const legend = document.createElement('legend'); legend.textContent = t('settings.keys'); bindings.append(legend);
    for (const key of Object.keys(stores.settings.get().keys) as Array<keyof KeyBindings>) {
      const button = menuButton('', () => { listening = key; hint.textContent = t('settings.pressKey'); });
      bindings.append(button);
      renders.push((s) => { button.textContent = `${t(`settings.key.${key}`)}: ${s.keys[key]}`; });
    }
    panel.append(bindings, hint);
    const back = menuButton(t('menu.back'), () => actions.settingsOpen.set(false)); panel.append(back); root.append(panel);
    const render = (): void => {
      const phase = stores.snapshot.get().phase;
      // Opened from the pause menu or from the start menu; Back returns to whichever opened it.
      panel.hidden = !actions.settingsOpen.get() || (phase !== 'paused' && phase !== 'menu');
      back.textContent = t(phase === 'menu' ? 'menu.backToStart' : 'menu.back');
      for (const fn of renders) fn(stores.settings.get());
    };
    const onKey = (event: KeyboardEvent): void => {
      if (panel.hidden) return;
      if (listening && !event.repeat) {
        if (['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(event.code)) return;
        if (event.key !== 'Tab') { event.preventDefault(); event.stopImmediatePropagation(); }
        if (!['Escape', 'Tab', 'Enter'].includes(event.code)) {
          const action = listening;
          const current = stores.settings.get();
          const candidate = validateSettings({ ...current, keys: { ...current.keys, [action]: event.code } });
          if (candidate.keys[action] !== event.code) { hint.textContent = t('settings.unsupportedKey'); return; }
          update((s) => ({ ...s, keys: remapKey(s.keys, action, event.code) }));
        }
        listening = null; hint.textContent = ''; return;
      }
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); actions.settingsOpen.set(false); }
      else trapMenuFocus(panel, event);
    };
    window.addEventListener('keydown', onKey, true);
    const offSettings = stores.settings.subscribe(render), offSnapshot = stores.snapshot.subscribe(render);
    const offActions = actions.settingsOpen.subscribe((open) => {
      listening = null; hint.textContent = ''; render();
      if (open) queueMicrotask(() => { if (panel.isConnected && !panel.hidden) panel.querySelector<HTMLElement>('input')?.focus(); });
    });
    render();
    return () => { removeForestPreview(); window.removeEventListener('keydown', onKey, true); offSettings(); offSnapshot(); offActions(); panel.remove(); };
  },
};
