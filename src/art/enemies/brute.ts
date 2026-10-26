/** Troll: a big blue-grey troll with metal armor plates and a huge club dragged along. */
import { OUTLINE, PALETTE } from '../palette';
import { blobsPath, bobKeys, BONE, ellipsePoints, EYE, HIGHLIGHT, IRON, leg, LEATHER, legTracks, limb, LINE, loopKeys, poly, shade, THICK, walkStride, type EnemyDesign } from './kit';

const LEG_LENGTH = 15.5;
const SWING = 20;
const HIP_Y = -15;
const TROLL_SHADE = { light: '#6d8e9e', dark: '#283c47' };

export const BRUTE: EnemyDesign = {
  kind: 'brute',
  height: 54,
  barWidth: 40,
  stride: walkStride(LEG_LENGTH, SWING),
  shadow: { width: 46, height: 13, opacity: 0.32 },
  bodyY: 0,
  die: 'topple',
  draw(b) {
    const foot = [...limb(0, 0, 0, 10, 10, 9), ...ellipsePoints({ x: 2.5, y: 12, rx: 7, ry: 3.8 })];
    leg(b, 'leg-back', -5, HIP_Y, foot, shade(TROLL_SHADE));
    leg(b, 'leg-front', 5, HIP_Y, foot, shade(PALETTE.troll));
    b.group('bob', {}, 'body');
    b.group('arm-back', { x: -11, y: -35 }, 'bob');
    b.path('arm-back-art', [...limb(0, 0, -3, 13, 9, 10), ...ellipsePoints({ x: -3, y: 16, rx: 5.5, ry: 5 })], { closed: true, fill: shade(TROLL_SHADE), stroke: LINE }, 'arm-back');
    b.ellipse('belly', 34, 30, { y: -28, fill: shade(PALETTE.troll), stroke: THICK }, 'bob');
    b.path('plate', poly([[-13, -40], [8, -43], [15, -31], [-11, -27]]), { closed: true, fill: shade(IRON), stroke: LINE }, 'bob');
    b.path('rivets', blobsPath([{ x: -9.5, y: -38, rx: 1.3, ry: 1.3 }, { x: 6.5, y: -40.5, rx: 1.3, ry: 1.3 }, { x: -8, y: -29.5, rx: 1.3, ry: 1.3 }]), { closed: true, fill: OUTLINE }, 'bob');
    b.rect('belt', 33, 5, { y: -17, radius: 2, fill: shade(LEATHER), stroke: LINE }, 'bob');
    b.circle('head', 10, { x: 9, y: -44, fill: shade(PALETTE.troll), stroke: THICK }, 'bob');
    b.ellipse('nose', 8, 7, { x: 18.5, y: -42.5, fill: shade(PALETTE.troll), stroke: LINE }, 'bob');
    b.path('eyes', blobsPath([{ x: 10.5, y: -46, rx: 1.9, ry: 1.9 }, { x: 15, y: -46.4, rx: 1.6, ry: 1.8 }]), { closed: true, fill: EYE, stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.path('tusks', [...poly([[10, -37.5], [12.8, -37.5], [11.2, -42]]), ...poly([[14.5, -38], [17.2, -38], [16.2, -42.5]])], { closed: true, fill: shade(BONE), stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.group('arm', { x: 5, y: -33 }, 'bob');
    b.path('club', limb(7, 13, 21, 27, 5, 14), { closed: true, fill: shade(PALETTE.wood), stroke: THICK }, 'arm');
    b.path('studs', blobsPath([{ x: 17, y: 20.5, rx: 1.6, ry: 1.6 }, { x: 22, y: 25, rx: 1.6, ry: 1.6 }, { x: 18, y: 27, rx: 1.6, ry: 1.6 }]), { closed: true, fill: shade(PALETTE.metal), stroke: { color: OUTLINE, width: 1 } }, 'arm');
    b.path('arm-art', [...limb(0, 0, 6, 12, 9, 10), ...ellipsePoints({ x: 7, y: 14, rx: 5.5, ry: 5 })], { closed: true, fill: shade(PALETTE.troll), stroke: LINE }, 'arm');
    b.ellipse('pauldron', 16, 11, { x: 4, y: -35, fill: shade(IRON), stroke: LINE }, 'bob');
    b.path('shine', blobsPath([{ x: -8, y: -36, rx: 5, ry: 2.5 }, { x: 5, y: -50, rx: 3, ry: 2 }, { x: 1.5, y: -37.5, rx: 3, ry: 1.3 }]), { closed: true, fill: HIGHLIGHT }, 'bob');
  },
  overlayParent: 'bob',
  silhouette: [
    { x: 0, y: -28, rx: 17, ry: 15 },
    { x: 9, y: -44, rx: 10, ry: 10 },
    { x: 18.5, y: -42.5, rx: 4, ry: 3.5 },
  ],
  walk: (d) => ({
    ...legTracks(d, SWING, 3, HIP_Y, 'leg-back', 'leg-front'),
    bob: { y: bobKeys(d, 0, 4) },
    arm: { rotation: loopKeys(d, [-6, 6]) },
    'arm-back': { rotation: loopKeys(d, [10, -10]) },
  }),
  icon: { scale: 0.62, centerX: 6, centerY: -25 },
};
