/**
 * Castle gatehouse at a road's exit (≈110 × 100), drawn upright: two crenellated towers with blue banners, a wall with
 * an arched wooden door where the road ends, and torches with a static glow. Origin: the ground under the door.
 */
import { linear, ROOT, solid, type PathPoint, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { CAST_SHADOW, glowFill, outline, rampFill } from './paint';
import { ellipsePoints, polyPoints, strokePoints } from './shapes';

type Pt = readonly [number, number];

const TOWER_X = 38;
const TOWER_W = 34;
const TOWER_H = 84;
const WALL_W = 54;
const WALL_H = 68;

function rectPoly(cx: number, cy: number, w: number, h: number): PathPoint[] {
  return polyPoints([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]]);
}

/** Round-topped arch standing on y = 0: half width `w`, straight sides up to `h`, then a half circle. */
function archPoints(w: number, h: number): PathPoint[] {
  const k = w * 0.5523;
  return [
    { x: -w, y: 0, moveTo: true },
    { x: -w, y: -h, outX: -w, outY: -h - k },
    { x: 0, y: -h - w, inX: -k, inY: -h - w, outX: k, outY: -h - w },
    { x: w, y: -h, inX: w, inY: -h - k },
    { x: w, y: 0, close: true },
  ];
}

function merlons(cx: number, top: number, count: number, span: number, w: number, h: number): PathPoint[] {
  return Array.from({ length: count }, (_, i) => rectPoly(cx - span / 2 + (span * i) / (count - 1), top - h / 2, w, h)).flat();
}

function lines(segments: readonly (readonly [Pt, Pt])[]): PathPoint[] {
  return segments.flatMap((s) => strokePoints(s));
}

/** Adds the gatehouse as group `name` with the door's ground point at (x, y) and returns the group id. */
export function addCastleGate(b: SpriteBuilder, name: string, x: number, y: number, parent: string = ROOT): string {
  const id = b.group(name, { x, y }, parent);
  const p = (s: string) => `${name}.${s}`;
  const stone = PALETTE.stone;
  const block = { stroke: { color: stone.dark, width: 2, opacity: 0.55 } };

  b.ellipse(p('shadow'), 136, 26, { x: 8, y: 2, fill: solid('#000000', 0.3) }, name);
  b.rect(p('wall'), WALL_W, WALL_H, { y: -WALL_H / 2, fill: rampFill(stone), stroke: outline(3), shadow: CAST_SHADOW }, name);
  b.path(p('wallMerlons'), merlons(0, -WALL_H, 3, 34, 10, 9), { fill: rampFill(stone), stroke: outline(2.5) }, name);
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    b.rect(p(`tower${tag}`), TOWER_W, TOWER_H, { x: side * TOWER_X, y: -TOWER_H / 2, fill: rampFill(stone), stroke: outline(3), shadow: CAST_SHADOW }, name);
  }
  b.path(p('parapets'), [...rectPoly(-TOWER_X, -TOWER_H, 42, 10), ...rectPoly(TOWER_X, -TOWER_H, 42, 10)], { fill: linear([[0, '#d6d1c6'], [1, stone.light]]), stroke: outline(2.5) }, name);
  b.path(p('towerMerlons'), [...merlons(-TOWER_X, -TOWER_H - 5, 3, 30, 9, 9), ...merlons(TOWER_X, -TOWER_H - 5, 3, 30, 9, 9)], { fill: rampFill(stone), stroke: outline(2.5) }, name);
  b.path(
    p('blocks'),
    lines([
      [[-53, -18], [-23, -18]], [[23, -18], [53, -18]], [[-53, -36], [-23, -36]], [[23, -36], [53, -36]],
      [[-38, -18], [-38, -36]], [[38, -18], [38, -36]], [[-46, 0], [-46, -18]], [[30, 0], [30, -18]],
      [[-22, -58], [22, -58]], [[-8, -58], [-8, -68]], [[10, -58], [10, -68]],
    ]),
    block,
    name,
  );
  b.path(p('frame'), archPoints(19, 26), { fill: rampFill({ light: '#d6d1c6', dark: stone.dark }), stroke: outline(2.5) }, name);
  b.path(p('door'), archPoints(13, 24), { fill: rampFill(PALETTE.wood), stroke: outline(2.5) }, name);
  b.path(p('planks'), lines([[[-4.5, -1], [-4.5, -35]], [[4.5, -1], [4.5, -35]]]), { stroke: { color: OUTLINE, width: 2, opacity: 0.45 } }, name);
  b.path(p('bands'), lines([[[-12, -9], [12, -9]], [[-12, -25], [12, -25]]]), { stroke: { color: PALETTE.metal.dark, width: 3.5, cap: 'butt' } }, name);
  b.circle(p('ring'), 2.5, { x: 7, y: -16, stroke: { color: PALETTE.gold.dark, width: 2 } }, name);
  b.ellipse(p('step'), 46, 10, { y: 2, fill: rampFill(stone), stroke: outline(2) }, name);

  b.path(p('rods'), lines([[[-TOWER_X - 11, -77], [-TOWER_X + 11, -77]], [[TOWER_X - 11, -77], [TOWER_X + 11, -77]]]), { stroke: { color: OUTLINE, width: 3.5 } }, name);
  const banner = (cx: number): Pt[] => [[cx - 9, -77], [cx + 9, -77], [cx + 9, -44], [cx, -51], [cx - 9, -44]];
  b.path(p('banners'), [...polyPoints(banner(-TOWER_X)), ...polyPoints(banner(TOWER_X))], { fill: rampFill(PALETTE.blue), stroke: outline(2) }, name);
  const emblem = (cx: number): Pt[] => [[cx, -71], [cx + 5, -64], [cx, -57], [cx - 5, -64]];
  b.path(p('emblems'), [...polyPoints(emblem(-TOWER_X)), ...polyPoints(emblem(TOWER_X))], { fill: rampFill(PALETTE.gold), stroke: outline(1.5) }, name);

  b.path(p('sticks'), lines([[[-TOWER_X, -22], [-TOWER_X, -33]], [[TOWER_X, -22], [TOWER_X, -33]]]), { stroke: { color: OUTLINE, width: 4.5 } }, name);
  for (const side of [-1, 1] as const) {
    b.circle(p(`glow${side < 0 ? 'L' : 'R'}`), 22, { x: side * TOWER_X, y: -38, fill: glowFill('#ffa53a', 0.55), blend: 'lighter' }, name);
  }
  const flame = (cx: number): PathPoint[] => [
    { x: cx, y: -47, moveTo: true, outX: cx + 3, outY: -42 },
    { x: cx + 4.5, y: -36, inX: cx + 5, inY: -39, outX: cx + 4.5, outY: -33 },
    { x: cx, y: -33, inX: cx + 2.5, inY: -33, outX: cx - 2.5, outY: -33 },
    { x: cx - 4.5, y: -36, inX: cx - 4.5, inY: -33, outX: cx - 5, outY: -40, close: true },
  ];
  b.path(p('flames'), [...flame(-TOWER_X), ...flame(TOWER_X)], { fill: linear([[0, '#ff6a1a'], [0.55, '#ffc23a'], [1, '#fff6c0']]), stroke: { color: '#a3231a', width: 1.5 } }, name);
  b.path(p('embers'), [...ellipsePoints(-TOWER_X, -36, 2), ...ellipsePoints(TOWER_X, -36, 2)], { fill: '#ffffff' }, name);
  return id;
}
