/**
 * A short fingerprint of everything that shapes the world, sent in the handshake as the "build version".
 *
 * Two games only play together when they build the same climb from the same seed. The generator's numbers live
 * in three config files, so their JSON is hashed (FNV-1a, 32 bit) together with `WORLD_REVISION`, which is bumped
 * by hand when the generator's code changes how it builds chunks. A mismatch ends the handshake with a reason.
 */
/** Bump when a code change makes the generator build different chunks from the same config. */
export const WORLD_REVISION = 1;

/** FNV-1a over the text, as 8 hex digits. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** The fingerprint of these configs (pass the game, endless and pieces configs). */
export function buildId(...configs: readonly unknown[]): string {
  return `w${WORLD_REVISION}-${fnv1a(JSON.stringify(configs))}`;
}
