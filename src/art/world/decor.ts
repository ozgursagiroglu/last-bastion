/**
 * Decor props for each theme, drawn upright at their ground point (origin) in the 3/4 view. Props are static terrain
 * art: tall ones cast a canvas shadow. Small repeated details share one path object to keep the object count low.
 */
import type { ThemeId } from '../../game/types';
import { ROOT, solid, radial, type PathPoint, type ShadowSpec, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE, type Ramp } from '../palette';
import { CAST_SHADOW, CONTACT_SHADOW, glowFill, HIGHLIGHT, litBall, outline, rampFill } from './paint';
import { createRng, type Rng } from './rng';
import { blobPoints, ellipsePoints, polyPoints, strokePoints } from './shapes';

/** Theme-specific decor name, '<theme>.<prop>'. */
export type DecorKind = string;

interface Ctx {
  b: SpriteBuilder;
  /** Part name of the prop's group (parent of every piece). */
  g: string;
  rng: Rng;
}

type Drawer = (c: Ctx) => void;
type Pt = readonly [number, number];

const LEAF: Ramp = { light: '#8ad453', dark: '#2e7a2c' };
const BUSH: Ramp = { light: '#7cc64a', dark: '#336f27' };
const CACTUS: Ramp = { light: '#93d163', dark: '#3c7a38' };
const SANDSTONE: Ramp = { light: '#f3bf80', dark: '#a55f34' };
const PALM: Ramp = { light: '#93d45c', dark: '#2c7434' };
const PINE: Ramp = { light: '#4f9a6a', dark: '#1d4a37' };
const COLD_STONE: Ramp = { light: '#b1bfcc', dark: '#4d5b6c' };
const SNOWBALL: Ramp = { light: '#ffffff', dark: '#b3cbe0' };
const FROZEN_BUSH: Ramp = { light: '#86b394', dark: '#3a6150' };
const BASALT: Ramp = { light: '#74665f', dark: '#211a18' };
const OBSIDIAN: Ramp = { light: '#5d4c7c', dark: '#110b1b' };
const CHAR = '#4a3a34';
const LEAF_LIGHT = '#dcffa0';
const FLOWER_COLORS = ['#ffffff', '#ffe066', '#ff8fb1', '#b58cff'] as const;

function part(c: Ctx, name: string): string {
  return `${c.g}.${name}`;
}

function shadow(c: Ctx, w: number, h: number, dx = 4): void {
  c.b.ellipse(part(c, 'shadow'), w, h, { x: dx, y: 1, fill: CONTACT_SHADOW }, c.g);
}

function strokes(lines: readonly (readonly Pt[])[]): PathPoint[] {
  return lines.flatMap((l) => strokePoints(l));
}

function polys(shapes: readonly (readonly Pt[])[]): PathPoint[] {
  return shapes.flatMap((s) => polyPoints(s));
}

function dots(centers: readonly Pt[], r: number): PathPoint[] {
  return centers.flatMap(([x, y]) => ellipsePoints(x, y, r));
}

/** Two strokes of one path (dark outline under a colored core), for limbs, trunks and bones. */
function limb(c: Ctx, name: string, points: PathPoint[], width: number, color: string): void {
  c.b.path(part(c, `${name}Outline`), points, { stroke: { color: OUTLINE, width: width + 5 } }, c.g);
  c.b.path(part(c, name), points, { stroke: { color, width } }, c.g);
}

const random = (c: Ctx) => () => c.rng.next();

// ---------------------------------------------------------------------------- meadow

const meadowTree: Drawer = (c) => {
  shadow(c, 58, 18, 7);
  c.b.rect(part(c, 'trunk'), 11, 24, { y: -11, radius: 3, fill: rampFill(PALETTE.wood), stroke: outline() }, c.g);
  c.b.path(part(c, 'canopy'), blobPoints(0, -42, 27, 23, 7, 0.3, random(c)), { closed: true, fill: rampFill(LEAF), stroke: outline(3), shadow: CAST_SHADOW }, c.g);
  const arc = (x: number, y: number, w: number): PathPoint[] => [
    { x, y, moveTo: true, outX: x + w * 0.15, outY: y - w * 0.55 },
    { x: x + w, y, inX: x + w * 0.85, inY: y - w * 0.55 },
  ];
  c.b.path(part(c, 'marks'), [...arc(4, -28, 11), ...arc(-15, -33, 10), ...arc(-5, -23, 9)], { stroke: { color: '#2b6624', width: 2, opacity: 0.55 } }, c.g);
  c.b.path(part(c, 'shine'), blobPoints(-8, -51, 12, 8, 5), { closed: true, fill: solid(LEAF_LIGHT, 0.4) }, c.g);
};

