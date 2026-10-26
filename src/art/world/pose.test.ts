import { describe, expect, it } from 'vitest';
import type { ExodeUIEngine } from 'exodeui';
import { clipsOf, makeArtboard, type SpriteInstance } from '../exode';
import { countPainted, loadEngine, pixelAt, renderEngine } from '../../platform/nodeCanvas';
import { LIGHTNING_POINTS, type FxKind } from '../types';
import { buildFxSprite } from './fx';
import { fxFrame, poseProjectile, startFx } from './pose';
import { buildProjectileSprite } from './projectiles';

const W = 240;
const H = 160;

function engineFor(sprite: SpriteInstance): ExodeUIEngine {
  return loadEngine(makeArtboard('t', sprite.objects, { width: W, height: H, background: null, animations: clipsOf([sprite]) }));
}

function state(engine: ExodeUIEngine, id: string): Record<string, unknown> {
  const s = engine.getObjectState(id) as Record<string, unknown> | undefined;
  if (!s) throw new Error(`no state for ${id}`);
  return s;
}

describe('poseProjectile', () => {
  it('rotates the heading part to the heading in degrees', () => {
    const shard = buildProjectileSprite('iceShard', 's');
    const engine = engineFor(shard);
    poseProjectile(engine, shard, { heading: Math.PI / 2, height: 0 });
    expect(state(engine, 's.heading').rotation).toBeCloseTo(90);
    poseProjectile(engine, shard, { heading: (225 * Math.PI) / 180, height: 40 });
    expect(state(engine, 's.heading').rotation).toBeCloseTo(225);
  });

  it('lifts the cannonball by its height and leaves the shadow on the ground', () => {
    const ball = buildProjectileSprite('cannonball', 'b');
    const engine = engineFor(ball);
    poseProjectile(engine, ball, { heading: 1, height: 30 });
    expect(state(engine, 'b.lift').y).toBe(-30);
    expect(state(engine, 'b.lift').x).toBe(0);
    expect(state(engine, 'b.shadow').y).toBe(0);
  });
});

describe('startFx / fxFrame', () => {
  it('places the root, scales splash effects by radius / baseRadius and resets the clip', () => {
    const fx = buildFxSprite('explosion', 'e');
    const engine = engineFor(fx);
    fxFrame(engine, fx, 0.4);
    startFx(engine, fx, { at: { x: 120, y: 90 }, radius: 75 });
    expect(state(engine, 'e')).toMatchObject({ x: 120, y: 90, scale_x: 1.5, scale_y: 1.5 });
    expect(state(engine, 'e.fireball').scale_x).toBeCloseTo(0.3);
    startFx(engine, fx, { at: { x: 10, y: 20 } });
    expect(state(engine, 'e')).toMatchObject({ scale_x: 1, scale_y: 1 });
  });

  it('sets the popup text on both text ids', () => {
    const fx = buildFxSprite('coinPopup', 'c');
    const engine = engineFor(fx);
    startFx(engine, fx, { at: { x: 100, y: 120 }, text: '+125' });
    for (const id of fx.textIds) expect(state(engine, id).text).toBe('+125');
    const leak = buildFxSprite('leak', 'l');
    const e2 = engineFor(leak);
    startFx(e2, leak, { at: { x: 100, y: 120 }, text: '−3' });
    for (const id of leak.textIds) expect(state(e2, id).text).toBe('−3');
  });

  it('draws a tracer between its two points with the root at 0,0', () => {
    const fx = buildFxSprite('tracer', 't');
    const engine = engineFor(fx);
    startFx(engine, fx, { at: { x: 999, y: 999 }, points: [{ x: 20, y: 40 }, { x: 200, y: 40 }] });
    expect(state(engine, 't')).toMatchObject({ x: 0, y: 0 });
    const c = renderEngine(engine, W, H);
    expect(pixelAt(c, 110, 40)[3]).toBeGreaterThan(200);
    expect(countPainted(c, { x: 0, y: 60, w: W, h: H - 60 })).toBe(0);
  });

  it('draws the lightning through the chain with LIGHTNING_POINTS points', () => {
    const fx = buildFxSprite('lightning', 'z');
    const engine = engineFor(fx);
    startFx(engine, fx, { at: { x: 0, y: 0 }, points: [{ x: 20, y: 120 }, { x: 120, y: 30 }, { x: 220, y: 120 }], seed: 4 });
    for (const id of fx.pathPartIds) {
      const geometry = state(engine, id).geometry as { points: unknown[] } | undefined;
      expect(geometry?.points).toHaveLength(LIGHTNING_POINTS);
    }
    const c = renderEngine(engine, W, H);
    expect(pixelAt(c, 120, 30)[3]).toBeGreaterThan(200);
    expect(pixelAt(c, 20, 120)[3]).toBeGreaterThan(200);
  });

  it('returns true while playing and false once t reaches the duration', () => {
    for (const kind of ['hitSpark', 'deathPuff', 'leak'] as FxKind[]) {
      const fx = buildFxSprite(kind, kind);
      const engine = engineFor(fx);
      startFx(engine, fx, { at: { x: 120, y: 100 }, text: '1' });
      expect(fxFrame(engine, fx, 0)).toBe(true);
      expect(fxFrame(engine, fx, fx.duration * 0.5)).toBe(true);
      expect(countPainted(renderEngine(engine, W, H))).toBeGreaterThan(0);
      expect(fxFrame(engine, fx, fx.duration)).toBe(false);
      expect(fxFrame(engine, fx, fx.duration + 1)).toBe(false);
      expect(countPainted(renderEngine(engine, W, H))).toBe(0);
    }
  });
});
