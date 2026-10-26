/** Shield Orc: an olive orc in a helmet behind a big round wooden shield with an iron rim. */
import type { PathPoint } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { blobsPath, bobKeys, BONE, ellipsePoints, EYE, HIGHLIGHT, leg, LEATHER, DARK_LEATHER, legTracks, limb, LINE, loopKeys, poly, shade, walkStride, type EnemyDesign } from './kit';

const LEG_LENGTH = 11;
const SWING = 22;

/** Dome, brim and nose guard. */
function helmet(): PathPoint[] {
  return [
    { x: -9, y: -29, moveTo: true, outX: -9, outY: -34 },
    { x: 0, y: -38, inX: -5, inY: -38, outX: 5, outY: -38 },
    { x: 9, y: -29, inX: 9, inY: -34, outX: 9, outY: -29 },
    { x: -9, y: -29, inX: -9, inY: -29, close: true },
    ...limb(-9.5, -29, 9.5, -29, 3.5),
    ...limb(5, -30, 5.5, -25, 2.5),
  ];
}

export const SHIELD: EnemyDesign = {
  kind: 'shield',
  height: 38,
  barWidth: 32,
  stride: walkStride(LEG_LENGTH, SWING),
  shadow: { width: 30, height: 9, opacity: 0.3 },
  bodyY: 0,
  die: 'topple',
  draw(b) {
    const boot = [...limb(0, 0, 0, 7, 6), ...ellipsePoints({ x: 1.8, y: 9, rx: 4.2, ry: 2.3 })];
    leg(b, 'leg-back', -3, -LEG_LENGTH, boot, shade(DARK_LEATHER));
    leg(b, 'leg-front', 3, -LEG_LENGTH, boot, shade(LEATHER));
    b.group('bob', {}, 'body');
    b.ellipse('torso', 19, 16, { x: -2, y: -18, fill: shade(PALETTE.orc), stroke: LINE }, 'bob');
    b.circle('head', 8, { y: -28, fill: shade(PALETTE.orc), stroke: LINE }, 'bob');
    b.path('eyes', blobsPath([{ x: 2.6, y: -25.3, rx: 1.8, ry: 1.7 }, { x: 7.2, y: -25.5, rx: 1.4, ry: 1.6 }]), { closed: true, fill: EYE, stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.path('tusks', [...poly([[1.5, -20.5], [3.7, -20.5], [2.4, -23.5]]), ...poly([[5.5, -21], [7.7, -21], [7.1, -24]])], { closed: true, fill: shade(BONE), stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.path('helmet', helmet(), { closed: true, fill: shade(PALETTE.metal), stroke: LINE }, 'bob');
    b.group('shield', { x: 9, y: -13 }, 'bob');
    b.circle('rim', 11.5, { fill: shade(PALETTE.metal), stroke: LINE }, 'shield');
    b.circle('wood', 8.5, { fill: shade(PALETTE.wood), stroke: LINE }, 'shield');
    b.path(
      'planks',
      [
        { x: -3, y: -7.5, moveTo: true },
        { x: -3, y: 7.5 },
        { x: 3, y: -7.5, moveTo: true },
        { x: 3, y: 7.5 },
      ],
      { stroke: { color: PALETTE.wood.dark, width: 1.5 } },
      'shield',
    );
    b.circle('boss', 3, { fill: shade(PALETTE.metal), stroke: LINE }, 'shield');
    b.path('shine', blobsPath([{ x: -5, y: -7, rx: 3.5, ry: 1.6 }, { x: -9, y: -16, rx: 2.5, ry: 1.4 }]), { closed: true, fill: HIGHLIGHT }, 'shield');
  },
  overlayParent: 'bob',
  silhouette: [
    { x: 0, y: -29, rx: 9, ry: 9 },
    { x: -2, y: -18, rx: 9.5, ry: 8 },
    { x: 9, y: -13, rx: 11.5, ry: 11.5 },
  ],
  bubble: { x: 2, y: -19, rx: 22, ry: 23 },
  walk: (d) => ({
    ...legTracks(d, SWING, 2, -LEG_LENGTH, 'leg-back', 'leg-front'),
    bob: { y: bobKeys(d, 0, 1.5) },
    shield: { rotation: loopKeys(d, [-3, 3]) },
  }),
  icon: { scale: 0.88, centerX: 4, centerY: -17 },
};
