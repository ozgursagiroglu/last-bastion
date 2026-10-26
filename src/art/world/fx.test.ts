import { describe, expect, it } from 'vitest';
import { clipsOf, makeArtboard, placeRoot, validateSprite } from '../exode';
import { countPainted, loadEngine, renderEngine } from '../../platform/nodeCanvas';
import { playClip } from '../../render/exodeRuntime';
import { LIGHTNING_POINTS, type FxKind } from '../types';
import { buildFxSprite, FX_DURATION, lightningPoints } from './fx';

const KINDS = Object.keys(FX_DURATION) as FxKind[];

describe('buildFxSprite', () => {
  it('uses the decided durations', () => {
    expect(FX_DURATION).toEqual({
      tracer: 0.08,
      lightning: 0.18,
      explosion: 0.5,
      frostBurst: 0.4,
      hitSpark: 0.15,
      muzzleFlash: 0.08,
      deathPuff: 0.5,
      coinPopup: 0.9,
      leak: 0.6,
    });
  });

  it('builds valid pooled sprites with a play clip over the duration', () => {
    for (const kind of KINDS) {
      const fx = buildFxSprite(kind, `fx-${kind}`);
      expect(fx.kind).toBe(kind);
      expect(validateSprite(fx)).toEqual([]);
      expect(fx.objects.length).toBeLessThanOrEqual(25);
      for (const o of fx.objects) expect(o.style.shadow, o.id).toBeUndefined();
      expect(fx.duration).toBe(FX_DURATION[kind]);
      expect(fx.clips.play?.duration).toBe(FX_DURATION[kind]);
      const ids = new Set(fx.objects.map((o) => o.id));
      for (const id of [...fx.pathPartIds, ...fx.textIds]) expect(ids.has(id)).toBe(true);
    }
  });

  it('declares the contract fields per kind', () => {
    const fx = (k: FxKind) => buildFxSprite(k, k);
    expect(fx('tracer').pathPartIds.length).toBeGreaterThan(0);
    expect(fx('lightning').pathPartIds.length).toBeGreaterThan(0);
    for (const id of fx('lightning').pathPartIds) {
      const geometry = fx('lightning').objects.find((o) => o.id === id)?.geometry as { points: unknown[] } | undefined;
      expect(geometry?.points).toHaveLength(LIGHTNING_POINTS);
    }
    expect(fx('explosion').baseRadius).toBe(50);
    expect(fx('frostBurst').baseRadius).toBe(40);
    for (const kind of ['coinPopup', 'leak'] as const) {
      const { textIds } = fx(kind);
      expect(textIds.length).toBeGreaterThanOrEqual(2);
      expect(textIds[textIds.length - 1]).toBe(`${kind}.label.fill`);
    }
    expect(fx('hitSpark').pathPartIds).toEqual([]);
  });

  it('shows something mid-clip and has faded out completely at the end', () => {
    for (const kind of KINDS.filter((k) => k !== 'tracer' && k !== 'lightning')) {
      const fx = placeRoot(buildFxSprite(kind, kind), 100, 80);
      const play = fx.clips.play;
      if (!play) throw new Error('no play clip');
      const engine = loadEngine(makeArtboard(kind, fx.objects, { width: 200, height: 160, background: null, animations: clipsOf([fx]) }));
      playClip(engine, play, fx.duration * 0.3);
      expect(countPainted(renderEngine(engine, 200, 160)), `${kind} mid`).toBeGreaterThan(80);
      playClip(engine, play, fx.duration);
      expect(countPainted(renderEngine(engine, 200, 160)), `${kind} end`).toBe(0);
    }
  });
});

describe('lightningPoints', () => {
  const chain = [{ x: 10, y: 10 }, { x: 120, y: 60 }, { x: 200, y: 20 }];

  it('returns exactly LIGHTNING_POINTS points with exact endpoints and chain points', () => {
    const pts = lightningPoints(chain, 3);
    expect(pts).toHaveLength(LIGHTNING_POINTS);
    expect(pts[0]).toEqual({ x: 10, y: 10 });
    expect(pts[pts.length - 1]).toEqual({ x: 200, y: 20 });
    expect(pts).toContainEqual({ x: 120, y: 60 });
    expect(pts.some((p) => Math.abs(p.y - (10 + ((p.x - 10) / 110) * 50)) > 2 && p.x < 120)).toBe(true);
  });

  it('is deterministic per seed', () => {
    expect(lightningPoints(chain, 9)).toEqual(lightningPoints(chain, 9));
    expect(lightningPoints(chain, 9)).not.toEqual(lightningPoints(chain, 10));
  });

  it('handles single points, two points and chains longer than the point budget', () => {
    expect(lightningPoints([{ x: 5, y: 5 }], 1)).toEqual(Array.from({ length: LIGHTNING_POINTS }, () => ({ x: 5, y: 5 })));
    const two = lightningPoints([{ x: 0, y: 0 }, { x: 300, y: 0 }], 1);
    expect(two).toHaveLength(LIGHTNING_POINTS);
    expect(two[LIGHTNING_POINTS - 1]).toEqual({ x: 300, y: 0 });
    const long = Array.from({ length: 30 }, (_, i) => ({ x: i * 20, y: (i % 2) * 30 }));
    const pts = lightningPoints(long, 2);
    expect(pts).toHaveLength(LIGHTNING_POINTS);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[LIGHTNING_POINTS - 1]).toEqual({ x: 580, y: 30 });
    expect(() => lightningPoints([], 1)).toThrow();
  });
});
