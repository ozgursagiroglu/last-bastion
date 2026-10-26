/** Orc Warlord: a large orc in red armor with a horned helmet, a cape and a big axe. */
import type { PathPoint } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { blobsPath, bobKeys, BONE, ellipsePoints, EYE, HIGHLIGHT, IRON, leg, legTracks, limb, LINE, loopKeys, poly, shade, THICK, walkStride, DARK_LEATHER, type EnemyDesign } from './kit';

const LEG_LENGTH = 22.5;
const SWING = 18;
const HIP_Y = -22;
const CAPE = { light: '#8a2433', dark: '#3a0b14' };

function helmet(): PathPoint[] {
  return [
    { x: -7, y: -62, moveTo: true, outX: -7, outY: -69 },
    { x: 5, y: -74, inX: -2, inY: -74, outX: 12, outY: -74 },
    { x: 17, y: -62, inX: 17, inY: -69, outX: 17, outY: -62 },
    { x: -7, y: -62, inX: -7, inY: -62, close: true },
    ...limb(-8, -62, 18, -62, 4.5),
  ];
}

/** Horns and tusks share the bone fill. */
function bone(): PathPoint[] {
  return [
    ...limb(-3, -69, -13, -79, 6, 1),
    ...limb(13, -69, 22, -79, 6, 1),
    ...poly([[9, -53], [11.6, -53], [10.4, -57.5]]),
    ...poly([[14, -53.5], [16.6, -53.5], [16, -58]]),
  ];
}

function blade(): PathPoint[] {
  return [
    { x: 9, y: -13, moveTo: true, outX: 13, outY: -16 },
    { x: 21, y: -22, inX: 17, inY: -21, outX: 27, outY: -14 },
    { x: 21, y: 8, inX: 27, inY: 0, outX: 17, outY: 6 },
    { x: 9, y: -1, inX: 13, inY: 0, close: true },
  ];
}

export const BOSS: EnemyDesign = {
  kind: 'boss',
  height: 80,
  barWidth: 64,
  stride: walkStride(LEG_LENGTH, SWING),
  shadow: { width: 58, height: 16, opacity: 0.32 },
  bodyY: 0,
  die: 'topple',
  draw(b) {
    const boot = [...limb(0, 0, 0, 15, 12, 11), ...ellipsePoints({ x: 3, y: 18.5, rx: 8, ry: 4.2 })];
    leg(b, 'leg-back', -6, HIP_Y, boot, shade({ light: '#5f6a76', dark: '#1f262e' }));
    leg(b, 'leg-front', 6, HIP_Y, boot, shade(IRON));
    b.group('bob', {}, 'body');
    b.group('cape', { x: -5, y: -54 }, 'bob');
    b.path('cape-art', poly([[-5, 0], [7, 0], [4, 38], [-4, 44], [-12, 40], [-20, 45], [-17, 22]]), { closed: true, fill: shade(CAPE), stroke: LINE }, 'cape');
    b.ellipse('torso', 32, 34, { y: -40, fill: shade(PALETTE.red), stroke: THICK }, 'bob');
    b.ellipse('pauldron', 18, 13, { x: -11, y: -52, rotation: -15, fill: shade(IRON), stroke: THICK }, 'bob');
    b.path('tassets', poly([[-14, -24], [14, -24], [16, -14], [-16, -14]]), { closed: true, fill: shade({ light: '#d84a3c', dark: '#6e1610' }), stroke: LINE }, 'bob');
    b.rect('belt', 31, 6, { y: -25, radius: 2, fill: shade(DARK_LEATHER), stroke: LINE }, 'bob');
    b.path('gold', [...poly([[3, -28.5], [9, -28.5], [9, -21.5], [3, -21.5]]), ...poly([[2, -46], [6, -41], [2, -36], [-2, -41]])], { closed: true, fill: shade(PALETTE.gold), stroke: LINE }, 'bob');
    b.circle('head', 11, { x: 5, y: -61, fill: shade(PALETTE.orc), stroke: THICK }, 'bob');
    b.path('eyes', blobsPath([{ x: 8.5, y: -57.3, rx: 2.2, ry: 2 }, { x: 13.5, y: -57.5, rx: 1.8, ry: 1.8 }]), { closed: true, fill: EYE, stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.path('helmet', helmet(), { closed: true, fill: shade(IRON), stroke: LINE }, 'bob');
    b.path('bone', bone(), { closed: true, fill: shade(BONE), stroke: LINE }, 'bob');
    b.group('arm', { x: 12, y: -47 }, 'bob');
    b.path('haft', limb(5, 30, 9, -12, 3.5), { closed: true, fill: shade(PALETTE.wood), stroke: LINE }, 'arm');
    b.path('blade', blade(), { closed: true, fill: shade(PALETTE.metal), stroke: LINE }, 'arm');
    b.path('arm-art', [...limb(0, 0, 4, 13, 9), ...ellipsePoints({ x: 5, y: 16, rx: 5.5, ry: 5 })], { closed: true, fill: shade(PALETTE.orc), stroke: LINE }, 'arm');
    b.path('shine', blobsPath([{ x: -6, y: -44, rx: 4.5, ry: 3 }, { x: -1, y: -69, rx: 3, ry: 1.8 }, { x: -14, y: -55, rx: 3.5, ry: 1.6 }]), { closed: true, fill: HIGHLIGHT }, 'bob');
  },
  overlayParent: 'bob',
  silhouette: [
    { x: 0, y: -40, rx: 16, ry: 17 },
    { x: 5, y: -63, rx: 12, ry: 11 },
    { x: -11, y: -52, rx: 9, ry: 6.5 },
    { x: 0, y: -19, rx: 16, ry: 5 },
  ],
  walk: (d) => ({
    ...legTracks(d, SWING, 3, HIP_Y, 'leg-back', 'leg-front'),
    bob: { y: bobKeys(d, 0, 3) },
    cape: { rotation: loopKeys(d, [-4, 3]) },
    arm: { rotation: loopKeys(d, [-4, 4]) },
  }),
  icon: { scale: 0.44, centerX: 5, centerY: -37 },
};
