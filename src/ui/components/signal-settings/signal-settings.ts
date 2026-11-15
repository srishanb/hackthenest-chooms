/**
 * Settings > Signal source: pick the input (simulator, live board, or a replay preset), loop it,
 * save the current signal as a preset, import and export .jsonl files, delete saved presets.
 *
 * Why a sub-control of the settings panel and not its own registry entry: it lives inside the
 * Settings dialog, like the narrator voice control, so it shares the panel's focus trap and Back
 * button. It only talks to `SignalHandle.presets`; switching never reloads the page or touches the game.
 * Text comes from strings.ts, colours and spacing from the menu theme.
 */
import type { PresetInfo, SignalHandle } from '../../../shared/contracts/signal-api';
import { t, type StringKey } from '../../strings';

const SIM = 'sim';
const LIVE = 'live';
const presetValue = (id: string): string => `preset:${id}`;

function download(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function mountSignalSettings(root: HTMLElement, signal: SignalHandle): () => void {
  const { presets } = signal;
  let library: PresetInfo[] = [];

  const box = document.createElement('fieldset');
  box.className = 'signal-settings';
  const legend = document.createElement('legend');
  legend.textContent = t('signal.title');
  const hint = document.createElement('small');
  hint.textContent = t('signal.hint');
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const say = (key: StringKey | ''): void => { status.textContent = key === '' ? '' : t(key); };

  const sourceRow = document.createElement('label');
  sourceRow.className = 'menu-row';
  sourceRow.append(document.createTextNode(t('signal.source')));
  const select = document.createElement('select');
  select.setAttribute('aria-label', t('signal.source'));
  sourceRow.append(select);

  const connect = button('signal.connectLive', () => {
    // No await before select(): the Bluetooth picker must open inside this click.
    presets.select({ kind: 'LIVE_EEG' }).then(() => say(''), () => say('signal.status.liveFailed'));
  });

  const loopRow = document.createElement('label');
  loopRow.className = 'menu-row';
  const loop = document.createElement('input');
  loop.type = 'checkbox';
  loop.addEventListener('change', () => presets.setLoop(loop.checked));
  loopRow.append(loop, document.createTextNode(t('signal.loop')));

  const nameRow = document.createElement('label');
  nameRow.className = 'menu-row';
  nameRow.append(document.createTextNode(t('signal.saveName')));
  const name = document.createElement('input');
  name.type = 'text';
  name.maxLength = 40;
  name.placeholder = t('signal.saveNamePlaceholder');
  nameRow.append(name);

  const save = button('signal.save', () => {
    presets.saveCurrent(name.value || t('signal.saveNamePlaceholder')).then(
      (info) => { name.value = ''; say('signal.status.saved'); void presets.select({ kind: 'REPLAY', presetId: info.id }).catch(() => say('signal.status.switchFailed')); },
      (error: unknown) => say(error instanceof Error && error.message === 'preset.tooShort' ? 'signal.status.tooShort' : error instanceof Error && error.message === 'preset.limit' ? 'signal.status.limit' : 'signal.status.saveFailed'),
    );
  });

  const selectedPresetId = (): string | null => (select.value.startsWith('preset:') ? select.value.slice('preset:'.length) : null);

  const exportButton = button('signal.export', () => {
    const id = selectedPresetId();
    if (id === null) return say('signal.status.nothingToExport');
    presets.exportText(id).then((text) => download(text, `${id}.jsonl`), () => say('signal.status.saveFailed'));
  });

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.jsonl,.json,application/x-ndjson,text/plain';
  importInput.hidden = true;
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    file.text().then((text) => presets.importText(file.name.replace(/\.jsonl?$/i, ''), text)).then(
      () => say('signal.status.imported'),
      (error: unknown) => say(error instanceof Error && error.message === 'preset.limit' ? 'signal.status.limit' : 'signal.status.importFailed'),
    );
  });
  const importButton = button('signal.import', () => importInput.click());

  const remove = button('signal.delete', () => {
    const id = selectedPresetId();
    if (id === null) return;
    presets.remove(id).then(() => say('signal.status.deleted'), () => say('signal.status.saveFailed'));
  });

  select.addEventListener('change', () => {
    const value = select.value;
    say('');
    const target = value === SIM ? presets.select({ kind: 'SIMULATED' }) : value.startsWith('preset:') ? presets.select({ kind: 'REPLAY', presetId: value.slice('preset:'.length) }) : Promise.resolve();
    target.catch(() => { say('signal.status.switchFailed'); render(); });
  });

  function button(key: StringKey, action: () => void): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = t(key);
    el.addEventListener('click', action);
    return el;
  }

  function option(value: string, text: string, disabled = false): HTMLOptionElement {
    const el = document.createElement('option');
    el.value = value;
    el.textContent = text;
    el.disabled = disabled;
    return el;
  }

  function render(): void {
    const selection = presets.getSelection();
    select.replaceChildren(option(SIM, t('signal.simulator')));
    if (selection.kind === 'LIVE_EEG') select.append(option(LIVE, t('signal.liveActive'), true));
    for (const [builtIn, key] of [[true, 'signal.group.builtIn'], [false, 'signal.group.saved']] as const) {
      const items = library.filter((p) => p.builtIn === builtIn);
      if (items.length === 0) continue;
      const group = document.createElement('optgroup');
      group.label = t(key);
      for (const p of items) group.append(option(presetValue(p.id), p.description === '' ? p.label : `${p.label}: ${p.description}`));
      select.append(group);
    }
    select.value = selection.kind === 'SIMULATED' ? SIM : selection.kind === 'LIVE_EEG' ? LIVE : presetValue(selection.presetId);
    loop.checked = presets.getLoop();
    const selected = selectedPresetId();
    remove.disabled = !library.some((p) => p.id === selected && !p.builtIn);
    exportButton.disabled = selected === null;
  }

  function refresh(): void {
    presets.list().then((items) => { library = items; render(); }, () => render());
  }

  const off = presets.onChange(refresh);
  box.append(legend, sourceRow, connect, loopRow, nameRow, save, exportButton, importButton, importInput, remove, status, hint);
  root.append(box);
  render();
  refresh();
  return () => { off(); box.remove(); };
}
