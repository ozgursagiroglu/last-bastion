/**
 * Rocket Launcher: armored platform with a launcher pod that rotates to aim, drawn from above (tubes along local +x,
 * a round hub on the pivot). L1 two tubes; L2 three tubes and armor plates; L3 four tubes, gold stripes and a radar
 * dish that turns in 'idle'.
 */
import { linear, radial, solid, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import {
  IRON,
  OLIVE,
  SHINE,
  box,
  contactShadow,
  ink,
  levels,
  line,
  loop,
  mix,
  seg,
  tubeGrad,
  vgrad,
  type TowerArt,
  type TowerParts,
} from './parts';

const PIVOT = { x: 0, y: -22 };
const TUBE = { from: -12, to: 18, pitch: 8, width: 7.5 };
/** Nose tip distance from the pivot along the launcher. */
const MUZZLE = 25;

/** One launcher pod with `n` tubes (L2 adds side armor, L3 gold stripes), in its own group under 'kick'. */
function pod(b: SpriteBuilder, level: 1 | 2 | 3): string {
  const n = level + 1;
  const g = `pod${level}`;
  b.group(g, {}, 'kick');
  const ys = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * TUBE.pitch);
  const half = (n * TUBE.pitch) / 2;
  b.path(`noses${level}`, ys.flatMap((y) => loop(TUBE.to + 1, y, 5, 3, 0.6)), { fill: vgrad(PALETTE.red), stroke: ink(2) }, g);
  b.path(`tubes${level}`, ys.flatMap((y) => box(TUBE.from, y - TUBE.width / 2, TUBE.to - TUBE.from, TUBE.width)), { fill: tubeGrad(PALETTE.metal), stroke: ink(2.5) }, g);
  b.path(`tubeShine${level}`, ys.flatMap((y) => seg({ x: 6, y: y - 1.6 }, { x: 15, y: y - 1.6 })), { stroke: line('#ffffff', 2, 0.45) }, g);
  b.rect(`box${level}`, 19, half * 2 + 4, { x: -5, radius: 3, fill: vgrad(OLIVE), stroke: ink(2.5) }, g);
  if (level === 2) {
    b.path('armor2', [...box(-15.5, -half - 4, 21, 5), ...box(-15.5, half - 1, 21, 5)], { fill: vgrad(PALETTE.metal), stroke: ink(2) }, g);
  }
  if (level === 3) {
    b.path('stripes3', [...box(-12.5, -half - 1, 3.5, half * 2 + 2), ...box(-0.5, -half - 1, 3.5, half * 2 + 2)], { fill: vgrad(PALETTE.gold), stroke: ink(1.5) }, g);
  }
  return g;
}

