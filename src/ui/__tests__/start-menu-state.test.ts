/** Start menu rules: shown only before the climb, steps aside for settings, Enter starts Play. */
import { describe, expect, it } from 'vitest';
import { canContinue, climbMode, dailySeed, menuSelection, modeUrl, startStalled, startMenuVisible, startsOnKey, type StartKeyInput } from '../components/start-menu/start-menu-state';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';

describe('ways to play', () => {
  it('the address says which climb: endless unless it asks for classic', () => {
    expect(climbMode('')).toBe('endless');
    expect(climbMode('?seed=5')).toBe('endless');
    expect(climbMode('?climb=classic')).toBe('classic');
    expect(climbMode('?climb=other')).toBe('endless');
  });

  it("today's climb is the local date as a number, the same all day and different tomorrow", () => {
    expect(dailySeed(new Date(2026, 10, 16, 0, 5))).toBe(20261116);
    expect(dailySeed(new Date(2026, 10, 16, 23, 59))).toBe(20261116);
    expect(dailySeed(new Date(2026, 10, 17, 0, 0))).toBe(20261117);
    expect(dailySeed(new Date(2027, 0, 3))).toBe(20270103);
  });

  it('switching mode or seed changes only that part of the address', () => {
    const base = 'http://localhost:5199/?candleSeed=7';
    expect(modeUrl(base, { climb: 'classic' })).toBe('http://localhost:5199/?candleSeed=7&climb=classic');
    expect(modeUrl('http://localhost:5199/?climb=classic&candleSeed=7', { climb: 'endless' })).toBe(base);
    expect(modeUrl(base, { climb: 'endless', seed: 20261116 })).toBe('http://localhost:5199/?candleSeed=7&seed=20261116');
    expect(modeUrl('http://localhost:5199/?seed=20261116', { seed: null })).toBe('http://localhost:5199/');
    // The classic climb has no seed, so a leftover one is dropped.
    expect(modeUrl('http://localhost:5199/?seed=9', { climb: 'classic' })).toBe('http://localhost:5199/?climb=classic');
  });
});

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
