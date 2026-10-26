/**
 * Drawing helpers shared by the tower builders: local color ramps, paints, and point lists for the 3/4-view shapes
 * (cylinders, elliptic arcs, scalloped and toothed rims, sub-path loops). Angles here are degrees on screen: 0° = +x,
 * 90° = front (down), 270° = back (up).
 */
import type { Fill } from 'exodeui';
import type { TowerLevel, Vec2 } from '../../game/types';
import { linear, radial, solid, type PathPoint, type SpriteBuilder, type StrokeSpec } from '../exode';
import { OUTLINE, type Ramp } from '../palette';

export const SKIN: Ramp = { light: '#ffd3a8', dark: '#c98656' };
export const COPPER: Ramp = { light: '#f7b06e', dark: '#8a3f17' };
export const BRONZE: Ramp = { light: '#efbd6a', dark: '#82501d' };
export const IRON: Ramp = { light: '#8a97a3', dark: '#2c343c' };
export const SAND: Ramp = { light: '#e8d39a', dark: '#a1824a' };
export const OLIVE: Ramp = { light: '#a9b06c', dark: '#4a5129' };
export const DIRT: Ramp = { light: '#6b5137', dark: '#2e2116' };

/** The per-kind art: draws every part (all tiers) under `parent`, adds the 'idle' and 'fire' clips. */
export interface TowerArt {
  /** Root-space center and side of the square that holds the level-1 look (build-menu icon). */
  iconFrame: { x: number; y: number; size: number };
  draw(b: SpriteBuilder, parent: string): TowerParts;
}

/** TowerSprite contract data, with part names instead of object ids. */
export interface TowerParts {
  tiers: Record<TowerLevel, string[]>;
  aimPart: string | null;
  facePart: string | null;
  aimPivot: Vec2;
  muzzle: Record<TowerLevel, Vec2>;
}

/** Linear blend of two '#rrggbb' colors. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

export function ink(width = 3): StrokeSpec {
  return { color: OUTLINE, width };
}

export function line(color: string, width: number, opacity = 1): StrokeSpec {
  return { color, width, opacity, cap: 'round', join: 'round' };
}

/** Light top → dark bottom. */
export function vgrad(r: Ramp, opacity = 1): Fill {
  return linear([[0, r.light], [1, r.dark]], [0.5, 0], [0.5, 1], opacity);
}

/** Round body lit from the left: a lit band left of center, dark on the right. */
export function roundGrad(r: Ramp): Fill {
  return linear([[0, mix(r.light, r.dark, 0.35)], [0.3, r.light], [1, r.dark]], [0, 0.4], [1, 0.6]);
}

/** Tube along local x (barrels): reads the same whatever its rotation. */
export function tubeGrad(r: Ramp): Fill {
  return linear([[0, mix(r.light, r.dark, 0.4)], [0.38, r.light], [1, r.dark]]);
}

/** Ball lit from the top-left. */
export function ballGrad(r: Ramp, core = '#ffffff'): Fill {
  return radial([[0, mix(r.light, core, 0.6)], [0.45, r.light], [1, r.dark]], [0.36, 0.3], 0.75);
}

export const SHINE = solid('#ffffff', 0.3);

/** Contact shadow under the tower. */
export function contactShadow(b: SpriteBuilder, parent: string, width: number, height: number, y: number): void {
  b.ellipse('shadow', width, height, { y, fill: solid('#000000', 0.3) }, parent);
}