const meadowBush: Drawer = (c) => {
  shadow(c, 42, 12, 3);
  c.b.path(part(c, 'body'), blobPoints(0, -11, 18, 12, 5, 0.3, random(c)), { closed: true, fill: rampFill(BUSH), stroke: outline() }, c.g);
  c.b.path(part(c, 'shine'), blobPoints(-6, -16, 8, 5, 4), { closed: true, fill: solid(LEAF_LIGHT, 0.4) }, c.g);
  c.b.path(part(c, 'berries'), dots([[5, -12], [9, -7], [-2, -6]], 2.6), { fill: '#e8423a', stroke: outline(1.5) }, c.g);
};

const meadowRock: Drawer = (c) => {
  shadow(c, 42, 12, 3);
  c.b.path(part(c, 'rock'), polyPoints([[-17, 0], [-19, -9], [-11, -19], [2, -22], [13, -16], [18, -6], [15, 0]]), { fill: rampFill(PALETTE.stone), stroke: outline() }, c.g);
  c.b.path(part(c, 'facet'), polyPoints([[-11, -17], [2, -20], [-2, -12], [-14, -9]]), { fill: HIGHLIGHT }, c.g);
  c.b.path(part(c, 'moss'), blobPoints(5, -18, 7, 3, 4), { closed: true, fill: '#6fae3c', stroke: outline(1.5) }, c.g);
  c.b.path(part(c, 'crack'), strokePoints([[9, -12], [11, -7], [9, -3]]), { stroke: { color: OUTLINE, width: 2, opacity: 0.5 } }, c.g);
};

const meadowFlowers: Drawer = (c) => {
  const heads: Pt[] = [[-8, -9], [2, -14], [9, -6], [-1, -4]];
  const color = c.rng.pick(FLOWER_COLORS);
  c.b.path(part(c, 'leaves'), [...ellipsePoints(-5, -2, 6, 2.5), ...ellipsePoints(6, -1, 6, 2.5)], { fill: '#4f9a32' }, c.g);
  c.b.path(part(c, 'petals'), heads.flatMap(([x, y]) => blobPoints(x, y, 4, 4, 5)), { fill: color, stroke: outline(1.5) }, c.g);
  c.b.path(part(c, 'hearts'), dots(heads, 1.8), { fill: color === '#ffe066' ? '#c8701a' : '#ffd23a' }, c.g);
};

const meadowStump: Drawer = (c) => {
  shadow(c, 36, 10, 3);
  c.b.path(part(c, 'side'), polyPoints([[-14, 0], [-11, -3], [-11, -15], [11, -15], [11, -3], [14, 0]]), { fill: rampFill(PALETTE.wood), stroke: outline() }, c.g);
  c.b.ellipse(part(c, 'top'), 22, 9, { y: -15, fill: '#e2b07a', stroke: outline(2) }, c.g);
  c.b.ellipse(part(c, 'rings'), 11, 4, { y: -15, stroke: { color: '#a8703f', width: 2 } }, c.g);
};

// ---------------------------------------------------------------------------- desert

const desertCactus: Drawer = (c) => {
  shadow(c, 32, 10, 4);
  limb(c, 'arms', strokes([[[-6, -18], [-15, -18], [-15, -32]], [[6, -26], [14, -26], [14, -38]]]), 9, '#6aaa4c');
  c.b.rect(part(c, 'body'), 16, 46, { y: -23, radius: [8, 8, 3, 3], fill: rampFill(CACTUS), stroke: outline(), shadow: CAST_SHADOW }, c.g);
  c.b.path(part(c, 'ribs'), strokes([[[3, -40], [3, -6]], [[-3, -40], [-3, -6]]]), { stroke: { color: '#3c7a38', width: 2, opacity: 0.6 } }, c.g);
  c.b.path(part(c, 'flower'), blobPoints(0, -47, 4.5, 4, 5), { closed: true, fill: '#ff7aa8', stroke: outline(1.5) }, c.g);
};

