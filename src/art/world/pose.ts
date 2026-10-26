/**
 * The executable form of the projectile and effect contracts: how a pooled instance is posed for a frame. Used by the
 * gallery here and by the scene adapter. Writes engine state only through src/render/exodeRuntime.ts. The adapter
 * still owns the root's visibility and zIndex.
 */
import type { ExodeUIEngine } from 'exodeui';
import type { Vec2 } from '../../game/types';
import { playClip, setPathPoints, setPos, setRotation, setScale, setText } from '../../render/exodeRuntime';
import type { FxSprite, ProjectileSprite } from '../types';
import { lightningPoints } from './fx';

/** `heading` in radians (0 = +x, clockwise on screen); `height` in px above the ground point (cannonball arc). */
export function poseProjectile(engine: ExodeUIEngine, sprite: ProjectileSprite, p: { heading: number; height: number }): void {
  if (sprite.headingPartId) setRotation(engine, sprite.headingPartId, (p.heading * 180) / Math.PI);
  if (sprite.liftPartId) setPos(engine, sprite.liftPartId, 0, -p.height);
}

export interface FxSpec {
  /** Root position (ignored by tracer and lightning, whose roots stay at 0,0). */
  at: Vec2;
  /** explosion / frostBurst: splash radius → root scale radius / baseRadius. */
  radius?: number;
  /** coinPopup / leak */
  text?: string;
  /** tracer: [from, to]; lightning: the chain. */
  points?: readonly Vec2[];
  /** lightning jitter */
  seed?: number;
}

function playOf(fx: FxSprite) {
  const play = fx.clips.play;
  if (!play) throw new Error(`Effect ${fx.rootId} has no 'play' clip`);
  return play;
}

/** Configure a pooled instance for a new effect (position, scale, text, path points) at t = 0. */
export function startFx(engine: ExodeUIEngine, fx: FxSprite, spec: FxSpec): void {
  const usesPaths = fx.pathPartIds.length > 0;
  if (usesPaths) {
    setPos(engine, fx.rootId, 0, 0);
    const chain = spec.points && spec.points.length > 0 ? spec.points : [spec.at];
    const from = chain[0] ?? spec.at;
    const to = chain[chain.length - 1] ?? from;
    const points = fx.kind === 'lightning' ? lightningPoints(chain, spec.seed ?? 0) : [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
    for (const id of fx.pathPartIds) setPathPoints(engine, id, points);
  } else {
    setPos(engine, fx.rootId, spec.at.x, spec.at.y);
  }
  const scale = fx.baseRadius > 0 && spec.radius !== undefined ? spec.radius / fx.baseRadius : 1;
  setScale(engine, fx.rootId, scale);
  if (spec.text !== undefined && fx.textIds.length > 0) setText(engine, fx.textIds, spec.text);
  playClip(engine, playOf(fx), 0);
}

/** Apply 'play' at time t; returns false once t ≥ duration (the adapter then hides the instance). */
export function fxFrame(engine: ExodeUIEngine, fx: FxSprite, t: number): boolean {
  playClip(engine, playOf(fx), t);
  return t < fx.duration;
}
