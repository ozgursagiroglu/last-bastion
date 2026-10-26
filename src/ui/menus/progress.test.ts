import { describe, expect, it } from 'vitest';
import { bestStars, emptyProgress, recordWin } from './progress';

describe('emptyProgress', () => {
  it('unlocks level 1 and has zero stars on every difficulty of every level', () => {
    const p = emptyProgress(10);
    expect(p.unlocked).toBe(1);
    expect(Object.keys(p.stars).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let id = 1; id <= 10; id++) expect(p.stars[id]).toEqual({ easy: 0, normal: 0, hard: 0 });
  });
});

describe('recordWin', () => {
  it('keeps the best stars per difficulty', () => {
    let p = recordWin(emptyProgress(10), 1, 'normal', 2, 10);
    p = recordWin(p, 1, 'normal', 1, 10);
    expect(p.stars[1]).toEqual({ easy: 0, normal: 2, hard: 0 });
    p = recordWin(p, 1, 'normal', 3, 10);
    p = recordWin(p, 1, 'hard', 1, 10);
    expect(p.stars[1]).toEqual({ easy: 0, normal: 3, hard: 1 });
  });

  it('unlocks the next level once, whatever the difficulty, and never past the last level', () => {
    let p = recordWin(emptyProgress(10), 1, 'easy', 1, 10);
    expect(p.unlocked).toBe(2);
    p = recordWin(p, 1, 'hard', 3, 10);
    expect(p.unlocked).toBe(2);
    p = recordWin(p, 2, 'hard', 1, 10);
    expect(p.unlocked).toBe(3);
    p = recordWin({ ...p, unlocked: 6 }, 3, 'normal', 2, 10);
    expect(p.unlocked).toBe(6);
    p = recordWin({ ...p, unlocked: 10 }, 10, 'normal', 3, 10);
    expect(p.unlocked).toBe(10);
  });

  it('does not mutate its input', () => {
    const before = emptyProgress(3);
    const snapshot = structuredClone(before);
    const after = recordWin(before, 2, 'normal', 3, 3);
    expect(before).toEqual(snapshot);
    expect(after.stars[2]).not.toBe(before.stars[2]);
    expect(after.stars[1]).not.toBe(before.stars[1]);
  });

  it('fills in a level missing from the record', () => {
    const p = recordWin({ unlocked: 1, stars: {} }, 1, 'easy', 2, 10);
    expect(p.stars[1]).toEqual({ easy: 2, normal: 0, hard: 0 });
  });
});

describe('bestStars', () => {
  it('reads stars and defaults to 0 for unknown levels', () => {
    const p = recordWin(emptyProgress(2), 2, 'hard', 2, 2);
    expect(bestStars(p, 2, 'hard')).toBe(2);
    expect(bestStars(p, 2, 'easy')).toBe(0);
    expect(bestStars(p, 9, 'easy')).toBe(0);
  });
});
