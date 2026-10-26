/**
 * Layout previews of the ten levels, for designing (the real terrain is drawn by src/art/world).
 * `pnpm art:render levels` → out/renders/levels-01.png … levels-10.png
 */
import { linear, makeArtboard, solid, SpriteBuilder, type SpriteInstance } from '../../art/exode';
import type { GalleryEntry } from '../../art/gallery';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PAD_RADIUS, PATH_WIDTH, type LevelDef, type ThemeId, type Vec2 } from '../types';
import { samePoint } from './geometry';
import { LEVELS } from './index';
import { HUD_ZONES } from './validate';

const INK = '#1d140e';
const GROUND: Readonly<Record<ThemeId, { light: string; dark: string; road: string }>> = {
  meadow: { light: '#9ccc6a', dark: '#5f9440', road: '#cfae74' },
  desert: { light: '#f0d89a', dark: '#c99f58', road: '#a97f4a' },
  snow: { light: '#f4f8fb', dark: '#b9cddc', road: '#8ea4b8' },
  volcano: { light: '#6a5650', dark: '#2f2422', road: '#8a6a52' },
};
/** Centerline and label color per road, so shared stretches and separate roads read apart. */
const ROAD_INK = ['#ffffff', '#ffe066', '#7fe0ff'] as const;

const tag = (n: number): string => String(n).padStart(2, '0');

/** Where a road first enters the board, `inset` px further along its first segment. */
function entryPoint(path: readonly Vec2[], inset: number): { at: Vec2; angle: number } | null {
  const [a, b] = path;
  if (!a || !b) return null;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const inside = (t: number) => {
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    return x >= 0 && x <= DESIGN_WIDTH && y >= 0 && y <= DESIGN_HEIGHT;
  };
  let t = 0;
  while (t < 1 && !inside(t)) t += 1 / len;
  t = Math.min(1, t + inset / len);
  return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

export function buildLayoutPreview(level: LevelDef): SpriteInstance {
  const theme = GROUND[level.theme];
  const b = new SpriteBuilder(`levels-${tag(level.id)}`);
  b.rect('ground', DESIGN_WIDTH, DESIGN_HEIGHT, { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2, fill: linear([[0, theme.light], [1, theme.dark]]) });

  level.paths.forEach((path, i) => b.path(`road${i}-edge`, path, { stroke: { color: INK, width: PATH_WIDTH + 6 } }));
  level.paths.forEach((path, i) => b.path(`road${i}-fill`, path, { stroke: { color: theme.road, width: PATH_WIDTH } }));
  level.paths.forEach((path, i) => {
    const ink = ROAD_INK[i % ROAD_INK.length] ?? '#ffffff';
    b.path(`road${i}-center`, path, { stroke: { color: ink, width: 2, dash: [10, 8] } });
    const entry = entryPoint(path, 46);
    if (entry) {
      b.triangle(`road${i}-arrow`, 30, 34, { x: entry.at.x, y: entry.at.y, rotation: entry.angle + 90, fill: ink, stroke: { color: INK, width: 3 } });
    }
    path.forEach((p, k) => {
      if (k === 0) return;
      b.circle(`road${i}-pt${k}`, 4, { x: p.x, y: p.y, fill: ink, stroke: { color: INK, width: 1.5 } });
      b.group(`road${i}-n${k}`, { x: p.x + 14, y: p.y - 14 + i * 22 });
      b.rect(`road${i}-n${k}.badge`, 22, 20, { radius: 5, fill: ink, stroke: { color: INK, width: 2 } }, `road${i}-n${k}`);
      b.text(`road${i}-n${k}.text`, `${k}`, { size: 15, fill: INK }, `road${i}-n${k}`);
    });
  });

  const exits = level.paths.map((p) => p[p.length - 1]).filter((p): p is Vec2 => p !== undefined);
  exits
    .filter((e, i) => exits.findIndex((o) => samePoint(o, e)) === i)
    .forEach((e, i) => b.rect(`exit${i}`, 44, 44, { x: e.x, y: e.y, radius: 4, fill: '#2a56b8', stroke: { color: INK, width: 3 } }));

  level.pads.forEach((pad, i) => {
    b.circle(`pad${i}`, PAD_RADIUS, { x: pad.x, y: pad.y, fill: linear([[0, '#d9d4c8'], [1, '#8a847a']]), stroke: { color: INK, width: 3 } });
    b.text(`pad${i}-n`, `${i}`, { x: pad.x, y: pad.y, size: 24, fill: INK });
  });

  HUD_ZONES.forEach((z, i) =>
    b.rect(`hud${i}`, z.w, z.h, { x: z.x + z.w / 2, y: z.y + z.h / 2, fill: solid('#ff2a2a', 0.3), stroke: { color: '#ff2a2a', width: 2, dash: [8, 6] } }),
  );
  b.text('title', `${level.id}. ${level.name} (${level.theme}, ${level.pads.length} pads, ${level.waves.length} waves)`, {
    x: DESIGN_WIDTH / 2,
    y: 35,
    size: 26,
    fill: '#ffffff',
  });
  return b.build();
}

export const gallery: GalleryEntry[] = LEVELS.map((level) => ({
  name: `levels-${tag(level.id)}`,
  artboard: makeArtboard(`levels-${tag(level.id)}`, buildLayoutPreview(level).objects, { background: GROUND[level.theme].dark }),
}));
