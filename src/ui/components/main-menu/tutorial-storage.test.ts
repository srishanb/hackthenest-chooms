/** The guide appears for new players and stays dismissed without touching checkpoint data. */
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../../shared/safe-storage';
import { hasSeenTutorial, rememberTutorial, TUTORIAL_STORAGE_KEY } from './tutorial-storage';

describe('first-launch tutorial', () => {
  it('appears initially, remembers completion and preserves the checkpoint', () => {
    const storage = createMemoryStorage();
    storage.setItem('lighten.save.v1', 'existing checkpoint');
    expect(hasSeenTutorial(storage)).toBe(false);
    rememberTutorial(storage);
    expect(hasSeenTutorial(storage)).toBe(true);
    expect(storage.getItem('lighten.save.v1')).toBe('existing checkpoint');
  });

  it('does not treat an invalid completion value as a finished tutorial', () => {
    const storage = createMemoryStorage();
    storage.setItem(TUTORIAL_STORAGE_KEY, 'invalid');
    expect(hasSeenTutorial(storage)).toBe(false);
  });

  it('still permits play when storage is unavailable or blocked', () => {
    expect(hasSeenTutorial()).toBe(false);
    expect(() => rememberTutorial()).not.toThrow();
    const blocked = { getItem(): string | null { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
    expect(hasSeenTutorial(blocked)).toBe(false);
    expect(() => rememberTutorial(blocked)).not.toThrow();
  });
});
