/** Pure flow checks: clock boundaries, fallback honesty and duplicate-call protection. */
import { describe, expect, it } from 'vitest';
import { createCalibrationFlow, messageKey, preferCalibrationFallback, stepFlow,
  type CalibrationFlow, type FlowInput } from '../components/calibration/calibration-flow';
import { STRINGS } from '../strings';
const durations = { activeMs: 12000, restingMs: 8000 };
function advance(state: CalibrationFlow, input: FlowInput) { return stepFlow(state, input, durations); }
function active() {
  const source = advance(createCalibrationFlow(), { type: 'start', nowMs: 100 }).state;
  return advance(source, { type: 'start', nowMs: 100 });
}
function activeResult(ok: boolean) {
  return advance(active().state, { type: 'result', result: { step: 'active', ok } });
}

describe('calibration flow', () => {
  it('runs the happy path with distinct configured durations', () => {
    const begin = active();
    expect(begin.commands).toEqual([{ type: 'calibrate', step: 'active' }]);
    expect(begin.state.screen).toBe('activeLow');
    const result = activeResult(true);
    expect(result.state.activeCalibrated).toBe(true);
    const resting = advance(result.state, { type: 'start', nowMs: 13000 });
    expect(resting.commands).toEqual([{ type: 'calibrate', step: 'resting' }]);
    expect(resting.state.durationMs).toBe(8000);
    expect(advance(resting.state, { type: 'tick', nowMs: 17000 }).state.screen).toBe('restingHigh');
    const done = advance(resting.state, { type: 'result', result: { step: 'resting', ok: true } });
    expect(done.state.screen).toBe('done');
    expect(done.state.restingCalibrated).toBe(true);
    expect(done.commands).toEqual([]);
  });

  it('changes instruction at exactly half, relative to step start', () => {
    const state = active().state;
    expect(advance(state, { type: 'tick', nowMs: 6099 }).state.screen).toBe('activeLow');
    const high = advance(state, { type: 'tick', nowMs: 6100 }).state;
    expect(high.screen).toBe('activeHigh');
    expect(advance(high, { type: 'tick', nowMs: 100 }).state.screen).toBe('activeHigh');
    expect(advance(state, { type: 'tick', nowMs: NaN }).state).toBe(state);
    // A clock tick alone never declares a successful calibration.
    expect(advance(high, { type: 'tick', nowMs: 50000 }).state.screen).toBe('activeHigh');
  });

  it('switches to fixed mode before starting resting after an active failure', () => {
    const failed = activeResult(false).state;
    const fallback = advance(failed, { type: 'useSteadyLight', nowMs: 13000 });
    expect(fallback.commands).toEqual([{ type: 'setMode', mode: 'fixed' }, { type: 'calibrate', step: 'resting' }]);
    expect(fallback.state.screen).toBe('restingLow');
    expect(fallback.state.activeCalibrated).toBe(false);
  });

  it('continues honestly after resting failure and requests steady light', () => {
    const resting = advance(activeResult(true).state, { type: 'start', nowMs: 13000 }).state;
    const failed = advance(resting, { type: 'result', result: { step: 'resting', ok: false } }).state;
    const done = advance(failed, { type: 'continueWithout' });
    expect(done.state.screen).toBe('done');
    expect(done.state.restingCalibrated).toBe(false);
    expect(done.commands).toEqual([{ type: 'setMode', mode: 'fixed' }]);
  });

  it('prefers fallback after two failures and retries only the failed step', () => {
    const failed = activeResult(false).state;
    expect(preferCalibrationFallback(failed)).toBe(false);
    const retry = advance(failed, { type: 'retry', nowMs: 13000 });
    expect(retry.commands).toEqual([{ type: 'calibrate', step: 'active' }]);
    const twice = advance(retry.state, { type: 'result', result: { step: 'active', ok: false } }).state;
    expect(preferCalibrationFallback(twice)).toBe(true);
    expect(twice.failures.active).toBe(2);
    expect(failed.failures.active).toBe(1);
  });

  it('ignores duplicate controls while calibrating and wrong-step/late results', () => {
    const state = active().state;
    for (const input of [{ type: 'start', nowMs: 200 }, { type: 'retry', nowMs: 200 },
      { type: 'useSteadyLight', nowMs: 200 }, { type: 'close' }, { type: 'continueWithout' }] as FlowInput[]) {
      expect(advance(state, input)).toEqual({ state, commands: [] });
    }
    expect(advance(state, { type: 'result', result: { step: 'resting', ok: true } }).state).toBe(state);
    const closed = advance(activeResult(false).state, { type: 'close' }).state;
    expect(closed.screen).toBe('closed');
    expect(advance(closed, { type: 'result', result: { step: 'active', ok: true } }).state).toBe(closed);
  });

  it('does not allow fallbacks in unrelated or successful screens', () => {
    for (const state of [createCalibrationFlow(), activeResult(true).state]) {
      expect(advance(state, { type: 'useSteadyLight', nowMs: 100 }).commands).toEqual([]);
      expect(advance(state, { type: 'continueWithout' }).state).toBe(state);
    }
    const source = advance(createCalibrationFlow(), { type: 'start', nowMs: 0 }).state;
    expect(advance(source, { type: 'start', nowMs: NaN }).state).toBe(source);
    expect(stepFlow(source, { type: 'start', nowMs: 0 }, { activeMs: 0, restingMs: 1 }).state).toBe(source);
  });

  it('resolves known reasons per step and hides unknown/prototype keys', () => {
    for (const step of ['active', 'resting'] as const) {
      for (const reason of ['tooFewSamples', 'unstable', 'noSeparation']) {
        expect(messageKey(step, `calibration.${reason}`)).toBe(`calib.fail.${reason}.${step}`);
      }
      for (const reason of [undefined, 'x.y', 'toString', '__proto__']) {
        expect(messageKey(step, reason)).toBe('calib.fail.unknown');
      }
    }
  });

  it('keeps calibration wording within the framing rule', () => {
    const values = Object.entries(STRINGS).filter(([key]) => key.startsWith('calib.'));
    expect(values.length).toBeGreaterThan(20);
    for (const [, text] of values) expect(text).not.toMatch(/emotion|stress|diagnos|therap|medical/i);
    expect(STRINGS['calib.resting.high']).toContain('Eye closure is not proof of calmness');
    expect(STRINGS['calib.intro']).toContain('Muscle activity');
    expect(STRINGS['calib.withoutResting']).toContain('ordinary-input rescue');
  });
});
