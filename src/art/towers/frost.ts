/**
 * Frost Tower: stone pedestal with an ice basin and a large floating ice crystal in a translucent glow. No aim, no face.
 * L2 a stone ring with glowing runes and two hovering side crystals; L3 a wider gold-trimmed ring, bigger side
 * crystals, a gold halo around a bigger core.
 */
import { linear, radial, type PathPoint, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE, type Ramp } from '../palette';
import { outerGlow } from '../world/effects';
import {
  SHINE,
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
  vgrad,
  type TowerArt,
  type TowerParts,
} from './parts';

const CRYSTAL_Y = -58;
/** `glow`: blur of the engine glow (the L3 crystal floats close to the top of the tower box). */
const CORE = { halfWidth: 10, up: 22, down: 17, glow: 8 };
const CORE3 = { halfWidth: 13, up: 28, down: 22, glow: 5 };
const BASE = { rxTop: 19, rxBottom: 24, ry: 8, top: -24, bottom: 3.5 };
const RY_TOP = (BASE.ry * BASE.rxTop) / BASE.rxBottom;
const SIDE_Y = -44;
const LEDGE_Y = -6;

/** Pedestal radius at height y. */
function baseRx(y: number): number {
  return BASE.rxTop + ((BASE.rxBottom - BASE.rxTop) * (y - BASE.top)) / (BASE.bottom - BASE.top);
}

/** Upright ice kite centered on (cx, cy): top point `up` px above, bottom point `down` px below. */
function kite(cx: number, cy: number, halfWidth: number, up: number, down: number): PathPoint[] {
  const mid = cy - (up - down) * 0.15;
  return [
    { x: cx, y: cy - up },
    { x: cx + halfWidth, y: mid },
    { x: cx, y: cy + down },
    { x: cx - halfWidth, y: mid },
  ];
}

function iceFill(ice: Ramp) {
  return linear([[0, '#ffffff'], [0.4, ice.light], [1, ice.dark]], [0.2, 0], [0.8, 1]);
}

/** Core crystal and its shaded right facet. */
function core(b: SpriteBuilder, name: string, size: typeof CORE): string[] {
  const k = kite(0, 0, size.halfWidth, size.up, size.down);
  const [top, right, bottom] = k;
  b.path(name, k, { closed: true, fill: iceFill(PALETTE.ice), stroke: ink(3), effects: [outerGlow(PALETTE.ice.light, size.glow)] }, 'crystal');
  if (top && right && bottom) {
    b.path(
      `${name}Facet`,
      [top, right, bottom, { x: size.halfWidth * 0.25, y: right.y }],
      { closed: true, fill: linear([[0, PALETTE.ice.dark], [1, mix(PALETTE.ice.dark, OUTLINE, 0.3)]], [0, 0], [1, 1], 0.55) },
      'crystal',
    );
  }
  return [name, `${name}Facet`];
}

/** Skirt ring around the pedestal foot (ledge crescent on a front face). */
function ring(b: SpriteBuilder, parent: string, name: string, rx: number, gold: boolean): string[] {
  const innerRx = baseRx(LEDGE_Y);
  const face = closed([...halfArc(0, LEDGE_Y, rx, rx * 0.4, 1), { x: rx, y: 3 }, ...halfArcBack(0, 3, rx, rx / 3, 1)]);
  b.path(`${name}Face`, face, { closed: true, fill: linear([[0, mix(PALETTE.stone.light, PALETTE.stone.dark, 0.3)], [1, PALETTE.stone.dark]]), stroke: ink(3) }, parent);
  b.path(
    `${name}Ledge`,
    [...halfArc(0, LEDGE_Y, rx, rx * 0.4, 1), ...halfArcBack(0, LEDGE_Y, innerRx, (innerRx * BASE.ry) / BASE.rxBottom, 1)],
    { closed: true, fill: linear([[0, mix(PALETTE.stone.light, '#ffffff', 0.25)], [1, PALETTE.stone.light]]), stroke: ink(2.5) },
    parent,
  );
  const names = [`${name}Face`, `${name}Ledge`];
  if (gold) {
    b.path(`${name}Gold`, halfArc(0, LEDGE_Y + 4, rx, rx * 0.4, 1), { stroke: line(PALETTE.gold.light, 3) }, parent);
    names.push(`${name}Gold`);
  }
  return names;
}

