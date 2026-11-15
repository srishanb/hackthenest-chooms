/** Minimal stage editing UI. Rendering and persistence arrive from the composition root. */
import type { SectionData } from '../../../shared/contracts/content';
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import './stage-editor.css';
export interface EditorDeps {
  stages: SectionData[]; originals: readonly SectionData[];
  render(parent: HTMLElement, stages: SectionData[], index: number, selected: string, changed: (id: string, done: boolean) => void): () => void;
  save(stages: SectionData[]): void; test(stages: SectionData[], index: number): void;
  back(): void;
}
export function mountStageEditor(root: HTMLElement, deps: EditorDeps): void {
  root.replaceChildren();
  let index = 0, selected = deps.stages[0]!.platforms[0]!.id, stop = () => {};
  const stages = deps.stages;
  root.className = 'stage-editor';
  const top = document.createElement('header'), left = document.createElement('aside'), center = document.createElement('main'), right = document.createElement('aside');
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const attempt = (action: () => void) => { try { action(); } catch (error) { status.textContent = String(error); } };
  top.append(menuButton(t('editor.save'), () => attempt(() => { deps.save(stages); status.textContent = t('editor.saved'); })),
    menuButton(t('editor.test'), () => attempt(() => deps.test(stages, index))),
    menuButton(t('editor.reset'), () => { stages[index] = structuredClone(deps.originals[index]!); selected = stages[index]!.platforms[0]!.id; status.textContent = t('editor.resetNotice'); refresh(); }),
    menuButton(t('editor.back'), deps.back), status);
  const stageSelect = document.createElement('select'); stageSelect.setAttribute('aria-label', t('editor.stage'));
  for (const stage of stages) { const option = document.createElement('option'); option.textContent = t(`stage.${stage.stage!.kind}`); stageSelect.append(option); }
  stageSelect.onchange = () => { index = stageSelect.selectedIndex; selected = stages[index]!.platforms[0]!.id; refresh(); };
  left.append(stageSelect, menuButton(t('editor.add'), () => {
    const stage = stages[index]!, source = stage.platforms.find((p) => p.id === selected) ?? stage.platforms[0]!;
    const id = `${stage.id}-edit-${crypto.randomUUID()}`;
    stage.platforms.push({ id, x: source.x, y: source.y - 90, width: 180, height: 20, type: 'static' }); selected = id; refresh();
  }), menuButton(t('editor.delete'), () => {
    const stage = stages[index]!;
    if (selected === 'spawn' || selected === 'refuge' || stage.platforms.length <= 1 || stage.stage?.finalPlatformId === selected || index === 0 && selected === stage.platforms[0]!.id) { status.textContent = t('editor.protected'); return; }
    stage.platforms = stage.platforms.filter((p) => p.id !== selected); selected = stage.platforms[0]!.id; refresh();
  }), menuButton(t('editor.spawn'), () => { selected = 'spawn'; refresh(); }));
  root.append(top, left, center, right);
  function properties(): void {
    right.replaceChildren(); const stage = stages[index]!;
    const platform = stage.platforms.find((p) => p.id === selected);
    const object = selected === 'spawn' ? stage.spawn : selected === 'refuge' ? stage.refuge : platform;
    const number = (label: string, value: number, change: (value: number) => void) => {
      const row = document.createElement('label'); row.textContent = label; const input = document.createElement('input'); input.type = 'number'; input.value = String(value);
      input.oninput = () => { if (Number.isFinite(input.valueAsNumber)) change(input.valueAsNumber); };
      input.onchange = () => refresh(); row.append(input); right.append(row);
    };
    if (object) { number(t('editor.x'), object.x, value => object.x = value); number(t('editor.y'), object.y, value => object.y = value); }
    if (platform) {
      number(t('editor.width'), platform.width, value => platform.width = Math.max(24, value));
      const type = document.createElement('select'); type.setAttribute('aria-label', t('editor.surface'));
      for (const kind of ['static','slippery','moving']) { const option = document.createElement('option'); option.value = kind; option.textContent = t(kind === 'static' ? 'editor.normal' : kind === 'slippery' ? 'editor.ice' : 'editor.moving'); type.append(option); }
      type.value = platform.type;
      type.onchange = () => { platform.type = type.value; platform.ice01 = type.value === 'slippery' ? 1 : 0;
        if (type.value !== 'moving') delete platform.motion; else platform.motion ??= { axis: 'x', distance: 40, periodMs: 4000 }; refresh(); };
      right.append(type, menuButton(t('editor.final'), () => { stage.stage!.finalPlatformId = platform.id; refresh(); }));
    }
    const toggle = (text: string, checked: boolean, change: (on: boolean) => void) => {
      const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked;
      input.onchange = () => { change(input.checked); refresh(); }; label.append(input, document.createTextNode(text)); right.append(label);
    };
    toggle(t('editor.snow'), stage.stage!.snow01 > 0, on => stage.stage!.snow01 = on ? 1 : 0);
    const setWind = (strength: number) => {
      const ys = stage.platforms.map(p => p.y); stage.stage!.wind01 = strength === 0 ? 0 : 1;
      stage.wind = strength === 0 ? [] : [{ x: 480, y: (Math.min(...ys) + Math.max(...ys)) / 2, width: 960,
        height: Math.max(...ys) - Math.min(...ys) + 200, accelerationX: strength, periodMs: 4200, fadePx: 80 }];
    };
    toggle(t('editor.wind'), !!stage.wind?.length, on => setWind(on ? 100 : 0));
    number(t('editor.windStrength'), stage.wind?.[0]?.accelerationX ?? 0, setWind);
    const hint = document.createElement('p'); hint.textContent = t('editor.hint'); right.append(hint);
  }
  let pendingRefresh = false;
  function refresh(): void { stop(); center.replaceChildren(); properties(); stop = deps.render(center, stages, index, selected, (id, done) => { selected = id; properties(); if (done && !pendingRefresh) { pendingRefresh = true; requestAnimationFrame(() => { pendingRefresh = false; refresh(); }); } }); }
  refresh();
}
