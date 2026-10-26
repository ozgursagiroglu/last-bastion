/**
 * Rifleman: a soldier standing in a nest. L1 sandbag ring, L2 wooden palisade and a steel helmet, L3 stone bunker with
 * gold trim and a blue banner. The soldier group mirrors (face part); arms and rifle rotate around the shoulder.
 */
import { linear, radial, solid, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import {
  closed,
  DIRT,
  IRON,
  OLIVE,
  SAND,
  SHINE,
  SKIN,
  contactShadow,
  halfArc,
  halfArcBack,
  ink,
  levels,
  line,
  loop,
  mix,
  onEllipse,
  rimArc,
  seg,
  tubeGrad,
  vgrad,
  type TowerArt,
  type TowerParts,
} from './parts';

const PIVOT = { x: 3, y: -33 };
/** Muzzle distance from the shoulder along the rifle. */
const MUZZLE = 30;
const WAIST = -14;

const NEST = { rx: 30, ry: 12 };
/** Inner floor edge the back walls stand on. */
const FLOOR = { rx: 26, ry: 9.5, y: -1 };

/** Back half of a nest wall whose top rim is `top` (points from left to right), down to the floor arc. */
function backWall(top: ReturnType<typeof rimArc>, rx: number, floor = FLOOR) {
  return [...top, { x: rx, y: floor.y }, ...halfArcBack(0, floor.y, floor.rx, floor.ry, -1), { x: -rx, y: floor.y, close: true }];
}

/** Front half of a nest wall whose top rim is `top` (left to right), down to the ground arc. */
function frontWall(top: ReturnType<typeof rimArc>, rx: number, ry: number) {
  return closed([...top, ...halfArcBack(0, 0, rx, ry, 1)]);
}

/** Vertical seams at the given angles, between the ellipse rows `fromY` and `toY`. */
function seams(angles: readonly number[], fromY: number, toY: number, rx: number, ry: number, inner?: { rx: number; ry: number }) {
  return angles.flatMap((a) => seg(onEllipse(0, fromY, rx, ry, a), onEllipse(0, toY, inner?.rx ?? rx, inner?.ry ?? ry, a)));
}

function sandbags(b: SpriteBuilder, parent: string, front: boolean): string[] {
  const height = 17;
  const top = -height;
  const fill = linear([[0, SAND.light], [1, SAND.dark]]);
  if (!front) {
    b.path('sandBack', backWall(rimArc(0, top, NEST.rx, NEST.ry, 180, 360, 5, 3), NEST.rx), { closed: true, fill, stroke: ink(2.5) }, parent);
    b.path(
      'sandBackSeams',
      [...halfArc(0, top + 8.5, NEST.rx - 2, NEST.ry - 1, -1, true), ...seams([216, 252, 288, 324], top, top + 8.5, NEST.rx, NEST.ry, { rx: NEST.rx - 2, ry: NEST.ry - 1 })],
      { stroke: line(SAND.dark, 2) },
      parent,
    );
    return ['sandBack', 'sandBackSeams'];
  }
  b.path('sandFront', frontWall(rimArc(0, top, NEST.rx, NEST.ry, 180, 0, 5, 3), NEST.rx, NEST.ry), { closed: true, fill, stroke: ink(2.5) }, parent);
  b.path(
    'sandFrontSeams',
    [
      ...halfArc(0, top + 8.5, NEST.rx, NEST.ry, 1, true),
      ...seams([144, 108, 72, 36], top + 1, top + 8.5, NEST.rx, NEST.ry),
      ...seams([162, 126, 90, 54, 18], top + 8.5, 0, NEST.rx, NEST.ry),
    ],
    { stroke: line(mix(SAND.dark, OUTLINE, 0.25), 2) },
    parent,
  );
  return ['sandFront', 'sandFrontSeams'];
}

function palisade(b: SpriteBuilder, parent: string, front: boolean): string[] {
  const top = -22;
  const wood = linear([[0, PALETTE.wood.light], [1, PALETTE.wood.dark]]);
  const seamLine = line(mix(PALETTE.wood.dark, OUTLINE, 0.3), 2);
  const n = 7;
  const step = 180 / n;
  const bounds = Array.from({ length: n - 1 }, (_, i) => step * (i + 1));
  if (!front) {
    b.path('stakesBack', backWall(rimArc(0, top, NEST.rx, NEST.ry, 180, 360, n, 5, true), NEST.rx), { closed: true, fill: linear([[0, PALETTE.wood.light], [1, mix(PALETTE.wood.dark, OUTLINE, 0.4)]]), stroke: ink(2.5) }, parent);
    b.path('stakesBackSeams', seams(bounds.map((a) => 180 + a), top, FLOOR.y, NEST.rx, NEST.ry, FLOOR), { stroke: seamLine }, parent);
    return ['stakesBack', 'stakesBackSeams'];
  }
  b.path('stakesFront', frontWall(rimArc(0, top, NEST.rx, NEST.ry, 180, 0, n, 5, true), NEST.rx, NEST.ry), { closed: true, fill: wood, stroke: ink(2.5) }, parent);
  b.path('stakesFrontSeams', seams(bounds, top, 0, NEST.rx, NEST.ry), { stroke: seamLine }, parent);
  b.path('ropeInk', halfArc(0, -12, NEST.rx, NEST.ry, 1), { stroke: line(OUTLINE, 6.5) }, parent);
  b.path('rope', halfArc(0, -12, NEST.rx, NEST.ry, 1), { stroke: line(IRON.light, 3) }, parent);
  return ['stakesFront', 'stakesFrontSeams', 'ropeInk', 'rope'];
}

const BUNKER = { rx: 34, ry: 12, top: -18, inRx: 28, inRy: 9 };

function bunker(b: SpriteBuilder, parent: string, front: boolean): string[] {
  const { rx, ry, top, inRx, inRy } = BUNKER;
  const stone = PALETTE.stone;
  const rimFill = linear([[0, mix(stone.light, '#ffffff', 0.2)], [1, stone.light]]);
  if (!front) {
    b.path(
      'bunkerBack',
      [...halfArc(0, top, rx, ry, -1), { x: inRx, y: top }, ...halfArcBack(0, FLOOR.y, inRx, FLOOR.ry + 0.5, -1), { x: -inRx, y: top, close: true }],
      { closed: true, fill: linear([[0, mix(stone.light, stone.dark, 0.45)], [1, mix(stone.dark, OUTLINE, 0.35)]]), stroke: ink(2.5) },
      parent,
    );
    b.path('bunkerBackRim', [...halfArc(0, top, rx, ry, -1), ...halfArcBack(0, top, inRx, inRy, -1)], { closed: true, fill: rimFill, stroke: ink(2.5) }, parent);
    b.rect('pole', 4, 62, { x: -27, y: -53, fill: vgrad(PALETTE.wood), stroke: ink(2) }, parent);
    b.path(
      'banner',
      [{ x: -25, y: -80 }, { x: -6, y: -80 }, { x: -6, y: -56 }, { x: -15.5, y: -61 }, { x: -25, y: -56 }],
      { closed: true, fill: vgrad(PALETTE.blue), stroke: ink(2.5) },
      parent,
    );
    b.star('emblem', 5.5, 2.4, 5, { x: -15.5, y: -70, fill: vgrad(PALETTE.gold), stroke: ink(1.5) }, parent);
    b.circle('finial', 3.5, { x: -27, y: -85, fill: radial([[0, '#fff6c8'], [1, PALETTE.gold.dark]], [0.35, 0.3], 0.7), stroke: ink(2) }, parent);
    return ['bunkerBack', 'bunkerBackRim', 'pole', 'banner', 'emblem', 'finial'];
  }
  b.path(
    'bunkerFront',
    [{ x: -rx, y: top }, ...halfArc(0, top, inRx, inRy, 1), { x: rx, y: top }, ...frontWall([], rx, ry)],
    { closed: true, fill: linear([[0, stone.light], [1, stone.dark]]), stroke: ink(3) },
    parent,
  );
  b.path(
    'bricks',
    [
      ...halfArc(0, -7, rx, ry, 1, true),
      ...seams([45, 75, 105, 135], -14, -7, rx, ry),
      ...seams([25, 60, 90, 120, 155], -7, 0, rx, ry),
    ],
    { stroke: line(mix(stone.dark, OUTLINE, 0.2), 2) },
    parent,
  );
  b.path('goldTrim', halfArc(0, top + 3.5, rx, ry, 1), { stroke: line(PALETTE.gold.light, 3.5) }, parent);
  b.path('bunkerFrontRim', [...halfArc(0, top, rx, ry, 1), ...halfArcBack(0, top, inRx, inRy, 1)], { closed: true, fill: rimFill, stroke: ink(2.5) }, parent);
  return ['bunkerFront', 'bricks', 'goldTrim', 'bunkerFrontRim'];
}

/** Soldier: torso group (breathing) with head and helmets, then the aiming arms. */
function soldier(b: SpriteBuilder, parent: string): { helmets: [string[], string[], string[]] } {
  const hy = -35;
  b.group('soldier', {}, parent);
  b.rect('legs', 16, 16, { y: WAIST + 6, radius: 3, fill: vgrad({ light: PALETTE.blue.dark, dark: mix(PALETTE.blue.dark, OUTLINE, 0.5) }), stroke: ink(2.5) }, 'soldier');
  b.group('torso', { y: WAIST }, 'soldier');
  b.rect('body', 22, 28, { y: -14, radius: [9, 9, 3, 3], fill: vgrad(PALETTE.blue), stroke: ink(2.5) }, 'torso');
  b.path('strap', [{ x: -8, y: -25 }, { x: 9, y: -5 }], { stroke: line(PALETTE.wood.dark, 3.5) }, 'torso');
  b.rect('belt', 23, 4.5, { y: -4, radius: 1.5, fill: PALETTE.wood.dark, stroke: ink(1.5) }, 'torso');
  b.path('bodyShine', [{ x: -8, y: -24 }, { x: -2, y: -27 }, { x: -8, y: -13 }], { closed: true, fill: SHINE }, 'torso');
  b.circle('head', 9.5, { x: 1, y: hy, fill: vgrad(SKIN), stroke: ink(2.5) }, 'torso');
  b.ellipse('eye', 2.8, 4, { x: 6.5, y: hy + 4.5, fill: OUTLINE }, 'torso');
  b.path(
    'helmet1',
    [{ x: -10.5, y: hy + 1, outX: -10.5, outY: hy - 13.5 }, { x: 11.5, y: hy + 1, inX: 11.5, inY: hy - 13.5 }, { x: 15, y: hy + 2.5 }, { x: -11.5, y: hy + 3 }],
    { closed: true, fill: vgrad(OLIVE), stroke: ink(2.5) },
    'torso',
  );
  const dome = [{ x: -11, y: hy + 1, outX: -11, outY: hy - 15.5 }, { x: 12.5, y: hy + 1, inX: 12.5, inY: hy - 15.5, close: true }];
  const brim = () => loop(1, hy + 1.5, 14.5, 2.8, 0.85);
  const steel = linear([[0, mix(PALETTE.metal.light, '#ffffff', 0.3)], [1, IRON.dark]]);
  b.path('helmet2', [...dome, ...brim()], { fill: steel, stroke: ink(2.5) }, 'torso');
  b.path('helmet3', [...dome, ...brim()], { fill: steel, stroke: ink(2.5) }, 'torso');
  b.path(
    'crest',
    [{ x: -6.5, y: hy - 8 }, { x: -2, y: hy - 15.5, outX: 4, outY: hy - 16.5 }, { x: 8.5, y: hy - 11, inX: 8, inY: hy - 14 }, { x: 6, y: hy - 8 }],
    { closed: true, fill: vgrad(PALETTE.gold), stroke: ink(2) },
    'torso',
  );

  b.group('arms', { x: PIVOT.x, y: PIVOT.y }, 'soldier');
  b.group('gun', {}, 'arms');
  b.rect('sleeve', 16, 9, { x: 3.5, y: 1.5, radius: 4.5, fill: vgrad(PALETTE.blue), stroke: ink(2.5) }, 'gun');
  b.path('stock', [{ x: -7.5, y: -2 }, { x: 6, y: -3 }, { x: 6, y: 3 }, { x: -6, y: 4.5 }], { closed: true, fill: vgrad(PALETTE.wood), stroke: ink(2.5) }, 'gun');
  b.rect('barrel', 23, 4.5, { x: 17, y: -0.5, radius: 1, fill: tubeGrad(IRON), stroke: ink(2) }, 'gun');
  b.circle('hand', 4, { x: 11.5, y: 1.5, fill: vgrad(SKIN), stroke: ink(2) }, 'gun');
  b.star('flash', 8, 3.2, 6, { x: MUZZLE + 4, y: -0.5, rotation: 90, opacity: 0, fill: solid(PALETTE.fire.light), stroke: line(PALETTE.fire.dark, 2) }, 'arms');
  return { helmets: [['helmet1'], ['helmet2'], ['helmet3', 'crest']] };
}

export const RIFLE_ART: TowerArt = {
  iconFrame: { x: 1, y: -23, size: 80 },
  draw(b: SpriteBuilder, parent: string): TowerParts {
    contactShadow(b, parent, 70, 20, 5);
    b.ellipse('floor', FLOOR.rx * 2 + 4, FLOOR.ry * 2 + 1, { y: FLOOR.y, fill: vgrad(DIRT) }, parent);
    const back = [sandbags(b, parent, false), palisade(b, parent, false), bunker(b, parent, false)];
    const { helmets } = soldier(b, parent);
    const front = [sandbags(b, parent, true), palisade(b, parent, true), bunker(b, parent, true)];
    const tier = (i: 0 | 1 | 2) => [...(back[i] ?? []), ...helmets[i], ...(front[i] ?? [])];

    b.clip('idle', 1.6, { torso: { scale_y: [[0, 1, 'EaseInOutSine'], [0.8, 1.03, 'EaseInOutSine'], [1.6, 1]] } });
    b.clip('fire', 0.12, {
      gun: { x: [[0, 0, 'EaseOutQuad'], [0.03, -3, 'EaseInOutSine'], [0.12, 0]] },
      flash: {
        opacity: [[0, 0], [0.015, 1], [0.08, 0]],
        scale_x: [[0, 1], [0.015, 1.2, 'EaseOutQuad'], [0.08, 0.8], [0.12, 1]],
        scale_y: [[0, 1], [0.015, 1.2, 'EaseOutQuad'], [0.08, 0.8], [0.12, 1]],
      },
    });
    const muzzle = { x: PIVOT.x + MUZZLE, y: PIVOT.y };
    return {
      tiers: levels(tier(0), tier(1), tier(2)),
      aimPart: 'arms',
      facePart: 'soldier',
      aimPivot: { ...PIVOT },
      muzzle: levels({ ...muzzle }, { ...muzzle }, { ...muzzle }),
    };
  },
};
