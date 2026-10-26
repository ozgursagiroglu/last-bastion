/**
 * The static background of a level (1280×720, opaque): textured theme ground, layered roads, then pads, castle gates,
 * spawn markers and decor drawn in y order. Rendered once per resize, so canvas shadows are allowed here.
 */
import type { Artboard } from 'exodeui';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PAD_RADIUS, PATH_WIDTH, type LevelDef, type ThemeId, type Vec2 } from '../../game/types';
import { makeArtboard, radial, solid, SpriteBuilder, type PathOpts, type PathPoint, type SpriteInstance } from '../exode';
import { MOLTEN_SURFACES } from './decor';
import { rampFill } from './paint';
import { addCastleGate, addDecor, addPad, addSpawnMarker } from './parts';
import { createRng, type Rng } from './rng';
import { scatterDecor, type DecorPlacement } from './scatter';
import { blobPoints, ellipsePoints, strokePoints } from './shapes';
import { distance, distanceToPaths, exitPoints, pointAlong, roundedRoadPoints, spawnMarkerPoint, withRunoff } from './geometry';
import { THEMES } from './themes';

/** Gate origin below the exit point, so the road runs into the door. */
const GATE_OFFSET_Y = 10;
const MARKER_KEEP_OUT = 34;

interface Layout {
  level: LevelDef;
  roads: Vec2[][];
  exits: Vec2[];
  rng: Rng;
}

interface Detail {
  name: string;
  points: PathPoint[];
  opts: PathOpts;
}

const PATCHES: Readonly<Record<ThemeId, readonly [light: string, dark: string]>> = {
  meadow: ['#b0e070', '#4c8c31'],
  desert: ['#fbe3aa', '#c58f55'],
  snow: ['#ffffff', '#93b2cf'],
  volcano: ['#806a60', '#251b19'],
};

/** A random ground point clear of roads, pads and exits by `margin`, or null after a few tries. */
function freeSpot(l: Layout, margin: number): Vec2 | null {
  for (let i = 0; i < 30; i++) {
    const p = { x: l.rng.range(8, DESIGN_WIDTH - 8), y: l.rng.range(8, DESIGN_HEIGHT - 4) };
    if (
      distanceToPaths(p, l.roads) >= PATH_WIDTH / 2 + 5 + margin &&
      l.level.pads.every((pad) => distance(p, pad) >= PAD_RADIUS + 8 + margin) &&
      l.exits.every((e) => distance(p, e) >= 60 + margin)
    ) {
      return p;
    }
  }
  return null;
}

function spots(l: Layout, count: number, margin: number): Vec2[] {
  return Array.from({ length: count }, () => freeSpot(l, margin)).filter((p): p is Vec2 => p !== null);
}

function tuft(p: Vec2, size: number): PathPoint[] {
  return [
    ...strokePoints([[p.x - 2, p.y], [p.x - 5 * size, p.y - 6 * size]]),
    ...strokePoints([[p.x, p.y], [p.x + 0.5, p.y - 8 * size]]),
    ...strokePoints([[p.x + 2, p.y], [p.x + 5 * size, p.y - 5 * size]]),
  ];
}

function meadowDetails(l: Layout): Detail[] {
  const dark = spots(l, 60, 4).flatMap((p) => tuft(p, l.rng.range(0.8, 1.2)));
  const light = spots(l, 35, 4).flatMap((p) => tuft(p, l.rng.range(0.7, 1)));
  const flowers = spots(l, 40, 4);
  const half = Math.floor(flowers.length / 2);
  return [
    { name: 'tuftsDark', points: dark, opts: { stroke: { color: '#3f7a2a', width: 2.2 } } },
    { name: 'tuftsLight', points: light, opts: { stroke: { color: '#b8e880', width: 2 } } },
    { name: 'flowersWhite', points: flowers.slice(0, half).flatMap((p) => ellipsePoints(p.x, p.y, 2.4)), opts: { fill: '#ffffff' } },
    { name: 'flowersYellow', points: flowers.slice(half).flatMap((p) => ellipsePoints(p.x, p.y, 2.4)), opts: { fill: '#ffd84a' } },
  ];
}

