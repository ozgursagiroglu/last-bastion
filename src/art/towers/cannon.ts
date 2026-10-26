/**
 * Cannon: round stone tower with crenellations and a turret that rotates to aim, seen mostly from above (round cap,
 * barrel along local +x). L2 iron band, a second stone ring and a banded barrel; L3 a wider ring, taller gold-capped
 * merlons, gold rim, a banner and a longer bronze barrel.
 */
import { linear, solid, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import {
  BRONZE,
  IRON,
  SHINE,
  ballGrad,
  box,
  closed,
  contactShadow,
  frustum,
  halfArc,
  halfArcBack,
  ink,
  levels,
  line,
  mix,
  onEllipse,
  roundGrad,
  seg,
  tubeGrad,
  vgrad,
  type TowerArt,
  type TowerParts,
} from './parts';

const PIVOT = { x: 0, y: -46 };
const TOWER = { rx: 24, ry: 8, top: -40, bottom: 4 };
const MERLON_ANGLES = [180, 225, 270, 315, 0, 45, 135];

/** Stone skirt around the tower foot: ledge crescent on top of a front face. */
function skirt(b: SpriteBuilder, parent: string, name: string, rx: number, gold: boolean): string[] {
  const ledgeY = -12;
  const ledgeRy = rx * 0.4;
  const bottom = 3;
  const face = closed([...halfArc(0, ledgeY, rx, ledgeRy, 1), { x: rx, y: bottom }, ...halfArcBack(0, bottom, rx, rx / 3, 1)]);
  b.path(`${name}Face`, face, { closed: true, fill: linear([[0, mix(PALETTE.stone.light, PALETTE.stone.dark, 0.3)], [1, PALETTE.stone.dark]]), stroke: ink(3) }, parent);
  b.path(
    `${name}Ledge`,
    [...halfArc(0, ledgeY, rx, ledgeRy, 1), ...halfArcBack(0, ledgeY, TOWER.rx, TOWER.ry, 1)],
    { closed: true, fill: linear([[0, mix(PALETTE.stone.light, '#ffffff', 0.25)], [1, PALETTE.stone.light]]), stroke: ink(2.5) },
    parent,
  );
  const names = [`${name}Face`, `${name}Ledge`];
  if (gold) {
    b.path(`${name}Gold`, halfArc(0, ledgeY + 4, rx, ledgeRy, 1), { stroke: line(PALETTE.gold.light, 3) }, parent);
    names.push(`${name}Gold`);
  }
  return names;
}

/** A band around the tower body: an outline stroke under a colored one. */
function band(b: SpriteBuilder, parent: string, name: string, y: number, color: string): string[] {
  b.path(`${name}Ink`, halfArc(0, y, TOWER.rx, TOWER.ry, 1), { stroke: line(OUTLINE, 8) }, parent);
  b.path(name, halfArc(0, y, TOWER.rx, TOWER.ry, 1), { stroke: line(color, 4.5) }, parent);
  return [`${name}Ink`, name];
}

function merlons(height: number, width: number) {
  return MERLON_ANGLES.flatMap((a) => {
    const p = onEllipse(0, TOWER.top, TOWER.rx - 3, TOWER.ry - 1, a);
    return box(p.x - width / 2, p.y + 2 - height, width, height);
  });
}

function barrel(b: SpriteBuilder, name: string, length: number, ramp: typeof IRON, ringRamp: typeof IRON, banded: boolean): string[] {
  b.rect(name, length, 12.5, { x: 2 + length / 2, radius: 4.5, fill: tubeGrad(ramp), stroke: ink(3) }, 'barrel');
  b.rect(`${name}Ring`, 5, 16, { x: 2 + length, radius: 2, fill: tubeGrad(ringRamp), stroke: ink(2.5) }, 'barrel');
  const names = [name, `${name}Ring`];
  if (banded) {
    b.rect(`${name}Band`, 4, 14.5, { x: 2 + length * 0.55, radius: 1.5, fill: tubeGrad(ringRamp), stroke: ink(2) }, 'barrel');
    names.push(`${name}Band`);
  }
  return names;
}

export const CANNON_ART: TowerArt = {
  iconFrame: { x: 0, y: -28, size: 94 },
  draw(b: SpriteBuilder, parent: string): TowerParts {
    const stone = PALETTE.stone;
    contactShadow(b, parent, 70, 20, 5);
    b.path('body', frustum(TOWER.rx, TOWER.rx, TOWER.ry, TOWER.top, TOWER.bottom), { closed: true, fill: roundGrad(stone), stroke: ink(3) }, parent);
    const rows = [TOWER.top, -30, -20, -10, TOWER.bottom];
    b.path(
      'bricks',
      [
        ...rows.slice(1, -1).flatMap((y) => halfArc(0, y, TOWER.rx, TOWER.ry, 1, true)),
        ...rows.slice(0, -1).flatMap((y, i) => {
          const next = rows[i + 1] ?? y;
          const angles = i % 2 === 0 ? [60, 120] : [30, 90, 150];
          return angles.flatMap((a) => seg(onEllipse(0, y + 1, TOWER.rx, TOWER.ry, a), onEllipse(0, next, TOWER.rx, TOWER.ry, a)));
        }),
      ],
      { stroke: line(mix(stone.dark, OUTLINE, 0.15), 2) },
      parent,
    );
    b.path('bodyShine', [{ x: -19, y: -35 }, { x: -14, y: -34 }, { x: -14, y: 6 }, { x: -19, y: 4 }], { closed: true, fill: SHINE }, parent);

    const t2 = [...band(b, parent, 'band2', -28, IRON.light), ...skirt(b, parent, 'ring2', 29, false)];
    const t3 = [...band(b, parent, 'band3', -28, PALETTE.gold.light), ...skirt(b, parent, 'ring3', 33, true)];
    b.path(
      'banner',
      [{ x: -8, y: -33 }, { x: 8, y: -33 }, { x: 8, y: -12 }, { x: 0, y: -17 }, { x: -8, y: -12 }],
      { closed: true, fill: vgrad(PALETTE.blue), stroke: ink(2.5) },
      parent,
    );
    b.star('emblem', 5, 2.2, 5, { y: -25, fill: vgrad(PALETTE.gold), stroke: ink(1.5) }, parent);
    t3.push('banner', 'emblem');

    b.ellipse('rim', TOWER.rx * 2, TOWER.ry * 2, { y: TOWER.top, fill: linear([[0, mix(stone.light, '#ffffff', 0.2)], [1, stone.light]]), stroke: ink(3) }, parent);
    b.ellipse('floor', 34, 10, { y: TOWER.top, fill: vgrad({ light: stone.dark, dark: mix(stone.dark, OUTLINE, 0.5) }), stroke: ink(2) }, parent);
    b.ellipse('rimGold', 41, 13, { y: TOWER.top, stroke: line(PALETTE.gold.light, 2.5) }, parent);
    t3.push('rimGold');
    b.path('merlons', merlons(9, 9), { fill: vgrad(stone), stroke: ink(2.5) }, parent);
    b.path('merlons3', merlons(12, 10), { fill: vgrad(stone), stroke: ink(2.5) }, parent);
    b.path(
      'caps3',
      MERLON_ANGLES.flatMap((a) => {
        const p = onEllipse(0, TOWER.top, TOWER.rx - 3, TOWER.ry - 1, a);
        return box(p.x - 5, p.y - 10, 10, 3.5);
      }),
      { fill: vgrad(PALETTE.gold), stroke: ink(2) },
      parent,
    );
    t3.push('merlons3', 'caps3');

    b.rect('pole', 4, 26, { x: -21, y: -60, fill: vgrad(PALETTE.wood), stroke: ink(2) }, parent);
    b.group('pennant', { x: -19.5, y: -71 }, parent);
    b.path('flag', [{ x: 0, y: -1 }, { x: 17, y: 4 }, { x: 0, y: 9 }], { closed: true, fill: vgrad(PALETTE.red), stroke: ink(2) }, 'pennant');

    b.ellipse('turretBase', 34, 17, { y: TOWER.top - 2, fill: vgrad(IRON), stroke: ink(2.5) }, parent);
    b.group('turret', { x: PIVOT.x, y: PIVOT.y }, parent);
    b.group('barrel', {}, 'turret');
    const t1 = barrel(b, 'barrel1', 22, IRON, IRON, false);
    t2.push(...barrel(b, 'barrel2', 22, IRON, IRON, true));
    t3.push(...barrel(b, 'barrel3', 28, BRONZE, PALETTE.gold, true));
    b.star('flash', 11, 4.5, 8, { x: 38, opacity: 0, fill: solid(PALETTE.fire.light), stroke: line(PALETTE.fire.dark, 2.5) }, 'turret');
    b.circle('smoke', 7, { x: 33, opacity: 0, scale: 0.5, fill: solid('#ece7de') }, 'turret');
    b.circle('cap', 11.5, { x: PIVOT.x, y: PIVOT.y, fill: ballGrad(IRON), stroke: ink(3) }, parent);
    b.circle('cap3', 13, { x: PIVOT.x, y: PIVOT.y, fill: ballGrad(BRONZE), stroke: ink(3) }, parent);
    t3.push('cap3');

    b.clip('idle', 2, {
      pennant: {
        rotation: [[0, -5, 'EaseInOutSine'], [1, 7, 'EaseInOutSine'], [2, -5]],
        scale_x: [[0, 1, 'EaseInOutSine'], [0.5, 0.82, 'EaseInOutSine'], [1, 1, 'EaseInOutSine'], [1.5, 0.82, 'EaseInOutSine'], [2, 1]],
      },
    });
    b.clip('fire', 0.3, {
      barrel: { x: [[0, 0, 'EaseOutQuad'], [0.05, -6, 'EaseInOutSine'], [0.3, 0]] },
      flash: {
        opacity: [[0, 0], [0.02, 1], [0.1, 0]],
        scale_x: [[0, 1], [0.02, 1.25, 'EaseOutQuad'], [0.1, 0.8], [0.3, 1]],
        scale_y: [[0, 1], [0.02, 1.25, 'EaseOutQuad'], [0.1, 0.8], [0.3, 1]],
      },
      smoke: {
        opacity: [[0, 0], [0.04, 0.85, 'EaseInQuad'], [0.3, 0]],
        x: [[0, 33, 'EaseOutQuad'], [0.28, 46], [0.3, 33]],
        scale_x: [[0, 0.5, 'EaseOutQuad'], [0.28, 1.9], [0.3, 0.5]],
        scale_y: [[0, 0.5, 'EaseOutQuad'], [0.28, 1.9], [0.3, 0.5]],
      },
    });
    const tip = (len: number) => ({ x: PIVOT.x + 2 + len + 4, y: PIVOT.y });
    return {
      tiers: levels(t1, t2, t3),
      aimPart: 'turret',
      facePart: null,
      aimPivot: { ...PIVOT },
      muzzle: levels(tip(22), tip(22), tip(28)),
    };
  },
};
