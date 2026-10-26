/**
 * Settings of the engine's built-in effects used by the game (measurements and caveats in ENGINE_EFFECTS.md):
 * outer glows, light trails on projectiles, and the particle emitters of the scene's particle overlay.
 */
import { SpriteBuilder, type ExodeBehavior, type ExodeEffect, type ExodeObject, type SpriteInstance } from '../exode';

/**
 * Soft halo around a shape: the engine draws the shape again with a canvas shadow, `glowPasses(intensity)` times.
 * `blur` is in device pixels: the halo is half as wide on a 2× backing store.
 */
export function outerGlow(color: string, blur: number, intensity = 2): ExodeEffect {
  return { type: 'Glow', mode: 'outer', color, blur, intensity };
}

/** Shadow passes the engine draws for an outer glow: 2, plus one per whole step of intensity above 1.5 (at most 3). */
export function glowPasses(intensity: number): number {
  const w = Math.max(0.1, Math.min(intensity || 1, 10));
  return 2 + (w > 1.5 ? Math.min(Math.floor(w - 1.5), 3) : 0);
}

/**
 * Fading copies of the shape at its last `length` rendered positions. The engine reads the position from the state keys
 * left/top/angle, which the adapter writes every frame (it never sets them by itself): see src/render/scene/engineFx.ts.
 */
export function lightTrail(length: number): ExodeEffect {
  return { type: 'LightTrail', length };
}

/** The object's authored `style.effects`. */
export function effectsOf(o: ExodeObject): readonly ExodeEffect[] {
  return (o.style as { effects?: readonly ExodeEffect[] } | undefined)?.effects ?? [];
}

/** Ids of a sprite's parts that carry a LightTrail (the parts the adapter anchors). */
export function trailPartIds(sprite: SpriteInstance): string[] {
  return sprite.objects.filter((o) => effectsOf(o).some((e) => e.type === 'LightTrail')).map((o) => o.id);
}

/** The object without its built-in style effects (static icons). */
export function withoutEffects(o: ExodeObject): ExodeObject {
  if (effectsOf(o).length === 0) return o;
  const { effects: _effects, ...style } = o.style as Record<string, unknown>;
  return { ...o, style: style as ExodeObject['style'] };
}

export const PARTICLE_KINDS = ['spark', 'debris', 'frost', 'ember'] as const;
export type ParticleKind = (typeof PARTICLE_KINDS)[number];

/**
 * One color per emitter. Particles leave in a random direction at speed × 0.5–1 px/s, live lifetime × 0.5–1 s, start at
 * a radius of size × 0.5–1.5 px that shrinks with their opacity, and accelerate downward by gravity × 10 px/s².
 */
export interface ParticleStyle {
  color: string;
  speed: number;
  size: number;
  lifetime: number;
  gravity: number;
  maxParticles: number;
}

export const PARTICLES: Readonly<Record<ParticleKind, ParticleStyle>> = {
  spark: { color: '#fff0a0', speed: 280, size: 2.8, lifetime: 0.55, gravity: 6, maxParticles: 60 },
  debris: { color: '#3a2a22', speed: 130, size: 3, lifetime: 0.6, gravity: 30, maxParticles: 40 },
  frost: { color: '#e8fbff', speed: 90, size: 2.8, lifetime: 0.5, gravity: -1, maxParticles: 50 },
  ember: { color: '#ffc24a', speed: 14, size: 3.4, lifetime: 2.2, gravity: -2.5, maxParticles: 24 },
};

/** Name of the engine input holding an emitter's rate (particles per second). */
export const rateInputOf = (emitterId: string): string => `${emitterId}.rate`;

/**
 * A particle emitter: an empty root group (particles spawn at the root's x/y in artboard space, so emitters must be
 * roots). It emits nothing until the adapter sets its rate input.
 */
export function buildEmitter(kind: ParticleKind, prefix: string): SpriteInstance {
  const style = PARTICLES[kind];
  const emitter: ExodeBehavior = { type: 'ParticleEmitter', settings: { ...style, rate: 0, rateInputId: rateInputOf(prefix) } };
  return new SpriteBuilder(prefix, { behaviors: [emitter] }).build();
}
