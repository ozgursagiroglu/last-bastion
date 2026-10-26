import { describe, expect, it } from 'vitest';
import type { ProgressData } from '../game/types';
import { emptyProgress, recordWin } from '../ui/menus/progress';
import { MemoryStorage } from './memoryStorage';
import { browserStorage, loadProgress, loadSettings, mergeProgress, PROGRESS_KEY, saveProgress, saveSettings, SETTINGS_KEY } from './storage';

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('SecurityError');
  }
  override setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

function withRaw(key: string, raw: string): MemoryStorage {
  const s = new MemoryStorage();
  s.setItem(key, raw);
  return s;
}

describe('progress', () => {
  it('round-trips', () => {
    const s = new MemoryStorage();
    const progress = recordWin(recordWin(emptyProgress(10), 1, 'normal', 3, 10), 2, 'hard', 2, 10);
    expect(saveProgress(s, progress, 10)).toEqual(progress);
    expect(loadProgress(s, 10)).toEqual(progress);
    expect(s.getItem(PROGRESS_KEY)).not.toBeNull();
  });

  it('merges with the stored progress instead of overwriting newer progress from another tab', () => {
    const s = new MemoryStorage();
    const newer = recordWin(recordWin(recordWin(emptyProgress(10), 1, 'normal', 3, 10), 2, 'normal', 1, 10), 3, 'hard', 2, 10);
    saveProgress(s, newer, 10);
    const stale = recordWin(recordWin(emptyProgress(10), 1, 'normal', 1, 10), 2, 'normal', 3, 10);
    const merged = saveProgress(s, stale, 10);
    expect(merged.unlocked).toBe(4);
    expect(merged.stars[1]).toEqual({ easy: 0, normal: 3, hard: 0 });
    expect(merged.stars[2]).toEqual({ easy: 0, normal: 3, hard: 0 });
    expect(merged.stars[3]).toEqual({ easy: 0, normal: 0, hard: 2 });
    expect(loadProgress(s, 10)).toEqual(merged);
  });

  it('merges per level and difficulty, keeping unlocked inside 1..levelCount', () => {
    const a: ProgressData = { unlocked: 12, stars: { 1: { easy: 2, normal: 0, hard: 1 } } };
    const b: ProgressData = { unlocked: 1, stars: { 1: { easy: 1, normal: 3, hard: 0 }, 2: { easy: 1, normal: 0, hard: 0 } } };
    const merged = mergeProgress(a, b, 10);
    expect(merged.unlocked).toBe(10);
    expect(merged.stars[1]).toEqual({ easy: 2, normal: 3, hard: 1 });
    expect(merged.stars[2]).toEqual({ easy: 1, normal: 0, hard: 0 });
    expect(merged.stars[10]).toEqual({ easy: 0, normal: 0, hard: 0 });
    expect(mergeProgress(emptyProgress(10), emptyProgress(10), 10)).toEqual(emptyProgress(10));
  });

  it('falls back to empty progress when missing or malformed', () => {
    expect(loadProgress(new MemoryStorage(), 10)).toEqual(emptyProgress(10));
    expect(loadProgress(null, 10)).toEqual(emptyProgress(10));
    expect(loadProgress(withRaw(PROGRESS_KEY, '{not json'), 10)).toEqual(emptyProgress(10));
    expect(loadProgress(withRaw(PROGRESS_KEY, '[1,2,3]'), 10)).toEqual(emptyProgress(10));
    expect(loadProgress(withRaw(PROGRESS_KEY, '"text"'), 10)).toEqual(emptyProgress(10));
    expect(loadProgress(withRaw(PROGRESS_KEY, 'null'), 10)).toEqual(emptyProgress(10));
  });

  it('keeps valid fields and drops wrong shapes and out-of-range values', () => {
    const raw = JSON.stringify({
      unlocked: 3,
      stars: { 1: { easy: 3, normal: 7, hard: 'x' }, 2: [1, 2], 3: { normal: 1.5, hard: 2 }, 11: { easy: 3 }, x: 1 },
    });
    const progress = loadProgress(withRaw(PROGRESS_KEY, raw), 10);
    expect(progress.unlocked).toBe(3);
    expect(progress.stars[1]).toEqual({ easy: 3, normal: 0, hard: 0 });
    expect(progress.stars[2]).toEqual({ easy: 0, normal: 0, hard: 0 });
    expect(progress.stars[3]).toEqual({ easy: 0, normal: 0, hard: 2 });
    expect(progress.stars[11]).toBeUndefined();
    expect(Object.keys(progress.stars)).toHaveLength(10);
    expect(loadProgress(withRaw(PROGRESS_KEY, JSON.stringify({ unlocked: 2, stars: 'none' })), 10)).toEqual({ ...emptyProgress(10), unlocked: 2 });
  });

  it('clamps unlocked to 1..levelCount', () => {
    const unlocked = (value: unknown) => loadProgress(withRaw(PROGRESS_KEY, JSON.stringify({ unlocked: value, stars: {} })), 10).unlocked;
    expect(unlocked(0)).toBe(1);
    expect(unlocked(-5)).toBe(1);
    expect(unlocked(99)).toBe(10);
    expect(unlocked(4.7)).toBe(4);
    expect(unlocked('5')).toBe(1);
    expect(unlocked(null)).toBe(1);
    expect(loadProgress(withRaw(PROGRESS_KEY, '{"unlocked":1e999}'), 10).unlocked).toBe(1);
  });

  it('survives a throwing storage', () => {
    const s = new ThrowingStorage();
    expect(() => saveProgress(s, emptyProgress(10), 10)).not.toThrow();
    expect(loadProgress(s, 10)).toEqual(emptyProgress(10));
  });
});

describe('settings', () => {
  it('defaults to sound on, normal', () => {
    expect(loadSettings(null)).toEqual({ soundOn: true, difficulty: 'normal' });
    expect(loadSettings(new MemoryStorage())).toEqual({ soundOn: true, difficulty: 'normal' });
  });

  it('round-trips', () => {
    const s = new MemoryStorage();
    saveSettings(s, { soundOn: false, difficulty: 'hard' });
    expect(loadSettings(s)).toEqual({ soundOn: false, difficulty: 'hard' });
    expect(JSON.parse(s.getItem(SETTINGS_KEY) ?? '')).toEqual({ soundOn: false, difficulty: 'hard' });
  });

  it('falls back field by field', () => {
    expect(loadSettings(withRaw(SETTINGS_KEY, '{oops'))).toEqual({ soundOn: true, difficulty: 'normal' });
    expect(loadSettings(withRaw(SETTINGS_KEY, '[]'))).toEqual({ soundOn: true, difficulty: 'normal' });
    expect(loadSettings(withRaw(SETTINGS_KEY, JSON.stringify({ soundOn: 'no', difficulty: 'easy' })))).toEqual({ soundOn: true, difficulty: 'easy' });
    expect(loadSettings(withRaw(SETTINGS_KEY, JSON.stringify({ soundOn: false, difficulty: 'insane' })))).toEqual({ soundOn: false, difficulty: 'normal' });
  });

  it('survives a throwing storage', () => {
    const s = new ThrowingStorage();
    expect(() => saveSettings(s, { soundOn: false, difficulty: 'easy' })).not.toThrow();
    expect(loadSettings(s)).toEqual({ soundOn: true, difficulty: 'normal' });
  });
});

describe('browserStorage', () => {
  it('returns null when localStorage access throws', () => {
    const blocked = {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    };
    expect(browserStorage(blocked)).toBeNull();
    const s = new MemoryStorage();
    expect(browserStorage({ localStorage: s })).toBe(s);
  });
});
