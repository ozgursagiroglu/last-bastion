/** Per-frame enemy pose maths that does not touch the engine. */

/** cos(heading) past which a walker turns around; the gap between ±FLIP_COS keeps it from flickering on steep roads. */
export const FLIP_COS = 0.2;

/** Facing for a new heading, keeping the previous one inside the hysteresis band. */
export function nextFacingLeft(wasLeft: boolean, heading: number): boolean {
  const c = Math.cos(heading);
  if (wasLeft) return c <= FLIP_COS;
  return c < -FLIP_COS;
}

/** Facing of an enemy seen for the first time. */
export function initialFacingLeft(heading: number): boolean {
  return Math.cos(heading) < 0;
}

/** 'walk' clip time for a distance along the path: one cycle per stride (the caller loops it). */
export function walkTime(distance: number, stride: number, duration: number): number {
  return stride > 0 ? (distance / stride) * duration : 0;
}

/** Time into a once clip that started at `since` (world time), or null when it is not playing at `now`. */
export function clipTimeSince(now: number, since: number, duration: number): number | null {
  const t = now - since;
  return t >= 0 && t <= duration ? t : null;
}
