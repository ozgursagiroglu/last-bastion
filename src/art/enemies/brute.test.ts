import { describe, expect, it } from 'vitest';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import { BRUTE } from './brute';
import { GRUNT } from './grunt';
import { buildEnemy } from './kit';

function painted(design: typeof BRUTE): number {
  const sprite = placeRoot(buildEnemy(design, 'b'), 60, 70);
  return countPainted(renderArtboard(makeArtboard('b', sprite.objects, { width: 120, height: 80, background: null })));
}

describe('BRUTE', () => {
  it('stomps with a 4 px bob and slower, heavier legs than the goblin', () => {
    const walk = BRUTE.walk(1);
    expect(Math.min(...(walk.bob?.y?.map((k) => Number(k[1])) ?? []))).toBe(-4);
    expect(BRUTE.walk(1)['leg-front']?.rotation?.[0]?.[1]).toBeLessThan(25);
  });

  it('is a big troll: about 54 px tall, 40 px bar, several times the goblin mass', () => {
    expect([BRUTE.height, BRUTE.barWidth]).toEqual([54, 40]);
    expect(painted(BRUTE)).toBeGreaterThan(painted(GRUNT) * 2.5);
  });
});
