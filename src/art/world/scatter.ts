/**
 * Seeded placement of a level's decor: clustered like hand-placed groves, clear of roads, pads, exits and the top HUD
 * strip, sorted by y so nearer props overlap farther ones.
 */
import { DESIGN_HEIGHT, DESIGN_WIDTH, PAD_RADIUS, PATH_WIDTH, type LevelDef, type ThemeId, type Vec2 } from '../../game/types';
import type { DecorKind } from './decor';
import { distance, distanceToPaths, exitPoints, withRunoff } from './geometry';
import { createRng, type Rng } from './rng';

export interface DecorPlacement {
  kind: DecorKind;
  x: number;
  y: number;
  scale: number;
}

/** Minimum distances from a decor ground point. */
export const DECOR_CLEARANCE = {
  road: PATH_WIDTH / 2 + 14,
  pad: PAD_RADIUS + 16,
  exit: 80,
  /** No decor in the top strip (HUD). */
  top: 70,
} as const;

/**
 * Per kind: relative frequency, footprint radius (spacing between props) and whether the crown rises well above the
 * ground point (then the crown must not cover a road, a pad or a gate either).
 */
interface KindSpec {
  weight: number;
  footprint: number;
  tall?: boolean;
}

const KINDS: Readonly<Record<ThemeId, Readonly<Record<DecorKind, KindSpec>>>> = {
  meadow: {
    'meadow.tree': { weight: 30, footprint: 24, tall: true },
    'meadow.bush': { weight: 18, footprint: 17 },
    'meadow.rock': { weight: 10, footprint: 18 },
    'meadow.flowers': { weight: 16, footprint: 11 },
    'meadow.stump': { weight: 6, footprint: 13 },
  },
  desert: {
    'desert.cactus': { weight: 16, footprint: 15, tall: true },
    'desert.sandstone': { weight: 16, footprint: 24 },
    'desert.dryBush': { weight: 20, footprint: 14 },
    'desert.bones': { weight: 6, footprint: 16 },
    'desert.palm': { weight: 10, footprint: 22, tall: true },
  },
  snow: {
    'snow.pine': { weight: 34, footprint: 20, tall: true },
    'snow.rock': { weight: 14, footprint: 19 },
    'snow.crystal': { weight: 8, footprint: 15 },
    'snow.snowman': { weight: 2, footprint: 16 },
    'snow.bush': { weight: 14, footprint: 16 },
  },
  volcano: {
    'volcano.rock': { weight: 26, footprint: 21 },
    'volcano.deadTree': { weight: 16, footprint: 17, tall: true },
    'volcano.lavaPool': { weight: 7, footprint: 28 },
    'volcano.obsidian': { weight: 12, footprint: 15 },
    'volcano.vent': { weight: 6, footprint: 21 },
  },
};

const CROWN_HEIGHT = 44;
/** Props may overlap a little, like a hand-placed grove. */
const SPACING = 0.8;

function pickKind(rng: Rng, kinds: Readonly<Record<DecorKind, KindSpec>>): DecorKind {
  const entries = Object.entries(kinds);
  const total = entries.reduce((s, [, k]) => s + k.weight, 0);
  let roll = rng.next() * total;
  for (const [kind, k] of entries) {
    roll -= k.weight;
    if (roll < 0) return kind;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('No decor kinds');
  return last[0];
}

/** True when a ground point keeps the decor clearances of `level` (roads include their run-off past the spawn). */
export function isClearOfLayout(p: Vec2, roads: readonly (readonly Vec2[])[], pads: readonly Vec2[], exits: readonly Vec2[]): boolean {
  return (
    p.y >= DECOR_CLEARANCE.top &&
    distanceToPaths(p, roads) >= DECOR_CLEARANCE.road &&
    pads.every((pad) => distance(p, pad) >= DECOR_CLEARANCE.pad) &&
    exits.every((e) => distance(p, e) >= DECOR_CLEARANCE.exit)
  );
}

/**
 * Decor for a level from `level.decorSeed`, sorted by y. `keepOut` adds circles to avoid (e.g. spawn markers).
 */
export function scatterDecor(level: LevelDef, keepOut: readonly { at: Vec2; radius: number }[] = []): DecorPlacement[] {
  const rng = createRng(level.decorSeed);
  const roads = level.paths.map(withRunoff);
  const exits = exitPoints(level.paths);
  const kinds = KINDS[level.theme];
  const target = rng.int(85, 110);
  const clusters = Array.from({ length: 7 }, () => ({ x: rng.range(40, DESIGN_WIDTH - 40), y: rng.range(100, DESIGN_HEIGHT - 20) }));
  const placed: (DecorPlacement & { radius: number })[] = [];
  for (let attempt = 0; attempt < 8000 && placed.length < target; attempt++) {
    const cluster = rng.next() < 0.6 ? rng.pick(clusters) : null;
    const raw = cluster
      ? { x: cluster.x + (rng.next() + rng.next() - 1) * 110, y: cluster.y + (rng.next() + rng.next() - 1) * 80 }
      : { x: rng.range(12, DESIGN_WIDTH - 12), y: rng.range(DECOR_CLEARANCE.top, DESIGN_HEIGHT - 6) };
    const p = { x: Math.round(raw.x), y: Math.round(raw.y) };
    const kind = pickKind(rng, kinds);
    const spec = kinds[kind];
    if (!spec) continue;
    const scale = Math.round(rng.range(0.85, 1.15) * (spec.tall ? rng.range(0.95, 1.15) : 1) * 100) / 100;
    const radius = spec.footprint * scale;
    if (p.x < 12 || p.x > DESIGN_WIDTH - 12 || p.y > DESIGN_HEIGHT - 6) continue;
    if (!isClearOfLayout(p, roads, level.pads, exits)) continue;
    if (distanceToPaths(p, roads) < PATH_WIDTH / 2 + radius * 0.8) continue;
    if (level.pads.some((pad) => distance(p, pad) < PAD_RADIUS + 6 + radius)) continue;
    if (placed.some((d) => distance(p, d) < (radius + d.radius) * SPACING)) continue;
    const crown = spec.tall ? { x: p.x, y: p.y - CROWN_HEIGHT * scale } : p;
    if (keepOut.some((k) => distance(p, k.at) < k.radius || distance(crown, k.at) < k.radius)) continue;
    if (spec.tall) {
      if (distanceToPaths(crown, roads) < PATH_WIDTH / 2 + 26) continue;
      if (level.pads.some((pad) => distance(crown, pad) < PAD_RADIUS + 26)) continue;
      if (exits.some((e) => distance(crown, { x: e.x, y: e.y - 40 }) < 80)) continue;
    }
    placed.push({ kind, x: p.x, y: p.y, scale, radius });
  }
  return placed.sort((a, b) => a.y - b.y || a.x - b.x).map(({ kind, x, y, scale }) => ({ kind, x, y, scale }));
}
