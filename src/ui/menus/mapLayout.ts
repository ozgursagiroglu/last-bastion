/**
 * World map geometry for the level select (pure): node positions, the winding trail through them, the themed regions
 * left to right and where their decor stands. The map fills the board; the info panel covers its right side.
 */
import { DESIGN_HEIGHT, DESIGN_WIDTH, type LevelDef, type ThemeId, type Vec2 } from '../../game/types';
import type { PathPoint } from '../../art/exode';
import { DECOR_KINDS } from '../../art/world/decor';
import { distance, distanceToPaths } from '../../art/world/geometry';
import { createRng } from '../../art/world/rng';

/** Width of the visible map left of the info panel. */
export const MAP_WIDTH = 925;
export const MAP_TOP = 96;
export const NODE_RADIUS = 27;
/** Stars sit this far below a node's center. */
export const NODE_STARS_DY = 43;
const MARGIN_X = 72;
/** Node heights in order (cycled for longer campaigns): the trail climbs and dips as it heads right. */
const NODE_Y = [598, 458, 298, 410, 590, 478, 306, 196, 352, 548] as const;

export function nodePositions(count: number): Vec2[] {
  const step = count > 1 ? (MAP_WIDTH - MARGIN_X * 2) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => ({
    x: count > 1 ? MARGIN_X + i * step : MAP_WIDTH / 2,
    y: NODE_Y[i % NODE_Y.length] ?? DESIGN_HEIGHT / 2,
  }));
}

/** Trail from the left edge through every node in order, as cubic curves with horizontal tangents at the nodes. */
export function trailPoints(nodes: readonly Vec2[]): PathPoint[] {
  const first = nodes[0];
  if (!first) return [];
  const stops = [{ x: -30, y: first.y + 40 }, ...nodes];
  return stops.map((p, i) => {
    const prev = stops[i - 1];
    const next = stops[i + 1];
    const point: PathPoint = { x: p.x, y: p.y };
    if (prev) Object.assign(point, { inX: p.x - (p.x - prev.x) * 0.5, inY: p.y });
    if (next) Object.assign(point, { outX: p.x + (next.x - p.x) * 0.5, outY: p.y });
    return point;
  });
}

/** The trail sampled into a polyline (for clearance checks). */
export function sampleTrail(points: readonly PathPoint[], perCurve = 12): Vec2[] {
  const out: Vec2[] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (!prev) {
      out.push({ x: p.x, y: p.y });
      return;
    }
    const c1 = { x: prev.outX ?? prev.x, y: prev.outY ?? prev.y };
    const c2 = { x: p.inX ?? p.x, y: p.inY ?? p.y };
    for (let k = 1; k <= perCurve; k++) {
      const t = k / perCurve;
      const u = 1 - t;
      out.push({
        x: u * u * u * prev.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p.x,
        y: u * u * u * prev.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p.y,
      });
    }
  });
  return out;
}

export interface Region {
  theme: ThemeId;
  x0: number;
  x1: number;
}

/** Consecutive levels of one theme share a region; borders fall halfway between the neighbouring nodes. */
export function mapRegions(levels: readonly LevelDef[], nodes: readonly Vec2[]): Region[] {
  const regions: Region[] = [];
  levels.forEach((level, i) => {
    const last = regions[regions.length - 1];
    if (last && last.theme === level.theme) return;
    const here = nodes[i];
    const before = nodes[i - 1];
    const border = here && before ? (here.x + before.x) / 2 : 0;
    if (last) last.x1 = border;
    regions.push({ theme: level.theme, x0: last ? border : 0, x1: DESIGN_WIDTH });
  });
  return regions;
}

/** Closed outline of a region from its wavy left border to the right board edge (drawn over the regions before it). */
export function regionOutline(region: Region, index: number): PathPoint[] {
  const left: PathPoint[] = [];
  for (let y = -20; y <= DESIGN_HEIGHT + 20; y += 30) left.push({ x: region.x0 + Math.sin(y / 55 + index * 1.7) * 11, y });
  return [...left, { x: DESIGN_WIDTH + 20, y: DESIGN_HEIGHT + 20 }, { x: DESIGN_WIDTH + 20, y: -20 }];
}

export interface DecorSpot {
  kind: string;
  x: number;
  y: number;
}

const DECOR_PER_REGION = 6;

/** A few theme props per region, clear of the trail, the nodes (and their stars) and the top bar. */
export function regionDecor(region: Region, index: number, trail: readonly Vec2[], nodes: readonly Vec2[]): DecorSpot[] {
  const rng = createRng(0x51ed + index * 977);
  const kinds = DECOR_KINDS[region.theme];
  const x1 = Math.min(region.x1, MAP_WIDTH) - 26;
  const out: DecorSpot[] = [];
  for (let tries = 0; tries < 300 && out.length < DECOR_PER_REGION && x1 > region.x0 + 26; tries++) {
    const p = { x: rng.range(region.x0 + 26, x1), y: rng.range(MAP_TOP + 70, DESIGN_HEIGHT - 12) };
    const clear =
      distanceToPaths(p, [[...trail]]) > 34 &&
      nodes.every((n) => distance(p, { x: n.x, y: n.y + 15 }) > 72) &&
      out.every((d) => distance(p, d) > 62);
    if (clear) out.push({ kind: rng.pick(kinds), x: p.x, y: p.y });
  }
  return out.sort((a, b) => a.y - b.y);
}
