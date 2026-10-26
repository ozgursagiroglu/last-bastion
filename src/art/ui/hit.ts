/** Pointer hit testing for UI controllers, in design coords. Pure: no engine, no DOM. */
import type { Vec2 } from '../../game/types';

export type HitRegion =
  | { id: string; kind: 'rect'; x: number; y: number; w: number; h: number } // x, y = top-left
  | { id: string; kind: 'circle'; x: number; y: number; r: number };

/** Rect region from its center (how every UI piece is placed). */
export function rectRegion(id: string, cx: number, cy: number, w: number, h: number): HitRegion {
  return { id, kind: 'rect', x: cx - w / 2, y: cy - h / 2, w, h };
}

export function circleRegion(id: string, cx: number, cy: number, r: number): HitRegion {
  return { id, kind: 'circle', x: cx, y: cy, r };
}

/** Edges count as inside. */
export function contains(region: HitRegion, p: Vec2): boolean {
  if (region.kind === 'rect') return p.x >= region.x && p.x <= region.x + region.w && p.y >= region.y && p.y <= region.y + region.h;
  const dx = p.x - region.x;
  const dy = p.y - region.y;
  return dx * dx + dy * dy <= region.r * region.r;
}

/** The id of the last region (topmost) containing p, or null. */
export function hitTest(regions: readonly HitRegion[], p: Vec2): string | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (r && contains(r, p)) return r.id;
  }
  return null;
}
