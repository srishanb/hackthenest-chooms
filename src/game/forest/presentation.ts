/** Pure continuous visual mapping and stable seeds, independent of devices and player mechanics. */
/** A piece of art's drawn size in world px. */
export interface DrawnSize { width: number; height: number }

/**
 * Pick art by what fits instead of squeezing it: the first of `choices`, in order, whose drawn size
 * fits inside `maxWidth` x `maxHeight`; when none fits, the smallest (by height). Every prop is then
 * drawn at the one pixel size, never scaled to fit. `size` gives a choice's drawn size.
 */
export function pickFitting<T>(choices: readonly T[], size: (choice: T) => DrawnSize, maxWidth: number, maxHeight: number): T | undefined {
  const fits = choices.find((choice) => { const s = size(choice); return s.width <= maxWidth && s.height <= maxHeight; });
  if (fits !== undefined) return fits;
  let smallest: T | undefined;
  for (const choice of choices) if (smallest === undefined || size(choice).height < size(smallest).height) smallest = choice;
  return smallest;
}

/**
 * A decayed partner for a healthy prop: a seeded pick (`unit01` in 0..1) among the choices no taller
 * than `maxHeight`, so the partner never grows tall over a landing; the smallest when none is.
 */
export function pickPartner<T>(choices: readonly T[], size: (choice: T) => DrawnSize, maxHeight: number, unit01: number): T | undefined {
  const fitting = choices.filter((choice) => size(choice).height <= maxHeight);
  if (fitting.length === 0) return pickFitting(choices, size, -1, -1);
  const unit = Math.max(0, Math.min(1, Number.isFinite(unit01) ? unit01 : 0));
  return fitting[Math.min(fitting.length - 1, Math.floor(unit * fitting.length))];
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