function ripple(p: Vec2, w: number, dy: number): PathPoint[] {
  return [
    { x: p.x - w, y: p.y + dy, moveTo: true, outX: p.x - w * 0.4, outY: p.y - 7 + dy },
    { x: p.x + w, y: p.y + dy, inX: p.x + w * 0.3, inY: p.y - 7 + dy },
  ];
}

function desertDetails(l: Layout): Detail[] {
  const ripples = spots(l, 55, 18).map((p) => ({ p, w: l.rng.range(12, 24) }));
  return [
    { name: 'ripplesShade', points: ripples.flatMap(({ p, w }) => ripple(p, w, 0)), opts: { stroke: { color: '#c08a52', width: 2.5, opacity: 0.8 } } },
    { name: 'ripplesLight', points: ripples.flatMap(({ p, w }) => ripple(p, w * 0.8, -3)), opts: { stroke: { color: '#fff3d0', width: 2, opacity: 0.8 } } },
    { name: 'pebbles', points: spots(l, 45, 3).flatMap((p) => ellipsePoints(p.x, p.y, l.rng.range(2, 3.2), 2)), opts: { fill: '#a87a48' } },
  ];
}

function snowDetails(l: Layout): Detail[] {
  const drifts = spots(l, 30, 22).map((p) => ({ p, w: l.rng.range(16, 30) }));
  return [
    {
      name: 'driftShade',
      points: drifts.flatMap(({ p, w }) => [
        { x: p.x - w, y: p.y, moveTo: true, outX: p.x - w * 0.5, outY: p.y + 6 },
        { x: p.x + w, y: p.y, inX: p.x + w * 0.5, inY: p.y + 6 },
      ]),
      opts: { stroke: { color: '#9ab8d2', width: 3 } },
    },
    { name: 'drifts', points: drifts.flatMap(({ p, w }) => blobPoints(p.x, p.y - 3, w, 5, 3)), opts: { fill: '#ffffff' } },
    { name: 'twigs', points: spots(l, 22, 4).flatMap((p) => tuft(p, 0.9)), opts: { stroke: { color: '#6b5a4a', width: 2 } } },
    { name: 'sparkles', points: spots(l, 40, 2).flatMap((p) => ellipsePoints(p.x, p.y, 1.6)), opts: { fill: '#ffffff' } },
  ];
}

function crack(l: Layout, p: Vec2): PathPoint[] {
  const pts: (readonly [number, number])[] = [[p.x, p.y]];
  let angle = l.rng.range(0, Math.PI * 2);
  let at = p;
  for (let i = 0; i < 4; i++) {
    angle += l.rng.range(-0.8, 0.8);
    const len = l.rng.range(10, 20);
    at = { x: at.x + Math.cos(angle) * len, y: at.y + Math.sin(angle) * len * 0.6 };
    pts.push([at.x, at.y]);
  }
  const mid = pts[2] ?? pts[0] ?? [p.x, p.y];
  const branch = strokePoints([mid, [mid[0] + l.rng.range(-14, 14), mid[1] + l.rng.range(6, 12)]]);
  return [...strokePoints(pts), ...branch];
}

function volcanoDetails(l: Layout): Detail[] {
  const cracks = spots(l, 18, 40).flatMap((p) => crack(l, p));
  return [
    { name: 'ash', points: spots(l, 50, 2).flatMap((p) => ellipsePoints(p.x, p.y, l.rng.range(2, 3.5), 2)), opts: { fill: '#2a201d' } },
    { name: 'crackGlow', points: cracks, opts: { stroke: { color: '#ff5a10', width: 10, opacity: 0.35 }, blend: 'lighter' } },
    { name: 'cracks', points: cracks, opts: { stroke: { color: '#1a0f0b', width: 5 } } },
    { name: 'crackCore', points: cracks, opts: { stroke: { color: '#ffb03a', width: 2 } } },
  ];
}

