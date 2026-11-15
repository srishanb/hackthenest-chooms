/**
 * Settings > Signal: choose where the signal comes from (simulator, live board, or a replay preset),
 * save the current signal as a preset, import or export a recording file, and delete saved presets.
 *
 * Why a function mounted by the settings panel (like the narrator voice control): it is one section of the
 * existing Settings dialog, in its own folder, and removing the call removes the section without touching the
 * game. It only talks to `signal.presets`; presets replay through the same pipeline as live data, so the
 * game reacts exactly as it would to a real signal. Text is set with textContent only.
 */
import type { PresetInfo, SourceChoice } from '../../../shared/contracts/signal-api';
import type { SignalHandle } from '../../../shared/contracts/signal-api';
import { t } from '../../strings';
import './signal-presets.css';

const same = (a: SourceChoice, b: SourceChoice): boolean => a.kind === b.kind && (a.kind !== 'preset' || (b.kind === 'preset' && a.id === b.id));

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const readable = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function mountSignalPresetsControl(root: HTMLElement, signal: Pick<SignalHandle, 'presets'>): () => void {
  const { presets } = signal;
  const box = document.createElement('fieldset');
  box.className = 'signal-presets';
  const legend = document.createElement('legend');
  legend.textContent = t('signal.title');
  const hint = document.createElement('small');
  hint.textContent = t('signal.hint');
  const list = document.createElement('div');
  list.className = 'signal-presets__list';
  const status = document.createElement('p');
  status.className = 'signal-presets__status';
  status.setAttribute('role', 'status');

  const loopLabel = document.createElement('label');
  loopLabel.className = 'menu-row';
  const loop = document.createElement('input');
  loop.type = 'checkbox';
  loopLabel.append(loop, document.createTextNode(t('signal.loop')));
  loop.addEventListener('change', () => presets.setLoop(loop.checked));

  const saveRow = document.createElement('div');
  saveRow.className = 'menu-row';
  const name = document.createElement('input');
  name.type = 'text';
  name.maxLength = 40;
  name.placeholder = t('signal.namePlaceholder');
  name.setAttribute('aria-label', t('signal.nameLabel'));
  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = t('signal.save');
  const importLabel = document.createElement('label');
  importLabel.className = 'signal-presets__import';
  importLabel.textContent = t('signal.import');
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.jsonl,.json,.txt';
  importLabel.append(file);
  saveRow.append(name, save);
  box.append(legend, hint, list, loopLabel, saveRow, importLabel, status);
  root.append(box);

  const say = (message: string): void => { status.textContent = message; };
  const fail = (error: unknown): void => say(readable(error));

  function choose(choice: SourceChoice, label: string): void {
    say(t('signal.switching'));
    // Called straight from the click: choosing the live board opens the Bluetooth picker.
    presets.select(choice).then(() => say(`${t('signal.now')} ${label}`), fail);
  }

  function row(choice: SourceChoice, label: string, description: string, extra?: HTMLElement[]): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'signal-presets__row';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = description;
    button.setAttribute('aria-pressed', String(same(presets.getSelection(), choice)));
    button.addEventListener('click', () => choose(choice, label));
    wrap.append(button, ...(extra ?? []));
    return wrap;
  }

  function smallButton(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'signal-presets__small';
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }

  let version = 0;
  function render(): void {
    const mine = ++version;
    loop.checked = presets.getLoop();
    presets.list().then((items: PresetInfo[]) => {
      if (mine !== version) return;
      list.replaceChildren(
        row({ kind: 'sim' }, t('signal.simulator'), t('signal.simulatorHint')),
        row({ kind: 'live' }, t('signal.live'), t('signal.liveHint')),
        ...items.map((item) => row({ kind: 'preset', id: item.id }, item.label, item.description, item.builtIn ? [] : [
          smallButton(t('signal.export'), () => { presets.exportText(item.id).then((text) => download(`${item.label.replace(/[^\w-]+/g, '-')}.jsonl`, text), fail); }),
          smallButton(t('signal.delete'), () => { presets.remove(item.id); say(t('signal.deleted')); }),
        ])),
      );
    }, fail);
  }

  save.addEventListener('click', () => {
    try {
      const saved = presets.saveCurrent(name.value);
      name.value = '';
      say(`${t('signal.saved')} ${saved.label}`);
    } catch (error) {
      fail(error);
    }
  });
  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    const label = name.value.trim() || chosen.name.replace(/\.[^.]+$/, '');
    chosen.text().then((text) => {
      const saved = presets.importText(label, text);
      name.value = '';
      say(`${t('signal.saved')} ${saved.label}`);
    }).catch(fail).finally(() => { file.value = ''; });
  });

  const off = presets.subscribe(render);
  render();
  return () => { off(); version += 1; box.remove(); };
}
