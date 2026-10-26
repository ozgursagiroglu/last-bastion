import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../game/config/enemies';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import { FLYER } from './flyer';
import { GRUNT } from './grunt';
import { buildEnemy } from './kit';

describe('FLYER', () => {
  it('hovers about 40 px above its ground shadow', () => {
    const sprite = placeRoot(buildEnemy(FLYER, 'f'), 50, 80);
    const c = renderArtboard(makeArtboard('f', sprite.objects, { width: 100, height: 90, background: null }));
    expect(countPainted(c, { x: 40, y: 80 - 44, w: 20, h: 8 })).toBeGreaterThan(100);
    expect(countPainted(c, { x: 0, y: 80 - 24, w: 100, h: 18 })).toBe(0);
    expect(countPainted(c, { x: 44, y: 78, w: 12, h: 4 })).toBeGreaterThan(0);
  });

  it('flaps about 3 times per second at its speed, wings ±35° in mirror', () => {
    const flaps = ENEMIES.flyer.speed / FLYER.stride;
    expect(flaps).toBeGreaterThan(2.5);
    expect(flaps).toBeLessThan(3.5);
    const walk = FLYER.walk(1);
    expect(walk['wing-back']?.rotation?.map((k) => k[1])).toEqual([35, -35, 35]);
    expect(walk['wing-front']?.rotation?.map((k) => k[1])).toEqual([-35, 35, -35]);
  });

  it('casts a smaller, fainter shadow and drops when it dies', () => {
    expect(FLYER.shadow.width).toBeLessThan(GRUNT.shadow.width);
    expect(FLYER.shadow.opacity).toBeLessThan(GRUNT.shadow.opacity);
    expect(FLYER.die).toBe('drop');
  });
});
