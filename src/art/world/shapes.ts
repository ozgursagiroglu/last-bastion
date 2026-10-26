/**
 * Path point generators for the world art. Each returns one closed sub-path (first point `moveTo`, last `close`), so
 * several can be concatenated into one path object: many small details then cost a single engine object.
 */
import type { PathPoint } from '../exode';

/** Bezier handle length for a quarter circle. */
const KAPPA = 0.5523;

export function ellipsePoints(cx: number, cy: number, rx: number, ry: number = rx): PathPoint[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { x: cx, y: cy - ry, inX: cx - kx, inY: cy - ry, outX: cx + kx, outY: cy - ry, moveTo: true },
    { x: cx + rx, y: cy, inX: cx + rx, inY: cy - ky, outX: cx + rx, outY: cy + ky },
    { x: cx, y: cy + ry, inX: cx + kx, inY: cy + ry, outX: cx - kx, outY: cy + ry },
    { x: cx - rx, y: cy, inX: cx - rx, inY: cy + ky, outX: cx - rx, outY: cy - ky, close: true },
  ];
}

/** Straight-edged closed polygon through the given vertices. */
export function polyPoints(vertices: readonly (readonly [number, number])[]): PathPoint[] {
  return vertices.map(([x, y], i) => ({ x, y, ...(i === 0 ? { moveTo: true } : {}), ...(i === vertices.length - 1 ? { close: true } : {}) }));
}

/**
 * Cloud-like blob: `lobes` outward bulges around an ellipse (tree canopies, bushes, snow drifts). `jitter` (0..1) varies
 * the lobe radii with the given random source so repeated blobs do not look stamped.
 */
export function blobPoints(cx: number, cy: number, rx: number, ry: number, lobes: number, jitter = 0, random: () => number = () => 0.5): PathPoint[] {
  const radii = Array.from({ length: lobes }, () => 1 + (random() - 0.5) * jitter);
  const at = (angle: number, k: number) => ({ x: cx + Math.cos(angle) * rx * k, y: cy + Math.sin(angle) * ry * k });
  const step = (Math.PI * 2) / lobes;
  const start = -Math.PI / 2 - step / 2;
  return radii.map((r, i) => {
    const a0 = start + i * step;
    const prev = radii[(i + lobes - 1) % lobes] ?? 1;
    const p = at(a0, Math.min(r, prev));
    const outH = at(a0 + step * 0.2, r * 1.32);
    const inH = at(a0 - step * 0.2, prev * 1.32);
    return { ...p, inX: inH.x, inY: inH.y, outX: outH.x, outY: outH.y, ...(i === 0 ? { moveTo: true } : {}), ...(i === lobes - 1 ? { close: true } : {}) };
  });
}

/** Open stroke sub-path through the given points (for multi-stroke details such as grass tufts). */
export function strokePoints(points: readonly (readonly [number, number])[]): PathPoint[] {
  return points.map(([x, y], i) => ({ x, y, ...(i === 0 ? { moveTo: true } : {}) }));
}
