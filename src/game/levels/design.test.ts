import { describe, expect, it } from 'vitest';
import { kindsOf, LEVEL_SPECS, specOf, targetWaveHp } from './design';

describe('design table', () => {
  it('has a row per level id 1..10 and nothing else', () => {
    expect(LEVEL_SPECS).toHaveLength(10);
    expect(specOf(1)?.name).toBe('Green Meadow');
    expect(specOf(10)?.name).toBe('The Last Bastion');
    expect(specOf(0)).toBeUndefined();
    expect(specOf(11)).toBeUndefined();
    expect(specOf(1.5)).toBeUndefined();
  });

  it('accumulates enemy kinds level by level, never the boss', () => {
    expect(kindsOf(1)).toEqual(['grunt', 'runner']);
    expect(kindsOf(2)).toEqual(['grunt', 'runner', 'brute']);
    expect(kindsOf(4)).toEqual(['grunt', 'runner', 'brute', 'flyer', 'shield']);
    expect(kindsOf(10)).toEqual(kindsOf(4));
  });

  it('places bosses where the table lists them', () => {
    expect(LEVEL_SPECS.map((s) => s.bosses ?? null)).toEqual([
      null,
      null,
      null,
      null,
      { wave: 10, count: 1, alone: true },
      null,
      null,
      { wave: 12, count: 1 },
      { wave: 13, count: 1 },
      { wave: 15, count: 2 },
    ]);
  });

  it('computes the wave HP target', () => {
    expect(targetWaveHp(1, 1)).toBe(360);
    expect(targetWaveHp(1, 2)).toBeCloseTo(417.6);
    expect(targetWaveHp(3, 1)).toBeCloseTo(468);
  });
});
