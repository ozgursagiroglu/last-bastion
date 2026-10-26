/** Plane geometry for laying out a level's terrain: road outlines, clearances, exits and spawn markers. */
import { DESIGN_HEIGHT, DESIGN_WIDTH, PATH_WIDTH, type Vec2 } from '../../game/types';
import type { PathPoint } from '../exode';

/** Largest corner rounding of a drawn road; enemies walk the raw polyline and must stay on the road. */
export const MAX_CORNER_RADIUS = 28;
/** How far the drawn road continues past a spawn point, so it runs off the board edge. */
const SPAWN_RUNOFF = 90;

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Distance from `p` to the nearest segment of any of the polylines (Infinity when there are none). */
export function distanceToPaths(p: Vec2, paths: readonly (readonly Vec2[])[]): number {
  let best = Infinity;
  for (const path of paths) {
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      const b = path[i + 1] ?? a;
      if (a && b) best = Math.min(best, distanceToSegment(p, a, b));
    }
  }
  return best;
}

function unit(from: Vec2, to: Vec2): Vec2 {
  const len = distance(from, to);
  return len === 0 ? { x: 0, y: 0 } : { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
}

/** The polyline with its first segment extended backwards past the spawn point (the drawn road leaves the board). */
export function withRunoff(path: readonly Vec2[]): Vec2[] {
  const [first, second] = path;
  if (!first || !second) return [...path];
  const d = unit(second, first);
  return [{ x: first.x + d.x * SPAWN_RUNOFF, y: first.y + d.y * SPAWN_RUNOFF }, ...path.slice(1)];
}

/**
 * Stroke points of a road: the polyline with every interior corner rounded by a cubic curve of radius ≤ `maxRadius`
 * (and ≤ 40% of each adjacent segment, so short zigzags stay faithful).
 */
export function roundedRoadPoints(path: readonly Vec2[], maxRadius = MAX_CORNER_RADIUS): PathPoint[] {
  const out: PathPoint[] = [];
  path.forEach((p, i) => {
    const prev = path[i - 1];
    const next = path[i + 1];
    if (!prev || !next) {
      out.push({ x: p.x, y: p.y });
      return;
    }
    const r = Math.min(maxRadius, distance(prev, p) * 0.4, distance(p, next) * 0.4);
    const din = unit(prev, p);
    const dout = unit(p, next);
    const h = r * 0.55;
    const a = { x: p.x - din.x * r, y: p.y - din.y * r };
    const b = { x: p.x + dout.x * r, y: p.y + dout.y * r };
    out.push({ x: a.x, y: a.y, outX: a.x + din.x * h, outY: a.y + din.y * h });
    out.push({ x: b.x, y: b.y, inX: b.x - dout.x * h, inY: b.y - dout.y * h });
  });
  return out;
}

/** Distinct end points of the paths (paths sharing a castle gate end at the same point). */
export function exitPoints(paths: readonly (readonly Vec2[])[]): Vec2[] {
  const exits: Vec2[] = [];
  for (const path of paths) {
    const last = path[path.length - 1];
    if (last && !exits.some((e) => distance(e, last) < 1)) exits.push({ x: last.x, y: last.y });
  }
  return exits;
}

function insideBoard(p: Vec2, margin: number): boolean {
  return p.x >= margin && p.x <= DESIGN_WIDTH - margin && p.y >= margin && p.y <= DESIGN_HEIGHT - margin;
}

/** Point `along` px from the start of the polyline (clamped to its end). */
export function pointAlong(path: readonly Vec2[], along: number): { at: Vec2; dir: Vec2 } {
  let left = along;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) break;
    const len = distance(a, b);
    if (left <= len || i + 2 === path.length) {
      const t = len === 0 ? 0 : Math.min(1, left / len);
      return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: unit(a, b) };
    }
    left -= len;
  }
  const only = path[0] ?? { x: 0, y: 0 };
  return { at: { ...only }, dir: { x: 1, y: 0 } };
}

/**
 * Where to stand a spawn marker for a path: beside the road where it enters the board, clear of every road and
 * inside the board. The side above the road comes first (the marker is upright and would otherwise cover the road).
 * Null when no candidate fits.
 */
export function spawnMarkerPoint(path: readonly Vec2[], allPaths: readonly (readonly Vec2[])[]): Vec2 | null {
  const clearance = PATH_WIDTH / 2 + 16;
  const side = PATH_WIDTH / 2 + 26;
  for (let along = 30; along < 400; along += 10) {
    const { at, dir } = pointAlong(path, along);
    if (!insideBoard(at, 50)) continue;
    const candidates = [1, -1].map((s) => ({ x: at.x - dir.y * side * s, y: at.y + dir.x * side * s })).sort((a, b) => a.y - b.y);
    const fit = candidates.find((c) => insideBoard(c, 30) && c.y >= 80 && distanceToPaths(c, allPaths) >= clearance);
    if (fit) return fit;
  }
  return null;
}
