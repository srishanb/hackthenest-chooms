/** Remapping keeps other actions reachable instead of introducing duplicate bindings. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import { remapKey } from '../components/settings-panel/settings-editor';
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
  it('isolates navigation between mounted UI instances', () => {
    const a = createUiActions(), b = createUiActions(false);
    a.settingsOpen.set(true);
    expect(b.settingsOpen.get()).toBe(false); expect(b.settingsAvailable).toBe(false);
  });
});
