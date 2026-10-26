/**
 * Runtime writes into a loaded ExodeUI engine. Adapters change object state only through these, so the property names
 * and engine quirks live in one place (see CLAUDE.md "ExodeUI facts").
 */
import type { Animation, ExodeUIEngine } from 'exodeui';
import { pathCenter, toEnginePoints, type PathPoint } from '../art/exode';

export function setPos(engine: ExodeUIEngine, id: string, x: number, y: number): void {
  engine.updateObjectProperty(id, 'x', x);
  engine.updateObjectProperty(id, 'y', y);
}

/** Degrees, clockwise on screen. */
export function setRotation(engine: ExodeUIEngine, id: string, degrees: number): void {
  engine.updateObjectProperty(id, 'rotation', degrees);
}

export function setScale(engine: ExodeUIEngine, id: string, scaleX: number, scaleY: number = scaleX): void {
  engine.updateObjectProperty(id, 'scale_x', scaleX);
  engine.updateObjectProperty(id, 'scale_y', scaleY);
}

/** 0..1 */
export function setOpacity(engine: ExodeUIEngine, id: string, opacity: number): void {
  engine.updateObjectProperty(id, 'opacity', Math.min(1, Math.max(0, opacity)));
}

export function setVisible(engine: ExodeUIEngine, id: string, visible: boolean): void {
  engine.updateObjectProperty(id, 'visible', visible);
}

export function setFlipX(engine: ExodeUIEngine, id: string, flip: boolean): void {
  engine.updateObjectProperty(id, 'flip_x', flip);
}

/** Draw order among root objects (higher draws later). Only meaningful on roots. */
export function setZ(engine: ExodeUIEngine, id: string, z: number): void {
  engine.updateObjectProperty(id, 'zIndex', z);
}

/** The renderer reads `text`; `geometry.text` is kept in step for anything reading the geometry. */
export function setText(engine: ExodeUIEngine, ids: string | readonly string[], text: string): void {
  for (const id of typeof ids === 'string' ? [ids] : ids) {
    engine.updateObjectProperty(id, 'text', text);
    engine.updateObjectProperty(id, 'geometry.text', text);
  }
}

/** Replace the fill with a solid color ('#rrggbb'). */
export function setFillColor(engine: ExodeUIEngine, id: string, color: string, opacity = 1): void {
  engine.updateObjectProperty(id, 'style.fill', { type: 'Solid', color, opacity });
}

/**
 * Rewrite a dynamic path's points (built with `path(..., { dynamic: true })`) in its parent's space. The point count
 * must match the authored path: the engine merges arrays by index, so extra authored points would survive.
 */
export function setPathPoints(engine: ExodeUIEngine, id: string, points: readonly PathPoint[]): void {
  const center = pathCenter(points);
  engine.updateObjectProperty(id, 'geometry.points', toEnginePoints(points));
  setPos(engine, id, center.x, center.y);
}

/** Apply a clip at time t (clamped to the clip). */
export function playClip(engine: ExodeUIEngine, clip: Animation, t: number): void {
  engine.applyAnimation(clip, Math.min(clip.duration, Math.max(0, t)));
}

/** Apply a looping clip at time t (wrapped into the clip). */
export function loopClip(engine: ExodeUIEngine, clip: Animation, t: number): void {
  const d = clip.duration;
  engine.applyAnimation(clip, ((t % d) + d) % d);
}
