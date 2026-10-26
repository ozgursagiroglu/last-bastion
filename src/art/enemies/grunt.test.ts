import { describe, expect, it } from 'vitest';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import { GRUNT } from './grunt';
import { buildEnemy } from './kit';

describe('GRUNT', () => {
  it('swings its legs ±25°, bobs 2 px and sways the club', () => {
    const walk = GRUNT.walk(1);
    expect(walk['leg-front']?.rotation?.map((k) => k[1])).toEqual([25, -25, 25]);
    expect(Math.min(...(walk.bob?.y?.map((k) => Number(k[1])) ?? []))).toBe(-2);
    expect(walk.arm?.rotation?.length).toBeGreaterThan(2);
  });

  it('has a green goblin head about 30 px tall with a 28 px bar', () => {
    expect([GRUNT.height, GRUNT.barWidth]).toEqual([30, 28]);
    const sprite = placeRoot(buildEnemy(GRUNT, 'g'), 50, 60);
    const [r, g, b] = pixelAt(renderArtboard(makeArtboard('g', sprite.objects, { width: 100, height: 70, background: null })), 49, 60 - 21);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });
});