const desertSandstone: Drawer = (c) => {
  shadow(c, 52, 14, 5);
  c.b.path(part(c, 'rock'), polyPoints([[-22, 0], [-24, -10], [-19, -26], [-6, -30], [10, -29], [20, -22], [24, -8], [21, 0]]), { fill: rampFill(SANDSTONE), stroke: outline() }, c.g);
  c.b.path(part(c, 'bands'), strokes([[[-23, -11], [-8, -13], [6, -11], [23, -13]], [[-21, -20], [-5, -22], [18, -19]]]), { stroke: { color: '#b0643a', width: 2, opacity: 0.7 } }, c.g);
  c.b.path(part(c, 'shine'), polyPoints([[-18, -25], [-6, -28], [9, -27], [4, -23], [-10, -22]]), { fill: solid('#fff0d0', 0.45) }, c.g);
};

const desertDryBush: Drawer = (c) => {
  shadow(c, 34, 9, 2);
  c.b.path(part(c, 'branches'), strokes([[[0, 0], [-6, -10], [-14, -16]], [[0, 0], [-1, -13], [-4, -22]], [[0, 0], [5, -11], [6, -20]], [[0, 0], [9, -7], [16, -13]], [[-6, -10], [-11, -8]], [[5, -11], [10, -16]]]), { stroke: { color: '#6e4a2a', width: 2.5 } }, c.g);
  c.b.path(part(c, 'twigs'), strokes([[[-14, -16], [-17, -21]], [[-4, -22], [0, -26]], [[6, -20], [3, -25]], [[16, -13], [19, -18]], [[-1, -13], [-6, -18]]]), { stroke: { color: '#c09060', width: 2 } }, c.g);
};

const desertBones: Drawer = (c) => {
  c.b.ellipse(part(c, 'shadow'), 34, 8, { x: 5, y: 1, fill: solid('#000000', 0.18) }, c.g);
  limb(c, 'bone', strokePoints([[9, -1], [24, -5]]), 4, '#f3ead8');
  c.b.path(part(c, 'knobs'), dots([[8, 1], [8, -3.5], [25, -2.5], [25, -7]], 2.8), { fill: '#f3ead8', stroke: outline(1.5) }, c.g);
  c.b.rect(part(c, 'jaw'), 10, 6, { y: -2, radius: 2, fill: '#e2d6bf', stroke: outline(2) }, c.g);
  c.b.ellipse(part(c, 'skull'), 18, 14, { y: -9, fill: rampFill({ light: '#fffaf0', dark: '#d8cdb8' }), stroke: outline(2) }, c.g);
  c.b.path(part(c, 'sockets'), dots([[-3.5, -9], [3.5, -9]], 2.6), { fill: OUTLINE }, c.g);
};

function leaf(cx: number, cy: number, tx: number, ty: number, width: number): PathPoint[] {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * width;
  const ny = (dx / len) * width;
  return [
    { x: cx, y: cy, moveTo: true, outX: cx + dx * 0.35 + nx, outY: cy + dy * 0.35 + ny - 6, inX: cx + dx * 0.35 - nx, inY: cy + dy * 0.35 - ny - 6 },
    { x: tx, y: ty, close: true, inX: tx - dx * 0.3 + nx * 0.6, inY: ty - dy * 0.3 + ny * 0.6 - 4, outX: tx - dx * 0.3 - nx * 0.6, outY: ty - dy * 0.3 - ny * 0.6 - 4 },
  ];
}

