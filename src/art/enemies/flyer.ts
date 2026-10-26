/** Bat: a purple bat creature with big wings, hovering above its ground shadow. */
import type { SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { blobsPath, DARK_LEATHER, EYE, HIGHLIGHT, limb, LINE, loopKeys, poly, shade, type EnemyDesign } from './kit';

const HOVER = -40;
const FLAP = 35;
const WING = { light: '#7d5fb3', dark: '#341f5c' };

/** One wing pointing left from its shoulder; the front wing is the same group mirrored. */
function wing(b: SpriteBuilder, name: string, x: number, flipX: boolean): void {
  b.group(name, { x, y: -1, flipX }, 'hover');
  b.path(
    `${name}-art`,
    poly([[1, -4], [-9, -10], [-24, -11], [-22, -2], [-17, -4], [-13, 3], [-8, 0], [-3, 5], [1, 4]]),
    { closed: true, fill: shade(WING), stroke: LINE },
    name,
  );
  b.path(
    `${name}-bones`,
    [
      { x: -1, y: -3, moveTo: true },
      { x: -22, y: -9 },
      { x: -2, y: -1, moveTo: true },
      { x: -16, y: -3 },
      { x: -2, y: 0, moveTo: true },
      { x: -8, y: 0 },
    ],
    { stroke: { color: OUTLINE, width: 1.5, opacity: 0.7 } },
    name,
  );
}

export const FLYER: EnemyDesign = {
  kind: 'flyer',
  height: 56,
  barWidth: 28,
  stride: 24,
  shadow: { width: 20, height: 6, opacity: 0.18 },
  bodyY: HOVER,
  die: 'drop',
  draw(b) {
    b.group('hover', {}, 'body');
    wing(b, 'wing-back', -4, false);
    wing(b, 'wing-front', 4, true);
    b.path('ears', [...limb(-4, -6, -7.5, -14.5, 6, 0.6), ...limb(4, -6, 7.5, -14.5, 6, 0.6)], { closed: true, fill: shade(PALETTE.bat), stroke: LINE }, 'hover');
    b.path('feet', [...limb(-3, 7, -3.5, 11.5, 2.5, 1.5), ...limb(3, 7, 3.5, 11.5, 2.5, 1.5)], { closed: true, fill: shade(DARK_LEATHER), stroke: { color: OUTLINE, width: 1.5 } }, 'hover');
    b.ellipse('torso', 19, 19, { fill: shade(PALETTE.bat), stroke: LINE }, 'hover');
    b.ellipse('belly', 10, 10, { x: 1.5, y: 3.5, fill: shade({ light: '#d4c2f5', dark: '#9478cf' }) }, 'hover');
    b.path('eyes', blobsPath([{ x: 0.5, y: -2.5, rx: 2.4, ry: 2.6 }, { x: 5.5, y: -2.5, rx: 2.2, ry: 2.5 }]), { closed: true, fill: EYE, stroke: { color: OUTLINE, width: 1.5 } }, 'hover');
    b.path('pupils', blobsPath([{ x: 1.3, y: -2.3, rx: 0.9, ry: 1.8 }, { x: 6.2, y: -2.3, rx: 0.9, ry: 1.7 }]), { closed: true, fill: OUTLINE }, 'hover');
    b.path('fangs', [...poly([[1.5, 3], [3.5, 3], [2.5, 6]]), ...poly([[5, 3], [7, 3], [6, 6]])], { closed: true, fill: '#ffffff', stroke: { color: OUTLINE, width: 1 } }, 'hover');
    b.path('shine', blobsPath([{ x: -4, y: -5, rx: 3, ry: 2.2 }]), { closed: true, fill: HIGHLIGHT }, 'hover');
  },
  overlayParent: 'hover',
  silhouette: [
    { x: 0, y: 0, rx: 10, ry: 10 },
    { x: -5.8, y: -10, rx: 2.6, ry: 4 },
    { x: 5.8, y: -10, rx: 2.6, ry: 4 },
  ],
  walk: (d) => ({
    'wing-back': { rotation: loopKeys(d, [FLAP, -FLAP]) },
    'wing-front': { rotation: loopKeys(d, [-FLAP, FLAP]) },
    hover: { y: loopKeys(d, [2, -2]) },
  }),
  icon: { scale: 0.64, centerX: 0, centerY: -27 },
};
