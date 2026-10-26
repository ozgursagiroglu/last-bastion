/**
 * Engine writes for the built-in effects that src/render/exodeRuntime.ts does not cover (findings in
 * src/art/world/ENGINE_EFFECTS.md): LightTrail anchors, particle emitter rates, and drawing a second engine over a
 * canvas another engine already drew.
 */
import type { ExodeUIEngine } from 'exodeui';
import { rateInputOf } from '../../art/world/effects';
import type { CanvasLike } from '../stage';

/**
 * LightTrail keeps the positions it reads from the state keys left/top/angle, which the engine never sets: write the
 * part's position (any fixed offset from its real one works, only differences are drawn) and the rotation of its frame.
 */
export function anchorTrail(engine: ExodeUIEngine, id: string, x: number, y: number, angle: number): void {
  engine.updateObjectProperty(id, 'left', x);
  engine.updateObjectProperty(id, 'top', y);
  engine.updateObjectProperty(id, 'angle', angle);
}

/**
 * Forgets a trail's history (a pooled part reused elsewhere would otherwise draw copies at its old positions). The
 * history is a private engine map keyed by object id, read here because the engine has no API for it.
 */
export function clearTrail(engine: ExodeUIEngine, id: string): void {
  const histories: unknown = (engine as unknown as { trailHistories?: unknown }).trailHistories;
  if (histories instanceof Map) histories.delete(id);
}

/**
 * Switches one authored entry of an object's `style.effects` on or off (the engine skips entries whose isEnabled is
 * false). Writing a shorter effects array would not remove entries: object state merges arrays by index.
 */
export function setEffectEnabled(engine: ExodeUIEngine, id: string, index: number, on: boolean): void {
  engine.updateObjectProperty(id, `style.effects.${index}.isEnabled`, on);
}

/** Particles per second of an emitter built with buildEmitter (the engine emits floor(rate × dt) per advance). */
export function setEmitterRate(engine: ExodeUIEngine, emitterId: string, perSecond: number): void {
  engine.setInputNumber(rateInputOf(emitterId), perSecond);
}

/** The same canvas, with a context that ignores clearRect: an engine rendering into it draws over what is there. */
export function overlayCanvas(canvas: CanvasLike): CanvasLike {
  let wrapped: { ctx: CanvasRenderingContext2D; proxy: CanvasRenderingContext2D } | null = null;
  const keepContents = () => undefined;
  return {
    get width() {
      return canvas.width;
    },
    set width(v: number) {
      canvas.width = v;
    },
    get height() {
      return canvas.height;
    },
    set height(v: number) {
      canvas.height = v;
    },
    getContext(contextId: '2d') {
      const ctx = canvas.getContext(contextId);
      if (!ctx) return null;
      if (wrapped?.ctx !== ctx) {
        const methods = new Map<PropertyKey, unknown>();
        const proxy = new Proxy(ctx, {
          get(target, prop) {
            if (prop === 'clearRect') return keepContents;
            const value: unknown = Reflect.get(target, prop, target);
            if (typeof value !== 'function') return value;
            let bound = methods.get(prop);
            if (!bound) {
              bound = (value as (...args: unknown[]) => unknown).bind(target);
              methods.set(prop, bound);
            }
            return bound;
          },
          set(target, prop, value) {
            return Reflect.set(target, prop, value, target);
          },
        });
        wrapped = { ctx, proxy };
      }
      return wrapped.proxy;
    },
  };
}
