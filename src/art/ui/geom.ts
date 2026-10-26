/** Point generators shared by the UI builders (arcs, stars). Angles are in degrees, clockwise on screen, 0 = +x. */
import type { PathPoint } from '../exode';

const RAD = Math.PI / 180;

/**
 * `count` points along a circular arc from `startDeg` sweeping `sweepDeg` (positive = clockwise on screen), with bezier
 * handles so the curve is a true circle at any size. Every point carries both handles, so the key set never changes
 * (dynamic paths merge points by index).
 */
export function arcPoints(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number, count: number): PathPoint[] {
  if (count < 2) throw new Error('An arc needs at least two points');
  const step = (sweepDeg / (count - 1)) * RAD;
  const k = (4 / 3) * Math.tan(step / 4) * r;
  const points: PathPoint[] = [];
  for (let i = 0; i < count; i++) {
    const a = startDeg * RAD + step * i;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const tx = -Math.sin(a) * k;
    const ty = Math.cos(a) * k;
    points.push({ x, y, inX: x - tx, inY: y - ty, outX: x + tx, outY: y + ty });
  }
  return points;
}

/** Closed star outline with the first point up. */
export function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): PathPoint[] {
  const out: PathPoint[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (-90 + (180 / points) * i) * RAD;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}
