/** Saved progress and settings in localStorage. Every read is validated and nothing here throws. */
import { DIFFICULTIES, type Difficulty, type ProgressData } from '../game/types';
import { emptyProgress } from '../ui/menus/progress';

export interface Settings {
  soundOn: boolean;
  difficulty: Difficulty;
}

export const PROGRESS_KEY = 'last-bastion:progress:v1';
export const SETTINGS_KEY = 'last-bastion:settings:v1';

export const DEFAULT_SETTINGS: Readonly<Settings> = { soundOn: true, difficulty: 'normal' };

type Stars = 0 | 1 | 2 | 3;

function read(storage: Storage | null, key: string): unknown {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function write(storage: Storage | null, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: progress just is not kept.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStars(value: unknown): value is Stars {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.some((d) => d === value);
}

/** Saved progress for `levelCount` levels; anything missing or invalid falls back to emptyProgress. */
export function loadProgress(storage: Storage | null, levelCount: number): ProgressData {
  const progress = emptyProgress(levelCount);
  const data = read(storage, PROGRESS_KEY);
  if (!isRecord(data)) return progress;
  const unlocked = data.unlocked;
  if (typeof unlocked === 'number' && Number.isFinite(unlocked)) {
    progress.unlocked = Math.min(Math.max(1, levelCount), Math.max(1, Math.floor(unlocked)));
  }
  const stars = data.stars;
  if (!isRecord(stars)) return progress;
  for (let id = 1; id <= levelCount; id++) {
    const saved = stars[String(id)];
    const row = progress.stars[id];
    if (!isRecord(saved) || !row) continue;
    for (const d of DIFFICULTIES) {
      const value = saved[d];
      if (isStars(value)) row[d] = value;
    }
  }
  return progress;
}

/** The best of both: the higher unlocked level and the best stars per level and difficulty. Returns a new object. */
export function mergeProgress(a: ProgressData, b: ProgressData, levelCount: number): ProgressData {
  const merged = emptyProgress(levelCount);
  merged.unlocked = Math.min(Math.max(1, levelCount), Math.max(a.unlocked, b.unlocked));
  for (let id = 1; id <= levelCount; id++) {
    const row = merged.stars[id];
    if (!row) continue;
    for (const d of DIFFICULTIES) row[d] = Math.max(a.stars[id]?.[d] ?? 0, b.stars[id]?.[d] ?? 0) as Stars;
  }
  return merged;
}

/**
 * Save progress merged with what is stored, so a stale tab never overwrites what another tab saved since.
 * Returns the merged progress the app should keep.
 */
export function saveProgress(storage: Storage | null, progress: ProgressData, levelCount: number): ProgressData {
  const merged = mergeProgress(loadProgress(storage, levelCount), progress, levelCount);
  write(storage, PROGRESS_KEY, merged);
  return merged;
}

/** Saved settings; each invalid or missing field falls back to its default. */
export function loadSettings(storage: Storage | null): Settings {
  const data = read(storage, SETTINGS_KEY);
  if (!isRecord(data)) return { ...DEFAULT_SETTINGS };
  return {
    soundOn: typeof data.soundOn === 'boolean' ? data.soundOn : DEFAULT_SETTINGS.soundOn,
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : DEFAULT_SETTINGS.difficulty,
  };
}

export function saveSettings(storage: Storage | null, settings: Settings): void {
  write(storage, SETTINGS_KEY, { soundOn: settings.soundOn, difficulty: settings.difficulty });
}

/** The window's localStorage, or null when reading it throws (some private modes, sandboxed frames). */
export function browserStorage(win: { readonly localStorage: Storage }): Storage | null {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}
