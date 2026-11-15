/** Manual ember persistence rejects old automatic checkpoints and invalid anchors. */
import { describe, expect, it } from 'vitest';
import { SAVE_KEY, clearSave, createMemorySaveStorage, loadSave, parseSave, serializeSave, writeSave } from '../save';
import type { SavedProgress, SaveStorage } from '../save';
const progress: SavedProgress = { v: 2, anchor: { platformId: 'upper', x: 100, y: -20 } };
describe('manual ember saves', () => {
  it('round trips only the player-placed marker and clears it on finish', () => {
    const storage = createMemorySaveStorage();
    expect(writeSave(storage, progress)).toBe(true);
    expect(loadSave(storage)).toEqual(progress);
    expect(storage.getItem(SAVE_KEY)).toBe(serializeSave(progress));
    expect(clearSave(storage)).toBe(true); expect(loadSave(storage)).toBeNull();
  });
  it.each([null, '{oops', 'null', '{}', JSON.stringify({v: 1, refugeId: 'old', emberAvailable: true, visitedRefugeIds: ['old']}),
    JSON.stringify({v: 2, anchor: {platformId: '', x: 1, y: 2}}), JSON.stringify({v: 2, anchor: {platformId: 'a', x: 'bad', y: 2}})
  ])('rejects invalid or legacy save %s', (text) => expect(parseSave(text)).toBeNull());
  it('persists the carried state without creating a checkpoint', () => {
    expect(parseSave(serializeSave({v: 2, anchor: null}))).toEqual({v: 2, anchor: null});
  });
  it('tolerates blocked reads/writes/removal', () => {
    const storage: SaveStorage = {getItem() {throw Error('blocked');}, setItem() {throw Error('quota');}, removeItem() {throw Error('blocked');}};
    expect(loadSave(storage)).toBeNull(); expect(writeSave(storage, progress)).toBe(false); expect(clearSave(storage)).toBe(false);
  });
});
