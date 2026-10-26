import type { Vec2 } from '../types';

export interface PathInfo {
  points: readonly Vec2[];
  /** Distance from the first point to each point. */
  cumulative: number[];
  length: number;
}

export function buildPath(points: readonly Vec2[]): PathInfo {
  const cumulative: number[] = [];
  let length = 0;
  let prev: Vec2 | undefined;
  for (const p of points) {
    if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
    cumulative.push(length);
    prev = p;
  }
  return { points, cumulative, length };
}

export function pathLength(points: readonly Vec2[]): number {
  return buildPath(points).length;
}

/** Writes the position at `distance` (clamped to the path ends) into `out` and returns the heading in radians. */
export function samplePath(path: PathInfo, distance: number, out: Vec2): number {
  const { points, cumulative } = path;
  const last = points.length - 1;
  if (last < 1) {
    const only = points[0];
    out.x = only?.x ?? 0;
    out.y = only?.y ?? 0;
    return 0;
  }
  const d = Math.min(Math.max(distance, 0), path.length);
  let lo = 0;
  let hi = last - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((cumulative[mid] ?? 0) <= d) lo = mid;
    else hi = mid - 1;
  }
  while (lo > 0 && (cumulative[lo + 1] ?? 0) - (cumulative[lo] ?? 0) === 0) lo--;
  const a = points[lo];
  const b = points[lo + 1];
  if (!a || !b) throw new Error('path sampling out of range');
  const start = cumulative[lo] ?? 0;
  const seg = (cumulative[lo + 1] ?? 0) - start;
  const t = seg > 0 ? Math.min(Math.max((d - start) / seg, 0), 1) : 0;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Position and heading (radians) at `distance` along the path, clamped to its ends. */
export function pointAtDistance(path: PathInfo, distance: number): { pos: Vec2; heading: number } {
  const pos = { x: 0, y: 0 };
  const heading = samplePath(path, distance, pos);
  return { pos, heading };
}
