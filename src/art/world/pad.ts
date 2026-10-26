/** Build pad: a round stone platform in 3/4 view (elliptical top face over a darker front band) with a few tufts. */
import { PAD_RADIUS, type ThemeId } from '../../game/types';
import { linear, ROOT, solid, type PathOpts, type PathPoint, type SpriteBuilder } from '../exode';
import { OUTLINE } from '../palette';
import { CONTACT_SHADOW, outline, rampFill } from './paint';
import { blobPoints, strokePoints } from './shapes';
import { THEMES } from './themes';

/** Vertical squash of the top face (3/4 view). */
const TOP_SQUASH = 0.62;
/** Height of the visible front band under the top face. */
const BAND = 8;

type Tufts = { points: PathPoint[]; opts: PathOpts };

const SPOTS = [
  [-PAD_RADIUS - 4, 2],
  [PAD_RADIUS + 2, -6],
  [-PAD_RADIUS + 4, PAD_RADIUS * TOP_SQUASH + BAND + 4],
] as const;

function grass(color: string): Tufts {
  return {
    points: SPOTS.flatMap(([x, y]) => [
      ...strokePoints([[x - 3, y + 2], [x - 6, y - 5]]),
      ...strokePoints([[x, y + 2], [x, y - 8]]),
      ...strokePoints([[x + 3, y + 2], [x + 6, y - 5]]),
    ]),
    opts: { stroke: { color, width: 2.5 } },
  };
}

/** Theme dressing around a pad: grass, dry grass, snow lumps, glowing cracks. */
function tuftsOf(theme: ThemeId): Tufts {
  switch (theme) {
    case 'meadow':
      return grass('#3f7f2c');
    case 'desert':
      return grass('#a8783f');
    case 'snow':
      return { points: SPOTS.flatMap(([x, y]) => blobPoints(x, y - 2, 8, 3.5, 3)), opts: { fill: '#ffffff', stroke: { color: '#8fb0cc', width: 1.5 } } };
    case 'volcano':
      return {
        points: SPOTS.flatMap(([x, y]) => strokePoints([[x - 7, y + 1], [x - 2, y - 2], [x + 2, y + 2], [x + 7, y - 1]])),
        opts: { stroke: { color: '#ff8a2a', width: 2.5 } },
      };
  }
}

/** Adds the pad for `theme` as group `name` centered at (x, y) and returns the group id. */
export function addPad(b: SpriteBuilder, name: string, x: number, y: number, theme: ThemeId, parent: string = ROOT): string {
  const stone = THEMES[theme].pad;
  const r = PAD_RADIUS;
  const ry = r * TOP_SQUASH;
  const id = b.group(name, { x, y }, parent);
  const p = (s: string) => `${name}.${s}`;
  b.ellipse(p('shadow'), r * 2 + 12, ry * 2 + 10, { x: 3, y: BAND + 2, fill: CONTACT_SHADOW }, name);
  b.ellipse(p('band'), r * 2, ry * 2, { y: BAND, fill: linear([[0, stone.dark], [1, OUTLINE]]), stroke: outline(2.5) }, name);
  b.ellipse(p('top'), r * 2, ry * 2, { fill: rampFill(stone), stroke: outline(2.5) }, name);
  b.ellipse(p('inner'), r * 1.15, ry * 1.15, { y: 1, fill: solid(stone.dark, 0.18), stroke: { color: stone.dark, width: 2, opacity: 0.7 } }, name);
  const seams = [0.35, 1.25, 2.2, 3.1, 4.1, 5.2].flatMap((a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return strokePoints([[c * r * 0.6, s * ry * 0.6 + 1], [c * r * 0.93, s * ry * 0.93]]);
  });
  b.path(p('seams'), seams, { stroke: { color: stone.dark, width: 2, opacity: 0.7 } }, name);
  b.path(p('shine'), [{ x: -r * 0.78, y: -ry * 0.1, outX: -r * 0.7, outY: -ry * 0.75 }, { x: -r * 0.1, y: -ry * 0.82, inX: -r * 0.5, inY: -ry * 0.85 }], { stroke: { color: '#ffffff', width: 3, opacity: 0.35 } }, name);
  const tufts = tuftsOf(theme);
  b.path(p('tufts'), tufts.points, tufts.opts, name);
  return id;
}
