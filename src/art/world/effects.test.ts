import type { ExodeUIEngine } from 'exodeui';
import { describe, expect, it } from 'vitest';
import { PROJECTILE_KINDS, TOWER_KINDS } from '../../game/types';
import { context2d, createNodeCanvas, loadEngine } from '../../platform/nodeCanvas';
import { makeArtboard, SpriteBuilder, validateSprite, type ExodeEffect, type SpriteInstance } from '../exode';
import { buildTowerSprite } from '../towers';
import type { FxKind } from '../types';
import { buildEmitter, effectsOf, glowPasses, lightTrail, outerGlow, PARTICLE_KINDS, PARTICLES, rateInputOf, trailPartIds, withoutEffects } from './effects';
import { buildFxSprite, FX_DURATION } from './fx';
import { buildProjectileSprite } from './projectiles';

/** Shadow passes one render draws (the engine sets a positive shadowBlur once per outer-glow pass). */
function shadowPasses(engine: ExodeUIEngine): number {
  const ctx = context2d(createNodeCanvas(100, 100));
  let passes = 0;
  const counting = new Proxy(ctx, {
    get(target, prop) {
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) {
      if (prop === 'shadowBlur' && typeof value === 'number' && value > 0) passes++;
      return Reflect.set(target, prop, value, target);
    },
  });
  engine.render(counting, 100, 100);
  return passes;
}

function glowsOf(sprite: SpriteInstance): ExodeEffect[] {
  return sprite.objects.flatMap((o) => effectsOf(o).filter((e) => e.type === 'Glow'));
}

describe('engine effect settings', () => {
  it('builds glow and trail effects with the engine setting names', () => {
    expect(outerGlow('#5fe6ff', 10)).toEqual({ type: 'Glow', mode: 'outer', color: '#5fe6ff', blur: 10, intensity: 2 });
    expect(lightTrail(8)).toEqual({ type: 'LightTrail', length: 8 });
  });

  it('counts the shadow passes of an outer glow as the engine draws them', () => {
    for (const intensity of [1, 2, 2.4, 2.5, 3.5, 20]) {
      const b = new SpriteBuilder('g');
      b.circle('dot', 20, { x: 50, y: 50, fill: '#ffffff', effects: [outerGlow('#ffffff', 8, intensity)] });
      const engine = loadEngine(makeArtboard('g', b.build().objects, { width: 100, height: 100, background: null }));
      expect(shadowPasses(engine), `intensity ${intensity}`).toBe(glowPasses(intensity));
    }
    expect([glowPasses(2), glowPasses(2.5), glowPasses(20)]).toEqual([2, 3, 5]);
  });

  it('keeps every glow of the game to 2 shadow passes', () => {
    const fxKinds = Object.keys(FX_DURATION) as FxKind[];
    const sprites = [...fxKinds.map((k) => buildFxSprite(k, `fx-${k}`)), ...TOWER_KINDS.map((k) => buildTowerSprite(k, `tw-${k}`))];
    const glows = sprites.flatMap(glowsOf);
    expect(glows.length).toBeGreaterThanOrEqual(4);
    for (const glow of glows) expect(glowPasses(typeof glow.intensity === 'number' ? glow.intensity : 1), JSON.stringify(glow)).toBe(2);
  });

  it('finds the trail parts of every projectile and strips effects without touching the rest', () => {
    for (const kind of PROJECTILE_KINDS) {
      const sprite = buildProjectileSprite(kind, `p-${kind}`);
      expect(trailPartIds(sprite)).toEqual([`p-${kind}.lightTrail`]);
      const stripped = { ...sprite, objects: sprite.objects.map(withoutEffects) };
      expect(trailPartIds(stripped)).toEqual([]);
      expect(validateSprite(stripped)).toEqual([]);
      const plain = sprite.objects.find((o) => !trailPartIds({ ...sprite, objects: [o] }).length);
      if (plain) expect(withoutEffects(plain)).toBe(plain);
    }
  });

  it('builds every emitter as a valid root group driven by its rate input', () => {
    for (const kind of PARTICLE_KINDS) {
      const emitter = buildEmitter(kind, `pt.${kind}.0`);
      expect(validateSprite(emitter)).toEqual([]);
      expect(emitter.objects).toHaveLength(1);
      const behaviors = (emitter.objects[0] as unknown as { behaviors: { type: string; settings: Record<string, unknown> }[] }).behaviors;
      expect(behaviors[0]?.type).toBe('ParticleEmitter');
      expect(behaviors[0]?.settings).toMatchObject({ ...PARTICLES[kind], rateInputId: rateInputOf(`pt.${kind}.0`) });
      expect(PARTICLES[kind].color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
