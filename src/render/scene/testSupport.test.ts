import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import { ENEMY_KINDS } from '../../game/types';
import { buildDemoTowers, firstSpawnStep, perfBudgetEnforced, playSteps, richLevel } from './testSupport';

describe('firstSpawnStep', () => {
  for (const source of LEVELS) {
    it(`matches the steps a scripted run of level ${source.id} first spawns each kind on`, () => {
      const level = richLevel(source);
      const expected = ENEMY_KINDS.map((kind) => [kind, firstSpawnStep(level, kind)] as const);
      const last = Math.max(...expected.map(([, step]) => step ?? 0));
      const sim = createSimulation(level, 'normal');
      buildDemoTowers(sim, level);
      const seen = new Map<string, number>();
      let step = 0;
      playSteps(
        sim,
        (events) => {
          step++;
          for (const e of events) if (e.type === 'enemySpawned' && !seen.has(e.kind)) seen.set(e.kind, step);
        },
        { steps: last, every: 1, frame: () => undefined },
      );
      expect(expected.map(([kind]) => [kind, seen.get(kind) ?? null])).toEqual(expected);
    });
  }

  it('is null for a kind the level never spawns', () => {
    const level = getLevel(1);
    expect(firstSpawnStep({ ...level, waves: [] }, 'grunt')).toBeNull();
  });
});

describe('perfBudgetEnforced', () => {
  it('asserts perf budgets only when PERF_BUDGET is 1', () => {
    expect(perfBudgetEnforced({ PERF_BUDGET: '1' })).toBe(true);
    for (const value of [undefined, '', '0', 'true', 'yes']) expect(perfBudgetEnforced({ PERF_BUDGET: value }), String(value)).toBe(false);
    expect(perfBudgetEnforced({})).toBe(false);
  });
});
