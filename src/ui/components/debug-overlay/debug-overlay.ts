/**
 * Debug overlay: the numbers behind the signal, toggled with the backtick key.
 * Owner: signal lane (Srishan), even though it lives in the UI folder.
 *
 * Why: there is no on-screen meter by design, so this is how we (and a judge) see cause
 * and effect: the value, its quality, how fresh it is, and what the game does with it.
 * P1.6 adds quality parts, aligned diagnostics, developer calibration buttons, recording
 * download, and the simulator key legend.
 */
import { SIGNAL_CONFIG } from '../../../config/signal.config';
import type { ComposureState } from '../../../shared/contracts/composure';
import type { CalibrationStep } from '../../../shared/contracts/signal-api';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import './debug-overlay.css';

const fixed = (value: number, digits = 2): string => value.toFixed(digits);
const optionalFixed = (value: number | null, digits = 2): string => (value === null ? 'n/a' : fixed(value, digits));

function triggerJsonlDownload(jsonl: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lighten-recording-${stamp}.jsonl`;
  link.click();
  URL.revokeObjectURL(url);
}

export const debugOverlay: UiComponent = {
  id: 'debug-overlay',
  visibleIn: 'always',
  mount(root, { signal, stores }) {
    const panel = document.createElement('section');
    panel.className = 'debug-overlay';
    panel.hidden = true;

    const title = document.createElement('div');
    title.className = 'debug-overlay__title';
    title.textContent = t('debug.title');

    const hint = document.createElement('div');
    hint.className = 'debug-overlay__hint';
    hint.textContent = t('debug.hint');

    const rows = document.createElement('pre');
    rows.className = 'debug-overlay__rows';

    const actions = document.createElement('div');
    actions.className = 'debug-overlay__actions';

    const calibrateActiveBtn = document.createElement('button');
    calibrateActiveBtn.type = 'button';
    calibrateActiveBtn.className = 'debug-overlay__btn';
    calibrateActiveBtn.textContent = t('debug.calibrateActive');

    const calibrateRestingBtn = document.createElement('button');
    calibrateRestingBtn.type = 'button';
    calibrateRestingBtn.className = 'debug-overlay__btn';
    calibrateRestingBtn.textContent = t('debug.calibrateResting');

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'debug-overlay__btn';
    downloadBtn.textContent = t('debug.downloadRecording');

    actions.append(calibrateActiveBtn, calibrateRestingBtn, downloadBtn);

    const status = document.createElement('div');
    status.className = 'debug-overlay__status';

    const legend = document.createElement('pre');
    legend.className = 'debug-overlay__legend';
    const { simKeys } = SIGNAL_CONFIG;
    legend.textContent = [
      t('debug.simLegendTitle'),
      `  ${simKeys.alpha.padEnd(8)} ${t('debug.simKey.alpha')}`,
      `  ${simKeys.clench.padEnd(8)} ${t('debug.simKey.clench')}`,
      `  ${simKeys.blink.padEnd(8)} ${t('debug.simKey.blink')}`,
      `  ${simKeys.noisyPin.padEnd(8)} ${t('debug.simKey.noisyPin')}`,
    ].join('\n');

    panel.append(title, hint, rows, actions, status, legend);
    root.append(panel);

    const downloadCurrentRecording = (): void => {
      triggerJsonlDownload(signal.exportRecording());
      status.dataset.tone = 'ok';
      status.textContent = t('debug.recordingDownloaded');
    };

    const setCalibrationBusy = (busy: boolean): void => {
      calibrateActiveBtn.disabled = busy;
      calibrateRestingBtn.disabled = busy;
    };

    const runCalibration = async (step: CalibrationStep): Promise<void> => {
      setCalibrationBusy(true);
      status.dataset.tone = '';
      status.textContent = t('debug.calibrating');
      try {
        const result = await signal.control.calibrate(step);
        if (result.ok) {
          status.dataset.tone = 'ok';
          status.textContent = `${step}: ${t('debug.calibrationOk')}`;
        } else {
          status.dataset.tone = 'bad';
          status.textContent = `${step}: ${result.reasonKey ?? t('debug.calibrationUnknown')}`;
        }
      } catch (error) {
        status.dataset.tone = 'bad';
        status.textContent = `${step}: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        setCalibrationBusy(false);
        render(signal.reader.getState());
      }
    };

    calibrateActiveBtn.addEventListener('click', () => {
      void runCalibration('active');
    });
    calibrateRestingBtn.addEventListener('click', () => {
      void runCalibration('resting');
    });
    downloadBtn.addEventListener('click', downloadCurrentRecording);

    const render = (state: ComposureState): void => {
      if (panel.hidden) return;
      const diagnostics = signal.getDiagnostics();
      const featureEntries = Object.entries(diagnostics.features);
      const thresholdEntries = Object.entries(diagnostics.thresholds);
      const diagKeyWidth = Math.max(
        16,
        ...featureEntries.map(([name]) => name.length),
        ...thresholdEntries.map(([name]) => name.length),
      );
      const labelWidth = diagKeyWidth + 5; // matches "feat " / "thr  " prefix + diagKeyWidth

      const lines = [
        `${'source'.padEnd(labelWidth)} ${state.source}`,
        `${'algo'.padEnd(labelWidth)} ${state.algo}`,
        `${'mode'.padEnd(labelWidth)} ${state.mode}`,
        `${'intensity'.padEnd(labelWidth)} ${fixed(state.intensity)}`,
        `${'resting'.padEnd(labelWidth)} ${fixed(state.resting)}  active=${state.restingActive}`,
        `${'quality'.padEnd(labelWidth)} ${fixed(state.quality)}  contact=${optionalFixed(diagnostics.contactGood01)}  loss=${optionalFixed(diagnostics.packetLoss01)}`,
        `${'validity'.padEnd(labelWidth)} valid=${state.valid}  held=${state.held}`,
        `${'sample age'.padEnd(labelWidth)} ${fixed(state.sampleAgeMs, 0)} ms`,
        `${'calibrated'.padEnd(labelWidth)} ${state.calibrated}`,
        ...featureEntries.map(([name, value]) => `feat ${name.padEnd(diagKeyWidth)} ${fixed(value, 3)}`),
        ...thresholdEntries.map(([name, value]) => `thr  ${name.padEnd(diagKeyWidth)} ${fixed(value, 3)}`),
        `${'lantern'.padEnd(labelWidth)} ${fixed(stores.effects.get().lanternRadius, 0)} px`,
        `${'ember'.padEnd(labelWidth)} ${fixed(stores.snapshot.get().ember.progress01)}`,
      ];
      rows.textContent = lines.join('\n');
      legend.hidden = state.source !== 'SIMULATED';
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.code === stores.settings.get().keys.debugOverlay) {
        panel.hidden = !panel.hidden;
        render(signal.reader.getState());
        return;
      }
      if (!panel.hidden && event.shiftKey && event.code === 'KeyR') {
        downloadCurrentRecording();
      }
    };

    window.addEventListener('keydown', onKey);
    const unsubscribeSignal = signal.reader.subscribe((state) => {
      render(state);
    });

    return () => {
      window.removeEventListener('keydown', onKey);
      unsubscribeSignal();
    };
  },
};
