import { describe, expect, it } from 'vitest';
import { PROJECTILE_KINDS } from '../../game/types';
import { makeArtboard, placeRoot, validateSprite } from '../exode';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { buildProjectileSprite } from './projectiles';

describe('buildProjectileSprite', () => {
  it('builds valid pooled sprites (≤ 25 objects, no canvas shadows) for every kind', () => {
    for (const kind of PROJECTILE_KINDS) {
      const s = buildProjectileSprite(kind, `p-${kind}`);
      expect(s.kind).toBe(kind);
      expect(s.rootId).toBe(`p-${kind}`);
      expect(validateSprite(s)).toEqual([]);
      expect(s.objects.length).toBeLessThanOrEqual(25);
      for (const o of s.objects) expect(o.style.shadow, o.id).toBeUndefined();
      const c = renderArtboard(makeArtboard(kind, placeRoot(s, 30, 30).objects, { width: 60, height: 60, background: null }));
      expect(countPainted(c, { x: 18, y: 18, w: 24, h: 24 }), kind).toBeGreaterThan(60);
    }
  });

  it('exposes the contract parts: lift for the cannonball, heading for the rest', () => {
    const ball = buildProjectileSprite('cannonball', 'b');
    expect(ball.headingPartId).toBeNull();
    expect(ball.liftPartId).toBe('b.lift');
    expect(ball.objects.find((o) => o.id === 'b.shadow')?.parentId).toBe('b');
    const shard = buildProjectileSprite('iceShard', 's');
    expect(shard.liftPartId).toBeNull();
    expect(shard.headingPartId).toBe('s.heading');
    const rocket = buildProjectileSprite('rocket', 'r');
    expect(rocket.liftPartId).toBeNull();
    expect(rocket.headingPartId).toBe('r.heading');
  });

  it('flickers the rocket flame in a seamless loop', () => {
    const loop = buildProjectileSprite('rocket', 'r').clips.loop;
    expect(loop).toBeDefined();
    for (const track of loop?.tracks ?? []) {
      expect(track.keyframes[0]?.value).toEqual(track.keyframes[track.keyframes.length - 1]?.value);
      expect(track.object_id).not.toBe('r.heading');
    }
    expect(Object.keys(buildProjectileSprite('cannonball', 'c').clips)).toEqual([]);
  });
});
