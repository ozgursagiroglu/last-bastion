/** Goblin: small green goblin with big ears, a leather tunic and a wooden club. */
import { OUTLINE, PALETTE } from '../palette';
import { blobsPath, bobKeys, DARK_LEATHER, ellipsePoints, EYE, HIGHLIGHT, leg, LEATHER, legTracks, limb, LINE, loopKeys, poly, shade, walkStride, type EnemyDesign } from './kit';

const LEG_LENGTH = 9;
const SWING = 25;

export const GRUNT: EnemyDesign = {
  kind: 'grunt',
  height: 30,
  barWidth: 28,
  stride: walkStride(LEG_LENGTH, SWING),
  shadow: { width: 24, height: 8, opacity: 0.3 },
  bodyY: 0,
  die: 'topple',
  draw(b) {
    const boot = [...limb(0, 0, 0, 6, 5), ...ellipsePoints({ x: 1.5, y: 7, rx: 3.5, ry: 2 })];
    leg(b, 'leg-back', -2.5, -LEG_LENGTH, boot, shade(DARK_LEATHER));
    leg(b, 'leg-front', 2.5, -LEG_LENGTH, boot, shade(LEATHER));
    b.group('bob', {}, 'body');
    b.path('ears', [...limb(-4, -23, -15, -27.5, 6, 1.5), ...limb(6, -25, 11.5, -29, 5, 1.5)], { closed: true, fill: shade(PALETTE.goblin), stroke: LINE }, 'bob');
    b.path('tunic', poly([[-5, -19], [5, -19], [7.5, -8], [-7.5, -8]]), { closed: true, fill: shade(PALETTE.wood), stroke: LINE }, 'bob');
    b.rect('belt', 15, 3, { y: -11, fill: OUTLINE }, 'bob');
    b.circle('head', 8.5, { x: 1, y: -21.5, fill: shade(PALETTE.goblin), stroke: LINE }, 'bob');
    b.path('nose', limb(8, -21.5, 13, -19.5, 4.5, 2.5), { closed: true, fill: shade(PALETTE.goblin), stroke: LINE }, 'bob');
    b.path('eyes', blobsPath([{ x: 2.8, y: -23.5, rx: 2.2, ry: 2.5 }, { x: 7.4, y: -23.8, rx: 1.8, ry: 2.3 }]), { closed: true, fill: EYE, stroke: { color: OUTLINE, width: 1.5 } }, 'bob');
    b.path('pupils', blobsPath([{ x: 3.6, y: -23.3, rx: 1.1, ry: 1.3 }, { x: 8, y: -23.5, rx: 1, ry: 1.2 }]), { closed: true, fill: OUTLINE }, 'bob');
    b.path('shine', blobsPath([{ x: -2.5, y: -26, rx: 3.5, ry: 2 }, { x: -2.5, y: -16, rx: 1.5, ry: 2 }]), { closed: true, fill: HIGHLIGHT }, 'bob');
    b.group('arm', { x: 3, y: -15 }, 'bob');
    b.path('club', limb(2.5, 4.5, 10, -6, 3, 7), { closed: true, fill: shade(PALETTE.wood), stroke: LINE }, 'arm');
    b.path('hand', limb(0, 0, 3, 4, 4.5), { closed: true, fill: shade(PALETTE.goblin), stroke: LINE }, 'arm');
  },
  overlayParent: 'bob',
  silhouette: [
    { x: 1, y: -21.5, rx: 8.5, ry: 8.5 },
    { x: 0, y: -13.5, rx: 7.5, ry: 5.5 },
    { x: -10, y: -25.5, rx: 4.5, ry: 2.5 },
  ],
  walk: (d) => ({
    ...legTracks(d, SWING, 2, -LEG_LENGTH, 'leg-back', 'leg-front'),
    bob: { y: bobKeys(d, 0, 2) },
    arm: { rotation: loopKeys(d, [-12, 10]) },
  }),
  icon: { scale: 1.1, centerX: 1, centerY: -13.5 },
};
