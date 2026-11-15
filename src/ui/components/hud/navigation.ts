/** Read-only navigation math: screen-space world coordinates, explicit metres conversion. */
import type { NavigationSnapshot } from '../../../shared/contracts/game-state';
export function navigationView(navigation: NavigationSnapshot | undefined, pixelsPerMetre: number) {
  if (!navigation || !Number.isFinite(pixelsPerMetre) || pixelsPerMetre <= 0 ||
    !Number.isFinite(navigation.originY) || !Number.isFinite(navigation.player.x) || !Number.isFinite(navigation.player.y)) return null;
  const checkpoints = navigation.checkpoints.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  let nearest: (typeof checkpoints)[number] | undefined;
  let distancePx = Infinity;
  for (const point of checkpoints) {
    const distance = Math.hypot(point.x - navigation.player.x, point.y - navigation.player.y);
    if (distance < distancePx) { nearest = point; distancePx = distance; }
  }
  return {
    heightMetres: Math.max(0, (navigation.originY - navigation.player.y) / pixelsPerMetre),
    checkpoint: nearest ? {
      id: nearest.id, distanceMetres: distancePx / pixelsPerMetre,
      angleDegrees: Math.atan2(nearest.y - navigation.player.y, nearest.x - navigation.player.x) * 180 / Math.PI + 90,
    } : null,
  };
}
