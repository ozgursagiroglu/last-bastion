/**
 * Engine particles on an overlay of the world canvas: a second, small engine whose artboard holds only root-level
 * emitters, rendered over the world right after it. The world engine is never advanced (its advance walks all ~9k
 * pooled objects, ≈ 3.6 ms per frame); this one's costs microseconds. Bursts take a free emitter of their kind for one
 * engine step; embers rise from the level's molten surfaces at a steady rate.
 */
import { makeArtboard } from '../../art/exode';
import { buildEmitter, type ParticleKind } from '../../art/world/effects';
import { createRng, type Rng } from '../../art/world/rng';
import { moltenSurfaces, type MoltenSurface } from '../../art/world/terrain';
import type { LevelDef, Vec2 } from '../../game/types';
import { setPos } from '../exodeRuntime';
import { Stage, type CanvasLike } from '../stage';
import { overlayCanvas, setEmitterRate } from './engineFx';
import type { FxRequest } from './eventEffects';
import { fxPoolSizes } from './pools';

export type BurstKind = Exclude<ParticleKind, 'ember'>;

export interface Burst {
  kind: BurstKind;
  at: Vec2;
  count: number;
}

/** Emitters per burst kind: bursts started in the same frame each need their own. */
export const BURST_EMITTERS = 4;
/** Embers per second rising from each molten surface. */
export const EMBER_RATE = 2.5;

/** The particle bursts that go with an effect (explosions throw sparks and debris, frost bursts ice). */
export function burstsFor(req: FxRequest): Burst[] {
  const scale = (req.spec.radius ?? 50) / 50;
  const at = req.spec.at;
  if (req.kind === 'explosion') {
    return [
      { kind: 'spark', at, count: Math.round(Math.min(16, Math.max(6, 11 * scale))) },
      { kind: 'debris', at, count: Math.round(Math.min(8, Math.max(3, 5 * scale))) },
    ];
  }
  return req.kind === 'frostBurst' ? [{ kind: 'frost', at, count: 10 }] : [];
}

interface BurstEmitter {
  id: string;
  /** Particles to emit at the next engine step (0 = free). */
  count: number;
  at: Vec2;
}

interface EmberEmitter {
  id: string;
  surface: MoltenSurface;
  /** Embers owed (fractional part carried over steps). */
  due: number;
}

export class ParticleLayer {
  readonly stage: Stage;
  private readonly bursts = new Map<BurstKind, BurstEmitter[]>();
  private readonly embers: EmberEmitter[] = [];
  private readonly rng: Rng;
  /** Bursts that found no free emitter since construction. */
  dropped = 0;

  constructor(canvas: CanvasLike, level: LevelDef) {
    this.rng = createRng(level.decorSeed ^ 0x2c1b3c6d);
    const fx = fxPoolSizes(level);
    const kinds: BurstKind[] = [...(fx.explosion ? (['spark', 'debris'] as const) : []), ...(fx.frostBurst ? (['frost'] as const) : [])];
    const sprites = kinds.flatMap((kind) => {
      const pool = Array.from({ length: BURST_EMITTERS }, (_, i) => buildEmitter(kind, `pt.${kind}.${i}`));
      this.bursts.set(kind, pool.map((s) => ({ id: s.rootId, count: 0, at: { x: 0, y: 0 } })));
      return pool;
    });
    moltenSurfaces(level).forEach((surface, i) => {
      const sprite = buildEmitter('ember', `pt.ember.${i}`);
      this.embers.push({ id: sprite.rootId, surface, due: this.rng.next() });
      sprites.push(sprite);
    });
    this.stage = new Stage(overlayCanvas(canvas));
    this.stage.load(makeArtboard(`particles-${level.id}`, sprites.flatMap((s) => s.objects), { background: null }));
    for (const s of sprites) setEmitterRate(this.stage.engine, s.rootId, 0);
  }

  /** Emitter ids (bursts, then embers). */
  emitterIds(): string[] {
    return [...[...this.bursts.values()].flat().map((e) => e.id), ...this.embers.map((e) => e.id)];
  }

  /** Queues a burst for the next step on a free emitter of its kind; false when none is free (or the kind is absent). */
  burst(b: Burst): boolean {
    const free = this.bursts.get(b.kind)?.find((e) => e.count === 0);
    if (!free || b.count <= 0) {
      this.dropped++;
      return false;
    }
    free.count = b.count;
    free.at = { x: b.at.x, y: b.at.y };
    return true;
  }

  /** Emits what is due and moves every particle by dt game seconds (nothing moves or emits while dt is 0). */
  advance(dt: number): void {
    if (!(dt > 0)) return;
    const engine = this.stage.engine;
    const used: string[] = [];
    const emit = (id: string, at: Vec2, count: number) => {
      setPos(engine, id, at.x, at.y);
      setEmitterRate(engine, id, (count + 0.5) / dt);
      used.push(id);
    };
    for (const pool of this.bursts.values()) for (const e of pool) if (e.count > 0) emit(e.id, e.at, e.count);
    for (const e of this.embers) {
      e.due += EMBER_RATE * dt;
      const n = Math.floor(e.due);
      if (n === 0) continue;
      e.due -= n;
      const a = this.rng.next() * Math.PI * 2;
      const r = Math.sqrt(this.rng.next()) * 0.8;
      emit(e.id, { x: e.surface.x + Math.cos(a) * e.surface.rx * r, y: e.surface.y + Math.sin(a) * e.surface.ry * r }, n);
    }
    this.stage.advance(dt);
    for (const id of used) setEmitterRate(engine, id, 0);
    for (const pool of this.bursts.values()) for (const e of pool) e.count = 0;
  }

  /** Draws the particles over what the canvas holds. */
  render(): void {
    this.stage.render();
  }
}
