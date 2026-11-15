/** Protect publishing from other origins, non-loopback clients and oversized payloads. */
import { expect, it } from 'vitest';
import { isLocalRequest, readBody } from './server';
import { validateLayouts } from '../../src/game/editor/layouts';
import { DEFAULT_SECTIONS } from '../../src/content/sections/defaults';
import { SECTIONS } from '../../src/content/sections';
it('loads the bundled team layout in a fresh game without browser storage', () => {
  expect(validateLayouts(SECTIONS, DEFAULT_SECTIONS)).toEqual(SECTIONS);
});
it('allows the local editor but rejects remote origins, clients, and rebinding hosts', () => {
  const request = { headers: { host: '127.0.0.1:5192', origin: 'http://127.0.0.1:5192' }, socket: { remoteAddress: '127.0.0.1' } };
  expect(isLocalRequest(request)).toBe(true);
  expect(isLocalRequest({ ...request, headers: { ...request.headers, origin: 'https://evil.example' } })).toBe(false);
  expect(isLocalRequest({ ...request, headers: { host: 'evil.example', origin: 'http://evil.example' } })).toBe(false);
  expect(isLocalRequest({ ...request, socket: { remoteAddress: '192.168.1.5' } })).toBe(false);
  expect(isLocalRequest({ ...request, headers: { host: request.headers.host } })).toBe(false);
});
it('rejects malformed JSON and limits the total bytes across chunks', async () => {
  async function* chunks(...values: string[]) { yield* values; }
  await expect(readBody(chunks('{bad'))).rejects.toThrow();
  await expect(readBody(chunks(' '.repeat(500_001), ' '.repeat(500_001)))).rejects.toThrow('1 MB');
  expect(validateLayouts(await readBody(chunks(JSON.stringify(DEFAULT_SECTIONS))), DEFAULT_SECTIONS)).toEqual(DEFAULT_SECTIONS);
  expect(() => validateLayouts([], DEFAULT_SECTIONS)).toThrow();
});