const DETAILS: Readonly<Record<ThemeId, (l: Layout) => Detail[]>> = {
  meadow: meadowDetails,
  desert: desertDetails,
  snow: snowDetails,
  volcano: volcanoDetails,
};

function addGround(b: SpriteBuilder, l: Layout): void {
  const theme = l.level.theme;
  b.rect('ground', DESIGN_WIDTH, DESIGN_HEIGHT, { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2, fill: rampFill(THEMES[theme].ground) });
  const [light, dark] = PATCHES[theme];
  for (let i = 0; i < 26; i++) {
    const color = i % 2 === 0 ? light : dark;
    const w = l.rng.range(140, 320);
    b.ellipse(`patch${i}`, w, w * l.rng.range(0.4, 0.6), {
      x: l.rng.range(-40, DESIGN_WIDTH + 40),
      y: l.rng.range(-20, DESIGN_HEIGHT + 20),
      fill: radial([[0, color, 0.45], [1, color, 0]]),
    });
  }
  for (const d of DETAILS[theme](l)) if (d.points.length > 0) b.path(d.name, d.points, d.opts);
}

function addRoads(b: SpriteBuilder, l: Layout): void {
  const road = THEMES[l.level.theme].road;
  const points = l.roads.flatMap((r) => roundedRoadPoints(r).map((p, i) => (i === 0 ? { ...p, moveTo: true } : p)));
  b.path('roadLip', points, { stroke: { color: '#000000', width: PATH_WIDTH + 18, opacity: 0.12 } });
  b.path('roadEdge', points, { stroke: { color: road.edge, width: PATH_WIDTH + 10 } });
  b.path('roadFill', points, { stroke: { color: road.fill, width: PATH_WIDTH } });
  b.path('roadCenter', points, { stroke: { color: road.center, width: PATH_WIDTH - 22, opacity: 0.55 } });
  const pebbles = l.level.paths.flatMap((path) => {
    const length = path.reduce((s, p, i) => s + (i > 0 ? distance(path[i - 1] ?? p, p) : 0), 0);
    return Array.from({ length: Math.floor(length / 34) }, () => {
      const { at, dir } = pointAlong(path, l.rng.range(0, length));
      const side = l.rng.range(-1, 1) * (PATH_WIDTH / 2 - 7);
      return ellipsePoints(at.x - dir.y * side, at.y + dir.x * side, l.rng.range(2.2, 3.6), 2);
    }).flat();
  });
  if (pebbles.length > 0) b.path('roadPebbles', pebbles, { fill: solid(road.pebble, 0.85) });
  const verge = VERGE[l.level.theme];
  const spots = vergeSpots(l);
  if (verge && spots.length > 0) b.path('verge', spots.flatMap((p) => verge.points(p, l.rng)), verge.opts);
}

/** Dressing that overhangs the road edges: grass, dry grass or snow banks. */
const VERGE: Readonly<Record<ThemeId, { points: (p: Vec2, rng: Rng) => PathPoint[]; opts: PathOpts } | null>> = {
  meadow: { points: (p, rng) => tuft(p, rng.range(0.8, 1.1)), opts: { stroke: { color: '#3f7a2a', width: 2.2 } } },
  desert: { points: (p, rng) => tuft(p, rng.range(0.7, 1)), opts: { stroke: { color: '#9a6c3e', width: 2 } } },
  snow: {
    points: (p, rng) => blobPoints(p.x, p.y, rng.range(7, 15), rng.range(3, 5), 3, 0.4, rng.next),
    opts: { fill: '#ffffff', stroke: { color: '#a3bfd6', width: 1.5 } },
  },
  volcano: null,
};

