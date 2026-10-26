/**
 * Tesla Coil: riveted metal base, a stacked copper coil on a column, an energy sphere in layered additive glows.
 * No aim, no face. L2 two side coils with spark points; L3 taller gold-capped side coils, gold trim, a larger sphere
 * and static arcs from the sphere to the spark points.
 */
import { linear, radial, type SpriteBuilder } from '../exode';
import { PALETTE } from '../palette';
import { outerGlow } from '../world/effects';
import {
  COPPER,
  IRON,
  ballGrad,
  box,
  contactShadow,
  frustum,
  halfArc,
  ink,
  levels,
  line,
  loop,
  onEllipse,
  roundGrad,
  seg,
  vgrad,
  type TowerArt,
  type TowerParts,
} from './parts';

const SPHERE = { x: 0, y: -64 };
const BASE = { rxTop: 21, rxBottom: 25, ry: 8, top: -10, bottom: 3 };
const POST_X = 17;

const energyBall = () => radial([[0, '#ffffff'], [0.35, PALETTE.energy.light], [1, PALETTE.energy.dark]], [0.38, 0.32], 0.72);

/** Side coils: rods, copper rings, spark tips and their glow (L3 adds gold caps). */
function posts(b: SpriteBuilder, parent: string, tier: 2 | 3): string[] {
  const top = tier === 2 ? -30 : -38;
  const rings = tier === 2 ? [-15, -22] : [-15, -22, -29];
  const tipY = top - 3.5;
  const xs = [-POST_X, POST_X];
  const names = [`rods${tier}`, `rings${tier}`];
  b.path(`rods${tier}`, xs.flatMap((x) => box(x - 2.5, top, 5, -8 - top)), { fill: roundGrad(IRON), stroke: ink(2) }, parent);
  b.path(`rings${tier}`, xs.flatMap((x) => rings.flatMap((y) => loop(x, y, 5.5, 2.6, 0.8))), { fill: roundGrad(COPPER), stroke: ink(2) }, parent);
  if (tier === 3) {
    b.path('caps3', xs.flatMap((x) => loop(x, top, 4.5, 2, 0.8)), { fill: vgrad(PALETTE.gold), stroke: ink(2) }, parent);
    names.push('caps3');
  }
  const r = tier === 2 ? 3.5 : 4;
  b.path(`tipGlow${tier}`, xs.flatMap((x) => loop(x, tipY, r * 2.4, r * 2.4)), { fill: radial([[0, PALETTE.energy.light, 0.7], [1, PALETTE.energy.dark, 0]]), blend: 'lighter' }, parent);
  b.path(`tips${tier}`, xs.flatMap((x) => loop(x, tipY, r, r)), { fill: energyBall(), stroke: ink(2) }, parent);
  names.push(`tipGlow${tier}`, `tips${tier}`);
  return names;
}

/** Zigzag arc from the sphere down to a spark tip (x mirrored by `side`). */
function arc(side: 1 | -1) {
  const pts = [
    { x: 9, y: -59 },
    { x: 14, y: -56 },
    { x: 12, y: -52 },
    { x: 17, y: -49 },
    { x: 16, y: -45 },
  ];
  return pts.map((p) => ({ x: p.x * side, y: p.y }));
}

