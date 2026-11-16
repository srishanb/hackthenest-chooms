/** The desktop app's icon is the size the packager needs to make every platform's icon from it. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('desktop/icons/icon.png is a square PNG of 1024 px', () => {
  const bytes = readFileSync(fileURLToPath(new URL('../../desktop/icons/icon.png', import.meta.url)));
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // The header chunk holds the width and the height.
  expect(bytes.readUInt32BE(16)).toBe(1024);
  expect(bytes.readUInt32BE(20)).toBe(1024);
});
