/**
 * The executable form of the TowerSprite contract: shows a level and points the tower, and computes the world muzzle.
 * Used by the galleries here and by the scene adapter.
 */
import type { ExodeUIEngine } from 'exodeui';
import type { TowerLevel, Vec2 } from '../../game/types';
import { setFlipX, setRotation, setVisible } from '../../render/exodeRuntime';
import type { TowerSprite } from '../types';

const LEVELS: readonly TowerLevel[] = [1, 2, 3];

/** True when a face-part tower looks left for this aim (radians). */
export function isMirrored(sprite: TowerSprite, aim: number): boolean {
  return sprite.facePartId !== null && Math.cos(aim) < 0;
}

/** Degrees normalized to (−180, 180]. */
export function normalizeDegrees(deg: number): number {
  const r = ((deg % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

/** Local angle of the aim part in degrees for an aim angle in radians. */
export function aimPartAngle(sprite: TowerSprite, aim: number): number {
  const deg = (aim * 180) / Math.PI;
  return normalizeDegrees(isMirrored(sprite, aim) ? 180 - deg : deg);
}

/** Show the tier parts of `level`, hide the others, and point the tower at `aim` (radians, 0 = +x). */
export function poseTower(engine: ExodeUIEngine, sprite: TowerSprite, level: TowerLevel, aim: number): void {
  for (const l of LEVELS) for (const id of sprite.tierPartIds[l]) setVisible(engine, id, l === level);
  if (sprite.facePartId !== null) setFlipX(engine, sprite.facePartId, isMirrored(sprite, aim));
  if (sprite.aimPartId !== null) setRotation(engine, sprite.aimPartId, aimPartAngle(sprite, aim));
}

/** World muzzle position for a tower whose root sits at `rootPos` (formula in TowerSprite.muzzle docs). */
export function muzzleWorld(sprite: TowerSprite, level: TowerLevel, aim: number, rootPos: Vec2): Vec2 {
  const m = sprite.muzzle[level];
  const mirrored = isMirrored(sprite, aim);
  if (sprite.aimPartId === null) return { x: rootPos.x + (mirrored ? -m.x : m.x), y: rootPos.y + m.y };
  const p = sprite.aimPivot;
  const dx = m.x - p.x;
  const dy = mirrored ? -(m.y - p.y) : m.y - p.y;
  const c = Math.cos(aim);
  const s = Math.sin(aim);
  return {
    x: rootPos.x + (mirrored ? -p.x : p.x) + c * dx - s * dy,
    y: rootPos.y + p.y + s * dx + c * dy,
  };
}
