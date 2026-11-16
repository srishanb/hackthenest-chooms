/** The game-only build's signal: always neutral, always fixed, never a device. */
import { expect, it } from 'vitest';
import { createStillSignal } from '../still-signal';

it('always reports the neutral fixed-mode state', () => {
  const signal = createStillSignal(0.2, () => 1234);
  const state = signal.reader.getState();
  expect(state).toMatchObject({ intensity: 0.2, mode: 'fixed', valid: false, calibrated: false, t: 1234 });
  let calls = 0;
  const off = signal.reader.subscribe(() => { calls++; });
  off();
  expect(calls).toBe(0);
});

it('accepts every control call without touching anything', async () => {
  const signal = createStillSignal(0.2);
  await expect(signal.control.connect('LIVE_EEG')).resolves.toBeUndefined();
  signal.control.setMode('adaptive');
  signal.control.disconnect();
  expect(signal.reader.getState().mode).toBe('fixed');
  await expect(signal.control.calibrate('resting')).resolves.toMatchObject({ ok: false });
  await expect(signal.presets.list()).resolves.toEqual([]);
  expect(signal.exportRecording()).toBe('');
  expect(() => signal.presets.saveCurrent('x')).toThrow();
});
