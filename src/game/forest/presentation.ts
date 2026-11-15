/** Pure continuous visual mapping and stable seeds, independent of devices and player mechanics. */
/** Match the visible partner, not its unscaled source sheet; never cover a landing with a giant prop. */
export function fitPropScale(nativeHeight: number, partnerDisplayHeight: number): number {
  if (!Number.isFinite(nativeHeight) || nativeHeight <= 0 || !Number.isFinite(partnerDisplayHeight)) return 0;
  return Math.max(0, Math.min(48, partnerDisplayHeight)) / nativeHeight;
}

export function stableUnit(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

export function reveal(value: number, threshold: number): number {
  const t = Math.max(0, Math.min(1, (value - threshold) / 0.3));
  return t * t * (3 - 2 * t);
}

export function mixColor(a: number, b: number, value: number): number {
  const t = Math.max(0, Math.min(1, value));
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
