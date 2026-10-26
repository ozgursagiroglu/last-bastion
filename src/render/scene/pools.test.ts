import { describe, expect, it } from 'vitest';
import { MAX_ALIVE_PER_KIND, type LevelDef } from '../../game/types';
import { DYING_SPARE, enemyPoolSizes, enemyPrefix, FX_POOL, fxPoolSizes, fxPrefix, projectilePoolSizes, projectilePrefix, spawnTotals, towerPrefix } from './pools';

function level(over: Partial<LevelDef>): LevelDef {
  return {
    id: 1,
    name: 'Test',
    theme: 'meadow',
    paths: [[{ x: 0, y: 100 }, { x: 600, y: 100 }]],
    pads: [{ x: 100, y: 200 }],
    startGold: 100,
    towers: ['rifle'],
    waves: [],
    decorSeed: 1,
    ...over,
  };
}

describe('pool sizing', () => {
  const waves = [
    { groups: [{ enemy: 'grunt' as const, count: 3, interval: 1, delay: 0, path: 0 }, { enemy: 'runner' as const, count: 30, interval: 1, delay: 0, path: 0 }] },
    { groups: [{ enemy: 'runner' as const, count: 25, interval: 1, delay: 0, path: 0 }] },
  ];

  it('sums spawns per kind over every wave', () => {
    expect(spawnTotals(level({ waves }))).toEqual({ grunt: 3, runner: 55 });
  });

  it('sizes enemy pools by the live cap plus spare bodies, only for kinds that spawn', () => {
    const sizes = enemyPoolSizes(level({ waves }));
    expect(sizes).toEqual({ grunt: 3 + 3, runner: MAX_ALIVE_PER_KIND + DYING_SPARE });
    expect(sizes.boss).toBeUndefined();
  });

  it('pools only the projectiles the allowed towers fire', () => {
    expect(projectilePoolSizes(level({ towers: ['rifle', 'tesla'] }))).toEqual({});
    expect(projectilePoolSizes(level({ towers: ['cannon', 'frost', 'rocket'] }))).toEqual({ cannonball: 24, iceShard: 32, rocket: 24 });
  });

  it('pools tower-specific effects only for allowed towers, and never a muzzle flash', () => {
    const rifleOnly = fxPoolSizes(level({ towers: ['rifle'] }));
    expect(Object.keys(rifleOnly).sort()).toEqual(['coinPopup', 'deathPuff', 'hitSpark', 'leak', 'tracer']);
    const all = fxPoolSizes(level({ towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'] }));
    expect(all).toEqual(FX_POOL);
    expect('muzzleFlash' in all).toBe(false);
    expect(fxPoolSizes(level({ towers: ['rocket'] })).explosion).toBe(12);
  });

  it('builds ids by prefix', () => {
    expect(towerPrefix(3, 'frost')).toBe('tw.3.frost');
    expect(enemyPrefix('boss', 1)).toBe('en.boss.1');
    expect(projectilePrefix('iceShard', 0)).toBe('pr.iceShard.0');
    expect(fxPrefix('leak', 2)).toBe('fx.leak.2');
  });
});