const desertPalm: Drawer = (c) => {
  shadow(c, 60, 16, 12);
  const trunk: PathPoint[] = [{ x: 0, y: 0, outX: 2, outY: -22 }, { x: 8, y: -52, inX: 0, inY: -34 }];
  limb(c, 'trunk', trunk, 7, '#a8743f');
  c.b.path(part(c, 'bands'), trunk, { stroke: { color: '#73492a', width: 7, dash: [3, 6], cap: 'butt' } }, c.g);
  const crown: Pt = [8, -54];
  const tips: Pt[] = [[-22, -40], [-12, -66], [12, -72], [34, -58], [36, -38]];
  c.b.path(part(c, 'fronds'), tips.flatMap(([x, y]) => leaf(crown[0], crown[1], x, y, 7)), { fill: rampFill(PALM), stroke: outline(), shadow: CAST_SHADOW }, c.g);
  c.b.path(part(c, 'coconuts'), dots([[4, -50], [11, -49]], 3.5), { fill: '#6b4423', stroke: outline(1.5) }, c.g);
};

// ---------------------------------------------------------------------------- snow

const snowPine: Drawer = (c) => {
  shadow(c, 46, 14, 7);
  c.b.rect(part(c, 'trunk'), 8, 12, { y: -6, radius: 2, fill: rampFill(PALETTE.wood), stroke: outline(2) }, c.g);
  c.b.path(
    part(c, 'foliage'),
    polyPoints([[0, -64], [9, -47], [5, -47], [15, -31], [9, -31], [21, -12], [-21, -12], [-9, -31], [-15, -31], [-5, -47], [-9, -47]]),
    { fill: rampFill(PINE), stroke: outline(), shadow: CAST_SHADOW },
    c.g,
  );
  c.b.path(
    part(c, 'snow'),
    polys([
      [[0, -64], [5.5, -54], [2, -52], [-1, -54], [-4, -51], [-6, -54]],
      [[-5, -47], [5, -47], [9, -40], [4, -38], [0, -40], [-4, -37], [-9, -40]],
      [[-9, -31], [9, -31], [13, -24], [7, -22], [2, -24], [-3, -21], [-8, -24], [-13, -24]],
    ]),
    { fill: '#ffffff' },
    c.g,
  );
};

const snowRock: Drawer = (c) => {
  shadow(c, 44, 12, 3);
  c.b.path(part(c, 'rock'), polyPoints([[-18, 0], [-20, -9], [-12, -18], [2, -21], [14, -15], [19, -6], [16, 0]]), { fill: rampFill(COLD_STONE), stroke: outline() }, c.g);
  c.b.path(part(c, 'facet'), polyPoints([[-14, -10], [-8, -13], [-6, -6], [-15, -4]]), { fill: HIGHLIGHT }, c.g);
  c.b.path(part(c, 'cap'), blobPoints(-1, -19, 14, 5, 5), { closed: true, fill: '#ffffff', stroke: outline(2) }, c.g);
};

const snowCrystal: Drawer = (c) => {
  shadow(c, 32, 9, 2);
  c.b.circle(part(c, 'glow'), 24, { y: -16, fill: glowFill('#8fe8ff', 0.5), blend: 'lighter' }, c.g);
  c.b.path(
    part(c, 'crystals'),
    polys([
      [[-8, 0], [-16, -13], [-15, -22], [-9, -17], [-3, -2]],
      [[5, -1], [12, -15], [18, -18], [17, -8], [9, 0]],
      [[-5, 0], [-6, -22], [0, -33], [6, -22], [5, 0]],
    ]),
    { fill: rampFill(PALETTE.ice), stroke: outline(2) },
    c.g,
  );
  c.b.path(part(c, 'facets'), polys([[[0, -31], [3, -22], [1, -3], [-2, -3], [-3, -22]], [[-14, -20], [-10, -16], [-12, -12]]]), { fill: solid('#ffffff', 0.6) }, c.g);
};

