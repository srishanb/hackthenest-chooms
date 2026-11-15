/** Calibration dialog runs the tested flow while gameplay is already stopped.
 * Never writes the game snapshot; stale async callbacks are ignored after close/unmount.
 */
import { SIGNAL_CONFIG } from '../../../config/signal.config';
import type { CalibrationResult, CalibrationStep } from '../../../shared/contracts/signal-api';
import { menuButton } from '../../menu-dom';
import { t, type StringKey } from '../../strings';
import type { UiComponent } from '../../types';
import { createUiActions } from '../../ui-actions';
import { createCalibrationFlow, messageKey, preferCalibrationFallback, stepFlow,
  type FlowInput } from './calibration-flow';
import { createCueTone } from './cue-tone';
import '../../theme/menus.css';
import './calibration.css';

export const calibration: UiComponent = {
  id: 'calibration', visibleIn: 'always',
  mount(root, { stores, signal, actions = createUiActions() }) {
    const dialog = document.createElement('dialog'); dialog.className = 'menu-panel calibration-panel';
    dialog.setAttribute('aria-label', t('calib.title'));
    const title = document.createElement('h2'); title.textContent = t('calib.title');
    const instruction = document.createElement('p'); instruction.setAttribute('role', 'status');
    const hint = document.createElement('p');
    const progress = document.createElement('progress'); progress.max = 1;
    progress.setAttribute('aria-label', t('calib.progress'));
    const buttons = document.createElement('div'); buttons.className = 'calibration-actions';
    dialog.append(title, instruction, hint, progress, buttons); root.append(dialog);
    let state = createCalibrationFlow(), alive = true, generation = 0;
    const cues = createCueTone(() => { const v = stores.settings.get().volumes; return v.master * v.sfx; });
    const running = (): boolean => ['activeLow', 'activeHigh', 'restingLow', 'restingHigh'].includes(state.screen);
    const allowed = (): boolean => ['menu', 'paused'].includes(stores.snapshot.get().phase);
    const fresh = (): boolean => {
      const age = signal.reader.getState().sampleAgeMs;
      return Number.isFinite(age) && age < SIGNAL_CONFIG.staleAfterMs;
    };
    const close = (): void => {
      generation++; if (dialog.open) dialog.close();
      state = createCalibrationFlow(); actions.calibrationFrom.set(null);
    };
    function result(value: CalibrationResult, token: number): void {
      if (alive && token === generation && dialog.open) dispatch({ type: 'result', result: value });
    }
    function dispatch(input: FlowInput): void {
      const old = state;
      const update = stepFlow(state, input, SIGNAL_CONFIG.calibration); state = update.state;
      if (old.screen !== state.screen || input.type !== 'tick') render();
      if (old.screen !== 'restingHigh' && state.screen === 'restingHigh') cues.play();
      if (input.type === 'result' && input.result.step === 'resting') cues.play(true);
      const token = generation;
      for (const command of update.commands) {
        if (command.type === 'setMode') signal.control.setMode(command.mode);
        else {
          const step = command.step;
          try { void signal.control.calibrate(step).then((value) => result(value, token),
            () => result({ step, ok: false }, token)); }
          catch { result({ step, ok: false }, token); }
        }
      }
    }
    const send = (type: 'start' | 'retry' | 'useSteadyLight'): void => {
      cues.unlock(); dispatch({ type, nowMs: performance.now() });
    };
    function render(): void {
      buttons.replaceChildren(); hint.textContent = ''; progress.hidden = !running();
      if (state.screen === 'activeLow' || state.screen === 'restingLow') progress.value = 0;
      const add = (key: StringKey, action: () => void): HTMLButtonElement => {
        const button = menuButton(t(key), action); buttons.append(button); return button;
      };
      switch (state.screen) {
        case 'intro':
          instruction.textContent = t('calib.intro');
          add('calib.start', () => send('start')); add('calib.close', close); break;
        case 'source': {
          const source = signal.reader.getState().source;
          instruction.textContent = t('calib.source');
          hint.textContent = `${t(`source.${source}`)}. ${source === 'SIMULATED'
            ? `${t('calib.simActive')} ${SIGNAL_CONFIG.simKeys.clench}; ${t('calib.simResting')} ${SIGNAL_CONFIG.simKeys.alpha}.` : ''}`;
          const start = add('calib.startSteps', () => { if (fresh()) { signal.control.setMode('adaptive'); send('start'); } }); start.disabled = !fresh();
          if (source === 'LIVE_EEG' || new URLSearchParams(location.search).get('source') === 'live') {
            const connect = add('calib.connect', () => {
              // Must be first: Web Bluetooth's picker needs this original click gesture.
              const pending = signal.control.connect('LIVE_EEG');
              const requestGeneration = generation;
              connect.disabled = true;
              void pending.catch(() => { if (alive && requestGeneration === generation && dialog.open && state.screen === 'source') hint.textContent = t('calib.connectFailed'); })
                .finally(() => { if (alive) connect.disabled = false; });
            });
          }
          break;
        }
        case 'activeLow': instruction.textContent = t('calib.active.low'); break;
        case 'activeHigh': instruction.textContent = t('calib.active.high'); break;
        case 'restingLow': instruction.textContent = t('calib.resting.low'); hint.textContent = t('calib.toneHint'); break;
        case 'restingHigh': instruction.textContent = t('calib.resting.high'); hint.textContent = t('calib.toneHint'); break;
        case 'activeResult': case 'restingResult': {
          const step: CalibrationStep = state.screen === 'activeResult' ? 'active' : 'resting';
          if (state.result?.ok) {
            instruction.textContent = t('calib.active.ok'); add('calib.next', () => send('start')); add('calib.activeOnly', () => dispatch({ type: 'continueWithout' })); add('calib.close', close);
          } else {
            instruction.textContent = t(messageKey(step, state.result?.reasonKey)); hint.textContent = `${step === 'resting' ? t('calib.openEyes') + ' ' : ''}${t('calib.failureNote')}`;
            const retry = (): void => { add('calib.retry', () => send('retry')); };
            const fallback = (): void => { add(step === 'active' ? 'calib.steadyLight' : state.activeCalibrated ? 'calib.activeOnly' : 'calib.continueWithout', () => {
              if (step === 'active') send('useSteadyLight'); else dispatch({ type: 'continueWithout' });
            }); };
            if (preferCalibrationFallback(state)) { fallback(); retry(); } else { retry(); fallback(); }
          }
          break;
        }
        case 'done':
          instruction.textContent = t(state.restingCalibrated ? 'calib.done' : state.activeCalibrated ? 'calib.activeOnlyReady' : 'calib.withoutResting');
          hint.textContent = t('calib.openEyes'); add('calib.returnToPause', close); break;
        case 'closed': close(); return;
      }
      const first = buttons.querySelector<HTMLButtonElement>('button:not(:disabled)');
      queueMicrotask(() => { if (alive && dialog.open && first?.isConnected) first.focus(); });
    }
    const onNavigation = (): void => {
      if (actions.calibrationFrom.get() === null) { if (dialog.open) close(); return; }
      if (!allowed()) { actions.calibrationFrom.set(null); return; }
      if (!dialog.open) { generation++; state = createCalibrationFlow(); render(); dialog.showModal(); buttons.querySelector('button')?.focus(); }
    };
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); if (!running()) close(); });
    dialog.addEventListener('keydown', (event) => event.stopPropagation());
    dialog.addEventListener('keyup', (event) => event.stopPropagation());
    const offNavigation = actions.calibrationFrom.subscribe(onNavigation);
    const offSnapshot = stores.snapshot.subscribe(() => { if (dialog.open && !allowed()) close(); });
    const offSignal = signal.reader.subscribe(() => {
      if (dialog.open && state.screen === 'source') { const button = buttons.querySelector('button'); if (button) button.disabled = !fresh(); }
    });
    const timer = window.setInterval(() => {
      if (!dialog.open || !running()) return;
      dispatch({ type: 'tick', nowMs: performance.now() });
      progress.value = state.startedAtMs === null ? 0 : Math.max(0, Math.min(1, (performance.now() - state.startedAtMs) / state.durationMs));
    }, 100);
    onNavigation();
    return () => { alive = false; generation++; clearInterval(timer); offNavigation(); offSnapshot(); offSignal();
      if (dialog.open) dialog.close(); dialog.remove(); cues.dispose(); actions.calibrationFrom.set(null); };
  },
};
