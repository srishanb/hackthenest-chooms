/** Start menu rules: shown only before the climb, steps aside for settings, Enter starts Play. */
import { describe, expect, it } from 'vitest';
import { canContinue, menuSelection, startStalled, startMenuVisible, startsOnKey, type StartKeyInput } from '../components/start-menu/start-menu-state';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';

const key = (over: Partial<StartKeyInput> = {}): StartKeyInput =>
  ({ code: 'Enter', repeat: false, phase: 'menu', settingsOpen: false, focusOnControl: false, ...over });

it('only offers Continue for existing game resume state or a session already played', () => {
  expect(canContinue(INITIAL_GAME_SNAPSHOT, false)).toBe(false);
  expect(canContinue(INITIAL_GAME_SNAPSHOT, true)).toBe(true);
  expect(canContinue({ ...INITIAL_GAME_SNAPSHOT, promptKey: 'ember.placedHint' }, false)).toBe(true);
  expect(canContinue({ ...INITIAL_GAME_SNAPSHOT, navigation: { player: { x: 0, y: 0 }, originY: 0, lanternRadiusPx: 200,
    checkpoints: [{ id: 'saved', x: 0, y: 0 }] } }, false)).toBe(true);
});

it('wraps arrow focus and handles no focused button, Home, End and unavailable controls', () => {
  expect(menuSelection(3, 4, 'ArrowDown')).toBe(0);
  expect(menuSelection(0, 4, 'ArrowUp')).toBe(3);
  expect(menuSelection(-1, 4, 'ArrowDown')).toBe(0);
  expect(menuSelection(-1, 4, 'ArrowUp')).toBe(3);
  expect(menuSelection(2, 4, 'Home')).toBe(0);
  expect(menuSelection(2, 4, 'End')).toBe(3);
  expect(menuSelection(0, 0, 'ArrowDown')).toBe(-1);
});

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

describe('startStalled', () => {
  it('unlocks the menu only when the start request left the phase in menu', () => {
    expect(startStalled('menu')).toBe(true);
    for (const phase of ['playing', 'calibrating', 'paused'] as const) expect(startStalled(phase)).toBe(false);
  });
});