export const ROCKET_ART: TowerArt = {
  iconFrame: { x: 0, y: -10, size: 74 },
  draw(b: SpriteBuilder, parent: string): TowerParts {
    contactShadow(b, parent, 70, 20, 5);
    b.path(
      'front',
      [{ x: -28, y: -12 }, { x: 28, y: -12 }, { x: 28, y: 4 }, { x: 23, y: 10 }, { x: -23, y: 10 }, { x: -28, y: 4 }],
      { closed: true, fill: linear([[0, mix(OLIVE.light, OLIVE.dark, 0.45)], [1, mix(OLIVE.dark, OUTLINE, 0.3)]]), stroke: ink(3) },
      parent,
    );
    b.path('rivets', [-21, -7, 7, 21].flatMap((x) => loop(x, 3, 2, 2)), { fill: vgrad(PALETTE.metal), stroke: ink(1.5) }, parent);
    const plates = [...box(-26, -6, 15, 12), ...box(-7.5, -6, 15, 12), ...box(11, -6, 15, 12)];
    b.path('plates2', plates, { fill: vgrad(PALETTE.metal), stroke: ink(2) }, parent);
    b.path('plates3', plates, { fill: vgrad(PALETTE.metal), stroke: ink(2) }, parent);
    b.path('stripes', [-18.5, 0, 18.5].flatMap((x) => box(x - 2, -6, 4, 12)), { fill: vgrad(PALETTE.gold), stroke: ink(1.5) }, parent);
    b.rect('top', 56, 26, { y: -20, radius: 7, fill: vgrad(OLIVE), stroke: ink(3) }, parent);
    b.path('topShine', [{ x: -24, y: -29 }, { x: -8, y: -29 }, { x: -24, y: -19 }], { closed: true, fill: SHINE }, parent);

    b.rect('mast', 4, 18, { x: -24, y: -36, fill: vgrad(IRON), stroke: ink(2) }, parent);
    b.group('dish', { x: -24, y: -47 }, parent);
    b.ellipse('dishBack', 10, 20, { fill: vgrad({ light: PALETTE.metal.dark, dark: IRON.dark }), stroke: ink(2.5) }, 'dish');
    b.ellipse('dishFace', 6, 16, { x: 1.5, fill: linear([[0, '#ffffff'], [1, PALETTE.metal.light]], [0, 0], [1, 1]), stroke: ink(1.5) }, 'dish');
    b.path('horn', [{ x: 1.5, y: 0 }, { x: 8, y: 0 }], { stroke: line(OUTLINE, 2.5) }, 'dish');
    b.circle('hornTip', 2.2, { x: 8.5, fill: PALETTE.red.light, stroke: ink(1.5) }, 'dish');

    b.ellipse('ring', 30, 16, { y: -20, fill: vgrad(IRON), stroke: ink(2.5) }, parent);
    b.group('launcher', { x: PIVOT.x, y: PIVOT.y }, parent);
    b.star('exhaust', 10, 4.5, 7, { x: -21, opacity: 0, fill: solid(PALETTE.fire.light), stroke: line(PALETTE.fire.dark, 2) }, 'launcher');
    b.circle('exhaustGlow', 13, { x: -21, opacity: 0, fill: radial([[0, PALETTE.fire.light, 0.9], [1, PALETTE.fire.dark, 0]]), blend: 'lighter' }, 'launcher');
    b.group('kick', {}, 'launcher');
    const pod1 = pod(b, 1);
    const pod2 = pod(b, 2);
    const pod3 = pod(b, 3);
    b.circle('hub', 6, { fill: radial([[0, PALETTE.metal.light], [1, IRON.dark]], [0.5, 0.5], 0.5), stroke: ink(2.5) }, 'kick');

    // scale_x never reaches 0: a degenerate scale makes the engine draw a stray line across the canvas.
    b.clip('idle', 3, { dish: { scale_x: [[0, 1, 'EaseInOutSine'], [1.5, 0.2, 'EaseInOutSine'], [3, 1]] } });
    b.clip('fire', 0.25, {
      kick: { x: [[0, 0, 'EaseOutQuad'], [0.04, -4, 'EaseInOutSine'], [0.25, 0]] },
      exhaust: {
        opacity: [[0, 0], [0.03, 1], [0.14, 0]],
        scale_x: [[0, 1], [0.03, 1.3, 'EaseOutQuad'], [0.14, 0.8], [0.25, 1]],
        scale_y: [[0, 1], [0.03, 1.3, 'EaseOutQuad'], [0.14, 0.8], [0.25, 1]],
      },
      exhaustGlow: { opacity: [[0, 0], [0.03, 0.9], [0.18, 0]] },
    });
    const muzzle = { x: PIVOT.x + MUZZLE, y: PIVOT.y };
    return {
      tiers: levels([pod1], [pod2, 'plates2'], [pod3, 'plates3', 'stripes', 'mast', 'dish']),
      aimPart: 'launcher',
      facePart: null,
      aimPivot: { ...PIVOT },
      muzzle: levels({ ...muzzle }, { ...muzzle }, { ...muzzle }),
    };
  },
};
