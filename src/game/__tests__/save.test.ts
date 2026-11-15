/** Persistence survives reloads and rejects corrupt data without interrupting gameplay. */
import { describe, expect, it } from 'vitest';
import { SAVE_KEY, clearSave, createMemorySaveStorage, loadSave, parseSave, serializeSave, writeSave } from '../save';
import type { SavedProgress, SaveStorage } from '../save';

const progress: SavedProgress = {
  v: 1, refugeId: 'upper', emberAvailable: false, visitedRefugeIds: ['lower', 'upper'],
};

describe('checkpoint save format', () => {
  it('round trips checkpoint, spent ember, and first-visit history', () => {
    const storage = createMemorySaveStorage();
    expect(writeSave(storage, progress)).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toBe(serializeSave(progress));
    expect(loadSave(storage)).toEqual(progress);
    expect(clearSave(storage)).toBe(true);
    expect(loadSave(storage)).toBeNull();
  });

  it.each([null, '{oops', 'null', '[]', '42', '{}',
    JSON.stringify({ ...progress, v: 2 }),
    JSON.stringify({ ...progress, emberAvailable: 'false' }),
    JSON.stringify({ ...progress, refugeId: 'missing' }),
    JSON.stringify({ ...progress, visitedRefugeIds: [42] }),
    JSON.stringify({ ...progress, refugeId: '' }),
  ])('rejects missing or invalid save %s', (text) => {
    expect(parseSave(text)).toBeNull();
  });

  it('can remember a spent starting ember before reaching a checkpoint', () => {
    const fresh: SavedProgress = { v: 1, refugeId: null, emberAvailable: false, visitedRefugeIds: [] };
    expect(parseSave(serializeSave(fresh))).toEqual(fresh);
  });

  it('tolerates blocked storage reads, quota failures, and removal failures', () => {
    const storage: SaveStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('blocked'); },
    };
    expect(loadSave(storage)).toBeNull();
    expect(writeSave(storage, progress)).toBe(false);
    expect(clearSave(storage)).toBe(false);
  });
});
