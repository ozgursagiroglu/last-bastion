/** Ground dressing shared by the menu backdrops: soft color patches, grass tufts and a layered road. */
import { PATH_WIDTH, type ThemeId, type Vec2 } from '../../game/types';
import { radial, type PathPoint, type SpriteBuilder } from '../../art/exode';
import type { Rng } from '../../art/world/rng';
import { strokePoints } from '../../art/world/shapes';
import { THEMES } from '../../art/world/themes';

export interface Area {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Soft light and dark blotches (radial fades of the theme's ground ramp) kept inside `area`. */
export function addPatches(b: SpriteBuilder, name: string, theme: ThemeId, area: Area, count: number, rng: Rng): void {
  const { light, dark } = THEMES[theme].ground;
  const maxW = Math.min(260, area.x1 - area.x0);
  for (let i = 0; i < count; i++) {
    const color = i % 2 === 0 ? light : dark;
    const w = rng.range(maxW * 0.5, maxW);
    b.ellipse(`${name}${i}`, w, w * rng.range(0.4, 0.6), {
      x: rng.range(area.x0 + w / 2, area.x1 - w / 2),
      y: rng.range(area.y0, area.y1),
      fill: radial([[0, color, 0.5], [1, color, 0]]),
    });
  }
}

/** Three blades of grass standing on p. */
export function tuftPoints(p: Vec2, size: number): PathPoint[] {
  return [
    ...strokePoints([[p.x - 2, p.y], [p.x - 5 * size, p.y - 6 * size]]),
    ...strokePoints([[p.x, p.y], [p.x + 0.5, p.y - 8 * size]]),
    ...strokePoints([[p.x + 2, p.y], [p.x + 5 * size, p.y - 5 * size]]),
  ];
}

/** A road like the level terrain's: dark lip, edge, fill and a lighter center band along `points`. */
export function addRoad(b: SpriteBuilder, name: string, points: readonly PathPoint[], theme: ThemeId): void {
  const road = THEMES[theme].road;
  b.path(`${name}Lip`, points, { stroke: { color: '#000000', width: PATH_WIDTH + 18, opacity: 0.12 } });
  b.path(`${name}Edge`, points, { stroke: { color: road.edge, width: PATH_WIDTH + 10 } });
  b.path(`${name}Fill`, points, { stroke: { color: road.fill, width: PATH_WIDTH } });
  b.path(`${name}Center`, points, { stroke: { color: road.center, width: PATH_WIDTH - 22, opacity: 0.55 } });
}
