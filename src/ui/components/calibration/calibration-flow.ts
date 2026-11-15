/**
 * Pure calibration navigation and halfway cues, driven by config durations and a clock.
 * Commands are returned as ordered data; only the screen calls SignalControl. In the
 * steady-light fallback, setMode must run before starting resting calibration.
 */
import type { SignalConfig } from '../../../shared/contracts/config';
import type { CalibrationResult, CalibrationStep } from '../../../shared/contracts/signal-api';
import type { StringKey } from '../../strings';

export type CalibrationScreen = 'intro' | 'source' | 'activeLow' | 'activeHigh'
  | 'activeResult' | 'restingLow' | 'restingHigh' | 'restingResult' | 'done' | 'closed';
export interface CalibrationFlow {
  screen: CalibrationScreen;
  startedAtMs: number | null;
  durationMs: number;
  activeCalibrated: boolean;
  restingCalibrated: boolean;
  failures: Record<CalibrationStep, number>;
  result: CalibrationResult | null;
}
export type FlowInput =
  | { type: 'start' | 'retry' | 'useSteadyLight' | 'tick'; nowMs: number }
  | { type: 'result'; result: CalibrationResult }
  | { type: 'continueWithout' | 'close' };
export type FlowCommand = { type: 'calibrate'; step: CalibrationStep } | { type: 'setMode'; mode: 'fixed' };
export interface FlowUpdate { state: CalibrationFlow; commands: FlowCommand[] }

export function createCalibrationFlow(): CalibrationFlow {
  return { screen: 'intro', startedAtMs: null, durationMs: 0,
    activeCalibrated: false, restingCalibrated: false,
    failures: { active: 0, resting: 0 }, result: null };
}

function runningStep(screen: CalibrationScreen): CalibrationStep | null {
  if (screen === 'activeLow' || screen === 'activeHigh') return 'active';
  if (screen === 'restingLow' || screen === 'restingHigh') return 'resting';
  return null;
}

export function preferCalibrationFallback(state: CalibrationFlow): boolean {
  const step = state.screen === 'activeResult' ? 'active' : state.screen === 'restingResult' ? 'resting' : null;
  return step !== null && state.result?.ok === false && state.failures[step] >= 2;
}

/** Unknown reason keys always resolve to reviewed text, never raw diagnostic keys. */
export function messageKey(step: CalibrationStep, reasonKey?: string): StringKey {
  const keys: Record<CalibrationStep, Record<string, StringKey>> = {
    active: {
      'calibration.tooFewSamples': 'calib.fail.tooFewSamples.active',
      'calibration.unstable': 'calib.fail.unstable.active',
      'calibration.noSeparation': 'calib.fail.noSeparation.active',
    },
    resting: {
      'calibration.tooFewSamples': 'calib.fail.tooFewSamples.resting',
      'calibration.unstable': 'calib.fail.unstable.resting',
      'calibration.noSeparation': 'calib.fail.noSeparation.resting',
    },
  };
  return reasonKey && Object.hasOwn(keys[step], reasonKey) ? (keys[step][reasonKey] ?? 'calib.fail.unknown') : 'calib.fail.unknown';
}

export function stepFlow(state: CalibrationFlow, input: FlowInput,
  durations: SignalConfig['calibration']): FlowUpdate {
  const idle = (): FlowUpdate => ({ state, commands: [] });
  const begin = (step: CalibrationStep, nowMs: number, commands: FlowCommand[] = []): FlowUpdate => {
    const durationMs = step === 'active' ? durations.activeMs : durations.restingMs;
    if (!Number.isFinite(nowMs) || !Number.isFinite(durationMs) || durationMs <= 0) return idle();
    return { state: { ...state, screen: step === 'active' ? 'activeLow' : 'restingLow',
      startedAtMs: nowMs, durationMs, result: null }, commands: [...commands, { type: 'calibrate', step }] };
  };
  const running = runningStep(state.screen);
  if (input.type === 'tick') {
    if (!running || state.startedAtMs === null || !Number.isFinite(input.nowMs)) return idle();
    if (input.nowMs < state.startedAtMs + state.durationMs / 2) return idle();
    return { state: { ...state, screen: running === 'active' ? 'activeHigh' : 'restingHigh' }, commands: [] };
  }
  if (input.type === 'result') {
    if (!running || input.result.step !== running) return idle();
    const ok = input.result.ok;
    return { state: { ...state,
      screen: running === 'active' ? 'activeResult' : ok ? 'done' : 'restingResult',
      startedAtMs: null, result: { ...input.result },
      activeCalibrated: running === 'active' ? ok : state.activeCalibrated,
      restingCalibrated: running === 'resting' ? ok : state.restingCalibrated,
      failures: { ...state.failures, [running]: state.failures[running] + (ok ? 0 : 1) },
    }, commands: [] };
  }
  // Do not close, retry, or start twice while a SignalControl promise is outstanding.
  if (running) return idle();
  if (input.type === 'close') return { state: { ...state, screen: 'closed' }, commands: [] };
  if (input.type === 'start') {
    if (state.screen === 'intro') return { state: { ...state, screen: 'source' }, commands: [] };
    if (state.screen === 'source') return begin('active', input.nowMs);
    if (state.screen === 'activeResult' && state.result?.ok) return begin('resting', input.nowMs);
  }
  if (input.type === 'retry' && state.result?.ok === false) {
    if (state.screen === 'activeResult') return begin('active', input.nowMs);
    if (state.screen === 'restingResult') return begin('resting', input.nowMs);
  }
  if (input.type === 'useSteadyLight' && state.screen === 'activeResult' && state.result?.ok === false) {
    return begin('resting', input.nowMs, [{ type: 'setMode', mode: 'fixed' }]);
  }
  if (input.type === 'continueWithout' && ((state.screen === 'restingResult' && state.result?.ok === false) ||
    (state.screen === 'activeResult' && state.activeCalibrated))) {
    return { state: { ...state, screen: 'done', restingCalibrated: false },
      commands: state.activeCalibrated ? [] : [{ type: 'setMode', mode: 'fixed' }] };
  }
  return idle();
}
