/**
 * Samples of the engine's built-in effects (see ENGINE_EFFECTS.md): one energy orb per case, the same art in each, so
 * galleries show the effects side by side and the bench compares their cost against the plain orb.
 */
import { makeArtboard, radial, SpriteBuilder, type ExodeBehavior, type ExodeEffect, type SpriteInstance } from '../exode';
import type { Artboard } from 'exodeui';
import { outline } from './paint';

export const EFFECT_CASES = [
  'none',
  'handGlow',
  'glowOuter',
  'glowInner',
  'glowOuterGroup',
  'trail',
  'trailAnchored',
  'shimmer',
  'glitch',
  'emitter',
] as const;
export type EffectCase = (typeof EFFECT_CASES)[number];

export const SAMPLE_EFFECTS: Readonly<Partial<Record<EffectCase, ExodeEffect>>> = {
  glowOuter: { type: 'Glow', mode: 'outer', color: '#5fe6ff', blur: 12 },
  glowInner: { type: 'Glow', mode: 'inner', color: '#5fe6ff', blur: 10 },
  glowOuterGroup: { type: 'Glow', mode: 'outer', color: '#5fe6ff', blur: 12 },
  trail: { type: 'LightTrail', length: 12 },
  trailAnchored: { type: 'LightTrail', length: 12 },
  shimmer: { type: 'ArtEffect', effectType: 'shimmer', intensity: 0.8, speed: 1 },
  glitch: { type: 'ArtEffect', effectType: 'glitch', intensity: 0.5, speed: 1 },
};

/** Root-level emitter settings of the 'emitter' case (spawned at the root's state x/y). */
export const SAMPLE_EMITTER: ExodeBehavior = {
  type: 'ParticleEmitter',
  settings: { rate: 60, speed: 60, size: 3, lifetime: 1, gravity: -2, color: '#ffb03a', maxParticles: 200 },
};

const ORB_FILL = radial([[0, '#ffffff'], [0.4, '#5fe6ff'], [1, '#1d6fa8']], [0.35, 0.3], 0.75);

/** The orb of a case at (x, y); its moving part is `${prefix}.ball` (or `${prefix}.g` for glowOuterGroup). */
export function buildEffectSample(kind: EffectCase, prefix: string, x: number, y: number): SpriteInstance {
  const b = new SpriteBuilder(prefix, { x, y, behaviors: kind === 'emitter' ? [SAMPLE_EMITTER] : undefined });
  const effect = SAMPLE_EFFECTS[kind];
  if (kind === 'handGlow') {
    b.circle('g1', 25, { fill: radial([[0, '#1d6fa8', 0.6], [1, '#1d6fa8', 0]]), blend: 'lighter' });
    b.circle('g2', 16, { fill: radial([[0, '#5fe6ff', 0.75], [1, '#5fe6ff', 0]]), blend: 'lighter' });
  }
  if (kind === 'glowOuterGroup') {
    b.group('g');
    b.circle('ball', 12, { fill: ORB_FILL, stroke: outline(2.5) }, 'g');
    b.circle('shine', 4, { x: -4, y: -4, fill: '#ffffff' }, 'g');
    const sprite = b.build();
    const group = sprite.objects.find((o) => o.id === `${prefix}.g`);
    if (group && effect) (group.style as Record<string, unknown>).effects = [{ isEnabled: true, ...effect }];
    return sprite;
  }
  b.circle('ball', 12, { fill: ORB_FILL, stroke: outline(2.5), ...(effect ? { effects: [effect] } : {}) });
  return b.build();
}

/** `count` samples of a case in rows of 10 over a 1280×720 board (the bench layout). */
export function effectBoard(kind: EffectCase, count: number): { artboard: Artboard; samples: SpriteInstance[] } {
  const samples = Array.from({ length: count }, (_, i) => buildEffectSample(kind, `s${i}`, 40 + (i % 10) * 120, 60 + Math.floor(i / 10) * 160));
  return { artboard: makeArtboard(`effects-${kind}`, samples.flatMap((s) => s.objects), { background: '#3d6b30' }), samples };
}
