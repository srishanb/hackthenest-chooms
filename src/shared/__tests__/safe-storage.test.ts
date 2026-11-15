import { describe, expect, it } from 'vitest';
import { createMemoryStorage, getLocalStorage } from '../safe-storage';

describe('getLocalStorage', () => {
  it('returns the storage when readable', () => {
    const storage = createMemoryStorage() as unknown as Storage;
    expect(getLocalStorage({ localStorage: storage })).toBe(storage);
  });

  it('returns undefined when reading the property throws (storage blocked)', () => {
    const blocked = {
      get localStorage(): Storage {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };
    expect(getLocalStorage(blocked)).toBeUndefined();
  });

  it('returns undefined when there is no storage', () => {
    expect(getLocalStorage({})).toBeUndefined();
  });
});

describe('createMemoryStorage', () => {
  it('stores, reads and removes values', () => {
    const storage = createMemoryStorage();
    expect(storage.getItem('a')).toBeNull();
    storage.setItem('a', '1');
    expect(storage.getItem('a')).toBe('1');
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
  });
});
