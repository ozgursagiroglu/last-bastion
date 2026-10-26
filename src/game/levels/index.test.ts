import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../config';
import type { LevelDef, Vec2, WaveDef } from '../types';
import { LEVEL_SPECS, SPAWN_INTERVALS, targetWaveHp } from './design';
import { samePoint, segmentCrossing, segmentsOf } from './geometry';
import { getLevel, LEVELS } from './index';
import { validateLevel, validateLevels } from './validate';

const waveHp = (wave: WaveDef): number => wave.groups.reduce((sum, g) => sum + g.count * ENEMIES[g.enemy].hp, 0);
const spawnOf = (path: readonly Vec2[]): Vec2 | undefined => path[0];
const exitOf = (path: readonly Vec2[]): Vec2 | undefined => path[path.length - 1];
const distinct = (points: (Vec2 | undefined)[]): number =>
  points.filter((p, i) => p && points.findIndex((q) => q && samePoint(p, q)) === i).length;

function crossings(a: readonly Vec2[], b: readonly Vec2[]): Vec2[] {
  return segmentsOf(a).flatMap(([p, q]) => segmentsOf(b).flatMap(([r, s]) => segmentCrossing(p, q, r, s) ?? []));
}

describe('LEVELS', () => {
  it('has ten levels with ids 1..10 in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i passes validateLevel', (_, level) => {
    expect(validateLevel(level)).toEqual([]);
  });

  it('passes the set checks (ids in order, distinct decor seeds)', () => {
    expect(validateLevels(LEVELS)).toEqual([]);
    expect(new Set(LEVELS.map((l) => l.decorSeed)).size).toBe(LEVELS.length);
  });

  it('matches the design table, start gold included', () => {
    LEVELS.forEach((level, i) => {
      const spec = LEVEL_SPECS[i];
      expect(spec).toBeDefined();
      expect({ name: level.name, theme: level.theme, startGold: level.startGold, towers: level.towers }).toEqual({
        name: spec?.name,
        theme: spec?.theme,
        startGold: spec?.startGold,
        towers: spec?.towers,
      });
    });
  });

  it('getLevel returns the level by id and throws for an unknown id', () => {
    expect(getLevel(1)).toBe(LEVELS[0]);
    expect(getLevel(10).name).toBe('The Last Bastion');
    expect(() => getLevel(0)).toThrow(/Unknown level id 0/);
    expect(() => getLevel(11)).toThrow();
  });
});

describe('road shapes match the table', () => {
  const level = (id: number): LevelDef => getLevel(id);

  it('level 3: two entries merge into one exit', () => {
    const [a = [], b = []] = level(3).paths;
    expect(distinct([spawnOf(a), spawnOf(b)])).toBe(2);
    expect(distinct([exitOf(a), exitOf(b)])).toBe(1);
  });

  it('level 5: one entry splits around the middle and merges before the exit', () => {
    const [a = [], b = []] = level(5).paths;
    expect(distinct([spawnOf(a), spawnOf(b)])).toBe(1);
    expect(distinct([exitOf(a), exitOf(b)])).toBe(1);
    expect(a.slice(-2)).toEqual(b.slice(-2));
    expect(a.slice(2, -2).some((p) => b.some((q) => samePoint(p, q)))).toBe(false);
  });

  it('level 7: separate entries and separate exits, roads never touch', () => {
    const [a = [], b = []] = level(7).paths;
    expect(distinct([spawnOf(a), spawnOf(b)])).toBe(2);
    expect(distinct([exitOf(a), exitOf(b)])).toBe(2);
    expect(crossings(a, b)).toEqual([]);
  });

  it('level 9: the two roads cross exactly once', () => {
    const [a = [], b = []] = level(9).paths;
    expect(crossings(a, b)).toHaveLength(1);
    expect(distinct([exitOf(a), exitOf(b)])).toBe(2);
  });

  it('level 10: three entries merge into one exit', () => {
    const paths = level(10).paths;
    expect(distinct(paths.map(spawnOf))).toBe(3);
    expect(distinct(paths.map(exitOf))).toBe(1);
  });

  it('single-road levels have one road', () => {
    for (const id of [1, 2, 4, 6, 8]) expect(level(id).paths).toHaveLength(1);
  });
});

describe('wave design rules', () => {
  const waves = LEVELS.flatMap((level) => level.waves.map((wave, k) => ({ level, wave, k: k + 1 })));

  it('every wave is within ±25% of the target base HP', () => {
    const off = waves
      .map(({ level, wave, k }) => ({ at: `level ${level.id} wave ${k}`, ratio: waveHp(wave) / targetWaveHp(level.id, k) }))
      .filter(({ ratio }) => ratio < 0.75 || ratio > 1.25);
    expect(off).toEqual([]);
  });

  it('spawn intervals stay in each kind’s range', () => {
    const off = waves.flatMap(({ level, wave, k }) =>
      wave.groups
        .filter((g) => g.enemy !== 'boss')
        .filter((g) => {
          const [min, max] = SPAWN_INTERVALS[g.enemy as Exclude<typeof g.enemy, 'boss'>];
          return g.count > 1 && (g.interval < min || g.interval > max);
        })
        .map((g) => `level ${level.id} wave ${k}: ${g.enemy} every ${g.interval} s`),
    );
    expect(off).toEqual([]);
  });

  it('multi-road levels send enemies down every road', () => {
    for (const level of LEVELS) {
      const used = new Set(level.waves.flatMap((w) => w.groups.map((g) => g.path)));
      expect(used.size, `level ${level.id}`).toBe(level.paths.length);
    }
  });
});