/** Point on the ellipse (cx, cy, rx, ry) at `deg`. */
export function onEllipse(cx: number, cy: number, rx: number, ry: number, deg: number): Vec2 {
  const a = (deg * Math.PI) / 180;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

const K = 4 / 3;
/** Cubic handle length of a quarter ellipse, as a fraction of the radius. */
const QUARTER = 0.5523;

/**
 * Half ellipse from the left end to the right end, through the front (`side` 1) or the back (`side` −1). The middle
 * point matters: the engine sizes gradients from a path's points (not its handles), so every arc spans its height.
 */
export function halfArc(cx: number, cy: number, rx: number, ry: number, side: 1 | -1, moveTo = false): PathPoint[] {
  const y = cy + side * ry;
  const h = side * QUARTER * ry;
  const w = QUARTER * rx;
  return [
    { x: cx - rx, y: cy, outX: cx - rx, outY: cy + h, moveTo },
    { x: cx, y, inX: cx - w, inY: y, outX: cx + w, outY: y },
    { x: cx + rx, y: cy, inX: cx + rx, inY: cy + h },
  ];
}

/** Same as halfArc, right end to left end. */
export function halfArcBack(cx: number, cy: number, rx: number, ry: number, side: 1 | -1): PathPoint[] {
  const y = cy + side * ry;
  const h = side * QUARTER * ry;
  const w = QUARTER * rx;
  return [
    { x: cx + rx, y: cy, outX: cx + rx, outY: cy + h },
    { x: cx, y, inX: cx + w, inY: y, outX: cx - w, outY: y },
    { x: cx - rx, y: cy, inX: cx - rx, inY: cy + h },
  ];
}

/**
 * Upright 3/4-view frustum (a cylinder when the radii match): sides from the top ellipse center `top` to the bottom
 * ellipse center `bottom`, front arc at the bottom, back arc on top.
 */
export function frustum(rxTop: number, rxBottom: number, ry: number, top: number, bottom: number, cx = 0): PathPoint[] {
  const ryTop = (ry * rxTop) / rxBottom;
  return closed([...halfArc(cx, bottom, rxBottom, ry, 1), ...halfArcBack(cx, top, rxTop, ryTop, -1)]);
}

/** Marks the last point as closing its sub-path. */
export function closed(points: PathPoint[]): PathPoint[] {
  const last = points[points.length - 1];
  if (last) last.close = true;
  return points;
}

/**
 * Elliptic arc from `from`° to `to`° split into `n` segments, each bulging `bump` px upward (sandbag tops, stone
 * blocks) or, with `teeth`, rising to a point (stake tips).
 */
export function rimArc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  n: number,
  bump: number,
  teeth = false,
): PathPoint[] {
  const out: PathPoint[] = [];
  const at = (i: number) => onEllipse(cx, cy, rx, ry, from + ((to - from) * i) / n);
  const start = at(0);
  out.push({ x: start.x, y: start.y });
  for (let i = 0; i < n; i++) {
    const p = at(i);
    const q = at(i + 1);
    if (teeth) {
      const m = at(i + 0.5);
      out.push({ x: m.x, y: m.y - bump }, { x: q.x, y: q.y });
    } else {
      const prev = out[out.length - 1];
      if (prev) {
        prev.outX = p.x + (q.x - p.x) / 3;
        prev.outY = p.y + (q.y - p.y) / 3 - K * bump;
      }
      out.push({ x: q.x, y: q.y, inX: p.x + ((q.x - p.x) * 2) / 3, inY: p.y + ((q.y - p.y) * 2) / 3 - K * bump });
    }
  }
  return out;
}

/** Closed ellipse as a sub-path (for multi-shape paths). `k` above 0.55 squares it off (sandbags, rings). */
export function loop(cx: number, cy: number, rx: number, ry: number, k = 0.5523): PathPoint[] {
  const kx = rx * k;
  const ky = ry * k;
  return [
    { x: cx - rx, y: cy, inX: cx - rx, inY: cy + ky, outX: cx - rx, outY: cy - ky, moveTo: true },
    { x: cx, y: cy - ry, inX: cx - kx, inY: cy - ry, outX: cx + kx, outY: cy - ry },
    { x: cx + rx, y: cy, inX: cx + rx, inY: cy - ky, outX: cx + rx, outY: cy + ky },
    { x: cx, y: cy + ry, inX: cx + kx, inY: cy + ry, outX: cx - kx, outY: cy + ry, close: true },
  ];
}

/** Closed axis-aligned rectangle (x, y = top-left) as a sub-path. */
export function box(x: number, y: number, w: number, h: number): PathPoint[] {
  return [
    { x, y, moveTo: true },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h, close: true },
  ];
}

/** Open segment as a sub-path. */
export function seg(a: Vec2, b: Vec2): PathPoint[] {
  return [
    { x: a.x, y: a.y, moveTo: true },
    { x: b.x, y: b.y },
  ];
}

export function levels<T>(l1: T, l2: T, l3: T): Record<TowerLevel, T> {
  return { 1: l1, 2: l2, 3: l3 };
}
