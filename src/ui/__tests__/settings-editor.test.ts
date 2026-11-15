/** Remapping keeps other actions reachable instead of introducing duplicate bindings. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import { remapAllowed, remapKey } from '../components/settings-panel/settings-editor';
import { keyLabel } from '../components/world-tutorial/layout';
import { createUiActions } from '../ui-actions';
describe('menu settings', () => {
  it('changes one unused binding without mutating input', () => {
    const keys = DEFAULT_SETTINGS.keys;
    expect(remapKey(keys, 'jump', 'KeyW')).toEqual({ ...keys, jump: 'KeyW' });
    expect(keys.jump).toBe('Space');
  });
  it('swaps a duplicate binding so both actions remain reachable', () => {
    const keys = remapKey(DEFAULT_SETTINGS.keys, 'left', 'ArrowRight');
    expect(keys.left).toBe('ArrowRight'); expect(keys.right).toBe('ArrowLeft');
    expect(new Set(Object.values(keys)).size).toBe(Object.keys(keys).length);
  });
  it('keeps the same assignment stable and independent', () => {
    const next = remapKey(DEFAULT_SETTINGS.keys, 'jump', 'Space');
    expect(next).toEqual(DEFAULT_SETTINGS.keys); expect(next).not.toBe(DEFAULT_SETTINGS.keys);
  });
  it('refuses keys the game or pause menu already handle themselves', () => {
    const keys = DEFAULT_SETTINGS.keys;
    for (const code of ['KeyE', 'KeyP', 'Escape']) expect(remapAllowed(keys, 'jump', code)).toBe(false);
    expect(remapAllowed(keys, 'left', 'KeyP')).toBe(false);
    expect(remapAllowed(keys, 'pause', 'KeyE')).toBe(false);
    expect(remapAllowed(keys, 'pause', 'KeyP')).toBe(true);
    expect(remapAllowed(keys, 'pause', 'Escape')).toBe(true);
    expect(remapAllowed(keys, 'jump', 'KeyW')).toBe(true);
    expect(remapAllowed(keys, 'left', 'ArrowRight')).toBe(true);
  });
  it('refuses a swap that would move another action onto a reserved key', () => {
    expect(remapAllowed(DEFAULT_SETTINGS.keys, 'pause', 'Space')).toBe(false);
    expect(remapAllowed(DEFAULT_SETTINGS.keys, 'pause', 'KeyQ')).toBe(true);
  });
  it('labels bindings for people, not as raw key codes', () => {
    expect(['KeyR', 'Backquote', 'ArrowLeft', 'Escape', 'Digit3', 'Space'].map(keyLabel)).toEqual(['R', '`', '←', 'Esc', '3', 'Space']);
  });
  it('isolates navigation between mounted UI instances', () => {
    const a = createUiActions(), b = createUiActions(false);
    a.settingsOpen.set(true);
    expect(b.settingsOpen.get()).toBe(false); expect(b.settingsAvailable).toBe(false);
  });
});

describe('calibration navigation capability', () => {
  it('records and clears a local opener without shared game state', () => {
    const actions = createUiActions();
    actions.openCalibration('pause');
    expect(actions.calibrationFrom.get()).toBe('pause');
    actions.calibrationFrom.set(null);
    expect(actions.calibrationFrom.get()).toBeNull();
  });
  it('cannot open a disabled calibration component', () => {
    const actions = createUiActions(true, false);
    actions.openCalibration('signal');
    expect(actions.calibrationFrom.get()).toBeNull();
  });
});
