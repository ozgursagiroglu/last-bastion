import { beforeAll, describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { playLevel, type PlayResult } from '../sim';
import { DIFFICULTIES, type Difficulty } from '../types';

type Strategy = 'greedy' | 'none';

interface Row {
  level: number;
  difficulty: Difficulty;
  strategy: Strategy;
  waves: number;
  result: PlayResult;
}

const MAX_NORMAL_SECONDS = 12 * 60;
const ids = (from: number, to: number): number[] => LEVELS.map((l) => l.id).filter((id) => id >= from && id <= to);
const livesRatio = (r: PlayResult): number => r.livesLeft / r.maxLives;
const average = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;

function formatRow(row: Row): string {
  const r = row.result;
  return [
    String(row.level).padStart(2),
    row.difficulty.padEnd(6),
    row.strategy.padEnd(6),
    r.status.padEnd(4),
    String(r.stars),
    `${r.livesLeft}/${r.maxLives}`.padStart(5),
    `${(r.time / 60).toFixed(1)}m`.padStart(5),
    `${r.wavesSpawned}/${row.waves}`.padStart(5),
  ].join(' | ');
}

describe('balance matrix (greedy and none bots on every level and difficulty)', () => {
  let rows: Row[] = [];
  const get = (level: number, difficulty: Difficulty, strategy: Strategy): PlayResult => {
    const row = rows.find((r) => r.level === level && r.difficulty === difficulty && r.strategy === strategy);
    if (!row) throw new Error(`no result for level ${level} ${difficulty} ${strategy}`);
    return row.result;
  };

  beforeAll(() => {
    rows = LEVELS.flatMap((level) =>
      DIFFICULTIES.flatMap((difficulty) =>
        (['greedy', 'none'] as const).map((strategy) => ({
          level: level.id,
          difficulty,
          strategy,
          waves: level.waves.length,
          result: playLevel(level, difficulty, { strategy }),
        })),
      ),
    );
    console.log(['lv | diff   | bot    | res  | * | lives |  time | waves', ...rows.map(formatRow)].join('\n'));
    // About 3 s on a laptop; shared CI runners under load can take several times longer.
  }, 120_000);

  it("'none' loses every level on every difficulty, before the last wave has spawned on levels 3-10", () => {
    for (const row of rows.filter((r) => r.strategy === 'none')) {
      expect(row.result.status, `level ${row.level} ${row.difficulty}`).toBe('lost');
      if (row.level >= 3) expect(row.result.wavesSpawned, `level ${row.level} ${row.difficulty}`).toBeLessThan(row.waves);
    }
  });

  it('greedy wins every level on easy, with 3 stars on levels 1-7', () => {
    for (const id of ids(1, 10)) expect(get(id, 'easy', 'greedy').status, `level ${id}`).toBe('won');
    for (const id of ids(1, 7)) expect(get(id, 'easy', 'greedy').stars, `level ${id}`).toBe(3);
  });

  it('greedy wins every level on normal, with 3 stars on levels 1-3', () => {
    for (const id of ids(1, 10)) expect(get(id, 'normal', 'greedy').status, `level ${id}`).toBe('won');
    for (const id of ids(1, 3)) expect(get(id, 'normal', 'greedy').stars, `level ${id}`).toBe(3);
  });

  it('the lives-left ratio on normal trends down from levels 1-5 to levels 6-10', () => {
    const early = average(ids(1, 5).map((id) => livesRatio(get(id, 'normal', 'greedy'))));
    const late = average(ids(6, 10).map((id) => livesRatio(get(id, 'normal', 'greedy'))));
    expect(late).toBeLessThan(early);
  });

  it('greedy wins levels 1-3 on hard and loses at least three of levels 6-10', () => {
    for (const id of ids(1, 3)) expect(get(id, 'hard', 'greedy').status, `level ${id}`).toBe('won');
    expect(ids(6, 10).filter((id) => get(id, 'hard', 'greedy').status === 'lost').length).toBeGreaterThanOrEqual(3);
  });

  it('greedy spawns at least 40% of the waves of every level on hard', () => {
    for (const level of LEVELS) {
      const minWaves = Math.ceil(0.4 * level.waves.length);
      expect(get(level.id, 'hard', 'greedy').wavesSpawned, `level ${level.id}`).toBeGreaterThanOrEqual(minWaves);
    }
  });

  it('no level lasts longer than 12 simulated minutes on normal for the greedy bot', () => {
    for (const id of ids(1, 10)) expect(get(id, 'normal', 'greedy').time, `level ${id}`).toBeLessThanOrEqual(MAX_NORMAL_SECONDS);
  });
});