export const TESLA_ART: TowerArt = {
  iconFrame: { x: 0, y: -36, size: 104 },
  draw(b: SpriteBuilder, parent: string): TowerParts {
    const metal = PALETTE.metal;
    const energy = PALETTE.energy;
    contactShadow(b, parent, 64, 18, 6);
    b.path('base', frustum(BASE.rxTop, BASE.rxBottom, BASE.ry, BASE.top, BASE.bottom), { closed: true, fill: roundGrad(metal), stroke: ink(3) }, parent);
    b.path('goldBand', halfArc(0, -6.5, 22.1, 7.3, 1), { stroke: line(PALETTE.gold.light, 3.5) }, parent);
    b.path(
      'rivets',
      [35, 70, 110, 145].flatMap((a) => {
        const p = onEllipse(0, -0.5, 23.5, 7.6, a);
        return loop(p.x, p.y, 2, 2);
      }),
      { fill: vgrad(metal), stroke: ink(1.5) },
      parent,
    );
    b.ellipse('baseTop', BASE.rxTop * 2, 13.4, { y: BASE.top, fill: linear([[0, '#eef4f8'], [1, metal.light]]), stroke: ink(3) }, parent);
    b.ellipse('plate', 26, 8, { y: BASE.top - 0.5, fill: vgrad(IRON), stroke: ink(2) }, parent);
    const t2 = posts(b, parent, 2);
    const t3 = ['goldBand', ...posts(b, parent, 3)];

    b.rect('column', 9, 42, { y: -33, fill: roundGrad(IRON), stroke: ink(2.5) }, parent);
    const coilRings = [
      { y: -17, rx: 13.5 },
      { y: -24.5, rx: 12.5 },
      { y: -32, rx: 11.5 },
      { y: -39.5, rx: 10.5 },
      { y: -47, rx: 9.5 },
    ];
    b.path('coil', coilRings.flatMap((c) => loop(0, c.y, c.rx, 3.8, 0.8)), { fill: roundGrad(COPPER), stroke: ink(2.5) }, parent);
    b.path('coilShine', coilRings.flatMap((c) => seg({ x: -c.rx + 3, y: c.y - 1 }, { x: -c.rx + 7, y: c.y - 2.2 })), { stroke: line('#ffffff', 2, 0.5) }, parent);
    b.ellipse('collar', 18, 6, { y: -54, fill: vgrad(metal), stroke: ink(2.5) }, parent);
    b.ellipse('collar3', 22, 7.5, { y: -54, fill: vgrad(PALETTE.gold), stroke: ink(2.5) }, parent);
    t3.push('collar3');

    b.group('glow', { x: SPHERE.x, y: SPHERE.y }, parent);
    b.circle('glowOuter', 25, { fill: radial([[0, energy.dark, 0.6], [1, energy.dark, 0]]), blend: 'lighter' }, 'glow');
    b.circle('glowInner', 16, { fill: radial([[0, energy.light, 0.75], [1, energy.light, 0]]), blend: 'lighter' }, 'glow');
    b.path('arcL', arc(-1), { stroke: line(energy.light, 2.5), blend: 'lighter' }, parent);
    b.path('arcR', arc(1), { stroke: line(energy.light, 2.5), blend: 'lighter' }, parent);
    t3.push('arcL', 'arcR');
    // One glowing sphere per level: a sphere covered by a bigger one would still pay for its glow.
    const sphere = (name: string, d: number) => {
      b.circle(name, d, { x: SPHERE.x, y: SPHERE.y, fill: energyBall(), stroke: ink(3), effects: [outerGlow(energy.light, 10)] }, parent);
      return name;
    };
    const t1 = [sphere('sphere', 10.5)];
    t2.push(sphere('sphere2', 10.5));
    t3.push(sphere('sphere3', 13.5));
    b.ellipse('sphereShine', 6, 4, { x: SPHERE.x - 4, y: SPHERE.y - 4.5, rotation: -30, fill: ballGrad({ light: '#ffffff', dark: '#ffffff' }) }, parent);
    b.circle('flare', 15, { x: SPHERE.x, y: SPHERE.y, opacity: 0, fill: radial([[0, '#ffffff', 1], [0.5, energy.light, 0.8], [1, energy.light, 0]]), blend: 'lighter' }, parent);

    const pulse = (lo: number, hi: number) => [[0, lo, 'EaseInOutSine'], [0.6, hi, 'EaseInOutSine'], [1.2, lo]] as const;
    b.clip('idle', 1.2, {
      glow: { opacity: pulse(0.7, 1), scale_x: pulse(0.94, 1.08), scale_y: pulse(0.94, 1.08) },
      tipGlow2: { opacity: pulse(1, 0.55) },
      tipGlow3: { opacity: pulse(1, 0.55) },
      arcL: { opacity: [[0, 1, 'StepEnd'], [0.15, 0, 'StepEnd'], [0.35, 1, 'StepEnd'], [0.5, 0.35, 'StepEnd'], [0.7, 1, 'StepEnd'], [0.95, 0, 'StepEnd'], [1.2, 1]] },
      arcR: { opacity: [[0, 0, 'StepEnd'], [0.2, 1, 'StepEnd'], [0.45, 0, 'StepEnd'], [0.6, 1, 'StepEnd'], [0.85, 0.4, 'StepEnd'], [1, 1, 'StepEnd'], [1.2, 0]] },
    });
    b.clip('fire', 0.2, {
      flare: {
        opacity: [[0, 0], [0.04, 1, 'EaseOutQuad'], [0.2, 0]],
        scale_x: [[0, 1], [0.04, 1.25, 'EaseOutQuad'], [0.19, 1.6], [0.2, 1]],
        scale_y: [[0, 1], [0.04, 1.25, 'EaseOutQuad'], [0.19, 1.6], [0.2, 1]],
      },
    });
    return {
      tiers: levels(t1, t2, t3),
      aimPart: null,
      facePart: null,
      aimPivot: { ...SPHERE },
      muzzle: levels({ ...SPHERE }, { ...SPHERE }, { ...SPHERE }),
    };
  },
};