function runes(b: SpriteBuilder, parent: string, name: string, opacity: number): string {
  const glyphs = [-10, 0, 10].flatMap((x, i) => {
    const y = -12 + (i === 1 ? 2 : 0);
    return [...seg({ x, y: y - 4.5 }, { x: x + 3, y }), { x, y: y + 4.5 }, { x: x - 3, y }, { x, y: y - 4.5 }];
  });
  b.path(name, glyphs, { stroke: line('#8ff0ff', 2.5, opacity), blend: 'lighter' }, parent);
  return name;
}

/** Half of the L3 halo band around the crystal (back half before the core, front half after it). */
function haloHalf(b: SpriteBuilder, name: string, side: 1 | -1): string {
  b.path(name, [...halfArc(0, 7, 27, 9, side), ...halfArcBack(0, 7, 20, 5, side)], { closed: true, fill: vgrad(PALETTE.gold), stroke: ink(2) }, 'crystal');
  return name;
}

const bob = (y: number, amp: number) =>
  [[0, y, 'EaseOutSine'], [0.5, y - amp, 'EaseInOutSine'], [1.5, y + amp, 'EaseInSine'], [2, y]] as const;

export const FROST_ART: TowerArt = {
  iconFrame: { x: 0, y: -34, size: 100 },
  draw(b: SpriteBuilder, parent: string): TowerParts {
    const stone = PALETTE.stone;
    const ice = PALETTE.ice;
    contactShadow(b, parent, 66, 18, 6);
    b.path('base', frustum(BASE.rxTop, BASE.rxBottom, BASE.ry, BASE.top, BASE.bottom), { closed: true, fill: roundGrad(stone), stroke: ink(3) }, parent);
    const midY = -10;
    const midRy = (BASE.ry * baseRx(midY)) / BASE.rxBottom;
    b.path(
      'bricks',
      [
        ...halfArc(0, midY, baseRx(midY), midRy, 1, true),
        ...[60, 120].flatMap((a) => seg(onEllipse(0, BASE.top + 1, BASE.rxTop + 1, RY_TOP, a), onEllipse(0, midY, baseRx(midY), midRy, a))),
        ...[35, 90, 145].flatMap((a) => seg(onEllipse(0, midY, baseRx(midY), midRy, a), onEllipse(0, BASE.bottom, BASE.rxBottom, BASE.ry, a))),
      ],
      { stroke: line(mix(stone.dark, OUTLINE, 0.15), 2) },
      parent,
    );
    b.path('baseShine', [{ x: -17, y: -19 }, { x: -12.5, y: -18 }, { x: -14.5, y: 6 }, { x: -19.5, y: 4 }], { closed: true, fill: SHINE }, parent);
    const t2 = [...ring(b, parent, 'ring2', 28, false), runes(b, parent, 'runes2', 0.75)];
    const t3 = [...ring(b, parent, 'ring3', 32, true), runes(b, parent, 'runes3', 1)];

    b.ellipse('top', BASE.rxTop * 2, RY_TOP * 2, { y: BASE.top, fill: linear([[0, mix(stone.light, '#ffffff', 0.2)], [1, stone.light]]), stroke: ink(3) }, parent);
    b.ellipse('topGold', BASE.rxTop * 2 - 5, RY_TOP * 2 - 3.5, { y: BASE.top, stroke: line(PALETTE.gold.light, 2.5) }, parent);
    t3.push('topGold');
    b.ellipse('pool', 27, 8, { y: BASE.top, fill: linear([[0, ice.dark], [1, ice.light]]), stroke: ink(2) }, parent);
    b.path(
      'icicles',
      [62, 90, 118].flatMap((a) => {
        const p = onEllipse(0, BASE.top, BASE.rxTop, RY_TOP, a);
        return closed([
          { x: p.x - 3.5, y: p.y - 1, moveTo: true },
          { x: p.x + 3.5, y: p.y - 1 },
          { x: p.x, y: p.y + (a === 90 ? 10 : 7.5) },
        ]);
      }),
      { fill: vgrad(ice), stroke: ink(2) },
      parent,
    );
    b.ellipse('poolGlow', 34, 13, { y: BASE.top - 1, fill: radial([[0, ice.light, 0.7], [1, ice.dark, 0]]), blend: 'lighter' }, parent);

    const sides: Record<string, ReturnType<typeof bob>> = {};
    const side = (name: string, x: number, size: number, phase: 1 | -1) => {
      b.path(name, kite(0, 0, size * 0.55, size, size), { x, y: SIDE_Y, closed: true, fill: iceFill(ice), stroke: ink(2.5) }, parent);
      sides[name] = bob(SIDE_Y, phase * 2.5);
      return name;
    };
    t2.push(side('side2L', -26, 9, -1), side('side2R', 26, 9, 1));
    t3.push(side('side3L', -28, 11, -1), side('side3R', 28, 11, 1));

    b.group('crystal', { y: CRYSTAL_Y }, parent);
    b.group('glow', {}, 'crystal');
    b.circle('glowOuter', 26, { fill: radial([[0, ice.dark, 0.55], [1, ice.dark, 0]]), blend: 'lighter' }, 'glow');
    b.circle('glowInner', 15, { fill: radial([[0, '#ffffff', 0.6], [1, ice.light, 0]]), blend: 'lighter' }, 'glow');
    t3.push(haloHalf(b, 'haloBack', -1));
    // One glowing core per level: a core covered by a bigger one would still pay for its glow.
    const t1 = core(b, 'core', CORE);
    t2.push(...core(b, 'core2', CORE));
    t3.push(...core(b, 'core3', CORE3));
    t3.push(haloHalf(b, 'haloFront', 1));
    b.circle('flare', 19, { opacity: 0, fill: radial([[0, '#ffffff', 1], [0.5, ice.light, 0.7], [1, ice.light, 0]]), blend: 'lighter' }, 'crystal');

    const sideTracks = Object.fromEntries(Object.entries(sides).map(([name, keys]) => [name, { y: keys }]));
    b.clip('idle', 2, {
      crystal: { y: bob(CRYSTAL_Y, 3) },
      glow: {
        opacity: [[0, 0.75, 'EaseInOutSine'], [1, 1, 'EaseInOutSine'], [2, 0.75]],
        scale_x: [[0, 0.94, 'EaseInOutSine'], [1, 1.08, 'EaseInOutSine'], [2, 0.94]],
        scale_y: [[0, 0.94, 'EaseInOutSine'], [1, 1.08, 'EaseInOutSine'], [2, 0.94]],
      },
      ...sideTracks,
    });
    b.clip('fire', 0.25, {
      crystal: {
        scale_x: [[0, 1, 'EaseOutQuad'], [0.07, 1.1, 'EaseInOutSine'], [0.25, 1]],
        scale_y: [[0, 1, 'EaseOutQuad'], [0.07, 1.1, 'EaseInOutSine'], [0.25, 1]],
      },
      flare: {
        opacity: [[0, 0], [0.05, 0.95, 'EaseOutQuad'], [0.25, 0]],
        scale_x: [[0, 1], [0.05, 1.2, 'EaseOutQuad'], [0.24, 1.5], [0.25, 1]],
        scale_y: [[0, 1], [0.05, 1.2, 'EaseOutQuad'], [0.24, 1.5], [0.25, 1]],
      },
    });
    const tip = (size: typeof CORE) => ({ x: 0, y: CRYSTAL_Y - size.up });
    return {
      tiers: levels(t1, t2, t3),
      aimPart: null,
      facePart: null,
      aimPivot: { x: 0, y: CRYSTAL_Y },
      muzzle: levels(tip(CORE), tip(CORE), tip(CORE3)),
    };
  },
};
