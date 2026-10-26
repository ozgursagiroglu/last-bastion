/** Player progress helpers (pure). The app persists ProgressData; the level select displays it. */
import { DIFFICULTIES, type Difficulty, type ProgressData } from '../../game/types';

type Stars = 0 | 1 | 2 | 3;

function noStars(): Record<Difficulty, Stars> {
  return { easy: 0, normal: 0, hard: 0 };
}

/** Level 1 unlocked, every level at 0 stars on every difficulty. */
export function emptyProgress(levelCount: number): ProgressData {
  const stars: ProgressData['stars'] = {};
  for (let id = 1; id <= levelCount; id++) stars[id] = noStars();
  return { unlocked: 1, stars };
}

/** Best stars of a level on a difficulty (0 when never won or unknown). */
export function bestStars(progress: ProgressData, level: number, difficulty: Difficulty): Stars {
  return progress.stars[level]?.[difficulty] ?? 0;
}

/** Record a win: best stars per difficulty, and unlock the next level. Returns a new object. */
export function recordWin(progress: ProgressData, level: number, difficulty: Difficulty, stars: 1 | 2 | 3, levelCount: number): ProgressData {
  const copy: ProgressData['stars'] = {};
  for (const [id, row] of Object.entries(progress.stars)) copy[Number(id)] = { ...row };
  const row = copy[level] ?? noStars();
  for (const d of DIFFICULTIES) row[d] ??= 0;
  row[difficulty] = Math.max(row[difficulty], stars) as Stars;
  copy[level] = row;
  const unlocked = Math.max(progress.unlocked, Math.min(level + 1, levelCount));
  return { unlocked, stars: copy };
}