/** Points just outside the road edges (never inside another road or on a pad). */
function vergeSpots(l: Layout): Vec2[] {
  const out: Vec2[] = [];
  for (const path of l.level.paths) {
    const length = path.reduce((s, p, i) => s + (i > 0 ? distance(path[i - 1] ?? p, p) : 0), 0);
    for (let along = 10; along < length; along += l.rng.range(22, 46)) {
      const { at, dir } = pointAlong(path, along);
      const side = (l.rng.next() < 0.5 ? -1 : 1) * (PATH_WIDTH / 2 + 4);
      const p = { x: at.x - dir.y * side, y: at.y + dir.x * side };
      if (distanceToPaths(p, l.roads) >= PATH_WIDTH / 2 + 1 && l.level.pads.every((pad) => distance(p, pad) >= PAD_RADIUS + 10)) out.push(p);
    }
  }
  return out;
}

/** Spawn marker points, one per distinct spawn point. */
function spawnMarkers(level: LevelDef): Vec2[] {
  const roads = level.paths.map(withRunoff);
  const spawnPaths = level.paths.filter((path, i) => {
    const s = path[0];
    return s !== undefined && !level.paths.slice(0, i).some((q) => q[0] !== undefined && distance(q[0], s) < 1);
  });
  return spawnPaths.map((path) => spawnMarkerPoint(path, roads)).filter((m): m is Vec2 => m !== null);
}

/** The level's decor as the terrain draws it (kept clear of the spawn markers). */
export function terrainDecor(level: LevelDef): DecorPlacement[] {
  return scatterDecor(level, spawnMarkers(level).map((at) => ({ at, radius: MARKER_KEEP_OUT })));
}

/** A molten surface of the terrain (lava pool, vent crater) as an ellipse in design coords. */
export interface MoltenSurface {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export function moltenSurfaces(level: LevelDef): MoltenSurface[] {
  return terrainDecor(level).flatMap((d) => {
    const s = MOLTEN_SURFACES[d.kind];
    return s ? [{ x: d.x, y: d.y + s.y * d.scale, rx: s.rx * d.scale, ry: s.ry * d.scale }] : [];
  });
}

/** The terrain as one sprite (root at 0,0), for tests; buildTerrainArtboard wraps it. */
export function buildTerrainSprite(level: LevelDef): SpriteInstance {
  const theme = level.theme;
  const l: Layout = { level, roads: level.paths.map(withRunoff), exits: exitPoints(level.paths), rng: createRng(level.decorSeed ^ 0x5bd1e995) };
  const b = new SpriteBuilder('terrain');
  addGround(b, l);
  addRoads(b, l);

  const markers = spawnMarkers(level);
  const uprights: { y: number; add: () => void }[] = [
    ...level.pads.map((p, i) => ({ y: p.y, add: () => addPad(b, `pad${i}`, p.x, p.y, theme) })),
    ...l.exits.map((e, i) => ({ y: e.y + GATE_OFFSET_Y, add: () => addCastleGate(b, `gate${i}`, e.x, e.y + GATE_OFFSET_Y) })),
    ...markers.map((m, i) => ({ y: m.y, add: () => addSpawnMarker(b, `spawn${i}`, m.x, m.y, theme) })),
    ...terrainDecor(level).map((d, i) => ({ y: d.y, add: () => addDecor(b, `decor${i}`, d.kind, d.x, d.y, d.scale) })),
  ];
  uprights.sort((a, c) => a.y - c.y).forEach((u) => u.add());

  b.rect('vignette', DESIGN_WIDTH, DESIGN_WIDTH, {
    x: DESIGN_WIDTH / 2,
    y: DESIGN_HEIGHT / 2,
    scaleY: DESIGN_HEIGHT / DESIGN_WIDTH,
    fill: radial([[0, '#000000', 0], [0.75, '#000000', 0], [1, '#000000', 0.3]], [0.5, 0.5], 0.72),
  });
  return b.build();
}

/** The whole static background of a level: 1280×720, opaque, rendered once per resize by the scene. */
export function buildTerrainArtboard(level: LevelDef): Artboard {
  const ground = THEMES[level.theme].ground;
  return makeArtboard(`terrain-${level.id}`, buildTerrainSprite(level).objects, { background: ground.dark });
}
