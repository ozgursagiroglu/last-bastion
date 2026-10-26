import { describe, expect, it } from 'vitest';
import type { LevelDef, TowerState } from '../../game/types';
import { effectsFor, FROST_BURST_RADIUS, pathEnd, type EffectContext } from './eventEffects';
import { fakeTower } from './testSupport';

const level: LevelDef = {
  id: 1,
  name: 'Test',
  theme: 'meadow',
  paths: [
    [{ x: 0, y: 100 }, { x: 600, y: 100 }],
    [{ x: 0, y: 400 }, { x: 300, y: 400 }, { x: 900, y: 500 }],
  ],
  pads: [{ x: 100, y: 200 }, { x: 300, y: 260 }],
  startGold: 100,
  towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'],
  waves: [],
  decorSeed: 1,
};

function context(towers: readonly TowerState[] = []): EffectContext {
  let seed = 0;
  return {
    level,
    towers,
    muzzle: (t) => ({ x: t.pos.x + 10, y: t.pos.y - 40 }),
    enemyHeight: (kind) => (kind === 'boss' ? 80 : 40),
    enemyPath: (id) => (id === 7 ? 1 : undefined),
    nextSeed: () => ++seed,
  };
}

describe('effectsFor', () => {
  const rifle = fakeTower(1, level, 0, 'rifle');
  const tesla = fakeTower(2, level, 1, 'tesla');

  it('rifle shots draw a tracer from the muzzle and a spark where they land', () => {
    const fx = effectsFor({ type: 'towerFired', towerId: 1, kind: 'rifle', targetId: 5, from: { x: 0, y: 0 }, to: { x: 150, y: 120 } }, context([rifle]));
    expect(fx).toEqual([
      { kind: 'tracer', spec: { at: { x: 110, y: 160 }, points: [{ x: 110, y: 160 }, { x: 150, y: 120 }] } },
      { kind: 'hitSpark', spec: { at: { x: 150, y: 120 } } },
    ]);
  });

  it('falls back to the event origin when the tower is not in the view', () => {
    const fx = effectsFor({ type: 'towerFired', towerId: 9, kind: 'rifle', targetId: 5, from: { x: 1, y: 2 }, to: { x: 3, y: 4 } }, context());
    expect(fx[0]?.spec.points?.[0]).toEqual({ x: 1, y: 2 });
  });

  it('other towers add nothing when they fire', () => {
    for (const kind of ['cannon', 'rocket', 'frost', 'tesla'] as const) {
      expect(effectsFor({ type: 'towerFired', towerId: 2, kind, targetId: 5, from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }, context([tesla]))).toEqual([]);
    }
  });

  it('chain lightning starts at the muzzle and takes a new seed each bolt', () => {
    const ctx = context([tesla]);
    const event = { type: 'chainLightning' as const, towerId: 2, points: [{ x: 300, y: 260 }, { x: 350, y: 200 }, { x: 400, y: 210 }] };
    const [first] = effectsFor(event, ctx);
    const [second] = effectsFor(event, ctx);
    expect(first).toEqual({ kind: 'lightning', spec: { at: { x: 310, y: 220 }, points: [{ x: 310, y: 220 }, { x: 350, y: 200 }, { x: 400, y: 210 }], seed: 1 } });
    expect(second?.spec.seed).toBe(2);
  });

  it('projectile hits explode at their splash radius, ice shards burst', () => {
    const at = { x: 50, y: 60 };
    expect(effectsFor({ type: 'projectileHit', id: 1, kind: 'cannonball', pos: at, splashRadius: 55 }, context())).toEqual([{ kind: 'explosion', spec: { at, radius: 55 } }]);
    expect(effectsFor({ type: 'projectileHit', id: 2, kind: 'rocket', pos: at, splashRadius: 45 }, context())).toEqual([{ kind: 'explosion', spec: { at, radius: 45 } }]);
    expect(effectsFor({ type: 'projectileHit', id: 3, kind: 'iceShard', pos: at, splashRadius: 0 }, context())).toEqual([
      { kind: 'frostBurst', spec: { at, radius: FROST_BURST_RADIUS } },
    ]);
  });

  it('kills puff smoke and pop the bounty above the enemy', () => {
    const fx = effectsFor({ type: 'enemyKilled', id: 3, kind: 'boss', pos: { x: 200, y: 300 }, bounty: 25 }, context());
    expect(fx).toEqual([
      { kind: 'deathPuff', spec: { at: { x: 200, y: 300 } } },
      { kind: 'coinPopup', spec: { at: { x: 200, y: 220 }, text: '+25' } },
    ]);
  });

  it('leaks flash at the end of the enemy path', () => {
    expect(effectsFor({ type: 'enemyLeaked', id: 7, kind: 'grunt', livesLost: 2 }, context())).toEqual([
      { kind: 'leak', spec: { at: { x: 900, y: 500 }, text: '−2' } },
    ]);
    expect(effectsFor({ type: 'enemyLeaked', id: 8, kind: 'grunt', livesLost: 1 }, context())[0]?.spec.at).toEqual({ x: 600, y: 100 });
  });

  it('building and selling raise dust at the pad, upgrading sparks at the tower', () => {
    expect(effectsFor({ type: 'towerBuilt', towerId: 1, pad: 1, kind: 'rifle' }, context())).toEqual([{ kind: 'deathPuff', spec: { at: { x: 300, y: 260 } } }]);
    expect(effectsFor({ type: 'towerSold', towerId: 1, pad: 0, refund: 10 }, context())).toEqual([{ kind: 'deathPuff', spec: { at: { x: 100, y: 200 } } }]);
    expect(effectsFor({ type: 'towerUpgraded', towerId: 1, level: 2 }, context([rifle]))).toEqual([{ kind: 'hitSpark', spec: { at: { x: 100, y: 200 } } }]);
  });

  it('ignores events without effects', () => {
    expect(effectsFor({ type: 'waveStarted', wave: 0, early: false, bonus: 0 }, context())).toEqual([]);
    expect(effectsFor({ type: 'enemyHit', id: 1, amount: 3, damageType: 'physical', source: 'rifle' }, context())).toEqual([]);
    expect(effectsFor({ type: 'levelLost' }, context())).toEqual([]);
  });
});

describe('pathEnd', () => {
  it('is the last point of the path, or of path 0 when unknown', () => {
    expect(pathEnd(level, 1)).toEqual({ x: 900, y: 500 });
    expect(pathEnd(level, undefined)).toEqual({ x: 600, y: 100 });
    expect(pathEnd(level, 5)).toEqual({ x: 600, y: 100 });
  });
});
