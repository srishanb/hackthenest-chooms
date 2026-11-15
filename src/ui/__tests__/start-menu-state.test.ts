/** Start menu rules: shown only before the climb, steps aside for settings, Enter starts Play. */
import { describe, expect, it } from 'vitest';
import { startMenuVisible, startsOnKey, type StartKeyInput } from '../components/start-menu/start-menu-state';

const key = (over: Partial<StartKeyInput> = {}): StartKeyInput =>
  ({ code: 'Enter', repeat: false, phase: 'menu', settingsOpen: false, focusOnControl: false, ...over });

describe('startMenuVisible', () => {
  it('shows only in the menu phase', () => {
    expect(startMenuVisible('menu', false)).toBe(true);
    for (const phase of ['playing', 'paused', 'ember', 'finished', 'calibrating'] as const) {
      expect(startMenuVisible(phase, false)).toBe(false);
    }
  });

  it('hides while the settings panel is open', () => {
    expect(startMenuVisible('menu', true)).toBe(false);
  });
});

describe('startsOnKey', () => {
  it('starts on Enter in the menu', () => {
    expect(startsOnKey(key())).toBe(true);
    expect(startsOnKey(key({ code: 'NumpadEnter' }))).toBe(true);
  });

  it('ignores other keys, repeats and focused controls', () => {
    expect(startsOnKey(key({ code: 'Space' }))).toBe(false);
    expect(startsOnKey(key({ repeat: true }))).toBe(false);
    expect(startsOnKey(key({ focusOnControl: true }))).toBe(false);
  });

  it('never starts outside the menu or with settings open', () => {
    expect(startsOnKey(key({ phase: 'playing' }))).toBe(false);
    expect(startsOnKey(key({ phase: 'paused' }))).toBe(false);
    expect(startsOnKey(key({ settingsOpen: true }))).toBe(false);
  });
});