const snowSnowman: Drawer = (c) => {
  shadow(c, 36, 10, 4);
  c.b.path(part(c, 'arms'), strokes([[[-10, -22], [-20, -28], [-24, -33]], [[-20, -28], [-25, -27]], [[10, -22], [19, -29], [22, -34]]]), { stroke: { color: '#6b3f1f', width: 2.5 } }, c.g);
  c.b.circle(part(c, 'bottom'), 13, { y: -12, fill: litBall(SNOWBALL), stroke: outline() }, c.g);
  c.b.circle(part(c, 'head'), 9, { y: -31, fill: litBall(SNOWBALL), stroke: outline() }, c.g);
  c.b.path(part(c, 'scarf'), polyPoints([[-9, -25], [9, -25], [9, -21], [4, -21], [5, -13], [0, -13], [-1, -21], [-9, -21]]), { fill: '#e8423a', stroke: outline(2) }, c.g);
  c.b.path(part(c, 'coal'), dots([[-3, -34], [3.5, -34], [0, -14], [0, -7]], 1.9), { fill: OUTLINE }, c.g);
  c.b.path(part(c, 'nose'), polyPoints([[0, -32], [9, -30], [0, -28.5]]), { fill: '#ff8a2a', stroke: outline(1.5) }, c.g);
};

const snowBush: Drawer = (c) => {
  shadow(c, 38, 10, 3);
  c.b.path(part(c, 'body'), blobPoints(0, -10, 16, 11, 5, 0.3, random(c)), { closed: true, fill: rampFill(FROZEN_BUSH), stroke: outline() }, c.g);
  c.b.path(part(c, 'snow'), blobPoints(-1, -18, 12, 4.5, 4), { closed: true, fill: '#ffffff', stroke: outline(1.5) }, c.g);
};

// ---------------------------------------------------------------------------- volcano

const volcanoRock: Drawer = (c) => {
  shadow(c, 46, 13, 3);
  c.b.path(part(c, 'rock'), polyPoints([[-20, 0], [-22, -12], [-14, -24], [-4, -30], [8, -26], [18, -18], [22, -6], [18, 0]]), { fill: rampFill(BASALT), stroke: outline() }, c.g);
  c.b.path(part(c, 'facet'), polyPoints([[-14, -22], [-4, -28], [-6, -18], [-16, -13]]), { fill: solid('#ffffff', 0.18) }, c.g);
  c.b.path(part(c, 'rim'), strokePoints([[9, -24], [17, -17], [20, -7]]), { stroke: { color: '#ff7a2a', width: 2, opacity: 0.8 } }, c.g);
};

const volcanoDeadTree: Drawer = (c) => {
  shadow(c, 42, 12, 6);
  limb(c, 'branches', strokes([[[1, -20], [12, -30], [16, -42]], [[-1, -31], [-12, -38], [-15, -48]], [[12, -30], [21, -31]], [[-12, -38], [-19, -36]]]), 3.5, CHAR);
  limb(c, 'trunk', strokePoints([[0, 0], [1, -20], [-2, -36], [-1, -50]]), 6, CHAR);
};

/** Glow of molten lava: a canvas shadow, allowed here because the terrain is rendered once per resize. */
const LAVA_GLOW: ShadowSpec = { color: '#ff6a10', blur: 6, opacity: 1 };

/** Molten surfaces at scale 1, relative to the prop's ground point (embers rise from them). */
export const MOLTEN_SURFACES: Readonly<Partial<Record<DecorKind, { y: number; rx: number; ry: number }>>> = {
  'volcano.lavaPool': { y: -4, rx: 19, ry: 8.5 },
  'volcano.vent': { y: -14, rx: 11, ry: 3.5 },
};

const volcanoLavaPool: Drawer = (c) => {
  c.b.ellipse(part(c, 'glow'), 76, 34, { y: -3, fill: glowFill('#ff7a1a', 0.55), blend: 'lighter' }, c.g);
  c.b.path(part(c, 'rim'), blobPoints(0, -4, 26, 13, 7, 0.2, random(c)), { closed: true, fill: '#2a201d', stroke: outline() }, c.g);
  c.b.path(part(c, 'lava'), blobPoints(0, -4, 19, 8.5, 6, 0.2, random(c)), {
    closed: true,
    fill: radial([[0, '#fff1a0'], [0.45, '#ffb03a'], [1, '#e2461b']]),
    shadow: LAVA_GLOW,
  }, c.g);
  c.b.path(part(c, 'crust'), [...blobPoints(-8, -5, 5, 2.5, 4), ...blobPoints(9, -2, 4, 2, 4)], { fill: '#4a2a20' }, c.g);
  c.b.path(part(c, 'bubbles'), dots([[3, -7], [-2, -1]], 2), { fill: '#fff6c0' }, c.g);
};

