/**
 * Enemy spawn marker standing beside a road where it enters the board: a goblin war banner (meadow, desert) or a horned
 * skull totem (snow, volcano). Origin: the ground point.
 */
import type { ThemeId } from '../../game/types';
import { ROOT, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { CAST_SHADOW, CONTACT_SHADOW, glowFill, outline, rampFill } from './paint';
import { ellipsePoints, polyPoints } from './shapes';

const BONE = { light: '#fffaf0', dark: '#cfc3ab' };

function warBanner(b: SpriteBuilder, name: string): void {
  const p = (s: string) => `${name}.${s}`;
  b.rect(p('pole'), 5, 56, { y: -28, radius: 2, fill: rampFill(PALETTE.wood), stroke: outline(2), shadow: CAST_SHADOW }, name);
  b.triangle(p('spike'), 9, 11, { y: -60, fill: rampFill(PALETTE.metal), stroke: outline(2) }, name);
  b.path(p('cloth'), polyPoints([[2, -52], [26, -50], [24, -40], [28, -30], [20, -31], [16, -24], [10, -30], [2, -28]]), { fill: rampFill(PALETTE.red), stroke: outline(2) }, name);
  b.path(p('skull'), ellipsePoints(14, -41, 5.5, 5), { fill: rampFill(BONE), stroke: outline(1.5) }, name);
  b.path(p('eyes'), [...ellipsePoints(12, -41, 1.6), ...ellipsePoints(16.2, -41, 1.6)], { fill: OUTLINE }, name);
}

function skullTotem(b: SpriteBuilder, name: string): void {
  const p = (s: string) => `${name}.${s}`;
  b.rect(p('pole'), 6, 46, { y: -23, radius: 2, fill: rampFill(PALETTE.wood), stroke: outline(2), shadow: CAST_SHADOW }, name);
  b.path(p('horns'), [
    { x: -6, y: -48, moveTo: true, outX: -16, outY: -48 },
    { x: -15, y: -60, inX: -18, inY: -52 },
    { x: -5, y: -53, close: true },
    { x: 6, y: -48, moveTo: true, outX: 16, outY: -48 },
    { x: 15, y: -60, inX: 18, inY: -52 },
    { x: 5, y: -53, close: true },
  ], { fill: rampFill({ light: '#e8dcc0', dark: '#8a7656' }), stroke: outline(2) }, name);
  b.path(p('skull'), [
    ...ellipsePoints(0, -50, 9, 8.5),
    ...polyPoints([[-5, -45], [5, -45], [4, -39], [-4, -39]]),
  ], { fill: rampFill(BONE), stroke: outline(2) }, name);
  b.circle(p('glow'), 10, { y: -50, fill: glowFill('#ff5a2a', 0.7), blend: 'lighter' }, name);
  b.path(p('eyes'), [...ellipsePoints(-3.3, -50, 2.4), ...ellipsePoints(3.3, -50, 2.4)], { fill: '#ff8a2a', stroke: outline(1.5) }, name);
  b.path(p('streamers'), [
    ...polyPoints([[-4, -38], [-1, -38], [-4, -22], [-7, -25], [-10, -21]]),
    ...polyPoints([[1, -38], [4, -38], [9, -24], [6, -25], [4, -21]]),
  ], { fill: rampFill(PALETTE.red), stroke: outline(1.5) }, name);
}

/** Adds the spawn marker for `theme` as group `name` at (x, y) and returns the group id. */
export function addSpawnMarker(b: SpriteBuilder, name: string, x: number, y: number, theme: ThemeId, parent: string = ROOT): string {
  const id = b.group(name, { x, y }, parent);
  b.ellipse(`${name}.shadow`, 30, 9, { x: 4, y: 1, fill: CONTACT_SHADOW }, name);
  if (theme === 'meadow' || theme === 'desert') warBanner(b, name);
  else skullTotem(b, name);
  return id;
}
