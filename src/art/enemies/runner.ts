/** Runner: a lean goblin scout leaning into the run, red bandana and a dagger. */
import type { PathPoint } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { blobsPath, bobKeys, DARK_LEATHER, ellipsePoints, EYE, HIGHLIGHT, leg, legTracks, limb, LINE, loopKeys, shade, walkStride, type EnemyDesign } from './kit';

const LEG_LENGTH = 8;
const SWING = 34;
const HIP_Y = -8;
const LEAN = 14;
/** Head center in the leaning torso's space (hip at the origin). */
const HX = 2;
const HY = -11;

function bandana(): PathPoint[] {
  const r = 7.4;
  return [
    { x: HX - r, y: HY - 1.5, moveTo: true, outX: HX - r, outY: HY - 6 },
    { x: HX, y: HY - r - 0.3, inX: HX - 4.2, inY: HY - r - 0.3, outX: HX + 4.2, outY: HY - r - 0.3 },
    { x: HX + r, y: HY - 2.5, inX: HX + r, inY: HY - 6.5, outX: HX + r, outY: HY - 2.5 },
    { x: HX - r, y: HY - 1.5, inX: HX - r, inY: HY - 1.5, close: true },
    ...limb(HX - 6, HY - 3, HX - 13, HY - 2, 3.5, 2.5),
    ...limb(HX - 6, HY - 2, HX - 11.5, HY + 2.5, 3.5, 2.5),
  ];
}

export const RUNNER: EnemyDesign = {
  kind: 'runner',
  height: 26,
  barWidth: 26,
  stride: walkStride(LEG_LENGTH, SWING),
  shadow: { width: 22, height: 7, opacity: 0.3 },
  bodyY: 0,
  die: 'topple',
  draw(b) {
    const boot = [...limb(0, 0, 0, 5, 4), ...ellipsePoints({ x: 1.2, y: 6.3, rx: 3, ry: 1.8 })];
    leg(b, 'leg-back', -1.5, HIP_Y, boot, shade(DARK_LEATHER));
    leg(b, 'leg-front', 1.5, HIP_Y, boot, shade({ light: '#6b4a2e', dark: '#33200f' }));
    b.group('bob', { y: HIP_Y, rotation: LEAN }, 'body');
    b.group('arm-back', { x: -1, y: -6 }, 'bob');
    b.path('arm-back-art', limb(0, 0, -2, 5, 3.5), { closed: true, fill: shade({ light: '#6fae3c', dark: '#2f5e16' }), stroke: LINE }, 'arm-back');
    b.path('ears', [...limb(HX - 4, HY - 1, HX - 12.5, HY - 4, 5, 1.2), ...limb(HX + 4, HY - 4, HX + 7.5, HY - 9, 4, 1.2)], { closed: true, fill: shade(PALETTE.goblin), stroke: LINE }, 'bob');
    b.path('vest', limb(0, 0, 1, -7, 8, 9.5), { closed: true, fill: shade(DARK_LEATHER), stroke: LINE }, 'bob');
    b.circle('head', 6.8, { x: HX, y: HY, fill: shade(PALETTE.goblin), stroke: LINE }, 'bob');
    b.path('nose', limb(HX + 5.5, HY + 0.5, HX + 10, HY + 2.5, 4, 2), { closed: true, fill: shade(PALETTE.goblin), stroke: LINE }, 'bob');
    b.path('eyes', blobsPath([{ x: HX + 2.4, y: HY - 0.2, rx: 2, ry: 2.1 }, { x: HX + 6, y: HY - 0.5, rx: 1.5, ry: 1.9 }]), { closed: true, fill: EYE, stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.path('pupils', blobsPath([{ x: HX + 3.2, y: HY, rx: 1, ry: 1.1 }, { x: HX + 6.5, y: HY - 0.3, rx: 0.9, ry: 1 }]), { closed: true, fill: OUTLINE }, 'bob');
    b.path('bandana', bandana(), { closed: true, fill: shade(PALETTE.red), stroke: LINE }, 'bob');
    b.path('shine', blobsPath([{ x: HX - 2.5, y: HY - 5.2, rx: 2.8, ry: 1.4 }]), { closed: true, fill: HIGHLIGHT }, 'bob');
    b.group('arm', { x: 2, y: -6 }, 'bob');
    b.path('dagger', limb(4.5, 3, 12, 0.5, 3.2, 0.6), { closed: true, fill: shade(PALETTE.metal), stroke: LINE }, 'arm');
    b.path('hand', limb(0, 0, 4.5, 3, 3.5), { closed: true, fill: shade(PALETTE.goblin), stroke: LINE }, 'arm');
  },
  overlayParent: 'bob',
  silhouette: [
    { x: HX, y: HY, rx: 7, ry: 7 },
    { x: 0.5, y: -3.5, rx: 4.8, ry: 4.5 },
    { x: HX - 8.5, y: HY - 2.5, rx: 3.5, ry: 2 },
  ],
  walk: (d) => ({
    ...legTracks(d, SWING, 2.5, HIP_Y, 'leg-back', 'leg-front'),
    bob: { y: bobKeys(d, HIP_Y, 2) },
    arm: { rotation: loopKeys(d, [-22, 18]) },
    'arm-back': { rotation: loopKeys(d, [25, -25]) },
  }),
  icon: { scale: 1.15, centerX: 1, centerY: -12 },
};