const volcanoObsidian: Drawer = (c) => {
  shadow(c, 36, 10, 3);
  c.b.path(
    part(c, 'shards'),
    polys([
      [[-12, 0], [-16, -16], [-9, -26], [-4, -10], [-5, 0]],
      [[3, 0], [10, -20], [15, -14], [12, 0]],
      [[-6, 0], [-2, -36], [5, -26], [6, 0]],
    ]),
    { fill: rampFill(OBSIDIAN), stroke: outline(2) },
    c.g,
  );
  c.b.path(part(c, 'shine'), polys([[[-2, -33], [0, -12], [-3, -12]], [[-14, -16], [-10, -23], [-8, -14]]]), { fill: solid('#c8b8ff', 0.5) }, c.g);
};

const volcanoVent: Drawer = (c) => {
  shadow(c, 46, 12, 3);
  c.b.ellipse(part(c, 'glow'), 50, 26, { y: -14, fill: glowFill('#ff8a2a', 0.45), blend: 'lighter' }, c.g);
  c.b.path(part(c, 'mound'), polyPoints([[-21, 0], [-11, -14], [11, -14], [21, 0]]), { fill: rampFill(BASALT), stroke: outline() }, c.g);
  c.b.ellipse(part(c, 'crater'), 22, 7, { y: -14, fill: radial([[0, '#ffe27a'], [1, '#e2461b']]), stroke: outline(2), shadow: LAVA_GLOW }, c.g);
  c.b.path(part(c, 'smoke'), [...ellipsePoints(2, -25, 6), ...ellipsePoints(-3, -36, 8), ...ellipsePoints(4, -49, 10)], { fill: solid('#a0958e', 0.4) }, c.g);
};

const DRAWERS: Readonly<Record<ThemeId, Readonly<Record<string, Drawer>>>> = {
  meadow: { tree: meadowTree, bush: meadowBush, rock: meadowRock, flowers: meadowFlowers, stump: meadowStump },
  desert: { cactus: desertCactus, sandstone: desertSandstone, dryBush: desertDryBush, bones: desertBones, palm: desertPalm },
  snow: { pine: snowPine, rock: snowRock, crystal: snowCrystal, snowman: snowSnowman, bush: snowBush },
  volcano: { rock: volcanoRock, deadTree: volcanoDeadTree, lavaPool: volcanoLavaPool, obsidian: volcanoObsidian, vent: volcanoVent },
};

export const DECOR_KINDS: Readonly<Record<ThemeId, readonly DecorKind[]>> = {
  meadow: Object.keys(DRAWERS.meadow).map((k) => `meadow.${k}`),
  desert: Object.keys(DRAWERS.desert).map((k) => `desert.${k}`),
  snow: Object.keys(DRAWERS.snow).map((k) => `snow.${k}`),
  volcano: Object.keys(DRAWERS.volcano).map((k) => `volcano.${k}`),
};

function drawerOf(kind: DecorKind): Drawer {
  const [theme, prop] = kind.split('.');
  const drawers = theme === undefined ? undefined : (DRAWERS as Readonly<Record<string, Readonly<Record<string, Drawer>>>>)[theme];
  const drawer = drawers && prop !== undefined ? drawers[prop] : undefined;
  if (!drawer) throw new Error(`Unknown decor kind '${kind}'`);
  return drawer;
}

/**
 * Adds a decor prop as group `name` standing at (x, y) and returns the group id. Lobed shapes vary with the position,
 * so the same kind never looks stamped, yet a given placement always draws the same.
 */
export function addDecor(b: SpriteBuilder, name: string, kind: DecorKind, x: number, y: number, scale = 1, parent: string = ROOT): string {
  const draw = drawerOf(kind);
  const id = b.group(name, { x, y, scale }, parent);
  draw({ b, g: name, rng: createRng(Math.round(x * 7919 + y * 104729) ^ kind.length) });
  return id;
}
